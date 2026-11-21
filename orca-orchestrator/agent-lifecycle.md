# Worker Lifecycle

Read this file only when starting, supervising, questioning, unblocking, settling, or recovering a worker.

Orca's version-matched orchestration guide owns the command surface. Load it before running anything:

```text
<ORCA> skills get orchestration
```

This file owns only the project rules that guide does not know about.

## Inventory And Allocation

The Chief owns live placement for every configured nested Git repository. Do
not keep a second worktree registry in project files. At the start of a
supervised Run, inventory every configured repository. Before an editing start
or recovery, refresh the targeted repository:

1. Resolve the runtime's roster `worktree_root` as a repository anchor and
   obtain its live repository identity.
2. Inventory every Orca worktree for that repository.
3. Reconcile each worktree against live Tasks, Dispatch attempts, workers, and
   terminals across the Orca runtime, not only the current Run. The
   authoritative write relation is `execution Task -> Dispatch -> writable
   worktree ID -> terminal`.
4. Treat a worktree with no proven Dispatch binding as user-owned or unknown,
   not automatically available. Inspect its Git state and known owner before
   selecting it.
5. Choose one exact safe writable worktree, or create an authorized one when
   Dylan asked for it or a concrete checkout conflict requires isolation.
6. Resolve every `read_only_context` scope through its repository anchor. Pin
   an exact checkout, known state, smallest path set, and contract question.
   Referencing it does not allocate it to this Task or make it writable. When a
   producer is still editing that context, wait for its dependency or use an
   already accepted contract instead of reading a moving target.
7. Snapshot the writable worktree and every context checkout before start so
   verification can distinguish the worker's edits from prior user work.
8. After a ready start, replace intended write placement with that receipt's
   actual Dispatch, full worktree ID, and terminal. A retry is a new Dispatch
   attempt and may use another worktree.

Never infer ownership from filesystem nesting, branch name, display name,
sidebar lineage, structured-session status, terminal activity, or a roster
anchor. Fail closed on an unregistered repository, unknown ownership,
conflicting writer, or Task/repository mismatch. Concurrent editing
Dispatches never share a worktree; read-only workers may share only when
project policy permits it.

## Start

Resolve the role or executor placement first. A scoped executor returns
`workspace_kind = "git"`, an absolute `worktree_root`, and paths relative to
that root. Resolve it with `worktree show` as the repository anchor, then run
the inventory and allocation rules above. An unscoped read-only role may return
`folder-workspace`; exact-match its `workspace_root` from `worktree ps` and
use the returned `folder:<id>` only as an existing workspace. Never call
`worktree show` for that folder or create a Git worktree from it.

Create a new runtime worktree only when Dylan requested one or a concrete
conflict requires it; use the scoped runtime's repository identity and the live
guide's new-worktree flow. The same relative brief paths work in either Git
checkout. Never pass a runtime subdirectory or `.orca/control/` as a selector.

