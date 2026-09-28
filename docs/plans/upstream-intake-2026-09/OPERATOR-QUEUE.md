# Operator Queue — Upstream Intake 2026-09

Related: [[development-methodology]] (the loop this queue gates), [[decision-documentation-standard]]
(how the ADRs in Q-003 are accepted or superseded).

The only surface where the loop asks the operator for anything. The loop **appends** entries (never
edits existing ones, never acts on an entry not marked done). The operator executes or decides, then
marks the entry: `- [x] done YYYY-MM-DD — <note>`.

Format per entry: **What / Why / Preconditions / Exact commands / Rollback / Status.**

---

## Q-001 — Merge UP-00

- **What:** Merge the PR that adds this plan's three files, the PRD, the
  `upstream-intake-2026-09-plan` entry in `.arcane/delegations.json`, the `TODO.md` routing notes, and
  this program's first Show Report pair.
- **Why:** The merge *is* the grant. Nothing in this plan authorizes autonomous work until it lands,
  the same way BC-00, LH-00, SR-00 and CS-00 activated theirs.
- **Preconditions:** Q-002 answered (so the merged PRD carries accepted defaults); UP-00's PR green.
- **Exact commands:** review and merge the UP-00 pull request in GitHub's UI (rebase or merge commit
  — never squash).
- **Rollback:** revert the merge, or remove the `upstream-intake-2026-09-plan` entry from
  `.arcane/delegations.json` later to revoke the grant without touching history.
- **Status:** [ ] open

## Q-002 — Accept or override the PRD's decision defaults (D-01 … D-16)

- **What:** Read `features/upstream-intake-2026-09/PRD.md` → "Decisions". For each of D-01–D-11,
  D-13, D-15, D-16, reply "accept" or give an override. D-12 (arcane-ui upstream) and D-14 (wave PRs)
  were decided on 2026-09-27 and are listed only for completeness.
- **Why:** These are the design choices eight issues cannot be implemented without. One review here
  replaces ~12 separate interruptions later. Three of them (D-01, D-04, D-05) additionally become
  ADRs whose final text you accept in Q-003.
- **Preconditions:** none.
- **Exact commands:** answer in the session (e.g. "accept all" or "accept all except D-08: …"); the
  session records the answer here verbatim and updates the PRD's `status` to `accepted`.
- **Also answer:** the version numbering (three minors, 1.6.0 → 1.8.0, recommended) and whether
  R-UP03-A3 (`requires`) stays in scope.
- **Rollback:** any decision can be overridden until the wave implementing it starts.
- **Status:** [x] done 2026-09-27 — operator answered "Accept all defaults" through the session's
  structured question, recorded here by the session on that instruction. D-16 was re-confirmed in
  the same exchange ("You merge every wave"). The version numbering (three minors) and R-UP03-A3's
  inclusion were not asked separately and stand at their recommended defaults under "accept all";
  either can still be overridden before UP-02 / UP-03 starts. ADR-routed decisions (D-01, D-04,
  D-05, and D-06 if Q-004 reproduces) still need Q-003 acceptance of their final text.

## Q-003 — Accept, revise, or reject the UP-01 ADRs

- **What:** Decide each ADR UP-01 drafts as `Proposed` in `DECISIONS.md`: push policy after init
  (amends ARC-034), decision-number allocation, placeholder taxonomy, and — only if Q-004 reproduces
  — transcript recovery. UP-01 appends the allocated numbers here when it drafts them.
- **Why:** Accepting an ADR is never within any delegation in this repository. UP-02 cannot start
  until the push-policy and placeholder ADRs are `Accepted`; UP-03 lane C waits on the numbering ADR.
- **Preconditions:** UP-01's PR open with all ADRs drafted.
- **Exact commands:** read each ADR; reply per ADR. The session flips `Status:` to `Accepted` in the
  UP-01 PR on your instruction.
