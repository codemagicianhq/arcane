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
- **Status:** [x] done 2026-09-11 — **pass**, counted by the operator on a two-folder workspace built
  for the purpose (two disposable repositories at `1.3.1`, `lite` profile, each with its own full
  Arcanos roster). **Before** the opt-out: **3** entries for `spell-status` — `/Spell-Status` twice,
  one per folder, plus one lowercase `/spell-status`. **After** both opted in: **1**, the lowercase
  entry, resolving to `~/.agents/skills`. The before-count was predicted in writing first and matched
  exactly. Recorded in `docs/research/skill-discovery-smoke-tests.md` ("AC5 measured").

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
- **Status:** [x] done 2026-09-11 — **accepted, and the narrow half built the same day**
  ([ARC-048](../../../DECISIONS.md)). The operator kept `repo` as the permanent meaning of an absent
  field and took the preselect for new repositories only: "for the flip, just as suggested, for new
  repos only not old ones." `default_spell_scope` now lives in the store's own manifest, set with
  `spell update --user --default-scope repo|user`, read only at `spell init` time. The question is
  still asked either way — a preference changes which answer is highlighted, never the outcome. The
  research's gate came with it: `spell update` in an opted-out repository now checks that the store
  exists and warns loudly, naming the path and both remedies, because `spell doctor` already failed
  on this and nothing runs `spell doctor`.

## Q-009 — Accept, revise, or reject ARC-047 (agents are roster-rendered, and get a user tier)

- **What:** Decide on the ADR CS-06 drafts as `Proposed` in `DECISIONS.md`: "Agents Are
  Roster-Rendered, Not Registry-Distributed, and Get a User Tier". It supersedes
  [ARC-002](../../../DECISIONS.md), which is still marked `Accepted` and describes the opposite of
  what ships.
- **Why:** Accepting an ADR is never within a delegation's grant in this repository. This one also
  settles a question you asked directly and that nobody had written down: why agent files come from
  `spell agents init`/`sync` rather than from the installer like spells and governance. The answer is
  structural — a `.agent.md` file's name and contents are chosen per repository by the roster's
  naming strategy, and a registry component declares fixed paths, so it cannot deliver a file whose
  name the consumer picks. ARC-002 decided the opposite in 2026-05-14, the code retired it before
  this repository's public history begins, and the entire surviving record is a four-line comment in
  `src/modules/registry.ts`.
- **Preconditions:** CS-04 shipped (met — the user tier exists to extend). CS-06's PR carries the
  draft and the implementation together; merging that PR is self-mergeable under the delegation, and
  is separate from this decision, which is the `Status:` flip.
- **Exact commands:** read ARC-047 in `DECISIONS.md`; record the decision here; if accepted, flip its
  `Status:` to `Accepted` (or ask the executing session to do so).
- **Rollback:** an accepted ADR can be superseded by a later ADR.
- **Status:** [x] done 2026-09-11 — **accepted with one revision**, decided by the operator after a
  question that turned out to matter: "if I go with option 1, are you saying the agents won't be
  available in Claude Code?" Checking the answer found that the roster tables reach Claude Code
  through `CLAUDE.md` today, **but only when the repository has a roster of its own** — a repository
  that opted in and never ran `spell agents init` got no tables at all, which contradicts ARC-045
  decision 6. Two changes followed. The fallback is a bug fix (ARC-047 decision 12). The revision is
  decisions 3 and 4: the operator asked for Claude Code subagents, and because the two home locations
  share one discovery table with no deduplication, *adding* `~/.claude/agents` would have listed every
  persona twice in VS Code. The files **moved** there instead — one file, both clients, one entry
  each — with the delegation call recorded as decision 11: descriptions gate automatic delegation
  rather than invite it, reversible in one line per role if the operator changes their mind.

## Q-010 — Count the agent modes, once, in a two-folder workspace (the last EV-01)

- **What:** After CS-06 ships and you have run `spell agents sync --user` once, open two Arcane
  repositories in a single VS Code workspace with at least one of them opted out
  (`spell_scope: "user"`), and count the agent modes per persona in the picker.
