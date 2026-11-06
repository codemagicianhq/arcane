---
name: Spell — Implement
description: Autonomous implementation loop — pick a story from stories.json, build it, test it, commit it, repeat until all stories pass
tagline: Build against stories, never freestyle
claude_description: Use PROACTIVELY to work through stories.json autonomously once architecture and stories exist.
argument-hint: Path to stories.json or paste story context (optional - uses current directory stories.json by default)
agent: agent
---

## Executive Summary

- This is the core autonomous loop of the Spell Loop methodology.
- Each iteration: pick a story → implement → run tests → commit if passing → update stories.json → loop.
- Uses fresh context per iteration — only stories.json, progress.txt, and git history carry forward.
- See [[.arcane/governance/development-methodology|Development Methodology]] for full Spell Loop reference.

---

Run the autonomous implementation loop for the current feature.

Use these files for context:

- [governance/development-methodology.md](../../.arcane/governance/development-methodology.md) — Spell Loop methodology
- [governance/testing-standards.md](../../.arcane/governance/testing-standards.md) — Testing frameworks and coverage requirements
- The feature's `architecture.md` — for tech decisions and patterns
- The feature's `stories.json` — for the work breakdown
- The feature's `progress.txt` (in `features/{slug}/`, if present) — accumulated learnings from prior iterations; read it before each iteration and append new learnings as the loop proceeds

<!-- fragment:presence-report:start -->
**Presence report (ARC-044 decision 3, ARC-060).** When a presence channel is configured on this
machine, report through it; when none is, this spell behaves exactly as it does without this
paragraph. Configured means `spell presence status` exits 0: the service is running and the token
in the user store opens it. Report with the CLI only; never pass a token on the command line, and
never write a repository file to report.

- At the start of this spell: `spell presence report --spell <spell-id> --status working --task "<the task in one line>"`.
- When this spell's output carries a `## 🚧 Action required` block with open **Now** items: `spell presence report --status waiting --required-action "<line 1>" --required-action "<line 2>"`, one flag per open Now line; the block itself is unchanged.
- At a checkpoint worth showing (a commit made, a story passed): `spell presence report --status working --task "<what is now happening>"`.
- When the session closes: `spell presence end`.

The command is silent and exits 0 when no channel is configured, prints one line to stderr and
still exits 0 when the channel refuses a report, and never blocks a spell. The service keeps
presence in memory only, reconstructable from `spell state --json` and never authoritative; a
session that stops reporting is shown as unknown after 90 seconds. Enforcement: explicitly
advisory prose (ARC-023) — no check reads a spell's shell history for these calls.
<!-- fragment:presence-report:end -->

Workflow (loop until all stories pass):

<!-- fragment:unattended-run-preflight:start -->
**Unattended-run preflight (ARC-061).** Run before the operator leaves when they
request unattended execution; otherwise skip. An earlier preflight can be reused
only for the same approved plan, checkout, scope and unchanged policy. The
orchestrator owns it; workers receive only a narrower, explicit brief.

1. Gather **every blocking question in one batch**: scope, unresolved product/ADR
   decisions, action permissions, expiry, required checks and any access gaps.
   Use the harness question UI when available. Continue independent work while
   waiting; unanswered required questions never become consent by timeout.
2. Inspect the authenticated CLI identity, PR author identity, repository, target
   branch, effective policies and allowed merge strategies. Report unknown on
   an auth/network/parse failure; do not infer permission from tool availability.
   - **GitHub:** read the repository merge settings, effective branch Rulesets
     (`gh api repos/<owner>/<repo>/rules/branches/<branch>`) **and** classic branch
     protection when present; include inherited rules. Read required approvals,
     code-owner/last-push review constraints and required status checks. PR authors
     cannot approve their own PRs: a grant cannot supply an independent review.
     Check `gh pr checks` and current review decisions before completion. Honor
     linear-history constraints when choosing merge or rebase; never squash.
   - **Azure DevOps:** read target-scoped enabled policy configurations with
     `az repos policy list --repository-id <id> --branch <branch> --org <url> --project <project>`.
     Inspect minimum reviewers (`creatorVoteCounts`, last-pusher/iteration vote
     restrictions), required reviewer policies, build validation and allowed merge
     types. Only an explicitly permitted creator vote may count; other required
     reviewers still wait for those reviewers. Read the PR's policy evaluations
     before completion. Optional or path-filtered validation is not blanket proof.
   - **Validation:** state whether required PR validation exists and covers this
     change. If it does not, identify and run the repository's approved local
     checks against each exact completion head. A green old head is insufficient.
3. Record the run grant while the operator is present, through the existing
   commit approval gate or an explicit operator instruction authorizing the grant
   record's own commit. Verify provenance and every field per agent-policies.md.
   Repos with and without a roster use the same temporary grant format. Do not
   change standing power or loosen push policy to make a run possible.
