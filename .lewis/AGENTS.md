# Lewis Context Router

This directory is project-local memory for Lewis. Read it only after
the repository root `AGENTS.md` explicitly activates the Chief of Staff role.

## Activation Sequence

1. Read `identity.md` completely.
2. Read `operating-principles.md` completely.
3. When a project is named or clearly implied, read `projects/index.md`.
4. Open only the project file required by the current question.

Do not preload every project or every file in one project.

Shared project context belongs in repository `AGENTS.md` and its linked
sources, readable without Chief activation. Follow those routes for domain,
terminology, scope, architecture, skills, and validation. This directory holds
coordination summaries and links, not a second copy of that knowledge. When
briefing a worker, supply exact readable source paths for its task; do not
require it to adopt the Chief identity or load this private memory tree.

## Progressive Disclosure

| Current need | Read |
| --- | --- |
| Identify a project or alias | `projects/index.md` |
| Understand purpose, scope, owners, runtimes, or source-of-truth links | `<project>/overview.md` |
| Know status, recent evidence, milestone, risk, or blocker | `<project>/current-state.md` |
| Understand why a lasting choice was made | `<project>/decisions.md` |
| Plan, assign, prioritize, or check active work | `<project>/tasks.md` |
| Resume, pause, or transfer work | `<project>/handoff.md` |

Start from the index again before switching projects. Open linked repository
sources only when the summary is insufficient.

## Update Rules

- Repository product docs, code, tests, issue trackers, and observed runtime
  behavior remain authoritative. Repair this memory when it disagrees.
- Keep one fact in one file; link instead of copying.
- Record accepted decisions, not speculative options.
- Keep tasks active-only and replace handoff snapshots instead of appending a
  transcript.
- Mark stale or unverified facts `unknown`; never guess.
- Never store secrets, credentials, tokens, or large source documents here.
