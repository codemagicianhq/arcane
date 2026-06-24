---
name: Spell — Bug
description: Document, diagnose, and fix a bug — files a tracker work item (per tracking_mode), traces root cause, implements fix, verifies, and commits
argument-hint: Bug description (e.g., "Session detail dialog shows 404 when clicking a mock session")
agent: agent
---

## Executive Summary

- This prompt handles the full bug lifecycle: document → track → diagnose → fix → verify → close.
- It records the bug in your configured tracker (external provider) or `TODO.md` (internal mode) and links the fix commit to it.
- Output is a working fix with tests, committed using Conventional Commits format.
- **When to use:** you have a concrete defect — wrong/broken behavior versus expected. If the report is actually a request for *new* behavior, route to `spell-suggest-feature` instead. For small non-blocking cleanups discovered along the way, capture them with `spell-todo`.
- See [[governance/development-methodology|Development Methodology]] for full Spell Loop reference.

---

Document, diagnose, and fix the described bug.

Use these files for context (each is optional — if a file is missing, proceed and note the assumption you fell back on):

- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop methodology **and tracker-provider specifics** (which tracker, work-item types, commit-link syntax). If missing, default to `tracking_mode: internal` and track in `TODO.md`.
- [DECISIONS.md](../../DECISIONS.md) — Existing ADRs to respect. If missing, proceed without ADR constraints.
- [governance/testing-standards.md](../../governance/testing-standards.md) — Coverage thresholds. If missing, match the test conventions already present in the repo.

Workflow:

1. **Capture the bug** — gather these details from the user (ask if missing):

   | Field | Description |
   |-------|-------------|
   | **Summary** | One-line description of the bug |
   | **Reproduction steps** | Numbered steps to reproduce |
   | **Expected behavior** | What should happen |
   | **Actual behavior** | What actually happens (include error messages, HTTP codes, screenshots) |
   | **Severity** | Critical / High / Medium / Low |
   | **Affected component** | File path, page, API route, or module |
   | **Discovery context** | How was this found? (smoke test, user report, monitoring) |

2. **Record the bug** — file it in whatever tracker this repo uses. Resolve `tracking_mode` from `.arcane.json` (or the repo's feature/PRD frontmatter); if unset, **ask** rather than assuming.

   - **`tracking_mode: internal`** (or no tracker configured) — append the bug to `TODO.md` (create it if absent) using the captured fields from Step 1. Use the `TODO.md` entry's identifier as `{WORK_ITEM_ID}`. No external tooling required.
   - **`tracking_mode: external`** — file a work item in the configured provider. Read [governance/development-methodology.md](../../governance/development-methodology.md) for the provider, work-item type, and required fields; do **not** assume Azure DevOps. Extract the returned id as `{WORK_ITEM_ID}`.

     *Azure DevOps is one such provider — if and only if `.arcane.json` / methodology names it (and the `az` CLI is available), file it like so. Resolve `{ADO_ORG}` and `{ADO_PROJECT}` from `.arcane.json`; ask if unset:*
     ```bash
     az boards work-item create \
       --type Bug \
       --title "[Bug] {SUMMARY}" \
       --description "{formatted description with repro steps}" \
       --org https://dev.azure.com/{ADO_ORG} \
       --project {ADO_PROJECT} \
       --output json
     ```

   If the configured tooling is unavailable or the user prefers manual tracking, fall back to the `TODO.md` entry above and continue.

3. **Diagnose** — trace the code path to find the root cause:
   - Read the affected component and its dependencies.
   - Identify the exact line(s) where the bug manifests.
   - Determine *why* the bug exists (data mismatch, missing case, race condition, etc.).
   - Document the root cause concisely.

4. **Implement the fix** — write the minimal code change:
   - Fix only the bug — no refactoring, no feature additions.
   - Follow existing code patterns and conventions.
   - If the fix touches a public interface, check all callers.

5. **Add or update tests** — ensure the bug cannot regress:
   - Write a test that reproduces the bug (fails without the fix).
   - Verify existing tests still pass.
   - Run the full test suite: `npx vitest run` (or project-specific command).

6. **Verify the fix** — confirm the bug is resolved:
   - Run the reproduction steps from Step 1 — they should now succeed.
   - Check for side effects in related functionality.
   - If applicable, rebuild and restart: `npm run build`.

7. **Commit** — stage and propose a commit message for approval:
   ```
   fix({scope}): {SUMMARY}

   {Root cause explanation}

   {What was changed and why}

   {WORK_ITEM_LINK}
   ```
   Follow Conventional Commits format. For `{WORK_ITEM_LINK}`, use the commit-link convention your tracker expects (per [governance/development-methodology.md](../../governance/development-methodology.md)) — e.g. `Fixes AB#{WORK_ITEM_ID}` for Azure DevOps, `Fixes #{WORK_ITEM_ID}` for GitHub Issues, or a plain `Refs TODO.md` for internal mode. Wait for user approval before executing `git commit`.

8. **Close out the tracker** — update the work item's state to reflect the fix:
   - **`internal`** — mark the `TODO.md` entry as resolved (check it off / move to a Done section).
   - **`external`** — transition the work item to its resolved/done state via the provider. For Azure DevOps specifically (resolve `{ADO_ORG}` from `.arcane.json`):
     ```bash
     az boards work-item update \
       --id {WORK_ITEM_ID} \
       --state Resolved \
       --org https://dev.azure.com/{ADO_ORG} \
       --output json
     ```
     For other providers, follow [governance/development-methodology.md](../../governance/development-methodology.md).

Rules:
- Fix only the reported bug. Do not bundle unrelated improvements.
- If the report turns out to describe *new* or *changed* behavior rather than a defect, stop and route the user to `spell-suggest-feature`. Capture any non-blocking follow-ups you notice via `spell-todo` rather than expanding this fix.
- Every fix must have a test that would have caught the bug.
- Present the commit message for human approval — never auto-commit.
- If the root cause is unclear, present your diagnosis and ask for confirmation before implementing.
- If the fix is risky (touches shared infrastructure, auth, or data), flag it explicitly.
