# AI Agent System Context

> **Keep this file current.** Update it at each session close via `/Spell-Close-Session`.

---

## Project Identity

| Field       | Value                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Name        | Arcane (`arcane-cli`)                                                                                 |
| Description | Arcane framework CLI — scaffold and manage governance files in consuming repositories                 |
| Repo        | github.com/codemagicianhq/arcane                                                                      |
| Branch      | main                                                                                                  |
| Tracking    | Internal — persisted in `src/assets/.arcane.json` (this repo's self-hosted source manifest, `tracking_mode: "internal"`), per ARC-032 (2026-08-22). No root `.arcane.json` exists in this checkout; spells resolve the self-hosted source manifest as documented in `spell-open-session.prompt.md`. |

---

## Current Priorities

1. **Batch-001 is down to two open items: EF-35 and EF-18.** EF-09 and docs-mode both shipped 2026-08-23 ([ARC-033](../DECISIONS.md#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components)/[ARC-034](../DECISIONS.md#arc-034--push-safety-for-sensitive-repositories)). EF-35 (secret detection) is deferred pending an ADR — its scope (a shipped, consumer-facing mechanism) is unchanged, but `codemagicianhq/arcane` itself now has GitHub-native secret scanning (alert-only) and Dependabot security updates enabled as a repo-local partial mitigation (2026-08-24/25). EF-18 is blocked on a genuine independent batch-002 submission (operator input, not effort).
2. **EF-36 (auto-merge fires on CI green with no notion of an open review round) has its ADR.** [ARC-035](../DECISIONS.md#arc-035--auto-merge-requires-a-clear-review-round) drafted and Accepted 2026-08-25: a required status check reads PR review state (not approval count — GitHub blocks self-approval and this repo has no second identity) alongside the two already on `protect main`; `spell-review`/`code-review` must post a formal `--request-changes` when a round ends with a blocker open; ARC-034's pre-push hook is extended to warn on pushes to a closed/merged PR's branch. **Not yet implemented** — the check script, hook extension, and spell updates are the new top next action. See `TODO.md`'s *PR Workflow and Prompt Integrity* section.
3. **This repo's own platform enforcement of ARC-009 was found and fixed 2026-08-24/25, in two layers that don't show up in the same place.** Repo-level settings (`allow_squash_merge`→`false`, `delete_branch_on_merge`→`true`) and, separately, the `main`-branch GitHub *Ruleset* (id `18841659`) — which a classic-branch-protection check reports nothing about at all — had `allowed_merge_methods: ["squash","rebase"]` plus a `required_linear_history` rule silently blocking merge-commits outright. Both fixed; `cicd-standards.md`'s Azure DevOps merge-type table was found stating the opposite of ARC-009 in the same sweep and corrected (`0.22.1`). See `TODO.md`'s `doctor`/`ward` item for the full finding — none of this is automated yet, so it can drift again.
4. **ARC-020 has now been amended twice, never Accepted.** ARC-030 (2026-08-21) resolved the inline-vs-separate-file question for venture/portfolio data; ARC-032 (2026-08-22) resolved it for tracking config. ARC-020 itself stays Proposed for its broader scope (operator identity, provider coordinates, repository lists). A future incremental resolution of one more slice should amend it the same way, not flip it to Accepted prematurely.
5. **`spell-sync-pull-request`** (open PR branch synchronization) remains an open MEDIUM feature in `TODO.md`, not yet planned. **Distribution-model research (2026-08-21)** — three `IDEAS.md` entries — still awaits triage.
6. **ARC-028 (concurrency and isolation model) is Accepted**, named **session workspace**. `0.22.1` is current on `main`.
7. **Branch accumulation was swept by hand 2026-08-24/25** (content-verified, not ancestry — 28 local + 28 remote of ~70 candidates deleted, the rest correctly left as genuinely unmerged or deliberate `backup/*` evidence) but the underlying structural cause (ARC-009's sanctioned rebase-and-fast-forward defeats ancestry-based cleanup tooling) is unfixed — see `TODO.md`'s merged-branch-cleanup item. This will accumulate again without the still-unbuilt idempotent sweep.
8. **The worktree-misdirect tool bug** (Edit/Write silently landing in the primary checkout instead of the active linked worktree — [journal/2026-08-22-ef-batch-closeout.md](../journal/2026-08-22-ef-batch-closeout.md)) did **not** recur 2026-08-24/25 across roughly a dozen edits, each independently verified via `grep` against both trees. Keep verifying anyway — a clean run is not evidence the class of bug is gone, only that this session didn't hit it. A **different**, same-family mistake did recur this session: continuing to commit on an already-merged branch instead of cutting a fresh one from `origin/main`, twice, the second time only after having just corrected the first instance. See [journal/2026-08-24-merge-policy-enforcement-and-branch-cleanup.md](../journal/2026-08-24-merge-policy-enforcement-and-branch-cleanup.md) for both.

---

## Next Session Handoff

> Auto-generated by spell-close-session. Consumed by spell-open-session. Do not edit manually.
> Generated: 2026-08-24

- **Active task:** None in progress. This session's work is fully merged: the drift fix ([PR #73](https://github.com/codemagicianhq/arcane/pull/73)), the repo-settings fix ([PR #74](https://github.com/codemagicianhq/arcane/pull/74)), the ruleset fix (applied directly via `gh api`, no PR), the `cicd-standards.md` contradiction fix + `0.22.1` ([PR #79](https://github.com/codemagicianhq/arcane/pull/79)), and three Dependabot security PRs (#76, #77, #80). This close-session commit itself is the only thing left to land.
- **Last completed step:** Verified zero open Dependabot alerts remain (`gh api repos/codemagicianhq/arcane/dependabot/alerts`) after the operator merged PRs #76/#77/#80. Writing this handoff and the session journal now.
- **Next concrete action:** Write the ADR for [EF-36](../docs/intake/batch-001/EF-36.md) — unchanged priority across three sessions now. It must settle the authoritative "a review round is open" signal, whether auto-merge is narrowed or removed, and how the silent stranded-commit mode is made loud. `allow_auto_merge` is confirmed `false` as of this session (was `true` at the 2026-08-23 incident) — the immediate risk is lower, the design question is not resolved.
- **Active files:** `journal/2026-08-24-merge-policy-enforcement-and-branch-cleanup.md`, `ai-context/system-prompt-context.md`, `TODO.md` — staged on this session-close branch, not yet merged.
- **Branch:** `docs/session-close-2026-08-24`.
- **Blockers:** None.
- **Pending Verification:** None. Every dispatched item this session was independently confirmed: PR merges via the provider's own `state`/`mergedAt` fields; the `cicd-standards.md` content specifically via direct blob-hash read of `origin/main` (an earlier check of the same thing produced a false empty result from a shell-cwd slip in the check itself, caught and redone before being trusted); Dependabot alerts via a fresh API query showing zero open.
- **Notes:** **This session ran in a linked worktree** (`.claude/worktrees/spell-open-session-901c71`), and cleanup is owed to the primary checkout — which is already on `main` this time, so no branch switch is needed there first: `git worktree remove .claude/worktrees/spell-open-session-901c71` then `git fetch --prune origin`, after the same-vantage-point check. **A GitHub Ruleset is a separate system from classic branch protection** and won't show up in `/branches/{branch}/protection` — check `gh api repos/{owner}/{repo}/rulesets` too before ever concluding a repo has no protection. **A flaky test surfaced once under unusually heavy sequential load** (`test/update.test.ts`'s "preserves edited continuity files byte-for-byte" hit its 5s timeout during a full-suite run late in this session; passed in 217ms isolated) — not treated as a tracked defect, since it never reproduced and the load was self-induced by many consecutive full-suite runs in one sitting, but don't be surprised if it recurs under similar conditions. **An out-of-scope operational action was performed this session at the operator's explicit request and is deliberately not detailed in any Arcane doc** — see the journal's Prompt Context for the one-line acknowledgment; this is intentional, not a gap.

> ✓ Consumed: 2026-08-25
