# Orca Orchestrator

Read this project core completely before an Orca orchestration task. Honor the
nearest `AGENTS.md`, repository boundaries, and project safety rules first.

## Authority And Ownership

Act on Dylan's behalf without inventing approval. Workers receive a bounded
brief written as Dylan and return results addressed to Dylan.
Current user and repository delegation rules take precedence; this bundle
does not authorize migrating another orchestration system.

Orca owns the current coordinator, worktree identities, Runs, Tasks,
Dispatches, terminals, mail, dependencies, and gates. Project files own only
policy Orca cannot infer: read-only roles, runtime path boundaries, external
task authority, and acceptance. Tools, models, effort, and capacity come from
the global tool catalog, where Jev chooses them per task.

The roster's `worktree_root` is a repository anchor, not a Task assignment.
For editing work, the live ownership chain is `Task -> Dispatch attempt ->
concrete Orca worktree -> terminal`. Keep that chain in Orca state and start
receipts; never duplicate it in project files.

This control plane is for supervised work. An explicit full ownership handoff
uses the live `orca-cli` flow, creates no Run, Task, or Dispatch for the
handoff, and is not monitored after delivery.

Resolve one executable for the session (`ORCA_CLI_COMMAND`, `orca-dev` under
`ORCA_DEV_REPO_ROOT`, `orca-ide` on Linux, otherwise `orca`) and stop on its
exact error. Never use bare `orca` outside an Orca terminal on Linux because it
usually resolves to the GNOME Orca screen reader. Load the version-matched
command guides before any Orca command:

```text
<ORCA> skills get orchestration
<ORCA> skills get orca-cli
```

Do not cache or restate Orca's command surface here.

## Coordinator

The explicitly activated Chief is the current Orca coordinator. Read
`.orca/control/AGENTS.md` explicitly but remain in the current project
workspace. It may be a non-Git folder workspace containing nested repositories.
Never launch the Chief as a worker, route `orchestrate` through
`.orca/agents.toml`, or use `.orca/control/` as a worktree selector.

The Chief owns live worktree inventory, allocation, and reconciliation for
every configured nested repository. Filesystem nesting and Orca sidebar lineage
do not prove ownership. A worktree with no proven Dispatch binding remains
user-owned or unknown and is not automatically available.

At the start of each supervised Run, inventory every configured Git repository
and reconcile its worktrees against visible Task and Dispatch assignments
across the Orca runtime, not only that Run. Refresh the targeted repository
before every editing start or recovery.

Create or bind exactly one Run for the current supervised objective before
dispatch. Never reset orchestration while another coordinator is active; reset
is runtime-global.

## Task State

- If the repository declares Harness authoritative, Harness owns stories,
  dependencies, CAS state, and verification. Orca Tasks hold the bounded worker
  work; do not duplicate the Harness graph or status in them.
- Without declared external authority, use Orca's native Tasks, dependencies,
  and gates. Do not introduce Beads as an automatic fallback.
- A valid `worker_done` settles its Orca Task and Dispatch. It is the worker's
  result, not independent acceptance. Only the Orchestrator completes selected
  external task authority after verification.

## Decision And Planning Roles

The read-only Decision Maker and Planner take their tools from the catalog
roles of the same name. The Decision Maker chooses an
approach within delegated authority; the Planner turns supplied accepted
decisions into executable steps without changing their scope or constraints.
Existing decisions from Dylan or another authorized decision maker are valid
inputs and do not require another Decision Maker dispatch. Return decision conflicts
for resolution. The Chief retains coordination and acceptance.
Read `orca-orchestrator/delegation.md` for the bounded handoff contract.

## Execution Flow

1. Classify only the required runtime scope, paths, deliverable, risk, and
   validation. When that needs context spread across code or project
   documents, gather it through Researchers and wait for their context packs
   instead of searching yourself (`orca-orchestrator/delegation.md`).
2. Plan locally when the work is bounded. Start a read-only Planner only when
   ambiguity, cross-runtime decomposition, risk, or independent analysis makes
   delegation useful.
3. Preserve the whole objective scope, then split it into one editing child
   per independent unit: a feature, module, document, or repository whose
   write set does not overlap another child's and whose inputs do not wait on
   another child's unfinished output. Each child has one `write_scope` and any
   bounded `read_only_context` it needs. Never give one worker several
   independent units because they share a source, folder, or repository; join
   dependent children with dependencies or an integration gate. In Harness
   mode, claim the matching runnable story before allocating execution
   resources.

   Example: splitting a 56-page FS that covers five features is five
   executor workers. Each reads the same source and writes only its
   feature's new files; the shared overview, index, and cross-references stay
   with the Chief or one child after the wave.
4. Place the child by its write scope with `roster.py select`, then get its
   launch selection from `route.py route --role executor` with the accepted
   contract. The roster returns logical paths and repository anchors, never the
   Task's live writable worktree or its context checkout. A non-Git shared
   document folder has no roster scope; place it per `parallel-workers.md`.
5. Resolve the anchor to the live repository identity. Inventory that
   repository's worktrees and reconcile active or retained Task/Dispatch
   bindings before choosing placement. Do not infer availability from branch,
   name, nesting, or absence of a current-Run binding.
6. Select one exact safe writable worktree or create an authorized one when Dylan
   requested it or a concrete write conflict requires isolation. Start the
   worker there. A ready start receipt is the actual
   Task/Dispatch/writable-worktree/terminal binding; write acceptance is not
   readiness. An unknown start keeps the Dispatch — inspect it, do not
   relaunch. Resolve every context
   repository to an exact checkout, state, path set, and question; pass it as
   read-only context, never as another write allocation. On recovery, inspect
   the Dispatch rather than falling back to the roster anchor.
