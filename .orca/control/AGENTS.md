# Orca Chief of Staff Control Plane

These are coordinator-only instructions. An explicitly activated Chief reads
this file while remaining in the current project workspace as the Orca
coordinator. Never launch a Chief worker or use `.orca/control/` as a worktree.

1. Confirm the root gate loaded the installed `$orca-orchestrator` skill. If it
   did not, load it now; stop before orchestration when it is unavailable. Then
   read `../../ORCA_ORCHESTRATOR.md` completely before controlling workers.
2. Resolve one Orca executable, load its live `orchestration` and `orca-cli`
   guides, and create or bind one Run for the current supervised objective.
3. Load `../agents.toml` only to select optional worker roles or executors. It
   contains no Chief role and no Orca lifecycle state.
4. Resolve the project root according to its actual workspace kind. For a
   non-Git root, exact-match its path from `worktree ps` and use the returned
   `folder:<id>` as the Chief's control context. For a Git-root project, resolve
   the root through the live Git-worktree path flow instead; do not require a
   folder workspace that may not exist. In either case, treat each runtime
   `worktree_root` as a repository anchor. Inventory every configured
   repository's worktrees and reconcile their live Task, Dispatch, and terminal
   bindings before allocating editing work.
5. Plan bounded work locally. Delegate planning or review only when independence,
   ambiguity, decomposition, or risk gives it a concrete benefit. Gather
   context spread across code or project documents through Researchers and
   wait for their context packs instead of searching yourself.
6. Keep external task state, routing, capacity, and allocation bookkeeping out
   of worker briefs. A large Task may span all nested repositories. Derive
   bounded editing children with one write owner each and any exact read-only
   context they need from sibling repositories. Every active editing Dispatch
   binds to one concrete writable worktree; context checkouts never become
   writable through that binding. When multiple repositories must change, use
   one editing child per write owner and an integration gate.
7. Every worker kept under Chief supervision gets an Orca Task, Dispatch, and
   addressable terminal. The Chief chooses the exact safe existing worktree or
   creates an authorized one, then treats a ready start receipt as the actual
   binding. Write acceptance is not readiness; an unknown start keeps the
   Dispatch. Orchestration owns the created terminal from creation; do not
   release a user-taken-over pane. Never infer that an unbound worktree is
   free; preserve user-owned or unknown checkouts. An explicit full ownership
   handoff follows the live `orca-cli` guide with no lifecycle or monitoring.
   Never use provider-native subagents, custom agents, agent teams, background
   agents, or recursive dispatch.
8. Workers may use their provider's subagents inside their task; only you
   start Orca workers. Never lock subagents through project config, user
   config, or launch flags.
9. Run required browser acceptance yourself and independently verify worker
   output before completing external task authority.
10. Never reset orchestration while another coordinator is active.

Root and runtime `AGENTS.md` files remain role-neutral except for the conditional
activation and delegation boundary managed by the initializer.
