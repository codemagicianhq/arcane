---
name: Spell — Manifest
description: Hub-gated interactive triage that promotes idea-book and todo-book entries downstream — to a consumer repo, a PRD scaffold, a tracker item, public disclosure, or another venture's book.
argument-hint: Optional --venture <slug> to restrict triage to one venture's books
agent: agent
---

## Executive Summary

- This prompt is the promotion step of the idea lifecycle: it takes `status: new` entries out of hub-side `IDEAS.md`/`TODO.md` books and lands them where they actually get built — a consumer repo, a tracker, a PRD, or (deliberately, never by accident) a public disclosure.
- **Hub-gated:** requires `role: "hub"` in `.arcane.json`. Refuses cleanly in a consumer repo.
- Batch-capable: list entries once, select by number/range, route each (or all identically), execute with one final confirmation — except disclosure, which is never covered by a batch confirmation and always requires its own literal answer.
- Every downstream write is leak-scanned first: no sibling venture names, no hub paths, no machine names ever land in a consumer artifact.
- Idempotent: promoted entries are marked in place, so re-running never double-lands the same idea.

---

## Step 0 — Hub Gate

Read `.arcane.json`. If `role` is not `"hub"`, stop and report:

> `spell-manifest` runs only in a hub repo (`role: "hub"` in `.arcane.json`). This repo is a consumer — triage its own `IDEAS.md`/`TODO.md` with `spell-todo` (task), `spell-suggest-feature` (tracked story), or `spell-plan` (PRD) instead.

Do not read or list anything further. If `role` is `"hub"`, resolve `{BUSINESS_ROOT}` from `.arcane.json` (default `ventures/`) and load `{BUSINESS_ROOT}/registry.json`. If the registry is missing or fails to parse, stop and report the exact error — never triage blind without knowing the venture list (sibling names come from here, and the leak scan in Step 5 depends on it).

## Step 1 — Collect

Parse `status: new` entries from the hub root `IDEAS.md` and every `{BUSINESS_ROOT}/<slug>/IDEAS.md` / `TODO.md` that exists. If `--venture <slug>` was given, resolve it through the registry's aliases first (exact slug → alias → closest match offered — never guessed; unknown slug lists the closest matches and stops) and restrict collection to that venture's two books plus the hub root.

Tolerate operator YAML frontmatter above a book's header — entries always live below the `---` divider. Malformed entries (missing timestamp, unparseable status comment) are listed under a `Skipped` heading with `file:line`, never silently dropped.

## Step 2 — List

Print one numbered list, grouped by book, oldest entry first within each group. Numbering is session-scoped — it does not persist across runs.

```
Idea triage — hub books (N books, M new entries)

hub IDEAS.md
  1. [2026-08-02] [#dx] Portfolio-wide spell usage stats dashboard
ventures/kiubo-mexico/IDEAS.md
  2. [2026-07-30] [#ui] Dark-mode toggle for event pages
ventures/kiubo-mexico/TODO.md
  3. [ ] Confirm cart snapshot order (open item, no status comment — todo-book entries are listed as-is)
```

## Step 3 — Select

Ask: `Promote which? (numbers/ranges, e.g. 1,3,5-8, or "all")`. Accept a single answer covering the whole batch. `all` selects every listed entry, including ones in books outside `--venture` if no filter was given.

## Step 4 — Route (per entry)

For each selected entry, in list order, resolve the venture it belongs to (`hub` for root-book entries) and offer destinations. The menu depends on that venture's registry entry:

| # | Destination | Requires | What lands |
| --- | --- | --- | --- |
| a | Consumer repo-root `IDEAS.md` | a registered clone on this machine | New entry, `status: new`, fresh timestamp |
| b | PRD scaffold in consumer `features/<slug>/PRD.md` | a registered clone | spell-plan-style stub: Problem Statement = idea text; tracking frontmatter from that repo's own `.arcane.json`; open question noting no work-item ID exists yet |
| c | Tracker item | venture `tracking != "none"` | ADO: resolve process template + work item type, `az boards work-item create`. GitHub: `gh issue create --repo <owner>/<repo>`. Works without a local clone. |
| d | Public disclosure to that repo's `IDEAS.md` | a registered clone, destination `visibility: "public"` | Same as (a) — but gated by Step 5's disclosure confirm, always |
| e | Demote to a TODO book | — | Venture's own `TODO.md` (or hub root `TODO.md` for hub-book entries), as a `- [ ]` line |
| f | Drop | — | Nothing lands |
| g | Cross-copy to another venture's book | target venture exists in registry | Fresh `status: new` entry appended to that venture's book |

