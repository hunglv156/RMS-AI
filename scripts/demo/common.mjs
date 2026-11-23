import { createHash } from "node:crypto";
export const digest = (data) => createHash("sha256").update(data).digest("hex");
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { realpathSync, existsSync, lstatSync } from "node:fs";
export function target() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.port !== "55432" ||
    url.pathname !== "/rms_ai_demo" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Refused: use local port 55432 and disposable database rms_ai_demo",
    );
  if (
    process.env.MIGRATION_DATABASE_URL &&
    process.env.MIGRATION_DATABASE_URL !== process.env.DATABASE_URL
  )
    throw new Error("Refused: migration and demo database must match");
  const dockerHost = run(
    "docker",
    ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"],
    true,
  ).trim();
  if (
    (process.env.DOCKER_HOST &&
      !process.env.DOCKER_HOST.startsWith("unix://")) ||
    !dockerHost.startsWith("unix://")
  )
    throw new Error("Refused: local Docker socket required");
  const storage = resolve(process.env.FILE_STORAGE_ROOT || "");
  if (storage !== resolve(".local-data/rms-ai-demo-cvs"))
    throw new Error(
      "Refused: FILE_STORAGE_ROOT must be this checkout’s .local-data/rms-ai-demo-cvs",
    );
  let existing = storage;
  while (!existsSync(existing)) existing = resolve(existing, "..");
  if (
    realpathSync(existing) !== existing ||
    lstatSync(existing).isSymbolicLink()
  )
    throw new Error("Refused: canonical nonsymlink storage required");
  const project = process.env.COMPOSE_PROJECT_NAME;
  const args = [
    "compose",
    ...(project ? ["-p", project] : []),
    "ps",
    "-q",
    "postgres",
  ];
  const container = run("docker", args, true).trim();
  if (!/^[a-f0-9]{12,64}$/.test(container))
    throw new Error(
      "Start compose postgres first; set COMPOSE_PROJECT_NAME if reusing a named stack",
    );
  const pg = (command, args = [], input) =>
    run(
      "docker",
      [
        "exec",
        "-i",
        "-e",
        "PGPASSWORD",
        container,
        command,
        "-h",
        "127.0.0.1",
        "-p",
        "5432",
        "-U",
        decodeURIComponent(url.username),
        ...args,
      ],
      false,
      input,
      { PGPASSWORD: decodeURIComponent(url.password) },
    );
  return { storage, pg };
}
export function run(command, args, text = false, input, env = {}) {
  const r = spawnSync(command, args, {
    input,
    encoding: text ? "utf8" : undefined,
    env: { ...process.env, ...env },
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0)
    throw new Error(`${command} failed; verify local services and credentials`);
  return r.stdout;
}
export const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function confirm() {
  if (process.argv[2] !== "--confirm" || process.argv[3] !== "rms_ai_demo")
    throw new Error(
      "Refused: supply --confirm rms_ai_demo; stop API/worker before this operation",
    );
}
