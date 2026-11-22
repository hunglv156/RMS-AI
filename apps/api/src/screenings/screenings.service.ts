import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Actor, AuditService } from "../common/interfaces";
import { AUDIT_SERVICE } from "../common/interfaces";
import { Database, type Transaction } from "../db/database";
import { JobAuthorization, assertId } from "../auth/authorization.service";
import { PlatformError } from "../common/errors";
import { AiAdapter } from "./ai-adapter";
import { canonical, hash } from "./validation";
import type { InputSnapshot } from "@rms-ai/contracts";
import { dispatchState } from "../queues/connection";
export const summaryColumns = [
  "id",
  "application_id",
  "job_id",
  "resume_id",
  "jd_version_id",
  "scoring_config_id",
  "generation",
  "retry_of_run_id",
  "status",
  "attempt_count",
  "queued_at",
  "started_at",
  "finished_at",
  "next_retry_at",
  "error_code",
  "safe_error_detail",
];
export const summary = (r: any) =>
  Object.fromEntries(summaryColumns.map((k) => [k, r[k]]));
const startSchema = z
  .object({
    application_ids: z
      .array(z.string().uuid())
      .min(1)
      .max(10)
      .refine((v) => new Set(v).size === v.length),
    jd_version_id: z.string().uuid(),
  })
  .strict();
const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(["created_at", "-created_at"]).default("-created_at"),
  })
  .strict();
