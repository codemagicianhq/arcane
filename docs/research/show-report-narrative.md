---
title: "Show Report — Audience, Story Structure, Voice, and Brand"
audience: both
last_updated: 2026-09-02
status: active
tags: [research, show-report, reporting, brand, accessibility]
sources: [README.md, project.md, .github/agents/*.agent.md, journal/2026-09-02-lessons-hardening-program.md, docs/verification-ledger.md, the two hand-built completion ledgers]
---

# Show Report — Audience, Story Structure, Voice, and Brand

> Produced 2026-09-02 by the **Circe (Marketing Strategist)** roster agent as research input for the Show Report plan (docs/plans/show-report/PLAN.md). Verbatim except that local machine paths were normalized to repo-relative language before landing. Claims are labeled verified / inferred / speculative by the author where applicable.

# The Completion Report — Story, Audience, Voice, Brand

**From:** Circe, Marketing Strategist (the Charmweaver)
**Date:** 2026-09-02
**Scope:** the story and the audience of Arcane's per-program completion report. Not the technology.
**Baseline read:** `become-current-ledger.html`, `lessons-hardening-ledger.html`, plus the repo sources listed at the end. Every claim below names where I checked it; where I inferred, I say so.

## Summary

1. **Primary audience: the solo operator**, asking one question — "Is it done, and what's waiting on me?" Then the client who commissioned the run, then the public. A future session is *not* an audience: it reads the sources the report is compiled from, and a report it also read would be a fourth copy of tree-state — the drift RCA-001 exists to kill.
2. **The lead: outcome before output, and "Needs you: N" above the fold.** "40 items shipped" is output; "12 of 12 patterns dispositioned — 9 mechanized, 3 parked" is the outcome. Every row gets a receipt (its PR or ADR link); today not one row in either ledger links anywhere, and the Become Current ledger never tells the operator that Q-009, Q-010 and seven parked items are waiting on them.
3. **Surface the corrections — position taken.** "The run checked itself" is the one story no "look what my agent shipped" post can tell. Framed as calibration (N claims checked on the record, K didn't survive, fixed) it underwrites the shipped list rather than undercutting it.
4. **The name: Show Report** — "<Program> — Show Report." A stage manager's post-performance record *is* this artifact (timings, what happened, incidents, notes for the producer); it passes naming-conventions' Naming Test instead of dodging it, keeps the stage-magic frame, clears the outward search and the inward grep, and ends a real collision — "ledger" already means `docs/verification-ledger.md` throughout PLAN.md. Runner-up "Curtain Call" has a live adjacent-audience hit (curtaincallcfp.com).
5. **Brand at the frame, neutral in the rows.** Name, eyebrow, three section titles and a *derived* cast (from commit trailers, `self-reported` shown) carry the brand; rows stay plain. One report, two lenses (operator / share), one data model — not two documents.
6. **Strongest single recommendation:** one reader-facing sentence per epic, written at PR-creation time under a fixed PR-body heading and reviewed before merge — the only input a generator cannot derive — and a generator that marks a row "unwritten" rather than silently pasting `feat(x): …`. Everything else is derivable from PLAN.md, OPERATOR-QUEUE.md, `docs/verification-ledger.md` and git.

## Findings

### 1. Audience

Priority order, the ten-second question, and the success criterion I would hold the report to.

| # | Reader | The ten-second question | Measurable success |
|---|---|---|---|
| 1 | **Solo operator** — the one who granted the delegation and went to bed | "Is it done, and is anything waiting on me?" | Both answers visible without scrolling at 1280×720: the outcome sentence in the dek and a **Needs you: N** stat in the rail. Every needs-you row carries the exact command or link — `OPERATOR-QUEUE.md` already stores a "Exact commands" field per entry — so the operator acts *from* the report. Test: time-to-first-action ≤ 10 s; zero scrolls to the first operator item. |
| 2 | **Client / stakeholder** who commissioned the work | "What did I get, and what do I have to decide?" | After the masthead alone, the reader restates the outcome in one sentence (test with one person). Mechanical: zero undefined internal IDs (BC-nn, LH-nn, ARC-nnn, Q-nnn, RCA-nnn) in row titles; every Decision row names who decided. |
| 3 | **The public** (Arcane marketing) | "Did an autonomous run really ship this — and can I trust it?" | The link unfurls with title, description and image on two platforms without being opened; the corrections block is present (the trust signal); `spell ward --gate` is clean on the rendered HTML. The marketing goal gets its own metric: one "Built with Arcane →" link in the colophon; click-through to the README is the conversion. Define it before the first share, or the share proves nothing. |
| 4 | **A future session** orienting itself | "What state is the repo in, what's next?" | **Not an audience.** `spell-open-session` consumes `ai-context/system-prompt-context.md`'s Next Session Handoff and the latest journal (checked: `.github/prompts/spell-open-session.prompt.md`, "Check `ai-context/system-prompt-context.md` for a `## Next Session Handoff` section"). A report a session also reads is a fourth copy of tree-state — RCA-001's root cause RC-1 verbatim: "facts about the tree get written as static text that nothing re-derives." The criterion is therefore inverted: **zero orphan facts** — regenerate from the sources and the diff is empty — and every row links to its PR/ADR so a session that stumbles on the report is sent to the authoritative file, not fed by it. |

**Recommendation.** Primary audience is the operator — project.md calls near-zero friction for a solo developer "a hard constraint, not a preference," and KICKOFF.md names the operator's only recurring duty as "check OPERATOR-QUEUE.md occasionally and clear entries." The report is the cheapest way to do that duty.

One report serves audiences 1–3 as **two lenses over one data model**, not two documents: `operator` (default — internal IDs visible as receipts, local paths allowed, Needs-you first) and `share` (IDs demoted to link text, internal paths stripped, Open Graph head, ward-gated, "Built with Arcane" link). The story is identical; only the receipts' visibility and the prominence of Needs-you change. Two separately authored documents would reintroduce, inside the report itself, exactly the drift the report exists to summarize.

### 2. Story structure

**What the current structure does well** (masthead → stat rail → legend → phase sections → colophon):

- The dek is a real one-sentence story in both ledgers — "taking the Arcane framework from its 2026-08-30 backlog to fully current"; "turning its own 12 recurring correction patterns into mechanical checks." Keep this discipline; it is the share preview's description.
- Chronological phases mirror the plan's own waves and let rows call back — "Built the design above for real: …" appears three times in Become Current and once in Lessons Hardening. That callback is the narrative spine: design, then shipped. Keep.
- Category pills carry text, not only color.
- The row voice (Findings 3).

**What is missing:**

- **Outcome, not output.** "40 Items shipped" and "17 Items shipped" are output. The outcome is already in the plan: PLAN.md's Coverage Map dispositions every one of the 12 patterns — nine to an LH epic, three parked (P6, P8-beyond-prose, P12). "12 of 12 patterns dispositioned — 9 mechanized, 3 parked" is the number a client remembers. My own rule applies to the report as to any campaign: report metrics, not just outputs.
- **Needs you.** Lessons Hardening's operator item sits at the bottom, resolved after the fact. In a live report it is the first section, and it renders explicitly when empty — "Nothing needs you — 3 items resolved during the run." An absent section is ambiguous; an explicit zero is a signal. Become Current's ledger fails this outright: Q-009 and Q-010 are parked on the operator (`docs/plans/become-current/OPERATOR-QUEUE.md`, "parked 2026-09-01 (operator default …)") and Q-011 parks seven more; none of the nine appears anywhere in the ledger.
- **Receipts.** Not one row in either ledger links to its PR or ADR — I checked both files; there is no `href` inside any `.row`. The colophon says "PR history (#172–#190)" and stops. That contradicts the repo's own rule (`.github/instructions/agent-output.instructions.md`, Doc-ID Link Format: "A bare decision ID in agent output is the same defect as a bare `PR #NNN`") and mine: claims on a receipt.
- **What the run caught itself doing.** Absent as a section from both. The Become Current ledger even dropped one: the closure note that re-quoted a real client name and was caught by CI twice is on the record three times — OPERATOR-QUEUE Q-003's status note, `docs/verification-ledger.md` ("The org-token closure note … was safe to write → corrected"), RCA-001's Timeline — and the ledger row "Landed the Gate-Held Content" reads as a clean landing.
- **Deliberately not done.** Become Current parked seven items (Q-011); Lessons Hardening lists nine under "Parked — Needs Operator." A client's first question after "what shipped" is "what about X?" Answer it before it is asked.
- **Dates and span.** Neither masthead carries one. Become Current ran 2026-08-30 → 09-01 across at least three journaled sessions (`journal/2026-08-30-become-current-master-plan.md`, `2026-08-31-bc07-fresh-session-probe.md`, `2026-09-01-become-current-program-completion.md`); Lessons Hardening ran as one continuous session on 2026-09-02. So the eyebrow "Arcane · Session Record" is wrong for Become Current — it is a *program* record.

**What to cut or shrink:** the legend (pills already carry their label; keep a legend only if the share lens adds glyphs); "Cleanup" as its own section (fold into the close); the eyebrow label as written.

**Position on the corrections: surface them, as a named section and one stat in the rail.** On the record:

1. It is the differentiator. Every "look what my agent shipped" post lists output; none shows the run auditing itself. project.md: "This repository has shipped defects behind green suites and confident summaries; the protocol exists because of those, not in the abstract." A completion report that hides its corrections would contradict the product's stated identity on its own marketing surface.
2. The repo has already made the argument for itself — `spell-verification-ledger.prompt.md`: "A ledger showing three confirmed claims and one correction is more valuable than one showing four confirmed claims and nothing else — the correction is evidence the verification step actually did something, not theater."
3. Framing decides whether it undercuts. Frame it as **calibration**, never as a defect list: "N claims checked on the record; K didn't survive and were fixed." Then the three most consequential corrections as rows in the ordinary row format — two miscounts cancelling to a passing test (LH-05), a fixture test passing for the wrong reason (LH-12), async call sites green under typecheck and failing at runtime (LH-12). Each is a story a client understands in one breath.
4. State the denominator, or the number lies. `docs/verification-ledger.md` today holds 23 rows: 21 corrected, 1 confirmed, 1 unverifiable. That share is high *by design* — the spell excludes "a check whose outcome was never in doubt" — so a bare "21 of 23 wrong" reads as incompetence in the share lens. The phase note must say the scope: "of the claims the run formally checked and logged." (One aside for the technology memo: PLAN.md's LH-13 note says the Lessons Hardening section has "7 rows"; I count 8 in the file. I did not resolve which is stale — which is precisely why this stat must be derived, not typed.)
5. It does not undercut "look what shipped"; it underwrites it. A shipped list with no corrections invites "how do I know?" The corrections block is the answer — the difference between a vendor's invoice and an auditor's letter.

Also carry **disclosed deviations** in one line under the close, not narrated: the Lessons Hardening journal discloses that KICKOFF's "one epic per session, always" shape was not followed, by operator instruction — "12 epics, one session, zero journal entries until this one." That belongs in the report as a sentence, because a client who later reads the plan will otherwise find a contradiction the report didn't own.

**Proposed order:**

1. **Masthead** — eyebrow "Arcane · Show Report" (share lens appends "program completion record"); h1 "<Program> — Show Report"; dek = the outcome sentence; span as `<time>`; stat rail: outcome ratio · PRs merged · version span · claims checked / corrected · **Needs you: N**.
2. **Needs you** — or the explicit-zero line.
3. **What shipped** — the phase sections as today, each row with its receipt link; Decision rows name the decider in the description.
4. **Caught in the act** (operator lens) / **Checked and corrected** (share lens) — one calibration sentence with its scope, then 3–5 rows.
5. **In the wings** — parked items, one-line reason each, straight from the plan's Parked section.
6. **Close** — DoD verdict (GO, 7 of 7), drift-check result, disclosed deviations, session closed.
7. **Cast** — derived from trailers only (Findings 4).
8. **Colophon** — compiled from <sources>, generated <date>; share lens adds "Built with Arcane →".

### 3. Voice and copy rules

The baseline voice in one line: *what changed, for a human, in the present tense, with the failure it closes named, and a receipt.* The rules below are what a generator or an agent must obey to reproduce it. Good and bad examples are drawn from the two ledgers unless marked otherwise.

**R1 — Lead with the behavior that changed, from the reader's seat.** "X now does Y." Never a parts list.
- Good (LH): "CI now actually runs the coverage check instead of configuring thresholds nobody was enforcing."
- Bad (BC, Compliance Standards & Spell): "New governance doc plus a dedicated spell for running a repo's compliance checks." — an inventory; no behavior, no reader.

**R2 — Name the failure it closes: the "instead of" clause.** A fix with no named failure is a claim with no receipt.
- Good (BC): "Typing an unrecognized command now explains that spells are invoked in your AI client, not the terminal, instead of failing silently."
- Bad (BC, Full-Cycle Coordination Fixes): "Closed cross-phase gaps … migration-number collisions, import conflicts, and similar handoff cracks." — "similar" hides the rest.

**R3 — IDs are receipts, not headlines.** No BC-nn / LH-nn / ARC-nnn / RCA-nnn / Q-nnn in a title; they live in the link, the pill, or a muted meta line. Titles are Title Case noun phrases of five words or fewer naming the capability or the fix.
- Good (LH): "Local Denylist, Shipped"; "Derived Counts, Not Hardcoded."
- Bad (LH): "ARC-041 Accepted"; "RCA-001 — This Repo's First RCA." A client reads a serial number.

**R4 — One row, one outcome, two sentences, about 200 characters.** A bundle gets a bundle title with a count and parallel structure, never a grab-bag.
- Good (LH, Advisory Conduct Rules): "Three new standing rules: never quote a denylisted name…, treat a zero-match search as evidence about the search…, and review a dispatched agent's diff, not its summary." — counted, parallel.
- Bad (BC, Governance Tail Batch): "A bundle of smaller governance fixes: a diff-before-delete dedup rule, a clearer commit-attribution model, and related wording cleanups." — the title is process-internal and "related wording cleanups" is a shrug. (Length offender: LH's "RCA-001, Operator-Reviewed & Merged," three sentences.)

**R5 — Jargon-as-precision stays; jargon-as-process goes.** Command names, flags and file names are welcome when they *are* the thing. Internal process words — gate-held, tail batch, autonomy grant, DoD, endgame — get translated.
- Good (BC): "`spell ward` scans a repo for leaked third-party names; `spell scry` clears a brand-new name for use before you commit to it."
- Bad (BC): "Landed the Gate-Held Content"; "activating the standing autonomy grant for the rest of the run."

**R6 — Adjectives on a leash; intensifiers on a receipt.** "Real," "actually," "for real," "never again": at most one per row, only where the contrast is the point, and only with a linked artifact behind it. No "robust," "seamless," "powerful," "comprehensive."
- Good (BC): "Built the design above for real: `spell doctor --leaks`, a secrets-scanning pre-commit hook, and a repo-wide CI backstop that catches what the hook misses." — the intensifier marks design → shipped, and each noun is checkable.
- Bad: none in the baseline — both ledgers are clean on this rule. The risk arrives with generation; a model asked to "make it impressive" writes "a robust, comprehensive secret-detection system." Reject on sight. *(Synthetic example, not drawn from the ledgers.)*

**R7 — Say who, when a human acted or decided.** Decisions name the decider; operator actions name the operator; catches name the catcher — a named check, CI, or a person.
- Good (LH): "Rebased, resolved, re-verified, and the operator merged it directly."; "Caught by a direct question rather than any automatic check."
- Bad (BC, Session Closed): "Journal entry written, session handoff refreshed, and every fully-landed branch swept — the program's own closing ritual." — passive throughout, and silent on who.

**R8 — Honesty beats tidiness.** If the run corrected itself in the course of an item, the row says so. A correction is never demoted to a footnote or dropped for a cleaner line. When the correction concerns a leak, name the class, never the token (universal-agent-rules rule 25 — the report is exactly the closure-note shape that re-leaked twice on 2026-09-01).
- Good (LH): "Session Closed, Corrected — The first close-session pass went stale within the same conversation as the operator item resolved. Caught by a direct question rather than any automatic check, and rewritten to match reality before archiving."
- Bad (BC): "Landed the Gate-Held Content" — omits that the landing leaked a real client name, caught by CI, and that the closure note leaked it again (OPERATOR-QUEUE Q-003 status; verification-ledger row; RCA-001 Timeline).

**Generating from Conventional Commits and PR titles — what is lost.** Real subjects from `git log` against the rows they became:

| Commit subject (checked) | The ledger row |
|---|---|
| `feat(governance): follow-up promotion gate (LH-09)` | "A 'we'll deal with that later' left in a journal or plan now has to carry a real tracker reference, or say plainly why it doesn't." |
| `docs(lessons-hardening): LH-13 -- DoD audit, close the program` | "Walked all seven completion criteria against the real repo state with direct evidence, caught a stale status line in the operator's own queue along the way…" |
| `fix(governance): RCA-001 + move RCA artifact path out of governance/ (LH-02)` | Pill: **Governance**, not Bug Fix — the `fix` type misleads. |
| `feat(governance): shipped-state staleness scan, Class A + Class B (LH-08)` | Pill: **New Feature** — the `governance` scope misleads. |

Lost: (a) the reader's seat — subjects are repo vocabulary in imperative mood, lowercase, ≤ 72 chars by convention (git-conventions.md, Short Description Rules); (b) the "instead of" — subjects never carry the failure; (c) type→category is lossy in both directions; (d) the ID sits in the subject; (e) who decided — trailers give the runtime, never the decider; (f) title case and length.

What *is* recoverable mechanically — and it is most of the report: the commit **body** is already near ledger voice (c3143e6: "The prior close-session commit (PR #187) went stale within the same conversation…" *is* the LH row "Session Closed, Corrected"); PR links and versions; category with a one-word override; Needs-you from `OPERATOR-QUEUE.md`'s open entries; corrections from `docs/verification-ledger.md`; parked items from PLAN.md's Parked section; the DoD verdict from the close epic; the cast from trailers.

**Minimum human input that preserves the quality:** one reader-facing sentence per epic, written at PR-creation time in the PR body under a fixed heading (say `## For the record`), reviewed before merge. At PR time the author still knows the "instead of"; a week later nobody does. The baseline compiler got 57 rows right after the fact because the journals and plan notes were rich — that will not scale, and it is the P9 pattern ("prose ≠ tracked") wearing a nicer coat. Second input: the category override. Third, non-negotiable: the generator marks a missing sentence **"unwritten"** — visibly — rather than pasting the commit subject. A silent fallback is how the voice dies: the first report with twelve `feat(x): …` rows is the last one anyone reads. The natural capture point is `spell-create-pull-request` Step 4, which already generates the description (git-conventions.md, PR Requirements: "summary of changes, rationale, verification steps") — a recommendation for the technology memo, not mine to specify.

### 4. Brand

**Where the brand lives today.** In the vocabulary — `spell`, `ward`, `scry`, the Spell Loop — in the Arcanos roster with epithets and mottos, and in the README's pitch ("Cast spells to ship software"). The ledgers are restrained editorial: Fraunces and Plex, an eyebrow, a masthead, emoji markers — closer to a magazine than to a stage. Two governing rules constrain how far to lean: present-arcane's Tone ("Honest — show real numbers, real stack, real decisions. No marketing fluff") and naming-conventions' Naming Test ("magic grammar for the personas and vocabulary, plain functional payloads for everything technical"; "the more autonomous the tool, the more boring its name"). And one ownership fact: the operator has parked brand-lore decisions for their own voice — TODO.md's Parked section lists "Prospero's insignia lore capture — creative/narrative, operator's voice" and "'The Arcanos' branding copy pass — brand/copy judgment call." I propose; the operator decides.

**Recommendation: lean in at the frame, stay neutral in the rows.**

- *The frame* — the artifact's name, the eyebrow, three section titles, the cast, the colophon sign-off — is where a recurring reader learns the shape. A client's third Show Report should feel like the third, not the first.
- *The rows* stay plain (Findings 3). Rows are where receipts live; magic grammar there breaks "claims on a receipt" and the Naming Test in one stroke.
- *Emoji markers:* keep them in both lenses as the one playful element — `aria-hidden`, never load-bearing (the pill carries the category). They are not brand-specific, though; if the design memo wants a stronger mark, category glyphs in the house style beat emoji. Not my call.

*Trade-off.* Brand vocabulary costs a non-brand reader a beat of decoding. Mitigation: a plain descriptor beside every branded label ("Arcane · Show Report — program completion record"; "In the wings — parked, needs a decision"). Pay-off: recall and differentiation. Cost of staying fully neutral: the report becomes indistinguishable from any release-notes generator — the one thing the corrections block and the cast make it not.

Section titles, brand option / plain fallback:

| Section | Brand | Plain |
|---|---|---|
| Needs you | *plain only* | Needs you — never cute; this is the line the operator scans for |
| What shipped | the plan's own phase names | What shipped |
| Corrections | Caught in the act | Checked and corrected |
| Parked | In the wings | Parked — needs a decision |
| Cast | Cast | Who did what |
| Close | Curtain | Close |

**Cast list: yes — derived, never written.** git-conventions.md's trailer model already carries `Agent` (runtime), `Persona` and `Role` (only when a roster exists), `Model`, `Model-Source: self-reported`, `Provider`. This repo's own run today: c3143e6, 5f4d068 and cd7a2fb carry `Agent: claude`, `Model: claude-sonnet-5`, `Model-Source: self-reported`, and no `Persona` (PLAN.md: "This repository has no installed agent roster"); 8c7eb9e is `dependabot[bot]`. So the honest cast for Lessons Hardening reads: *Claude (claude-sonnet-5, self-reported) — 15 PRs · the operator — merged 3, decided 1 ADR · Dependabot — 1.* That is more interesting than a roster of names, because it shows what the human did. In a consumer repo with a roster, Persona/Role populate from the query git-conventions already documents (`git log --format='%(trailers:key=Persona,valueonly)' | sort | uniq -c`). One rule: show `self-reported` as a visible label. The trailer exists because a fabricated Model trailer once survived eight PRs and human review (git-conventions.md, `Model-Source` row); a cast that hides that is a claim without a receipt.

**The name.** "<Program> — Completion Ledger" has one real problem and one cosmetic one. Real: **"ledger" already means `docs/verification-ledger.md`** — PLAN.md's DoD criterion 2 ("the ledger's Correction column"), its Loop Protocol ("the ledger, `docs/plans/*/`"), and LH-13's note ("this program's own ledger") all use the bare word for the verification ledger. Two ledgers, two meanings, one repo; a future "update the ledger" is ambiguous. Cosmetic: "Completion Ledger" is a functional label with no recall.

Proposed: **Show Report** — `<Program> — Show Report`.

- *Meaning.* The stage manager's post-performance record: date and running times, everything of note that happened, incidents, notes for the director and producer (theatrecrafts.com, "The Show Report"; The Complete Stage Manager, "The Performance Report"; Mitti, "Stage Manager Post-Show Report" template). Section for section, that is this artifact. Kellar — "A good show is run from the wings, not the spotlight" — is the persona who would sign it.
- *Naming Test.* An established industry term exists for the thing; use it. Show Report passes the test rather than pleading exemption from it, and is stage vocabulary anyway.
- *Clearance.* Outward search ("Show Report" software / app / tool, 2026-09-02) returned generic reporting tools, no product by that name. Inward pass, per `spell-scry`'s mandatory rule: `grep -i "show[ -]?report"` across the repo — zero hits. Verdict in scry's taxonomy: **pass, with one disclosure** — in a product whose binary is `spell`, "show report" can be misread as an imperative (`show` + `report`). Mitigate by always title-casing the noun and never naming a CLI subcommand `show`. Run `spell-scry` for the formal four checks before it ships; this was a strategist's pass, not the spell.
- *Runner-up, with disclosure:* **Curtain Call** — the bow, the cast revealed, the show over. Search found curtaincallcfp.com, an AI-agent-built conference-CFP tool that describes itself as "an append-only ledger wearing a friendly face" — same name, live, adjacent audience (AI-engineer conferences). Pass-with-disclosure at best; I would not lead with it.
- *Killed:* Playbill (live trademark, Playbill Inc.); Programme (a spelling pun that reads as a typo in US English); Grimoire (means the spell book, not the run; crowded in developer tooling).

Eyebrow: "Arcane · Show Report" (operator) / "Arcane · Show Report — program completion record" (share). `<title>`: "<Program> — Show Report", ≤ 60 characters.

### 5. Accessibility and shareability

**Measured against the two ledgers** (WCAG 2.x contrast ratios computed from the palette tokens in the files; AA is 4.5:1 for normal text, 3:1 for large):

- Light-mode pills at 0.7rem bold (≈11 px — normal text): spell 2.86, process 3.82, docs 3.84, feature 4.10, fix 4.24, governance 4.48 — **six of eight fail**; decision 5.13 and platform 6.45 pass. Dark-mode pills all pass (5.33–6.79).
- `--ink-faint` (#8a8fa3): 3.21 on surface, 2.81 on bg — **fails at every size it is used** (stat labels 0.72rem, phase notes 0.82rem, colophon 0.8rem). Dark: 3.61 / 3.86 — fails.
- Eyebrow accent (#b8802e) on the light background: 2.99 — fails.
- `--ink-soft` passes everywhere (6.25–6.84); the row descriptions are fine.
- Emoji spans carry no `aria-hidden` — a screen reader announces "balance scale" before "Decisions Recorded" on every row.
- The stat rail is `div > span + span`; number and label are not programmatically associated.
- No `<main>`; sections lack `aria-labelledby`; no `lang` (the artifact host supplies the skeleton — a standalone or emailed file must).
- Zero links in rows (Findings 2).
- No `@media print`; the only media queries are `prefers-color-scheme` and `max-width: 640px`.
- Fonts load from Google Fonts via a `<link>` placed after `<style>`; fine on the artifact host, and the fallback stack (Georgia, Segoe UI, monospace) is present. For a standalone file, move it to the head.
- Every count in the dek and stat rail is hand-typed — the P4 pattern LH-05 removed from the README.

**Checklist — must be true before a report is shared with a client or the public:**

1. Heading order h1 → h2 → h3 with no skips; one h1, equal to the `<title>`.
2. Landmarks: `<header>`, `<main>`, `<footer>`; every `<section aria-labelledby>` its own heading.
3. Emoji `aria-hidden="true"`; category carried by pill text — color never the only signal (true today; keep it true if glyphs are added).
4. Contrast: the six light pills and `--ink-faint` to ≥ 4.5:1 (or raise their size to the large-text threshold); the eyebrow to ≥ 4.5:1. Put a contrast check on the palette tokens in CI so the palette cannot drift below AA.
5. Stat rail as `<dl>`; numbers in `<data value>`; dates in `<time datetime>`.
6. Links: every row → PR/ADR; meaningful link text ("PR #180 — Line-Citation Hygiene"); visible focus styles; external links marked.
7. Print / PDF: `@media print` forcing the light palette (`color-scheme: light`), shadows off, `.row { break-inside: avoid }`, link URLs printed after link text, a running header with title and date. Test with "Save as PDF" in two browsers — about two pages for Lessons Hardening, four for Become Current.
8. Open Graph in the raw HTML — unfurl scrapers do not run JavaScript (web-discoverability-standards WD-01): `og:title` = title; `og:description` = the dek, ≤ 200 characters; `og:image` 1200×630 (WD-14: ~1.91:1, safe margin, modest file size); `og:url` and `<link rel="canonical">` resolved at publish time, never baked in (WD-04); `og:type=article`; `article:published_time`; `twitter:card=summary_large_image`. The image: composite the real lockup (`assets/brand/arcane-lockup.svg`) over generated artwork (WD-15) — one template, program name and outcome line overlaid.
9. Privacy gate: `spell ward --gate` on the rendered HTML before any share; rule 25 — name the class, never the token. Both ledgers already say "a real client name"; the generator must be told to.
10. Share lens strips internal file paths and local URLs; ADR links point at the public DECISIONS.md anchors.
11. Responsive: no horizontal scroll at 320 px; legible at 200% zoom; the row grid already collapses at 640 px.
12. Every number in the masthead derived from the source files, never typed (LH-05's principle applied to the report).
13. `<title>` unique per program, ≤ 60 characters; `lang="en"`.
14. No animation now; keep it that way, or honor `prefers-reduced-motion`.
15. In a consumer repo marked `content_sensitivity: sensitive` (spell-close-session step 7; universal-agent-rules, Sensitive Repositories), the share lens is off by default.

## Sources

Repository (read-only; this repository's root):

- `README.md` — the pitch, the Arcanos table, "Built in public."
- `project.md` — mission, users ("near-zero friction for a solo developer is a hard constraint"), "Verification over assertion."
- `CLAUDE.md` — the working protocol.
- `.github\agents\circe.agent.md`, `bess.agent.md`, `kellar.agent.md`, `lince.agent.md`; roster listing of all 12 `.agent.md` files.
- `.arcane\governance\naming-conventions.md` — Naming Test, IP rule, roster table with epithets and clusters.
- `.arcane\governance\git-conventions.md` — Conventional Commits types/scopes, Short Description Rules, PR Requirements, Required Commit Trailers (`Model-Source`), attribution queries.
- `.arcane\governance\web-discoverability-standards.md` — WD-01, WD-04, WD-14, WD-15.
- `.arcane\governance\universal-agent-rules.md` — rules 25–27.
- `.arcane\governance\records-conventions.md` — retention and supersession (why the report must link, not copy).
- `.github\instructions\agent-output.instructions.md` — Doc-ID Link Format.
- `.github\prompts\spell-verification-ledger.prompt.md`, `spell-close-session.prompt.md`, `spell-open-session.prompt.md` (handoff consumption), `spell-present-arcane.prompt.md` (Tone).
- `docs\plans\lessons-hardening\PLAN.md` (Definition of Done, Coverage Map, Parked, LH-13 note), `OPERATOR-QUEUE.md`, `KICKOFF.md`.
- `docs\plans\become-current\OPERATOR-QUEUE.md` (Q-003 leak note; Q-009/Q-010 parked; Q-011's seven).
- `docs\verification-ledger.md` — 23 rows counted: 21 corrected, 1 confirmed, 1 unverifiable.
- `docs\rcas\RCA-001-static-drift-and-ci-only-gates.md` — Incident Summary, Timeline, RC-1.
- `journal\2026-09-02-lessons-hardening-program.md`; journal file list for 2026-08-30 → 09-02.
- `TODO.md` — Parked section (Prospero lore, "the Arcanos" copy pass); `IDEAS.md` — 2026-08-02 verification-ledger idea, 2026-08-30 "the methodology that draws its own state."
- `DECISIONS.md` headings: ARC-023, ARC-031, ARC-036, ARC-041.
- `git log --oneline -70`; bodies and trailers of c3143e6, 8c7eb9e, 5f4d068, cd7a2fb.
- `assets\brand\` — lockup and mark SVGs.
- Contrast ratios computed with a WCAG relative-luminance script over the ledger palette tokens (no files written).

Baseline artifacts (scratchpad): `become-current-ledger.html`, `lessons-hardening-ledger.html`.

Web (name clearance, searched 2026-09-02):

- https://theatrecrafts.com/pages/home/topics/stage-management/the-show-report/ — the show report, defined.
- https://sites.google.com/site/thecompletestagemanager/performance-and-maintaining-your-show/the-performance-report — contents of a performance report.
- https://mitti.com/library/education/stage-managery4a1N — post-show report template.
- https://curtaincallcfp.com/ — the "Curtain Call" collision.
- "Show Report" software / app / tool search — generic reporting tools only; no product by that name found.
