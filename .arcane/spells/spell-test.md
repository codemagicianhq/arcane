---
name: Spell — Test
description: Run tests, validate coverage thresholds, and generate test evidence for a completed story or feature
claude_description: Use PROACTIVELY to validate a completed story or feature against coverage thresholds before marking it done.
argument-hint: Story ID or test scope (e.g., "STORY-003" or "all")
agent: agent
---

## Executive Summary

- This prompt runs tests, validates coverage against thresholds, and generates evidence artifacts.
- Used after `spell-implement` to verify quality before `spell-review`.
- Enforces the testing standards from ADR-050 (80% line / 95% critical path coverage).
- For anything a browser renders, step 4a adds a check in a real browser (captures at three widths, in both
  color schemes and with reduced motion, plus a console read), because a passing suite cannot see a page
  that renders blank.
- See [[.arcane/governance/testing-standards|Testing Standards]] for framework details.

---

Run test suites and validate quality for the specified scope.

Use these files for context:

- [governance/testing-standards.md](../../.arcane/governance/testing-standards.md) — Frameworks, thresholds, evidence requirements
- [governance/development-methodology.md](../../.arcane/governance/development-methodology.md) — Spell Loop context
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

4a. **Visual verification (HTML and UI deliverables)** — run this step when the scope changes anything a
   browser renders: a page, a template, a stylesheet, a UI component. A passing suite is not evidence that
   a page renders; a page cut short arrives blank, and only a browser shows it. For each changed page or
   screen:
   - **Serve it over local HTTP, never `file://`,** with the headers production sends: the project's own
     dev or preview server, or a static server configured with the same `Content-Type` (adding no charset
     production does not send) and the same security policy. Check that the page declares its character
     set (`<meta charset="utf-8">` within its first 1024 bytes): a page that does not can read correctly
     from disk and still garble when served without a charset, and a content security policy sent as a
     response header never applies to a `file://` load.
   - **Capture it headless at 1440, 390 and 320 px wide, in dark and in light, each with motion allowed and
     with reduced motion:** twelve full-page captures per page. Before each capture, reduced motion
     included, wait until `document.getAnimations()` reports none whose `playState` is `"running"`, with a
     time limit; a page that still moves content under reduced motion (a slide, a zoom, parallax) is a
     finding of its own, while a fade or a progress indicator may stay. For a page that
     animates without end, capture with `page.screenshot({ animations: "disabled" })` instead; the evidence
     says which method was used. Any headless browser that can set the viewport and emulate both media
     features will do; in Playwright that is `page.setViewportSize`,
     `page.emulateMedia({ colorScheme, reducedMotion })` and `page.screenshot({ fullPage: true })`.
   - **Read the console for every capture.** Script errors, uncaught exceptions and content-security-policy
     violations each count, and the bar is zero. In Playwright, listen to `page.on("console")` and
     `page.on("pageerror")` before the page loads, so nothing logged during the load is missed.
   - **Compare before and after.** Capture the same matrix from the base branch, or from the last release,
     in the same session, on the same machine and browser, with time and data held still (fixture data, a
     fixed clock such as Playwright's `page.clock`), and compare each capture with its counterpart. An
     unchanged page then captures identically, so a difference the change did not intend is a finding,
     like a failing test. A page new in this change has no before set: review its after set by eye.
   - **Keep the captures in the design record:** the feature's folder, `features/<feature>/visual/YYYY-MM-DD/`
     (outside a feature, `assets/screenshots/YYYY-MM-DD/`), named `<page>-<width>-<scheme>-<motion>.png` and
     linked from the story's `testEvidence`. Keep each after capture that differs from its before capture,
     that before capture, and one reference capture per page; record the rest by hash, noting any
     dimension the page does not respond to (dark and light on a page with one color scheme). Never keep a
     capture that shows a secret, a token or personal data (universal agent rules, Screenshot Curation):
     capture with fixture data, or mask the region with `page.screenshot({ mask: [locator] })`. In a
     repository whose `.arcane.json` sets `content_sensitivity: "sensitive"`, keep no captures: record each
     capture's verdict and a sanitized summary with no recoverable detail (universal agent rules, Sensitive
     Repositories).
   - **No headless browser available:** say so and record the visual check as `NOT RUN`, never `PASS`; the
     story stays open until someone runs it.
   - Enforcement: structured spell gate (ARC-023) — this spell's Rules keep a story with a rendered
     deliverable from passing until this step's result is recorded; no executable check reads the
     captures.

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

   ### Visual Verification (step 4a, when the scope renders in a browser)
   - Served from: [local URL, with production's headers; never file://]
   - Captures: [12 per page: 1440/390/320 px × dark/light × motion/reduced, and the wait method]; kept in [design-record path]: [differing pairs, one reference per page]; the rest by hash
   - Console: [0 errors, or each error and policy violation]
   - Before/after: [no unintended difference, or each one]
   - Status: PASS / FAIL / NOT RUN — [reason]

   ### Uncovered Areas
   - [file:lines with no coverage]

   ### Recommendations
   - [Additional tests needed]
   ```

6. **Update stories.json** — if testing a specific story, update the `testEvidence` field.

7. **Report** — present the test evidence and recommend next steps:
   - All pass + coverage met (and step 4a passed, where it applies) → recommend `spell-review`.
   - Failures found → recommend fixing via `spell-implement`.
   - Coverage gap → recommend adding tests before review.

Rules:
- Never mark a story as passing if tests fail or coverage is below the threshold.
- Never mark a story whose scope a browser renders as passing until step 4a's result is recorded (its
  captures, or in a sensitive repository their sanitized summary); a `NOT RUN` visual check keeps it open.
- Include actual test output, not just summaries.
- If no test framework is set up, flag this as a blocker and recommend setup.
- Critical path code (auth, payments, data mutations) must meet the 95% threshold.
