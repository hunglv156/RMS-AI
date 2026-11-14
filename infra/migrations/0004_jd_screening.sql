-- Up Migration
-- JD version + tiêu chí tối thiểu (chưa có JD Generator), applications, cấu hình chấm điểm và screening run.
-- Mọi liên kết đều là composite FK (organization_id, id) để DB chặn tham chiếu chéo tenant.

-- Cho phép FK (organization_id, candidate_id, id) để một application không thể ghép CV của ứng viên khác.
ALTER TABLE resumes ADD CONSTRAINT ux_resumes_org_candidate_id UNIQUE (organization_id, candidate_id, id);

CREATE TABLE jd_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  job_id          uuid NOT NULL,
  version_no      integer NOT NULL,
  content_json    jsonb NOT NULL DEFAULT '{}',
  approval_status text NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft','approved')),
  approved_by     uuid REFERENCES users (id),
  approved_at     timestamptz,
  prompt_version  text,
  created_by      uuid NOT NULL REFERENCES users (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_jd_versions_org_id UNIQUE (organization_id, id),
  CONSTRAINT ux_jd_versions_job_no UNIQUE (organization_id, job_id, version_no),
  CONSTRAINT fk_jd_version_job FOREIGN KEY (organization_id, job_id)
    REFERENCES jobs (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT ck_jd_approved CHECK (
    (approval_status = 'approved') = (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

ALTER TABLE jobs ADD CONSTRAINT fk_job_active_jd
  FOREIGN KEY (organization_id, active_jd_version_id) REFERENCES jd_versions (organization_id, id);

CREATE TABLE job_criteria (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  jd_version_id          uuid NOT NULL,
  code                   text NOT NULL CHECK (code ~ '^[a-z][a-z0-9_]{1,48}$'),
  label                  text NOT NULL,
  type                   text NOT NULL DEFAULT 'technical_skill'
                           CHECK (type IN ('technical_skill','experience','soft_skill','language','education','other')),
  description            text NOT NULL DEFAULT '',
  priority               text NOT NULL DEFAULT 'nice_to_have' CHECK (priority IN ('must_have','nice_to_have')),
  weight                 numeric NOT NULL CHECK (weight >= 0),
  evidence_guidance_json jsonb NOT NULL DEFAULT '[]',
  sort_order             integer NOT NULL DEFAULT 0,
  CONSTRAINT ux_job_criteria_org_id UNIQUE (organization_id, id),
  CONSTRAINT ux_job_criteria_code UNIQUE (organization_id, jd_version_id, code),
  CONSTRAINT fk_criteria_jd_version FOREIGN KEY (organization_id, jd_version_id)
    REFERENCES jd_versions (organization_id, id) ON DELETE CASCADE
);

-- Bất biến sau khi duyệt: không sửa/xoá JD version đã duyệt và không đụng tới tiêu chí của nó.
CREATE FUNCTION jd_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.approval_status = 'approved' THEN
      RAISE EXCEPTION 'jd_version % is approved and immutable', OLD.id USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.approval_status = 'approved' THEN
    RAISE EXCEPTION 'jd_version % is approved and immutable', OLD.id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_jd_version_immutable BEFORE UPDATE OR DELETE ON jd_versions
  FOR EACH ROW EXECUTE FUNCTION jd_version_immutable();

CREATE FUNCTION job_criteria_parent_draft() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_status text;
  v_id uuid;
BEGIN
  v_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.jd_version_id ELSE NEW.jd_version_id END;
  SELECT approval_status INTO v_status FROM jd_versions WHERE id = v_id;
  IF v_status = 'approved' THEN
    RAISE EXCEPTION 'criteria of approved jd_version % are immutable', v_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER trg_job_criteria_parent_draft BEFORE INSERT OR UPDATE OR DELETE ON job_criteria
  FOR EACH ROW EXECUTE FUNCTION job_criteria_parent_draft();

CREATE TABLE applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  job_id          uuid NOT NULL,
  candidate_id    uuid NOT NULL,
  resume_id       uuid NOT NULL,
  stage           text NOT NULL DEFAULT 'applied',
  created_by      uuid NOT NULL REFERENCES users (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_applications_org_id UNIQUE (organization_id, id),
  CONSTRAINT ux_applications_job_candidate UNIQUE (organization_id, job_id, candidate_id),
  CONSTRAINT fk_application_job FOREIGN KEY (organization_id, job_id)
    REFERENCES jobs (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_application_candidate FOREIGN KEY (organization_id, candidate_id)
    REFERENCES candidates (organization_id, id) ON DELETE CASCADE,
  -- CV phải là của đúng ứng viên này (và cùng tổ chức).
  CONSTRAINT fk_application_resume FOREIGN KEY (organization_id, candidate_id, resume_id)
    REFERENCES resumes (organization_id, candidate_id, id) ON DELETE CASCADE
);
CREATE INDEX ix_application_org_job ON applications (organization_id, job_id);

CREATE TABLE screening_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  version_no      integer NOT NULL DEFAULT 1,
  name            text NOT NULL DEFAULT 'default',
  -- Ánh xạ level → match_value (ADR 0005). Số mặc định là minh hoạ, chưa hiệu chuẩn.
  rubric_values   jsonb NOT NULL DEFAULT '{"strong":1.0,"adequate":0.7,"partial":0.4,"absent":0.0}',
  unknown_policy  text NOT NULL DEFAULT 'exclude' CHECK (unknown_policy IN ('exclude')),
  min_coverage    numeric NOT NULL DEFAULT 0.6 CHECK (min_coverage >= 0 AND min_coverage <= 1),
  thresholds_json jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_screening_configs_org_id UNIQUE (organization_id, id),
  CONSTRAINT ux_screening_configs_version UNIQUE (organization_id, name, version_no)
);

CREATE TABLE screening_runs (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  application_id         uuid NOT NULL,
  jd_version_id          uuid NOT NULL,
  resume_id              uuid NOT NULL,
  scoring_config_id      uuid NOT NULL,
  pipeline_fingerprint   text NOT NULL,
  pipeline_versions_json jsonb NOT NULL DEFAULT '{}',
  status                 text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued','waiting_document','retrieving','assessing','validating','scoring','completed',
    'failed_validation','failed_provider','cancelled')),
  score_state            text CHECK (score_state IN ('scored','insufficient_coverage')),
  observed_score         numeric,
  coverage               numeric,
  lower_bound            numeric,
  upper_bound            numeric,
  requires_manual_review boolean NOT NULL DEFAULT false,
  error                  text,
  timings_json           jsonb NOT NULL DEFAULT '{}',
  created_by             uuid NOT NULL REFERENCES users (id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  finished_at            timestamptz,
  CONSTRAINT ux_screening_runs_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_run_application FOREIGN KEY (organization_id, application_id)
    REFERENCES applications (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_run_jd_version FOREIGN KEY (organization_id, jd_version_id)
    REFERENCES jd_versions (organization_id, id),
  CONSTRAINT fk_run_resume FOREIGN KEY (organization_id, resume_id)
    REFERENCES resumes (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_run_config FOREIGN KEY (organization_id, scoring_config_id)
    REFERENCES screening_configs (organization_id, id)
);
CREATE INDEX ix_screening_runs_tenant_application
  ON screening_runs (organization_id, application_id, created_at DESC);
-- Replay không tạo run trùng; đổi JD, config hoặc pipeline thì tạo run mới.
CREATE UNIQUE INDEX ux_screening_runs_identity
  ON screening_runs (organization_id, application_id, resume_id, jd_version_id,
                     scoring_config_id, pipeline_fingerprint);

CREATE TABLE screening_criterion_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  screening_run_id    uuid NOT NULL,
  criterion_id        uuid NOT NULL,
  level               text NOT NULL CHECK (level IN ('strong','adequate','partial','absent','unknown','needs_review')),
  status              text NOT NULL CHECK (status IN ('supported','partially_supported','not_supported','unknown','needs_review')),
  match_value         numeric CHECK (match_value IS NULL OR (match_value >= 0 AND match_value <= 1)),
  weight              numeric NOT NULL CHECK (weight >= 0),
  confidence          numeric,
  evidence_json       jsonb NOT NULL DEFAULT '[]',
  reason              text NOT NULL DEFAULT '',
  raw_assessment_json jsonb NOT NULL DEFAULT '{}',
  validation_notes    jsonb NOT NULL DEFAULT '[]',
  CONSTRAINT ux_scr_org_run_criterion UNIQUE (organization_id, screening_run_id, criterion_id),
  CONSTRAINT fk_scr_run FOREIGN KEY (organization_id, screening_run_id)
    REFERENCES screening_runs (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_scr_criterion FOREIGN KEY (organization_id, criterion_id)
    REFERENCES job_criteria (organization_id, id)
);

CREATE TABLE api_idempotency_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  scope           text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash    text NOT NULL,
  response_json   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_idem_scope_key UNIQUE (organization_id, scope, idempotency_key)
);

-- Mỗi tổ chức hiện có cần một cấu hình mặc định (migration chạy bằng superuser nên bỏ qua RLS).
INSERT INTO screening_configs (organization_id) SELECT id FROM organizations;

-- ===== RLS =====
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['jd_versions','job_criteria','applications','screening_configs',
                           'screening_runs','screening_criterion_results','api_idempotency_keys']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = app_org_id())'
      || ' WITH CHECK (organization_id = app_org_id())', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON jd_versions, job_criteria, applications,
  screening_configs, screening_runs, screening_criterion_results, api_idempotency_keys TO rms_app;
-- rms_ai không đọc dữ liệu nghiệp vụ mới: AI service nhận đầu vào qua HTTP và trả kết quả về NestJS.

-- Down Migration
DROP TABLE IF EXISTS api_idempotency_keys, screening_criterion_results, screening_runs,
  screening_configs, applications, job_criteria CASCADE;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS fk_job_active_jd;
DROP TABLE IF EXISTS jd_versions CASCADE;
DROP FUNCTION IF EXISTS job_criteria_parent_draft();
DROP FUNCTION IF EXISTS jd_version_immutable();
ALTER TABLE resumes DROP CONSTRAINT IF EXISTS ux_resumes_org_candidate_id;
