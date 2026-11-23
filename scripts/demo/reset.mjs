import { rmSync, mkdirSync } from "node:fs";
import { target, confirm, run } from "./common.mjs";
confirm();
if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12)
  throw new Error(
    "Set DEMO_PASSWORD (at least 12 characters) before resetting",
  );
const { storage, pg } = target();
pg("dropdb", ["--if-exists", "rms_ai_demo"]);
pg("createdb", ["rms_ai_demo"]);
rmSync(storage, { recursive: true, force: true });
mkdirSync(storage, { recursive: true, mode: 0o700 });
run("pnpm", ["--filter", "@rms-ai/api", "db:migrate"]);
run("pnpm", ["--filter", "@rms-ai/api", "db:seed"]);
console.log(
  "Reset disposable rms_ai_demo and its private storage; migration and synthetic seed passed.",
);