- **Why:** This is the one premise CS-06 could not verify from inside an agent session, and it is
  named as unverified in ARC-047's consequences rather than hidden. The VS Code build on this machine
  carries the discovery table literally, with `~/.copilot/agents` as a `storage: "user"` row beside
  the workspace rows, and the *sibling* table's user row is already confirmed live — your VS Code
  lists a user-tier skill from `~/.agents/skills` with none of the relevant settings set. The agent
  half is an inference from that, not a measurement. The vendor documentation describes home-directory
  agent discovery as an Agent Host behavior and calls Agent Host opt-in, which the shipped build does
  not appear to gate on; that disagreement is exactly why a human has to look.
- **Preconditions:** CS-06 merged and published; `spell agents sync --user` run once; one repository
  opted out with its leftover `.github/agents` files removed (the sync prints the `git rm` line).
- **Exact commands:**
  ```bash
  spell agents init --user     # once per machine, if you have not already
  spell agents sync --user     # writes ~/.copilot/agents/<name>.agent.md per agent
  spell doctor                 # in the opted-out repository: the scope row must pass
  ```
  Then open the two-folder workspace and count. **Pass:** one entry per persona. **Also worth
  recording:** whether the opted-out repository's personas appear at all, which is what proves the
  home location resolves.
- **Rollback / if it fails:** if the home location turns out not to resolve, say so here — the fix is
  one string (`~/.claude/agents` instead of `~/.copilot/agents`), and nothing else in ARC-047 moves.
  To undo the tier entirely: `spell uninstall --user` removes exactly the files it recorded writing.
- **Status:** [x] done 2026-09-11 — **pass**, counted in the same workspace and the same sitting as
  Q-007. **Before:** each Arcano appeared **3** times — once per folder plus once from
  `~/.copilot/agents`, since agents deduplicate nowhere. **After** both opted in: **1**. This also
  settles ARC-047's one unverified premise: the operator's VS Code has no `agentHost`,
  `useAgentSkills` or `*FilesLocations` setting, and the agent rendered to `~/.copilot/agents` was in
  the picker, so the home rows resolve by default. The one-string fallback ARC-047 named is not
  needed. Recorded in `docs/research/skill-discovery-smoke-tests.md` ("AC5 measured").

## Q-011 — Confirm the personas in Claude Code (one minute, once)

- **What:** In any Claude Code session started after upgrading, check that the twelve Arcanos appear
  as available agent types, and that asking for one by name works.
- **Why:** ARC-047 decision 3 rests on two different grades of evidence. The VS Code half was read
  out of that client's own shipped discovery table and then counted in a picker. The Claude Code half
  — that `~/.claude/agents/<name>.md` is a user-scope subagent — comes from Anthropic's published
  documentation and has not been observed. A session's agent list is fixed at startup and a nested
  CLI is not logged in, so no agent session can check it (the same EV-01 limit as Q-004 and Q-005).
- **Preconditions:** `arcane-cli` at the version carrying ARC-047's amendment, and
  `spell agents sync --user` run once after upgrading, which moves the files from
  `~/.copilot/agents` to `~/.claude/agents` and prunes the old copies.
- **Exact commands:**
  ```bash
  spell agents sync --user     # moves the files; prints what it wrote and what it removed
  ls ~/.claude/agents          # expect one <name>.md per rostered agent
  ```
  Then start a **new** Claude Code session and ask it to list its available agents, or ask for one by
  name: "use the Merlin agent to review this architecture". **Pass:** the persona is available and
  answers in character.
- **Worth checking while you are there:** that Claude Code does **not** route work to a persona on
  its own. Each description ends "use only when explicitly asked for *name* by name; do not delegate
  to this persona automatically" (ARC-047 decision 11). If you find it delegating anyway, say so —
  that is a one-line change per role, not a redesign.
- **Rollback:** `spell uninstall --user` removes exactly the files it recorded writing, in both the
  old and the new location.
- **Status:** [x] done 2026-09-11 — **pass on all three checks**, reported by the operator from both
  the Claude Code terminal and the desktop app. All twelve personas appear, each with its role.
  Invocation by name works: "use the Merlin agent to review this architecture" dispatched a real
  background agent that answered in character. And the negative check held — a generic architecture
  question was answered directly, with no persona involved. Both clients went further than the check
  asked and stated the rule back unprompted: *"these only run when you ask for them by name — I won't
  route to them on my own."* The description written for ARC-047 decision 11 is doing exactly its
  job. This closes the last evidence gap in that ADR: the Claude Code half rested on published
  documentation, and is now observed.
