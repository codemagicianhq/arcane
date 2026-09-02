# Kickoff Prompt — Lessons Hardening loop

Paste the block below into a fresh Claude/Arcane session in this repository to run ONE loop
iteration. Repeat until PLAN.md's Definition of Done holds. One epic per session, always.

Related: [[development-methodology]] (the iteration-loop shape this kickoff operationalizes).

---

Run /spell-open-session with focus: lessons-hardening loop.

Then execute exactly one iteration of the Lessons Hardening program:

1. Read docs/plans/lessons-hardening/PLAN.md in full. It is the authoritative backlog; its
   Authority & Delegation section (active once LH-00 is merged to main) defines what you may do
   without asking and what must be queued to docs/plans/lessons-hardening/OPERATOR-QUEUE.md instead.
2. Select the topmost unchecked epic whose dependencies are satisfied and which is not waiting on
   an operator-queue entry. Skip LH-12 while ARC-041 is still Proposed. Check `git worktree list`
   for footprint overlap before starting (`arcane-arc028` is a known bystander, not this program's —
   leave it alone regardless of what it shows).
3. Run the epic's named empirical-first step BEFORE building anything. If it contradicts the
   epic's premise as written, correct the epic entry on the record and proceed against the tree,
   not the text — this is the exact discipline this program exists to make routine.
4. Execute per the epic's Route and mechanism description, under the plan's Loop Protocol and
   Standing Constraints (serialize src/assets work; one epic = one PR = one version bump where
   required; rebase before PR; no squash; verify, don't assert).
5. Cite by stable locator (a heading anchor or a unique quoted phrase) in every durable artifact
   you touch — never a bare file:line. This is the citation grammar LH-07 formalizes; use it from
   LH-00 onward regardless of whether LH-07 has shipped yet.
6. Ship: PR → required checks green → merge under the standing delegation → post-merge cleanup.
   RCA and ADR-drafting PRs (LH-02, LH-11) are operator-merged regardless of this rule.
7. Record: tick the epic in PLAN.md with PR number (and version if bumped), close the TODO.md
   item(s) it routes from, mark IDEAS.md entries, append any new operator items to
   OPERATOR-QUEUE.md, update RCA-001's Preventive Actions row once LH-02 has created it.
8. Run /spell-close-session. If a claim was corrected this session, run
   /spell-verification-ledger first. In the handoff, name the next eligible epic.

Halt instead of proceeding if: two epics in a row halt on failures; drift check is NO-GO beyond
autonomous repair; a required check is failing on main; or everything remaining is operator-blocked
(then say so and stop cleanly).

---

**Operator notes**

- Merging the plan PR (LH-00) is what activates the standing delegation — the loop is inert until
  then, same as Become Current's BC-00.
- Two epics always come back to you regardless of the grant: LH-02 (RCA-001's approval) and LH-11
  (ARC-041's accept/revise/reject call, via OPERATOR-QUEUE.md Q-002/Q-003).
- Your only other recurring duty: check OPERATOR-QUEUE.md occasionally and clear entries.
- To pause the program: stop launching iterations. To revoke autonomy: edit or remove the Authority
  & Delegation section of PLAN.md on main, or remove the `lessons-hardening-plan` entry from
  `.arcane/delegations.json`.
