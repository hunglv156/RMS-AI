import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { Database, type Transaction } from "../db/database";
import { AuditWriter } from "../audit/audit-writer.service";
import { JobAuthorization, assertId } from "../auth/authorization.service";
import { parseInput } from "../auth/auth.service";
import type { Actor } from "../common/interfaces";
import { PlatformError } from "../common/errors";
import { notFound, pageSchema } from "../candidates/candidates.service";
@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
  ) {}
  async list(actor: Actor, jobId: string, input: unknown) {
    this.policy.assertAction(actor, "applications.read");
    await this.policy.assertJobAccess(actor, jobId);
    const { page, pageSize, search } = parseInput(pageSchema, input);
    const query = this.db
      .connection("applications")
      .join("candidates", "candidates.id", "applications.candidate_id")
      .where("applications.job_id", jobId);
    if (actor.role === "reviewer")
      query.whereExists(
        this.db
          .connection("job_assignments")
          .select("job_id")
          .whereRaw("job_assignments.job_id = applications.job_id")
          .where("user_id", actor.id),
      );
    if (search)
      query.whereILike(
        "candidates.display_name",
        `%${search.replace(/[\\%_]/g, "\\$&")}%`,
      );
    const [items, count] = await Promise.all([
      query
        .clone()
        .select("applications.*")
        .orderBy("applications.created_at", "desc")
        .orderBy("applications.id")
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      query.clone().count("* as total").first(),
    ]);
    return { items, total: Number(count?.total), page, pageSize };
  }
  private async resume(tx: Transaction, id: string, candidateId: string) {
    const row = await tx("resumes")
      .where({ id, candidate_id: candidateId, status: "uploaded" })
      .first();
    if (!row)
      throw new PlatformError(
        "invalid_resume",
        "Uploaded resume must belong to this candidate",
        400,
      );
  }
  async create(actor: Actor, jobId: string, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "applications.create");
    assertId(jobId);
    const data = parseInput(
      z
        .object({
          candidate_id: z.string().uuid(),
          resume_id: z.string().uuid(),
        })
        .strict(),
      input,
    );
    try {
      return await this.db.transaction(async (tx) => {
        await this.policy.assertJobAccess(actor, jobId, tx);
        const job = await tx("jobs").where({ id: jobId }).forUpdate().first();
        if (job.status !== "open")
          throw new PlatformError("job_closed", "Job is closed", 409);
        await this.resume(tx, data.resume_id, data.candidate_id);
        const [row] = await tx("applications")
          .insert({ ...data, job_id: jobId, created_by: actor.id })
          .returning("*");
        await this.audit.append(tx, {
          actor_id: actor.id,
          actor_type: "user",
          action: "application.created",
          resource_type: "application",
          resource_id: row.id,
          job_id: jobId,
          request_id: requestId,
          safe_metadata_json: {},
        });
        return row;
      });
    } catch (e) {
      if ((e as { code?: string }).code === "23505")
        throw new PlatformError(
          "application_exists",
          "Candidate already applied to this job",
          409,
        );
      throw e;
    }
  }
  async update(actor: Actor, id: string, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "applications.update");
    assertId(id);
    const data = parseInput(
      z
        .object({
          resume_id: z.string().uuid(),
          revision: z.number().int().positive(),
        })
        .strict(),
      input,
    );
    return this.db.transaction(async (tx) => {
      await this.policy.assertResourceAccess(actor, "application", id, tx);
      const row = await tx("applications").where({ id }).forUpdate().first();
      if (!row) throw notFound();
      if (row.revision !== data.revision)
        throw new PlatformError(
          "revision_conflict",
          "Application changed; reload before replacing resume",
          409,
        );
      await this.resume(tx, data.resume_id, row.candidate_id);
      const [updated] = await tx("applications")
        .where({ id })
        .update({ resume_id: data.resume_id, revision: row.revision + 1 })
        .returning("*");
      await this.audit.append(tx, {
        actor_id: actor.id,
        actor_type: "user",
        action: "application.resume_replaced",
        resource_type: "application",
        resource_id: id,
        job_id: row.job_id,
        request_id: requestId,
        safe_metadata_json: {},
      });
      return updated;
    });
  }
}