function parse<S extends z.ZodTypeAny>(schema: S, v: unknown): z.output<S> {
  const p = schema.safeParse(v);
  if (!p.success)
    throw new PlatformError("invalid_input", "Invalid screening request", 400);
  return p.data;
}
@Injectable()
export class ScreeningsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
    @Inject(AUDIT_SERVICE) private readonly audit: AuditService,
    @Inject(AiAdapter) private readonly ai: AiAdapter,
  ) {}
  async config() {
    const c = await this.ai.config();
    return {
      id: c.id,
      fingerprint: c.fingerprint,
      effective_manifest: c.effective_manifest_json,
      created_at: c.created_at,
    };
  }
  async get(actor: Actor, id: string) {
    await this.policy.assertResourceAccess(actor, "screening", id);
    const r = await this.db.connection("screening_runs").where({ id }).first();
    return { ...summary(r), result: r.result_json };
  }
  async history(actor: Actor, id: string, query: unknown) {
    await this.policy.assertResourceAccess(actor, "application", id);
    const p = parse(listSchema, query);
    const q = this.db
      .connection("screening_runs")
      .where({ application_id: id });
    const count = await q.clone().count("id as count").first();
    const items = await q
      .select(summaryColumns)
      .orderBy("created_at", p.sort === "created_at" ? "asc" : "desc")
      .orderBy("id")
      .limit(p.pageSize)
      .offset((p.page - 1) * p.pageSize);
    return {
      items,
      total: Number(count?.count),
      page: p.page,
      pageSize: p.pageSize,
    };
  }
  private async idempotent(
    actor: Actor,
    route: string,
    key: unknown,
    body: unknown,
    work: (tx: Transaction) => Promise<any>,
  ) {
    if (typeof key !== "string" || !/^[\x21-\x7e]{1,200}$/.test(key))
      throw new PlatformError(
        "idempotency_key_required",
        "Idempotency-Key required",
        400,
      );
    const requestHash = hash(canonical(body));
    return this.db.transaction(async (tx) => {
      await tx.raw("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", [
        `${actor.id}/${route}/${key}`,
      ]);
      const old = await tx("api_idempotency_keys")
        .where({ actor_id: actor.id, route, key })
        .first();
      if (old && new Date(old.expires_at).getTime() > Date.now()) {
        if (old.request_hash !== requestHash)
          throw new PlatformError(
            "idempotency_conflict",
            "Key already used with different input",
            409,
          );
        return old.response_json;
      }
      if (old)
        await tx("api_idempotency_keys")
          .where({ actor_id: actor.id, route, key })
          .delete();
      const response = await work(tx);
      await tx("api_idempotency_keys").insert({
        actor_id: actor.id,
        route,
        key,
        request_hash: requestHash,
        response_json: response,
        response_status: 202,
      });
      return response;
    });
  }
  private async add(
    tx: Transaction,
    actor: Actor,
    application: any,
    jdId: string,
    config: any,
    input: InputSnapshot,
    requestId: string,
    retry?: any,
  ) {
    const fingerprint = hash(canonical(input));
    const matches = await tx("screening_runs")
      .where({ application_id: application.id, input_fingerprint: fingerprint })
      .orderBy("generation", "desc");
    const previous = matches[0];
    const reusable = matches.find(
      (r) =>
        r.status !== "failed" && (!retry || r.retry_of_run_id === retry.id),
    );
    if (reusable) return summary(reusable);
    if (previous && !retry)
      throw new PlatformError(
        "retry_required",
        `Explicit retry required for run ${previous.id}`,
        409,
      );
    const [run] = await tx("screening_runs")
      .insert({
        application_id: application.id,
        job_id: application.job_id,
        resume_id: input.resume.id,
        jd_version_id: jdId,
        scoring_config_id: config.id,
        input_snapshot_json: input,
        input_fingerprint: fingerprint,
        generation: (previous?.generation ?? 0) + 1,
        retry_of_run_id: retry?.id ?? null,
        requested_by: actor.id,
      })
      .returning("*");
    await this.audit.append(tx, {
      actor_id: actor.id,
      actor_type: "user",
      action: retry ? "screening.retried" : "screening.requested",
      resource_type: "screening",
      resource_id: run.id,
      job_id: run.job_id,
      request_id: requestId,
      safe_metadata_json: {},
    });
    await tx("outbox_events").insert({
      kind: "screening",
      run_id: run.id,
      delivery_generation: 1,
      payload_json: { run_id: run.id, request_id: requestId },
    });
    return summary(run);
  }
  async start(
    actor: Actor,
    jobId: string,
    body: unknown,
    key: unknown,
    requestId: string,
  ) {
    this.policy.assertAction(actor, "screenings.create");
    assertId(jobId);
    const input = parse(startSchema, body);
    await this.policy.assertJobAccess(actor, jobId);
    const config = await this.ai.config(),
      state = await dispatchState();
    return this.idempotent(
      actor,
      `/jobs/${jobId}/screenings`,
      key,
      input,
      async (tx) => {
        await this.policy.assertJobAccess(actor, jobId, tx);
        const job = await tx("jobs").where({ id: jobId }).forUpdate().first();
        if (job.status !== "open")
          throw new PlatformError("job_closed", "Job is closed", 409);
        const jd = await tx("jd_versions")
          .where({ id: input.jd_version_id, job_id: jobId, state: "approved" })
          .first();
        if (!jd)
          throw new PlatformError(
            "jd_not_approved",
            "Approved job description required",
            409,
          );
        const criteria = await tx("job_criteria")
          .where({ jd_version_id: jd.id })
          .orderBy("sort_order")
          .orderBy("id");
        const runs = [];
        for (const id of [...input.application_ids].sort()) {
          const application = await tx("applications")
            .where({ id, job_id: jobId })
            .forUpdate()
            .first();
          if (!application)
            throw new PlatformError("not_found", "Application not found", 404);
          const resume = await tx("resumes")
            .where({
              id: application.resume_id,
              candidate_id: application.candidate_id,
              status: "uploaded",
            })
            .first();
          if (!resume)
            throw new PlatformError(
              "invalid_resume",
              "Valid resume required",
              409,
            );
          const snapshot: InputSnapshot = {
            jd: {
              id: jd.id,
              title: jd.title,
              summary: jd.summary,
              criteria: criteria.map((c) => ({
                code: c.code,
                label: c.label,
                description: c.description,
                priority: c.priority,
                weight: c.weight,
                keywords: c.keywords_json,
              })),
            },
            criteria_mapping: criteria.map((c) => ({
              criterion_id: c.id,
              code: c.code,
            })),
            resume: {
              id: resume.id,
              storage_key: resume.storage_key,
              file_sha256: resume.file_sha256,
            },
            manifest: config.effective_manifest_json,
          };
          runs.push(
            await this.add(
              tx,
              actor,
              application,
              jd.id,
              config,
              snapshot,
              requestId,
            ),
          );
        }
        return { runs, dispatch_state: state };
      },
    );
  }
  async retry(
    actor: Actor,
    id: string,
    key: unknown,
    requestId: string,
    body: unknown = {},
  ) {
    this.policy.assertAction(actor, "screenings.retry");
    parse(z.object({}).strict(), body);
    await this.policy.assertResourceAccess(actor, "screening", id);
    const failed = await this.db
      .connection("screening_runs")
      .where({ id })
      .first();
    const config =
      failed.error_code === "config_changed"
        ? await this.ai.config()
        : await this.db
            .connection("screening_configs")
            .where({ id: failed.scoring_config_id })
            .first();
    const state = await dispatchState();
    return this.idempotent(
      actor,
      `/screenings/${id}/retries`,
      key,
      {},
      async (tx) => {
        await this.policy.assertResourceAccess(actor, "screening", id, tx);
        const job = await tx("jobs")
          .where({ id: failed.job_id })
          .forUpdate()
          .first();
        const application = await tx("applications")
          .where({ id: failed.application_id })
          .forUpdate()
          .first();
        if (job.status !== "open")
          throw new PlatformError("job_closed", "Job is closed", 409);
        if (failed.status !== "failed")
          throw new PlatformError(
            "retry_requires_failure",
            "Run must be failed",
            409,
          );
        const snapshot = {
          ...failed.input_snapshot_json,
          manifest: config.effective_manifest_json,
        };
        return {
          runs: [
            await this.add(
              tx,
              actor,
              application,
              failed.jd_version_id,
              config,
              snapshot,
              requestId,
              failed,
            ),
          ],
          dispatch_state: state,
        };
      },
    );
  }
}
