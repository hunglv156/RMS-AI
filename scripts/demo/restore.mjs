import {
  lstatSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { target, confirm, digest, uuid } from "./common.mjs";
confirm();
const { storage, pg } = target();
if (!process.argv[4])
  throw new Error("Supply backup directory after --confirm rms_ai_demo");
const backup = resolve(process.argv[4]);
if (realpathSync(backup) !== backup)
  throw new Error("Refused: backup must be canonical");
function regular(path) {
  const s = lstatSync(path);
  if (!s.isFile() || s.isSymbolicLink())
    throw new Error("Refused: invalid backup file");
  return readFileSync(path);
}
const manifest = JSON.parse(regular(join(backup, "manifest.json")));
const dump = regular(join(backup, "database.dump"));
if (
  manifest.format !== "rms-ai-demo-v1" ||
  digest(dump) !== manifest.dump_sha256 ||
  !Array.isArray(manifest.files)
)
  throw new Error("Invalid backup manifest/dump");
const source = join(backup, "storage");
if (realpathSync(source) !== source)
  throw new Error("Refused: symlink backup storage");
const names = new Set();
const files = manifest.files.map((e) => {
  if (!uuid.test(e.name) || names.has(e.name))
    throw new Error("Refused: unsafe/duplicate storage key");
  names.add(e.name);
  const bytes = regular(join(source, e.name));
  if (digest(bytes) !== e.sha256)
    throw new Error("Backup storage checksum mismatch");
  return { name: e.name, bytes };
});
if (
  readdirSync(source).length !== files.length ||
  (existsSync(storage) && readdirSync(storage).length)
)
  throw new Error(
    "Refused: restore requires empty destination storage and exact backup contents",
  );
const tables = pg("psql", [
  "-At",
  "-d",
  "rms_ai_demo",
  "-c",
  "select count(*) from pg_tables where schemaname='public'",
])
  .toString()
  .trim();
if (tables !== "0")
  throw new Error(
    "Refused: restore requires an empty rms_ai_demo database; no existing data will be overwritten",
  );
mkdirSync(storage, { recursive: true, mode: 0o700 });
pg(
  "pg_restore",
  [
    "--single-transaction",
    "--exit-on-error",
    "--no-owner",
    "--no-acl",
    "-d",
    "rms_ai_demo",
  ],
  dump,
);
for (const f of files)
  writeFileSync(join(storage, f.name), f.bytes, { mode: 0o600, flag: "wx" });
console.log(
  "Restored database and verified private PDFs. Start API/worker and verify an authorized download and persisted result.",
);
