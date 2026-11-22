import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup } from "./support";
import { CandidatesService } from "../../src/candidates/candidates.service";
import { Database } from "../../src/db/database";
import { AuditWriter } from "../../src/audit/audit-writer.service";
import { JobAuthorization } from "../../src/auth/authorization.service";
let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx?.close();
});
test("candidate create/read/update, provenance validation, pagination and literal name search", async () => {
  const name = `Synthetic ${randomUUID()} %_`;
  const row = await ctx.candidate(name);
  assert.equal(row.email, null);
  assert.equal(row.created_by, ctx.users[1].id);
  await ctx.http("get", `/candidates/${row.id}`).expect(200);
  const updated = await ctx
    .http("patch", `/candidates/${row.id}`)
    .send({
      email: "synthetic@example.test",
      phone: "demo",
      display_name: name + " edited",
    })
    .expect(200);
  assert.equal(updated.body.email, "synthetic@example.test");
  const page = await ctx
    .http("get", `/candidates?search=${encodeURIComponent(name)}&pageSize=1`)
    .expect(200);
  assert.equal(page.body.total, 1);
  assert.equal(page.body.items.length, 1);
  await ctx.http("get", "/candidates?pageSize=101").expect(400);
  await ctx
    .http("post", "/candidates")
    .send({ display_name: "Real", provenance: "real" })
    .expect(400);
  await ctx
    .http("patch", `/candidates/${row.id}`)
    .send({ created_by: ctx.users[0].id })
    .expect(400);
  await ctx.http("get", `/candidates/${randomUUID()}`).expect(404);
  for (const actor of [2, 3]) {
    await ctx.http("get", "/candidates", actor).expect(403);
    await ctx.http("get", `/candidates/${row.id}`, actor).expect(403);
    await ctx
      .http("post", "/candidates", actor)
      .send({ display_name: "Synthetic", provenance: "synthetic" })
      .expect(403);
  }
  assert.ok(
    await ctx
      .db("audit_events")
      .where({ resource_id: row.id, action: "candidate.created" })
      .first(),
  );
});
test("candidate mutation and its audit roll back together", async () => {
  const service = new CandidatesService(
    ctx.app.get(Database),
    {
      append: async () => {
        throw new Error("injected audit failure");
      },
    } as unknown as AuditWriter,
    ctx.app.get(JobAuthorization),
  );
  const name = `Rollback ${randomUUID()}`;
  await assert.rejects(
    service.create(
      ctx.users[1],
      { display_name: name, provenance: "synthetic" },
      "test",
    ),
  );
  assert.equal(
    await ctx.db("candidates").where({ display_name: name }).first(),
    undefined,
  );
});