Before any start, take the launch selection from `<orca-skill>/scripts/route.py`
(`route`, or `command` for the Chief's own choice). Follow the installed skill's
`references/jev-routing.md` to choose native launch or an exact custom command
without losing model, effort, or role arguments. Do not use
bare `codex` or replace an explicit choice with defaults. Missing catalog entries
return to Dylan's catalog. Do not reuse a settled conversation for the next
Task. Start a fresh agent session in
the chosen worktree. Reuse an existing terminal only when Dylan explicitly
asked to continue that conversation; then verify the existing session's
effective model/effort matches the requested command, because a new brief does
not change its settings. Report unknown or mismatched values before assigning
work. Use session metadata or visible session settings when a terminal receipt
does not expose them.

Prefer native `worker-start` when the full launch contract is equivalent.
Otherwise create the terminal with the exact returned command, wait for
readiness, then acquire lifecycle ownership through `worker-start --terminal`
as specified by the live guide. Low-level `dispatch --inject` leaves the
process unsupervised and is not equivalent. Confirm effective model and effort;
report a mismatch instead of accepting a substitution. Never use `claude --agent`.
Start Antigravity only natively (`--agent antigravity --model`, plus `--effort`
when routed; agy's Claude models take none): Orca cannot adopt a custom `agy`
terminal.

For new worktrees, account readiness, or remote placement, load the relevant
section of `native-features.md` before starting. Setup still running is not
proof the environment is ready for validation.

Workers may use their provider's subagents inside their task, so add no
subagent lock to a launch command or to the checkout.

Read the start receipt before continuing. Write acceptance is not readiness:
a ready receipt means an observed worker turn started, a permission prompt
rendered, or the provider exposes no turn-start signal. A failed or unknown
start exits nonzero. Inspect its stage, effects, residual resources, and any
named next action instead of guessing or automatically retrying.

An unknown start keeps the Dispatch, terminal, and capability. Do not
relaunch and do not tear those resources down; a later report from that
Dispatch is valid if the worker recovers. A start that failed before the
agent was ready still owns the terminal it created; release it through the
live recovery path, never a blanket terminal close. Newly created agent
terminals report created, including on an agent-first new worktree; do not
treat that as reuse.

Orchestration owns a newly created worker terminal from creation, not after
boot. A user keystroke during boot, including accepted mobile input, is
takeover: that pane is user-owned. Do not later release it. Capability and
mailbox still wait until the agent is up.

The worker may be a structured native-chat session with no PTY. Model,
effort, and new-worktree no longer force a PTY fallback. Missing visible
TUI is not a failed or idle start. `worktree ps` and the sidebar now share
structured-session status; still do not infer ownership from display.

A ready receipt establishes the live
Task/Dispatch/writable-worktree/terminal binding. Read-only context remains a
separate Task-contract reference. For later supervision or recovery, inspect
that Dispatch; never re-resolve the roster anchor and assume the worker stayed
there.

In Harness protocol mode, claim the story before creating any execution
resource. If any child start fails, reconcile every execution child, Dispatch,
and participating worktree for the story before changing Harness state. Keep
the story `in_progress` while any child is active or unresolved. Only when no
execution resource remains active or unknown may the Orchestrator CAS-release
the whole story: use `planned` when every attempt is clean and no edits remain,
or `changed` when any preserved edits remain. Never release a whole story from
one child's state, and never infer task status from a terminal's state.

Name the worker from the task reference and attempt, for example
`hr109-codex-a1`. Orca's Dispatch record and worktree ID remain authoritative.

## Supervise Without Polling

Do not poll worker state. Start every independent worker first, then wait on events:

```text
check --wait --types worker_done,escalation,question --timeout-ms <n>
```

Set `--timeout-ms` below this host's own command timeout, then use rolling waits. A window that exceeds the host timeout is cut off before the Delivery arrives.

Workers report `worker_done` through the injected dispatch preamble. Do not
instruct them to load `$orca-cli` or to confirm the runtime with status;
those probes fail inside executor sandboxes and are not results.

Interpretation rules, in order of how often they are got wrong:

- A wait timeout or an empty result is a **checkpoint, not a failure**. Real coding tasks routinely run 15-60 minutes.
- Heartbeats and visible terminal activity mean the worker is alive, not that it is done.
- Never stop, close, kill, or restart a worker merely because no completion message has arrived yet.
- Process completion, escalation, or question events as they arrive. Leave a
  liveness wait for recovery only on positive evidence accepted by the live
  guide, or Dylan's instruction to stop. A disappeared terminal, missing PTY,
  or disconnected host is not proof the agent exited.
- Do not merge stderr into stdout when parsing. The wait prints keepalive lines to stderr and exactly one JSON document to stdout; merging them breaks the parser.

Read worker output only when you actually need its content, and read incrementally by cursor rather than re-reading the same tail. Prefer the proven agent transcript over raw terminal output; if the source changes, start a fresh read instead of reusing the old cursor.

After repeated empty waits, follow the live orchestration guide's fleet
inspection: scope `worker-list` to the Run, include remote observations when
needed, and follow pagination. Inspect `projection.liveness`, attention, and
the literal `nextAction`; a missing action grants no permission to mutate.
Use the guide to resolve conflicting observations from the execution host.
`unverifiable` means keep waiting or inspect, never infer death from silence.
Use bounded `worker-read` output rather than dumping terminal screens.

## Quota Exhaustion

Provider quota runs out mid-task, Codex most often. A worker stopped by quota
cannot report, and waiting for the reset blocks the Task for hours or days, so
the Chief notices it and moves the Task on:

- **Detect.** While a Codex worker runs, or any tool whose quota already ran
  out in this Run, read its bounded transcript tail after every empty wait
  instead of after three. A final agent turn that is a provider usage-limit
  error (Codex prints `You've hit your usage limit` and when to try again)
  and sent no `worker_done` is the positive stop proof the live guide accepts.
  A rate limit the CLI is still retrying by itself is not; keep waiting.
- **Settle.** `worker-stop` that Dispatch through the live recovery guide.
  Keep its output and worktree edits. Record in the Task the tool or account
  prefix that ran out and the reset time it printed.
- **Continue now.** Route again with `--exhausted <tool or prefix>`, reconcile
  the worktree as usual, and start the replacement as `--retry-of` that
  Dispatch in the same worktree. The brief names the preserved edits (the diff
  from the pre-start snapshot) and tells the fresh session to verify them
  before finishing the Task; the stopped attempt's partial work is not
  accepted work.
- **Remember it.** Pass every recorded entry as `--exhausted` on each later
  route in the Run until its reset time passes. Never launch an exhausted tool
  to rediscover the limit. One account behind several tools needs each
  prefix, for example `codex` plus an `omp/...` proxy billed to the same
  account.
- **All candidates out** (`route.py` exit 4): block only that Task with the
  reset time, keep every independent Task running, and ask Dylan once whether
  to wait or add a catalog candidate. Never switch accounts, spend reset
  credits, or launch a tool outside the role's candidates on your own.

The role's other candidates are alternatives Dylan already authorized in the
catalog, so routing around quota is not a substitution.

## Questions And Escalation

A worker that needs a decision sends a blocking question; answer it by replying to that exact message. A worker that is blocked but still owns the task escalates. Neither is a completion.

Answer a worker's question only when Dylan's request, repository rules, or an established safe default already determines the answer. Ask Dylan when the answer would add authority, change behavior, cross scope, delete data, publish work, or choose between materially different outcomes.

A question that times out stays pending. Resume it by its original message ID rather than asking again.

## Settle Every Terminal

Account for every settled worker before acknowledging a Delivery or waiting again.

Default: release it, then start any later Task as a fresh agent session in the
chosen worktree. Do not hand the exact terminal to a follow-up Dispatch: that
keeps the old conversation and its context window. Mid-task mail to a live
Dispatch is still the same Task, not a new session.

Retain it only because Dylan asked to keep it live for debugging. Reuse the
exact terminal only when Dylan explicitly asked to continue that conversation.

Release after both succeeded and failed reports. Release is post-completion cleanup, not cancellation: it preserves inspectable output first, then closes only that Dispatch's own agent terminal. Released workers stay readable, so never keep a completed worker live just to re-read its output. Do not release a user-taken-over pane. A start that never became ready still owns its created terminal until released through the live recovery path.

Releasing a terminal does not make its worktree disposable or assign it to a
new Task. Reconcile the live state and Git ownership again before reuse.

Do not release because of a timeout, an idle state, a heartbeat, a status, a question, an escalation, a rejected report, or user takeover. If release reports a pending or unknown result, follow the receipt's recovery action; never substitute a blanket terminal close.

## Recovery

Recovery is conditional, never a fixed destructive sequence.

- A lost response that named no Dispatch: inspect the read-only request receipt first, then replay the original command under the same request identity so Orca can join or recover it instead of starting a duplicate. An absent receipt is not proof that nothing happened.
- Still ready: keep waiting, or read bounded output.
- Unknown start: the Dispatch is retained. Inspect and follow the receipt's next action; do not relaunch. Keep waiting if the worker may still recover.
- Proven failed or stopped: start a replacement as an explicit retry of that Dispatch, choosing placement and agent explicitly. Retry does not inherit placement or the failed conversation; start a fresh agent session.
- Stopped by provider quota: follow Quota Exhaustion above; never wait for the reset.
- Liveness unverifiable: keep waiting or inspect. Do not stop, abandon, retry,
  or release merely because observations are missing. For an explicit cancel
  or abandon request, load the live recovery guide and preserve its uncertainty.

Match every recovery decision back to the Harness story state. A settled Orca Dispatch does not move a Harness story, and a Harness status does not settle an Orca terminal.

## Contract Violations

Treat all of these as contract violations, not as results: a worker that dispatches another Orca worker, writes outside its allowed paths, or reports completion without the required outcome. A worker's own provider subagents are allowed.
Stop the worker, preserve its output and edits, verify every touched scope, and do not accept its report as proof. Report the violation to Dylan.
