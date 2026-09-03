# 2026-09-03 — Show Report: SR-00 Through SR-03, Activated and Shipped to npm

## Session: Open the session, activate the Show Report program, and ship its first four epics

### Prompt Context

The session began with `/spell-open-session` and no focus argument. The drift check came back
**NO-GO** on two HIGH findings; the operator chose to fix them, then gave the go for **SR-00** —
the activation the previous session had deliberately stopped short of ("I approve but don't
implement," 2026-09-02).

From there the operator drove one epic at a time, merging each activating PR themselves: SR-00,
then SR-01, then — after a genuine naming detour — ARC-042's acceptance, SR-02, and SR-03. Two
operator inputs materially changed direction:

- **The name.** Asked to accept ARC-042, the operator instead surfaced decision 2 for real
  reconsideration: *"since this is a unique kind of feature where a development term not
  necessarily exists, according to arcane we should come up with our own names, arcane lingo — is
  this a candidate to come up with our own cool memorable name? Or should we keep basic Show
  Report?"* Checked against `naming-conventions.md`'s own Naming Test rather than answered from
  taste, and the answer was to keep it (below).
- **Two model switches mid-session**, each an interrupt with no change of instruction: "i stopped
  you to change the model, continue where you left off."

### What Got Done

Every item below was confirmed `succeeded` under close-session step 1b — PR state via
`gh pr view`, publish state via `gh run list` plus `npm view arcane-cli version`.

1. **Doc-drift repair at session open** — `spell-check-drift` returned NO-GO on two HIGH findings:
   `project.md`'s "Current Goals" still listed EF-35, EF-36 and ARC-012 enforcement as open when
   `TODO.md` showed all three shipped (the file hadn't been touched since before they landed), and
   `ai-context/system-prompt-context.md` claimed every remaining `TODO.md` item was operator-scoped
   when several were agent-actionable. Both fixed, plus the Medium/Low set: `lessons-hardening/PLAN.md`'s
   stale frontmatter status, `DECISIONS.md`'s missing ARC-041 TOC row, and ARC-017's Obsidian-style
   `Related` line. Shipped in [PR #192](https://github.com/codemagicianhq/arcane/pull/192).
2. **SR-00 — program activation** ([PR #192](https://github.com/codemagicianhq/arcane/pull/192)):
   `features/show-report/PRD.md` via `spell-plan`, **ARC-042** drafted `Proposed`,
   `docs/plans/show-report/{KICKOFF,OPERATOR-QUEUE}.md`, the `show-report-plan` delegation record in
   `.arcane/delegations.json`, and `PLAN.md` flipped `draft → active`. The operator's merge is what
   activated the grant.
3. **SR-01 — parsers, model, JSON** ([PR #194](https://github.com/codemagicianhq/arcane/pull/194),
   recorded in [#195](https://github.com/codemagicianhq/arcane/pull/195)):
   `src/modules/show-report/{types,plan-parser,queue-parser,ledger-parser,decisions-parser,sources,model}.ts`,
   both closed programs' `show-report.json`, and a `**Report:**` line authored onto **all 47 epics**
   across `become-current/PLAN.md` (33) and `lessons-hardening/PLAN.md` (14).
4. **ARC-042 accepted** ([PR #196](https://github.com/codemagicianhq/arcane/pull/196)) — all seven
   decisions as drafted; `OPERATOR-QUEUE.md` Q-001 and Q-002 both closed. Q-001 had still read
   `[ ] open` hours after its own PR merged — the same P1 static-status drift Lessons Hardening's
   Q-001 exhibited, caught the same way.
5. **SR-02 — renderer, v0 template, CI gate** ([PR #197](https://github.com/codemagicianhq/arcane/pull/197),
   `v0.34.3`): `render.ts` via `mustache`, `src/assets/report/show-report.template.html` (the hand
   ledgers' CSS converted to the Mustache grammar — `<dl>` stat rail, `<ol>` ledger, landmarks,
   print CSS, three-state theming, zero runtime JS), `scripts/report.ts --check/--fix/--refresh`,
   and a warn-mode `check:report` step in `ci.yml`.
6. **SR-03 — `spell report`, and the publish fix** ([PR #198](https://github.com/codemagicianhq/arcane/pull/198),
   `v0.35.0`): the generation core extracted to `src/modules/show-report/generate.ts` so the shipped
   command could share it, `src/commands/report.ts` + `spell report [--plan] [--out] [--refresh]`,
   README entries, and the `publish.yml` shallow-checkout fix described below.
7. **`arcane-cli@0.35.0` published to npm** — confirmed by `npm view arcane-cli version` and a
   `Publish | v0.35.0 | completed | success` run, after `v0.34.3`'s publish had failed.

### Decisions Made

| ADR | Decision | Rationale |
| --- | --- | --- |
| [ARC-042](../DECISIONS.md#arc-042--show-report-compiled-template-distribution-model-and-program-decisions) | Accepted (all seven decisions as drafted): compiled-template output ships under MIT while arcane-ui source stays private; name stays **Show Report**; `mustache` added as a runtime dependency; Claude Design via `/design-sync`; register only Show Report in the export contract for now; no font licensing action; arcane-ui tags every publish. | The compiled-template model is the only one of three weighed options that gets exact visual fidelity, offline use, and open-source distribution at once. Rejected: a hosted render endpoint (network dependency, sends possibly-private report data off-machine) and open-sourcing arcane-ui outright (a ~200 KB React runtime for a static document, and a business decision far beyond this feature). |

**The name, decided deliberately rather than by default.** The operator asked whether Show Report
was a candidate for coined Arcane lingo. `naming-conventions.md`'s **Naming Test** answers it: *"if
an established industry term exists for the thing, use the real term — a universe name has to be
earned by the absence of one,"* with the corollary that *"the more autonomous the tool, the more
boring its name should be,"* and a Systems/Services tier that calls for functional names on
technical payloads. "Show Report" is already **earned lingo borrowed from theater** — a stage
manager's post-performance record — mapping directly onto what the artifact contains (epics,
corrections, dates, cast), while `spell report` and `show-report.json` stay plainly functional. A
coined name would have been decoration on a tool that runs unattended in CI. Kept, and the
reasoning recorded in ARC-042 and Q-002 rather than left as taste.

### Lessons Learned

**Looking at the rendered thing caught a defect three green gates did not — and the first fix was
also wrong.** SR-02's tests, lint and typecheck were all green when the page was rendered for an
eyeball check. Its stat rail read `0.33.2 → 0.34.2`; Lessons Hardening truly closed at `0.34.1`.
The cause was `sources.ts` treating "the last commit touching PLAN.md" as the close commit — and
SR-01's own backfill had just edited that finished plan. The first fix (bounding that same anchor
by author date) corrected Lessons Hardening and *silently broke Become Current* to `0.33.0`. Only
then was the real history measured instead of theorized: Become Current's last PLAN.md-touching
commit on its completed day sat at 0.33.0, while two version bumps landed later that same day
without touching the plan, and author dates are not monotonic along a rebase-merged log (a PR
authored 03:19 can land above one authored 06:46). The definition that reproduces both human
records is **"the commit `main` stood at when the `completed` day ended"** — any path, by committer
(landing) date `%cs`, which is TZ-safe and immune to rebase-merge rewrites. Two wrong answers
before the right one, both disclosed in the plan row rather than quietly replaced.

**A background task reporting "completed, exit code 0" is not evidence the thing passed.**
`gh pr checks <n> --watch`, run immediately after `gh pr create`, exits 0 within a second printing
`no checks reported on the '<branch>' branch` — it does not wait for checks to appear. The harness
then surfaces "completed (exit code 0)", which reads exactly like success. On PR #195 the summary
said completed while a fresh `gh pr checks` showed all three checks still *pending*. Merging on
that summary would have been the precise "reported-done vs. independent check" pattern (P6) this
repository's tooling exists to catch. Every subsequent PR used a readiness loop (poll until at
least one `pass|fail|pending` line exists, *then* `--watch`) and a live re-read of the actual
`pass` lines before merging.

**A test suite that passes in CI can fail in the publish job for reasons that have nothing to do
with the code.** `v0.34.3` merged with `ci.yml` green, then its publish job failed minutes later on
the same commit. `publish.yml` checked out with the default shallow depth while `ci.yml` uses
`fetch-depth: 0`; show-report's golden parity test derives the version span and cast from git
history, so in the shallow clone those fields silently vanished and the regeneration compared
unequal — the test reported the *omission* as **drift**. The fix is two-part on purpose: give
`publish.yml` full history, *and* make the tool distinguish "cannot verify here" from "drifted", so
the next environment that lacks history says what is actually wrong instead of accusing the
artifacts. Verified against a real `git clone --depth 1`, not asserted.

**A failing test sometimes means the fixture is incoherent, not the code.** A new test asserted the
shared `report-cli` fixture's version span was defined; it wasn't. The fixture's commits carried
*today's* real date while its plan claimed `completed: 2026-09-02`, so no close commit existed and
the span was correctly omitted. The code was right and the fixture had been quietly self-
contradictory since SR-02 — invisible because nothing had asserted on that field before. Pinned its
commit dates rather than weakening the assertion.

**Code that ships to consumers cannot live in `scripts/`.** SR-03's obvious implementation was for
`spell report` to call `scripts/report.ts`. `tsup` bundles only `src/index.ts`, so `scripts/` never
reaches the published package — the command would have worked in this checkout and broken on every
consumer install. The generation core moved to `src/modules/show-report/generate.ts`, with
`scripts/report.ts` reduced to a thin repository-specific wrapper. Caught by building and running
the real `dist/index.js` in a scratch repo rather than trusting unit tests that import from source.

**Verify against the artifact you actually ship.** The strongest check in SR-03 was not a unit
test: it was `node dist/index.js report` inside a throwaway repo with a copied `PLAN.md`, no Arcane
install and no network. That is what proved the template resolves from `dist/assets/`, the output
is idempotent, and a missing baseline SHA omits the version span instead of inventing one.

### Open Items Carried Forward

- **`OPERATOR-QUEUE.md` Q-003 — the orphan `v0.34.3` release** (operator-only). The tag and GitHub
  release exist but nothing was published to npm. `0.35.0` supersedes it, so nothing is broken;
  annotating or deleting that release is a platform mutation outside the delegation grant. **Do not
  re-run the `v0.34.3` publish** — that tag's commit still carries the shallow `publish.yml`.
- **SR-04** — the `## For the record` capture point in `spell-create-pull-request` and the loop's
  "Record" step, so future epics author their `**Report:**` line at PR time instead of being
  backfilled. Next in-repo epic; see `docs/plans/show-report/PLAN.md`'s Epics table.
- **SR-05a / SR-05b** — the Claude Design pass and the arcane-ui static-export build. These run in
  the private arcane-ui repository under its own governance; this loop does not open sessions there,
  and **SR-06 (vendoring the compiled template) is blocked until SR-05b ships**.
- **A verification-ledger entry for this session is worth writing** — it produced at least three
  genuine correction events (the version-span definition, twice; the `--watch` false success; the
  incoherent fixture). Run `spell-verification-ledger` to add the structured record; the narrative
  above is not a substitute for the calibration table.
