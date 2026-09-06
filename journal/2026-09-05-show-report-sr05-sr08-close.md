# 2026-09-05 — Show Report: Design, the Compiled Template, and Program Close

## Session: Design SR-05a, vendor the arcane-ui template, and close the program

### Prompt Context

A continuation of the 2026-09-03 session. The operator opened on SR-05a's design question — whether
`/design-sync` was the right tool, given they had expected to design in Claude Code — and chose a
hybrid: explore here against the real JSON, formalize in Claude Design later. From there they drove
decisions one at a time (drop the emoji, fix arcane-ui's light ramp, rename `colophon`), relayed each
arcane-ui build back for verification, and finally asked to finish everything and close.

### What Got Done

1. **SR-05a — the design.** Three structural directions drawn in `arcane-ui`'s real tokens against
   live Lessons Hardening data; direction A ("Console") chosen. Committed at
   `docs/plans/show-report/design/` ([PR #206](https://github.com/codemagicianhq/arcane/pull/206))
   because it existed only in a session scratchpad and a Claude artifact, neither of which survives.
2. **ARC-043 — no emoji.** `ShowReportRow.glyph` removed; a row's mark derives from `category` alone
   via eight inline SVG symbols. Drafted `Proposed`, accepted by the operator, closed as Q-004
   ([PR #203](https://github.com/codemagicianhq/arcane/pull/203),
   [PR #204](https://github.com/codemagicianhq/arcane/pull/204)).
3. **Three generator defects fixed**, all found by rendering the live corpus rather than a fixture: a
   parked item whose em dash fell on a continuation line was **silently dropped** (Lessons Hardening
   rendered 8 of 9 with no gap to notice), wrapped reasons were cut mid-sentence, and ledger claims
   were truncated mid-word.
4. **`colophon` to `provenance`, schema v1 to v2**
   ([PR #208](https://github.com/codemagicianhq/arcane/pull/208)). A deliberate break of the freeze,
   recorded in `PLAN.md` beside the freeze rule itself.
5. **`check:report-template`** ([PR #209](https://github.com/codemagicianhq/arcane/pull/209)) — a
   blocking CI gate that renders the template and fails on dead tags, an empty `<h1>`, a missing
   title/lang/viewport, a lost provenance label, non-determinism, and a row that renders blank
   instead of visibly `unwritten`. Extended twice more
   ([#210](https://github.com/codemagicianhq/arcane/pull/210),
   [#212](https://github.com/codemagicianhq/arcane/pull/212)).
6. **SR-06 — the compiled template vendored**
   ([PR #211](https://github.com/codemagicianhq/arcane/pull/211), re-vendored at
   [#213](https://github.com/codemagicianhq/arcane/pull/213)). Took four arcane-ui builds; the gate
   caught rounds two and three.
7. **SR-07 authored, not enabled.** Pipeline stage committed in `arcane-ui` on
   `feat/sr-07-export-template-pr`, inert by construction, with `docs/sr-07-enable.md`.
8. **SR-08 — program closed** ([PR #214](https://github.com/codemagicianhq/arcane/pull/214)), GO,
   with the Definition of Done walked against live evidence and two deviations disclosed.
9. **The flaky test identified and fixed** (in #213).

### Decisions Made

| ADR | Decision | Rationale |
|---|---|---|
| ARC-043 | Rows carry no emoji; `category` selects the mark | Redundant with `category`, unstylable, platform-dependent, and it made every author choose one |
| (no ADR) | `colophon` to `provenance`, `schemaVersion` 1 to 2 | "Colophon" is a publishing term the operator did not recognise; `naming-conventions.md` says use the industry term when one exists. Recorded in `PLAN.md` beside the freeze rule rather than as its own ADR |
| (no ADR) | Coverage stat dropped | Cannot be derived deterministically; recording it by hand would plant a stale number |
| (no ADR) | Share lens deferred, then moved out of the program | A genuine cross-repo feature, not a finishing touch; keeping it in would block SR-08 indefinitely |

### Lessons Learned

#### A byte-comparison gate cannot catch a wrong template

The session's most transferable finding. arcane-ui 2.1.0 bound to the raw `show-report.json` instead
of `buildShowReportView()`'s output: fourteen tags resolved to empty strings, the `<h1>` rendered
empty, every section header read `W0`, and one program's calibration sentence was baked in as static
text. **Every gate stayed green.** `check:report` compares committed artifacts against a
regeneration, and a template whose tags name nothing regenerates byte-identically — it is
consistently wrong. Mustache renders an unknown tag as an empty string with no warning. Only
rendering against real data and asserting on the output catches this class.

#### The spec was prose in one repo and the authority was a type file in another

The brief named the right fields but pointed at `types.ts` in a repository the arcane-ui session
could not import from, and no sample payload ever crossed the boundary. Four review rounds followed.
The fix was not more prose: it was a committed fixture plus a test that renders against it.

#### A picture is not a template, and shipping one without a legend costs a round

The design artboards contain `W0` and one program's calibration sentence as literal text, because
they are one program's report rendered with data in it. A session building components from them
faithfully reproduced both. The README warned the content was a stale snapshot but never said which
strings were bindings and which were chrome — two of the defects were downstream of that omission.

#### An exclusion list is the wrong instrument for silencing a false positive

The pluralisation rule filtered out "1 items" so a fixture's own legitimate prose would not trip it.
That same exclusion masked a real defect — the parked count rendering "1 items" — for a full round.
Rewording the fixture so nothing legitimate matches was the correct fix; an exclusion cannot tell the
innocent occurrence from the defect.

#### Backslashes typed through a heredoc can become control characters

A word-boundary escape written into a regex through a shell heredoc landed as literal `0x08`
BACKSPACE bytes. The rule typechecked, linted, ran clean, and silently matched nothing — the only
symptom was a gate that never fired. Found with `cat -A`. Build backslashes programmatically and
verify the bytes. The same session hit the related trap twice more: a large heredoc failed to parse
at all, and file writes fell back to the dedicated tool.

#### Read the failing hook's log instead of retrying it

The flaky test went unnamed for hours because vitest does not name a failure in the tail of a long
run and `coverage/junit.xml` is overwritten by the next run. It was caught by letting the pre-push
hook fail and reading its output: the hook runs the full suite, so its log is the same evidence CI
gives, and it survives. Both failures were timeouts under contention, not logic bugs.

### Open Items Carried Forward

- **SR-07 is dispatched, not merged.** `arcane-ui`'s `feat/sr-07-export-template-pr` is pushed with
  one commit not on `main` and no PR opened there. Enabling it needs a GitHub token and an Azure
  DevOps secret, both operator-only. See that repo's `docs/sr-07-enable.md`.
- **SR-05c (share lens)** — moved out of the program, tracked in `TODO.md`.
- **"Prints to PDF cleanly"** — the one Definition-of-Done criterion not verified. The print block
  exists and its tokens measure above 4.5:1, but no PDF was produced and inspected.
- **The JUnit reporting gap** — a flake caught once is still unreadable afterwards, because the
  report is overwritten by the next run. Tracked in `TODO.md`.
- **One unnamed flake recurred** after the timeout fix and did not reproduce across four subsequent
  full runs; the report was already overwritten. Covered by the same `TODO.md` item.
