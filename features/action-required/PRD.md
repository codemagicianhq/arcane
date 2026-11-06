---
title: "PRD: Action required — the block that replaces Needs you"
status: accepted
implementation_status: shipped
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
source_intake: the operator's hub idea book, 2026-10-17 ("Replace the `## ⚠ Needs you` block"); TODO.md "Revisit the `## ⚠ Needs you` block" (2026-09-28)
created: 2026-11-05
decision: ARC-060 amendment, decision 14 (accepted 2026-11-05)
---

# PRD: Action required — the block that replaces Needs you

## Problem

Every spell that leaves the operator something only they can do ends its report with
`## ⚠ Needs you`. The operator values the block, but the heading reads badly. The ⚠ sits where a
logo would, so it reads as Arcane asking for help: dependency, not authority. The block also has
one tier, so "merge this pull request" and "remove a leftover remote branch some day" carry the
same weight. And a done item silently disappears.

## Decisions (operator, 2026-11-05)

- **Heading:** `## 🚧 Action required`. `spell-scry` gave PASS-WITH-DISCLOSURE: no trademark was
  found, and no internal identifier uses the phrase. GitHub's own `action_required` check
  conclusion means the same thing, a human must act. The disclosure: "Action required" is one of
  the commonest phishing email subject lines. That is acceptable because the block appears in
  spell output and pull requests, not in email.
- **Frame:** a horizontal rule above and below the block, as the idea proposed. GitHub's renderer
  was checked on 2026-11-05: it renders the rules and the heading. The GitHub alert syntax was
  rejected, because it adds its own "Important" title and shows as raw text in a terminal.
- **Tiers and persistence:** both ship. See AR-01.
- **Wire names:** `required_actions`, `--required-action` and `session.action_required`
  (ARC-060 decision 14). See AR-05.

## Requirements

- **AR-01 — The fragment.** `needs-you` becomes `action-required`. The block is framed by rules
  and headed `## 🚧 Action required`. It has two tiers in one block, never two blocks:
  - **Now:** the work is not correct or complete until this is done (today's rule, unchanged).
  - **When you're at your desk:** only the operator can do it, but it can wait.

  Within a session, a done item stays listed, struck through, until the session closes. Only Now
  items are reported to the presence channel as `waiting`. The other rules (one line per action,
  never only among optional steps, omitted when empty, every final report) are unchanged.
  - *Acceptance:* every spell that hosted `needs-you` hosts `action-required`; self-host parity
    and the catalog pass; the fragment test checks the heading, frame, tiers and persistence.
- **AR-02 — The authoring standard.** `spell-authoring-standards.md` describes the block under its
  new name, with the tiers and the frame.
  - *Acceptance:* the standard's test is updated and passes.
- **AR-03 — The handoff carries the block.** The handoff field becomes `Action required`, with
  `Now:` and `At your desk:` lines. `spell-close-session` writes the open items. `spell-open-session`
  surfaces them first, as today, and still reads a handoff written with the old `Needs you` field,
  treating its items as Now. Every other spell sentence that names the block uses the new name.
  - *Acceptance:* the handoff tests are updated; a test asserts open-session's legacy reading.
- **AR-04 — The Show Report (delivered in `arcane-ui`, not here).** The section should read "Action
  required" ("No action required" when it is empty), with a yellow-and-black caution-tape stripe
  above and below. Found while building this: the report template in this repository is vendored
  from `arcane-ui`. That repository's component renders the section, and its pipeline opens the
  vendoring pull request here. Its `needsYou` and `needsYouCount` keys are also the contract
  between the two repositories. A change made here would be overwritten by the next vendoring, so
  this PR leaves the template and the report model unchanged. The work is registered in `TODO.md`
  ("Show Report: the Action required section, in arcane-ui").
  - *Acceptance:* in `arcane-ui`; here, the next vendoring PR passes `check:report-template`.
- **AR-05 — The presence wire names** (ARC-060 decision 14). The changes:
  - `needs_you` becomes `required_actions` in the schema, the types, validation, the table, MCP
    and the reporter.
  - `session.needs_you` becomes `session.action_required`.
  - `--needs-you` becomes `--required-action`, with the old flag kept as a hidden alias.
  - A report body with `needs_you` is accepted for the 1.20 series; a body with both names is
    `400` naming `needs_you`.
  - The `presence-report` fragment, the threat-model row and the README use the new names.
  - *Acceptance:* the presence suites pass under the new names; a test posts a legacy body and one
    with both names; every fixture validates against the schema.
- **AR-06 — Release.** A minor bump (1.20.0) with a CHANGELOG entry. Tick the TODO item. Record
  the hub idea as implemented.
  - *Acceptance:* `check:changelog`, `check:version-bump`, `check:demos` and `check:stale-claims`
    pass.

## Out of scope

- Renaming the handoff fields other than `Needs you`.
- Any change to `status: waiting` itself.
- The dashboard's own label for the field.
