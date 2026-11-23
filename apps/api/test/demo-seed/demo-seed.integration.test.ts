import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import knex from "knex";
import { testDatabase } from "../auth/setup";
/** A fresh disposable rms_ai_test_demo_seed database per run, so the shared test DB's history cannot mask seed changes. */
async function freshDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.pathname = "/rms_ai_test_demo_seed";
  const target = url.toString();
  url.pathname = "/postgres";
  const admin = knex({ client: "pg", connection: url.toString() });
  try {
    await admin.raw(
      "DROP DATABASE IF EXISTS rms_ai_test_demo_seed WITH (FORCE)",
    );
  } finally {
    await admin.destroy();
  }
  process.env.TEST_DATABASE_URL = target;
  return testDatabase();
}
import { seedBaselineUsers } from "../../src/db/seeds/baseline-users";
import { seedDemo, demoIds } from "../../src/db/seeds/demo";
import { hash } from "../../src/screenings/validation";
test("demo seed is repeatable, preserves decisions/passwords and pins exact synthetic PDF/source/evidence", async () => {
  const db = await freshDatabase(),
    root = await realpath(process.env.FILE_STORAGE_ROOT!);
  try {
    await seedBaselineUsers(db, "Synthetic-seed-test-2026");
    await seedDemo(db, root);
    const before = await db("screening_runs")
      .where({ job_id: demoIds.job })
      .orderBy("id");
    const reviews = await db("human_reviews").where({
      application_id: demoIds.application,
    });
    const account = await db("users")
      .where({ normalized_email: "admin@demo.example" })
      .first();
    await seedBaselineUsers(db, "Different-password-never-overwrites");
    await seedDemo(db, root);
    assert.deepEqual(
      await db("screening_runs").where({ job_id: demoIds.job }).orderBy("id"),
      before,
    );
    assert.deepEqual(
      await db("human_reviews").where({ application_id: demoIds.application }),
      reviews,
    );
    assert.equal(
      (await db("users").where({ id: account.id }).first()).password_hash,
      account.password_hash,
    );
    assert.equal(before.length, 4);
    const states = before
      .filter((r) => r.status === "completed")
      .map((r) => [
        r.result_json.screening.total.score_state,
        r.result_json.screening.total.requires_manual_review,
      ]);
    assert.deepEqual(states.map(String).sort(), [
      "insufficient_coverage,true",
      "scored,false",
      "scored,true",
    ]);
    assert.equal(before.filter((r) => r.status === "failed").length, 1);
    const hr = await db("jd_versions").where({ id: demoIds.hrJd }).first();
    assert.equal(hr.state, "draft");
    assert.equal(
      (await db("applications").where({ job_id: demoIds.hrJob })).length,
      2,
    );
    assert.equal(
      (await db("screening_runs").where({ job_id: demoIds.hrJob })).length,
      0,
    );
    for (const run of before) {
      const resume = await db("resumes").where({ id: run.resume_id }).first();
      const bytes = await readFile(join(root, resume.storage_key));
      assert.equal(hash(bytes), resume.file_sha256);
      assert.ok(bytes.toString().startsWith("%PDF-1.4"));
      if (run.status !== "completed") continue;
      const result = run.result_json;
      assert.equal(result.manifest.mode, "deterministic");
      assert.equal(
        hash(result.source.text),
        result.source.normalized_text_sha256,
      );
      assert.equal(
        result.screening.versions.cv_sha256,
        result.source.normalized_text_sha256,
      );
      assert.equal(run.normalized_source_text, result.source.text);
      if (result.screening.total.score_state === "insufficient_coverage")
        assert.equal(result.screening.total.observed_score, null);
      for (const c of result.screening.criteria)
        for (const e of c.evidence) {
          assert.equal(
            Array.from(result.source.text)
              .slice(e.verification.start_offset, e.verification.end_offset)
              .join(""),
            e.evidence.quote,
          );
        }
    }
  } finally {
    await db.destroy();
  }
});
