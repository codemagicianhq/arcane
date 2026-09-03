# Kickoff Prompt — Show Report loop

Paste the block below into a fresh Claude/Arcane session in this repository to run ONE loop
iteration. Repeat until `PLAN.md`'s Definition of Done holds. One epic per session, always.

Related: [[development-methodology]] (the iteration-loop shape this kickoff operationalizes).

---

Run /spell-open-session with focus: show-report loop.

Then execute exactly one iteration of the Show Report program:

1. Read `docs/plans/show-report/PLAN.md` in full. It is the authoritative backlog; its Authority &
   Delegation section (active once SR-00 is merged to `main`) defines what you may do without asking
   and what must be queued to `docs/plans/show-report/OPERATOR-QUEUE.md` instead.
2. Select the topmost unchecked epic in **this repository** (`arcane-cli`) whose dependencies are
   satisfied. Check `git worktree list` for footprint overlap before starting (`arcane-arc028` is a
   known bystander, not this program's — leave it alone regardless of what it shows).
3. **Cross-repo epics are not this loop's to execute.** SR-05a (design, via Claude Design's
   `/design-sync`) and SR-05b (the `arcane-ui` build) run in the private `arcane-ui` repository under
   its own `spell-plan` → `spell-architect` cycle — this loop does not open sessions there. Treat
   them as an external dependency: SR-06 (vendoring the compiled template into `src/assets/report/`)
   cannot start until SR-05b has shipped and published a new `arcane-ui` version. If the topmost
   unblocked epic in this repo is SR-06 and SR-05b has not visibly landed (check `arcane-ui`'s
   published version / changelog, or ask the operator), halt cleanly and say so rather than guessing
   at a template that doesn't exist yet.
4. Run the epic's named empirical-first step BEFORE building anything (e.g. SR-01's stat
   re-derivation against the two real hand ledgers; SR-02's determinism check against a second
   `--fix` run). If it contradicts the epic's premise as written, correct the epic entry on the
   record and proceed against the tree, not the text — the same discipline Become Current and
   Lessons Hardening were both built to make routine.
5. Execute per the epic's Route and mechanism description, under the plan's Standing Constraints
   (serialize `src/assets/` work; one epic = one PR = one version bump where required; rebase before
   PR; no squash; verify, don't assert).
6. Cite by stable locator (a heading anchor or a unique quoted phrase) in every durable artifact you
   touch — never a bare file:line, per the citation grammar Lessons Hardening's LH-07 formalized.
7. Ship: PR → required checks green → merge under the standing delegation → post-merge cleanup.
   SR-00 (this activation) and SR-07 (operator-confirmed automation) are operator-merged regardless
   of this rule; see the Authority & Delegation section for the full exclusion list.
8. Record: tick the epic in `PLAN.md` with its PR number (and version if bumped) — including the
   `**Report:**` line the epic's own data-contract design (schema v1) expects future sessions and
   Show Report itself to read — close the `TODO.md` item(s) it routes from, mark `IDEAS.md` entries,
   and append any new operator items to `OPERATOR-QUEUE.md`.
9. Run /spell-close-session. If a claim was corrected this session, run /spell-verification-ledger
   first. In the handoff, name the next eligible epic — including whether it's blocked on the
   cross-repo `arcane-ui` dependency described in step 3.

Halt instead of proceeding if: two epics in a row halt on failures; drift check is NO-GO beyond
autonomous repair; a required check is failing on `main`; the next epic is SR-05a/SR-05b (cross-repo,
not this loop's to run); SR-06 is next but SR-05b hasn't shipped; or everything remaining in this
repo is operator- or cross-repo-blocked (then say so and stop cleanly).

---

**Operator notes**

- Merging the plan PR (SR-00) is what activates the standing delegation — the loop is inert until
  then, same as Become Current's BC-00 and Lessons Hardening's LH-00.
- One epic always comes back to you regardless of the grant: SR-00 itself (this activation, plus
  accepting ARC-042 via `OPERATOR-QUEUE.md` Q-002). SR-07 additionally requires your explicit
  confirmation before the pipeline automation it describes goes live.
- SR-05a and SR-05b happen outside this loop entirely, in the private `arcane-ui` repository under
  its own governance — you (or whoever runs that repo's sessions) drive those directly; this loop
  only waits on their result for SR-06.
- Your only other recurring duty: check `OPERATOR-QUEUE.md` occasionally and clear entries.
- To pause the program: stop launching iterations. To revoke autonomy: edit or remove the Authority
  & Delegation section of `PLAN.md` on `main`, or remove the `show-report-plan` entry from
  `.arcane/delegations.json`.
