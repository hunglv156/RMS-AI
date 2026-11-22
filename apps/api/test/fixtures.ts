import { randomUUID, createHash } from "node:crypto";
import { hash, argon2id } from "argon2";
import type { Knex } from "knex";
import type { Role } from "@rms-ai/contracts";
export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const fixtureUser = (role: Role = "admin") => ({
  id: randomUUID(),
  normalized_email: `${randomUUID()}@example.test`,
  display_name: "Synthetic test user",
  password_hash: "fixture-only-not-a-login-hash",
  role,
});
export const fixtureJob = (created_by: string) => ({
  id: randomUUID(),
  title: "Synthetic test job",
  created_by,
});
export const fixtureCandidate = (created_by: string) => ({
  id: randomUUID(),
  display_name: "Synthetic Candidate",
  provenance: "synthetic",
  created_by,
});
export const fixtureResume = (candidate_id: string, uploaded_by: string) => ({
  id: randomUUID(),
  candidate_id,
  version_no: 1,
  storage_key: randomUUID(),
  original_filename: "synthetic.pdf",
  mime_type: "application/pdf",
  byte_size: 100,
  file_sha256: sha256("synthetic pdf"),
  uploaded_by,
});
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
