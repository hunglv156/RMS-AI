# Delegation

Read this file only when deciding, classifying, assigning, or briefing delegated
work.

## Decide First

Keep bounded work in the current session when delegation adds no concrete
benefit. Delegate when independent analysis, a separate runtime owner,
parallelism, isolation, or independent review materially improves the result.
Once delegating, give every independent unit its own worker, as
`ORCA_ORCHESTRATOR.md` Execution Flow step 3 describes; one worker for several
independent units wastes the parallelism that justified delegation.

Classify ownership before creating state. Supervised work uses an Orca Run,
Task, and Dispatch. An explicit full ownership handoff uses the live `orca-cli`
flow, creates none of those records, and ends monitoring after delivery.
Every delegated prompt, including a full handoff, must include this exact line:

```text
You may use your provider's subagents inside this task, but never start or dispatch Orca workers.
```

Plan locally for bounded work when a separate worker adds no benefit.
When a direction needs independent analysis, use the read-only Decision
Maker. Its output is the chosen outcome and approach, rationale,
constraints, acceptance criteria, and unresolved questions. It may decide only
within Dylan's delegated authority; scope or product-intent changes return to
Dylan. It does not approve execution or replace the Chief.

Use the read-only Planner when cross-runtime decomposition, risk, or
independent planning warrants it. Supply accepted decisions from the Decision
Maker, Dylan, or another authorized decision maker. The Planner derives implementation steps, dependencies, paths, and
validation. If repository evidence contradicts a decision, return the evidence
and the decision that needs revision; do not silently change the outcome.
The Chief checks the plan against those decisions before execution.

For example: the decision requires exporting all filtered rows and no partial
file. The Planner traces cursor pagination and plans fetching every page before
CSV creation, including a failed-page check. If the API cannot enumerate all
rows, it returns that limitation for a decision instead of planning current-page
export. Existing accepted decisions skip a new Decision Maker dispatch.

When used, prepend the Planner role's `prompt_prefix` and send one bounded
contract:

```text
You are working directly for Dylan. Address your result to Dylan.

accepted_decisions: <exact decision text or readable artifact, with source and authority>
scope: <initial runtime or CROSS>
allowed_paths:
  - <exact directories or files>
forbidden_paths:
  - <explicit sibling runtimes or unrelated paths>
deliverable: One executable plan with independently ownable tracks, dependency
  order, per-track scope, paths, acceptance, validation, and risks.

Authority:
- Read-only. Do not edit files, start Orca workers, mutate task authority, or approve
  your own plan.
- You may use your provider's subagents inside this task, but never start or dispatch Orca workers.
- Do not recursively dispatch; return any delegation need to Dylan.
- Follow the injected dispatch preamble to send exactly one worker_done.
  Do not load `$orca-cli` or `$orchestration`, and do not probe Orca
  runtime availability.
```

## Context Research

The coordinator's context is the most expensive in the Run. When it needs
context whose location is unknown or spread across many files, repositories,
or BA documents, dispatch the read-only Researcher instead of searching itself.
Read directly only when the exact path is known and the read is small.

1. Write one question per Researcher; independent questions get separate
   Researchers started in one wave. Resolve placement with
   `roster.py resolve --intent research` and the launch with
   `route.py route --role researcher`.
2. Assign each a report path `.orca/context/<task_ref>.md` under the project
   root (git-ignored by the initializer).
3. Wait with the live guide's `check --wait`; do not search the same question
   while waiting. Each `worker_done` carries `--report-path`.
4. Read the context pack and continue the original work from it. Before an
   edit, decision, or acceptance rests on a fact, open its cited lines; the pack
   is evidence, not proof. Pass the pack path to later workers as
   `project_context` instead of restating it.
5. Ask a follow-up as a new Researcher with the gap and the previous pack path.

When used, prepend the Researcher role's `prompt_prefix` and send:

```text
You are working directly for Dylan. Address your result to Dylan.

task_ref: <child task id>
questions:
  - <exact question the coordinator needs answered>
purpose: <what the coordinator will do with the answer, so you know what matters>
search_scope:
  - <directories, repositories, or document sets to search>
forbidden_paths:
  - <paths not to read>
known_context: <facts or pack paths the coordinator already has; do not repeat them>
report_path: <absolute path to .orca/context/<task_ref>.md>

Authority:
- Read-only. Create or change no file except report_path; run no command that
  changes state.
- You may use your provider's subagents inside this task, but never start or dispatch Orca workers.
- Do not recursively dispatch; return any delegation need to Dylan.

Context pack (Markdown at report_path), written so the coordinator can act
without opening the sources:
1. Answer: a direct answer to each question.
2. Facts: one bullet per fact with its exact `path:line` (sheet/section for
   .docx/.xlsx); quote only the lines that matter, never whole files.
3. Relations: call, data, or document trace (REQ/Gap/FS codes) the answer
   depends on.
4. Gaps: what was searched and not found, conflicting sources, and unverified
   points marked `unknown`.
5. Sources: every file inspected, one line each on what it answered.

Protocol: Follow the injected dispatch preamble to send exactly one worker_done
with `--report-path <report_path>`; its body states the answer, confidence, and
main gap. Do not load `$orca-cli` or `$orchestration`, and do not probe Orca
runtime availability.
```

## Classify A Worker Task

Record:

- the complete `objective_scope`, one `write_scope` for an editing child, and
  any bounded `read_only_context`;
- the reason for delegation, plan completeness, unresolved questions, and the
  tool, model, effort, and Jev confidence `route.py` returned (or the Chief's
  own choice and reason on `needs_chief`);
- exact writable, read-only context, and forbidden paths;
- one deliverable, acceptance criteria, validation, and dependencies.

