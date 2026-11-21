# Parallel Workers

Read this file only for multiple workers, concurrent writers, worktree isolation, or integration across branches and nested repositories.

## Choose Isolation

- Use one checkout for one writer.
- Multiple workers may share the active worktree only when all are read-only.
- Give concurrent writers in the same Git repository separate worktrees.
- Give independently owned nested Git repositories separate workspaces rooted at their actual repository paths.

Do not assume a monorepo parent owns nested repositories. Never let two workers edit the same symbol, file, or checkout concurrently.
The exception is a non-Git document folder; see Shared Document Folder below.

## Shared Document Folder

A non-Git documentation folder, such as an SVN checkout of project documents,
has no worktrees, and copies would hide the cross-references its documents
need. Writers there share that one folder workspace:

- Place every worker in the folder's exact `folder:<id>` from
  `<ORCA> worktree ps --json`. Never create a Git repository or worktree to
  isolate documents. Skip `roster.py select`, which places only Git runtimes;
  get the launch selection from `route.py route --role executor`.
- Isolate by write set: each Task lists the exact files it may write. Never run
  two Tasks whose write sets overlap; `.docx` and `.xlsx` cannot be merged.
- Shared index files (instructions, changelogs, status tables, generated
  indexes) belong to the Chief or to one serialized Task after the wave.
- A consumer starts only after its producer Task is accepted, so no worker
  reads a half-written source.

A domain extension may define stage contracts for its documents on top of these rules.

A large Task may span every nested repository. Keep it with the Chief in the
parent folder workspace, then create editing children only for repositories
that must change, one per independent unit inside each. Each child has one writable repository and worktree, but may
read bounded context from exact checkouts in the other repositories. A context
repository does not require its own editing child. There is no aggregate Git
worktree for the parent folder.

Do not let a consumer read a producer's moving worktree. For example, if BE is
changing an API schema needed by FE, either accept the contract first or make
the FE child depend on the BE child and give FE the settled BE checkout. If FE
reads while BE is half-written, the FE implementation can be correct against a
state that never actually exists.

Create a new worktree only when a concrete checkout or filesystem conflict makes sharing unsafe, or when Dylan asked for one. Convenience or a preference for separate checkouts is not an isolation requirement; two concurrent editing children in one repository are. State the conflict before creating one. Use child lineage for work stacked under the active worktree, and top-level for independent work. Decide the Git base separately from the lineage.

For every new worktree, let the repository's configured setup hook run unless a concrete task-specific reason says otherwise, and state that reason first.
Use `native-features.md` for shared paths and setup readiness; running a hook
does not by itself prove a test environment is ready.

## Fan Out, Then Wait Once

Sequential start-and-wait serializes wall-clock on the slowest ordering. The correct shape is:

1. Create every independent Orca Task.
2. Start every independent worker.
3. Wait once on the coordinator inbox for completion, escalation, and question events.
4. Process each Delivery in full, settle each finished worker's terminal, acknowledge, start the next queued Task if capacity was short, then keep waiting until every expected Dispatch settles.

In Harness protocol mode, read one consistent work graph and use its runnable
fields to identify dependency-ready stories, then CAS-claim each story once.
Otherwise use Orca's native Task dependencies. Parallelize only tracks whose
contracts and write sets are independent.

Keep dependency chains shallow. If the accepted plan produces a chain deeper than three or four steps, re-cut the tracks instead of dispatching a long serial pipeline.

Use `agent-lifecycle.md` to resolve each runtime's repository anchor,
inventory every worktree for that repository, and reconcile active
Task/Dispatch bindings before fan-out. When an authorized new worktree is
required, create it from the resolved repository identity. A nested repository
launches from its own Git root. Never use the Chief control directory or
runtime `cwd` as a selector. The roster's worktree-relative brief paths keep a
new worktree from pointing back to the source checkout.

Record the intended write repository, writable placement, and exact read-only
context before dispatching. After a ready start, use its receipt to record
the actual Task, Dispatch attempt, branch, writable worktree, terminal, worker,
writable paths, context checkouts and paths, and expected deliverable.

## Broadcast Sparingly

Group addresses exist for messages genuinely useful to many terminals, such as a status broadcast or an intentional fan-out question. Never send dispatch lifecycle messages to a group: a completion or heartbeat belongs to exactly one Dispatch.

## Integrate Deliberately

The Orchestrator owns integration:

1. Wait for each worker to settle and capture its result.
2. Inspect every worktree's Git status and diff.
3. Verify scope and acceptance inside each worktree.
4. Reconcile dependencies and conflicts in dependency order.
5. Assemble the selected changes into one coherent filesystem state.
6. Re-run combined validation there. Separate successful repo tests do not prove
   the cross-repository contract.

Worker completion does not authorize merge, rebase, cherry-pick, force-push, or publication. Perform those actions only when Dylan's request explicitly includes them.

Before removing a worktree, confirm it contains no unpreserved changes. Never force removal without Dylan's explicit authorization.
