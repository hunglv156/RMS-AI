import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Actor } from "../common/interfaces";
import { Database, type Transaction } from "../db/database";
import { JobAuthorization } from "../auth/authorization.service";
import { parseInput } from "../auth/auth.service";
import { AuditWriter } from "../audit/audit-writer.service";
import { PlatformError } from "../common/errors";
import {
  checkRevision,
  pageSchema,
  revisionSchema,
  writeEvent,
} from "../jobs/jobs.service";
import { contentHash, draftSchema, type Draft } from "./validation";
@Injectable()
export class JdVersionsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  private async detail(tx: Transaction | Database["connection"], id: string) {
    const row = await tx("jd_versions").where({ id }).first();
    const criteria = await tx("job_criteria")
      .where({ jd_version_id: id })
      .orderBy("sort_order")
      .orderBy("id");
    return {
      ...row,
      criteria: criteria.map((c) => ({
        code: c.code,
        label: c.label,
        description: c.description,
        priority: c.priority,
        weight: c.weight,
        keywords: c.keywords_json,
      })),
    };
  }
  async get(actor: Actor, id: string) {
    this.policy.assertAction(actor, "jd.read");
    await this.policy.assertResourceAccess(actor, "jd", id);
    return this.detail(this.db.connection, id);
  }
  async list(actor: Actor, jobId: string, input: unknown) {
    this.policy.assertAction(actor, "jd.read");
    await this.policy.assertJobAccess(actor, jobId);
    const q = parseInput(
      pageSchema.extend({
        sort: z
          .enum([
            "version_no",
            "-version_no",
            "created_at",
            "-created_at",
            "title",
            "-title",
          ])
          .default("-version_no"),
      }),
      input,
    );
    const base = this.db.connection("jd_versions").where({ job_id: jobId });
    if (q.search)
      base.whereILike("title", `%${q.search.replace(/[\\%_]/g, "\\$&")}%`);
    const total = await base.clone().count("* as count").first();
    const rows = await base
      .select("id")
      .orderBy(
        q.sort.replace(/^-/, ""),
        q.sort.startsWith("-") ? "desc" : "asc",
      )
      .orderBy("id")
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    const items = await Promise.all(
      rows.map((row) => this.detail(this.db.connection, row.id)),
    );
    return {
      items,
      total: Number(total?.count),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  private async criteria(tx: Transaction, id: string, draft: Draft) {
    await tx("job_criteria").insert(
      draft.criteria.map((c, sort_order) => ({
        jd_version_id: id,
        code: c.code,
        label: c.label,
        description: c.description,
        priority: c.priority,
        weight: c.weight,
        keywords_json: JSON.stringify(c.keywords),
        sort_order,
      })),
    );
  }
  private async insert(
    tx: Transaction,
    actor: Actor,
    jobId: string,
    draft: Draft,
    requestId: string,
    action: string,
  ) {
    const last = await tx("jd_versions")
      .where({ job_id: jobId })
      .max("version_no as n")
      .first();
    const [row] = await tx("jd_versions")
      .insert({
        job_id: jobId,
        version_no: Number(last?.n ?? 0) + 1,
        title: draft.title,
        summary: draft.summary,
        created_by: actor.id,
      })
      .returning("*");
    await this.criteria(tx, row.id, draft);
    await writeEvent(
      this.audit,
      tx,
      actor,
      action,
      "jd_version",
      row.id,
      jobId,
      requestId,
    );
    return this.detail(tx, row.id);
  }
  async create(actor: Actor, jobId: string, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "jd.create");
    const draft = parseInput(draftSchema, input);
    return this.db.transaction(async (tx) => {
      await this.policy.assertJobAccess(actor, jobId, tx);
      await tx("jobs").where({ id: jobId }).forUpdate().first();
      return this.insert(tx, actor, jobId, draft, requestId, "jd.created");
    });
  }
  async mutate(
    actor: Actor,
    id: string,
    operation: "update" | "submit" | "return_to_draft" | "approve" | "clone",
    input: unknown,
    requestId: string,
  ) {
    this.policy.assertAction(actor, `jd.${operation}`);
    const data = parseInput(
      operation === "update"
        ? draftSchema.extend({ revision: revisionSchema })
        : operation === "return_to_draft"
          ? z
              .object({
                revision: revisionSchema,
                reason: z.string().trim().min(1).max(2000),
              })
              .strict()
          : z.object({ revision: revisionSchema }).strict(),
      input,
    );
    return this.db.transaction(async (tx) => {
      await this.policy.assertResourceAccess(actor, "jd", id, tx);
      const initial = await tx("jd_versions").where({ id }).first();
      // All JD mutations take the job lock before the version lock (also used by job closure/grants).
      const job = await tx("jobs")
        .where({ id: initial.job_id })
        .forUpdate()
        .first();
      await this.policy.assertJobAccess(actor, job.id, tx);
      const row = await tx("jd_versions").where({ id }).forUpdate().first();
      checkRevision(row.revision, data.revision);
      if (operation === "clone")
        return this.insert(
          tx,
          actor,
          job.id,
          parseInput(draftSchema, this.pickDraft(await this.detail(tx, id))),
          requestId,
          "jd.cloned",
        );
      const expected =
        operation === "update" || operation === "submit"
          ? "draft"
          : "pending_approval";
      if (row.state !== expected)
        throw new PlatformError(
          "invalid_jd_state",
          "JD state does not allow this action",
          409,
        );
      const changes: Record<string, unknown> = { revision: row.revision + 1 };
      if (operation === "update") {
        const draft = parseInput(
          draftSchema,
          this.pickDraft(
            parseInput(draftSchema.extend({ revision: revisionSchema }), input),
          ),
        );
        changes.title = draft.title;
        changes.summary = draft.summary;
        await tx("job_criteria").where({ jd_version_id: id }).delete();
        await this.criteria(tx, id, draft);
      } else if (operation === "submit") {
        parseInput(draftSchema, this.pickDraft(await this.detail(tx, id)));
        Object.assign(changes, {
          state: "pending_approval",
          submitted_by: actor.id,
          submitted_at: tx.fn.now(),
        });
      } else if (operation === "return_to_draft") {
        Object.assign(changes, {
          state: "draft",
          submitted_by: null,
          submitted_at: null,
        });
      } else {
        if (job.status !== "open")
          throw new PlatformError(
            "job_closed",
            "Reopen job before approving",
            409,
          );
        const draft = parseInput(
          draftSchema,
          this.pickDraft(await this.detail(tx, id)),
        );
        Object.assign(changes, {
          state: "approved",
          approved_by: actor.id,
          approved_at: tx.fn.now(),
          content_sha256: contentHash(draft),
        });
      }
      await tx("jd_versions").where({ id }).update(changes);
      if (operation === "approve")
        await tx("jobs")
          .where({ id: job.id })
          .update({
            active_jd_version_id: id,
            revision: job.revision + 1,
            updated_at: tx.fn.now(),
          });
      const action = {
        update: "jd.updated",
        submit: "jd.submitted",
        return_to_draft: "jd.returned_to_draft",
        approve: "jd.approved",
      }[operation];
      await writeEvent(
        this.audit,
        tx,
        actor,
        action,
        "jd_version",
        id,
        job.id,
        requestId,
        "reason" in data ? { return_reason: data.reason } : {},
      );
      return this.detail(tx, id);
    });
  }
  private pickDraft(value: {
    title: string;
    summary: string;
    criteria: unknown;
  }) {
    return {
      title: value.title,
      summary: value.summary,
      criteria: value.criteria,
    };
  }
}
