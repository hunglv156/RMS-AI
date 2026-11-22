import "reflect-metadata";
import knex from "knex";
import { resolve } from "node:path";
export async function testDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  if (!/^\/rms_ai_test(?:_[a-z0-9_]+)?$/.test(url.pathname))
    throw new Error("Unsafe database");
  const name = url.pathname.slice(1);
  url.pathname = "/postgres";
  const admin = knex({ client: "pg", connection: url.toString() });
  try {
    if (!(await admin("pg_database").where({ datname: name }).first()))
      await admin.raw("CREATE DATABASE ??", [name]);
  } finally {
    await admin.destroy();
  }
  const db = knex({ client: "pg", connection: process.env.TEST_DATABASE_URL });
  await db.migrate.latest({
    directory: resolve("../../infra/migrations"),
    loadExtensions: [".cjs"],
  });
  return db;
}
