import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Knex } from "knex";
import { randomUUID } from "node:crypto";
import { AuditWriter } from "../../src/audit/audit-writer.service";
import { fixtureUser } from "../fixtures";
import { testDatabase } from "../auth/setup";
let db: Knex;
before(async () => {
  db = await testDatabase();
});
after(async () => {
  await db?.destroy();
});
const writer = new AuditWriter();
function event(actor: string | null, requestId: string) {
  return {
    actor_id: actor,
    actor_type: actor ? ("user" as const) : ("system" as const),
    action: "auth.login",
    resource_type: "session",
    resource_id: actor ?? "anonymous",
    request_id: requestId,
    safe_metadata_json: {},
  };
}
test("audit append participates in caller transaction rollback", async () => {
  const id = randomUUID(),
    tx = await db.transaction();
  const user = fixtureUser();
  await tx("users").insert(user);
  await writer.append(tx, event(user.id, id));
  assert.equal((await tx("audit_events").where({ request_id: id })).length, 1);
  await tx.rollback();
  assert.equal((await db("audit_events").where({ request_id: id })).length, 0);
  assert.equal(await db("users").where({ id: user.id }).first(), undefined);
});
test("audit commits actor/request context and app DB role cannot update/delete", async () => {
  const tx = await db.transaction();
  try {
    const user = fixtureUser();
    await tx("users").insert(user);
    const id = randomUUID();
    await writer.append(tx, event(user.id, id));
    await tx.raw("SET LOCAL ROLE rms_app");
    const row = await tx("audit_events").where({ request_id: id }).first();
    assert.equal(row.actor_id, user.id);
    assert.equal(row.actor_type, "user");
    for (const sql of [
      "UPDATE audit_events SET action='tampered' WHERE request_id=?",
      "DELETE FROM audit_events WHERE request_id=?",
    ]) {
      await tx.raw("SAVEPOINT denied");
      await assert.rejects(tx.raw(sql, [id]));
      await tx.raw("ROLLBACK TO SAVEPOINT denied");
    }
  } finally {
    await tx.rollback();
  }
});
test("audit rejects raw personal data, secrets, provider payloads and free-text metadata", async () => {
  const tx = await db.transaction();
  try {
    for (const metadata of [
      { password: "secret" },
      { email: "pii@example.test" },
      { cv_text: "text" },
      { token: "secret" },
      { provider_payload: {} },
      { reason_code: "contact@example.test" },
      { changed_fields: ["raw_cv"] },
    ]) {
      await assert.rejects(
        writer.append(tx, {
          ...event(null, randomUUID()),
          safe_metadata_json: metadata,
        }),
      );
    }
    await writer.append(tx, {
      ...event(null, randomUUID()),
      safe_metadata_json: {
        reason_code: "invalid_credentials",
        role: "reviewer",
        disabled: true,
        changed_fields: ["password"],
      },
    });
  } finally {
    await tx.rollback();
  }
});
