# Kickoff Prompt — Codex Support loop

Paste the block below into a fresh Claude/Arcane session in this repository to run ONE loop
iteration. Repeat until `PLAN.md`'s Definition of Done holds. One epic per session, always.

Related: [[development-methodology]] (the iteration-loop shape this kickoff operationalizes).

---

Run /spell-open-session with focus: codex-support loop.

Then execute exactly one iteration of the Codex Support program:

1. Read `docs/plans/codex-support/PLAN.md` in full. It is the authoritative backlog; its Authority
   & Delegation section (active once CS-00 is merged to `main`) defines what you may do without
   asking and what must be queued to `docs/plans/codex-support/OPERATOR-QUEUE.md` instead.
2. Select the topmost unchecked epic whose dependencies are satisfied. Check `git worktree list`
   for footprint overlap before starting (`arcane-arc028` is a known bystander, not this program's
   — leave it alone regardless of what it shows).
3. **Two hard gates block specific epics — check before selecting:**
   - CS-03 may not start until [ARC-045](../../../DECISIONS.md) is `Accepted` (OPERATOR-QUEUE.md
     Q-002) **and** the target version number is confirmed (Q-003). If CS-02 is done but either
     gate is open, halt cleanly and say so — do not guess a version number or proceed on a
     `Proposed` ADR.
   - CS-03 must not be *merged* under the standing delegation regardless of Q-003's status — see
     PLAN.md's Authority & Delegation exclusion list. Open the PR, run it green, then stop and
     report; the operator merges this one PR by hand even after the grant is otherwise active.
4. Run the epic's named empirical-first step BEFORE building anything (e.g. CS-00's actual client
   checks; CS-03's consumer-migration fixture test). If it contradicts the epic's premise as
   written, correct the epic entry on the record and proceed against the tree, not the text — the
   same discipline the three prior programs were built to make routine.
5. Execute per the epic's Route and mechanism description, under the plan's Standing Constraints
   (serialize `src/assets/`/registry work; one epic = one PR = one version bump where required;
   rebase before PR; no squash; verify, don't assert). For a `chain`-route epic, invoke
   `spell-full-cycle` end to end (it already runs Plan → Architect → Implement → Test → Review →
   Ship as one pipeline with its own single human gate at merge time — do not re-run those phases
   separately).
6. Cite by stable locator (a heading anchor or a unique quoted phrase) in every durable artifact
   you touch — never a bare file:line.
7. Ship: PR → required checks green → merge under the standing delegation (except CS-02's ADR PR
   and CS-03, both operator-merged regardless) → post-merge cleanup.
8. Record: tick the epic in `PLAN.md` with its PR number (and version if bumped), fill its
   `**Report:**` line, close the `TODO.md`/PRD item(s) it routes from, and append any new operator
   items to `OPERATOR-QUEUE.md`.
9. Run /spell-close-session. If a claim was corrected this session, run /spell-verification-ledger
   first. In the handoff, name the next eligible epic — including whether it's gated on
   `OPERATOR-QUEUE.md`.

Halt instead of proceeding if: two epics in a row halt on failures; drift check is NO-GO beyond
autonomous repair; a required check is failing on `main`; the next epic is CS-03 and either ARC-045
isn't `Accepted` or the version number isn't confirmed; or everything remaining is operator-blocked
(then say so and stop cleanly).

---

**Operator notes**

- Merging the plan PR (CS-00) is what activates the standing delegation — the loop is inert until
  then, same as Become Current's BC-00, Lessons Hardening's LH-00, and Show Report's SR-00.
- Three things always come back to you regardless of the grant: CS-00 itself (this activation),
  accepting ARC-045 (and ARC-046 if CS-08 recommends adoption) via `OPERATOR-QUEUE.md`, and
  CS-03's merge (plus confirming its version number beforehand) — a merged version bump
  auto-publishes to npm within minutes, so that one merge stays a human act even after everything
  else is autonomous.
- Your only other recurring duty: check `OPERATOR-QUEUE.md` occasionally and clear entries.
- To pause the program: stop launching iterations. To revoke autonomy: edit or remove the
  Authority & Delegation section of `PLAN.md` on `main`, or remove the `codex-support-plan` entry
  from `.arcane/delegations.json`.
