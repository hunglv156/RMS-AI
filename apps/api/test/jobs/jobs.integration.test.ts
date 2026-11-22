import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup } from "./setup";
let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx?.close();
});
test("job metadata, bounded pagination, literal search, closure and revision conflicts", async () => {
  const title = `Synthetic %_${randomUUID()}`;
  const created = await ctx.call(1, "post", "/jobs", { title }).expect(201);
  const id = created.body.id;
  assert.equal(created.body.status, "open");
  const page = await ctx
    .call(1, "get", `/jobs?search=${encodeURIComponent(title)}&pageSize=1`)
    .expect(200);
  assert.equal(page.body.total, 1);
  assert.equal(page.body.items[0].id, id);
  await ctx.call(1, "get", "/jobs?pageSize=101").expect(400);
  await ctx.call(1, "get", "/jobs?sort=arbitrary").expect(400);
  const closed = await ctx
    .call(1, "patch", `/jobs/${id}`, { revision: 1, status: "closed" })
    .expect(200);
  assert.equal(closed.body.revision, 2);
  await ctx
    .call(1, "patch", `/jobs/${id}`, { revision: 1, title: "stale" })
    .expect(409);
  await ctx
    .call(1, "patch", `/jobs/${id}`, { revision: 2, status: "open" })
    .expect(200);
  await ctx.call(1, "get", `/jobs/${randomUUID()}`).expect(404);
  await ctx.call(1, "post", "/jobs", { title: " " }).expect(400);
});
test("admin replaces grants to active reviewers; reviewer lists/counts/details are scoped", async () => {
  const title = randomUUID();
  const job = (await ctx.call(1, "post", "/jobs", { title }).expect(201)).body;
  await ctx.call(2, "get", `/jobs/${job.id}`).expect(404);
  await ctx
    .call(1, "put", `/jobs/${job.id}/assignments`, {
      user_ids: [ctx.users[2].id],
    })
    .expect(403);
  await ctx
    .call(0, "put", `/jobs/${job.id}/assignments`, {
      user_ids: [ctx.users[1].id],
    })
    .expect(400);
  await ctx
    .call(0, "put", `/jobs/${job.id}/assignments`, {
      user_ids: [ctx.users[2].id, ctx.users[2].id],
    })
    .expect(400);
  await ctx
    .db("users")
    .where({ id: ctx.users[3].id })
    .update({ disabled_at: new Date() });
  await ctx
    .call(0, "put", `/jobs/${job.id}/assignments`, {
      user_ids: [ctx.users[3].id],
    })
    .expect(400);
  await ctx
    .call(0, "put", `/jobs/${job.id}/assignments`, {
      user_ids: [ctx.users[2].id],
    })
    .expect(200);
  await ctx.call(2, "get", `/jobs/${job.id}`).expect(200);
  const page = await ctx.call(2, "get", `/jobs?search=${title}`).expect(200);
  assert.equal(page.body.total, 1);
  await ctx.call(2, "post", "/jobs", { title }).expect(403);
  await ctx
    .call(2, "patch", `/jobs/${job.id}`, { revision: 1, status: "closed" })
    .expect(403);
  await ctx
    .call(0, "put", `/jobs/${job.id}/assignments`, { user_ids: [] })
    .expect(200);
  await ctx.call(2, "get", `/jobs/${job.id}`).expect(404);
  assert.equal(
    (await ctx.call(2, "get", `/jobs?search=${title}`).expect(200)).body.total,
    0,
  );
  assert.equal(
    (
      await ctx
        .db("audit_events")
        .where({ job_id: job.id, action: "job.assignments_updated" })
    ).length,
    2,
  );
});