7. Start every independent worker before waiting. When capacity is short,
   start what fits and start the next queued child as each worker settles;
   never merge children to fit capacity.
8. Wait on Dispatch events, process each Delivery completely, settle finished
   workers, acknowledge, and continue until all expected Dispatches settle.
9. Every editing child gets a Reviewer before acceptance; never skip it or
   substitute your own review. After the executor settles, start the Reviewer
   read-only on that child's settled worktree or document files, placed with
   `roster.py resolve --intent review` and launched from `route.py route
   --role reviewer`. Its brief carries the accepted contract and the exact
   diff or file list. Send blocking findings to a fresh executor follow-up,
   then review again. A Reviewer that cannot start blocks only that child's
   acceptance.
10. Verify actual files, scope, and runnable proof. Drive required browser
   acceptance yourself through Orca's built-in browser.
11. Complete external task authority only after verification. Completion does
    not authorize commit, push, merge, deploy, deletion, or publication.

Read-only explanation, inspection, status, or browser-check-only requests do
not start a Planner or executor; they may use Researchers for broad context. A plan-only request may use the configured
Planner and stops before implementation dispatch.

## Progressive Disclosure

| Trigger | Read next |
| --- | --- |
| Initialize or change `.orca/agents.toml` | Global `$orca-orchestrator` configuration references |
| Harness owns task state or proof | `orca-orchestrator/harness-integration.md` |
| Decide whether or how to delegate; gather context through Researchers; compose a brief | `orca-orchestrator/delegation.md` |
| Inventory or allocate worktrees; start, supervise, settle, or recover a worker | `orca-orchestrator/agent-lifecycle.md` |
| Multiple workers, worktree isolation, or a non-Git shared document folder | `orca-orchestrator/parallel-workers.md` |
| Accept output, validate, or cross a Git/publish boundary | `orca-orchestrator/verification-and-safety.md` |
| Setup worktrees, place remote work, check account readiness, search sessions, use review/CI or browser profiles, show progress, schedule work, or retain sessions | Relevant section of `orca-orchestrator/native-features.md` |

Load every row that genuinely applies and no others.

## Worker Policy

Validate version-5 `.orca/agents.toml`, place the worker, ask
`route.py` for its launch selection, then resolve the placement through
Orca:

```bash
python3 <orca-skill>/scripts/roster.py validate .orca/agents.toml --require-commands
python3 <orca-skill>/scripts/roster.py select .orca/agents.toml --scope BE
python3 <orca-skill>/scripts/route.py route --role executor --contract task.json --busy codex
```

```text
<ORCA> worktree show --worktree path:<git-worktree-root> --json
<ORCA> worktree ps --json  # exact-match a non-Git folder workspace by path
```

For a Git runtime, treat the resolved checkout as a repository anchor. Inventory
that repository, reconcile live Dispatch bindings, then choose the exact full
worktree ID or create an authorized worktree from its repository identity. For
a read-only folder role, use the exact `folder:<id>`. Build worker briefs from
the selected worktree-relative `cwd`, allowed paths, and forbidden paths.
Follow the installed skill's `references/jev-routing.md` to prefer native
launch when it preserves the complete selection and role arguments; otherwise
launch the exact returned command with supervised terminal adoption.
On `needs_chief`, choose from the returned candidates and
build the command with `route.py command`. Effort is carefulness, not a smarter
model. Record the chosen tool, model, effort, and Jev confidence in the Task,
and verify effective model/effort before assigning work. Do not reuse a settled
conversation for the next Task unless Dylan asked; start a fresh agent session
instead.
Derive busy `tool/model` entries from live Orca Dispatch state. Unresolved
repositories, unknown worktree ownership, conflicts, or exhausted capacity fail
closed.
Capacity is a session count, not quota; a tool out of quota is routed around
with `--exhausted`, never waited on (`agent-lifecycle.md`, Quota Exhaustion).
Check account and execution-host
readiness through `orca-orchestrator/native-features.md` before placement.

## Boundaries

- One worker owns one bounded execution Task and declared scope.
- A large Task may span all nested repositories. Each editing child has one
  writable repository and may carry bounded read-only context from the rest.
- Each active editing Dispatch binds to one concrete writable worktree; retries
  may choose another. Context worktrees do not become owned or writable.
- A parent folder is the Chief's control context, never an aggregate Git
  worktree.
- Only the current Orchestrator starts supervised workers.
- The Chief never uses provider-native subagents, custom agents, agent teams,
  or background agents; Claude subagent activity or Codex background tasks in
  the Chief's own session are a violation. Workers may use their provider's
  subagents inside their task but never dispatch Orca workers.
- The Reviewer is a mandatory read-only phase for every editing child. The
  Decision Maker, Planner, Researcher, and Tester are optional read-only
  workers, not mandatory phases.
- Never let concurrent writers share a Git checkout or an overlapping write set.
  Writers in a non-Git document folder share it only under `parallel-workers.md`.
- Worker output and lifecycle state are evidence, not acceptance.
- Do not claim cross-repository integration until the selected changes coexist
  in the filesystem state that was actually tested.
- Ask Dylan before expanding authority, changing product behavior, deleting
  data, publishing, or choosing between materially different outcomes.

Resolve `review` and `test` from the project roster for placement and from the
catalog for the launch command; single-candidate catalog roles skip Jev, and a
role's fixed effort applies to every candidate. Tester
executes agreed checks without editing source, reports PASS/FAIL with commands
and evidence, and returns required fixes to the executor. Do not substitute
models.

Writing documents is ordinary editing work: an executor worker routed with
`route.py route --role executor`, like code. Its task names exact writable
document files and read-only sources; in a Git repository place it with
`roster.py select`, in a non-Git document folder per `parallel-workers.md`.
Do not claim unverified behavior in documentation.
