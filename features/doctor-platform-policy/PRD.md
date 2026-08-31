---
status: accepted
tracking_mode: internal
source_intake: TODO.md T11 (doctor/ward platform-policy verification), absorbing T12(c)
---

# PRD — `doctor` Platform-Policy Verification

## Problem

`git-conventions.md` declares a merge-strategy ladder (Merge no-fast-forward + Rebase-and-fast-forward
sanctioned; Squash and Semi-linear merge never sanctioned), but nothing verifies the *live* platform
setting actually matches it. This is paper-vs-enforced governance drift, and it has already bitten this
exact repo twice:

1. **2026-08-24/25, Arcane's own GitHub repo.** The "protect main" ruleset (id `18841659`) had drifted:
   `allowed_merge_methods` was `["squash","rebase"]` (permitting the disallowed strategy, missing the
   sanctioned `merge`), and a separate `required_linear_history` rule silently blocked merge-commit PRs
   outright regardless of what `allowed_merge_methods` said — an interaction between two independent
   ruleset rules that inspecting either one alone would miss. Found only by reading the ruleset's raw
   JSON by hand.
2. **The same investigation found a false negative in the obvious check.** `GET
   /repos/{owner}/{repo}/branches/main/protection` (GitHub's classic branch-protection endpoint)
   returned 404 "Branch not protected" for this exact repo, despite strong Rulesets-based enforcement
   being active — confirmed live again while researching this PRD (`gh api
   repos/codemagicianhq/arcane/branches/main/protection` → 404, same session, same repo, current
   ruleset now healthy). The classic endpoint simply does not see the newer Rulesets system at all. A
   `doctor` check built against that endpoint alone would report every Rulesets-protected repo as
   unprotected.

Azure DevOps has the equivalent gap: a repo's "Limit merge types" branch policy can independently permit
squash even when `git-conventions.md`'s ADO section says not to, and nothing currently checks it.

## Requirements

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | Detect the git hosting provider from the actual remote, not from tracking config | Reuses `push-safety.ts`'s existing `pushTargets()` remote-URL reading; parses `github.com` and `dev.azure.com`/`*.visualstudio.com` URL shapes; no provider detected → check skips silently (nothing to verify) |
| R2 | GitHub: query Rulesets, never the classic protection endpoint alone | `gh api repos/{owner}/{repo}/rulesets` (list) + `gh api repos/{owner}/{repo}/rulesets/{id}` (detail) per active branch ruleset; a 404 from the classic endpoint must never be reported as "unprotected" when an active ruleset exists |
| R3 | Detect the `required_linear_history` × `allowed_merge_methods` cross-rule interaction | When `required_linear_history` is present, `merge` is effectively blocked regardless of `allowed_merge_methods` — computed as its own pure, unit-testable function, not folded silently into a single boolean |
| R4 | Compare the *effective* (post-interaction) allowed methods against the declared ladder | Sanctioned: `merge`, `rebase`. Never sanctioned: `squash`. A missing sanctioned method or a present disallowed method both fail the check, each named explicitly in the message |
| R5 | Azure DevOps: check the "Limit merge types" branch policy | `az repos policy list` scoped to the target branch; same effective-vs-declared comparison as R4. **Not live-verified** — this repo has no ADO remote to test against; implemented from documented API shape, disclosed as such in code comments |
| R6 | Report-only — never auto-mutate | `doctor` only ever reports; fixing a platform policy is a platform-settings mutation, explicitly outside this repo's own standing delegation grant regardless of which epic touches it |
| R7 | Fail gracefully, non-blocking | Missing/unauthenticated CLI (`gh`/`az`), network error, or unrecognized provider all degrade to a `blocking: false` warning with a concrete next step — never crash `doctor`, never a hard failure for something outside the operator's local environment |

## Constraints

- No code path may call anything that mutates repository or organization settings (ADR scope: this is
  explicitly a report-only feature, matching `doctor`'s existing pattern of warnings with suggested
  fixes rather than automated remediation for anything platform-level).
- The rule-interpretation logic (R3, R4, R5's comparison) must be pure functions taking already-fetched
  JSON, independently unit-testable with fixture data — the actual `gh api`/`az repos policy list`
  network calls are a thin, separately-untested wrapper, matching this repo's existing style split
  between logic and I/O (e.g. `push-safety.ts`'s `isHookEnforced` vs. its callers).

## Dependencies

- `src/modules/push-safety.ts`'s `pushTargets()` for remote URL discovery (reused, not duplicated).
- `gh` CLI (already a soft dependency of this codebase's own dogfooding and CI) for the GitHub path.
- `az` CLI for the Azure DevOps path — genuinely optional; its absence degrades to a warning per R7.

## Open Questions

- Whether ADO's actual policy-type identifier for "Limit merge types" and its settings field names
  match what's implemented here can only be confirmed against a live ADO org — flagged for whoever
  next verifies this against a real Azure DevOps repository, per R5's own disclosure.
