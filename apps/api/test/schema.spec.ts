import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from '../src/db/migrate';
import { createTestDb, withTenant, type TestDb } from './helpers/db';

let db: TestDb;
let orgA: string;
let orgB: string;
let userId: string;
let jobA: string;
let jobB: string;

beforeAll(async () => {
  db = await createTestDb('schema');
  const u = await db.admin.query(
    "INSERT INTO users (email, display_name, password_hash) VALUES ('a@x.io','A','h') RETURNING id",
  );
  userId = u.rows[0].id;
  const [a, b] = await Promise.all(
    ['A', 'B'].map((n) =>
      db.admin.query('INSERT INTO organizations (name, slug) VALUES ($1,$2) RETURNING id', [n, `org-${n}`]),
    ),
  );
  orgA = a!.rows[0].id;
  orgB = b!.rows[0].id;
  // Admin (owner của bảng) bỏ qua RLS vì không bật FORCE cho superuser; dùng để seed.
  jobA = (await db.admin.query("INSERT INTO jobs (organization_id, title, created_by) VALUES ($1,'JA',$2) RETURNING id", [orgA, userId])).rows[0].id;
  jobB = (await db.admin.query("INSERT INTO jobs (organization_id, title, created_by) VALUES ($1,'JB',$2) RETURNING id", [orgB, userId])).rows[0].id;
});

afterAll(async () => {
  await db.drop();
});

describe('migration', () => {
  it('up → down → up chạy sạch', async () => {
    const probe = await createTestDb('updown');
    try {
      await migrate(probe.adminUrl, 'down');
      const gone = await probe.admin.query("SELECT to_regclass('public.jobs') AS t");
      expect(gone.rows[0].t).toBeNull();
      await migrate(probe.adminUrl, 'up');
      const back = await probe.admin.query("SELECT to_regclass('public.jobs') AS t");
      expect(back.rows[0].t).toBe('jobs');
    } finally {
      await probe.drop();
    }
  });

  it('role ứng dụng không phải superuser và không BYPASSRLS', async () => {
    const r = await db.admin.query(
      "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('rms_app','rms_ai')",
    );
    expect(r.rows).toHaveLength(2);
    for (const row of r.rows) {
      expect(row.rolsuper).toBe(false);
      expect(row.rolbypassrls).toBe(false);
    }
  });

  it('mọi bảng tenant bật RLS và FORCE', async () => {
    const r = await db.admin.query(`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
         AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'organization_id')
         AND NOT (c.relrowsecurity AND c.relforcerowsecurity)`);
    expect(r.rows).toEqual([]);
  });
});

describe('RLS', () => {
  it('thiếu app.organization_id thì query lỗi (fail closed)', async () => {
    await expect(db.app.query('SELECT * FROM jobs')).rejects.toThrow(/app\.organization_id/);
  });

  it('context rỗng (sau SET LOCAL kết thúc) cũng fail closed', async () => {
    await withTenant(db.app, orgA, async (q) => q('SELECT 1'));
    await expect(db.app.query('SELECT * FROM jobs')).rejects.toThrow();
  });

  it('org A chỉ thấy bản ghi của mình, kể cả khi truyền đúng id của B', async () => {
    const own = await withTenant(db.app, orgA, (q) => q('SELECT id FROM jobs'));
    expect(own.rows.map((r) => r.id)).toEqual([jobA]);
    const other = await withTenant(db.app, orgA, (q) => q('SELECT id FROM jobs WHERE id = $1', [jobB]));
    expect(other.rows).toEqual([]);
  });

  it('org A không sửa hoặc xoá được bản ghi của B', async () => {
    const upd = await withTenant(db.app, orgA, (q) => q("UPDATE jobs SET title='x' WHERE id = $1", [jobB]));
    expect(upd.rowCount).toBe(0);
    const del = await withTenant(db.app, orgA, (q) => q('DELETE FROM jobs WHERE id = $1', [jobB]));
    expect(del.rowCount).toBe(0);
    const still = await db.admin.query('SELECT title FROM jobs WHERE id = $1', [jobB]);
    expect(still.rows[0].title).toBe('JB');
  });

  it('org A không chèn được bản ghi mang organization_id của B', async () => {
    await expect(
      withTenant(db.app, orgA, (q) =>
        q("INSERT INTO jobs (organization_id, title, created_by) VALUES ($1,'evil',$2)", [orgB, userId]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('rms_ai cũng bị RLS và chỉ ghi được document_processing_runs', async () => {
    await expect(db.ai.query('SELECT * FROM resumes')).rejects.toThrow(/app\.organization_id/);
    await expect(
      withTenant(db.ai, orgA, (q) => q("INSERT INTO jobs (organization_id, title, created_by) VALUES ($1,'x',$2)", [orgA, userId])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('ràng buộc', () => {
  it('DB chặn FK chéo tenant (resume của org A trỏ candidate của org B)', async () => {
    const candB = (await db.admin.query("INSERT INTO candidates (organization_id, display_name, created_by) VALUES ($1,'cB',$2) RETURNING id", [orgB, userId])).rows[0].id;
    await expect(
      db.admin.query(
        `INSERT INTO resumes (organization_id, candidate_id, object_key, original_filename, mime_type, size_bytes, sha256, created_by)
         VALUES ($1,$2,'k','f.pdf','application/pdf',1,'h1',$3)`,
        [orgA, candB, userId],
      ),
    ).rejects.toThrow(/fk_resume_candidate/);
  });

  it('unique (organization_id, sha256) trên resume', async () => {
    const cand = (await db.admin.query("INSERT INTO candidates (organization_id, display_name, created_by) VALUES ($1,'cA',$2) RETURNING id", [orgA, userId])).rows[0].id;
    const ins = () =>
      db.admin.query(
        `INSERT INTO resumes (organization_id, candidate_id, object_key, original_filename, mime_type, size_bytes, sha256, created_by)
         VALUES ($1,$2,gen_random_uuid()::text,'f.pdf','application/pdf',1,'same',$3)`,
        [orgA, cand, userId],
      );
    await ins();
    await expect(ins()).rejects.toThrow(/ux_resumes_org_sha256/);
  });

  it('audit_events chỉ thêm, không sửa hay xoá được', async () => {
    await withTenant(db.app, orgA, (q) =>
      q("INSERT INTO audit_events (organization_id, actor_id, action, resource_type) VALUES ($1,$2,'t','job')", [orgA, userId]),
    );
    await expect(withTenant(db.app, orgA, (q) => q("UPDATE audit_events SET action='x'"))).rejects.toThrow();
    await expect(withTenant(db.app, orgA, (q) => q('DELETE FROM audit_events'))).rejects.toThrow();
    await expect(db.admin.query("UPDATE audit_events SET action='x'")).rejects.toThrow(/append-only/);
  });
});
