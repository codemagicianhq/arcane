---
name: Spell — Test
description: Run tests, validate coverage thresholds, and generate test evidence for a completed story or feature
argument-hint: Story ID or test scope (e.g., "STORY-003" or "all")
agent: agent
---

## Executive Summary

- This prompt runs tests, validates coverage against thresholds, and generates evidence artifacts.
- Used after `spell-implement` to verify quality before `spell-review`.
- Enforces the testing standards from ADR-050 (80% line / 95% critical path coverage).
- See [[governance/testing-standards|Testing Standards]] for framework details.

---

Run test suites and validate quality for the specified scope.

Use these files for context:

- [governance/testing-standards.md](../../governance/testing-standards.md) — Frameworks, thresholds, evidence requirements
- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop context
- The feature's `stories.json` — for acceptance criteria to validate

Workflow:

1. **Identify test scope**:
   - If a story ID is given, test only the files changed by that story.
   - If "all" is given, run the full test suite.
   - Determine the tech stack and corresponding test framework from testing-standards.md.

2. **Run tests**:
   - The spell is framework-agnostic — execute the test command for whatever stack the project uses. Example runners by ecosystem:
     - JS/TS: `npm test` / `vitest run` / `jest`
     - .NET: `dotnet test`
     - Python: `pytest`
   - Capture output including pass/fail counts and any error messages.
   - Run coverage analysis if the framework supports it.

3. **Validate coverage**:
   - Compare against the thresholds configured in testing-standards.md. These percentages are the project's choice — use whatever values that doc defines, not a universal law. Typical defaults:
     - Line coverage minimum (commonly ~80%).
     - Critical path coverage (commonly ~95% for auth, payments, data mutations).
   - If below threshold, identify uncovered lines and recommend specific tests to add.

4. **Check acceptance criteria**:
   - Map each acceptance criterion from the story to a specific test.
   - Flag any acceptance criteria without corresponding test coverage.

5. **Generate test evidence**:
   ```markdown
   ## Test Evidence — [Story ID or Scope]

   **Date:** [timestamp]
   **Framework:** [e.g. Vitest / Jest / xUnit / pytest / etc.]

   ### Results
   - Tests passed: [N]
   - Tests failed: [N]
   - Tests skipped: [N]
   - Line coverage: [N%]
   - Branch coverage: [N%]

   ### Acceptance Criteria Coverage
   | Criterion   | Test        | Status            |
   | ----------- | ----------- | ----------------- |
   | [criterion] | [test name] | PASS/FAIL/MISSING |

   ### Uncovered Areas
   - [file:lines with no coverage]

   ### Recommendations
   - [Additional tests needed]
   ```

6. **Update stories.json** — if testing a specific story, update the `testEvidence` field.

7. **Report** — present the test evidence and recommend next steps:
   - All pass + coverage met → recommend `spell-review`.
   - Failures found → recommend fixing via `spell-implement`.
   - Coverage gap → recommend adding tests before review.

Rules:
- Never mark a story as passing if tests fail or coverage is below the threshold.
- Include actual test output, not just summaries.
- If no test framework is set up, flag this as a blocker and recommend setup.
- Critical path code (auth, payments, data mutations) must meet the 95% threshold.
