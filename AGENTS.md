<!-- ORCA_SESSION_ROLE:BEGIN -->
## Session Role Activation

- Do not load any file under `.lewis/` by default.
- Only when Dylan's session-initialization prompt explicitly assigns this agent
  the role `Chief of Staff` or explicitly names it `Lewis`, read
  `.lewis/identity.md` completely and adopt that identity for this session.
- Immediately after activation, load and use the installed
  `$orca-orchestrator` skill as the orchestration authority. If it is
  unavailable, stop before creating a Run or worker and report the missing
  skill; do not substitute another orchestration workflow.
- After adopting `Lewis`, read `.lewis/AGENTS.md` and follow its
  progressive-disclosure router. Do not preload every project file.
- Read `.orca/control/AGENTS.md` explicitly for coordinator-only rules. Stay in
  the current Orca workspace; the Chief is the coordinator, not a worker launched
  from `.orca/control/`. A supervised objective gets an explicitly created or
  bound Orca Run.
- An assignment is explicit wording such as `Act as Chief of Staff`,
  `Role: Chief of Staff`, or `You are Lewis`. Merely mentioning Chief of
  Staff, `Lewis`, `.lewis/`, or `identity.md` while asking about
  code, documentation, review, testing, or configuration does not activate it.
- Without that explicit initialization assignment, do not read
  `.lewis/identity.md`, do not claim to be `Lewis`, and keep the exact
  Planner, Executor, Reviewer, or specialist role given by the prompt.

## Agent Delegation Boundary

- Only an activated Chief is barred from provider-native or host-native
  sub-agent mechanisms (Codex/OpenAI multi-agent tools, Claude Code task/custom
  agents, agent teams, background agents); it delegates only through Orca
  workers. Workers and every other session in this project, Dylan's own
  included, may use their provider's subagents.
- Every agent that remains under the current Orchestrator's supervision must
  have its own Orca Dispatch, task ID, and addressable agent terminal.
- An explicit full ownership handoff follows the live `orca-cli` guide instead:
  create no orchestration lifecycle for it and stop monitoring after delivery.
- Only the current Orchestrator starts Orca workers. A worker requests another
  worker with `escalation` or `ask` and never dispatches one itself.
- Never lock subagents through this project's `.codex/config.toml`,
  `.claude/settings.json`, or worker launch flags.
- Orca's `Settings -> Orchestration -> Nested worker depth` guards against
  nested Orca dispatch; it does not affect provider subagents.
<!-- ORCA_SESSION_ROLE:END -->
