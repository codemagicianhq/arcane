---
name: Spell — Implement
description: Autonomous implementation loop — pick a story from stories.json, build it, test it, commit it, repeat until all stories pass
argument-hint: Path to stories.json or paste story context (optional - uses current directory stories.json by default)
agent: agent
---

## Executive Summary

- This is the core autonomous loop of the Spell Loop methodology.
- Each iteration: pick a story → implement → run tests → commit if passing → update stories.json → loop.
- Uses fresh context per iteration — only stories.json, progress.txt, and git history carry forward.
- See [[governance/development-methodology|Development Methodology]] for full Spell Loop reference.

---

Run the autonomous implementation loop for the current feature.

Use these files for context:

- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop methodology
- [governance/testing-standards.md](../../governance/testing-standards.md) — Testing frameworks and coverage requirements
- The feature's `architecture.md` — for tech decisions and patterns
- The feature's `stories.json` — for the work breakdown
- The feature's `progress.txt` (in `features/{slug}/`, if present) — accumulated learnings from prior iterations; read it before each iteration and append new learnings as the loop proceeds

Workflow (loop until all stories pass):

0. **Sync workspace** — before any code changes, ensure the workspace is current:
   ```bash
   git fetch --prune origin
   git checkout main && git pull --ff-only
   ```
   If `pull --ff-only` fails, halt and report — manual rebase is needed.

1. **Load stories.json** — locate the feature folder from the current branch:
   ```bash
   # Derive feature folder from branch name (works for thor/feat/541-phase-2a or thor/feat/phase-2a)
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
