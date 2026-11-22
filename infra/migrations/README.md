# Platform schema ownership

`apps/api/knexfile.cjs` is the only migration runner. Run `pnpm --filter @rms-ai/api db:migrate` using `MIGRATION_DATABASE_URL` for the local database owner (Compose's `rms_ai` by default). Never edit an applied migration; add a uniquely numbered migration instead. The migration uses ordinary PostgreSQL 16 and does not require vector indexes.

The database owner is the migration/reset administrator. Migration 202611230001 creates the `rms_app` NOLOGIN privilege group; API and worker logins must inherit this group, never database ownership, superuser, or schema CREATE privileges. Provision a separate local login through an administrator, using a chosen local password without committing it:

```sql
CREATE ROLE rms_api LOGIN PASSWORD '<choose-local-password>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT rms_app TO rms_api;
```

Set `DATABASE_URL` to that login and retain the owner's URL only in `MIGRATION_DATABASE_URL`. No password is embedded in the migration. The group can select/insert domain records and perform narrowly allowed updates/deletes; audit/reviews/criterion results are append-only, configurations immutable, and approved inputs and terminal runs have trigger guards. No domain DELETE endpoint is provided. Disposable resets use the owner role, after explicitly disabling guards or recreating the disposable database; normal seeds never disable guards.

The application role cannot update migration tracking tables, change triggers, or truncate historical tables. PostgreSQL FK defaults restrict deletion of referenced historical inputs. An intentional status-only transition may mark an immutable resume invalid. Criterion writes lock the parent JD row to serialize with approval. Active JD and screening/application composite FKs prevent cross-job references; run/resume guards also enforce candidate identity.

Integration tests target local `rms_ai_test` (or `rms_ai_test_<suffix>`), create it if absent, migrate it, and roll back fixture transactions. They do not drop or clear the development database. The test owner uses `SET LOCAL ROLE rms_app` when exercising mutation constraints; elevated setup remains isolated to the test database.
