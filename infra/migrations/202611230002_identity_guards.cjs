exports.up = async function (knex) {
  await knex.raw(`
    CREATE FUNCTION guard_application_identity() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF ROW(NEW.id, NEW.job_id, NEW.candidate_id, NEW.created_by, NEW.created_at)
         IS DISTINCT FROM ROW(OLD.id, OLD.job_id, OLD.candidate_id, OLD.created_by, OLD.created_at)
      THEN RAISE EXCEPTION 'application identity is immutable' USING ERRCODE='23514'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER protect_application_identity BEFORE UPDATE ON applications
      FOR EACH ROW EXECUTE FUNCTION guard_application_identity();
    ALTER TABLE sessions ADD CONSTRAINT session_hashes_only
      CHECK (token_hash ~ '^[a-f0-9]{64}$' AND csrf_token_hash ~ '^[a-f0-9]{64}$');
    ALTER TABLE api_idempotency_keys ADD CONSTRAINT idempotency_request_hash
      CHECK (request_hash ~ '^[a-f0-9]{64}$');
  `);
};
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE api_idempotency_keys DROP CONSTRAINT idempotency_request_hash;
    ALTER TABLE sessions DROP CONSTRAINT session_hashes_only;
    DROP TRIGGER protect_application_identity ON applications;
    DROP FUNCTION guard_application_identity();
  `);
};
