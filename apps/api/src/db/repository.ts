import type { Knex } from "knex";
import type {
  Role,
  InputSnapshot,
  Manifest,
  ScreeningEnvelope,
  Decision,
  RunStatus,
} from "@rms-ai/contracts";
export type Timestamp = Date | string;
export interface UserRow {
  id: string;
  normalized_email: string;
  display_name: string;
  password_hash: string;
  role: Role;
  disabled_at: Timestamp | null;
  created_at: Timestamp;
}
export interface SessionRow {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: Timestamp;
  created_at: Timestamp;
  last_seen_at: Timestamp;
  csrf_token_hash: string;
}
export interface JobRow {
  id: string;
  title: string;
  status: "open" | "closed";
  created_by: string;
  active_jd_version_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  revision: number;
}
export interface JdVersionRow {
  id: string;
  job_id: string;
  version_no: number;
  title: string;
  summary: string;
  state: "draft" | "pending_approval" | "approved";
  revision: number;
  submitted_by: string | null;
  submitted_at: Timestamp | null;
  approved_by: string | null;
  approved_at: Timestamp | null;
  content_sha256: string | null;
  created_by: string;
  created_at: Timestamp;
}
export interface CriterionRow {
  id: string;
  jd_version_id: string;
  code: string;
  label: string;
  description: string;
  priority: "must_have" | "nice_to_have";
  weight: number;
  keywords_json: string[];
  sort_order: number;
}
export interface CandidateRow {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  provenance: "synthetic" | "demo_public";
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface ResumeRow {
  id: string;
  candidate_id: string;
  version_no: number;
  storage_key: string;
  original_filename: string;
  mime_type: "application/pdf";
  byte_size: string;
  file_sha256: string;
  status: "uploaded" | "invalid";
  uploaded_by: string;
  uploaded_at: Timestamp;
}
export interface ApplicationRow {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_id: string;
  stage: "new" | Decision;
  current_review_id: string | null;
  revision: number;
  created_by: string;
  created_at: Timestamp;
}
export interface ScreeningConfigRow {
  id: string;
  fingerprint: string;
  effective_manifest_json: Manifest;
  created_at: Timestamp;
}
export interface ScreeningRunRow {
  id: string;
  application_id: string;
  job_id: string;
  resume_id: string;
  jd_version_id: string;
  scoring_config_id: string;
  input_snapshot_json: InputSnapshot;
  input_fingerprint: string;
  generation: number;
  retry_of_run_id: string | null;
  attempt_history_json: Record<string, unknown>[];
  requested_by: string;
  status: RunStatus;
  attempt_count: number;
  attempt_token: string | null;
  lease_expires_at: Timestamp | null;
  queued_at: Timestamp;
  created_at: Timestamp;
  started_at: Timestamp | null;
  finished_at: Timestamp | null;
  next_retry_at: Timestamp | null;
  error_code: string | null;
  safe_error_detail: string | null;
  result_json: ScreeningEnvelope | null;
  normalized_source_text: string | null;
  source_pages_json: import("@rms-ai/contracts").SourcePage[] | null;
  normalized_text_sha256: string | null;
  score_state: "scored" | "insufficient_coverage" | null;
  observed_score: number | null;
  coverage: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  requires_manual_review: boolean | null;
}
export interface HumanReviewRow {
  id: string;
  application_id: string;
  screening_run_id: string;
  reviewer_id: string;
  decision: Decision;
  note: string;
  supersedes_review_id: string | null;
  created_at: Timestamp;
}
export interface OutboxRow {
  id: string;
  kind: string;
  run_id: string;
  delivery_generation: number;
  payload_json: Record<string, string>;
  created_at: Timestamp;
  delivered_at: Timestamp | null;
  last_error: string | null;
  attempts: number;
}
export interface Rows {
  users: UserRow;
  sessions: SessionRow;
  jobs: JobRow;
  jd_versions: JdVersionRow;
  job_criteria: CriterionRow;
  candidates: CandidateRow;
  resumes: ResumeRow;
  applications: ApplicationRow;
  screening_configs: ScreeningConfigRow;
  screening_runs: ScreeningRunRow;
  human_reviews: HumanReviewRow;
  outbox_events: OutboxRow;
  audit_events: AuditRow;
  screening_criterion_results: CriterionResultRow;
}
/** Require an explicit transaction when reading as part of an atomic mutation. */
export async function findById<T extends keyof Rows>(
  db: Knex | Knex.Transaction,
  table: T,
  id: string,
): Promise<Rows[T] | undefined> {
  return db(table).where({ id }).first() as Promise<Rows[T] | undefined>;
}
/** Optimistic writes must additionally check that exactly one row was affected. */
export async function lockById<T extends keyof Rows>(
  tx: Knex.Transaction,
  table: T,
  id: string,
): Promise<Rows[T] | undefined> {
  return tx(table).where({ id }).forUpdate().first() as Promise<
    Rows[T] | undefined
  >;
}
export interface AssignmentRow {
  job_id: string;
  user_id: string;
  assigned_by: string;
  created_at: Timestamp;
}
export interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_type: "user" | "worker" | "system";
  action: string;
  resource_type: string;
  resource_id: string;
  job_id: string | null;
  request_id: string;
  safe_metadata_json: Record<string, unknown>;
  created_at: Timestamp;
}
export interface IdempotencyRow {
  actor_id: string;
  route: string;
  key: string;
  request_hash: string;
  response_json: unknown;
  response_status: number;
  created_at: Timestamp;
  expires_at: Timestamp;
}
export interface CriterionResultRow {
  id: string;
  screening_run_id: string;
  criterion_id: string;
  criterion_code: string;
  raw_assessment_json: import("@rms-ai/contracts").CriterionAssessment;
  validated_json: import("@rms-ai/contracts").ScreenedCriterion["validation"];
  evidence_json: import("@rms-ai/contracts").ScreenedCriterion["evidence"];
  level: import("@rms-ai/contracts").Level;
  status: string;
  match_value: number | null;
  weight: number;
  confidence: number;
  reason: string;
  missing_information_json: string[];
}
export interface CompositeKeyRows {
  job_assignments: AssignmentRow;
  api_idempotency_keys: IdempotencyRow;
}
