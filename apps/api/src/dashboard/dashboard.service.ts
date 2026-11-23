import { Inject, Injectable } from "@nestjs/common";
import { applicationNames, runNames } from "../common/display";
import { Database } from "../db/database";
import { JobAuthorization } from "../auth/authorization.service";
import type { Actor } from "../common/interfaces";
import { summaryColumns } from "../screenings/screenings.service";
@Injectable()
export class DashboardService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(JobAuthorization) private readonly policy: JobAuthorization,
  ) {}
  async get(actor: Actor) {
    this.policy.assertAction(actor, "dashboard.read");
    return this.db.transaction(async (tx) => {
      // All counts and bounded lists describe one persisted snapshot.
      await tx.raw(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY",
      );
      const jobs = tx("jobs").select("id");
      if (actor.role === "reviewer")
        jobs.whereIn(
          "id",
          tx("job_assignments").select("job_id").where("user_id", actor.id),
        );
      const applications = tx("applications").whereIn("job_id", jobs.clone());
      // One latest run per application, independent of historical retry volume.
      const latest = tx("screening_runs")
        .distinctOn("application_id")
        .select("application_id", "id", "status", "created_at")
        .whereIn("job_id", jobs.clone())
        .orderBy("application_id")
        .orderBy("created_at", "desc")
        .orderBy("generation", "desc")
        .orderBy("id", "desc");
      const actionable = tx
        .from(latest.as("latest"))
        .join("applications as a", "a.id", "latest.application_id")
        .leftJoin(
          "human_reviews as review",
          "review.id",
          "a.current_review_id",
        );
      const pending = actionable
        .clone()
        .where("latest.status", "completed")
        .whereRaw("review.screening_run_id IS DISTINCT FROM latest.id");
      const failures = actionable.clone().where("latest.status", "failed");
      const open = await tx("jobs")
        .whereIn("id", jobs.clone())
        .where("status", "open")
        .count("* as total")
        .first();
      const decisions = await applications
        .clone()
        .leftJoin(
          "human_reviews as review",
          "review.id",
          "applications.current_review_id",
        )
        .select(
          tx.raw(
            "count(*) as applications, count(*) filter (where review.decision = 'shortlist') as shortlist, count(*) filter (where review.decision = 'reject') as reject, count(*) filter (where review.decision = 'hold') as hold",
          ),
        )
        .first();
      const pendingCount = await pending.clone().count("* as total").first();
      const failureCount = await failures.clone().count("* as total").first();
      const runs = (query: typeof pending) =>
        runNames(
          tx("screening_runs").whereIn(
            "screening_runs.id",
            query.select("latest.id"),
          ),
          summaryColumns,
        )
          .orderBy("screening_runs.created_at", "desc")
          .orderBy("screening_runs.id", "desc")
          .limit(10);
      return {
        counts: {
          jobs_open: Number(open?.total),
          applications: Number(decisions?.applications),
          awaiting_review: Number(pendingCount?.total),
          shortlist: Number(decisions?.shortlist),
          reject: Number(decisions?.reject),
          hold: Number(decisions?.hold),
          screening_failures: Number(failureCount?.total),
        },
        recent_applications: await applicationNames(applications.clone())
          .orderBy("applications.created_at", "desc")
          .orderBy("applications.id", "desc")
          .limit(10),
        latest_failures: await runs(failures),
        pending_reviews: await runs(pending),
      };
    });
  }
}
