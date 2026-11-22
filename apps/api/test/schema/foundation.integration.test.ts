import "reflect-metadata";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import knex, { Knex } from "knex";
import { randomUUID } from "node:crypto";
import { verify } from "argon2";
import { seedBaselineUsers } from "../../src/db/seeds/baseline-users";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import request from "supertest";
import { createApiApp } from "../../src/main";
import { WorkerModule } from "../../src/worker.module";
import {
  fixtureUser,
  fixtureJob,
  fixtureCandidate,
  fixtureResume,
  sha256,
} from "../fixtures";
let db: Knex;
before(async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  assert.match(url.pathname, /^\/rms_ai_test(?:_[a-z0-9_]+)?$/);
  const name = url.pathname.slice(1);
  url.pathname = "/postgres";
  const admin = knex({ client: "pg", connection: url.toString() });
  try {
    if (!(await admin("pg_database").where({ datname: name }).first()))
      await admin.raw("CREATE DATABASE ??", [name]);
  } finally {
    await admin.destroy();
  }
  db = knex({ client: "pg", connection: process.env.TEST_DATABASE_URL });
  await db.migrate.latest({
    directory: resolve("../../infra/migrations"),
    loadExtensions: [".cjs"],
  });
});
after(async () => {
  await db?.destroy();
});
async function rollback(work: (tx: Knex.Transaction) => Promise<void>) {
  const tx = await db.transaction();
  try {
    await work(tx);
  } finally {
    await tx.rollback();
  }
}
async function rejects(
  tx: Knex.Transaction,
  sql: string,
  bindings: Knex.RawBinding[] = [],
) {
  await tx.raw("SAVEPOINT expected_failure");
  try {
    await assert.rejects(tx.raw(sql, bindings));
  } finally {
    await tx.raw("ROLLBACK TO SAVEPOINT expected_failure");
  }
}
async function fixture(tx: Knex.Transaction) {
  const user = fixtureUser();
  await tx("users").insert(user);
  const job = fixtureJob(user.id),
    otherJob = fixtureJob(user.id);
  await tx("jobs").insert([job, otherJob]);
  const jd = {
    id: randomUUID(),
    job_id: job.id,
    version_no: 1,
    title: "JD",
    summary: "Synthetic JD",
    created_by: user.id,
  };
  await tx("jd_versions").insert(jd);
  const criterion = {
    id: randomUUID(),
    jd_version_id: jd.id,
    code: "python",
    label: "Python",
    description: "Python experience",
    priority: "must_have",
    weight: 1,
    sort_order: 0,
  };
  await tx("job_criteria").insert(criterion);
  await tx("jd_versions").where({ id: jd.id }).update({
    state: "pending_approval",
    submitted_by: user.id,
    submitted_at: new Date(),
  });
  await tx("jd_versions")
    .where({ id: jd.id })
    .update({
      state: "approved",
      approved_by: user.id,
      approved_at: new Date(),
      content_sha256: sha256("JD"),
    });
  const candidate = fixtureCandidate(user.id),
    otherCandidate = fixtureCandidate(user.id);
  await tx("candidates").insert([candidate, otherCandidate]);
  const resume = fixtureResume(candidate.id, user.id);
  await tx("resumes").insert(resume);
  const application = {
    id: randomUUID(),
    job_id: job.id,
    candidate_id: candidate.id,
    resume_id: resume.id,
    created_by: user.id,
  };
  await tx("applications").insert(application);
  const config = {
    id: randomUUID(),
    fingerprint: sha256("manifest"),
    effective_manifest_json: { test: true },
  };
  await tx("screening_configs").insert(config);
  const run = {
    id: randomUUID(),
    application_id: application.id,
    job_id: job.id,
    resume_id: resume.id,
    jd_version_id: jd.id,
    scoring_config_id: config.id,
    input_snapshot_json: { fixture: true },
    input_fingerprint: sha256("input"),
    requested_by: user.id,
  };
  await tx("screening_runs").insert(run);
  await tx.raw("SET LOCAL ROLE rms_app");
  return {
    user,
    job,
    otherJob,
    jd,
    criterion,
    candidate,
    otherCandidate,
    resume,
    application,
    config,
    run,
  };
}
test("second migration is a no-op and there is no organization schema", async () => {
  const [, files] = await db.migrate.latest({
    directory: resolve("../../infra/migrations"),
    loadExtensions: [".cjs"],
  });
  assert.deepEqual(files, []);
  const tables = await db("information_schema.tables")
    .where({ table_schema: "public" })
    .pluck("table_name");
  assert.equal(
    tables.some((t) => /tenant|organization|membership/.test(t)),
    false,
  );
});
test("wrong-job active JD, run JD and wrong-candidate resume are rejected", async () =>
  rollback(async (tx) => {
    const f = await fixture(tx);
    await rejects(tx, "UPDATE jobs SET active_jd_version_id=? WHERE id=?", [
      f.jd.id,
      f.otherJob.id,
    ]);
    await rejects(
      tx,
      "INSERT INTO applications(job_id,candidate_id,resume_id,created_by) VALUES(?,?,?,?)",
      [f.job.id, f.otherCandidate.id, f.resume.id, f.user.id],
    );
    await rejects(tx, "UPDATE screening_runs SET job_id=? WHERE id=?", [
      f.otherJob.id,
      f.run.id,
    ]);
    await rejects(
      tx,
      "INSERT INTO screening_runs(application_id,job_id,resume_id,jd_version_id,scoring_config_id,input_snapshot_json,input_fingerprint,requested_by) VALUES(?,?,?,?,?,?::jsonb,?,?)",
      [
        f.application.id,
        f.otherJob.id,
        f.resume.id,
        f.jd.id,
        f.config.id,
        "{}",
        sha256("bad"),
        f.user.id,
      ],
    );
  }));
