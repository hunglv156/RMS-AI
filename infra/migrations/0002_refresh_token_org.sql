-- Up Migration
-- Tổ chức đang active gắn với refresh token để refresh giữ nguyên ngữ cảnh.
ALTER TABLE refresh_tokens ADD COLUMN active_organization_id uuid;

-- Down Migration
ALTER TABLE refresh_tokens DROP COLUMN active_organization_id;
