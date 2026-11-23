import { test } from "node:test";
import assert from "node:assert/strict";
import { setup } from "./support";

test("authorized records expose names only while reviewer job and candidate boundaries remain closed", async () => {
  const h = await setup();
  const identity = (index: number) => ({
    id: h.users[index].id,
    display_name: h.users[index].display_name,
  });
  try {
    const candidate = await h
      .db("candidates")
      .where({ id: h.application.candidate_id })
      .first();
    const listed = (
      await h.http("get", `/jobs/${h.jobs[0].id}/applications`, 2).expect(200)
    ).body;
    assert.equal(
      listed.items.find((a: any) => a.id === h.application.id)
        .candidate_display_name,
      candidate.display_name,
    );
    for (const path of [
      `/screenings/${h.run.id}`,
      `/applications/${h.application.id}/screenings`,
    ]) {
      const response = (await h.http("get", path, 2).expect(200)).body;
      const run = response.items ? response.items[0] : response;
      assert.equal(run.candidate_display_name, candidate.display_name);
      assert.deepEqual(run.requested_by_actor, identity(1));
      assert.deepEqual(Object.keys(run.requested_by_actor).sort(), [
        "display_name",
        "id",
      ]);
      await h.http("get", path, 3).expect(404);
    }
    const dashboard = (await h.http("get", "/dashboard", 2).expect(200)).body;
    assert.equal(
      dashboard.pending_reviews.find((r: any) => r.id === h.run.id)
        .candidate_display_name,
      candidate.display_name,
    );
    assert.equal(
      dashboard.recent_applications.find((a: any) => a.id === h.application.id)
        .candidate_display_name,
      candidate.display_name,
    );
    const review = (
      await h
        .http("post", `/screenings/${h.run.id}/reviews`, 2)
        .send({
          decision: "hold",
          note: "Verify experience",
          expected_application_revision: 1,
        })
        .expect(201)
    ).body;
    assert.deepEqual(review.reviewer, identity(2));
    const history = (
      await h
        .http("get", `/applications/${h.application.id}/reviews`, 2)
        .expect(200)
    ).body;
    assert.deepEqual(history.items[0].reviewer, identity(2));
    await h
      .http("get", `/applications/${h.application.id}/reviews`, 3)
      .expect(404);
    const jd = (
      await h.http("get", `/jd-versions/${h.run.jd_version_id}`, 2).expect(200)
    ).body;
    assert.deepEqual(jd.created_by_actor, identity(1));
    assert.deepEqual(jd.submitted_by_actor, identity(1));
    assert.deepEqual(jd.approved_by_actor, identity(0));
    const resume = await h.upload(candidate.id);
    assert.deepEqual(resume.uploaded_by_actor, identity(1));
    for (const record of [review, history, jd, resume, dashboard, listed]) {
      const encoded = JSON.stringify(record);
      for (const user of h.users)
        assert(!encoded.includes(user.normalized_email));
      assert(!encoded.includes('"role"'));
      assert(!encoded.includes('"email"'));
      assert(!encoded.includes('"phone"'));
    }
    await h.http("get", "/candidates", 2).expect(403);
    await h.http("get", `/candidates/${candidate.id}`, 2).expect(403);
    await h.http("get", `/resumes/${resume.id}/content`, 2).expect(404);
    await h.http("get", `/jobs/${h.jobs[1].id}/applications`, 2).expect(404);
    await h.http("get", `/resumes/${h.run.resume_id}/content`, 3).expect(404);
    await h.http("get", "/audit-events", 2).expect(403);
    await h
      .db("job_assignments")
      .where({ job_id: h.jobs[0].id, user_id: h.users[2].id })
      .delete();
    await h.http("get", `/screenings/${h.run.id}`, 2).expect(404);
    await h.http("get", `/jobs/${h.jobs[0].id}/applications`, 2).expect(404);
    assert.deepEqual(
      (await h.http("get", "/dashboard", 2).expect(200)).body.pending_reviews,
      [],
    );
  } finally {
    await h.close();
  }
});