test("approved JD, criteria, config, upload identity and run inputs are frozen", async () =>
  rollback(async (tx) => {
    const f = await fixture(tx);
    for (const sql of [
      "UPDATE jd_versions SET title='tampered' WHERE id=?",
      "DELETE FROM jd_versions WHERE id=?",
    ])
      await rejects(tx, sql, [f.jd.id]);
    await rejects(tx, "UPDATE job_criteria SET weight=2 WHERE id=?", [
      f.criterion.id,
    ]);
    await rejects(tx, "DELETE FROM job_criteria WHERE id=?", [f.criterion.id]);
    await rejects(
      tx,
      "INSERT INTO job_criteria(jd_version_id,code,label,description,priority,weight,sort_order) VALUES(?,'extra','Extra','x','must_have',1,1)",
      [f.jd.id],
    );
    await rejects(tx, "UPDATE resumes SET file_sha256=? WHERE id=?", [
      sha256("tampered"),
      f.resume.id,
    ]);
    await rejects(
      tx,
      "UPDATE screening_configs SET effective_manifest_json='{}' WHERE id=?",
      [f.config.id],
    );
    await rejects(
      tx,
      "UPDATE screening_runs SET input_snapshot_json='{}' WHERE id=?",
      [f.run.id],
    );
  }));
test("approval rejects empty/zero/too-many criteria and nonfinite weights", async () =>
  rollback(async (tx) => {
    const f = await fixture(tx);
    const id = randomUUID();
    await tx("jd_versions").insert({
      id,
      job_id: f.job.id,
      version_no: 2,
      title: "Draft",
      summary: "",
      created_by: f.user.id,
      state: "pending_approval",
    });
    const approve =
      "UPDATE jd_versions SET state='approved',approved_by=?,approved_at=now(),content_sha256=? WHERE id=?";
    await rejects(tx, approve, [f.user.id, sha256("jd"), id]);
    for (const weight of ["NaN", "Infinity", "-1"])
      await rejects(
        tx,
        "INSERT INTO job_criteria(jd_version_id,code,label,description,priority,weight,sort_order) VALUES(?,'bad','Bad','','must_have',?::float8,0)",
        [id, weight],
      );
    await tx("job_criteria").insert({
      jd_version_id: id,
      code: "zero",
      label: "Zero",
      description: "",
      priority: "must_have",
      weight: 0,
      sort_order: 0,
    });
    await rejects(tx, approve, [f.user.id, sha256("jd"), id]);
    for (let i = 0; i < 8; i++)
      await tx("job_criteria").insert({
        jd_version_id: id,
        code: `c${i}`,
        label: "C",
        description: "",
        priority: "must_have",
        weight: 1,
        sort_order: i + 1,
      });
    await rejects(tx, approve, [f.user.id, sha256("jd"), id]);
  }));
