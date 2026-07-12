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
- [agents/agent-policies.md](../../agents/agent-policies.md)
- Most recent journal file(s) in [journal/](../../journal/)
- Relevant business overviews under [ventures/](../../ventures/)

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
- **Findings:** total count, broken down per severity.

## Drift Findings

- One line per finding with `file:line` references (or nearest locator) and its severity rationale.

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
- Keep changes minimal and traceable.
