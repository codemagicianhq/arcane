# Kickoff Prompt — Upstream Intake 2026-09 loop

Paste the block below into a fresh Claude/Arcane session in this repository to run ONE wave. Repeat
until `PLAN.md`'s Definition of Done holds. One wave per session, always.

Related: [[development-methodology]] (the iteration-loop shape this kickoff operationalizes),
[[agent-policies]] (the concurrency rules the parallel lanes follow).

---

Run /spell-open-session with focus: upstream-intake-2026-09 loop.

Then execute exactly one wave of the Upstream Intake 2026-09 program:

1. Read `docs/plans/upstream-intake-2026-09/PLAN.md` in full, and the PRD it names. PLAN.md is the
   authoritative backlog; its Authority & Delegation section (active once UP-00 is merged to `main`)
   defines what you may do without asking and what must be queued to `OPERATOR-QUEUE.md` instead.
2. Select the topmost unchecked epic whose dependencies and queue gates are satisfied. If none is
   eligible, halt cleanly and name the gate. Check `git worktree list` for anything this program did
   not create before creating lanes.
3. Run the epic's named empirical-first step before building. If it contradicts the epic as written,
   correct the entry in PLAN.md on the record and proceed against the tree.
4. Follow PLAN.md's Loop Protocol steps 4–7 exactly: architect the wave, **re-verify lane file
   ownership against the current tree (including `test/`)**, allocate any ARC numbers from the
   fetched trunk, create named worktrees (never the Agent tool's automatic worktree isolation), fan
   out one background subagent per lane with a self-contained brief, then integrate: allowlist check
   per lane → rebase lanes onto the wave branch → `fix:self-host-parity` → one `spell-bump` →
   `CHANGELOG.md` → build, lint, typecheck, full suite, every `check:*` gate → `spell-review`.
5. Subagents are generic workers with role instructions. Never present one as a rostered persona —
   this repository has no roster.
6. Cite by stable locator (a heading anchor or a unique quoted phrase) in every durable artifact —
   never a bare `file:line`.
7. Ship: rebase on `origin/main`, open ONE PR for the wave (lanes, allowlist check output, ACs with
   evidence, `Closes #NNN` / `Part of #NNN`), drive it green, then **stop — the operator merges every
   wave PR**.
8. After the operator merges: tick the epic with PR and version, write its `**Report:**` line, tick the
   `TODO.md` intake items, append queue items, and remove lane worktrees/branches only after
   content-verifying they are on `main`.
9. Run /spell-close-session. If a claim was corrected this session, run /spell-verification-ledger
   first. Name the next eligible epic and its gate in the handoff.

Halt instead of proceeding if: a lane escapes its allowlist twice; the full suite fails after
integration and the cause is not found this session; a required check is failing on `main`; an ADR
the wave depends on is not `Accepted`; or everything remaining is operator-blocked.

---

**Operator notes**

- Merging UP-00 activates the standing delegation; the loop is inert until then.
- Things that always come back to you: answering Q-002 (decision defaults), accepting ADRs (Q-003),
  the two probes (Q-004, Q-005), the `arcane-ui` change (Q-006), and **merging every wave PR**.
- Each merged code wave publishes a new minor to npm within minutes.
- To pause: stop launching sessions. To revoke autonomy: remove the `upstream-intake-2026-09-plan`
  entry from `.arcane/delegations.json` or edit PLAN.md's Authority & Delegation on `main`.
