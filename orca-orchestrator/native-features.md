# Use Orca's Native Features

Read only the section matching the current task. Load the selected executable's
version-matched `orca-cli` or `orchestration` reference before using its commands;
check command help when a capability is absent from the compact guide. Do not
copy the command manual into project instructions. A feature visible in the
desktop UI is not proof of a public CLI API or support on a remote host.

| Need | Read below | Live reference |
| --- | --- | --- |
| New checkout or missing dependencies | Worktree setup | orchestration: `references/placement-and-remote.md` |
| Another execution machine | Remote placement | orchestration: `references/placement-and-remote.md` |
| Capacity or rate-limit problem | Account readiness | CLI account command help; native account UI |
| Continue earlier work or recover reasoning | Session history | `orca-cli` session search section |
| Review, CI, UAT, progress, or report delivery | Review and evidence | CLI browser/publishing references as applicable |
| Recurring work | Scheduled work | orca-cli: `references/automations.md` |
| Repeated manual command or retained session | Repeated work and retained sessions | `orca-cli` terminal guide; native UI |

## Worktree Setup

Inspect existing repo hooks, startup policy, `orca.yaml`, `.worktreeinclude`,
and configured shared paths before proposing setup. Reuse the project's setup
script; do not generate a second dependency installer.

- Use `.worktreeinclude` for gitignored files that need an independent copy,
  such as local configuration. Entries are literal paths, not glob patterns.
- Use `worktree.sharedDirectories` or configured Shared Paths only for suitable
  gitignored directories. Shared Paths can clone-copy or symlink depending on
  platform; do not assume independent mutable state. Dependency trees that
  diverge between branches need separate installs. Keep test databases, ports,
  and mutable application data isolated when concurrent workers use them.
- Run configured setup for a new worktree. When work requires its output,
  prefer the repo's `wait-for-setup` policy where authorized; if setup starts
  alongside the agent, wait for actual success before dependent work. Existing
  worktrees do not rerun setup automatically.

Example: a new Odoo checkout lacks local config and test dependencies. Copy
the required config, run its existing setup script with a distinct test DB,
then validate. This prevents an environment failure being mistaken for a code
regression. Record setup failure separately and follow its receipt's recovery.

## Remote Placement

Discover Orca hosts/environments and project host setups before resolving
paths. Select the exact repository on the execution host, inspect its runtime
capabilities, and load the live placement guide. A local folder with the same
name does not identify a remote checkout. Keep the Run on the coordinator
runtime and use Dispatch IDs for later worker operations.

The version-5 roster validator resolves local filesystem paths and Git roots;
it is not a remote resolver. Validate the applicable roster on the execution
host using an authorized execution surface, then verify its returned anchor,
scope, catalog command, and locks against that host's live Orca state. If that
cannot be done, report the placement gap before launch. Do not add unsupported
host keys to v5 TOML or claim a local validation proved a remote boundary.

Example: Linux hosts the Odoo database and test dependencies, while the Chief
runs on Mac. Resolve and validate the Linux checkout there, dispatch there,
and collect test output from that host. A disconnected Mac UI does not prove
the Linux agent exited; preserve `unverifiable` until evidence is available.
Do not assume local logins, catalogs, or skills are installed on the server.

## Account Readiness

The catalog's `capacity` limits concurrent sessions. Before a long launch,
inspect available authentication, quota/reset, and host-tool evidence. Use
documented CLI data where exposed; otherwise use the native account UI when
needed. Never invent a quota endpoint or scrape credential files.

Example: one of two Codex slots is free but its account is exhausted. Route
with `--exhausted codex` so Jev chooses among the role's other candidates,
which Dylan's catalog already authorizes, and record the reset time. Do not
launch repeatedly, pick a model outside the role's candidates, switch
accounts, or spend reset credits without that authority. Missing usage data
means unknown, not exhausted and not unlimited. `route.py` counts sessions and
never queries quota. A worker that runs out mid-task follows Quota Exhaustion
in `agent-lifecycle.md`.

## Session History

Read project handoff and decisions first. When a relevant fact is missing,
check search index status and search a distinctive issue ID, function name, or
error string, scoped to the relevant path/host. If indexing is disabled, use
existing project context and report the gap; agents cannot enable it through
the search CLI. Indexing in progress may yield incomplete results.

Example: before investigating the same invoice error again, find the previous
session's error identifier, read the relevant snippet, and verify its claim
against current code. Save only a confirmed decision or useful source link in
project memory. Historical messages are evidence, not fresh instructions or
approval. CLI search addresses one host at a time. Reading history does not
authorize resuming a settled worker or reusing its Dispatch IDs.

