# Verification and Safety

Read this file when accepting worker output, reviewing changes, validating proof, running browser acceptance, settling resources, reporting completion, or crossing a Git/publish boundary.

## Accept Evidence, Not Claims

A completion report is the worker's account of its own work. It automatically
settles the Orca Task and Dispatch; it does not prove the requested outcome or
settle external task authority.

Before accepting delegated work:

1. Confirm the large objective and execution-child mapping. For each child,
   confirm the Dispatch receipt identifies the exact writable repository,
   worktree, terminal, and worker that produced the result, then inspect the
   actual files, diff, and task artifacts there.
2. Confirm every change remains inside `writable_paths`. Compare the worker's
   declared modified-file list against the real diff, and compare every
   read-only context checkout with its pre-start snapshot. A changed context or
   list mismatch is a finding, not a formality.
3. Compare each change with its accepted plan track. Amend the plan explicitly before accepting an unplanned change.
4. Read the Reviewer's report on that exact diff. Every editing child needs one;
   resolve each blocking finding with a fresh executor follow-up and a new
   review, or record why it is not a defect.
5. Run the smallest meaningful acceptance validation.
6. Reconcile cross-worker conflicts yourself.
7. For cross-repository work, confirm the tested filesystem contains the exact
   selected change from every participating repo. Isolated worktree results are
   not combined proof.
8. Apply repository-specific impact and change-detection requirements.
9. Record validation gaps honestly.

Plan acceptance and Reviewer output are evidence, not proof or final acceptance. A failure outcome is a terminal report: read it, decide recovery, and do not treat it as a transient error to retry blindly.

## Browser Acceptance Is Yours

When accepted validation requires browser proof, drive Orca's built-in browser yourself rather than delegating the claim to a worker. Use a snapshot, act, re-snapshot loop, and re-snapshot after navigation, tab switches, and any stale-reference error.

Record what you actually observed: the final URL, the actions performed, the asserted values, console and network results when requested, captured screenshots, and an explicit pass or fail. Never accept a plain HTTP fetch as browser proof.
For role-sensitive checks, record the browser profile and actual logged-in
role. Follow `native-features.md` for isolated profiles, Design Mode input,
review notes, CI feedback, workspace status, and report previews.

Use Orca's computer-use surface only for native application windows or an external browser outside Orca's embedded pages, and only when the task genuinely needs OS-level control.

Keep any temporary script, screenshot, trace, or download out of the repository. Report the exact paths of everything created.

## Complete External Task Authority

Only the Orchestrator completes verified external task authority. In Harness
protocol mode, use the adapter so nested verification failure keeps the story
open:

```bash
python3 <orca-skill>/scripts/harness_protocol.py --repo "$PWD" \
  --run-id <story-id> complete <story-id>
```

Without external task authority, Orca's valid `worker_done` already settles its
worker Task and Dispatch. Verify the result and report acceptance to Dylan; do
not create or close a second task database. Use native Orca dependencies or
gates when coordinated work needs them.

## Guard User Work

Snapshot scoped Git status before and after every worker, including reviewers.
Run Git independently in every participating nested repository; a folder
workspace has no aggregate Git status, and a clean parent repository does not
prove a nested repository stayed clean. A read-only brief is policy, not a
filesystem sandbox.

An unbound worktree is not automatically free. Preserve user-owned or unknown
checkouts, and never attach, reuse, clean, or remove one merely because the
current Run has no Dispatch for it.

If a worker writes outside its authority:

1. Stop it and capture output.
2. Report the contract violation.
3. Inspect every touched path.
4. Preserve unrelated user changes.
5. Never auto-revert or accept the worker's edits.

Treat recursive Orca dispatch by a worker as a violation: stop the worker, preserve output and edits, verify every touched scope, and do not accept its report as proof. A worker's own provider subagents are allowed; the same activity in the Chief's session is a violation.

Do not commit, push, merge, deploy, delete data, or close external tasks unless
Dylan explicitly authorized that action.

## Settle Resources

Settle every finished worker terminal before acknowledging its Delivery: release
it and start any follow-up as a fresh agent session. Retain or reuse the exact
terminal only when Dylan asked. Do not release a user-taken-over pane.
Released workers stay readable, so never keep one live merely to re-read output.

Inspect worktree status and preserve useful work before removal. Never run an orchestration reset to clean up: it clears runtime-global state shared with every other project on this Orca install.

## Report to Dylan

Report:

- Accepted plan reference, where it was materialized, and any track deviations or amendments.
- Orca Tasks and any external Harness stories assigned, blocked, verified, and completed.
- The cross-repository objective, each execution
  Task-to-Dispatch-to-writable-worktree binding, and the exact read-only
  context checkouts used. Include any unowned, retained, or conflicting
  worktrees that affected allocation.
- Tool, model, and effort selected, whether Jev (with its confidence) or the Chief chose them, and the effective model and effort the session reported.
- Files changed and whether they stayed in scope, including any mismatch with the worker's declared list.
- Runnable validation and remaining gaps.
- Browser observations: final URL, asserted values, console result, artifacts, and pass or fail.
- Contract violations, approvals, substitutions, or model mismatches.
- Worker terminals released, retained, or intentionally left running, and worktrees kept or removed.
- Explicitly whether commit, push, merge, deployment, or deletion did not occur.
