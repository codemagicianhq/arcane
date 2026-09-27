# PRD: Upstream Intake 2026-09 — every open GitHub issue, fixed in parallel waves

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
status: accepted
created: 2026-09-27
accepted: 2026-09-27 (all decision defaults, OPERATOR-QUEUE.md Q-002)
program: docs/plans/upstream-intake-2026-09/PLAN.md
---

Related: [[development-methodology]] (the Spell Loop this PRD is executed through),
[[git-conventions]] (branch, PR and merge rules every wave follows), [[agent-policies]]
(multi-agent concurrency rules the parallel lanes must honour).

## Problem Statement

`codemagicianhq/arcane` has **19 open GitHub issues** (#261–#271, #274–#275, #277–#282), all filed
between 2026-09-16 and 2026-09-18, none with comments, all mirrored in `TODO.md`'s three
"Upstream intake" sections. The count and the one-to-one match with `TODO.md` were checked against
GitHub on 2026-09-27 (`list_issues state=OPEN`, `totalCount: 19`). They arrived from three routes:
the operator's private hub (#261–#271), a consumer session's `spell-feedback` (#274–#275), and a
consumer's manifest-retrofit session filed directly (#277–#282).

They are individually small and collectively awkward: they cluster on a handful of files
(`src/modules/hub.ts`, `src/commands/init.ts`, `src/commands/update.ts`, and the session/commit/PR
spells), eight of them need a design decision before code, and every one that touches
`src/assets/` forces a version bump — so fixing them one PR at a time means up to ~17 releases and
strictly serial merges.

**Why now:** two carry real risk. #280 hides a defect worse than its title: a repository whose
operator answers "block pushes" during `spell update` is recorded as `blocked` but is **not**
blocked, nothing says so, and no command can enforce it afterwards (see *Premise corrections*).
#262 lets private idea text reach a public repository's working tree without the per-entry
disclosure consent every other public destination requires.

This PRD covers all 19 in one program, prioritized, executed through the Spell Loop in **waves**:
one wave = one PR = one version bump, with independent stories inside a wave run by parallel
subagents in separate worktrees.

## Target Users

- **Operators of Arcane-managed repositories** — especially ones that declared a repository
  sensitive (#280), run setup from an AI coding harness with no terminal (#282, #278), or use a
  hub to promote ideas to public repositories (#261, #262).
- **Agents executing spells** — clearer required-action output (#266), safe numbering across
  parallel sessions (#264), PR bodies that survive a halted rebase (#269).
- **The framework maintainer** — lessons and intake that currently stop at the journal (#274, #275).

## Premise corrections (verified against source on 2026-09-27)

These change what "fixing" the issue means. Each was checked in source, not taken from issue text;
evidence is in the issue catalogue compiled for this PRD.

| Issue | Issue says | Source says | Consequence |
|---|---|---|---|
| #280 | `push_policy` is consumed nowhere | The CLI consumes it (`init.ts`, `doctor.ts` `checkPushPolicy`, `unblock-push.ts`, `uninstall.ts`); **no spell or governance doc** reads it. `universal-agent-rules.md` points at "the push-safety controls in `git-conventions.md`", a section that does not exist. | Scope becomes: spells + governance, **plus** the unreported gap below. |
| #280 (new) | — | `src/modules/hub.ts` says "unlike init, the retrofit does not install the hook" (ARC-034 decision 7), `update.ts` prints nothing about it, and **no command other than `init` can install the controls**. | A retrofit-recorded `blocked` can never be enforced without uninstall + re-init. Highest-severity item in the program. |
| #281 | `spell init` has no `.gitattributes` | `full` and `docs` profiles already ship it via the `docs-baseline` component; `lite`, `methodology`, `governance-only`, and installs predating the component do not. | Fix is the three profiles + reaching old installs, not a new scaffold. |
| #282 | "may be primarily a spell-instruction fix" | `init`/`update` have **no** flags for the manifest questions; `--profile` skips all questions. | New CLI flags are required. |
| #279 | example `spell-elevate` | exists nowhere; real history is `spell-bootstrap-business → spell-summon-venture`, `spell-assess → spell-scope`, retired `agent-files` component. | Regression fixtures use the real renames. |
| #261 | a fixed tag vocabulary exists | `spell-save-idea` only infers a free-form tag ("e.g., `ui`, `infra`, `marketing`, `dx`"). | "Extend/replace" becomes "declare a vocabulary"; the leak-scan half stands. |
| #263, #275 | `spell-todo --sweep` visits registered repos / idea books | it reads only hub `TODO.md` books ("Report-only — no edits"). | A scope decision (D-08) precedes both. |
| #277 | `{PLACEHOLDER}` in active docs is a defect | `{UPPER_SNAKE}` is the documented runtime-resolution convention (`spell-authoring-standards.md`); ~40 intended tokens ship today. | A naive detector would fail every consumer on day one; a taxonomy (D-05) precedes it. |
| #267, #270 | client behaviour (transcript fork; raw Mermaid in Claude Code chat) | not verifiable from source. | Each starts with an operator-observed probe; #267 closes as not reproducible if the probe fails. |

## Prioritization

Ranked by severity × blast radius, then by what each unblocks. **Rank decides priority; the wave
is decided by dependencies and file ownership** (see *Execution model*), which is why a few
lower-ranked items share the first code wave with the top ones.

| Rank | Issue | Severity | Why this rank | Wave |
|---|---|---|---|---|
| 1 | #280 push policy enforcement | **Med — false protection** | A repo declared sensitive stays pushable, silently | UP-02 |
| 2 | #262 manifest disclosure gate skips PRD scaffold | **Med — privacy** | Private idea text reaches a public repo without consent | UP-02 |
| 3 | #282 prompts drivable from AI harnesses | Med — friction | Setup cannot complete from Claude Code/VS Code/Codex; unblocks #278/#266 examples | UP-02 |
| 4 | #269 empty PR body after halted rebase | Low–Med — silent wrong | PRs ship with no description | UP-02 |
| 5 | #278 retrofit ignores documented ADO default | Low–Med — silent wrong | Wrong tracking mode chosen blind | UP-02 |
| 6 | #264 decision-number collisions | Med — silent collision | Also bites this program's own parallel ADRs | UP-01 (ADR), UP-03 |
| 7 | #279 update silent on retired/renamed | Low–Med | Agents guess successors, delete wrong files | UP-03 |
| 8 | #266 "needs you" convention | Med — friction | Required steps skimmed past | UP-04 |
| 9 | #277 unfilled placeholders | Low — quality | False "active" signal | UP-02 |
| 10 | #261 tags as leak surface | Low–Med — privacy hardening | Explicit scan of a field that travels with entries | UP-02 |
| 11 | #274 close-session routes lessons | Low–Med — process loss | Framework lessons never reach the maintainer | UP-03 |
| 12 | #281 `.gitattributes` for all profiles | Cosmetic | Mostly fixed already | UP-03 |
| 13 | #265 tracker-id suffix | Low — friction | | UP-03 |
| 14 | #268 `spell-todo --prune` | Low — friction | | UP-03 |
| 15 | #263 idea-validation prompts | Low — friction | Needs D-08 | UP-03 |
| 16 | #275 harvest unrouted lessons | Low — process | Needs D-08 | UP-03 |
| 17 | #267 transcript recovery | Low–Med — unverified premise | Probe first | UP-01 (probe/ADR), UP-03 |
| 18 | #270 ARC-036 Mermaid claim | Low — docs accuracy | | UP-01 |
| 19 | #271 Show Report theme | Cosmetic — cross-repo | Needs an arcane-ui change | UP-04 |

## Decisions (recommended defaults — operator accepts or overrides in PRD review)

Each default below is what the program executes unless the operator overrides it in
`OPERATOR-QUEUE.md` Q-002. Items marked **ADR** are drafted as `Proposed` ADRs in UP-01 and need
their own acceptance (Q-003); the rest are recorded here and nowhere else.

- **D-01 — push policy after init (#280). ADR, amends ARC-034.** Add `spell block-push`, the
  symmetric counterpart of `spell unblock-push`, which installs exactly what `init` installs for
  `blocked`/`guarded`. Tightening needs no TTY gate; loosening still does (ARC-034 decision 6
  unchanged). The retrofit keeps not installing mid-update (decision 7 stands) but prints a
  required-action notice naming `spell block-push`. `guarded` becomes visible where pushes happen:
  push-performing spells read `push_policy` and ask before pushing; under `blocked` they do not
  attempt the push and say why. `git-conventions.md` gains the "Push safety" section
  `universal-agent-rules.md` already cites. *Why:* the gap is that nothing can enforce the recorded
  choice; a new command closes it without making `update` mutate git config behind the operator.
  The command name is checked with `spell-scry` before the ADR is drafted.
- **D-02 — flag surface (#282).** `spell init` and `spell update` accept `--tracking-mode`,
  `--external-provider`, `--content-sensitivity`, and `--push-policy` (plus the hub-role flag if
  the retrofit asks it — exact set confirmed against `MANIFEST_RETROFITS` in UP-02), validated by
  the same validators as the manifest fields. A flag may set an unset field or **tighten**
  `push_policy`; it may never loosen it — `spell unblock-push` stays the only way out and stays
  terminal-only. A non-TTY run without flags keeps today's skip but prints the exact flag line to
  re-run with. `init --profile` stops skipping questions that flags answer. *Why:* the minimum
  surface that lets a harness finish setup without opening a non-interactive path around ARC-034.
- **D-03 — "ADO context" for the CLI (#278).** Pre-select `external`/`ado` when any configured
  remote is on `dev.azure.com` or `*.visualstudio.com`; pre-select nothing otherwise. Every option
  shows one line of downstream effect. The Parked spell-side resolution-order item in `TODO.md`
  stays parked (different fix, same definition — the definition is written once and cited). *Why:*
  a remote host is the only ADO signal a CLI can read deterministically before a PRD exists.
- **D-04 — decision-number allocation (#264). ADR, implements ARC-028 R4's re-derivation for
  decision IDs.** Any spell that allocates a decision ID first fetches the trunk (when a usable
  remote exists) and allocates `max(local, remote trunk) + 1`; the local-only path uses the local
  maximum and says so. No reservation marker (a marker is itself a shared-sequence edit that
  collides). A duplicate-ID check runs in an existing CI gate. Inside this program the orchestrator
  allocates every ID a wave needs once, at wave start. *Why:* re-derivation already ships for
  migrations (`spell-full-cycle` b1); this generalizes a proven pattern instead of adding locks.
- **D-05 — placeholder taxonomy (#277). ADR.** Tokens the authoring standard lists as
  runtime-resolved are legal in `status: active` docs; documents meant to be filled in by hand take
  `status: template` and are skipped. The check is a **non-blocking** `spell doctor` warning naming
  unknown tokens in active docs. The runtime-token list lives in `spell-authoring-standards.md`.
  *Why:* flags real gaps without failing every consumer on the ~40 intended tokens.
- **D-06 — transcript recovery (#267). ADR, conditional.** Probe first (`OPERATOR-QUEUE.md` Q-004).
  Not reproduced → close #267 as not reproducible, with the evidence. Reproduced → Claude Code
  only, read-only, opt-in per session, **offer** (never auto-replay) the missing user messages,
  disabled when `content_sensitivity: sensitive`, and no transcript content written to repository
  files. *Why:* the premise is client behaviour nobody has verified, and the feature reads a
  client-private store outside the repository.
- **D-07 — Mermaid rendering (#270). Correction on ARC-036, no new ADR.** Replace "renders in VS
  Code chat, GitHub, and Obsidian" with a per-surface matrix whose cells say *verified* or
  *unverified*; keep fenced Mermaid as the only emission (no client-specific widget/artifact
  routing). The Claude Code chat-pane cell is filled by the operator probe (Q-005). *Why:* routing
  to one client's tools would couple every diagram-emitting spell to that client.
- **D-08 — sweep scope (#263, #275).** `--sweep` stays hub-local: hub `TODO.md` books, hub
  `IDEAS.md` books, and the hub's own journal. It never reads consumer clones. #263's prompts are
  opt-in (`--validate`) and write only after one batch confirmation. The status-comment grammar is
  extended backward-compatibly and `spell-manifest`'s parser changes in the same story. *Why:*
  reading consumer clones widens what a hub-side spell touches — a privacy and scope change nobody
  asked for.
- **D-09 — `.gitattributes` (#281).** Split `.gitattributes` into its own component included in
  every profile; `docs-baseline` keeps the docs-oriented `.gitignore`. Existing installs learn about
  it through the "newly available" report (R-UP03-A2) — never auto-installed (EF-17's reasoning).
- **D-10 — tag vocabulary (#261).** Optional validated manifest field
  `idea_tags: { mode: "extend" | "replace", tags: string[] }` — an incremental ARC-020 field, noted
  on ARC-020 when it ships. `spell-manifest` Step 7 names tags explicitly as a scanned field.
- **D-11 — halted rebase (#269).** The pre-PR rebase uses `git rebase --autostash`; the PR body
  file is written before any step that can halt; both PR paths refuse to create a PR whose body is
  empty.
- **D-12 — Show Report theme (#271). Decided 2026-09-27: upstream in `arcane-ui`**, then re-vendor
  here and add `spell report --theme dark|light|auto`. The `arcane-ui` change is operator-gated
  (different repository, different governance — Q-006).
- **D-13 — "needs you" (#266).** One ARC-039 fragment, `_fragments/needs-you.md`, expanded into
  every spell whose output can carry a required operator action, plus a handoff field; landed last
  as a single sweep so it covers the final text of every spell this program changed.
- **D-14 — release model. Decided 2026-09-27: wave PRs.** One wave = one PR = one version bump
  (minor for each code wave: 1.6.0, 1.7.0, 1.8.0 if taken in order). Every merged bump
  auto-publishes to npm (`release-drift.yml` → `publish.yml`).
- **D-15 — registry deltas (#279).** The registry gains retired/renamed metadata (successor +
  one-line reason); `spell update` prints one "Registry changes since your install" section covering
  retired/renamed items (#279), newly available components, and missing prerequisites.
- **D-16 — who merges.** The operator merges every wave PR after review (the "~5 reviews" the wave
  model was chosen for). The standing delegation covers everything up to a green, reviewed PR.

## Requirements

Every requirement names the issue(s) it closes. Wave and lane assignment is in
[PLAN.md](../../docs/plans/upstream-intake-2026-09/PLAN.md#wave-and-lane-map).

### Must Have

- **R-280a — enforce a recorded `blocked`/`guarded` after init** (#280, D-01). `spell block-push`
  installs the same controls `init` installs; the retrofit prints a required-action notice when it
  records `blocked`/`guarded`; `spell doctor`'s "declared but not enforced" remedy names the new
  command.
  - AC: in a fixture repo retrofitted to `blocked`, `spell update` output contains the notice, and
    after `spell block-push` a real `git push` to a bare remote is refused (same real-remote test
    style as `test/push-safety.test.ts`).
  - AC: `spell block-push` never loosens an existing policy and refuses when `core.hooksPath` is
    owned by another manager (ARC-034 decision 3 preserved).
- **R-280b — spells and governance honour `push_policy`** (#280, D-01). `spell-commit-work`,
  `spell-create-pull-request`, `spell-ship`, `spell-sync-pull-request`, and `spell-close-session`
  read the field before any push; `git-conventions.md` gains the "Push safety" section.
  - AC: string-assertion tests prove each push step reads `push_policy` and names both behaviours;
    `universal-agent-rules.md`'s push-safety reference resolves to an existing heading.
- **R-262 — disclosure gate keyed on visibility** (#262). `spell-manifest` Step 5 treats **any**
  destination whose repository is `visibility: "public"` as a disclosure, including (b) PRD scaffold.
  - AC: the Step 5 text enumerates no destination list; a test asserts the (b) route is covered.
- **R-282 — manifest questions answerable by flags** (#282, D-02).
  - AC: `spell init --profile lite --tracking-mode internal --push-policy guarded` in a non-TTY run
    records both fields and asks nothing; `spell update --push-policy open` on a `blocked` repo is
    refused with a pointer to `spell unblock-push`; invalid values fail with the validator's message.
  - AC: `spell-arcane-version` and `spell-open-session` tell an agent to collect answers through the
    harness and pass flags, instead of "run `spell update` from a terminal".
- **R-278 — documented default applied** (#278, D-03).
  - AC: with an `https://dev.azure.com/...` remote, the prompt's pre-selected option is
    `external`/`ado`; with a GitHub remote nothing is pre-selected; `hub.ts` and `init.ts` stay
    mirrored (one shared helper, tested once).
- **R-269 — PR body survives a halted rebase** (#269, D-11).
  - AC: `spell-commit-work` writes the body file before step 9b and rebases with `--autostash`;
    both PR paths contain an explicit empty-body refusal; `git-conventions.md`'s guard snippet
    matches.
- **R-264 — safe decision numbering** (#264, D-04).
  - AC: `spell-close-session` step 3 (and any other allocating spell) fetches and takes the maximum;
    a CI-run check fails on a duplicate `## ARC-NNN` heading, with a negative fixture.
- **R-279 — registry changes are explained** (#279, D-15).
  - AC: upgrading a fixture manifest that tracked `spell-bootstrap-business` prints its successor
    `spell-summon-venture` and the reason; a retired component prints its note; nothing is deleted
    without `--prune`.
- **R-277 — placeholder check** (#277, D-05).
  - AC: `spell doctor` warns (exit code unchanged) on an unknown `{TOKEN}` in a `status: active` doc,
    stays silent for a listed runtime token and for `status: template` docs; running it on a fresh
    `full` install of this version produces **zero** warnings.
- **R-266 — "needs you" convention** (#266, D-13).
  - AC: the fragment exists, `check:self-host-parity` verifies every expansion, the handoff template
    has a required-actions field, and `spell-open-session` surfaces it first.
- **R-271 — Show Report theme** (#271, D-12).
  - AC: `spell report --theme light` output renders light regardless of `prefers-color-scheme`;
    `auto` is byte-identical to today's output; the in-page toggle comes from the re-vendored
    template; `check:report-template` and `check:report` pass with regenerated goldens.
- **R-261 — tags are a declared, scanned field** (#261, D-10).
  - AC: `idea_tags` validates (bad `mode` → `ManifestInvalidFieldError`); `spell-manifest` Step 7
    lists tags as scanned; `spell-save-idea` draws from the declared vocabulary when one exists.
- **R-274 — close-session routes lessons** (#274).
  - AC: close-session gains a routing step (framework → `FEEDBACK.md` queued, product idea →
    `spell-save-idea`, repo-local → journal only) with one batch confirmation, no public write, and a
    `--no-route` opt-out.
- **R-265 — tracker-id suffix** (#265). AC: in `tracking_mode: external`, `spell-todo`,
  `spell-save-idea` and `spell-manifest` append the provider-format suffix defined once in
  `development-methodology.md`; internal mode is unchanged.
- **R-268 — verified prune** (#268). AC: `spell-todo --prune` is report-first, one batch approval,
  migrates an unrecorded outcome before deleting, and never deletes an unchecked item.
- **R-263 / R-275 — sweep extensions** (#263, #275, D-08). AC: `--sweep --validate` writes answers
  only after batch confirmation and `spell-manifest` parses the extended grammar (old grammar still
  parses); `--sweep` lists `### Lessons Learned` headings since the last sweep that nothing
  references, report-only.
- **R-281 — `.gitattributes` everywhere** (#281, D-09). AC: `spell init --dry-run` for every profile
  lists `.gitattributes`; the component is `skipExisting`/`initOnly`; an old install sees it in the
  "newly available" report.
- **R-270 — ARC-036 corrected** (#270, D-07). AC: the matrix replaces the bullet; every *verified*
  cell cites its observation.
- **R-267 — transcript recovery or evidence it is not needed** (#267, D-06). AC: either the probe
  record shows no fork and #267 is closed with it, or open-session gains the opt-in recovery step
  with the D-06 limits, each asserted in a test.

### Should Have

- **R-UP03-A2 — "newly available, not installed" report.** From `TODO.md` ("LOW: `spell update`
  never surfaces a registry component added after a repository was installed"). Not a GitHub issue,
  but it is how R-281 reaches existing installs and it lives in the same `update.ts` section as
  R-279. AC: the report names each missing component with its exact `spell add` line and installs
  nothing.
- **R-UP03-A3 — `requires` on components.** From `TODO.md` ("MEDIUM: a spell can be installed
  without the governance doc it cites"). Same section, same file. AC: `spell doctor` reports an
  installed component whose `requires` are missing. Dropped first if UP-03 runs long.

### Won't Have (this program)

- Changing `stories.json`'s schema or `spell-full-cycle`'s single-branch model to support lanes
  natively. This program runs lanes with per-lane stories files and records what that taught; a
  framework change is a separate decision afterwards (see PLAN.md, "What this program will teach").
- Any flag or non-interactive path that loosens `push_policy` (ARC-034 decision 6).
- Reading consumer clones from a hub sweep (D-08).
- The `TODO.md` items not listed above, including the Parked tracking-mode resolution-order item and
  "Claude Code worktree branches bypass Arcane's branch-naming standard" — the lanes avoid that bug
  by construction (named worktrees), but fixing the spells is its own change.

## Execution model

- **Waves.** UP-01 (decisions, no bump) → UP-02 → UP-03 → UP-04 (one minor bump each) → UP-05
  (close). One wave per session, one PR per wave, merged by the operator.
- **Lanes.** Inside a wave, work splits into lanes by **file ownership**, not by issue: each file a
  wave touches belongs to exactly one lane, and a story goes to the lane that owns its files (so one
  issue can span lanes). Lanes with disjoint files run in parallel as subagents, each in its own
  linked worktree on a named local branch; nothing in a lane is pushed.
- **Orchestrator-owned files** (no lane may touch them): `package.json`, `package-lock.json`,
  `CHANGELOG.md`, `DECISIONS.md`, `.github/workflows/**`, and any test file shared between two
  lanes' spells (assigned at wave start).
- **Integration.** The orchestrator checks each lane's diff against its file allowlist
  (mechanically), rebases the lanes onto the wave branch one after another (conflict-free because
  disjoint), regenerates self-host copies, bumps once, runs the full gate suite once, runs an
  adversarial review of the combined diff, and opens one PR with `Closes #NNN` for every issue the
  wave completes.
- **Spell Loop mapping.** Per wave: Plan = this PRD; Architect = the wave's section in
  `architecture.md` plus one stories file per lane; Implement = lanes in parallel, each running
  `spell-implement` on its own stories file; Test = `spell-test` per lane, then the full suite on the
  wave branch; Review = `spell-review` on the wave diff; Ship = one PR. This fans out
  `spell-full-cycle`'s Implement phase; the other phases run once per wave, as the spell describes.

## Constraints

- **Technical.** Node ≥18 TypeScript CLI; `src/assets/` is canonical and root copies are generated
  (`fix:self-host-parity`); any `src/assets/`, `registry.ts` or `profiles.ts` change needs a version
  different from `origin/main` (`scripts/check-version-bump.ts`); CI runs only on PRs into `main`.
- **Process.** PR-only, no squash, rebase before PR; attribution trailers on every commit; one
  operator-accepted ADR per ADR-routed decision before its implementation starts.
- **Security.** See PLAN.md "Security Flags": no flag may weaken push safety; transcript access is
  opt-in and off for sensitive repositories; lane diffs are checked against file allowlists before
  integration.
- **Timeline.** ~6 sessions (UP-00 through UP-05), one wave per session.

## Acceptance Criteria (program level)

- [ ] Every Must Have requirement's ACs pass on `main`, evidenced from the wave PR that shipped it.
- [ ] All 19 issues are closed by a merged wave PR (`Closes #NNN`), or — #267 only — closed as not
      reproducible with the Q-004 probe record linked.
- [ ] Each code wave shipped as exactly one PR and one version bump; no two wave PRs were open at
      the same time.
- [ ] Every ADR-routed decision (D-01, D-04, D-05, and D-06 if reproduced) is `Accepted` before the
      wave implementing it merged.
- [ ] No lane diff touched a file outside its allowlist (the orchestrator's check output is quoted
      in each wave PR).
- [ ] `spell-check-drift` reports GO after UP-05; `TODO.md`'s three intake sections are all ticked
      or explicitly re-routed.

## Dependencies

- UP-00 merged (activates the delegation).
- Operator: Q-002 (PRD decisions), Q-003 (ADR acceptance), Q-004/Q-005 (probes), Q-006 (arcane-ui).
- ARC-028 (isolation model), ARC-034 (push safety), ARC-036 (diagrams), ARC-039 (fragments),
  ARC-020 (manifest fields), ARC-042 (vendored report template).

## Open Questions

- **Answered 2026-09-27:** Q-002 — all decision defaults accepted, including three minors for the
  three code waves and R-UP03-A3 staying in scope. ADR-routed decisions still need Q-003.
- Open: Q-003 (ADR acceptance), Q-004 and Q-005 (probes), Q-006 (arcane-ui change).
