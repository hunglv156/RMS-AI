import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Actor } from "../common/interfaces";
import { Database, type Transaction } from "../db/database";
import { JobAuthorization } from "../auth/authorization.service";
import { parseInput } from "../auth/auth.service";
import { AuditWriter } from "../audit/audit-writer.service";
import { PlatformError } from "../common/errors";
export const revisionSchema = z.number().int().positive();
export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).default(""),
  sort: z
    .enum(["created_at", "-created_at", "title", "-title"])
    .default("-created_at"),
});
export function checkRevision(actual: number, expected: number) {
  if (actual !== expected)
    throw new PlatformError(
      "revision_conflict",
      "Record has changed; reload and try again",
      409,
    );
}
export async function writeEvent(
  audit: AuditWriter,
  tx: Transaction,
  actor: Actor,
  action: string,
  type: string,
  id: string,
  jobId: string,
  requestId: string,
  metadata: Record<string, unknown> = {},
) {
  await audit.append(tx, {
    actor_id: actor.id,
    actor_type: "user",
    action,
    resource_type: type,
    resource_id: id,
    job_id: jobId,
    request_id: requestId,
    safe_metadata_json: metadata,
  });
}
@Injectable()
export class JobsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
  ) {}
  async list(actor: Actor, input: unknown) {
    this.policy.assertAction(actor, "jobs.read");
    const q = parseInput(
      pageSchema.extend({ status: z.enum(["open", "closed"]).optional() }),
      input,
    );
    const base = this.db.connection("jobs");
    if (actor.role === "reviewer")
      base.whereExists(
        this.db
          .connection("job_assignments")
          .select("job_id")
          .whereRaw("job_assignments.job_id = jobs.id")
          .where("user_id", actor.id),
      );
    if (q.search)
      base.whereILike("title", `%${q.search.replace(/[\\%_]/g, "\\$&")}%`);
    if (q.status) base.where("status", q.status);
    const total = await base.clone().count("* as count").first();
    const items = await base
      .select("jobs.*")
      .orderBy(
        q.sort.replace(/^-/, ""),
        q.sort.startsWith("-") ? "desc" : "asc",
      )
      .orderBy("id")
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    return {
      items,
      total: Number(total?.count),
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  async get(actor: Actor, id: string) {
    this.policy.assertAction(actor, "jobs.read");
    await this.policy.assertJobAccess(actor, id);
    return this.db.connection("jobs").where({ id }).first();
  }
  async create(actor: Actor, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "jobs.create");
    const data = parseInput(
      z.object({ title: z.string().trim().min(1).max(300) }).strict(),
      input,
    );
    return this.db.transaction(async (tx) => {
      const [job] = await tx("jobs")
        .insert({ ...data, created_by: actor.id })
        .returning("*");
      await writeEvent(
        this.audit,
        tx,
        actor,
        "job.created",
        "job",
        job.id,
        job.id,
        requestId,
      );
      return job;
    });
  }
  async update(actor: Actor, id: string, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "jobs.update");
    const { revision, ...data } = parseInput(
      z
        .object({
          revision: revisionSchema,
          title: z.string().trim().min(1).max(300).optional(),
          status: z.enum(["open", "closed"]).optional(),
        })
        .strict()
        .refine((v) => v.title !== undefined || v.status !== undefined),
      input,
    );
    return this.db.transaction(async (tx) => {
      await this.policy.assertJobAccess(actor, id, tx);
      const job = await tx("jobs").where({ id }).forUpdate().first();
      checkRevision(job.revision, revision);
      const [updated] = await tx("jobs")
        .where({ id })
        .update({ ...data, revision: revision + 1, updated_at: tx.fn.now() })
        .returning("*");
      await writeEvent(
        this.audit,
        tx,
        actor,
        "job.updated",
        "job",
        id,
        id,
        requestId,
      );
      return updated;
    });
  }
  async assign(actor: Actor, id: string, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "jobs.assign");
    const data = parseInput(
      z
        .object({
          user_ids: z
            .array(z.string().uuid())
            .max(100)
            .refine((v) => new Set(v).size === v.length),
        })
        .strict(),
      input,
    );
    return this.db.transaction(async (tx) => {
      // Match user administration's lock so role/disable changes cannot race grant validation.
      await tx.raw("SELECT pg_advisory_xact_lock(8202)");
      await this.policy.assertJobAccess(actor, id, tx);
      await tx("jobs").where({ id }).forUpdate().first();
      const users = await tx("users")
        .whereIn("id", data.user_ids)
        .where({ role: "reviewer" })
        .whereNull("disabled_at");
      if (users.length !== data.user_ids.length)
        throw new PlatformError(
          "invalid_assignment",
          "Assignments require active reviewers",
          400,
        );
      await tx("job_assignments").where({ job_id: id }).delete();
      if (data.user_ids.length)
        await tx("job_assignments").insert(
          data.user_ids.map((user_id) => ({
            job_id: id,
            user_id,
            assigned_by: actor.id,
          })),
        );
      await writeEvent(
        this.audit,
        tx,
        actor,
        "job.assignments_updated",
        "job",
        id,
        id,
        requestId,
      );
      return data;
    });
  }
}
