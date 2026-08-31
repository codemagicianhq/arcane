# PRD: `ward` + `scry`

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
---

## Problem Statement

Two related but distinct naming-safety gaps have no dedicated tooling: (1) nothing scans a repo for
third-party IP/trademark strings that leaked in — vendor names, brand tokens, org identifiers baked
into filenames, prose, or binary asset strings — and (2) nothing clears a *new* candidate name before it
ships, checking both the outside world (does this collide with an existing product/brand) and, just as
importantly, **this repository itself**. The second half of that gap is not hypothetical: ARC-028's own
naming decision was nearly settled on bare `workspace` on the strength of a clean external read, until a
single `grep -ri` found the word already load-bearing inside this exact repository in two other senses
(the agent sandbox root `workspace-{agent}`, and the shipped, validated schema field
`openclaw.workspace_root`) — one of the four colliding meanings the naming decision existed to
disambiguate in the first place. Every existing check looks outward; none of them greps the repository
the name is about to ship into.

`ward` and `scry` are the two ends of the same concern, moving in opposite directions: `ward` finds what
already leaked **in**; `scry` clears what's about to go **out**.

## Target Users

Any Arcane-consuming repo maintainer who needs to (a) audit an existing codebase for accidentally-leaked
third-party identifiers before making it public or handing it to a new team, or (b) clear a candidate
name — for a spell, a field, a product, an internal concept — before committing to it.

## Requirements

### Must Have

**`spell ward`** (new CLI command, deterministic — needs a real exit code for CI-gate mode, not agent
judgment per run):

- Denylist + **word-boundary** matching (reuses `scripts/org-token-lint.ts`'s already-generic
  `createOrgTokenRules`/`escapeRegExp`/`scanFile`/`collectScannableFiles`/`scanRepository`/
  `dedupeFindings` — these are ALL already denylist-agnostic; only the org-token-specific *resolution*
  functions are specific to Arcane's own org-token concern and are not reused).
- Scans the tree, **and filenames** (`org-token-lint` today only scans file *content* — new capability).
- Scans binary asset strings for GIF/PNG/MP4/audio-adjacent formats **where extractable** (e.g. metadata
  chunks, embedded text); files where no reliable extraction is possible are **flagged for manual
  review** rather than silently skipped or falsely cleared.
- **Substring-hazard exclusions** (an "author/provision" class): a denylist term that is also a common
  substring of unrelated legitimate text must not blanket-flag every occurrence — support an exclusion
  list of context patterns that suppress a specific false-positive shape without weakening the general
  match.
- **Ships with a mandatory, always-active vendor-identifier denylist** — separate from and in addition
  to any user-supplied terms. This exists specifically so an automated rename tool cannot "correct" a
  third-party model ID or vendor identifier into something else, and so a self-consistent mock/fixture
  doesn't quietly bless that corruption by matching it.
- **CI-gate mode**: report-only by default (matching `spell-check-drift`'s own convention); a gate mode
  that exits non-zero on any un-excluded finding, for wiring into CI.

**`spell scry <term>`** (prompt-driven — the four checks require research judgment, not deterministic
pattern-matching):

- The four outward checks, unchanged from the original spec: who coined it; is an estate still trading;
  same-audience giants; first-association salience per market.
- **The inward pass (2026-08-24 extension, Must Have — not optional):** grep this repository itself for
  the candidate term — prose, identifiers, config keys, schema fields — weighting code identifiers above
  prose, since those are what consumers already depend on. Classify an internal hit with the **same**
  taxonomy as an external one (same-space / adjacent / out-of-space) rather than a separate scheme.
- Return one of: pass / pass-with-disclosure / kill, with sources, combining both the outward and inward
  passes into one verdict — a name that clears outward but collides inward is not a clean pass.

### Should Have

- `ward`'s CI-gate mode wired as an example into this repo's own CI, once the mandatory vendor-identifier
  denylist is populated with real entries worth protecting (a later, separate step — this PRD ships the
  mechanism, not a fully-curated denylist).

### Won't Have (this iteration)

- OCR or deep binary-format parsing for embedded text in media files — "flag for manual review" is the
  scoped answer per Must Have above, not automated extraction from every format.
- Automated collision **resolution** (renaming, aliasing) — both spells report and classify; a human (or
  a separate spell) decides what to do about a finding.
- Overlap with secret/credential detection — `ward`/`scry` scan for **identifiers and trademarks**, not
  secrets, API keys, or credentials. BC-21 is a soft-dependency on BC-10's secret-detection ADR
  (ARC-037) specifically to keep these two scanning concerns from colliding; ARC-037 is still Proposed
  (not yet Accepted), so this PRD keeps `ward`'s scope strictly to identifier/trademark leakage and does
  not attempt secret-pattern matching, leaving that scope entirely to whatever ARC-037 eventually ships.

## Constraints

- **Technical:** `ward`'s scanning engine must reuse `scripts/org-token-lint.ts`'s existing generic
  functions rather than reimplementing word-boundary matching, tree-walking, or dedup logic (D8) — that
  module's own doc comments already note several of its functions are general-purpose, not
  org-token-specific.
- **Scope boundary:** per Won't Have above, `ward` never attempts secret/credential pattern matching.
- **`scry`'s inward pass is not optional** — the PRD that originally specified only the four outward
  checks already shipped a name (`workspace`) that would have collided internally; the inward pass is
  the fix for a real, already-experienced failure, not a nice-to-have addition.

## Acceptance Criteria

- [ ] `spell ward` scans repo content, filenames, and extractable binary asset strings against a
      denylist using word-boundary matching, reusing `org-token-lint.ts`'s existing generic functions.
- [ ] `spell ward` ships with a non-empty, always-active vendor-identifier denylist independent of any
      user-supplied terms.
- [ ] `spell ward` supports substring-hazard exclusions that suppress a named false-positive shape
      without weakening the general denylist match.
- [ ] `spell ward` flags grep-proof media files for manual review rather than silently clearing them.
- [ ] `spell ward` has a report-only default mode and a CI-gate mode with a real non-zero exit code.
- [ ] `spell scry <term>` performs the four outward checks and returns sourced pass/pass-with-disclosure/
      kill verdicts.
- [ ] `spell scry <term>` performs the inward repo-local pass, classifying internal hits with the same
      same-space/adjacent/out-of-space taxonomy as external hits, weighting code identifiers over prose.

## Dependencies

- `scripts/org-token-lint.ts`'s existing generic scanning functions (reused for `ward`, not duplicated).
- `spell-check-drift.prompt.md`'s report-only-by-default / opt-in-gate convention (mirrored for `ward`'s
  CI-gate mode, not re-derived).

## Open Questions

- None blocking. The mandatory vendor-identifier denylist's actual initial contents (which real vendor
  IDs to seed it with) is populated with a reasonable starting set in the implementation; it is not a
  design decision requiring operator input the way BC-10's ADR is.
