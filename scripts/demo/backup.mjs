import {
  mkdirSync,
  readdirSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { target, uuid, digest } from "./common.mjs";
const { storage, pg } = target();
const output = resolve(process.argv[2] || `rms-ai-demo-backup-${Date.now()}`);
const entries = readdirSync(storage).map((name) => {
  const path = join(storage, name);
  if (
    !uuid.test(name) ||
    !lstatSync(path).isFile() ||
    lstatSync(path).isSymbolicLink()
  )
    throw new Error("Refused: storage contains an unexpected entry");
  return { name, sha256: digest(readFileSync(path)) };
});
const dump = pg("pg_dump", [
  "-Fc",
  "--no-owner",
  "--no-acl",
  "-d",
  "rms_ai_demo",
]);
mkdirSync(output, { mode: 0o700 });
mkdirSync(join(output, "storage"), { mode: 0o700 });
writeFileSync(join(output, "database.dump"), dump, { mode: 0o600, flag: "wx" });
for (const e of entries)
  copyFileSync(join(storage, e.name), join(output, "storage", e.name));
writeFileSync(
  join(output, "manifest.json"),
  JSON.stringify(
    { format: "rms-ai-demo-v1", dump_sha256: digest(dump), files: entries },
    null,
    2,
  ),
  { mode: 0o600, flag: "wx" },
);
console.log(
  `Backup saved: ${output}; includes database and private PDF storage. Keep it private.`,
);
