import { randomUUID } from "node:crypto";
import { setup as screeningSetup } from "../screenings/support";
import { ScreeningExecution } from "../../src/screenings/execution.service";
export async function setup() {
  const h = await screeningSetup();
  const { run } = await h.start();
  await h.app.get(ScreeningExecution).execute(run.id, "review-fixture");
  const completed = await h.db("screening_runs").where({ id: run.id }).first();
  // Additional persisted history for aggregate tests, never a live-provider claim.
  const addRun = async (
    application = h.application,
    status = "completed",
    overrides: Record<string, unknown> = {},
  ) => {
    const [{ n }] = await h
      .db("screening_runs")
      .where({ application_id: application.id })
      .max("generation as n");
    const [row] = await h
      .db("screening_runs")
      .insert({
        ...completed,
        attempt_history_json: JSON.stringify(completed.attempt_history_json),
        source_pages_json: JSON.stringify(completed.source_pages_json),
        id: randomUUID(),
        application_id: application.id,
        job_id: application.job_id,
        resume_id: application.resume_id,
        generation: Number(n ?? 0) + 1,
        status,
        created_at: new Date(),
        queued_at: new Date(),
        error_code: status === "failed" ? "provider_unavailable" : null,
        safe_error_detail: status === "failed" ? "Screening unavailable" : null,
        result_json: status === "completed" ? completed.result_json : null,
        ...overrides,
      })
      .returning("*");
    return row;
  };
  return { ...h, run: completed, addRun };
}
