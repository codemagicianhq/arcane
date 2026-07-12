---
name: Spell — Ship
description: Pre-deploy checklist, merge approval workflow, and deployment gate verification
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

- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop phases
- [governance/cicd-standards.md](../../governance/cicd-standards.md) — CI/CD pipeline requirements and deployment gates
- [governance/testing-standards.md](../../governance/testing-standards.md) — Coverage thresholds
- [governance/git-conventions.md](../../governance/git-conventions.md) — Branch policies and merge strategy

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
   - **On merge conflicts:** STOP and ask the user to resolve them. Do not attempt to auto-resolve.
   - After a clean merge (or once the user has resolved conflicts), re-run the full test suite and confirm it passes.
   - Push the synced branch (e.g. `git push`).

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

7. **Request human approval** — present the ship report and wait for explicit approval.

8. **Execute merge** (after approval):
   - Merge using the project's merge strategy as defined in [governance/git-conventions.md](../../governance/git-conventions.md). **Do NOT squash** — squash merges are prohibited because they collapse per-commit attribution. Prefer rebase and fast-forward.
   - Verify CI passes on the target branch post-merge.
   - Tag release if applicable.

9. **Post-merge branch cleanup** (after the PR merges) — the merge was the human gate, so cleanup is automatic:
   - Switch to the main branch (e.g. `git checkout main`).
   - Pull the latest (e.g. `git pull`).
   - Delete the merged topic branch locally (e.g. `git branch -d <branch>`).
   - Delete the merged topic branch on the remote (e.g. `git push origin --delete <branch>`); tolerate an already-deleted remote branch.
   - Prune stale remote-tracking refs (e.g. `git fetch --prune` or `git remote prune origin`).

Rules:
- **Never merge without human approval.** This spell always ends with a human gate.
- **Never skip the checklist.** Every item must be verified, not assumed.
- **Block on failures.** If any checklist item fails, the ship is blocked until fixed.
- **Document what shipped.** The ship report is the audit trail.