If the venture has no registered repo (`repos: []`, e.g. an idea-stage venture), only (e), (f), (g) are offered. Typing `same` for any entry after the first repeats the previous entry's destination.

Once every selected entry has a destination, print one consolidated plan and ask `Proceed? (go / edit / cancel)`. This confirmation covers ordinary destinations only — it never authorizes a disclosure; see Step 5.

## Step 5 — Disclosure Gate

Any destination whose repo has `visibility: "public"` — (a) or (d) landing in a public repo, or (c) filing a tracker item in a public tracker (a GitHub issue on a public repo is exactly as much a disclosure as its `IDEAS.md`) — is a disclosure, never covered by `all`, `go`, or any other batch confirmation. Per entry, print the **exact text** that will become public and ask for the literal word `disclose`. Anything else skips that one entry (it stays `status: new`) without aborting the rest of the batch.

On a repo's first-ever disclosure (its `IDEAS.md` has no existing entries with a `promoted → public:` marker), offer to add this boundary statement to that file's header in the same staged change:

> Build-in-public covers source, decisions, and the accepted roadmap; idea incubation is curated and lands here when committed.

## Step 6 — Execute

Per entry, in list order: **land downstream first, mark the hub entry after.** Before writing anything to a consumer repo, run the leak scan (Step 7) on the outbound text; a hit blocks that entry and asks for an operator rewrite rather than writing leaked content. After a successful downstream write, mark the hub entry:

```
<!-- status: promoted → <dest> YYYY-MM-DD -->
```

where `<dest>` is one of:

```
repo:<slug>/IDEAS.md
prd:<slug>/features/<feature-slug>
ado:<slug>#<id>
github:<slug>#<id>                    (append " (disclosed)" if the repo is public)
public:<slug>/IDEAS.md (disclosed)
hub:TODO.md
book:<other-slug>/IDEAS.md
```

Dropped entries get `<!-- status: dropped YYYY-MM-DD -->`, optionally with a trailing `(reason)`.

Before any downstream write, grep the target file for the entry's normalized first ~40 characters — if already present, treat this entry as already-landed, mark the hub entry promoted, and skip the write. This is what makes an interrupted or re-run batch safe.

## Step 7 — Leak Scan

Before writing outbound text to any consumer or public destination, scan it for:

- Every other venture's slug and aliases from the registry (never the destination's own)
- Hub path fragments (`{BUSINESS_ROOT}` paths, this repo's own root-relative paths)
- Machine names (the `clones` keys across the registry)
- This repo's org-token denylist, if `.arcane.json`/config defines one

A hit blocks the write and reports exactly what matched; offer the operator a rewrite or `keep in book` (leave the entry `status: new`, untouched). This scan is only possible hub-side, because only the hub holds the full sibling list — that asymmetry is deliberate, not a gap: a consumer repo could never run this check on itself without first being handed the very list it must never see.

## Step 8 — Report

Stage (never commit) the touched files in each repo that received a write, including this hub repo. Print one proposed commit message per repo:

```
Staged (not committed):
  hub:            ventures/kiubo-mexico/IDEAS.md
                  proposed: docs(ideas): promote 1 entry to kiubo-mexico
  kiubo-mexico:   IDEAS.md
                  proposed: docs(ideas): capture dark-mode toggle candidate
Run spell-commit-work in each repo. N entries remain new.
```

## Rules

- Never run outside a hub repo. Never infer hub status.
- Never let `all` or the plan-confirm authorize a disclosure — that confirmation is always separate, always per-entry, always the literal word `disclose`.
- Never write a sibling venture's slug, a hub path, or a machine name into a consumer or public artifact — the leak scan is mandatory, not advisory.
- Never commit. Stage and report; hand off to `spell-commit-work`.
- Never guess a venture from partial input — resolve through the registry's aliases or ask.
- Land downstream before marking the hub entry promoted, so an interrupted batch never loses track of what actually shipped.