4. Save a **Preflight result** with repository/branch/head, identity, policy sources
   and observation time, grant ID/expiry, required checks, and an action table:

   | Action | Will run unattended | Will wait for operator / reason |
   | --- | --- | --- |
   | Commit, push, PR creation/assignment | List exactly which are authorized | List each missing grant/access/push confirmation |
   | Approval, completion, branch deletion | List exactly which are possible under policy | Name each required independent review or other blocker |

   Say explicitly **what will run unattended and what will wait for the operator**.
   Put every operator-only action in the Action required block. Before arming
   auto-merge, finish review and ensure it cannot outlive the grant; otherwise
   monitor checks and revalidate before completing. Recheck policies if changed.

Enforcement: structured spell gate (ARC-023); prompt-contract tests verify that
all three orchestrating spells contain this shared preflight. No settings mutate.

Related: [[.arcane/governance/agent-policies]].
<!-- fragment:unattended-run-preflight:end -->

0. **Sync workspace** — before any code changes, ensure the workspace is current:
   ```bash
   git fetch --prune origin
   git checkout main && git pull --ff-only
   ```
   If `pull --ff-only` fails, halt and report — manual rebase is needed.

   **In a linked worktree, do not run the `checkout main` line** (ARC-028 R1/R8). It fails with `fatal: 'main' is already used by worktree at '<path>'` when another working tree holds `main`, and the halt instruction above only covers a `pull` failure — so an agent that runs it there has no branch to take. Sync the remote-tracking ref instead, which is all this step actually needs:
   ```bash
   git fetch --prune origin        # origin/main is now current
   git rebase origin/main          # or branch from origin/main directly in step 1
   ```
   Check with `git rev-parse --path-format=absolute --git-common-dir` vs `--git-dir`: equal means primary checkout, different means linked worktree. `--path-format=absolute` is required — without it the two differ from any subdirectory and every primary checkout looks like a worktree.

1. **Load stories.json** — locate the feature folder from the current branch:
   ```bash
   # Derive feature folder from branch name (works for lafayette/feat/541-phase-2a or lafayette/feat/phase-2a)
   FEATURE_FOLDER="features/$(git symbolic-ref --short HEAD | sed 's|.*/feat/||')"
   ```
   Load `$FEATURE_FOLDER/stories.json` and `$FEATURE_FOLDER/architecture.md`. If the branch name doesn't follow the `feat/{slug}` or `feat/{id}-{slug}` pattern, look for the most recently modified `features/*/stories.json` or ask the operator for the path.

   Find the next story where `"passes": false`, ordered by priority.

2. **Read context** — load only what this story needs:
   - The story's description and acceptance criteria from stories.json
   - Relevant sections of architecture.md
   - Latest entries in progress.txt (if exists) for learnings from previous iterations
   - Files that will be modified (check git status)

3. **Implement the story**:
   - Follow the architecture decisions — do not deviate without flagging.
   - Write the minimum code to satisfy acceptance criteria.
   - Follow project coding conventions and patterns from existing code.
   - Include tests per governance/testing-standards.md.

4. **Run tests**:
   - Run the test suite for the affected area.
   - All existing tests must still pass (no regressions).
   - New tests must pass.
   - Check coverage against thresholds (80% line, 95% critical path).

5. **Evaluate results**:
   - **Tests pass:** proceed to commit.
   - **Tests fail:** debug and fix. If stuck after 3 attempts, mark the story with the error in stories.json and move to the next story.

6. **Commit the story**:
   - Use Conventional Commits format (see spell-commit-work).
   - One commit per story (squash if needed).
   - Include the story ID in the commit body.

7. **Update stories.json**:
   - Set `"passes": true` for the completed story.
   - Set `"testEvidence"` with coverage % and test count.

8. **Append to `$FEATURE_FOLDER/progress.txt`**:
   ```
   ## Iteration N — [STORY-ID] — [timestamp]
   ### What was done
   - [summary of changes]
   ### What was learned
   - [patterns, gotchas, conventions discovered]
   ### What to watch for
   - [warnings for future iterations]
   ```
   File lives in the feature folder, not the repo root.

9. **Loop** — go to step 1 and pick the next story.

10. **Completion** — when all stories have `"passes": true`:
    - Summarize what was built.
    - Report total test count and coverage.
    - Recommend running `spell-review` for adversarial review.

Rules:
- **Fresh context:** do not carry assumptions from previous stories. Re-read what you need.
- **No scope creep:** only implement what the story specifies.
- **Test first when possible:** write the test, see it fail, then implement.
- **Commit atomically:** one story = one commit.
- **Never skip tests:** if there's no test framework set up, set it up as the first story.
- **Stuck threshold:** if a story fails 3 consecutive attempts, mark it and move on. Human intervention needed.
