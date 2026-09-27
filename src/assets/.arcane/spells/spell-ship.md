---
name: Spell — Ship
description: Pre-deploy checklist, merge approval workflow, and deployment gate verification
claude_description: Use PROACTIVELY before any deploy, even if the user just says 'ship it'.
argument-hint: Branch name or PR number to ship
agent: agent
---

## Executive Summary

- This prompt runs the pre-deploy checklist and manages the merge/deploy approval workflow.
- It verifies all Spell Loop phases are complete before allowing a merge.
- Enforces deployment gates from governance/cicd-standards.md.
- Final gate is always human approval — agents cannot autonomously ship to production.

---

Run the ship workflow for the specified branch or PR.

Use these files for context:

- [governance/development-methodology.md](../../.arcane/governance/development-methodology.md) — Spell Loop phases
- [governance/cicd-standards.md](../../.arcane/governance/cicd-standards.md) — CI/CD pipeline requirements and deployment gates
- [governance/testing-standards.md](../../.arcane/governance/testing-standards.md) — Coverage thresholds
- [governance/git-conventions.md](../../.arcane/governance/git-conventions.md) — Branch policies and merge strategy

Workflow:

1. **Verify Spell Loop completion** — check that all prior phases passed:
   - [ ] PRD exists and was approved (or Quick Flow justified skipping it).
   - [ ] Architecture doc exists (or Quick Flow justified skipping it).
   - [ ] All stories in stories.json have `"passes": true`.
   - [ ] Test evidence exists with passing thresholds.
   - [ ] Code review completed with APPROVE verdict.

2. **Sync with the target branch** — actually perform the sync, do not just assert it:
   - Run `git fetch origin` to get the latest refs.
   - Merge the target branch into the current branch (e.g. `git merge origin/<target>`).
   - **On merge conflicts:** STOP and ask the user to resolve them, or run `spell-sync-pull-request` — it handles exactly this case, with a recoverable ref and an explicit mechanical-vs-ambiguous conflict boundary. Do not attempt to auto-resolve here.
   - After a clean merge (or once the user has resolved conflicts), re-run the full test suite and confirm it passes.
   - Before pushing, run the push-policy check. It also governs step 9's remote branch deletion.

     <!-- fragment:push-policy-check:start -->
     **Push-policy check (ARC-049) — before any push.** Read `push_policy` from the repository's `.arcane.json` at the repository root (a self-hosted source repository with no root manifest keeps it in `src/assets/.arcane.json` when that file declares `selfHosted: true`). An absent file or an absent field means `open`. The check covers every push this spell makes: a branch push, a `--force-with-lease` push, and a remote branch deletion (`git push <remote> --delete <branch>`).
     - **`open` or absent:** proceed with the push.
     - **`guarded`:** before the push, state the policy ("This repository's push policy is `guarded`: every push needs your explicit confirmation."), name the remote, the branch and the kind of push, and ask the operator for explicit confirmation. Push only on an explicit operator confirmation of that push. A timeout, a cancellation, a delegated or host-generated response, or assent given to something else is not confirmation. **In an autonomous run with no operator to ask, do not push:** report the push as pending operator confirmation, naming the branch and the commits it would carry. This fails closed.
     - **`blocked`:** do not attempt the push. Say why: the repository's push policy is recorded as `blocked`, so pushes are refused on purpose. Name `spell unblock-push` as the only way to lift it, run by the operator from an interactive terminal. Never run it yourself, and never work around the block (`--no-verify`, another remote or URL, editing git config or `.arcane.json`).
     - **Any other value, or a `.arcane.json` that cannot be parsed:** do not push. Report what was found and suggest `spell doctor`.
     - When a push does not happen, skip every step that depends on it (opening or updating a PR, remote branch cleanup) and report the commits as committed locally and not pushed.
     - Enforcement: structured spell gate (ARC-023) — for `guarded`, this check is the only thing that holds a push for confirmation. A `blocked` push is also refused by the pre-push hook and the sentinel push URL that `spell init` or `spell block-push` install, and `spell doctor` reports a `blocked` policy whose controls are missing.
     <!-- fragment:push-policy-check:end -->

   - Push the synced branch (e.g. `git push`) only when the check allows it. If it stops the push, the ship is blocked until the operator confirms (`guarded`) or lifts the policy (`blocked`); record that in the ship report.

3. **Run pre-deploy checklist**:
   - [ ] All CI pipeline checks pass (build, test, lint, security scan).
   - [ ] Branch synced with target (fetch + merge completed in step 2, no outstanding conflicts).
   - [ ] No secrets or credentials in the diff.
   - [ ] DECISIONS.md updated if new ADRs were created.
   - [ ] Documentation updated for user-facing changes.
   - [ ] **Package version bumped** (if `package.json` exists): run `npm view <package-name> version` to get the last published version, then confirm `package.json` `version` field is higher. BLOCK the ship if the version has not been incremented — the pipeline will skip publishing an already-published version, so a bump is required to actually release.

