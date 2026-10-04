# Architecture: Issue Wave 2026-10

Related: [PRD](PRD.md), [[development-methodology]].

## Decisions

1. **Text-only change, sources only.** Every edit lands in `src/assets/.arcane/spells/*.md` or
   `src/assets/.arcane/governance/git-conventions.md`. Root copies, shims and fragments are regenerated
   by `npm run fix:self-host-parity`; nothing under the root `.arcane/` is hand-edited.
2. **One sequential lane, not parallel worktrees.** `spell-close-session.md` is touched by R-322,
   R-299 and R-323, so the footprints overlap (ARC-028 R4). Stories run in one workspace in the order
   below.
3. **Reference, don't copy (D8).** `spell-scope` points to `spell-plan`'s check; `spell-close-session`
   step 10 points to git-conventions' links warning; the reload-and-re-read rule cites `EV-01` rather
   than restating it.
4. **R-298 stays in the spell.** `mobile-release-standards.md` is scoped to build-tool-independent
   platform behavior (its own introduction), so the expo-updates OTA rule is added to the spell's
   Cross-platform lessons and no `MR-15` is created. This corrects the session plan on the record.
5. **R-323 scope comes from a probe, not the issue alone.** Linux, git 2.43.0: a worktree containing a
   symlink to a 194-entry directory was removed with `git worktree remove --force`; the target still
   held 194 entries afterwards. The warning therefore names the Windows junction case as observed once,
   and the POSIX symlink case as tested-not-followed, and recommends unlinking first on every platform
   because the check is cheap and the failure is destructive.

## Components touched

| File | Requirement |
|---|---|
| `spells/spell-plan.md` | R-325 |
| `spells/spell-scope.md` | R-325 |
| `spells/spell-bug.md` | R-297 |
| `spells/spell-eas-store-deploy.md` | R-298 |
| `spells/spell-close-session.md` | R-322, R-299, R-323 (pointer) |
| `spells/spell-open-session.md` | R-322 |
| `spells/spell-feedback.md` | R-299 |
| `spells/spell-commit-work.md` | R-321 |
| `spells/spell-create-pull-request.md` | R-324 |
| `governance/git-conventions.md` | R-324, R-323 |
| `test/iw-2026-10.test.ts` (new) | all |

## Testing strategy

One vitest file, `test/iw-2026-10.test.ts`, using `test/helpers/prose.ts`
(`expectProseToContain`, `blockContaining`) so assertions survive re-wrapping. Each story's assertion is
run red before its edit and green after. The full suite plus every CI `check:*` gate runs at integration.
