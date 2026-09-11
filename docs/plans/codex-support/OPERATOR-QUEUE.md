# Operator Queue — Codex Support

The only surface where the autonomous loop asks the operator for anything. The loop **appends**
entries (never edits existing ones, never acts on an entry not marked done). The operator executes
or decides, then marks the entry: `- [x] done YYYY-MM-DD — <note>`.

Format per entry: **What / Why / Preconditions / Exact commands / Rollback / Status.**

Cross-reference: Become Current's own `docs/plans/become-current/OPERATOR-QUEUE.md` Q-010 is the
item this program's CS-08 unparks — not duplicated here; CS-08 will append its own findings-based
entry to *this* queue once it runs.

---

## Q-001 — Merge CS-00

- **What:** Merge the PR that commits this plan's three files (`PLAN.md`, `KICKOFF.md`,
  `OPERATOR-QUEUE.md`), the `codex-support-plan` delegation record in `.arcane/delegations.json`,
  the completed `features/codex-support/PRD.md`, and `docs/research/skill-discovery-smoke-tests.md`.
- **Why:** This merge *is* the grant — nothing in this plan authorizes autonomous execution until
  it lands, mirroring exactly how Become Current's BC-00, Lessons Hardening's LH-00, and Show
  Report's SR-00 each activated their program's delegation.
- **Preconditions:** CS-00's PR is open with all required checks green.
- **Exact commands:** review and merge the CS-00 pull request via GitHub's own UI or
  `gh pr merge <PR#> --rebase`.
- **Rollback:** revert the merge commit, or edit/remove the `codex-support-plan` entry from
  `.arcane/delegations.json` at any later point to revoke the grant without touching history.
