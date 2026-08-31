# Kickoff Prompt — Become Current loop

Paste the block below into a fresh Claude/Arcane session in this repository to run ONE loop
iteration. Repeat (or schedule / `/loop`) until PLAN.md's Definition of Done holds. One epic per
session, always.

---

Run /spell-open-session with focus: become-current loop.

Then execute exactly one iteration of the Become Current program:

1. Read docs/plans/become-current/PLAN.md in full. It is the authoritative backlog; its
   Authority & Delegation section (active once merged to main) defines what you may do without
   asking and what must be queued to docs/plans/become-current/OPERATOR-QUEUE.md instead.
2. Select the topmost unchecked epic whose dependencies are satisfied and which is not waiting on
   an operator-queue entry. Skip ADR-gated epics whose ADR is still Proposed. If BC-07 is the
   next eligible epic, note that its probe must be the first action of a FRESH session — if this
   session has already read repo files, take the next epic and leave BC-07 for the next iteration's
   opening.
3. Execute the epic per its Route and Detail section, under the plan's Loop Protocol and Standing
   Constraints (serialize src/assets work; one epic = one PR = one version bump where required;
   rebase before PR; no squash; verify, don't assert).
4. Ship: PR → required checks green → merge under the standing delegation → post-merge cleanup.
5. Record: tick the epic in PLAN.md with PR number (and version if bumped), close the TODO.md
   item(s), mark IDEAS.md entries, append any new operator items to OPERATOR-QUEUE.md.
6. Run /spell-close-session. In the handoff, name the next eligible epic.

Halt instead of proceeding if: two epics in a row halt on failures; drift check is NO-GO beyond
autonomous repair; a required check is failing on main; or everything remaining is operator-blocked
(then say so and stop cleanly).

---

**Operator notes**

- Merging the plan PR (BC-00) is what activates the standing delegation — the loop is inert until
  then.
- Your only recurring duty: check OPERATOR-QUEUE.md occasionally and clear entries; supply the
  parked inputs (batch-002, naming call, lore content) whenever you like.
- To pause the program: stop launching iterations. To revoke autonomy: edit or remove the
  Authority & Delegation section of PLAN.md on main.
