import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup } from "../candidates/support";
import { sha256 } from "../fixtures";
let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx?.close();
});
test("applications validate candidate/resume, scoped pagination, uniqueness, closed jobs and strict mutations", async () => {
  const c = await ctx.candidate(`Synthetic ${randomUUID()}`),
    other = await ctx.candidate(),
    resume = await ctx.upload(c.id),
    wrong = await ctx.upload(other.id);
  const path = `/jobs/${ctx.jobs[0].id}/applications`;
  await ctx
    .http("post", path)
    .send({ candidate_id: c.id, resume_id: wrong.id })
    .expect(400);
  const row = (
    await ctx
      .http("post", path)
      .send({ candidate_id: c.id, resume_id: resume.id })
      .expect(201)
  ).body;
  await ctx
    .http("post", path)
    .send({ candidate_id: c.id, resume_id: resume.id })
    .expect(409);
  const list = await ctx
    .http(
      "get",
      path + `?search=${encodeURIComponent(c.display_name)}&pageSize=1`,
      2,
    )
    .expect(200);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].id, row.id);
  await ctx.http("get", path, 3).expect(404);
  await ctx.http("get", `/jobs/${ctx.jobs[1].id}/applications`, 2).expect(404);
  await ctx
    .http("post", path, 2)
    .send({ candidate_id: other.id, resume_id: wrong.id })
    .expect(403);
  await ctx
    .http("patch", `/applications/${row.id}`)
    .send({ resume_id: wrong.id, revision: 1 })
    .expect(400);
  await ctx
    .http("patch", `/applications/${row.id}`)
    .send({ resume_id: resume.id, revision: 1, stage: "reject" })
    .expect(400);
  await ctx
    .db("jobs")
    .where({ id: ctx.jobs[1].id })
    .update({ status: "closed" });
  await ctx
    .http("post", `/jobs/${ctx.jobs[1].id}/applications`)
    .send({ candidate_id: other.id, resume_id: wrong.id })
    .expect(409);
  assert.ok(
    await ctx
      .db("audit_events")
      .where({ resource_id: row.id, action: "application.created" })
      .first(),
  );
});
test("replacement serializes revisions, preserves historical runs/bytes, and limits reviewer downloads to current or historical links", async () => {
  const c = await ctx.candidate(),
    old = await ctx.upload(c.id);
  const application = (
    await ctx
      .http("post", `/jobs/${ctx.jobs[0].id}/applications`)
      .send({ candidate_id: c.id, resume_id: old.id })
      .expect(201)
  ).body;
  const jd = {
    id: randomUUID(),
    job_id: ctx.jobs[0].id,
    version_no: 1,
    title: "Synthetic JD",
    summary: "Synthetic",
    created_by: ctx.users[0].id,
  };
  await ctx.db("jd_versions").insert(jd);
  await ctx
    .db("job_criteria")
    .insert({
      jd_version_id: jd.id,
      code: "synthetic",
      label: "Synthetic",
      description: "Synthetic",
      priority: "must_have",
      weight: 1,
      keywords_json: "[]",
      sort_order: 0,
    });
  await ctx
    .db("jd_versions")
    .where({ id: jd.id })
    .update({ state: "pending_approval" });
  await ctx
    .db("jd_versions")
    .where({ id: jd.id })
    .update({
      state: "approved",
      approved_by: ctx.users[0].id,
      approved_at: new Date(),
      content_sha256: sha256("synthetic"),
    });
  const config = {
    id: randomUUID(),
    fingerprint: sha256(randomUUID()),
    effective_manifest_json: {},
  };
  await ctx.db("screening_configs").insert(config);
  const run = {
    id: randomUUID(),
    application_id: application.id,
    job_id: jd.job_id,
    resume_id: old.id,
    jd_version_id: jd.id,
    scoring_config_id: config.id,
    input_snapshot_json: { resume_id: old.id },
    input_fingerprint: sha256(randomUUID()),
    requested_by: ctx.users[1].id,
  };
  await ctx.db("screening_runs").insert(run);
  const fresh = await ctx.upload(c.id),
    unused = await ctx.upload(c.id);
  await ctx.http("get", `/resumes/${fresh.id}/content`, 2).expect(404);
  const outcomes = await Promise.all(
    [fresh, unused].map((r) =>
      ctx
        .http("patch", `/applications/${application.id}`)
        .send({ resume_id: r.id, revision: 1 }),
    ),
  );
  assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
  const selected = outcomes.find((r) => r.status === 200)!.body;
  assert.equal(selected.revision, 2);
  assert.deepEqual(
    await ctx
      .db("screening_runs")
      .where({ id: run.id })
      .first()
      .then((r) => r.input_snapshot_json),
    run.input_snapshot_json,
  );
  assert.equal(
    (await ctx.db("screening_runs").where({ id: run.id }).first()).resume_id,
    old.id,
  );
  await ctx.http("get", `/resumes/${old.id}/content`, 2).expect(200);
  await ctx
    .http("get", `/resumes/${selected.resume_id}/content`, 2)
    .expect(200);
  const unlinked = [fresh, unused].find((r) => r.id !== selected.resume_id)!;
  await ctx.http("get", `/resumes/${unlinked.id}/content`, 2).expect(404);
  await ctx.http("get", `/resumes/${old.id}/content`, 3).expect(404);
  await ctx
    .db("job_assignments")
    .where({ job_id: jd.job_id, user_id: ctx.users[2].id })
    .delete();
  await ctx.http("get", `/resumes/${old.id}/content`, 2).expect(404);
});
