# PRD: Issue Wave 2026-10 — eight consumer lessons into the spells (#297–#299, #321–#325)

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
status: approved
created: 2026-10-04
approved_by: operator (payini), 2026-10-04, in-session plan approval
---

Related: [[development-methodology]] (the Spell Loop this runs through), [[git-conventions]]
(branch, PR and merge rules).

## Problem Statement

Eight open issues report lessons from real consumer sessions that the shipped spells do not yet
carry. #297–#299 came from a consumer session on 2026-09-28; #321–#325 were filed on 2026-10-01 by
`spell-feedback --flush`. On 2026-10-04 each target was checked against the current source:
none of the eight is already addressed.

## Users

Every Arcane consumer whose assistant runs these spells, and the operator who reads their output.

## Requirements

### Must Have

- **R-325 — Acceptance criteria vs Won't Have.** `spell-plan` gains a check that reads each acceptance
  criterion against the PRD's Won't Have list and flags a criterion that can only hold if a Won't Have
  item is done. `spell-scope`'s Quality Quick-Check runs the same check by reference.
- **R-297 — Diff the environment before the code.** `spell-bug`'s Diagnose step gains a branch for
  "it worked before" regressions where the code the symptom points at is unchanged: diff the
  dependency/platform set of the last good build against the current one, read the owning
  dependency's actual implementation and tracker, and prefer the upstream fix plus a stopgap.
- **R-298 — OTA/native alignment and store-console verification.** `spell-eas-store-deploy` states:
  publish an OTA only from a commit whose native dependency set matches the installed binary
  (`--commit-id` / that checkout), prove alignment from the `eas update` output, and bump the app
  version with any native change; every mutating console save is verified by reload and re-read
  (`EV-01`); large uploads are a human drag-and-drop; the agent never types credentials. Console
  specifics from the source session are recorded as dated observations with a re-check.
- **R-322 — Dated environment claims in the handoff.** `spell-close-session`'s `Blockers` and `Notes`
  require a date and a one-line verification command for any claim about the local environment;
  `spell-open-session` re-runs that command before repeating the claim.
- **R-299 — Private memory is not a home for lessons.** `spell-close-session` step 2b and
  `spell-feedback` Step 1 state that an assistant's private memory is never a destination for a lesson.
- **R-321 — PR-state check before push.** `spell-commit-work` step 9a checks the branch's PR state
  with the provider before pushing and stops, naming the PR, when it is merged.
- **R-324 — One closing keyword per issue.** `spell-create-pull-request` Step 4 requires one closing
  keyword per issue and forbids `Closes #A and #B`; Step 6 confirms each named issue's state after the
  merge or lists it for the operator. `git-conventions.md`'s footer example says the same.
- **R-323 — Links inside a worktree before `remove --force`.** `git-conventions.md` Post-Merge Cleanup
  warns to list and unlink junctions/symlinks before `git worktree remove --force`, scoped to what was
  observed (Windows junction, once) and tested (Linux symlink, git 2.43.0, not followed);
  `spell-close-session` step 10 points to it.

### Should Have

- A prose regression test per requirement in `test/iw-2026-10.test.ts`.

### Won't Have (this iteration)

- Any CLI/runtime code change (every requirement is spell or governance text).
- A new `MR-xx` rule in `mobile-release-standards.md` (that doc is scoped to build-tool-independent
  platform behavior; R-298's OTA rule is expo-updates behavior and belongs in the spell).
- Implementing the branch-naming rename-on-sight TODO, or filing the unfiled `FEEDBACK.md` item.
- Re-testing #323's Windows junction case (no Windows host in this sandbox).

## Constraints

- Edit only sources under `src/assets/`; regenerate root copies with `npm run fix:self-host-parity`.
- Do not change any spell's frontmatter `description` (keeps `docs/spell-catalog.json` unchanged).
- Keep `test/up04-b-handoff.test.ts`'s pinned handoff field order.
- One patch bump (`1.11.1`), one PR; the operator merges.

## Acceptance Criteria

- [ ] AC-325: `spell-plan` names the check and the flag wording; `spell-scope` 1.5 references it.
- [ ] AC-297: `spell-bug` Step 3 contains the "it worked before" branch with its three ordered actions.
- [ ] AC-298: `spell-eas-store-deploy` contains the OTA/native alignment rule with `--commit-id`, the
      `eas update` output evidence rule, the reload-and-re-read rule citing `EV-01`, the human
      drag-and-drop upload rule, and a dated observations block for the console specifics.
- [ ] AC-322: the handoff template's `Blockers` and `Notes` lines require a date and a verification
      command for environment claims; open-session re-runs it before repeating the claim.
- [ ] AC-299: close-session step 2b and feedback Step 1 contain the private-memory sentence.
- [ ] AC-321: commit-work step 9a runs a provider PR-state check before `git push` and stops on `MERGED`.
- [ ] AC-324: create-pull-request Step 4 states one keyword per issue with the forbidden form; Step 6
      confirms each issue's state after merge; git-conventions' footer example agrees.
- [ ] AC-323: git-conventions Post-Merge Cleanup carries the links warning with commands for
      PowerShell and POSIX and the observed/tested scope; close-session step 10 points to it.
- [ ] All CI gates pass: version bump, self-host parity, ADR references, spell catalog, report
      template, stale claims, lint, typecheck, build, full suite.

**Won't Have cross-check (R-325 applied to this PRD):** no criterion above requires a CLI change, an
`MR-xx` rule, the rename-on-sight work, or a Windows re-test — each is satisfiable by the spell text
alone. AC-323 records the Windows case as observed, not verified, so it does not depend on the excluded
re-test.

## Dependencies

None.

## Open Questions

None. Branch, autonomy, PR shape and #298 sourcing were decided by the operator on 2026-10-04.