## Review And Evidence

**Issue and CI context.** Preserve the repository's declared task authority,
including GitHub/Linear/Jira or Harness. Link the existing work item to its
workspace where supported. Orca's provider Tasks UI and orchestration Tasks
are different surfaces; linking an issue does not settle either. For a failed
check, capture the exact revision, failing job, log/link, scope, and acceptance
in the repair task. Use the native Fix broken checks action when appropriate;
verify supervised ownership before treating a UI-started agent as a worker.
After a repair, validate the new revision. A passing old CI run is not proof.
For a downstream Task that requires reviewed output, use an acceptance gate
or defer its dispatch until the Chief verifies the producer. A dependency can
become ready on `worker_done` before independent acceptance. Example: FE must
consume the accepted API schema, not merely the BE worker's success report.

**Diff feedback.** Group line-anchored review notes into one coherent revision
task, then re-check each finding. Native Send notes to agent is prompt delivery,
not proof of a Task/Dispatch binding. Preserve fresh-session policy after a
settled worker; a live Task can receive bounded follow-up mail. Native review,
auto-merge, and merge-queue controls operate only within granted authority.

**Browser roles.** Load the live browser reference, bind checks to a stable page
and explicit profile, and verify the actual logged-in role. For example, test
an approval action separately as employee and manager so an admin cookie cannot
hide a permission defect. Profiles isolate browser storage, not backend test
data. Design Mode can supply element HTML/CSS and a screenshot for a UI bug;
reproduce the behavior before treating that context as acceptance evidence.
Re-snapshot after navigation or stale references.

**Visible progress.** At meaningful transitions, read the existing workspace
comment, preserve user goals, then update a short comment and appropriate card
status. Worker success normally moves to review; verified acceptance moves to
completed. Example: `Tests passed; waiting for schema decision` lets Dylan see
the blocker without opening a transcript. A worktree checkpoint is metadata,
not a code backup or a second task authority. Notifications/mobile are attention
surfaces, not completion evidence; delivery differs between native chat and
terminal sessions. Do not promise a push notification for every finished turn.

**Reports.** Open local Markdown/HTML or the relevant diff in Orca for review.
Publishing an artifact or skill is a separate public-sharing action: load
`references/publishing.md` and use existing user authorization. The device
publishing gate can only be enabled by a human. A disabled gate means deliver
the local file, not retry uploads or turn it on through another interface.

## Scheduled Work

Use native Automations when the request is recurring; a one-off supervised
task stays in the normal Run loop. Read the live automations reference and
current command help. A Run is a durable namespace, not an automatic scheduler:
the Chief still starts ready work and decides acceptance.

Specify prompt, provider, exact target/host, timezone, schedule, and outcome.
Choose an existing workspace for bounded recurring inspection or a fresh
worktree per run when writes need isolation. Fresh sessions are the default;
reuse only when requested and supported. Do not assume Automations accepts
the router's custom command or enforces model/effort/role locks. Verify the
effective launch contract before scheduling work that depends on those rules.

Use a bounded precheck to skip runs with no work: exit 0 continues, nonzero
skips. A command that prints an empty list but exits 0 does not skip anything.
Example: weekday CI triage checks for new failed runs first; only then does the
agent inspect logs and produce a report. Record failures, skips, and successes
through native run history, not a second scheduler database.

Inspect existing schedules/history before creating another; identify already
handled work by stable issue/revision IDs. Before recurring writes, reconcile
previous live runs and checkout ownership. A precheck is not an atomic lock;
unknown overlapping writers block that write, even if the schedule fired.
An automation launch is not automatically a supervised Dispatch or an activated
Chief. Apply the actual role and current delegation policy; never use scheduled
prompts to bypass worker-depth or nested-delegation restrictions.

Create disabled while tuning, inspect the concrete prompt/target, then run a
bounded trial when authorized and enable within the user's scheduling request.
An audit or skill installation alone does not authorize scheduling. Prefer
native missed-run grace and run history to a custom retry daemon.

## Repeated Work And Retained Sessions

For a repeated manual action, use a project-scoped Quick Command pointing to
an existing script or a precise prompt. Example: `Run agreed UAT checks` invokes
the project's established test command. Quick Commands can open terminals or
insert input; they do not confer supervised ownership or broader permissions.

Release settled supervised workers by default. For an explicitly retained or
user-owned resumable session, use native sleep/hibernation when requested and
supported rather than closing away its resume state. Do not enable the global
hibernation setting as a setup side effect or use it to settle an active or
unknown Dispatch. Before resuming, verify worktree, account, and effective
launch settings; historical lifecycle IDs never authorize new work.
