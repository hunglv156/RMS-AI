import { hash, argon2id } from "argon2";
import type { Knex } from "knex";
/** Adds only the four stable synthetic accounts; never resets existing passwords. */
export async function seedBaselineUsers(db: Knex, password: string) {
  const password_hash = await hash(password, { type: argon2id });
  const accounts = [
    ["00000000-0000-4000-8000-000000000001", "admin", "admin"],
    ["00000000-0000-4000-8000-000000000002", "recruiter", "recruiter"],
    ["00000000-0000-4000-8000-000000000003", "reviewer", "reviewer"],
    ["00000000-0000-4000-8000-000000000004", "unassigned", "reviewer"],
  ] as const;
  for (const [id, name, role] of accounts)
    await db("users")
      .insert({
        id,
        normalized_email: `${name}@demo.example`,
        display_name: `Demo ${name}`,
        password_hash,
        role,
      })
      .onConflict("id")
      .ignore();
  return accounts.map(([id]) => id);
}