- **Rollback:** supersede with a new ADR later, per `decision-documentation-standard.md`.
- **Operator pre-authorization (2026-09-27, in session, before UP-01 was drafted):** asked "may I
  treat each ADR as accepted tonight, provided the written ADR matches its default above without
  material deviation (any deviation halts that part for you)?", the operator answered **"Yes, if
  faithful"**, after a plain-language explanation of all three. UP-01 therefore drafts them as
  `Accepted` under that condition:
  - [ARC-049](../../../DECISIONS.md#arc-049--enforcing-a-recorded-push-policy-after-init) implements
    D-01;
  - [ARC-050](../../../DECISIONS.md#arc-050--decision-number-allocation-across-parallel-sessions)
    implements D-04;
  - [ARC-051](../../../DECISIONS.md#arc-051--placeholder-taxonomy-for-governance-documents)
    implements D-05.
  ARC-049 records two interpretations made while drafting, for the operator to confirm. The
  transcript-recovery ADR was not drafted, because Q-004 has not run.
- **Status:** [ ] open. The ADRs are accepted under the pre-authorization above, and the entry stays
  open for the operator to confirm, or to revise before merging UP-01, then mark done.

## Q-004 — Probe: does the client drop user messages on resume? (#267)

- **What:** An observation only you can make on your machine. In Claude Code, in any repository:
  1. Start a session; send three short, numbered messages ("probe one", "probe two", "probe three").
  2. While the third reply is still streaming, switch the model (`/model`) or interrupt and resume.
  3. Send "probe four". Ask the session to quote every "probe" message it can see.
  4. Run `ls -lt ~/.claude/projects/<this project>/` and note whether a new `.jsonl` appeared and
     whether the older one contains messages the new session could not quote.
- **Why:** #267's premise is client behaviour no source file can confirm. If it does not reproduce,
  #267 closes as not reproducible with this record, and no transcript-reading code is built.
- **Preconditions:** none. Can run any time before UP-03.
- **Exact commands:** as above; paste the result (which messages were visible, file listing) into
  this entry or the session.
- **Rollback:** none — observation only. Do not paste transcript content, only which numbered probe
  messages were present.
- **Status:** [ ] open

## Q-005 — Probe: does fenced Mermaid render in Claude Code's chat pane? (#270)

- **What:** In Claude Code (and, if convenient, VS Code Copilot Chat and Codex), ask the session to
  print this block verbatim, and note whether you see a diagram or raw text:
  ````
  ```mermaid
  flowchart LR
      A --> B
  ```
  ````
- **Why:** ARC-036 claims rendering surfaces that nobody has verified; #270 says Claude Code shows
  raw text. The corrected matrix marks a cell *verified* only from an observation like this one.
- **Preconditions:** none.
- **Exact commands:** as above; reply "rendered" or "raw text" per client.
- **Rollback:** none — observation only.
- **Result (2026-09-27, in session):** in the Claude app following a Claude Code cloud session, the
  operator saw a fenced ` ```mermaid ` block **"as text, with a copy button"**, not rendered. This is
  recorded as a verified cell in ARC-036's correction matrix. The other clients are still unobserved.
- **Status:** [ ] open. The one observed client is recorded; the operator marks this done, or adds
  more clients.

## Q-006 — Make the Show Report theme change in `arcane-ui` (#271)

- **What:** The report template is a compiled artifact vendored from the private `arcane-ui`
  repository (ARC-042), so the in-page theme toggle has to be built there first. Either make the
  change yourself, or attach `arcane-ui` to the UP-04 session so it can prepare a PR there for you to
  review and merge. Requirement for that change: a toggle that sets a `data-theme` attribute on the
  root element with `auto` preserving today's `prefers-color-scheme` behaviour byte-for-byte, and
  support for a `theme` value injected at render time (`dark|light|auto`).
- **Why:** A local edit here would be silently dropped at the next re-vendor (decided 2026-09-27:
  upstream first). Work in `arcane-ui` is outside this plan's delegation.
- **Preconditions:** none; needed before UP-04 lane A starts.
- **Exact commands:** merge the `arcane-ui` change and cut its build; tell the UP-04 session the
  commit or tag to re-vendor from.
- **Rollback:** revert in `arcane-ui`; this repository keeps the previous vendored template until
  re-vendored.
- **Status:** [ ] open

## Q-007 — Review and merge the overnight stacked wave PRs, in order

- **What:** On 2026-09-27 the operator asked for an unattended overnight run and answered four
  questions before leaving:
  1. **"Stacked PRs, no merges"**;
  2. ADRs accepted **"if faithful"** (Q-003);
  3. the Mermaid probe **"as text, with a copy button"** (Q-005);
  4. **"Skip both tonight"** for #267 and #271.

  The run therefore leaves one PR per wave, each targeting the previous wave's branch rather than
  `main`:
  - UP-01 targets `main`;
  - UP-02 targets UP-01's branch;
  - UP-03 targets UP-02's branch;
  - UP-04 (#266 only) targets UP-03's branch.
- **Why:** Every merge into `main` publishes to npm (`release-drift.yml` → `publish.yml`), and the
  operator chose to review before anything publishes (PRD D-16).
- **Preconditions:** each PR's body reports its local gate results. CI runs only on PRs into `main`
  (`ci.yml` `pull_request: branches: [main]`), so the stacked PRs have **not** been through CI yet.
- **Exact commands**, one wave at a time:
  1. Review and merge UP-01 into `main`.
  2. Ask the session to run `spell-sync-pull-request` on UP-02. It retargets UP-02 to `main`,
     rebases, and regenerates this program's Show Report, since the merged history changes its cast.
  3. Wait for CI to go green, review, and merge UP-02.
  4. Repeat steps 2–3 for UP-03 and UP-04.
  Each merge publishes one minor.
- **Rollback:** do not merge. Every wave stays reviewable and nothing is published until its merge.
- **Deferred tonight (still open):** #267 waits on Q-004; #271 waits on Q-006.
- **Status:** [ ] open

## Q-008 — Unrelated PRs into `main` must regenerate this program's Show Report until UP-05

- **What:** While this plan has no `completed:` date in its frontmatter, its Show Report counts every
  commit on `main` since the baseline, excluding only report-regeneration commits
  (`src/modules/show-report/model.ts`: "An in-progress program has no bound — 'as of now'").
  So any PR into `main`, even an unrelated one, changes the committed report. The golden test
  `test/report-cli.test.ts` then fails unless that PR regenerates it. It also counts that PR's commits
  as program work. First seen on 2026-09-28, when #290 (one `IDEAS.md` entry) had to regenerate the
  report to pass.
- **Why:** This is the designed behaviour for an active program, not a bug. But the program now has two
  open issues (#267, #271) that wait on you, so it may stay active for a while. Decide how long every
  other PR carries this cost.
- **Preconditions:** none.
- **Options:**
  1. Keep it active and accept the cost: each PR into `main` ends with a report-only regeneration
     commit (`npx tsx scripts/report.ts --fix --program upstream-intake-2026-09`).
  2. Close the program soon. UP-05 writes `completed:`, which fixes the report's end point. But
     UP-05 as planned requires all 19 issues closed, so closing now also means approving a scope
     change: #267 and #271 (UP-06) move to a follow-up plan.
- **Rollback:** none needed; this is a scheduling decision.
- **Status:** [ ] open
