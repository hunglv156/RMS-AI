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
  } finally {
    await db.destroy();
  }
}
void main();
