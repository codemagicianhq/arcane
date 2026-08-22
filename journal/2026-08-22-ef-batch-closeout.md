# 2026-08-22 — Overnight EF Batch Closeout: EF-22, EF-14, EF-08, EF-09

## Session: Autonomous overnight run of the full spell loop across four remaining intake findings, with a live-reproduced tool-environment bug found and worked around along the way

### Prompt Context

This session continued directly from PR #51's merge (a drift-repair pass on
TODO.md/CHANGELOG.md/DECISIONS.md/ai-context). The operator asked to tackle all
remaining feasible EF intake stories from `docs/intake/batch-001/` in one autonomous
overnight run of the full spell loop (plan -> architect -> implement -> test ->
review -> ship), with every clarifying question front-loaded so the run needed no
further input until morning. Four scoping questions were asked and answered up
front: **scope** = max feasible (all 10 executable items; docs-mode EF-03/04/07/
10/11/12 and EF-18 excluded, gated on operator design input); **merge authority** =
auto-merge on green (CI passes + no HIGH adversarial-review findings); **halt
policy** = skip-and-continue (a stuck package parks, independent packages proceed);
**ARC-028 naming** = rails only, defer the Parlor/Seance/Cabinet lore-name pick to a
live session. A mid-run `/model claude-sonnet-5` interruption confirmed continuation
on the approved plan, not a scope change.

