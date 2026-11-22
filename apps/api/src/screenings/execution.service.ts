import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Database, type Transaction } from "../db/database";
import {
  AUDIT_SERVICE,
  RESUME_STORAGE,
  type AuditService,
  type ResumeStorage,
} from "../common/interfaces";
import { JobAuthorization } from "../auth/authorization.service";
import { loadConfig } from "../common/config";
import { AiAdapter } from "./ai-adapter";
import {
  canonical,
  ExecutionError,
  hash,
  validateEnvelope,
} from "./validation";
@Injectable()
export class ScreeningExecution {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
    @Inject(AUDIT_SERVICE) private readonly audit: AuditService,
    @Inject(RESUME_STORAGE) private readonly storage: ResumeStorage,
    @Inject(AiAdapter) private readonly ai: AiAdapter,
  ) {}
  private async auditState(
    tx: Transaction,
    run: any,
    action: string,
    requestId: string,
    code?: string,
  ) {
    await this.audit.append(tx, {
      actor_id: null,
      actor_type: "worker",
      action,
      resource_type: "screening",
      resource_id: run.id,
      job_id: run.job_id,
      request_id: requestId,
      safe_metadata_json: code ? { reason_code: code } : {},
    });
  }
  async claim(id: string, requestId: string) {
    return this.db.transaction(async (tx) => {
      const run = await tx("screening_runs").where({ id }).forUpdate().first();
      if (
        !run ||
        ["completed", "failed", "running"].includes(run.status) ||
        (run.next_retry_at &&
          new Date(run.next_retry_at).getTime() > Date.now())
      )
        return null;
      if (run.attempt_count >= 2) {
        await this.terminal(tx, run, "attempts_exhausted", requestId);
        return null;
      }
      try {
        const actor = await tx("users")
          .where({ id: run.requested_by })
          .whereNull("disabled_at")
          .first();
        if (!actor) throw new Error("revoked");
        this.policy.assertAction(actor, "screenings.create");
        await this.policy.assertJobAccess(actor, run.job_id, tx);
        const application = await tx("applications")
          .where({ id: run.application_id, job_id: run.job_id })
          .first();
        const resume = await tx("resumes")
          .where({
            id: run.resume_id,
            candidate_id: application?.candidate_id,
            status: "uploaded",
          })
          .first();
        const jd = await tx("jd_versions")
          .where({
            id: run.jd_version_id,
            job_id: run.job_id,
            state: "approved",
          })
          .first();
        const config = await tx("screening_configs")
          .where({ id: run.scoring_config_id })
          .first();
        if (
          !application ||
          !resume ||
          !jd ||
          !config ||
          run.input_snapshot_json.resume.id !== resume.id ||
          run.input_snapshot_json.resume.storage_key !== resume.storage_key ||
          run.input_snapshot_json.resume.file_sha256 !== resume.file_sha256 ||
          run.input_snapshot_json.jd.id !== jd.id ||
          canonical(run.input_snapshot_json.manifest) !==
            canonical(config.effective_manifest_json) ||
          hash(canonical(run.input_snapshot_json)) !== run.input_fingerprint
        )
          throw new Error("relationships");
      } catch {
        await this.terminal(
          tx,
          run,
          "execution_authorization_failed",
          requestId,
        );
        return null;
      }
      const token = randomUUID();
      const [claimed] = await tx("screening_runs")
        .where({ id })
        .update({
          status: "running",
          attempt_count: run.attempt_count + 1,
          attempt_token: token,
          lease_expires_at: new Date(Date.now() + loadConfig().WORKER_LEASE_MS),
          started_at: run.started_at ?? new Date(),
          next_retry_at: null,
          error_code: null,
          safe_error_detail: null,
          attempt_history_json: JSON.stringify([
            ...run.attempt_history_json,
            {
              attempt: run.attempt_count + 1,
              token,
              started_at: new Date().toISOString(),
            },
          ]),
        })
        .returning("*");
      await this.auditState(tx, run, "screening.started", requestId);
      return claimed;
    });
  }
  async heartbeat(id: string, token: string) {
    const updated = await this.db
      .connection("screening_runs")
      .where({ id, attempt_token: token, status: "running" })
      .where("lease_expires_at", ">", this.db.connection.fn.now())
      .update({
        lease_expires_at: new Date(Date.now() + loadConfig().WORKER_LEASE_MS),
      });
    return updated === 1;
  }
  async terminal(tx: Transaction, run: any, code: string, requestId: string) {
    await tx("screening_runs")
      .where({ id: run.id })
      .update({
        status: "failed",
        error_code: code,
        safe_error_detail: `Screening failed: ${code}`,
        finished_at: new Date(),
        lease_expires_at: null,
        next_retry_at: null,
        attempt_history_json: JSON.stringify([
          ...run.attempt_history_json,
          {
            attempt: run.attempt_count,
            code,
            finished_at: new Date().toISOString(),
          },
        ]),
      });
    await this.auditState(tx, run, "screening.failed", requestId, code);
  }
  async finish(run: any, output: unknown, requestId: string) {
    const result = validateEnvelope(output, run.input_snapshot_json);
    return this.db.transaction(async (tx) => {
      const current = await tx("screening_runs")
        .where({
          id: run.id,
          status: "running",
          attempt_token: run.attempt_token,
        })
        .where("lease_expires_at", ">", tx.fn.now())
        .forUpdate()
        .first();
      if (!current) return false;
      for (const c of result.screening.criteria) {
        const mapping = run.input_snapshot_json.criteria_mapping.find(
          (m: any) => m.code === c.assessment.criterion_id,
        );
        if (!mapping) throw new ExecutionError("provenance_mismatch");
        await tx("screening_criterion_results").insert({
          screening_run_id: run.id,
          criterion_id: mapping.criterion_id,
          criterion_code: mapping.code,
          raw_assessment_json: c.assessment,
          validated_json: c.validation,
          evidence_json: JSON.stringify(c.evidence),
          level: c.validation.level,
          status: c.scoring.status,
          match_value: c.scoring.match_value,
          weight: c.scoring.weight,
          confidence: c.assessment.confidence,
          reason: c.assessment.reason,
          missing_information_json: JSON.stringify(
            c.assessment.missing_information,
          ),
        });
      }
      await tx("screening_runs")
        .where({ id: run.id })
        .update({
          status: "completed",
          result_json: result,
          normalized_source_text: result.source.text,
          source_pages_json: JSON.stringify(result.source.pages),
          normalized_text_sha256: result.source.normalized_text_sha256,
          ...result.screening.total,
          finished_at: new Date(),
          lease_expires_at: null,
          next_retry_at: null,
          attempt_history_json: JSON.stringify([
            ...current.attempt_history_json,
            {
              attempt: current.attempt_count,
              completed_at: new Date().toISOString(),
            },
          ]),
        });
      await this.auditState(tx, run, "screening.completed", requestId);
      return true;
    });
  }
  async fail(run: any, error: ExecutionError, requestId: string) {
    return this.db.transaction(async (tx) => {
      const current = await tx("screening_runs")
        .where({
          id: run.id,
          status: "running",
          attempt_token: run.attempt_token,
        })
        .where("lease_expires_at", ">", tx.fn.now())
        .forUpdate()
        .first();
      if (!current) return false;
      if (error.retryable && current.attempt_count < 2) {
        await tx("screening_runs")
          .where({ id: run.id })
          .update({
            status: "retry_wait",
            error_code: error.code,
            safe_error_detail: `Temporary screening failure: ${error.code}`,
            lease_expires_at: null,
            next_retry_at: new Date(
              Date.now() +
                5000 * 2 ** (current.attempt_count - 1) +
                Math.floor(Math.random() * 1000),
            ),
            attempt_history_json: JSON.stringify([
              ...current.attempt_history_json,
              {
                attempt: current.attempt_count,
                code: error.code,
                finished_at: new Date().toISOString(),
              },
            ]),
          });
        await this.auditState(
          tx,
          run,
          "screening.retry_wait",
          requestId,
          error.code,
        );
      } else await this.terminal(tx, current, error.code, requestId);
      return true;
    });
  }
  async execute(id: string, requestId: string) {
    const run = await this.claim(id, requestId);
    if (!run) return;
    const abort = new AbortController();
    const timer = setInterval(
      () => {
        void this.heartbeat(id, run.attempt_token)
          .then((ok) => {
            if (!ok) abort.abort();
          })
          .catch(() => abort.abort());
      },
      Math.min(30000, loadConfig().WORKER_LEASE_MS / 3),
    );
    try {
      let bytes: Buffer;
      try {
        const stream = await this.storage.open(
            run.input_snapshot_json.resume.storage_key,
          ),
          chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of stream) {
          size += chunk.length;
          if (size > 10 * 1024 * 1024) {
            stream.destroy();
            throw new Error("size");
          }
          chunks.push(Buffer.from(chunk));
        }
        bytes = Buffer.concat(chunks);
      } catch {
        throw new ExecutionError("resume_unavailable");
      }
      if (hash(bytes) !== run.input_snapshot_json.resume.file_sha256)
        throw new ExecutionError("file_hash_mismatch");
      if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
        throw new ExecutionError("invalid_pdf");
      const output = await this.ai.screen(
        id,
        requestId,
        run.input_snapshot_json,
        bytes,
        abort.signal,
      );
      await this.finish(run, output, requestId);
    } catch (error) {
      const failure =
        error instanceof ExecutionError
          ? error
          : new ExecutionError("execution_unavailable", true);
      await this.fail(run, failure, requestId);
      // Terminal jobs remain in BullMQ's failed set; DB retry_wait is redelivered by recovery.
      throw failure;
    } finally {
      clearInterval(timer);
      abort.abort();
    }
  }
}
