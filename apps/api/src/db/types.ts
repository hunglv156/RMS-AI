import type { ColumnType, Generated } from 'kysely';
import type { ParseStatus, Role } from '@rms/contracts';

type Ts = ColumnType<Date, Date | string | undefined, Date | string>;
type Json = ColumnType<unknown, string | undefined, string>;

export interface UsersTable {
  id: Generated<string>;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: Ts;
}
export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  family_id: string;
  token_hash: string;
  active_organization_id: string | null;
  expires_at: Date;
  used_at: Date | null;
  revoked_at: Date | null;
  created_at: Ts;
}
export interface OrganizationsTable {
  id: string;
  name: string;
  slug: string;
  settings_json: Json;
  created_at: Ts;
}
export interface MembershipsTable {
  id: Generated<string>;
  organization_id: string;
  user_id: string;
  role: Role;
  status: 'active' | 'suspended';
  created_at: Ts;
}
export interface JobsTable {
  id: Generated<string>;
  organization_id: string;
  title: string;
  description: Generated<string>;
  status: Generated<'draft' | 'open' | 'closed'>;
  created_by: string;
  active_jd_version_id: string | null;
  created_at: Ts;
  updated_at: Ts;
}
export interface CandidatesTable {
  id: Generated<string>;
  organization_id: string;
  display_name: string;
  contact_json: Json;
  consent_status: Generated<'unknown' | 'granted' | 'withdrawn'>;
  created_by: string;
  created_at: Ts;
}
export interface ResumesTable {
  id: Generated<string>;
  organization_id: string;
  candidate_id: string;
  version_no: Generated<number>;
  object_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number | string;
  page_count: number | null;
  sha256: string;
  parse_status: Generated<ParseStatus>;
  requires_manual_review: Generated<boolean>;
  created_by: string;
  created_at: Ts;
}
export interface DocumentProcessingRunsTable {
  id: Generated<string>;
  organization_id: string;
  resume_id: string;
  pipeline_version: string;
  status: Generated<'running' | 'succeeded' | 'failed'>;
  error: string | null;
  quality_flags_json: Json;
  extracted_text_key: string | null;
  structured_profile_json: unknown;
  prompt_version: string | null;
  model: string | null;
  timings_json: Json;
  created_at: Ts;
  finished_at: Date | null;
}
export interface AuditEventsTable {
  id: Generated<string>;
  organization_id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata_json: Json;
  created_at: Ts;
}
export interface BackgroundJobsTable {
  id: Generated<string>;
  organization_id: string;
  type: string;
  payload_json: Json;
  idempotency_key: string;
  status: Generated<'pending' | 'enqueued' | 'done' | 'failed'>;
  attempts: Generated<number>;
  last_error: string | null;
  created_at: Ts;
  enqueued_at: Date | null;
}

export interface JdVersionsTable {
  id: Generated<string>;
  organization_id: string;
  job_id: string;
  version_no: number;
  content_json: Json;
  approval_status: Generated<'draft' | 'approved'>;
  approved_by: string | null;
  approved_at: Date | null;
  prompt_version: string | null;
  created_by: string;
  created_at: Ts;
}
export interface JobCriteriaTable {
  id: Generated<string>;
  organization_id: string;
  jd_version_id: string;
  code: string;
  label: string;
  type: string;
  description: string;
  priority: 'must_have' | 'nice_to_have';
  weight: number | string;
  evidence_guidance_json: Json;
  sort_order: number;
}
export interface ApplicationsTable {
  id: Generated<string>;
  organization_id: string;
  job_id: string;
  candidate_id: string;
  resume_id: string;
  stage: Generated<string>;
  created_by: string;
  created_at: Ts;
}
export interface ScreeningConfigsTable {
  id: Generated<string>;
  organization_id: string;
  version_no: Generated<number>;
  name: Generated<string>;
  rubric_values: Json;
  unknown_policy: Generated<'exclude'>;
  min_coverage: number | string;
  thresholds_json: Json;
  created_at: Ts;
}
export type RunStatus =
  | 'queued' | 'waiting_document' | 'retrieving' | 'assessing' | 'validating' | 'scoring'
  | 'completed' | 'failed_validation' | 'failed_provider' | 'cancelled';
export interface ScreeningRunsTable {
  id: Generated<string>;
  organization_id: string;
  application_id: string;
  jd_version_id: string;
  resume_id: string;
  scoring_config_id: string;
  pipeline_fingerprint: string;
  pipeline_versions_json: Json;
  status: Generated<RunStatus>;
  score_state: 'scored' | 'insufficient_coverage' | null;
  observed_score: number | string | null;
  coverage: number | string | null;
  lower_bound: number | string | null;
  upper_bound: number | string | null;
  requires_manual_review: Generated<boolean>;
  error: string | null;
  timings_json: Json;
  created_by: string;
  created_at: Ts;
  finished_at: Date | null;
}
export interface ScreeningCriterionResultsTable {
  id: Generated<string>;
  organization_id: string;
  screening_run_id: string;
  criterion_id: string;
  level: string;
  status: string;
  match_value: number | string | null;
  weight: number | string;
  confidence: number | null;
  evidence_json: Json;
  reason: string;
  raw_assessment_json: Json;
  validation_notes: Json;
}
export interface ApiIdempotencyKeysTable {
  id: Generated<string>;
  organization_id: string;
  scope: string;
  idempotency_key: string;
  request_hash: string;
  response_json: unknown;
  created_at: Ts;
}

export interface Database {
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  organizations: OrganizationsTable;
  memberships: MembershipsTable;
  jobs: JobsTable;
  candidates: CandidatesTable;
  resumes: ResumesTable;
  jd_versions: JdVersionsTable;
  job_criteria: JobCriteriaTable;
  applications: ApplicationsTable;
  screening_configs: ScreeningConfigsTable;
  screening_runs: ScreeningRunsTable;
  screening_criterion_results: ScreeningCriterionResultsTable;
  api_idempotency_keys: ApiIdempotencyKeysTable;
  document_processing_runs: DocumentProcessingRunsTable;
  audit_events: AuditEventsTable;
  background_jobs: BackgroundJobsTable;
}
