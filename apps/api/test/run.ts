import { readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
const [kind, ...args] = process.argv.slice(2);
const suites = args.filter((a) => a !== "--");
function discover(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? discover(join(dir, e.name))
      : e.name.endsWith(`.${kind}.test.ts`)
        ? [join(dir, e.name)]
        : [],
  );
}
const files = discover(resolve("test")).filter(
  (p) =>
    !suites.length ||
    suites.some((s) => p.includes("/" + s + "/") || p.includes("/" + s + ".")),
);
if (!files.length) {
  if (suites.length) throw new Error(`No ${kind} tests for requested suite`);
  console.log(`No ${kind} suites registered yet`);
  process.exit(0);
}
const env = { ...process.env };
let storage: string | undefined;
if (kind === "integration") {
  env.TEST_DATABASE_URL ||=
    "postgresql://rms_ai:local_dev_only@127.0.0.1:55432/rms_ai_test";
  const url = new URL(env.TEST_DATABASE_URL);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^rms_ai_test(?:_[a-z0-9_]+)?$/.test(url.pathname.slice(1))
  )
    throw new Error(
      "Integration tests require an explicit local rms_ai_test database",
    );
  if (env.DATABASE_URL && new URL(env.DATABASE_URL).pathname === url.pathname)
    throw new Error("Test database must differ from development database");
  storage = mkdtempSync(join(tmpdir(), "rms-ai-test-"));
  Object.assign(env, {
    DATABASE_URL: env.TEST_DATABASE_URL,
    FILE_STORAGE_ROOT: storage,
    TEST_REDIS_PREFIX: "rms_ai_test",
    REDIS_URL: env.TEST_REDIS_URL || "redis://127.0.0.1:56379",
    AI_INTERNAL_TOKEN: "test-service-token-only",
    NODE_ENV: "test",
  });
}
try {
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", "--test-concurrency=1", ...files],
    { stdio: "inherit", env },
  );
  process.exitCode = child.status ?? 1;
} finally {
  if (storage) rmSync(storage, { recursive: true, force: true });
}