test("completed results, criterion rows, human reviews and audit cannot be rewritten", async () =>
  rollback(async (tx) => {
    const f = await fixture(tx);
    await tx("screening_runs").where({ id: f.run.id }).update({
      status: "running",
      attempt_count: 1,
      attempt_token: randomUUID(),
    });
    const criterion = {
      id: randomUUID(),
      screening_run_id: f.run.id,
      criterion_id: f.criterion.id,
      criterion_code: "python",
      raw_assessment_json: {},
      validated_json: {},
      evidence_json: [],
      level: "unknown",
      status: "unknown",
      weight: 1,
      confidence: 0,
      reason: "Fixture",
      missing_information_json: [],
    };
    await tx("screening_criterion_results").insert(criterion);
    await tx("screening_runs")
      .where({ id: f.run.id })
      .update({
        status: "completed",
        result_json: { fixture: true },
        normalized_source_text: "Synthetic source",
        source_pages_json: [],
        normalized_text_sha256: sha256("Synthetic source"),
        score_state: "insufficient_coverage",
        coverage: 0,
        lower_bound: 0,
        upper_bound: 100,
        requires_manual_review: true,
        finished_at: new Date(),
      });
    await rejects(tx, "UPDATE screening_runs SET result_json='{}' WHERE id=?", [
      f.run.id,
    ]);
    await rejects(tx, "UPDATE screening_runs SET status='running' WHERE id=?", [
      f.run.id,
    ]);
    await rejects(
      tx,
      "UPDATE screening_criterion_results SET reason='tampered' WHERE id=?",
      [criterion.id],
    );
    await rejects(tx, "DELETE FROM screening_criterion_results WHERE id=?", [
      criterion.id,
    ]);
    await rejects(
      tx,
      "INSERT INTO screening_criterion_results SELECT * FROM screening_criterion_results WHERE id=?",
      [criterion.id],
    );
    const review = {
      id: randomUUID(),
      application_id: f.application.id,
      screening_run_id: f.run.id,
      reviewer_id: f.user.id,
      decision: "hold",
      note: "Human note",
    };
    await tx("human_reviews").insert(review);
    await rejects(tx, "UPDATE human_reviews SET note='changed' WHERE id=?", [
      review.id,
    ]);
    await rejects(tx, "DELETE FROM human_reviews WHERE id=?", [review.id]);
    const [event] = await tx("audit_events")
      .insert({
        actor_id: f.user.id,
        actor_type: "user",
        action: "test",
        resource_type: "job",
        resource_id: f.job.id,
        request_id: randomUUID(),
      })
      .returning("id");
    await rejects(tx, "UPDATE audit_events SET action='changed' WHERE id=?", [
      event.id,
    ]);
    await rejects(tx, "DELETE FROM audit_events WHERE id=?", [event.id]);
  }));
test("API boots and remains DB-ready when Redis and AI are down", async () => {
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  process.env.AI_BASE_URL = "http://127.0.0.1:1";
  const app = await createApiApp();
  await app.init();
  try {
    await request(app.getHttpServer()).get("/health/live").expect(200);
    const response = await request(app.getHttpServer())
      .get("/health/ready")
      .expect(200);
    assert.equal(response.body.database, "ok");
    assert.equal(response.body.redis, "degraded");
    assert.equal(response.body.ai, "degraded");
  } finally {
    await app.close();
  }
});

test("worker bootstrap does not require live AI or Redis", async () => {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: false,
  });
  await app.close();
});

test("baseline user seed is additive, idempotent and uses valid Argon2id hashes", async () =>
  rollback(async (tx) => {
    const ids = await seedBaselineUsers(tx, "synthetic-test-password");
    const first = await tx("users").where({ id: ids[0] }).first();
    assert.ok(first.password_hash.startsWith("$argon2id$"));
    assert.equal(
      await verify(first.password_hash, "synthetic-test-password"),
      true,
    );
    await seedBaselineUsers(tx, "different-test-password");
    const second = await tx("users").where({ id: ids[0] }).first();
    assert.equal(first.password_hash, second.password_hash);
    assert.equal((await tx("users").whereIn("id", ids)).length, 4);
  }));

test("application candidate identity cannot change underneath historical runs", async () =>
  rollback(async (tx) => {
    const f = await fixture(tx);
    const replacement = fixtureResume(f.otherCandidate.id, f.user.id);
    await tx("resumes").insert(replacement);
    await rejects(
      tx,
      "UPDATE applications SET candidate_id=?,resume_id=? WHERE id=?",
      [f.otherCandidate.id, replacement.id, f.application.id],
    );
  }));
