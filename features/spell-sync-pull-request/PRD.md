# PRD: `spell-sync-pull-request`

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
---

## Problem Statement

An open PR that falls behind its target branch currently has no dedicated, safe workflow. Two existing
spells hit this exact gap and both say the same thing — stop and ask the human:

- `spell-create-pull-request.prompt.md` Step 0.6: "On conflicts: **STOP**, list conflicting files, ask
  the user to resolve; never push a branch that will produce a merge conflict on the target."
- `spell-ship.prompt.md` Step 2: "On merge conflicts: STOP and ask the user to resolve them. Do not
  attempt to auto-resolve."

That's the right call for a genuinely ambiguous conflict, but it means every clean-but-stale PR (no real
conflict, target just moved) still gets kicked to a human, and there's no single place that codifies the
actually-safe parts of this workflow: creating a recoverable ref before a risky rebase, applying the
repo's real merge policy, verifying a force-push landed the *expected* commit (not just that it didn't
error), and telling a genuinely ambiguous conflict apart from a mechanically resolvable one instead of
guessing either way.

## Target Users

Any agent or developer maintaining an open PR in an Arcane-governed repo (GitHub or Azure DevOps) whose
branch has fallen behind its target — the exact situation `spell-create-pull-request` and `spell-ship`
already detect but don't have a dedicated recovery path for.

## Requirements

### Must Have

- Resolve the active PR, its source branch, base branch, and expected head SHA before touching anything.
- Require a clean worktree before starting — refuse on any uncommitted change.
- Create a recoverable ref (e.g. a tag or backup branch pointing at the pre-rebase HEAD) before any
  history-rewriting operation, so a bad rebase is never a one-way door.
- Apply the repository's actual merge policy (`git-conventions.md`'s declared ladder: merge no-fast-forward
  or rebase-and-fast-forward; never squash) rather than assuming rebase is always correct.
- Distinguish two conflict outcomes explicitly, never collapse them into one:
  - **Mechanically resolvable** (both sides made the identical change, or one side is a strict superset
    with no semantic divergence) — resolve and continue, never silently drop either side's content.
  - **Genuinely ambiguous** (the same lines changed with different intent) — stop, name the exact
    conflicting files and hunks, and hand off to a human. Never guess.
- Re-run this repo's own project/version-bump gates (`npm run typecheck`/`lint`/`test`, `check:version-bump`
  where applicable) after any replay, before pushing — a clean rebase can still produce a broken tree.
- Push with `--force-with-lease`, never bare `--force` — if the lease is rejected (the remote moved again
  since the fetch this sync started from), re-fetch and re-evaluate from scratch rather than retrying
  blindly or escalating to `--force`.
- Verify the provider (GitHub or Azure DevOps) reports the *expected* new head SHA and a mergeable state
  after the push — a push succeeding is not the same as the PR actually reflecting it (the same
  "dispatched is not succeeded" distinction EF-21 already established for close-session).
- `spell-create-pull-request` Step 0.6 and `spell-ship` Step 2 each gain a pointer to this spell as the
  recovery path for exactly the conflict case they already detect and stop on.

### Should Have

- Detect the "clean sync" case (target moved, but replay is conflict-free) and complete it without ever
  invoking the ambiguous-conflict path at all — the common case should be the fast path, not a special
  case of conflict handling.

### Won't Have (this iteration)

- No automated resolution of genuinely divergent logic conflicts — that boundary is deliberately
  conservative (see Must Have above); a wrong auto-resolution is worse than an extra human round-trip.
- No new CLI command or code module — this ships as a spell (prompt-driven workflow), matching every
  other lifecycle spell in this codebase; enforcement is string-assertion tests on the prompt content
  (ARC-023), not executable logic.

## Constraints

- **Technical:** `git rebase`'s replay semantics (conflicts surface per-commit, not per-branch); GitHub
  (`gh`) vs Azure DevOps (`az repos`) have different post-push verification calls, reusing
  `spell-create-pull-request`'s own Step 2 provider-detection table rather than re-deriving it (D8).
- **Security:** never `--force` (only `--force-with-lease`); never discard the recoverable pre-rebase ref
  automatically — leave it for the human to clean up once they've confirmed the sync landed correctly.
- **Governance:** the repository's real merge-strategy ladder is a fixed, non-configurable policy
  (`git-conventions.md` § Merge Strategy by Repo Risk) — this spell reads and applies it, never invents
  its own preference.

## Acceptance Criteria

- [ ] Clean sync: target moved, replay is conflict-free, gates pass, push succeeds, provider confirms the
      new head SHA — no human involvement.
- [ ] Conflicting rebase: a mechanically resolvable conflict (identical change on both sides) is resolved
      and the sync completes, with the resolution disclosed in the final report.
- [ ] Stale lease rejection: `--force-with-lease` is rejected because the remote moved again after this
      sync's own fetch — the spell re-fetches and re-evaluates from scratch rather than retrying blindly.
- [ ] Ambiguous-conflict handoff: a genuinely divergent conflict stops the spell, names the exact files
      and hunks, and hands off to the human — never guesses a resolution.
- [ ] GitHub/ADO post-push verification: after a successful push, the spell confirms via the provider CLI
      that the PR now reports the expected head SHA and a mergeable state, for both providers.
- [ ] `spell-create-pull-request.prompt.md` and `spell-ship.prompt.md` each reference this spell at their
      existing conflict-stop points.

## Dependencies

- `git-conventions.md`'s Merge Strategy by Repo Risk section (the declared ladder this spell enforces).
- `spell-create-pull-request.prompt.md`'s Step 2 provider-detection table (reused, not duplicated).
- No new code module or CLI surface — registered in `src/modules/registry.ts` under the existing
  `spells-delivery` component bundle, alongside `spell-create-pull-request` and `spell-address-review`.

## Open Questions

- None blocking. The Azure DevOps post-push verification call (`az repos pr show`) follows the same
  documented-but-not-live-verified caveat already disclosed for BC-17's ADO path — this repo has no ADO
  remote to test against.
