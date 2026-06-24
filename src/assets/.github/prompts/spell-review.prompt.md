---
name: Spell — Review
description: Adversarial code review — must find issues, validate architecture compliance, and check security
argument-hint: PR number, branch name, or file paths to review
agent: agent
---

## Executive Summary

- This prompt performs an adversarial code review — "looks good" is not acceptable.
- The reviewer must explicitly cover every lens — correctness, security, performance, tests, naming/clarity, architecture — and state "no issues" for any lens that is clean. There is no finding quota: zero findings is a valid outcome on a clean or small diff.
- Checks architecture compliance, test coverage, security, and coding standards.
- See [[governance/development-methodology|Development Methodology]] for the adversarial review pattern.

---

Perform an adversarial review of the specified code changes.

Use these files for context:

- [governance/development-methodology.md](../../governance/development-methodology.md) — Adversarial review requirements
- [governance/testing-standards.md](../../governance/testing-standards.md) — Coverage thresholds to validate
- [DECISIONS.md](../../DECISIONS.md) — ADRs to check compliance against
- [security/threat-model.md](../../security/threat-model.md) — Security controls to validate
- The feature's `architecture.md` — tech decisions that code must follow

Workflow:

1. **Gather the diff** — get the full set of changes being reviewed:
   - `git diff main...HEAD` for branch reviews.
   - Specific file paths if provided.
   - PR diff if a PR number is given.

2. **Architecture compliance** — for each changed file:
   - Does it follow the architecture decisions in architecture.md?
   - Does it respect existing ADRs?
   - Are there unauthorized framework or pattern deviations?

3. **Code quality** — check for:
   - Naming conventions (per project standards).
   - Error handling (appropriate, not excessive).
   - Code duplication (DRY violations).
   - Complexity (functions too long, too many parameters).
   - Dead code, commented-out code, debug statements.

4. **Test coverage** — validate:
   - New code has corresponding tests.
   - Coverage meets thresholds per testing-standards.md.
   - Edge cases are tested (nulls, empty collections, boundaries).
   - No test stubs or skipped tests without justification.

5. **Security review** — check for OWASP Top 10 issues:
   - Injection vulnerabilities (SQL, XSS, command injection).
   - Authentication/authorization gaps.
   - Sensitive data exposure.
   - Insecure dependencies.

6. **Generate review report**:
   ```markdown
   ## Code Review — [Feature/Branch Name]

   **Reviewer:** [Agent name]
   **Date:** [timestamp]

   ### Coverage Summary

   One row per coverage lens. Verdict is `PASS` for a clean lens (note "no issues"),
   `WARN` for non-blocking findings, `FAIL` for a blocker. Reference the relevant
   finding IDs (`R1`, `R2`, …) in the Notes column.

   | Lens            | Verdict (PASS/WARN/FAIL) | Notes                                |
   | --------------- | ------------------------ | ------------------------------------ |
   | Correctness     | [PASS/WARN/FAIL]         | [no issues / refs to R#]             |
   | Security        | [PASS/WARN/FAIL]         | [no issues / refs to R#]             |
   | Performance     | [PASS/WARN/FAIL]         | [no issues / refs to R#]             |
   | Tests           | [PASS/WARN/FAIL]         | [no issues / refs to R#]             |
   | Naming/Clarity  | [PASS/WARN/FAIL]         | [no issues / refs to R#]             |
   | Architecture    | [PASS/WARN/FAIL]         | [no issues / refs to R#]             |

   ### Findings

   Give each finding a stable ID (`R1`, `R2`, …) so it can be referenced in follow-ups and in `spell-address-review`.

   #### HIGH Severity
   - **R1** — [Finding with file:line reference]

   #### MEDIUM Severity
   - **R2** — [Finding with file:line reference]

   #### LOW Severity
   - **R3** — [Finding with file:line reference]

   ### Architecture Compliance
   - [Compliant / Minor deviation / Major violation]

   ### Test Coverage Assessment
   - [Coverage % and gap analysis]

   ### Security Assessment
   - [OWASP checklist results]

   ### Verdict
   - [ ] APPROVE — no critical issues
   - [ ] REQUEST CHANGES — critical issues found (list blockers)
   - [ ] DEFER — needs human decision on [topic]

   ### Backlog Items
   - [Findings outside scope of this change — track separately]
   ```

7. **Save report to disk** — write the review report to the feature folder's `assessments/` directory:
   ```bash
   FEATURE_FOLDER="features/$(git symbolic-ref --short HEAD | sed 's|.*/feat/||')"
   REPORT_PATH="$FEATURE_FOLDER/assessments/review-$(date +%Y-%m-%d).md"
   mkdir -p "$FEATURE_FOLDER/assessments"
   # Write the full review report to $REPORT_PATH
   ```
   If the branch doesn't follow `feat/{id}-{slug}`, ask the operator for the feature folder path.
   Confirm the saved path to the user.

8. **Present findings** — show the review to the user with a clear recommendation.

9. **Write back to the pull request** — when a PR exists for these changes, sync a short verdict plus a findings summary (verdict + finding counts/IDs + a pointer to the saved report) into the PR body/description. Use provider-agnostic phrasing that works for either GitHub or Azure DevOps. Mark it clearly as a snapshot at review time, and fall back to a top-level PR comment if the description can't be updated.

Rules:
- **Cover every dimension, not a finding count.** You MUST explicitly address each lens — correctness, security, performance, tests, naming/clarity, architecture — and state "no issues" for any lens that is clean. There is no minimum number of findings: zero findings is a valid outcome on a clean or small diff. The mandate is coverage of effort, not a count of findings — never fabricate issues to hit a quota.
- **Never rubber-stamp.** Every review must include substantive analysis across all dimensions.
- **Classify severity honestly.** Don't inflate LOW findings to pad the report.
- **Escalate architecture-level flaws.** If the review surfaces deep design or architecture problems (not line-level fixes), recommend routing them to `spell-architect` rather than trying to patch them inline.
- **Separate concerns.** Don't block a PR for issues unrelated to the current change — add them to backlog.
- **Check for bias.** If you wrote the code being reviewed, flag the conflict and recommend a different agent review.
