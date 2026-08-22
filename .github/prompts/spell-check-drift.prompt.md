---
name: Spell — Check Doc Drift
description: Detect contradictions and stale statements across core Arcane docs and report severity-graded findings (report-only by default; opt-in --fix applies safe mechanical fixes).
argument-hint: Optional scope selector --scope all|journal|todos|decisions|git (default all); free-text hints also accepted. Add --fix to apply safe mechanical fixes.
agent: agent
---

## Executive Summary

- This prompt identifies documentation contradictions, stale dates, and inconsistencies across the repo.
- It cross-references core docs to find drift between ADRs, journals, configuration files, and operational guides.
- Use this periodically (weekly/monthly) or after major changes to maintain documentation accuracy.
- **Report-only by default** (non-destructive): output is severity-graded findings with exact fix recommendations. Pass `--fix` to also apply safe, mechanical, unambiguous fixes.

**Related spells:** `spell-open-session` consumes this as an early drift-check pre-step (feeds-into); this spell also runs standalone. Related to `spell-close-session`, which flags drift at session close.

---

Detect documentation drift in this repository.

Use these files first:

- [README.md](../../README.md)
- [project.md](../../project.md)
- [TODO.md](../../TODO.md)
- [DECISIONS.md](../../DECISIONS.md)
- [ai-context/system-prompt-context.md](../../ai-context/system-prompt-context.md)
- [agents/agent-policies.md](../../.arcane/governance/agent-policies.md)
- Most recent journal file(s) in [journal/](../../journal/)
- Relevant business overviews under `{BUSINESS_ROOT}/` (resolve from `.arcane.json`'s `business_root` field, default `ventures/` if unset)
- `{BUSINESS_ROOT}/registry.json`, if present (hub-role and registry-consistency detectors)

Scope selection (`--scope <value>`, default `all`):

- `all` — run every detector below (default).
- `journal` — Journal chronology only.
- `todos` — Done vs. carry-forward consistency only.
- `decisions` — Decision-ID existence only.
- `git` — Decision-ID existence plus the general contradiction/stale-date checks against tracked docs (git-tracked doc state); does not run journal-ordering or carry-forward detectors.

A free-text scope hint (e.g., "security docs", "business docs") is still accepted and narrows the file set; `--scope` selects which detector catalog runs. When both are given, `--scope` governs the detector set and the free-text hint narrows the files.

Concrete detectors to run (in addition to general contradiction/stale-date checks):

- **Journal chronology** — journal entries and their dates must be in sane order. Flag out-of-order entries, duplicate session numbers, and any future or otherwise contradictory dates.
- **Done vs. carry-forward consistency** — items marked done must not still appear as open or carry-forward items, and items listed as open/carry-forward must not also be marked done elsewhere.
- **Decision-ID existence** — decision IDs referenced in TODO, journal, or other docs must exist in `DECISIONS.md`, and the IDs in the decisions log must be sequential and unique (no gaps that imply a missing entry, no duplicates).
- **Canonical vs. installed-copy parity** — for every managed root file that has a canonical counterpart under `src/assets/`, compare bytes first. If bytes differ, normalize `CRLF` and lone `CR` to `LF` in both files and compare again:
  - If normalized content differs, report **real content drift** with normal severity grading.
  - If normalized content matches, report **line-ending-only drift** separately. Do not count these paths as real content findings and do not include them in severity totals or the Go / No-Go decision.
  - Report exact path counts for both classes. Never summarize all byte-different files as content drift.
- **Hub-artifact leak (non-hub repos)** — if `.arcane.json` does not have `role: "hub"`, the existence of any `{BUSINESS_ROOT}/*/IDEAS.md`, `{BUSINESS_ROOT}/*/TODO.md`, or `{BUSINESS_ROOT}/registry.json` (resolve `{BUSINESS_ROOT}` the same way as above -- a consumer repo can still have a configured `business_root` left over from a prior role change, so this must not skip resolution just because the repo isn't currently a hub) is **Critical**: hub-only artifacts (potentially including sibling-venture and portfolio data) do not belong in a repo that isn't a declared hub. This check is deliberately structural (file existence only) — a non-hub repo cannot safely hold the sibling-name list a content-level check would need, so that asymmetry is by design, not a gap.
- **Hub role/registry consistency (hub repos only)** — when `.arcane.json` has `role: "hub"`:
  - `role: "hub"` with no `{BUSINESS_ROOT}` directory (default `ventures/`) present — **High**: the manifest claims a role the repo can't actually fulfill.
  - `{BUSINESS_ROOT}/registry.json` slugs that don't match an existing `{BUSINESS_ROOT}/<slug>/` folder, or venture folders with no registry entry — **Medium**, both directions.
  - Malformed `status: promoted → …` / `status: dropped …` markers in any book (unparseable destination, missing date) — **Low**.
  - A `{BUSINESS_ROOT}/<slug>/` folder with a `role`-shaped `.arcane.json`-like marker of its own (i.e., it looks like it's trying to be a hub itself) — **Medium**: flag for operator review; nested hubs are unsupported.

For each drift finding include:

- Severity (`Critical`, `High`, `Medium`, or `Low`)
- Severity rationale (one line: why this severity — e.g. work-integrity/duplicate-work risk → HIGH; confidence/correctness gap → MEDIUM; cosmetic → LOW)
- Drift statement
- Canonical source file (cite `file:line` — or the nearest locator such as a heading or section — wherever a specific location applies)
- Affected file (cite `file:line` — or the nearest locator — wherever a specific location applies)
- Exact recommended fix

Every finding that points to a specific location MUST be pinpointable: cite `file:line` (or a line range, e.g. `TODO.md:42-45`). If no precise line exists, cite the nearest available locator (heading, section, or list item) instead of omitting it.

Behavior:

- **Default mode is report-only and non-destructive — do not edit any files.** Only detect, grade, and report drift with recommended fixes.
- **Only when invoked with `--fix`**: apply fixes that are mechanical and unambiguous, then report each edit applied. Still never apply ambiguous fixes — list those under Needs Confirmation instead.
- If drift is ambiguous, do not edit (in either mode); ask a targeted clarification question.

Output format:

## Drift Report

- **Scope:** the `--scope` value (`all`/`journal`/`todos`/`decisions`/`git`), any free-text hint, and mode (`report-only` or `--fix`).
- **Date:** ISO date of this run.
- **Real content findings:** total count, broken down per severity.
- **Line-ending-only drift:** path count, reported separately and excluded from severity totals.

## Real Content Drift Findings

- One line per finding with `file:line` references (or nearest locator) and its severity rationale.

## Line-Ending-Only Drift

- List byte-different paths whose contents match after line-ending normalization, or `None`.
- Keep this list separate from real content findings even when it is long; a count plus path list is sufficient.

## Fixes Applied

- List edits applied (only possible in `--fix` mode), or `None`.

## Needs Confirmation

- Open questions that block safe edits, or `None`.

## Suggested Next Updates

- Short, prioritized follow-up edits.

## Go / No-Go

- A final roll-up verdict: **GO** if the workspace is clean enough to proceed (no unresolved Critical/High findings), or **NO-GO** if drift must be fixed first. State the single most important blocker and what must happen before proceeding.

Rules:

- Prefer ADR decisions and latest journal facts when conflicts exist.
- Do not rewrite historical journal content.
- Treat `src/assets/` as canonical when comparing a managed root dogfood copy with its distributable source counterpart.
- A line-ending-only difference is review noise, not evidence of contradictory content; never let it create a Critical/High finding or a `NO-GO` verdict by itself.
- Keep changes minimal and traceable.
