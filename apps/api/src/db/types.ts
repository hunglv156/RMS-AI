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

export interface Database {
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  organizations: OrganizationsTable;
  memberships: MembershipsTable;
  jobs: JobsTable;
  candidates: CandidatesTable;
  resumes: ResumesTable;
  audit_events: AuditEventsTable;
  background_jobs: BackgroundJobsTable;
}