Describe the work remaining after accepted decisions and planning, then send
that contract to `route.py route --role executor`. Jev chooses the model from
the kind of work and the effort from how costly or hard to detect a mistake
would be; effort is carefulness, not a smarter model. State risk, acceptance
strictness, and plan completeness plainly in the contract, because that is all
Jev reads. Unknown behavior returns to decision/planning before execution. A
clear plan does not remove security or data-loss risk.

On `needs_chief`, choose from the returned candidates and record why. Never
substitute a cheaper candidate to fill capacity; `no_capacity` keeps the task
blocked. Quota is not capacity: a tool out of quota goes in `--exhausted`, as
in Quota Exhaustion in `agent-lifecycle.md`.

A large Task may span multiple or all nested repositories. Do not reduce its
scope to whichever worktree will host a worker. For execution, give each
editing child one `write_scope`; its active Dispatch later binds that write
owner to one concrete worktree. Add bounded `read_only_context` entries for
every sibling contract the child needs. Another repository that must change
gets its own editing child, as does every independent unit inside one
repository; a context-only repository gets none. Join dependent children with
explicit dependencies or an integration gate. `CROSS` is valid for the objective, read-only planning, and
synthesis; executor routing uses the child's `write_scope`.

Without external task authority, create Orca Tasks and use native dependencies
or gates when they add value. When Harness is authoritative, claim and map the
Harness story as described in `harness-integration.md`; do not duplicate its
dependency graph in Orca. Never create a Beads database merely as fallback.

## Resolve Placement

The roster returns an explicit repository anchor:

- `workspace_kind` and `workspace_root`: the existing Orca context to resolve;
- `cwd`, `allowed_paths`, and `forbidden_paths`: runtime mutation boundaries
  relative to the selected Git worktree. A bounded read-only context may point
  at an exact path in another checkout but does not widen write authority;
- `worktree_root`: the checkout used to discover the runtime's Git repository,
  or null for an unscoped role at a non-Git project root.

For `workspace_kind = "git"`, resolve `worktree_root` to the repository
identity, then follow `agent-lifecycle.md` to inventory its worktrees,
reconcile live Task/Dispatch ownership, and allocate one concrete worktree. A
worktree without proven ownership is not automatically available. For an
authorized new worktree, use the resolved repository identity and the live
guide's creation flow. For `folder-workspace`, exact-match `workspace_root`
from `worktree ps` and use its `folder:<id>` only for an existing read-only
role. Never pass `cwd` or a folder workspace as a Git worktree selector.

Orca injects the task and dispatch identifiers and the exact send command
the worker needs to report `worker_done`. Do not copy those IDs, restate
the command, or tell the worker to load `$orca-cli` or confirm Orca with
status.

## Visible Worker Brief

Select task-relevant knowledge from root/scoped `AGENTS.md` and their shared
sources. Pass exact paths, what each source answers, and relevant constraints;
do not send the entire Chief memory or assume workers inherit its context.
Resolve paths in the assigned checkout. Any source outside the writable repo
must be included in the bounded `read_only_context` with checkout and state.
Workers can read project knowledge without activating Chief or loading Orca.

The Orca Task spec contains only what the worker needs:

```text
You are working directly for Dylan. Address your result to Dylan.

task_ref: <human-facing parent or child task id>
objective_scope: <one or more of BE, FE, ENGINE, or exact domains>
write_scope: <one writable runtime, or NONE for read-only work>
working_directory: <writable runtime cwd, or aggregate folder for read-only work>
writable_paths:
  - <exact directory or file>
read_only_context:
  - scope: <BE | FE | ENGINE | exact domain>
    checkout: <exact absolute checkout path>
    state: <commit, accepted task result, or other known stable state>
    paths:
      - <smallest endpoint, schema, type, or document surface needed>
    question: <specific contract or data-flow question this context answers>
forbidden_paths:
  - <paths that must not be modified; no read unless listed as context>
deliverable: <one concrete question, artifact, or verified change>
project_context:
  - <exact root/scoped AGENTS.md path and task-relevant source paths, with purpose>
constraints: <applicable domain rules and unresolved facts; cite shared sources>
skills: <task-relevant skills available to this worker, or verified fallback>
validation: <runnable checks expected before reporting>

Authority:
- <read-only | edit exact paths | run exact validations>
- Do not commit, push, delete data, or expand scope unless Dylan authorized it.
- You may use your provider's subagents inside this task, but never start or dispatch Orca workers.
- Do not recursively dispatch; return the exact delegation need.

Protocol:
1. Read the nearest AGENTS.md and supplied task-relevant project_context before
   implementation exploration. Open linked sources explicitly when needed;
   do not assume instruction files in sibling directories are auto-loaded.
2. Write only inside the selected writable worktree and `writable_paths`.
   Read sibling repositories only through the declared `read_only_context`.
3. Never modify a context checkout. Ask a blocking question when another path,
   checkout, or contract surface is required.
4. Report cause and effect, context inspected, files changed, and validation evidence.
5. Follow the injected dispatch preamble to send exactly one worker_done
   with an explicit success or failure outcome and the complete modified-file
   list. Do not load `$orca-cli` or `$orchestration`. Do not probe Orca
   runtime availability. Run only the exact send command from that preamble.
   A sandbox or "orca unavailable" probe is not a result; if the preamble
   send fails, ask a blocking question with the exact error.
```

Example: an FE child can use `write_scope: FE` and receive the BE OpenAPI file
plus the relevant BE endpoint as `read_only_context`. It may implement the FE
client against that contract, but it may not fix the BE endpoint. If BE must
change, the Chief creates a BE editing child and makes FE consume the settled
contract.

Keep route selection, capacity, external CAS state, dependency bookkeeping, and
acceptance authority in coordinator context. A worker completion triggers
verification; it is not acceptance.
