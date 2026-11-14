import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { migrate } from '../../src/db/migrate';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const adminUrl = process.env.DATABASE_URL_ADMIN;
if (!adminUrl) throw new Error('DATABASE_URL_ADMIN chưa được đặt (xem .env.example)');

function withDb(url: string, db: string, user?: string, pass?: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  if (user) {
    u.username = user;
    u.password = pass ?? '';
  }
  return u.toString();
}

export interface TestDb {
  name: string;
  adminUrl: string;
  appUrl: string;
  aiUrl: string;
  admin: Pool;
  app: Pool;
  ai: Pool;
  drop: () => Promise<void>;
}

/** Tạo database riêng cho mỗi file test rồi migrate lên mới nhất. */
export async function createTestDb(tag: string): Promise<TestDb> {
  const name = `rms_test_${tag}_${process.pid}`;
  const root = new Pool({ connectionString: withDb(adminUrl!, 'postgres') });
  await root.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await root.query(`CREATE DATABASE ${name}`);
  await root.end();

  const url = withDb(adminUrl!, name);
  await dbExtensions(url);
  await migrate(url, 'up');
  const appUrl = withDb(url, name, 'rms_app', 'rms_app_local');
  const aiUrl = withDb(url, name, 'rms_ai', 'rms_ai_local');
  const admin = new Pool({ connectionString: url });
  const app = new Pool({ connectionString: appUrl });
  const ai = new Pool({ connectionString: aiUrl });
  return {
    name,
    adminUrl: url,
    appUrl,
    aiUrl,
    admin,
    app,
    ai,
    drop: async () => {
      await Promise.all([admin.end(), app.end(), ai.end()]);
      const r = new Pool({ connectionString: withDb(adminUrl!, 'postgres') });
      await r.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await r.end();
    },
  };
}

async function dbExtensions(url: string): Promise<void> {
  const p = new Pool({ connectionString: url });
  await p.query('CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;');
  await p.end();
}

/** Chạy fn trong transaction với context tenant (như TenantInterceptor sẽ làm). */
export async function withTenant<T>(
  pool: Pool,
  orgId: string,
  fn: (q: Pool['query']) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SELECT set_config('app.organization_id', $1, true)", [orgId]);
    const out = await fn(c.query.bind(c) as Pool['query']);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
