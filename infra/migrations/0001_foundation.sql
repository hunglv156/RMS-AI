-- Up Migration
-- Nền tảng Phase 1: tenant, auth, job/candidate/resume, xử lý tài liệu, audit, outbox.
-- RLS bật FORCE ở mọi bảng tenant (README 4.2). rms_app/rms_ai không phải superuser, không BYPASSRLS.
-- Mật khẩu role dưới đây chỉ dùng cho môi trường local.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rms_app') THEN
    CREATE ROLE rms_app LOGIN PASSWORD 'rms_app_local' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rms_ai') THEN
    CREATE ROLE rms_ai LOGIN PASSWORD 'rms_ai_local' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- Context tenant của transaction hiện tại. Thiếu thì current_setting báo lỗi: fail closed.
CREATE FUNCTION app_org_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.organization_id')::uuid $$;

-- ===== Bảng toàn cục (không thuộc tenant) =====
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  display_name  text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));

CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  family_id   uuid NOT NULL,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_tokens_family ON refresh_tokens (family_id);

-- ===== Bảng tenant =====
CREATE TABLE organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  settings_json jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('owner','admin','recruiter','hiring_manager','viewer')),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_memberships_org_id UNIQUE (organization_id, id)
);
CREATE UNIQUE INDEX ux_membership_org_user ON memberships (organization_id, user_id);
CREATE INDEX ix_membership_user ON memberships (user_id);

CREATE TABLE jobs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  title                text NOT NULL,
  description          text NOT NULL DEFAULT '',
  status               text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed')),
  created_by           uuid NOT NULL REFERENCES users (id),
  active_jd_version_id uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_jobs_org_id UNIQUE (organization_id, id)
);
CREATE INDEX ix_jobs_org_created ON jobs (organization_id, created_at DESC);

CREATE TABLE candidates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  contact_json    jsonb NOT NULL DEFAULT '{}',
  consent_status  text NOT NULL DEFAULT 'unknown'
                    CHECK (consent_status IN ('unknown','granted','withdrawn')),
  created_by      uuid NOT NULL REFERENCES users (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_candidates_org_id UNIQUE (organization_id, id)
);
CREATE INDEX ix_candidates_org_created ON candidates (organization_id, created_at DESC);

CREATE TABLE resumes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  candidate_id      uuid NOT NULL,
  version_no        integer NOT NULL DEFAULT 1,
  object_key        text NOT NULL,
  original_filename text NOT NULL,
  mime_type         text NOT NULL,
  size_bytes        bigint NOT NULL,
  page_count        integer,
  sha256            text NOT NULL,
  parse_status      text NOT NULL DEFAULT 'uploaded' CHECK (parse_status IN (
    'uploaded','queued','validating','extracting','indexing','ready',
    'rejected','failed_extraction','failed_provider','cancelled')),
  requires_manual_review boolean NOT NULL DEFAULT false,
  created_by        uuid NOT NULL REFERENCES users (id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_resumes_org_id UNIQUE (organization_id, id),
  CONSTRAINT ux_resumes_org_sha256 UNIQUE (organization_id, sha256),
  CONSTRAINT fk_resume_candidate FOREIGN KEY (organization_id, candidate_id)
    REFERENCES candidates (organization_id, id) ON DELETE CASCADE
);
CREATE INDEX ix_resumes_org_candidate ON resumes (organization_id, candidate_id);

CREATE TABLE document_processing_runs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  resume_id               uuid NOT NULL,
  pipeline_version        text NOT NULL,
  status                  text NOT NULL DEFAULT 'running'
                            CHECK (status IN ('running','succeeded','failed')),
  error                   text,
  quality_flags_json      jsonb NOT NULL DEFAULT '{}',
  extracted_text_key      text,
  structured_profile_json jsonb,
  prompt_version          text,
  model                   text,
  timings_json            jsonb NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  finished_at             timestamptz,
  CONSTRAINT ux_dpr_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_dpr_resume FOREIGN KEY (organization_id, resume_id)
    REFERENCES resumes (organization_id, id) ON DELETE CASCADE
);
-- Idempotency: cùng resume và cùng phiên bản pipeline chỉ có một run.
CREATE UNIQUE INDEX ux_dpr_resume_pipeline
  ON document_processing_runs (organization_id, resume_id, pipeline_version);

