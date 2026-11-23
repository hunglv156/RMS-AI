import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { setup } from "../reviews/support";

test("dashboard uses unique applications, current decisions and latest runs with full reviewer job scope", async () => {
  const h = await setup();
  try {
    await request(h.app.getHttpServer()).get("/api/v1/dashboard").expect(401);
    const empty = (await h.http("get", "/dashboard", 3).expect(200)).body;
    assert.deepEqual(empty.counts, {
      jobs_open: 0,
      applications: 0,
      awaiting_review: 0,
      shortlist: 0,
      reject: 0,
      hold: 0,
      screening_failures: 0,
    });
    assert.deepEqual(empty.recent_applications, []);
    assert.deepEqual(empty.latest_failures, []);
    assert.deepEqual(empty.pending_reviews, []);
    let dashboard = (await h.http("get", "/dashboard", 2).expect(200)).body;
    assert.equal(dashboard.counts.applications, 1);
    assert.equal(dashboard.counts.awaiting_review, 1);
    assert.equal(dashboard.pending_reviews[0].id, h.run.id);
    const body = {
      decision: "shortlist",
      note: "Confirmed qualifications",
      expected_application_revision: 1,
    };
    await h
      .http("post", `/screenings/${h.run.id}/reviews`, 2)
      .send(body)
      .expect(201);
    await h
      .http("post", `/screenings/${h.run.id}/reviews`, 2)
      .send({ ...body, decision: "hold", expected_application_revision: 2 })
      .expect(201);
    dashboard = (await h.http("get", "/dashboard", 2).expect(200)).body;
    assert.equal(dashboard.counts.shortlist, 0);
    assert.equal(dashboard.counts.hold, 1);
    assert.equal(dashboard.counts.awaiting_review, 0);
    const newer = await h.addRun();
    const failedApplication = await h.fresh();
    const oldFailure = await h.addRun(failedApplication, "failed");
    const failure = await h.addRun(failedApplication, "failed");
    const recovered = await h.fresh();
    await h.addRun(recovered, "failed");
    const recoveredRun = await h.addRun(recovered);
    const newApplication = await h.fresh(); // No run: counted only as an application.
    const candidate = (
        await h
          .http("post", "/candidates")
          .send({ display_name: "Hidden synthetic", provenance: "synthetic" })
          .expect(201)
      ).body,
      resume = await h.upload(candidate.id);
    const hiddenApplication = (
      await h
        .http("post", `/jobs/${h.jobs[1].id}/applications`)
        .send({ candidate_id: candidate.id, resume_id: resume.id })
        .expect(201)
    ).body;
    let hiddenJd = (
      await h
        .http("post", `/jobs/${h.jobs[1].id}/jd-versions`)
        .send({
          title: "Hidden synthetic JD",
          summary: "Demo",
          criteria: [
            {
              code: "python",
              label: "Python",
              description: "Experience",
              priority: "must_have",
              weight: 1,
              keywords: [],
            },
          ],
        })
        .expect(201)
    ).body;
    hiddenJd = (
      await h
        .http("post", `/jd-versions/${hiddenJd.id}/submit`)
        .send({ revision: hiddenJd.revision })
        .expect(200)
    ).body;
    hiddenJd = (
      await h
        .http("post", `/jd-versions/${hiddenJd.id}/approve`, 0)
        .send({ revision: hiddenJd.revision })
        .expect(200)
    ).body;
    const hiddenRun = await h.addRun(hiddenApplication, "failed", {
      jd_version_id: hiddenJd.id,
    });
    await h.db("jobs").where({ id: h.jobs[0].id }).update({ status: "closed" });
    dashboard = (await h.http("get", "/dashboard", 2).expect(200)).body;
    assert.equal(dashboard.counts.jobs_open, 0);
    assert.equal(dashboard.counts.applications, 4);
    assert.equal(dashboard.counts.awaiting_review, 2);
    assert.equal(dashboard.counts.screening_failures, 1);
    assert.equal(dashboard.counts.hold, 1); // New AI never changes the old human decision.
    assert.deepEqual(
      new Set(dashboard.pending_reviews.map((r: any) => r.id)),
      new Set([newer.id, recoveredRun.id]),
    );
    assert.deepEqual(
      dashboard.latest_failures.map((r: any) => r.id),
      [failure.id],
    );
    assert(
      !dashboard.latest_failures.some((r: any) =>
        [oldFailure.id, hiddenRun.id].includes(r.id),
      ),
    );
    assert(
      dashboard.recent_applications.some(
        (a: any) => a.id === newApplication.id,
      ),
    );
    assert(!JSON.stringify(dashboard).includes(hiddenApplication.id));
    assert(!JSON.stringify(dashboard).includes(candidate.display_name));
    assert(!JSON.stringify(dashboard).includes(h.jobs[1].id));
    for (const r of [
      ...dashboard.pending_reviews,
      ...dashboard.latest_failures,
    ]) {
      for (const key of [
        "input_snapshot_json",
        "normalized_source_text",
        "result_json",
        "storage_key",
        "result",
      ])
        assert(!Object.hasOwn(r, key));
    }
    const admin = (await h.http("get", "/dashboard", 0).expect(200)).body;
    const recruiter = (await h.http("get", "/dashboard").expect(200)).body;
    assert.deepEqual(admin.counts, recruiter.counts);
    assert(admin.counts.applications >= 5);
    // Revoking the only assignment immediately removes all summaries and counts.
    await h
      .db("job_assignments")
      .where({ job_id: h.jobs[0].id, user_id: h.users[2].id })
      .delete();
    assert.deepEqual(
      (await h.http("get", "/dashboard", 2).expect(200)).body,
      empty,
    );
  } finally {
    await h.close();
  }
});
