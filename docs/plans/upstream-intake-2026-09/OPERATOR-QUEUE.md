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
- **Status:** [ ] open

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
- **Status:** [ ] open — pending UP-01

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
- **Status:** [ ] open

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