CREATE TABLE audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  actor_id        uuid REFERENCES users (id),
  action          text NOT NULL,
  resource_type   text NOT NULL,
  resource_id     uuid,
  metadata_json   jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_org_created ON audit_events (organization_id, created_at DESC);

-- Append-only: chặn UPDATE/DELETE kể cả với owner của bảng (trừ TRUNCATE/DROP khi migrate).
CREATE FUNCTION audit_events_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END $$;
CREATE TRIGGER trg_audit_events_immutable
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();

-- Outbox: ghi cùng transaction với dữ liệu nghiệp vụ, poller đẩy sang BullMQ.
CREATE TABLE background_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  type            text NOT NULL,
  payload_json    jsonb NOT NULL DEFAULT '{}',
  idempotency_key text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','enqueued','done','failed')),
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  enqueued_at     timestamptz
);
CREATE UNIQUE INDEX ux_background_jobs_idem ON background_jobs (organization_id, idempotency_key);
CREATE INDEX ix_background_jobs_pending ON background_jobs (status, created_at) WHERE status = 'pending';

-- ===== RLS =====
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['memberships','jobs','candidates','resumes',
                           'document_processing_runs','audit_events','background_jobs']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = app_org_id())'
      || ' WITH CHECK (organization_id = app_org_id())', t);
  END LOOP;
END $$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations
  USING (id = app_org_id()) WITH CHECK (id = app_org_id());

-- ===== Quyền =====
-- Các hàm SECURITY DEFINER phục vụ đăng nhập (chưa có context tenant): chỉ đọc danh sách
-- membership/tổ chức của chính một user.
CREATE FUNCTION auth_memberships(p_user_id uuid)
  RETURNS TABLE (organization_id uuid, organization_name text, organization_slug text,
                 role text, status text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT m.organization_id, o.name, o.slug, m.role, m.status
      FROM memberships m JOIN organizations o ON o.id = m.organization_id
     WHERE m.user_id = p_user_id
     ORDER BY o.name
  $$;
REVOKE ALL ON FUNCTION auth_memberships(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_memberships(uuid) TO rms_app;

GRANT USAGE ON SCHEMA public TO rms_app, rms_ai;
GRANT EXECUTE ON FUNCTION app_org_id() TO rms_app, rms_ai;

GRANT SELECT, INSERT, UPDATE ON users TO rms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO rms_app;
GRANT SELECT, INSERT, UPDATE ON organizations TO rms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships, jobs, candidates, resumes TO rms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_processing_runs, background_jobs TO rms_app;
GRANT SELECT, INSERT ON audit_events TO rms_app;

-- rms_ai chỉ đọc resumes và ghi kết quả xử lý.
GRANT SELECT ON resumes TO rms_ai;
GRANT SELECT, INSERT, UPDATE ON document_processing_runs TO rms_ai;

-- Down Migration
DROP TABLE IF EXISTS background_jobs, audit_events, document_processing_runs, resumes,
  candidates, jobs, memberships, organizations, refresh_tokens, users CASCADE;
DROP FUNCTION IF EXISTS audit_events_immutable();
DROP FUNCTION IF EXISTS auth_memberships(uuid);
DROP FUNCTION IF EXISTS app_org_id();
DROP OWNED BY rms_app, rms_ai;
-- Role là đối tượng của cả cluster: bỏ qua nếu database khác vẫn còn dùng.
DO $$
BEGIN
  DROP ROLE IF EXISTS rms_app;
  DROP ROLE IF EXISTS rms_ai;
EXCEPTION WHEN dependent_objects_still_exist THEN
  NULL;
END $$;
