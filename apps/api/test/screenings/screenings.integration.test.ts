import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup, envelope, manifest } from "./support";
import { ScreeningExecution } from "../../src/screenings/execution.service";
import { AiAdapter } from "../../src/screenings/ai-adapter";
import {
  hash,
  canonical,
  ExecutionError,
} from "../../src/screenings/validation";
test("durable admission, concurrent identities, all-or-none batches, key replay and authorized result history", async () => {
  const h = await setup();
  try {
    const key = randomUUID(),
      before = performance.now();
    const { run, response } = await h.start(key);
    assert(performance.now() - before < 1000);
    assert.equal(run.status, "queued");
    assert.equal(response.headers.location, `/api/v1/screenings/${run.id}`);
    assert.equal(h.calls, 0);
    assert.equal(
      (await h.db("outbox_events").where({ run_id: run.id })).length,
      1,
    );
    assert.equal(
      (
        await h
          .db("audit_events")
          .where({ resource_id: run.id, action: "screening.requested" })
      ).length,
      1,
    );
    // An idempotency record written before T8.12 still returns the additive names.
    const legacy = structuredClone(response.body);
    delete legacy.runs[0].candidate_display_name;
    delete legacy.runs[0].requested_by_actor;
    await h
      .db("api_idempotency_keys")
      .where({ actor_id: h.users[1].id, key })
      .update({ response_json: legacy });
    const replay = await h.start(key);
    assert.equal(
      replay.response.body.runs[0].candidate_display_name,
      h.candidate.display_name,
    );
    assert.deepEqual(replay.response.body.runs[0].requested_by_actor, {
      id: h.users[1].id,
      display_name: h.users[1].display_name,
    });
    assert.equal(
      replay.response.body.runs[0].status,
      response.body.runs[0].status,
    );
    const same = await Promise.all([h.start(key), h.start(), h.start()]);
    assert(same.every((v) => v.run.id === run.id));
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`)
      .set("Idempotency-Key", key)
      .send({ ...h.body, application_ids: [randomUUID()] })
      .expect(409);
    const fresh = await h.fresh();
    const count = await h
      .db("screening_runs")
      .where({ application_id: fresh.id })
      .count("id as n")
      .first();
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`)
      .set("Idempotency-Key", randomUUID())
      .send({ ...h.body, application_ids: [fresh.id, randomUUID()] })
      .expect(404);
    assert.deepEqual(
      await h
        .db("screening_runs")
        .where({ application_id: fresh.id })
        .count("id as n")
        .first(),
      count,
    );
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`, 2)
      .set("Idempotency-Key", randomUUID())
      .send(h.body)
      .expect(403);
    await h
      .http("post", `/jobs/${h.jobs[1].id}/screenings`)
      .set("Idempotency-Key", randomUUID())
      .send(h.body)
      .expect(409);
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`)
      .send(h.body)
      .expect(400);
    await h
      .http("post", `/screenings/${run.id}/retries`)
      .set("Idempotency-Key", randomUUID())
      .send({})
      .expect(409);
    const execution = h.app.get(ScreeningExecution);
    await execution.execute(run.id, "test-execution");
    assert.equal(h.calls, 1);
    assert.equal(h.lastRequest.headers["x-run-id"], run.id);
    assert.equal(
      h.lastRequest.headers["x-expected-config-fingerprint"],
      run.input_snapshot_json.manifest.fingerprint,
    );
    assert.match(h.lastRequest.headers["content-type"], /multipart/);
    assert.match(h.lastRequest.body, /%PDF-/);
    assert.match(h.lastRequest.body, /name="jd"/);
    const detail = (await h.http("get", `/screenings/${run.id}`, 2).expect(200))
      .body;
    assert.equal(detail.status, "completed");
    assert.equal(detail.result.source.text, "Synthetic 😀 CV: Python engineer");
    assert(!JSON.stringify(detail).includes("storage_key"));
    await h.http("get", `/screenings/${run.id}`, 3).expect(404);
    const history = (
      await h
        .http("get", `/applications/${h.application.id}/screenings`, 2)
        .expect(200)
    ).body;
    assert.equal(history.total, 1);
    assert(!JSON.stringify(history).includes("Synthetic 😀"));
    assert.equal(
      (
        await h
          .db("screening_criterion_results")
          .where({ screening_run_id: run.id })
      ).length,
      1,
    );
    await execution.execute(run.id, "redelivery");
    assert.equal(h.calls, 1);
    h.offline();
    assert.equal(
      (await h.app.get(AiAdapter).config()).id,
      run.scoring_config_id,
    );
  } finally {
    await h.close();
  }
});
test("execution rechecks requester and resources, closed-job pending work and frozen resume remain valid", async () => {
  const h = await setup();
  try {
    const execution = h.app.get(ScreeningExecution);
    let { run } = await h.start();
    await h
      .db("users")
      .where({ id: h.users[1].id })
      .update({ disabled_at: new Date() });
    assert.equal(await execution.claim(run.id, "revocation"), null);
    assert.equal(
      (await h.db("screening_runs").where({ id: run.id }).first()).error_code,
      "execution_authorization_failed",
    );
    assert.equal(h.calls, 0);
    await h
      .db("users")
      .where({ id: h.users[1].id })
      .update({ disabled_at: null });
    const a = await h.fresh();
    ({ run } = await h.start(randomUUID(), {
      ...h.body,
      application_ids: [a.id],
    }));
    await h
      .db("users")
      .where({ id: h.users[1].id })
      .update({ role: "reviewer" });
    await execution.execute(run.id, "role-change");
    assert.equal(
      (await h.db("screening_runs").where({ id: run.id }).first()).error_code,
      "execution_authorization_failed",
    );
    await h
      .db("users")
      .where({ id: h.users[1].id })
      .update({ role: "recruiter" });
    const b = await h.fresh();
    ({ run } = await h.start(randomUUID(), {
      ...h.body,
      application_ids: [b.id],
    }));
    const replacement = await h.upload(b.candidate_id);
    await h
      .db("applications")
      .where({ id: b.id })
      .update({ resume_id: replacement.id });
    await h.db("jobs").where({ id: h.jobs[0].id }).update({ status: "closed" });
    await execution.execute(run.id, "closed-after-admission");
    assert.equal(
      (await h.db("screening_runs").where({ id: run.id }).first()).status,
      "completed",
    );
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`)
      .set("Idempotency-Key", randomUUID())
      .send(h.body)
      .expect(409);
  } finally {
    await h.close();
  }
});
test("safe terminal AI failures, transient retry budget, immutable explicit retry and drift refresh", async () => {
  const h = await setup();
  try {
    const execution = h.app.get(ScreeningExecution);
    for (const [status, code, retry] of [
      [400, "invalid_pdf", false],
      [400, "encrypted_pdf", false],
      [413, "file_too_large", false],
      [400, "empty_text", false],
      [401, "unauthenticated", false],
      [502, "llm_schema_error", false],
      [429, "llm_rate_limited", true],
      [503, "llm_error", true],
      [504, "request_timeout", true],
    ] as const) {
      const a = await h.fresh(),
        { run } = await h.start(randomUUID(), {
          ...h.body,
          application_ids: [a.id],
        });
      h.fault(status, code);
      await assert.rejects(execution.execute(run.id, "failure"));
      let saved = await h.db("screening_runs").where({ id: run.id }).first();
      assert.equal(saved.status, retry ? "retry_wait" : "failed");
      assert(!JSON.stringify(saved).includes("PRIVATE provider"));
      if (retry) {
        assert(new Date(saved.next_retry_at).getTime() >= Date.now() + 3500);
        await h
          .db("screening_runs")
          .where({ id: run.id })
          .update({ next_retry_at: new Date(0) });
        await assert.rejects(execution.execute(run.id, "failure-again"));
        saved = await h.db("screening_runs").where({ id: run.id }).first();
        assert.equal(saved.status, "failed");
        assert.equal(saved.attempt_count, 2);
        await execution.execute(run.id, "exhausted");
      }
    }
    h.fault(409, "config_changed");
    const { run } = await h.start();
    await assert.rejects(execution.execute(run.id, "drift"));
    const next = manifest();
    next.build_revision = "new-build";
    const { fingerprint, ...rest } = next;
    next.fingerprint = hash(canonical(rest));
    h.setManifest(next);
    const key = randomUUID(),
      retry = await h
        .http("post", `/screenings/${run.id}/retries`)
        .set("Idempotency-Key", key)
        .send({})
        .expect(202);
    const newRun = await h
      .db("screening_runs")
      .where({ id: retry.body.runs[0].id })
      .first();
    assert.equal(newRun.retry_of_run_id, run.id);
    assert.notEqual(newRun.scoring_config_id, run.scoring_config_id);
    assert.deepEqual(
      newRun.input_snapshot_json.resume,
      run.input_snapshot_json.resume,
    );
    assert.equal(
      (
        await h
          .http("post", `/screenings/${run.id}/retries`)
          .set("Idempotency-Key", key)
          .send({})
          .expect(202)
      ).body.runs[0].id,
      newRun.id,
    );
    h.setInput(newRun.input_snapshot_json);
    h.fault();
    await execution.execute(newRun.id, "retry-success");
    assert.equal(
      (await h.db("screening_runs").where({ id: run.id }).first()).status,
      "failed",
    );
  } finally {
    await h.close();
  }
});
test("schema/source mismatch fail closed, HTTP timeout and lease fencing discard late output", async () => {
  const h = await setup();
  try {
    const execution = h.app.get(ScreeningExecution);
    for (const mutate of [
      (v: any) => {
        delete v.source;
      },
      (v: any) => {
        v.source.text = "tampered";
      },
      (v: any) => {
        v.screening.criteria[0].assessment.criterion_id = "wrong";
      },
    ]) {
      const a = await h.fresh(),
        { run } = await h.start(randomUUID(), {
          ...h.body,
          application_ids: [a.id],
        });
      h.fault(200, "", 0, mutate);
      await assert.rejects(execution.execute(run.id, "invalid"));
      assert.equal(
        (await h.db("screening_runs").where({ id: run.id }).first()).status,
        "failed",
      );
      assert.equal(
        (
          await h
            .db("screening_criterion_results")
            .where({ screening_run_id: run.id })
        ).length,
        0,
      );
    }
    const a = await h.fresh(),
      { run } = await h.start(randomUUID(), {
        ...h.body,
        application_ids: [a.id],
      });
    const claimed = await execution.claim(run.id, "claim");
    assert(claimed);
    assert.equal(await execution.claim(run.id, "duplicate"), null);
    await h
      .db("screening_runs")
      .where({ id: run.id })
      .update({ lease_expires_at: new Date(0) });
    assert.equal(
      await execution.heartbeat(run.id, claimed.attempt_token),
      false,
    );
    assert.equal(
      await execution.finish(
        claimed,
        envelope(run.input_snapshot_json),
        "late",
      ),
      false,
    );
    assert.equal(
      await execution.fail(
        claimed,
        new ExecutionError("transport_timeout", true),
        "late",
      ),
      false,
    );
    // Test adapter deadline through a caller cancellation while the fake HTTP server is waiting.
    h.fault(200, "", 100);
    const abort = new AbortController();
    setTimeout(() => abort.abort(), 20);
    await assert.rejects(
      h.app
        .get(AiAdapter)
        .screen(
          run.id,
          "timeout",
          run.input_snapshot_json,
          Buffer.from("%PDF-"),
          abort.signal,
        ),
      (e) => (e as ExecutionError).retryable,
    );
  } finally {
    await h.close();
  }
});

test("audit failure rolls admission back; draft rejected; persistent identity survives key expiry", async () => {
  const h = await setup();
  try {
    const { AuditWriter } = await import(
      "../../src/audit/audit-writer.service"
    );
    const writer = h.app.get(AuditWriter),
      append = writer.append.bind(writer);
    writer.append = async (tx, event) => {
      if (event.action === "screening.requested")
        throw new Error("injected audit failure");
      return append(tx, event);
    };
    const key = randomUUID();
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`)
      .set("Idempotency-Key", key)
      .send(h.body)
      .expect(500);
    assert.equal(
      (await h.db("screening_runs").where({ application_id: h.application.id }))
        .length,
      0,
    );
    assert.equal(
      (
        await h
          .db("api_idempotency_keys")
          .where({ actor_id: h.users[1].id, key })
      ).length,
      0,
    );
    writer.append = append;
    const draft = (
      await h
        .http("post", `/jobs/${h.jobs[0].id}/jd-versions`)
        .send({ title: "Draft", summary: "", criteria: h.jd.criteria })
        .expect(201)
    ).body;
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`)
      .set("Idempotency-Key", randomUUID())
      .send({ ...h.body, jd_version_id: draft.id })
      .expect(409);
    const { run } = await h.start(key);
    await h
      .db("api_idempotency_keys")
      .where({ actor_id: h.users[1].id, key })
      .update({ expires_at: new Date(0) });
    assert.equal((await h.start(key)).run.id, run.id);
    h.fault(400, "invalid_pdf");
    await assert.rejects(h.app.get(ScreeningExecution).execute(run.id, "fail"));
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`)
      .set("Idempotency-Key", randomUUID())
      .send(h.body)
      .expect(409);
    const retries = await Promise.all(
      [randomUUID(), randomUUID()].map((k) =>
        h
          .http("post", `/screenings/${run.id}/retries`)
          .set("Idempotency-Key", k)
          .send({})
          .expect(202),
      ),
    );
    assert.equal(retries[0].body.runs[0].id, retries[1].body.runs[0].id);
    assert.equal(retries[0].body.runs[0].generation, 2);
    const retry = await h
      .db("screening_runs")
      .where({ id: retries[0].body.runs[0].id })
      .first();
    assert.deepEqual(retry.input_snapshot_json, run.input_snapshot_json);
  } finally {
    await h.close();
  }
});
test("no validated manifest rejects admission without writes and HTTP deadline schedules a retry", async (t) => {
  const h = await setup();
  try {
    // Prime this adapter with its own validated manifest before simulating an outage.
    await h.app.get(AiAdapter).config();
    h.offline();
    const adapter = h.app.get(AiAdapter),
      config = adapter.config.bind(adapter);
    const empty = new AiAdapter({
      connection: (table: string) => h.db(table).whereRaw("false"),
    } as any);
    adapter.config = () => empty.config();
    await h
      .http("post", `/jobs/${h.jobs[0].id}/screenings`)
      .set("Idempotency-Key", randomUUID())
      .send(h.body)
      .expect(503);
    assert.equal(
      (await h.db("screening_runs").where({ application_id: h.application.id }))
        .length,
      0,
    );
    adapter.config = config;
    const { run } = await h.start();
    h.fault(200, "", 100);
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    t.mock.method(AbortSignal, "timeout", (ms: number) =>
      timeout(ms === 180000 ? 10 : ms),
    );
    await assert.rejects(
      h.app.get(ScreeningExecution).execute(run.id, "deadline"),
    );
    const saved = await h.db("screening_runs").where({ id: run.id }).first();
    assert.equal(saved.status, "retry_wait");
    assert.equal(saved.error_code, "transport_timeout");
    assert.equal(saved.attempt_count, 1);
  } finally {
    await h.close();
  }
});
