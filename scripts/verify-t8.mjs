/** Local real-stack acceptance supervisor. Never reads or writes an .env file.
 * Load credentials in the parent shell; children inherit only in-memory env.
 */
import { spawn, spawnSync } from "node:child_process";
import { createServer as httpServer } from "node:http";
import { createServer as tcpServer, connect } from "node:net";
import { once } from "node:events";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  copyFileSync,
  realpathSync,
  openSync,
  closeSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(join(root, "apps/api/package.json"));
const { Client } = require("pg");
const { default: Redis } = require("ioredis");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const live = process.argv.includes("--live");
if (!process.argv.includes("--serve")) {
  const commands = [
    ["check"],
    ["--filter", "@rms-ai/e2e", "test"],
    ["--filter", "@rms-ai/e2e", "test:recovery"],
    ...(live ? [["--filter", "@rms-ai/e2e", "test:live"]] : []),
    ["--filter", "@rms-ai/e2e", "test:restore"],
  ];
  for (const args of commands) {
    const result = spawnSync("pnpm", args, {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
  process.exit(0);
}
const id = `${Date.now()}_${process.pid}`;
const dbName = `rms_ai_test_t811_${id}`;
const restoreName = `${dbName}_restore`;
const artifacts = resolve(root, "tests/e2e/test-results");
mkdirSync(artifacts, { recursive: true, mode: 0o700 });
const runDir = resolve(artifacts, `stack-${id}`);
mkdirSync(runDir, { mode: 0o700 });
const storage = join(runDir, "storage");
mkdirSync(storage, { mode: 0o700 });
const faultFile = join(runDir, "provider-fault.json");
writeFileSync(faultFile, "{}", { mode: 0o600 });
const password = `Synthetic-T811-${randomUUID()}`;
const dbBase = "postgresql://rms_ai:local_dev_only@127.0.0.1:55432/";
const databaseUrl = dbBase + dbName;
const prefix = `rms_ai_test_t811_${id}`;
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  MIGRATION_DATABASE_URL: databaseUrl,
  REDIS_URL: "redis://127.0.0.1:56380",
  TEST_REDIS_PREFIX: prefix,
  FILE_STORAGE_ROOT: realpathSync(storage),
  APP_ORIGIN: "http://127.0.0.1:5173",
  API_PORT: "3100",
  AI_BASE_URL: "http://127.0.0.1:8100",
  AI_PROVIDER_MODE: live ? "live" : "deterministic",
  DEMO_PASSWORD: password,
  T8_FAULT_FILE: faultFile,
  VITE_USE_MOCK: "0",
  // Use production deadline defaults, including the full 240 s worker lease.
  AI_REQUEST_TIMEOUT_MS: "150000",
  EXTRACTION_TIMEOUT_MS: "45000",
  WORKER_HTTP_TIMEOUT_MS: "180000",
  WORKER_LEASE_MS: "240000",
};
const children = new Map();
function child(name, command, args, cwd = root, extra = {}) {
  const fd = openSync(join(runDir, `${name}.log`), "a", 0o600);
  const p = spawn(command, args, {
    cwd,
    env: { ...env, ...extra },
    stdio: ["ignore", fd, fd],
    detached: true,
  });
  closeSync(fd);
  children.set(name, p);
  return p;
}
async function stop(name, signal = "SIGTERM") {
  const p = children.get(name);
  if (!p) return;
  children.delete(name);
  if (p.exitCode !== null || p.signalCode !== null) return;
  const ended = once(p, "exit");
  try {
    process.kill(-p.pid, signal);
  } catch {
    return;
  }
  await Promise.race([ended, sleep(5000)]);
  if (p.exitCode === null && p.signalCode === null) {
    try {
      process.kill(-p.pid, "SIGKILL");
    } catch {}
    await Promise.race([ended, sleep(1000)]);
  }
}
function run(command, args, extra = {}) {
  const p = spawnSync(command, args, {
    cwd: root,
    env: { ...env, ...extra },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  writeFileSync(
    join(runDir, `${command.split("/").pop()}-${Date.now()}.log`),
    (p.stdout || "") + (p.stderr || ""),
    { mode: 0o600 },
  );
  if (p.status !== 0)
    throw new Error(`${command} failed (see private stack logs)`);
  return p.stdout;
}
async function query(sql, params = [], url = databaseUrl) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows;
  } finally {
    await c.end();
  }
}
async function ready(url, ms = 60_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`Service did not become ready: ${url}`);
}
// A real Redis transport proxy allows outages and silently black-holed idle
// sockets without stopping or flushing anyone else's shared Redis.
const links = new Set();
let redisDown = false;
const redisProxy = tcpServer((client) => {
  if (redisDown) {
    client.destroy();
    return;
  }
  const upstream = connect(56379, "127.0.0.1");
  const link = { client, upstream, dead: false };
  links.add(link);
  client.on("data", (d) => {
    if (!link.dead) upstream.write(d);
  });
  upstream.on("data", (d) => {
    if (!link.dead) client.write(d);
  });
  const end = () => {
    links.delete(link);
    client.destroy();
    upstream.destroy();
  };
  client.on("error", end).on("close", end);
  upstream.on("error", end).on("close", end);
});
async function worker() {
  child(
    "worker",
    process.execPath,
    ["--import", "tsx", "src/worker.ts"],
    join(root, "apps/api"),
  );
  await sleep(1500);
  if (children.get("worker").exitCode !== null)
    throw new Error("Worker exited during startup");
}
// A pure text PDF fixture generated by the existing Python environment, never
// imported personal CV data. The normal extraction subprocess reads these bytes.
function fixture() {
  run("uv", [
    "run",
    "--project",
    "apps/ai-service",
    "python",
    "-c",
    'import fitz,sys; d=fitz.open(); p=d.new_page(); p.insert_text((60,60), "SYNTHETIC DEMO CV - NOT A REAL PERSON\\nTaylor Example - Backend Engineer\\nBuilt Python APIs with PostgreSQL and Redis for five years.\\nImplemented SQL queries, automated tests and reliable asynchronous workers.\\nEducation: BSc Computer Science. English: professional working proficiency.", fontsize=12); d.save(sys.argv[1])',
    join(runDir, "synthetic.pdf"),
  ]);
}
async function backupRestore() {
  await stop("worker");
  await stop("api");
  const backup = join(runDir, "backup");
  const restoredStorage = join(runDir, "restored-storage");
  mkdirSync(backup, { mode: 0o700 });
  mkdirSync(restoredStorage, { mode: 0o700 });
  const container = run("docker", [
    "ps",
    "--filter",
    "publish=55432",
    "--format",
    "{{.ID}}",
  ]).trim();
  if (!/^[a-f0-9]+$/.test(container))
    throw new Error("Expected one local PostgreSQL container");
  const dump = spawnSync(
    "docker",
    [
      "exec",
      container,
      "pg_dump",
      "-U",
      "rms_ai",
      "-Fc",
      "--no-owner",
      "--no-acl",
      "-d",
      dbName,
    ],
    { maxBuffer: 128 * 1024 * 1024 },
  );
  if (dump.status) throw new Error("pg_dump failed");
  writeFileSync(join(backup, "database.dump"), dump.stdout, { mode: 0o600 });
  const files = readdirSync(storage).map((name) => {
    if (!/^[0-9a-f-]{36}$/.test(name))
      throw new Error("Unexpected storage entry");
    const bytes = readFileSync(join(storage, name));
    copyFileSync(join(storage, name), join(backup, name));
    return { name, sha256: digest(bytes) };
  });
  const manifest = { dump_sha256: digest(dump.stdout), files };
  writeFileSync(
    join(backup, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { mode: 0o600 },
  );
  if (
    digest(readFileSync(join(backup, "database.dump"))) !== manifest.dump_sha256
  )
    throw new Error("Dump hash mismatch");
  await query(`CREATE DATABASE "${restoreName}"`, [], dbBase + "postgres");
  const restore = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "rms_ai",
      "--single-transaction",
      "--exit-on-error",
      "--no-owner",
      "--no-acl",
      "-d",
      restoreName,
    ],
    {
      input: readFileSync(join(backup, "database.dump")),
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (restore.status) throw new Error("pg_restore failed");
  for (const f of files) {
    if (digest(readFileSync(join(backup, f.name))) !== f.sha256)
      throw new Error("PDF hash mismatch");
    copyFileSync(join(backup, f.name), join(restoredStorage, f.name));
  }
  const counts = await query(
    "select count(*)::int as results from screening_runs where status='completed'",
    [],
    dbBase + restoreName,
  );
  child(
    "api",
    process.execPath,
    ["--import", "tsx", "src/main.ts"],
    join(root, "apps/api"),
    { DATABASE_URL: dbBase + restoreName, FILE_STORAGE_ROOT: restoredStorage },
  );
  await ready("http://127.0.0.1:3100/health/live");
  return {
    ...manifest,
    counts,
    restoredDatabase: restoreName,
    restoredStorage,
  };
}
let control;
let closing = false;
async function cleanup(exitCode = 0) {
  if (closing) return;
  closing = true;
  for (const name of [...children.keys()].reverse()) await stop(name);
  for (const link of links) {
    link.client.destroy();
    link.upstream.destroy();
  }
  redisProxy.close();
  control?.close();
  const redis = new Redis("redis://127.0.0.1:56379", {
    connectTimeout: 500,
    maxRetriesPerRequest: 0,
  });
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(...keys);
  } catch {
  } finally {
    redis.disconnect();
  }
  // DBs and private artifacts intentionally retained for the report/review.
  process.exit(exitCode);
}
process.on("SIGTERM", () => cleanup());
process.on("SIGINT", () => cleanup());
try {
  if (
    !process.env.AI_INTERNAL_TOKEN ||
    process.env.AI_INTERNAL_TOKEN.length < 16
  )
    throw new Error("Load the external environment in the parent shell first");
  for (const port of [3100, 5173, 8100, 56380, 3199]) {
    const probe = tcpServer();
    probe.listen(port, "127.0.0.1");
    await once(probe, "listening");
    await new Promise((resolve) => probe.close(resolve));
  }
  await query(`CREATE DATABASE "${dbName}"`, [], dbBase + "postgres");
  run("pnpm", ["--filter", "@rms-ai/api", "db:migrate"]);
  run("pnpm", ["--filter", "@rms-ai/api", "db:seed"]);
  fixture();
  redisProxy.listen(56380, "127.0.0.1");
  await once(redisProxy, "listening");
  child(
    "ai",
    "uv",
    [
      "run",
      "uvicorn",
      live ? "app.main:app" : "provider:app",
      ...(live ? [] : ["--app-dir", join(root, "tests/e2e")]),
      "--host",
      "127.0.0.1",
      "--port",
      "8100",
    ],
    join(root, "apps/ai-service"),
  );
  await ready("http://127.0.0.1:8100/health", 120_000);
  child(
    "api",
    process.execPath,
    ["--import", "tsx", "src/main.ts"],
    join(root, "apps/api"),
  );
  await ready("http://127.0.0.1:3100/health/live");
  await worker();
  child("web", "pnpm", [
    "--filter",
    "@rms-ai/web",
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
  ]);
  await ready("http://127.0.0.1:5173");
  control = httpServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      let body = "";
      for await (const chunk of req) body += chunk;
      const value = body ? JSON.parse(body) : {};
      const path = req.url;
      let result = { ok: true };
      if (path === "/health") {
      } else if (path === "/info")
        result = {
          password,
          runDir,
          database: dbName,
          pdf: join(runDir, "synthetic.pdf"),
          live,
        };
      else if (path === "/api/restart") {
        await stop("api");
        child(
          "api",
          process.execPath,
          ["--import", "tsx", "src/main.ts"],
          join(root, "apps/api"),
        );
        await ready("http://127.0.0.1:3100/health/live");
      } else if (path === "/fault" && !live)
        writeFileSync(faultFile, JSON.stringify(value), { mode: 0o600 });
      else if (path === "/worker/kill") await stop("worker", "SIGKILL");
      else if (path === "/worker/start") await worker();
      else if (path === "/redis/down") {
        redisDown = true;
        for (const link of links) {
          link.client.destroy();
          link.upstream.destroy();
        }
      } else if (path === "/redis/up") redisDown = false;
      else if (path === "/redis/blackhole") {
        // Leave the API as the only relay producer, so a new healthy worker
        // producer cannot hide a stale API socket. Restart the consumer only
        // after the test has proved that this API delivered its outbox event.
        await stop("worker");
        for (const link of links) link.dead = true;
      } else if (path === "/outbox")
        result = (
          await query(
            "select delivered_at, attempts, last_error from outbox_events where run_id=$1",
            [value.id],
          )
        )[0];
      else if (path === "/tamper") {
        const c = new Client({ connectionString: databaseUrl });
        await c.connect();
        try {
          await c.query("BEGIN");
          await c.query("SET LOCAL ROLE rms_app");
          await c.query("update jd_versions set title=$1 where id=$2", [
            "Tampered",
            value.id,
          ]);
          throw new Error("Approved-version SQL tamper succeeded");
        } catch (e) {
          if (!["23514", "P0001", "42501"].includes(e.code)) throw e;
          result = { denied: true, code: e.code };
        } finally {
          await c.query("ROLLBACK");
          await c.end();
        }
      } else if (path === "/restore") result = await backupRestore();
      else {
        res.statusCode = 404;
        result = { error: "Unknown test control operation" };
      }
      res.end(JSON.stringify(result));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  control.listen(3199, "127.0.0.1");
  writeFileSync(
    join(runDir, "stack.json"),
    JSON.stringify(
      { database: dbName, storage, prefix, live, leaseMs: 240000 },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    `T8 stack ready (${live ? "live" : "deterministic"}); private evidence: ${runDir}`,
  );
} catch (e) {
  console.error(e.message);
  await cleanup(1);
}
