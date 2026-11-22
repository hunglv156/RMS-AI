import { Inject, Injectable, SetMetadata } from "@nestjs/common";
import type { Actor, AuthorizationPolicy } from "../common/interfaces";
import { Database, type Transaction } from "../db/database";
import { PlatformError } from "../common/errors";
export const ACTION = "rms:action";
export const RequireAction = (action: string) => SetMetadata(ACTION, action);
const common = [
  "jobs.read",
  "jd.read",
  "applications.read",
  "resumes.read",
  "screenings.read",
  "screening_config.read",
  "reviews.read",
  "reviews.create",
  "dashboard.read",
];
const recruiter = [
  "jobs.create",
  "jobs.update",
  "jd.create",
  "jd.update",
  "jd.submit",
  "jd.clone",
  "candidates.read",
  "candidates.create",
  "candidates.update",
  "resumes.create",
  "applications.create",
  "applications.update",
  "screenings.create",
  "screenings.retry",
];
const admin = [
  "users.read",
  "users.create",
  "users.update",
  "jobs.assign",
  "jd.approve",
  "jd.return_to_draft",
  "audit.read",
];
export function allowedActions(actor: Actor): string[] {
  if (actor.role === "admin") return [...common, ...recruiter, ...admin];
  if (actor.role === "recruiter") return [...common, ...recruiter];
  if (actor.role === "reviewer")
    return [...common, "jd.approve", "jd.return_to_draft"];
  return [];
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertId(id: string): void {
  if (!uuid.test(id))
    throw new PlatformError("not_found", "Record not found", 404);
}
@Injectable()
export class JobAuthorization implements AuthorizationPolicy {
  constructor(@Inject(Database) private readonly db: Database) {}
  assertAction(actor: Actor, action: string): void {
    if (!allowedActions(actor).includes(action))
      throw new PlatformError("forbidden", "Action forbidden", 403);
  }
  async assertJobAccess(
    actor: Actor,
    jobId: string,
    tx?: Transaction,
  ): Promise<void> {
    assertId(jobId);
    const db = tx ?? this.db.connection;
    const query = db("jobs").where("jobs.id", jobId);
    if (actor.role === "reviewer")
      query.whereExists(
        db("job_assignments")
          .select("job_id")
          .whereRaw("job_assignments.job_id = jobs.id")
          .where("user_id", actor.id),
      );
    else if (!["admin", "recruiter"].includes(actor.role))
      throw new PlatformError("forbidden", "Action forbidden", 403);
    if (!(await query.first()))
      throw new PlatformError("not_found", "Record not found", 404);
  }
  /** Resolve resource ownership in SQL; never trust a client-supplied job ID. */
  async assertResourceAccess(
    actor: Actor,
    kind: "application" | "screening" | "jd" | "resume",
    id: string,
    tx?: Transaction,
  ): Promise<void> {
    assertId(id);
    const db = tx ?? this.db.connection;
    if (kind === "resume") {
      const resume = await db("resumes").where({ id }).first();
      if (!resume)
        throw new PlatformError("not_found", "Record not found", 404);
      if (actor.role === "admin" || actor.role === "recruiter") return;
      const linked = db("applications")
        .select("job_id")
        .where("resume_id", id)
        .union(db("screening_runs").select("job_id").where("resume_id", id));
      const grant = await db("job_assignments")
        .where("user_id", actor.id)
        .whereIn("job_id", linked)
        .first();
      if (actor.role !== "reviewer" || !grant)
        throw new PlatformError("not_found", "Record not found", 404);
      return;
    }
    const table = {
      application: "applications",
      screening: "screening_runs",
      jd: "jd_versions",
    }[kind];
    const record = await db(table).select("job_id").where({ id }).first();
    if (!record) throw new PlatformError("not_found", "Record not found", 404);
    await this.assertJobAccess(actor, record.job_id, tx);
  }
}
