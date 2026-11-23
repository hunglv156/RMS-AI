import { Inject, Injectable } from "@nestjs/common";
import { actorJoin } from "../common/display";
import { z } from "zod";
import { Database } from "../db/database";
import {
  AUDIT_SERVICE,
  type Actor,
  type AuditService,
} from "../common/interfaces";
import { JobAuthorization } from "../auth/authorization.service";
import { parseInput } from "../auth/auth.service";
import { PlatformError } from "../common/errors";
export const reviewPageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_at", "-created_at"]).default("-created_at"),
});
const createSchema = z
  .object({
    decision: z.enum(["shortlist", "reject", "hold"]),
    note: z.string().trim().min(1).max(2000),
    expected_application_revision: z.number().int().positive(),
  })
  .strict();
@Injectable()
export class ReviewsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
    @Inject(AUDIT_SERVICE) private readonly audit: AuditService,
  ) {}
  async create(actor: Actor, runId: string, input: unknown, requestId: string) {
    this.policy.assertAction(actor, "reviews.create");
    const data = parseInput(createSchema, input);
    return this.db.transaction(async (tx) => {
      await this.policy.assertResourceAccess(actor, "screening", runId, tx);
      const run = await tx("screening_runs").where({ id: runId }).first();
      const application = await tx("applications")
        .where({ id: run.application_id })
        .forUpdate()
        .first();
      if (application.revision !== data.expected_application_revision)
        throw new PlatformError(
          "revision_conflict",
          "Application changed; reload before reviewing",
          409,
        );
      if (run.status !== "completed")
        throw new PlatformError(
          "review_requires_completed_run",
          "Review requires a completed run",
          409,
        );
      const [review] = await tx("human_reviews")
        .insert({
          application_id: application.id,
          screening_run_id: run.id,
          reviewer_id: actor.id,
          decision: data.decision,
          note: data.note,
          supersedes_review_id: application.current_review_id,
        })
        .returning("*");
      await tx("applications")
        .where({ id: application.id })
        .update({
          stage: review.decision,
          current_review_id: review.id,
          revision: application.revision + 1,
        });
      await this.audit.append(tx, {
        actor_id: actor.id,
        actor_type: "user",
        action: "review.created",
        resource_type: "human_review",
        resource_id: review.id,
        job_id: run.job_id,
        request_id: requestId,
        safe_metadata_json: {},
      });
      return actorJoin(
        tx("human_reviews").select("human_reviews.*"),
        "human_reviews.reviewer_id",
        "reviewer",
      )
        .where("human_reviews.id", review.id)
        .first();
    });
  }
  async list(actor: Actor, applicationId: string, input: unknown) {
    this.policy.assertAction(actor, "reviews.read");
    await this.policy.assertResourceAccess(actor, "application", applicationId);
    const { page, pageSize, sort } = parseInput(reviewPageSchema, input);
    const q = this.db
      .connection("human_reviews")
      .where({ application_id: applicationId });
    const [items, count] = await Promise.all([
      actorJoin(
        q.clone().select("human_reviews.*"),
        "human_reviews.reviewer_id",
        "reviewer",
      )
        .orderBy(
          "human_reviews.created_at",
          sort === "created_at" ? "asc" : "desc",
        )
        .orderBy("human_reviews.id")
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      q.clone().count("* as total").first(),
    ]);
    return { items, total: Number(count?.total), page, pageSize };
  }
}