4. **Ensure a PR exists** — before declaring the branch ready to ship, verify that a pull request exists for it. If none exists, STOP and direct the user to run `spell-create-pull-request` to open one. The ship checklist cannot complete without an open PR.

5. **Deployment gate verification** — per cicd-standards.md:
   - **Staging:** CI green + code review approved.
   - **Production:** Staging validated + human approval + rollback plan documented.
   - **Terraform:** Plan output reviewed + human approval for any destroy operations.

6. **Generate ship report**:
   ```markdown
   ## Ship Report — [Feature/Branch]

   **Date:** [timestamp]
   **Target:** [main / release branch]

   ### Spell Loop Status
   | Phase     | Status    | Evidence                             |
   | --------- | --------- | ------------------------------------ |
   | Plan      | PASS/SKIP | [PRD link or justification]          |
   | Architect | PASS/SKIP | [Architecture link or justification] |
   | Implement | PASS      | [N stories complete]                 |
   | Test      | PASS      | [Coverage %, test count]             |
   | Review    | PASS      | [Review link, verdict]               |

   ### Pre-Deploy Checklist
   - [x/- for each item above]

   ### Deployment Gate
   - Target environment: [staging/production]
   - Gate requirements met: [yes/no]
   - Rollback plan: [documented/not needed]

   ### Recommendation
   - APPROVE for merge and deploy
   - OR: BLOCK — [reason]
   ```

   <!-- fragment:needs-you:start -->
   **Needs you — required operator actions.** When this run leaves an action that only the operator can take, and the work is not correct or complete until it is taken, report it in one block at the very top of the final report, before every other section and before any optional next step:

   ```markdown
   ## ⚠ Needs you

   - <exactly what to do: the command, the link, or the question> — <why the agent cannot do it itself>
   ```

   - **What belongs in it:** an action the work needs that only the operator can take — approving or merging a pull request, accepting a decision record, answering a question the work is waiting on, confirming a `guarded` push, running an interactive command such as `spell unblock-push`, or a step on an external platform the agent cannot reach. An optional suggestion, a next spell to run, or anything the agent could do itself is not a required action and stays out of the block.
   - **One line per action.** Say exactly what to do, then, after the dash, why the agent cannot do it. Write the command, link or question out in full; never point elsewhere with "see above".
   - **Never only among optional steps.** An action required for correctness is never listed only under next steps, suggestions, `Carry Forward` or `What's Next?`. It may be repeated there, but it always appears in this block.
   - **Omit it when empty.** When nothing needs the operator, leave the block out entirely: no heading and no "None" line.
   - **Every final report.** The block belongs in whatever report ends the run, including a report written when the spell stops early.
   - Enforcement: explicitly advisory prose (ARC-023) — no check reads a spell's actual output for this block; it holds by these instructions alone.
   <!-- fragment:needs-you:end -->

7. **Request human approval** — present the ship report and wait for explicit approval.

8. **Execute merge** (after approval):
   - Merge using the project's merge strategy as defined in [governance/git-conventions.md](../../.arcane/governance/git-conventions.md). **Do NOT squash** — squash merges are prohibited because they collapse per-commit attribution. Prefer rebase and fast-forward.
   - Verify CI passes on the target branch post-merge.
   - Tag release if applicable.

9. **Post-merge branch cleanup** (after the PR merges) — the merge was the human gate, so cleanup is automatic:
   - **First, which primitive are you in?** `git rev-parse --path-format=absolute --git-common-dir` vs `--git-dir` — equal means primary checkout, different means linked worktree. (`--path-format=absolute` is required; without it the two differ from any subdirectory and every primary checkout reads as a worktree.) **In a linked worktree, skip the two steps below** (ARC-028 R1/R8): `git checkout main` fails when another working tree holds `main`, and it fails *first*, so the rest of this cleanup block never runs and the remote branch deletion below is left half-done. Report the worktree path for removal from another vantage point instead, and go straight to the remote-branch and prune steps.
   - Switch to the main branch (e.g. `git checkout main`).
   - Pull the latest (e.g. `git pull`).
   - Delete the merged topic branch locally (e.g. `git branch -d <branch>`) — if the repository or its linked worktrees might be reached through more than one filesystem view, run the same-vantage-point check first (EF-33 / ARC-028 R7, [governance/git-conventions.md](../../.arcane/governance/git-conventions.md) Same-Vantage-Point Check section).
   - Delete the merged topic branch on the remote (e.g. `git push origin --delete <branch>`); tolerate an already-deleted remote branch.
   - Prune stale remote-tracking refs (e.g. `git fetch --prune` or `git remote prune origin`).

Rules:
- **Never merge without human approval.** This spell always ends with a human gate.
- **Never skip the checklist.** Every item must be verified, not assumed.
- **Block on failures.** If any checklist item fails, the ship is blocked until fixed.
- **Document what shipped.** The ship report is the audit trail.
