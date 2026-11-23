import type { Knex } from "knex";
/** Select only the public actor identity, never a user row or its credentials. */
export function actorJoin(q: Knex.QueryBuilder, column: string, field: string) {
  const alias = `display_${field}`;
  return q
    .leftJoin(`users as ${alias}`, `${alias}.id`, column)
    .select(
      q.client.raw(
        `CASE WHEN ??.id IS NULL THEN NULL ELSE jsonb_build_object('id', ??.id, 'display_name', ??.display_name) END as ??`,
        [alias, alias, alias, field],
      ),
    );
}
export function applicationNames(q: Knex.QueryBuilder) {
  return q
    .join(
      "candidates as display_candidate",
      "display_candidate.id",
      "applications.candidate_id",
    )
    .select(
      "applications.*",
      "display_candidate.display_name as candidate_display_name",
    );
}
export function runNames(q: Knex.QueryBuilder, columns: string[]) {
  return actorJoin(
    q
      .join(
        "applications as display_application",
        "display_application.id",
        "screening_runs.application_id",
      )
      .join(
        "candidates as display_candidate",
        "display_candidate.id",
        "display_application.candidate_id",
      )
      .select(
        ...columns.map((c) => `screening_runs.${c}`),
        "display_candidate.display_name as candidate_display_name",
      ),
    "screening_runs.requested_by",
    "requested_by_actor",
  );
}
