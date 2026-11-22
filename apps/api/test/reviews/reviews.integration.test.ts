import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { setup } from "./support";
import { AuditWriter } from "../../src/audit/audit-writer.service";

test("human decisions validate notes/completion, append/supersede, preserve AI and reject stale concurrent reviews", async () => {
  const h = await setup();
  try {
    const path = `/screenings/${h.run.id}/reviews`;
    const body = {
      decision: "shortlist",
      note: "  Confirmed in interview  ",
      expected_application_revision: 1,
    };
    const beforeRun = await h
      .db("screening_runs")
      .where({ id: h.run.id })
      .first();
    const beforeCriteria = await h
      .db("screening_criterion_results")
      .where({ screening_run_id: h.run.id })
      .orderBy("id");
    assert.equal(beforeRun.score_state, "insufficient_coverage");
    for (const note of ["", "  \n\t ", "x".repeat(2001)])
      await h
        .http("post", path, 2)
        .send({ ...body, note })
        .expect(400);
    await h
      .http("post", path, 2)
      .send({ ...body, decision: "hire" })
      .expect(400);
    await h
      .http("post", path, 2)
      .send({ ...body, expected_application_revision: 0 })
      .expect(400);
    await h
      .http("post", path, 2)
      .send({ decision: "hold", note: "Missing revision" })
      .expect(400);
    await h.http("post", path, 3).send(body).expect(404);
    await h
      .http("get", `/applications/${h.application.id}/reviews`, 3)
      .expect(404);
    await h
      .http("post", `/screenings/${randomUUID()}/reviews`)
      .send(body)
      .expect(404);
    await request(h.app.getHttpServer())
      .post(`/api/v1${path}`)
      .send(body)
      .expect(401);
    const queued = await h.addRun(h.application, "queued");
    await h
      .http("post", `/screenings/${queued.id}/reviews`, 2)
      .send(body)
      .expect(409);
    const failed = await h.addRun(h.application, "failed");
    await h
      .http("post", `/screenings/${failed.id}/reviews`, 2)
      .send(body)
      .expect(409);
    // Historical reviews remain allowed after job closure and after newer runs.
    await h.db("jobs").where({ id: h.jobs[0].id }).update({ status: "closed" });
    const race = await Promise.all([
      h.http("post", path, 2).send(body),
      h.http("post", path, 0).send({ ...body, decision: "reject" }),
    ]);
    assert.deepEqual(race.map((r) => r.status).sort(), [201, 409]);
    const first = race.find((r) => r.status === 201)!.body;
    const conflict = race.find((r) => r.status === 409)!.body;
    assert.equal(conflict.error.code, "revision_conflict");
    assert.equal(first.note, "Confirmed in interview");
    assert.equal(first.supersedes_review_id, null);
    assert.equal(
      first.reviewer_id,
      first.decision === "shortlist" ? h.users[2].id : h.users[0].id,
    );
    const second = (
      await h
        .http("post", path)
        .send({
          ...body,
          decision: "hold",
          note: " Ask for references ",
          expected_application_revision: 2,
        })
        .expect(201)
    ).body;
    assert.equal(second.supersedes_review_id, first.id);
    const third = (
      await h
        .http("post", path, 0)
        .send({ ...body, decision: "reject", expected_application_revision: 3 })
        .expect(201)
    ).body;
    assert.equal(third.supersedes_review_id, second.id);
    const application = await h
      .db("applications")
      .where({ id: h.application.id })
      .first();
    assert.equal(application.stage, "reject");
    assert.equal(application.current_review_id, third.id);
    assert.equal(application.revision, 4);
    const page = (
      await h
        .http(
          "get",
          `/applications/${h.application.id}/reviews?page=2&pageSize=1&sort=created_at`,
          2,
        )
        .expect(200)
    ).body;
    assert.equal(page.total, 3);
    assert.equal(page.items[0].id, second.id);
    await h
      .http("get", `/applications/${h.application.id}/reviews?pageSize=101`)
      .expect(400);
    assert.deepEqual(
      await h.db("screening_runs").where({ id: h.run.id }).first(),
      beforeRun,
    );
    assert.deepEqual(
      await h
        .db("screening_criterion_results")
        .where({ screening_run_id: h.run.id })
        .orderBy("id"),
      beforeCriteria,
    );
    const audits = await h
      .db("audit_events")
      .where({ action: "review.created", job_id: h.jobs[0].id });
    assert.equal(audits.length, 3);
    assert(
      audits.every((a) =>
        [first.id, second.id, third.id].includes(a.resource_id),
      ),
    );
    assert(audits.every((a) => JSON.stringify(a.safe_metadata_json) === "{}"));
    await assert.rejects(
      h.db("human_reviews").where({ id: first.id }).update({ note: "tamper" }),
    );
    await assert.rejects(
      h.db("human_reviews").where({ id: first.id }).delete(),
    );
  } finally {
    await h.close();
  }
});

test("audit failure rolls back the human review and application pointer/revision", async () => {
  const h = await setup();
  const writer = h.app.get(AuditWriter),
    original = writer.append;
  try {
    writer.append = async () => {
      throw new Error("injected audit failure");
    };
    await h
      .http("post", `/screenings/${h.run.id}/reviews`, 2)
      .send({
        decision: "hold",
        note: "Documented decision",
        expected_application_revision: 1,
      })
      .expect(500);
    assert.equal(
      (await h.db("human_reviews").where({ application_id: h.application.id }))
        .length,
      0,
    );
    const application = await h
      .db("applications")
      .where({ id: h.application.id })
      .first();
    assert.equal(application.revision, 1);
    assert.equal(application.stage, "new");
    assert.equal(application.current_review_id, null);
  } finally {
    writer.append = original;
    await h.close();
  }
});
