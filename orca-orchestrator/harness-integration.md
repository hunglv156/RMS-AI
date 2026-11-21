# Harness Integration

Read this file only when the repository explicitly declares Harness as task or
verification authority for work executed through Orca.

## Product Boundary

- Harness owns stories, dependency and runnable calculation, CAS status, and
  fresh completion proof.
- Orca owns Runs, worker Tasks, Dispatches, worktree identity, terminals, mail,
  and lifecycle.
- The Orchestrator maps one Harness story to one supervised objective. That
  objective may span repositories and use one or more Orca execution Tasks;
  each editing child has one write owner plus bounded read-only context.

Do not duplicate Harness story dependencies or status in an Orca DAG. Internal
dependencies among execution children of one story are placement and handoff
details, not duplicate story state. A worker's `worker_done` settles the Orca
Task and Dispatch but never advances Harness.

If Harness is not declared authoritative, stop reading this file and use Orca's
native Tasks, dependencies, and gates. Do not introduce Harness or Beads merely
for orchestration bookkeeping.

## Protocol Preflight

When available, check the project-registered capability first:

```bash
scripts/bin/harness-cli tool check --name orca --json
scripts/bin/harness-cli query tools --capability agent-orchestration --status present --json
```

`present` means equipped, not live. Confirm Orca separately. Then use the
adapter:

```bash
python3 <orca-skill>/scripts/harness_protocol.py --repo "$PWD" discover
python3 <orca-skill>/scripts/harness_protocol.py --repo "$PWD" graph
```

Stop before mutation when the tested CLI version, protocol, current schema, or
required capabilities do not match. Upgrade or migrate only with Dylan's
authorization and repository-required backup.

## Dispatch One Story

1. Read one consistent Harness work graph and choose a story whose `runnable`
   field is true.
2. Read its existing contract and determine the complete objective scope,
   writable repositories, bounded read-only context, paths,
   deliverable, and validation. Do not require a separate Planner when that
   contract is already sufficient.
3. Atomically claim before allocating Orca resources:

   ```bash
   python3 <orca-skill>/scripts/harness_protocol.py --repo "$PWD" \
     --run-id <story-id> claim <story-id>
   ```

4. Derive one editing child per repository that must change. Select each worker
   from `.orca/agents.toml`, resolve its writable repository anchor, and follow
   `agent-lifecycle.md` to allocate the concrete writable worktree and pin all
   declared context checkouts. Use a ready start receipt as that child's
   Task/Dispatch write binding. An unknown start keeps the story `in_progress`;
   do not relaunch that child.
5. Create the bounded Orca execution Tasks and start their supervised workers.
   These Tasks are execution decomposition under one Harness story, not a copy
   of Harness status or its dependency graph. Keep Harness CAS state out of the
   worker briefs.
6. Treat every `worker_done` as a validation trigger. Inspect all outputs,
   diffs, context checkouts, scope, and runnable proof.
7. Complete through fresh Harness verification:

   ```bash
   python3 <orca-skill>/scripts/harness_protocol.py --repo "$PWD" \
     --run-id <story-id> complete <story-id>
   ```

The adapter exits `4` when nested verification reports failure even when the
Harness CLI returns a success envelope; the story remains open.

Create a new Harness story only when Dylan's requested work and repository
workflow require one. Use the repository's existing contract format and
verification command; do not invent a second plan schema.

## Recovery

A release decision is story-wide. Reconcile every Orca execution child,
Dispatch attempt, and participating worktree before invoking the adapter. The
adapter performs the requested CAS transition; it cannot prove that sibling
children are settled.

| Event | Action |
| --- | --- |
| Claim `CONFLICT` | Do not start a worker; another actor changed or owns the story. |
| One child start fails while any sibling child is active or unresolved | Keep `in_progress`; recover or settle the remaining children first. Do not relaunch an unknown start. |
| All children are settled, every participating worktree is clean, and no edits remain | CAS-release `in_progress` to `planned`. |
| All children are settled and any participating worktree has preserved edits | CAS-release to `changed`, or keep `in_progress` while recovering. |
| Blocking question or escalation | Keep `in_progress`; answer or ask Dylan. |
| Worker reports success but proof fails | Keep story open and return the exact failure. |
| Harness mutation timeout | Outcome is unknown; inspect the live graph before any retry. |
| Orchestrator restarts | Re-read Harness, Orca Dispatch state, and Git before mutation. |

Release only with CAS:

```bash
python3 <orca-skill>/scripts/harness_protocol.py --repo "$PWD" \
  --run-id <story-id> release <story-id> --to planned
python3 <orca-skill>/scripts/harness_protocol.py --repo "$PWD" \
  --run-id <story-id> release <story-id> --to changed
```

The adapter invokes Harness with argv, never a shell. Do not interpolate story
titles, prompts, or user content into separate shell commands.