- **Status:** [x] done 2026-09-09 — merged by the operator ([PR #220](https://github.com/codemagicianhq/arcane/pull/220), merge commit `9c3ca28`, confirmed via `gh pr view 220`). The `codex-support-plan` delegation is active as of this merge.

## Q-002 — Accept, revise, or reject ARC-045

- **What:** Decide on the ADR CS-02 drafts as `Proposed` in `DECISIONS.md`: "One Spell Source,
  Thin Client Shims, and a User-Level Tier" — the canonical spell source moves to
  `.arcane/spells/<id>.md`, every client surface (Copilot, Claude, Codex) becomes a generated shim
  over it, a user-level install tier is introduced, and ARC-033 decision 1 / ARC-019 /
  `portable-bootstrap.md` are amended accordingly.
- **Why:** Accepting an ADR is never within any delegation's grant in this repository — always an
  explicit operator decision, regardless of autonomy level elsewhere. CS-03 (the canonical move)
  cannot start until this is `Accepted`.
- **Preconditions (met):** CS-01 shipped ([PR #221](https://github.com/codemagicianhq/arcane/pull/221),
  merged, `arcane-cli` 0.39.0 published) so the ADR reflects what actually exists; CS-02's PR
  merged — [PR #226](https://github.com/codemagicianhq/arcane/pull/226).
- **Exact commands:** read the ADR section in `DECISIONS.md`, then record the decision here and,
  if accepted, flip its `Status:` field to `Accepted` (or ask the executing session to do so on
  your behalf in the same PR once you've decided).
- **Rollback:** an accepted ADR can later be superseded via a new ADR entry, per
  `decision-documentation-standard.md`'s own supersession convention.
- **Status:** [x] done 2026-09-09 — **Accepted** by the operator ("accept ARC-045", direct
  instruction). `DECISIONS.md`'s ARC-045 `Status:` field flipped to `Accepted`. CS-03 may now begin,
  gated only on the CHANGELOG catch-up precondition and Q-003's version-number confirmation.

## Q-003 — Confirm the version number for CS-03

- **What:** CS-03 (moving the canonical spell source and converting every client to a generated
  shim) is a breaking change to the distribution contract and will bump `package.json`'s version.
  This plan recommends **1.0.0** ("one source of truth, N thin clients" — the framework's first
  stable-contract milestone), as an alternative to continuing the `0.x` line (e.g. `0.40.0`).
- **Why:** a merged version bump auto-publishes to npm within minutes
  (`release-drift.yml` → `publish.yml`) — this is a one-way door for every existing `arcane-cli`
  consumer, so the exact number is an explicit operator call, not an autonomous default, per this
  plan's own Authority & Delegation exclusion list.
- **Preconditions:** ARC-045 is `Accepted` (Q-002); the CHANGELOG.md catch-up (0.22.0 → current)
  has landed, so whichever version is chosen has a real changelog behind it.
- **Exact commands:** record the chosen version number here. The executing session applies it via
  the repo's normal `npm version` flow in CS-03's own PR.
- **Rollback:** none needed before the fact — this is a decision recorded ahead of the irreversible
  publish, not an action to undo.
- **Operator pre-decision (recorded 2026-09-09, via conversation):**
  **1.0.0** — "one source of truth, N thin clients," the framework's first stable-contract milestone,
  over continuing the `0.x` line. ARC-045 is now `Accepted` (Q-002) — one of the two preconditions
  above is met. Only the CHANGELOG catch-up remains before CS-03 itself may start, and this item is not
  marked done until both are satisfied and CS-03's own PR applies `npm version major`.
- **Applied (2026-09-09):** both preconditions are met — ARC-045 Accepted (Q-002) and the CHANGELOG
  catch-up merged as [PR #231](https://github.com/codemagicianhq/arcane/pull/231) — and CS-03's PR,
  [PR #232](https://github.com/codemagicianhq/arcane/pull/232), carries
  `chore(release): bump version to 1.0.0` (`npm version major`) plus the `## [1.0.0]` changelog entry.
  The PR is left open for the operator's merge — that merge is the act this item's `[x]` records. Mark
  it done with the merge commit once `publish.yml` has **succeeded**, not merely once the PR is merged
  (the 0.34.3 lesson recorded in `CHANGELOG.md`: a merged bump is not a published one).
- **Status:** [x] done 2026-09-09 — **1.0.0**, merged by the operator
  ([PR #232](https://github.com/codemagicianhq/arcane/pull/232), rebase, merge commit `a68c974`,
  confirmed via `gh pr view 232`); `release-drift.yml` cut `v1.0.0` (release published
  2026-09-10T06:05Z) and [`publish.yml` succeeded](https://github.com/codemagicianhq/arcane/actions/runs/34443698300)
  — `npm view arcane-cli version` returns `1.0.0` (published 2026-09-10T06:06Z), and the tarball lists
  `dist/assets/.arcane/spells/`. Recorded by the executing session after the operator's act, as Q-001
  and Q-002 were.

<!-- The loop appends Q-004+ below this line. -->

## Q-004 — Confirm the Copilot shim in VS Code (one minute)

- **What:** In VS Code with Copilot Chat in **agent mode**, in this repository once
  [PR #232](https://github.com/codemagicianhq/arcane/pull/232) has merged (or in any consumer at
  `1.0.0`), run `/spell-status` and confirm the reply is the read-only snapshot line (branch, counts,
  last session) rather than a paraphrase of the shim sentence.
- **Why:** CS-03 turned every `.github/prompts/*.prompt.md` into a generated shim — the canonical
  frontmatter block, a relative link to `.arcane/spells/<id>.md`, and the read-and-follow sentence.
  Claude Code and Codex were re-confirmed live by direct observation
  (`docs/research/skill-discovery-smoke-tests.md`, "CS-03 re-confirmation"); Copilot Chat cannot be
  driven from an agent session, so it is the one client whose behavior only you can observe (EV-01,
  Definition of Done item 3).
- **Preconditions:** PR #232 merged, or a consumer installed at `1.0.0`.
- **Exact commands:** open Copilot Chat → agent mode → type `/spell-status` → read the reply.
- **Rollback / if it fails:** nothing to undo on a pass — record the result here. If Copilot paraphrases
  the shim instead of running the spell, record that instead: the remedy is the `render()` mode variance
  ARC-045 allowed for — an inlined-body Copilot renderer — a small follow-up epic, not a redesign.
- **Status:** [x] done 2026-09-11 — **pass**, reported by the operator. `/spell-status` run inside an
  Arcane repository through the repo shim returned the real snapshot line, not a paraphrase:
  `[sessions/2026-09-08-codex-support-scoping] ↑unknown | 1● 0✎ 0? | 134 TODOs | 102 ADRs | last session: 2026-09-08`.
  The counts are read from that repository's own files, so the spell body ran. No inlined-body
  renderer is needed for Copilot; ARC-045's fallback stays unused. Recorded by the executing session
  after the operator's act, as Q-001 through Q-003 were.

## Q-005 — Try the user tier in Claude Code and VS Code Copilot (a few minutes, once)

- **What:** Install the user tier for real (`spell init --user`, `arcane-cli` `1.1.0` or later), then
  (1) in **Claude Code**, from a directory that is *not* an Arcane repository, run `/spell-status` and
  confirm the spell runs (the snapshot line) rather than paraphrasing its stub; (2) in **VS Code
  Copilot Chat**, open a folder that is *not* an Arcane repository, type `/`, confirm `spell-status` is
  listed, and run it. Record both results here. Keep the tier if you like it — `spell uninstall --user`
  removes exactly what it wrote and nothing else.
- **Why:** CS-04 fans every spell out to `~/.claude/commands/<id>.md` (Claude Code) and
  `~/.agents/skills/<id>/SKILL.md` (Codex and Copilot), each naming the spell's absolute path in
  `~/.arcane`. Codex was observed live from an empty directory, twice
  (`docs/research/skill-discovery-smoke-tests.md`, "CS-04"). Claude Code's user-level `@` include
  could not be observed from the executing session (its skill list is fixed at startup, and a nested
  CLI is not logged in), and Copilot Chat cannot be driven from an agent session at all — these two are
  the clients only you can observe (EV-01). Both are documented to work, and the Claude stub carries the
  read-and-follow sentence as well as the include.
- **Preconditions (met 2026-09-10):** [PR #234](https://github.com/codemagicianhq/arcane/pull/234)
  merged (`dac7a8f`) and `1.1.0` on npm since 2026-09-10T15:47Z (`npm view arcane-cli version`);
  `npm install -g arcane-cli@latest`. Nothing is installed at the user tier on this machine right now —
  the executing session uninstalled its own live check so that the precedence change is your call.
- **Exact commands:** `spell init --user` → Claude Code: `/spell-status` outside any repository →
  Copilot Chat: the `/` picker outside any repository → `spell status --user`. Inside a repository that
  still carries its own spells, Claude Code runs the *user tier's* copy (its documented "personal over
  project" rule) and Copilot lists both the repository prompt and the user skill — expected until CS-05's
  repo opt-out.
- **Rollback / if it fails:** `spell uninstall --user` (hash-checked; never deletes a file it did not
  write). If a client paraphrases instead of running the spell, record it here: the remedy is an
  inlined-body renderer for that client's user-level file — the `render()` mode variance ARC-045
  allowed for — a small follow-up, not a redesign.
- **Update 2026-09-11:** the tier is installed on this machine and current — global CLI and store
  both at **`1.2.0`** (`spell status --user`: 41 spells, 82 client files) — so steps (1) and (2)
  can be run as-is, with nothing to install or upgrade first.
- **Worth knowing before you look (new 2026-09-10, CS-05):** with the tier installed *and* a
  repository still carrying its own spells, which copy a client runs was observed to differ
  **per command** inside one session — `/spell-full-cycle` resolved through the user tier while
  `/spell-open-session` resolved through the project copy
  (`docs/research/skill-discovery-smoke-tests.md ("which tier's `/spell-*` actually runs")`). So
  run step (1) from a folder that is **not** an Arcane repository, where only the tier can answer.
  CS-05 now lets a repository opt out entirely (`spell_scope: "user"`), which is the real fix for
  the ambiguity — trying that in one of your repositories is a good second half of this check.
- **Status:** [x] done 2026-09-11 for the client checks; the opt-out trial moved to Q-007. **Both
  clients pass**, reported by the operator. From a folder that is **not** an Arcane repository,
  `/spell-status` ran through the user tier in **Claude Code (terminal)**, **VS Code**, and the
  **Claude Code desktop app**, all three returning the same real output — `Not a git repository, and
  no Arcane session files exist yet (TODO.md, DECISIONS.md, journal/ all missing).` followed by the
  snapshot line `not a git repository — [unknown] … | 0 TODOs | 0 ADRs | last session: none`. That is
  the spell body executing against an empty directory, so the personal command's absolute `@` include
  and the user-level skill both resolve in practice, not only in documentation. AC5's first half is
  therefore met by direct observation; the picker **count** across a multi-root workspace is what
  Q-007 now covers, because the same session found the counts are more interesting than expected.

## Q-007 — Try the repository opt-out, and count the picker (the other half of AC5)

- **What:** In one repository you are happy to experiment in, add `"spell_scope": "user"` to the top
  level of its `.arcane.json`, commit, then run `spell update` (reports, deletes nothing) and
  `spell update --prune` (removes the untouched copies, keeps anything you edited and names it).
  Then open that repository beside another Arcane repository in one VS Code workspace and count the
  `/spell-*` entries per spell, and the agent modes.
- **Why:** this is AC5's second half and the program's original motivation — "two repositories in one
  workspace show exactly one set of `/spell-*` entries". It needs a human looking at a picker. The
  mechanism is already verified end to end (two disposable repositories went to 0 and 160 spell files
  with governance untouched, `docs/research/skill-discovery-smoke-tests.md`, "CS-05"); the count is
  not, and 2026-09-11's operator testing showed the counting rules are subtler than the plan assumed
  (see `TODO.md`, "every spell is listed twice in VS Code Copilot").
- **Preconditions (met):** `arcane-cli` 1.2.0 installed, the user tier installed and current on this
  machine, and at least one repository already updated to 1.2.0.
- **Exact commands:**
  ```bash
  # in the repository you are opting out
  node -e "const f='.arcane.json',fs=require('fs'),m=JSON.parse(fs.readFileSync(f));m.spell_scope='user';fs.writeFileSync(f,JSON.stringify(m,null,2))"
  git add .arcane.json && git commit -m "chore(arcane): take spells from the user tier"
  spell update            # lists what it no longer manages; deletes nothing
  spell update --prune    # removes the untouched copies
  spell doctor            # must pass the "Spell scope (ARC-045)" row
  ```
- **Rollback:** set the field back to `"repo"` (or delete it) and run `spell update` — it reinstalls
  every spell file at the same version. Nothing you edited is deleted at any point.
- **Status:** [ ] open

## Q-006 — Accept, revise, or reject ARC-046 (restore-based delivery: no-go)

- **What:** Decide on the ADR CS-08 drafts as `Proposed` in `DECISIONS.md`: "Restore-Based Spell
  Delivery — No-Go for Now, Mechanism Retained". It closes Become Current's parked
  [Q-010](../become-current/OPERATOR-QUEUE.md#q-010--decide-whether-to-pursue-a-package-referenced-distribution-model)
  by recording that Arcane does not open a program to gitignore spell files and restore them from
  the dependency, and rejects the symlink/junction-referenced variant outright.
- **Why:** Accepting an ADR is never within a delegation's grant in this repository. The evidence is
  in `docs/research/restore-based-delivery.md`: a live prototype showed the restore mechanism already
  exists (today's same-version `spell update` restored 160 gitignored files on a fresh clone and Codex
  discovered them), and that an edit to a restored file is invisible to git and lost on the next
  clone — the customization overlay that would make the model safe does not exist. The user tier
  (CS-04) and the coming repo opt-out (CS-05) already answer the duplication that raised the question.
- **Preconditions:** CS-03 shipped (met — the canonical folder exists to spike against); CS-08's PR,
  [PR #237](https://github.com/codemagicianhq/arcane/pull/237), merged — it is an ADR-drafting PR, so
  it is **operator-merged**, not self-merged, per the plan's Authority & Delegation. Merging it is
  separate from deciding this item: the merge lands the draft and the session record; the decision is
  the `Status:` flip.
- **Exact commands:** read ARC-046 in `DECISIONS.md` and the research doc; record the decision here;
  if accepted, flip its `Status:` to `Accepted` (or ask the executing session to do so in the same PR).
  If you want the model after all, say so: a "go" opens a new program whose first epic is the
  customization-overlay design — it is not folded into Codex Support.
- **Rollback:** an accepted ADR can be superseded by a later ADR; nothing is implemented either way.
- **Status:** [ ] open

## Q-008 — Decide whether `spell_scope` keeps `repo` as its default

- **What:** After trying the user tier in three clients you asked whether it should become the default
  — a repository takes its spells from `~/.arcane` unless it opts back in. Decide: keep `repo` as the
  default permanently (the recommendation), or open a program to flip it.
- **Why:** The research is in [docs/research/default-spell-scope.md](../../research/default-spell-scope.md),
  commissioned at your request. It recommends **no**, on three grounds: the default is retroactive
  (almost no repository sets the field, so flipping it changes every existing one at once, and the
  merged-bump-to-npm chain has no step where a human looks); the failure in a home-less environment —
  a CI runner, a cloud client, a second machine, a collaborator's clone — is silent rather than loud,
  because the Spell Routing table keeps naming spells the client cannot find; and nothing catches it,
  since no workflow, hook, or spell runs `spell doctor` (verified by grep). Your three-client check
  established that the tier *works*, which is a different claim from the tier being safe to *assume*.
- **Preconditions:** CS-05 shipped (met — `1.2.0`). Nothing blocks on this decision; the default is
  already `repo` and stays that way unless you say otherwise.
- **Exact commands:** read the research doc; record the decision here. If you accept the
  recommendation, the executing session drafts a short ADR making the default permanent and files the
  three follow-ups (a `default_spell_scope` preference for new inits only, a loud opt-out, and an
  automatic `checkSpellScope` run) as TODO items. If you want the flip anyway, say so — that is a new
  program, not a patch, and its first epic is the home-less-environment story.
- **Rollback:** nothing is implemented either way; the decision is reversible by a later ADR.
- **Status:** [ ] open
