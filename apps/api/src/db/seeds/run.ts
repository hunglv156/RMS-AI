import { seedDemo } from "./demo";
import { resolve } from "node:path";
import knex from "knex";
import { seedBaselineUsers } from "./baseline-users";
async function main() {
  const cfg = require("../../../knexfile.cjs");
  const db = knex(cfg);
  try {
    const password = process.env.DEMO_PASSWORD;
    if (!password || password.length < 12)
      throw new Error(
        "Set DEMO_PASSWORD (at least 12 characters) for synthetic baseline accounts",
      );
    await seedBaselineUsers(db, password);
    await seedDemo(
      db,
      process.env.FILE_STORAGE_ROOT || resolve("../../.local-data/cvs"),
    );
  } finally {
    await db.destroy();
  }
}
void main();
