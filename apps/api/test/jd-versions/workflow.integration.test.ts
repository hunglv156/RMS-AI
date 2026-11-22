import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup, draft } from "../jobs/setup";
import { AuditWriter } from "../../src/audit/audit-writer.service";
import { contentHash } from "../../src/jd-versions/validation";
let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx?.close();
});
async function jobAndDraft() {
  const job = (
    await ctx.call(1, "post", "/jobs", { title: randomUUID() }).expect(201)
  ).body;
  await ctx
    .call(0, "put", `/jobs/${job.id}/assignments`, {
      user_ids: [ctx.users[2].id],
    })
    .expect(200);
  const version = (
    await ctx.call(1, "post", `/jobs/${job.id}/jd-versions`, draft).expect(201)
  ).body;
  return { job, version };
}
test("draft edit/submit/return/approve/clone with permissions, revisions, history and audit reason", async () => {
  const { job, version } = await jobAndDraft();
  const path = `/jd-versions/${version.id}`;
  assert.deepEqual(version.criteria, draft.criteria);
  await ctx.call(3, "get", path).expect(404);
  await ctx.call(3, "get", `/jobs/${job.id}/jd-versions`).expect(404);
  await ctx.call(3, "post", path + "/approve", { revision: 1 }).expect(404);
  await ctx.call(2, "patch", path, { ...draft, revision: 1 }).expect(403);
  await ctx
    .call(1, "patch", path, { ...draft, revision: 1, summary: "Updated" })
    .expect(200);
  await ctx.call(1, "patch", path, { ...draft, revision: 1 }).expect(409);
  await ctx.call(1, "post", path + "/submit", { revision: 1 }).expect(409);
  await ctx.call(1, "post", path + "/submit", { revision: 2 }).expect(200);
  await ctx.call(1, "patch", path, { ...draft, revision: 3 }).expect(409);
  await ctx.call(1, "post", path + "/approve", { revision: 3 }).expect(403);
  await ctx
    .call(2, "post", path + "/return-to-draft", { revision: 3, reason: " " })
    .expect(400);
  const returned = await ctx
    .call(2, "post", path + "/return-to-draft", {
      revision: 3,
      reason: "  Clarify requirements  ",
    })
    .expect(200);
  assert.equal(returned.body.state, "draft");
  const audit = await ctx
    .db("audit_events")
    .where({ resource_id: version.id, action: "jd.returned_to_draft" })
    .first();
  assert.equal(audit.safe_metadata_json.return_reason, "Clarify requirements");
  await ctx.call(1, "post", path + "/submit", { revision: 4 }).expect(200);
  const approved = (
    await ctx.call(2, "post", path + "/approve", { revision: 5 }).expect(200)
  ).body;
  assert.equal(approved.approved_by, ctx.users[2].id);
  assert.equal(
    approved.content_sha256,
    contentHash({
      ...draft,
      summary: "Updated",
      criteria: draft.criteria as Parameters<typeof contentHash>[0]["criteria"],
    }),
  );
  const active = (await ctx.call(1, "get", `/jobs/${job.id}`).expect(200)).body;
  assert.equal(active.active_jd_version_id, version.id);
  assert.equal(active.revision, 2);
  for (const action of ["approve", "return-to-draft", "submit"])
    await ctx
      .call(action === "submit" ? 1 : 2, "post", path + "/" + action, {
        revision: 6,
        ...(action === "return-to-draft" ? { reason: "No" } : {}),
      })
      .expect(409);
  await ctx.call(0, "patch", path, { ...draft, revision: 6 }).expect(409);
  const clone = (
    await ctx.call(1, "post", path + "/clone", { revision: 6 }).expect(201)
  ).body;
  assert.equal(clone.state, "draft");
  assert.equal(clone.version_no, 2);
  assert.equal(clone.approved_by, null);
  assert.deepEqual(clone.criteria, approved.criteria);
  const history = (
    await ctx
      .call(2, "get", `/jobs/${job.id}/jd-versions?pageSize=1`)
      .expect(200)
  ).body;
  assert.equal(history.total, 2);
  assert.equal(history.items[0].id, clone.id);
  assert.equal(
    (await ctx.call(2, "get", path).expect(200)).body.state,
    "approved",
  );
});
test("invalid criteria rejected without creating versions; closed jobs block approval", async () => {
  const { job, version } = await jobAndDraft();
  for (const criteria of [
    [],
    Array(9).fill(draft.criteria[0]),
    [...draft.criteria, ...draft.criteria],
    [{ ...draft.criteria[0], weight: 0 }],
    [{ ...draft.criteria[0], weight: -1 }],
    [{ ...draft.criteria[0], weight: "Infinity" }],
  ])
    await ctx
      .call(1, "post", `/jobs/${job.id}/jd-versions`, { ...draft, criteria })
      .expect(400);
  await ctx
    .call(1, "post", `/jd-versions/${version.id}/submit`, { revision: 1 })
    .expect(200);
  await ctx
    .call(1, "patch", `/jobs/${job.id}`, { revision: 1, status: "closed" })
    .expect(200);
  await ctx
    .call(2, "post", `/jd-versions/${version.id}/approve`, { revision: 2 })
    .expect(409);
  assert.equal(
    (await ctx.call(2, "get", `/jd-versions/${version.id}`).expect(200)).body
      .state,
    "pending_approval",
  );
  await ctx
    .call(1, "patch", `/jobs/${job.id}`, { revision: 2, status: "open" })
    .expect(200);
  await ctx
    .call(2, "post", `/jd-versions/${version.id}/approve`, { revision: 2 })
    .expect(200);
});
test("concurrent version creation and approval serialize without losing revisions or numbering", async () => {
  const { job, version } = await jobAndDraft();
  const versions = await Promise.all(
    Array.from({ length: 5 }, () =>
      ctx.call(1, "post", `/jobs/${job.id}/jd-versions`, draft).expect(201),
    ),
  );
  assert.deepEqual(
    versions.map((v) => v.body.version_no).sort((a, b) => a - b),
    [2, 3, 4, 5, 6],
  );
  await ctx
    .call(1, "post", `/jd-versions/${version.id}/submit`, { revision: 1 })
    .expect(200);
  const results = await Promise.all([
    ctx.call(2, "post", `/jd-versions/${version.id}/approve`, { revision: 2 }),
    ctx.call(0, "post", `/jd-versions/${version.id}/approve`, { revision: 2 }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const others = versions.slice(0, 2).map((v) => v.body);
  await Promise.all(
    others.map((v) =>
      ctx
        .call(1, "post", `/jd-versions/${v.id}/submit`, { revision: 1 })
        .expect(200),
    ),
  );
  await Promise.all(
    others.map((v) =>
      ctx
        .call(2, "post", `/jd-versions/${v.id}/approve`, { revision: 2 })
        .expect(200),
    ),
  );
  const updated = (await ctx.call(1, "get", `/jobs/${job.id}`).expect(200))
    .body;
  assert.equal(updated.revision, 4);
  assert.ok(others.some((v) => v.id === updated.active_jd_version_id));
  assert.equal(
    (
      await ctx
        .db("audit_events")
        .where({ job_id: job.id, action: "jd.approved" })
    ).length,
    3,
  );
});
test("approved content and every criteria mutation are protected using restricted app SQL role", async () => {
  const { version } = await jobAndDraft();
  await ctx
    .call(1, "post", `/jd-versions/${version.id}/submit`, { revision: 1 })
    .expect(200);
  await ctx
    .call(2, "post", `/jd-versions/${version.id}/approve`, { revision: 2 })
    .expect(200);
  const tx = await ctx.db.transaction();
  try {
    await tx.raw("SET LOCAL ROLE rms_app");
    for (const [sql, bindings] of [
      ["UPDATE jd_versions SET title='tampered' WHERE id=?", [version.id]],
      ["UPDATE jd_versions SET state='draft' WHERE id=?", [version.id]],
      ["DELETE FROM jd_versions WHERE id=?", [version.id]],
      ["UPDATE job_criteria SET weight=2 WHERE jd_version_id=?", [version.id]],
      ["DELETE FROM job_criteria WHERE jd_version_id=?", [version.id]],
      [
        "INSERT INTO job_criteria(jd_version_id,code,label,description,priority,weight,sort_order) VALUES (?,'new','New','New','must_have',1,1)",
        [version.id],
      ],
    ] as [string, string[]][]) {
      await tx.raw("SAVEPOINT denied");
      await assert.rejects(tx.raw(sql, bindings));
      await tx.raw("ROLLBACK TO SAVEPOINT denied");
    }
  } finally {
    await tx.rollback();
  }
});
test("audit failure rolls approval and active JD back atomically", async () => {
  const { job, version } = await jobAndDraft();
  await ctx
    .call(1, "post", `/jd-versions/${version.id}/submit`, { revision: 1 })
    .expect(200);
  const writer = ctx.app.get(AuditWriter),
    original = writer.append;
  writer.append = async () => {
    throw new Error("Injected audit failure");
  };
  try {
    await ctx
      .call(2, "post", `/jd-versions/${version.id}/approve`, { revision: 2 })
      .expect(500);
  } finally {
    writer.append = original;
  }
  const row = await ctx.db("jd_versions").where({ id: version.id }).first();
  assert.equal(row.state, "pending_approval");
  assert.equal(row.revision, 2);
  assert.equal(row.content_sha256, null);
  assert.equal(
    (await ctx.db("jobs").where({ id: job.id }).first()).active_jd_version_id,
    null,
  );
  assert.equal(
    (
      await ctx
        .db("audit_events")
        .where({ resource_id: version.id, action: "jd.approved" })
    ).length,
    0,
  );
});
