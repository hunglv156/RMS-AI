import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

export const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../infra/migrations');
const UP = '-- Up Migration';
const DOWN = '-- Down Migration';

interface Migration {
  name: string;
  up: string;
  down: string;
}

function load(): Migration[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => {
      const text = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      const u = text.indexOf(UP);
      const d = text.indexOf(DOWN);
      if (u < 0 || d < u) throw new Error(`${f}: thiếu marker Up/Down Migration`);
      return {
        name: f.replace(/\.sql$/, ''),
        up: text.slice(u + UP.length, d),
        down: text.slice(d + DOWN.length),
      };
    });
}

/** Bộ chạy migration SQL tối giản: mỗi file chạy trong một transaction. */
export async function migrate(
  databaseUrl: string,
  direction: 'up' | 'down',
  count = Infinity,
): Promise<string[]> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const done: string[] = [];
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS pgmigrations (name text PRIMARY KEY, run_on timestamptz NOT NULL DEFAULT now())',
    );
    const applied = new Set(
      (await client.query<{ name: string }>('SELECT name FROM pgmigrations')).rows.map((r) => r.name),
    );
    const all = load();
    const todo =
      direction === 'up'
        ? all.filter((m) => !applied.has(m.name))
        : all.filter((m) => applied.has(m.name)).reverse();
    for (const m of todo.slice(0, count)) {
      await client.query('BEGIN');
      try {
        await client.query(direction === 'up' ? m.up : m.down);
        await client.query(
          direction === 'up'
            ? 'INSERT INTO pgmigrations (name) VALUES ($1)'
            : 'DELETE FROM pgmigrations WHERE name = $1',
          [m.name],
        );
        await client.query('COMMIT');
        done.push(m.name);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`${m.name} (${direction}): ${(e as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
  return done;
}