Six work packages shipped across this session (three summarized here from before
this journal's own vantage point; WP5-WP7 are this entry's direct focus since they
ran after the context window's own compaction boundary):

- WP1 (EF-13+EF-20, non-interactive Git execution contract, 0.16.2)
- WP2 (EF-05+EF-32, init.ts Git-state contract, 0.16.3)
- WP3 (EF-21, close-session pending-verification, 0.16.4)
- WP4 (EF-33, ARC-028 R7 same-vantage-point rails, 0.16.5)
- **WP5** (EF-22, fail-safe CI path-filter policy / ARC-022, 0.16.6)
- **WP6** (EF-14+EF-08, persisted tracking config + business-root fixes / ARC-032,
  0.17.0)
- **WP7** (EF-09, push-safety PRD, no version bump)

### What Got Done

1. **WP5 shipped ARC-022 (EF-22) in [PR #56](https://github.com/codemagicianhq/arcane/pull/56), 0.16.6.** `cicd-standards.md`'s .NET/Node.js templates moved from include-based (or unfiltered) triggers to a narrow, filetype-scoped exclude list; the Terraform template's directory-prefix include glob (`infrastructure/terraform/**`) was corrected to a filetype glob (`**/*.tf`) matching Markdown-lint's already-correct pattern. Two adversarial review rounds: round 1 found the original "Terraform is correctly scoped" argument was internally inconsistent with its own comparison case; round 2 (after that fix) found the corrected Terraform filter still missed the dependency lock file (`.terraform.lock.hcl`) and JSON-syntax variants, plus a genuine miscount of ARC-022's always-trigger categories (six claimed, seven actually named). Both closed before merge.

2. **WP6 shipped ARC-032 (EF-14+EF-08) in [PR #57](https://github.com/codemagicianhq/arcane/pull/57), 0.17.0.** `tracking_mode`/`external_provider` now persist in `.arcane.json` on exactly `profile`'s existing contract (asked once, retrofit-backfilled, never silently overwritten); `spell-open-session`/`spell-plan` resolve root manifest -> self-hosted source manifest -> PRD frontmatter -> ask, fixing a live bug this repo's own checkout was hitting every session. `ExternalProvider`'s type was corrected from an unused `azure-devops|github|gitlab|jira` to the vocabulary ARC-011 and both prompts actually use (`ado|jira|other`). EF-08's hardcoded `ventures/` was replaced with resolved `{BUSINESS_ROOT}` across seven spells, not the five the intake originally named -- two more (`spell-summon-venture.prompt.md`, `spell-save-idea.prompt.md`) were found only via three rounds of adversarial review, the last of which found nothing but a stale count string in the planning docs themselves. New ADR (ARC-032) explicitly *amends* ARC-020 rather than flipping it to Accepted, since ARC-020's own broader schema-unification question stays genuinely open -- the same pattern ARC-030 already established for the venture-registry slice of the same concern. ARC-020 gained an "Amended by" backlink to both.

3. **WP7 wrote the EF-09 push-safety PRD in [PR #58](https://github.com/codemagicianhq/arcane/pull/58), no version bump.** `features/push-safety/PRD.md`: a threat model, a comparison of all six mechanisms EF-09 named (plus two more found during research), a layered recommended design reusing ARC-032's just-shipped persistence pattern, and a bypass/recovery contract. Two review rounds on the *reasoning* (no code exists) empirically verified the git-mechanics claims by building a real disposable test repo, and found the recommended design would have silently disabled this very repository's own Husky hooks (`core.hooksPath` is one exclusive slot, not additive) and that the bypass contract's typed-confirmation step claimed a codebase precedent that doesn't exist and doesn't meaningfully resist the threat actor it was meant to guard against. Round 2 also caught that round 1's fixes had landed in explanatory asides but not the operative spec sections an implementer would actually build from -- fixed in a third, narrowly-scoped pass. EF-09.md stays `deferred` with a note pointing at the PRD; TODO.md carries an explicit "needs operator review" item.

4. **Closed out the batch:** TODO.md's Batch 001 section has zero unchecked items except EF-09 (correctly pending operator review, not implementation) and the explicitly-excluded docs-mode items (EF-03/04/07/10/11/12) plus EF-18, all still `deferred` and untouched, exactly as scoped. All three PRs merged via `gh pr merge --rebase`, remote branches deleted, primary checkout fast-forwarded after each.

### Lessons Learned

#### A live, reproducible Edit/Write tool bug: edits can silently land in the wrong of two working directories

Partway through WP6, several Edit/Write tool calls reported success and were even
readable back through the Read tool -- but the changes were never actually on the
worktree's disk (confirmed via independent `stat`/`grep`/`md5sum` through Bash).
Hours later, at WP6's post-merge cleanup, the *primary checkout* (a different
directory sharing the same `.git`) turned up byte-identical uncommitted changes to
those exact files. The edits weren't lost -- they landed in the wrong of the two
working directories a linked-worktree session has open at once. Separately, large
Bash heredocs (roughly 9KB+) threw bash syntax errors even fully quoted, and literal
backslash characters underwent multiple undocumented halving passes between a Bash
command and the file that finally lands. All three are now recorded in a persistent
memory (`tooling_edit_write_worktree_misdirect.md`) rather than left to be
rediscovered next session. The practical fix for the rest of this session: verify
every consequential write independently through Bash rather than trusting the tool's
own success report, chunk large new files into ~50-line heredoc appends, and build
any needed backslash programmatically (`String.fromCharCode(92)`) instead of typing
it. When something that should have worked appears to have vanished, check the
*other* working directory before concluding it's gone -- in a multi-worktree repo,
"missing" and "misdirected" look identical from inside just one of the trees.

#### Re-verifying a plan against current HEAD earns its keep every time it's done

Every one of WP5-WP7's PRDs opened with a "re-verified against current HEAD" pass
before writing anything, and every single one found the plan or the intake finding
had gone stale in a way that mattered: WP6 discovered `types.ts` already had the
`tracking_mode`/`external_provider` schema fields (just unpopulated, unvalidated,
and drifted to the wrong enum values) rather than genuinely missing them as EF-14
claimed; two of EF-08's five original file citations pointed at lines that no
longer held the hardcode they were filed against; WP7's own research turned up that
this repository's *own* `core.hooksPath` is already claimed by Husky, which the
PRD's first draft would have silently disabled if ever implemented as first
written. None of these were found by trusting the intake doc's line numbers --
all were found by grepping current HEAD directly before writing a word of design.

#### Adversarial review converges when the underlying work is actually sound, and that convergence is itself useful signal

WP6 and WP7 each went through three review rounds. In both cases the findings
shrank in scope and severity round over round: WP6 round 1 found two files still
carrying the EF-08 hardcode (real code gaps); round 2 found one more line in one of
those same two files plus a decorative test assertion (smaller); round 3 found
nothing but a corrected count string not yet swept into every planning-doc location
that asserted it (documentation-only, zero functional risk, and both reviewers who
checked confirmed the shipped code and tests were already fully correct). That
shrinking pattern -- not just the raw finding count -- is what made continuing to
the next round proportionate rather than diminishing-returns busywork: a WP whose
round-3 findings are still functional/HIGH would call for parking under the
operator's own halt policy; one whose round-3 findings are exclusively
"the same already-correct sentence needs to appear in one more file" does not.

#### An ADR amending a Proposed ADR is a real, reusable pattern now used twice

ARC-030 amended ARC-020 for the venture-registry slice of its unresolved
inline-vs-separate-file question (chose separate); ARC-032 amended it again for
the tracking-config slice (chose inline, on `profile`'s existing precedent). Two
data points is enough to see the actual decision rule: the right storage model
depends on the *shape* of the data (a small scalar choice vs. a growing, multi-entry
dataset), not a blanket policy either ADR could have picked once and applied
everywhere. Flipping ARC-020 itself to Accepted after either slice would have
misrepresented its still-open broader question as settled; amending it while
leaving it Proposed, with an explicit backlink, kept the record honest about what
was actually decided versus what remains open -- worth naming as the default move
for any future incremental resolution of a deliberately-broad, not-yet-Accepted ADR.

### Open Items Carried Forward

- **EF-09's push-safety PRD needs an operator decision** before any implementation
  work starts: accept the recommended `push_policy: blocked|guarded|open` design,
  request a different mechanism mix, or answer the PRD's own open questions
  (per-repo vs. per-directory granularity; whether non-CLI Git clients honor
  `core.hooksPath` hooks the same way the CLI does -- flagged unverified, not
  assumed; whether interactive-TTY-only is sufficient agent-resistance for the
  unblock command or a genuine out-of-band channel is needed).
- **Docs-mode profile (EF-03/04/07/10/11/12) and EF-18 remain the named next
  session's topic**, per the operator's own scope decision at the start of this
  run -- untouched, still `deferred`, gated on operator design input.
- **ARC-028's naming** (Parlor/Seance/Cabinet or otherwise) and its Accepted flip
  are still deferred to a live session, per the operator's own decision; WP4's R7
  rails shipped without them back on 2026-08-22 (`0.16.5`).
- **`package-lock.json`'s own version field is stale** (`0.16.1`, six version bumps
  behind `package.json`'s `0.17.0`) -- pre-existing drift, not introduced this
  session, doesn't affect the version-bump CI gate (which only checks
  `package.json`), but is misleading on its own terms. Flagged as a spawned
  follow-up task rather than fixed inline, to avoid pulling an unrelated dependency
  resync into a docs/governance PR.
- **An unrelated, pre-existing TODO.md item** (no EF number -- "Arcane's source
  repository generates standing agent instructions for consumers but had none
  itself") remains marked INCONCLUSIVE from 2026-08-02, awaiting a genuinely fresh
  session's re-verification. Not touched this session; noted here only so it isn't
  mistaken for newly-stale.
