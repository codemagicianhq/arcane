# Operator Queue — Become Current

The only surface where the autonomous loop asks the operator for anything. The loop **appends**
entries (never edits existing ones, never acts on an entry not marked done). The operator executes
or decides, then marks the entry: `- [x] done YYYY-MM-DD — <note>`.

Format per entry: **What / Why / Preconditions / Exact commands / Rollback / Status.**

---

## Q-001 — Wire `Review round clear` into the protect-main ruleset

- **What:** add the third required status check mandated by ARC-035 decision 2.
- **Why:** platform-settings mutation — outside the delegation grant; a misconfigured required
  check hard-locks every PR (`current_user_can_bypass: "never"`).
- **Preconditions (hard):** BC-01 merged; the `Review round clear` job has reported **green on at
  least one live PR** (verify in the PR's checks tab or `gh pr checks`).
  **Satisfied 2026-08-31** — both green on [PR #88](https://github.com/codemagicianhq/arcane/pull/88)
  (`gh pr checks 88`: `Review round clear  pass  17s`) before merge. Still your call to apply —
  platform-settings mutation is outside the delegation grant regardless of precondition status.
- **Command** (full-payload PUT — a partial PUT drops the ruleset's other rules, per decision 1):

  ```bash
  gh api -X PUT repos/codemagicianhq/arcane/rulesets/18841659 \
    --input docs/plans/become-current/q-001-ruleset-after.json
  ```

  Verify afterward rather than trusting the PUT response:

  ```bash
  gh api repos/codemagicianhq/arcane/rulesets/18841659 --jq '.rules[] | select(.type=="required_status_checks").parameters.required_status_checks'
  ```

  Expect three contexts: `Lint, typecheck, test, build`, `PR branch is rebased on target`,
  `Review round clear`.
- **Rollback:** `gh api -X PUT repos/codemagicianhq/arcane/rulesets/18841659 --input docs/plans/become-current/q-001-ruleset-before.json`
  — the pre-change ruleset, captured live via `gh api repos/codemagicianhq/arcane/rulesets/18841659`
  on 2026-08-31 before this entry was updated.
- **Status:** [x] done 2026-09-01 — Applied via the full-payload PUT above. Independently re-verified
  via a fresh `gh api` GET (not the PUT's own echoed response): `required_status_checks` now lists
  exactly `Lint, typecheck, test, build`, `PR branch is rebased on target`, `Review round clear`, and
  `current_user_can_bypass` remains `"never"`. All other rules (deletion protection, PR requirement,
  `allowed_merge_methods: ["merge", "rebase"]`, non-fast-forward) confirmed unchanged from the captured
  before-state.

## Q-002 — Decide: re-enable `allow_auto_merge`

- **What:** `gh api -X PATCH repos/codemagicianhq/arcane -f allow_auto_merge=true`
- **Why:** it is `false` today (changed undocumented after the 2026-08-23 incident); ARC-035
  narrowed auto-merge instead of removing it, assuming it returns. With Q-001 in place the
  PR #63 failure shape is closed.
- **Preconditions:** Q-001 done.
- **Rollback:** same PATCH with `false`.
- **Status:** [x] done 2026-09-01 — Applied via `gh api -X PATCH repos/codemagicianhq/arcane
  -f allow_auto_merge=true`. Independently re-verified via a fresh `gh api` GET: `allow_auto_merge`
  is `true`.

## Q-003 — Four content-holding local branches: land or abandon

- **What:** decide per branch. Content reports below (BC-03, 2026-08-31, re-verified live against a
  freshly-fetched `origin/main` — not trusted from the 2026-08-30 list above, which named a fifth
  branch this report clears; see note at the end).

  **`chore/todo-update-preserve-user-content`** (2 unlanded commits, dated 2026-07-19/20) —
  **recommend: abandon.** `01c4985` redacts a consumer-repo name and an agent alias from a TODO.md
  that has since been rewritten many times over; `f977a00` adds a "compliance coverage" backlog
  item whose exact text is **already present verbatim** in current `TODO.md` (added independently,
  different commit). The privacy concern is superseded by tooling that didn't exist on 2026-07-19
  (`org-token-lint.ts` / ARC-031, which now scans the whole repo on every build).

  **`docs/runnable-fences-selfhosted-agents`** (1 unlanded commit, 2026-07-25) —
  **recommend: land, not abandon.** Adds two genuinely new, well-evidenced governance rules,
  confirmed absent from current `cicd-standards.md` / `agent-output.instructions.md` (zero hits for
  "runnable" in either file): a self-hosted-CI-agent incident checklist (sleep disabled, hosted
  fallback pool, network/tooling parity — cites a real 2026-07-25 deploy incident) and a "Runnable
  Code Fences Are Commitments" rule (chat UIs render a Run button on shell-tagged fences; reference/
  undo/cleanup snippets must use a non-runnable fence instead) — cites a real incident where a
  "revert anytime" runnable fence got clicked and deleted a prod DB firewall rule twice. This is real
  content sitting on an orphaned branch, not stale duplication.

  **`docs/session-close-2026-08-01`** (2 of 8 commits unlanded; the other 6 already verified
  patch-id-landed) — **recommend: abandon, low confidence either way.** The 2 unlanded commits are
  journal-narrative edits to `journal/2026-08-01-intake-batch-001-closure.md`, which already exists
  on `main` with real content (landed via the branch's other 6 commits or a separate route — not
  fully traced). Low material value even if landed: a journal is a narrative record, not code or a
  decision; worth a skim, not worth the archaeology to fully reconcile wording.

  **`sessions/2026-08-02-provider-neutral-close`** (1 unlanded commit) —
  **recommend: abandon — this is EF-34 contamination, not real work.** The commit's own message,
  `test: seed main`, is the literal fixture-seeding string `test/version-bump-gate.test.ts`'s own
  git helper writes (`runGit(dir, ["commit", "-m", "test: seed main"])`). Its diff (7 files
  including `package.json`, `package-lock.json`, `spell-close-session.prompt.md`, and a new test
  file) is a snapshot of unrelated in-progress work that a GIT_DIR-leaking fixture run committed to
  this REAL branch instead of an isolated temp dir — confirmed: `test/prompt-session-branch-gate.test.ts`
  (the "new" file in this diff) already exists on `main` today via legitimate history. Same date
  (2026-08-02) and same signature as the five already-quarantined `backup/*` branches from this
  incident — this is a sixth, previously undocumented instance. Worth a cross-reference note on
  EF-34's own file, not a TODO item on its own.

  **Cleared without needing your call** (verified fully landed, already deleted by this session):
  `docs/discoverability-session-journal` (0 unmerged commits) and, from the 2026-08-30 list above,
  `sessions/2026-08-15-queue-failfast-doclink-ideas` — `git cherry` flagged 2 commits `+`, but both
  turned out to be byte-identical to content that had *already* landed on `main` through separate,
  differently-authored commits (a squash/independent-re-authoring patch-id false-negative, not real
  unmerged content — see `git-conventions.md`'s new Content-Verified Branch Deletion section for the
  mechanism this surfaced). Also deleted: the remote-only `origin/docs/spell-full-cycle-coordination-gaps`
  (no local copy existed), confirmed `MERGED` via `gh pr list --head ... --state all` and by content
  match against current `TODO.md`.

  **Noted, not actionable from here:** `sessions/2026-08-15-ef34-gitdir-contamination` (the branch
  checked out in the `arcane-arc028` linked worktree) is also fully landed by content (0 unmerged
  commits) — but ARC-028 R7 means only a session working *in* that worktree may remove it.

- **Why:** deletion of content-holding branches is outside the grant.
- **Status:** [x] done 2026-09-01 — operator authorized following the recorded recommendations
  (endgame planning session). Executed: `chore/todo-update-preserve-user-content` abandoned
  (deleted local + remote; content re-verified via `git cherry` patch-id, confirming the
  compliance-coverage backlog item it added is independently already closed on `main` via BC-26);
  `docs/session-close-2026-08-01` abandoned (deleted local; its one substantial unlanded commit's
  content — a full ARC-025 decision record plus the publish-workflow npm-11 pin it describes — is
  independently confirmed already on `main`, the other unlanded commit is stale session-state
  narrative); `sessions/2026-08-02-provider-neutral-close` abandoned (deleted local; confirmed
  EF-34-class fixture contamination, cross-reference on EF-34.md updated to record the resolution).
  `docs/runnable-fences-selfhosted-agents` (land) was held for the same gate BC-32 was waiting on
  (its single commit touches `.github/instructions/agent-output.instructions.md`, the parallel
  session's protected footprint) — now landed via [PR #165](https://github.com/codemagicianhq/arcane/pull/165)
  once that session's own work merged to `main` (confirmed via `gh pr view`/`gh pr list`). Re-applied
  fresh on a new session branch rather than merging the stale commit, since `cicd-standards.md` had
  been restructured into a vendor-neutral Core / Azure DevOps Profile split (BC-31 Batch B) after the
  branch was cut — the new "Self-Hosted Agents" content was re-nested as an H3 under the Azure DevOps
  Profile rather than kept as the old flat H2. Also caught and fixed in the same PR: the stale
  branch's content baked in a real client name that CI's org-token lint (ARC-031) flagged on push —
  replaced with "Ordovica," the same defect class BC-06 had already hit once before. (This closure
  note itself repeated the same real name in its first draft, caught only when the *second* PR's own
  CI run flagged it again — a second, self-inflicted instance of the exact defect being described.) The stale branch itself (commit `86025d9`) is deleted, its content fully superseded.

## Q-004 — Accept/revise/reject ADR: ARC-029 (Best-Practice-First Solution Selection)

- **What:** [ARC-029](../../../DECISIONS.md#arc-029--best-practice-first-solution-selection-standard)
  has been `Proposed` since 2026-08-15, with no tracking entry anywhere until this plan's 2026-08-30
  audit surfaced it (`TODO.md`'s own entry confirms "zero mentions of ARC-029 anywhere in this file
  before this entry"). Brief prepared 2026-08-31 (BC-13). No implementation epic — accepting this
  changes agent conduct going forward, it does not gate any BC-30/31/32-style follow-on work.
- **The standard, briefly:** when an agent presents engineering options, it must name which one is the
  community-standard/best-practice choice — verified live when checkable, never asserted from memory —
  and if it recommends something else, say why. "Smaller diff," "faster," and "avoids needing human
  approval" are explicitly **not** valid reasons on their own; they're signals to ask the human instead
  of deciding unilaterally. If the correct solution is out of the agent's power level or session scope,
  it must be queued (TODO/intake/work item) with an explicitly labeled interim measure — an *unlabeled*
  stopgap that quietly becomes permanent is the violation. Not a mandate for maximal solutions: YAGNI
  and scope discipline still apply, and the standard says so directly (decision 4) to block that
  misreading.
- **The motivating incident, concretely:** while scoping a fix for a different, already-shipped defect
  (EF-34 — pre-commit test runs leaking `GIT_DIR` into the real repository), the drafting agent
  recommended the smallest-diff option (scrub the hook's environment only) over the community-standard
  hook shape (fast pre-commit; full suite on pre-push) — not because it was better, but because it was
  the smallest change and avoided a workflow change you hadn't yet approved. You caught it only by
  asking directly: "what does the community actually do?" ARC-029 exists because that near-miss
  happened once already and had no rule that would have surfaced the trade-off on its own.
- **What accepting it unlocks — and what it does NOT schedule:** decision 5 names concrete follow-up
  work (a new "Solution Selection" section in `universal-agent-rules.md`, a one-line echo in
  `portable-bootstrap.md`, and recommendation-contract language added to `spell-plan`/`spell-architect`/
  `spell-review`) — all `src/assets/` changes needing a version bump. **Checked directly against
  PLAN.md: unlike BC-10/11/12's ADRs, none of this plan's 33 epics implements ARC-029's decision 5.**
  Accepting the ADR establishes the rule and its text in `DECISIONS.md`; it does not, by itself, cause
  decision 5's shipped changes to happen — that needs a new TODO.md item or a dedicated future session,
  not something already queued in this plan.
- **Accept/revise/reject framing:** this is a governance/process standard, not a technical architecture
  choice — accepting it means every future agent recommendation in this repository (including this
  autonomous loop's own epic-by-epic work) is expected to name the best-practice option and justify any
  deviation. Revise if decision 4's gold-plating boundary or decision 5's specific spell list needs
  adjustment. Reject if you judge the existing fragments (universal-agent-rules rule 4, ADR-034's
  purchase-scoped verification mandate) already sufficient without a dedicated standard.
- **Preconditions:** none.
- **Status:** [x] done 2026-09-01 — **Accepted**, via the endgame-planning session's `AskUserQuestion`
  accept/revise/reject call. `DECISIONS.md`'s ARC-029 Status flipped to Accepted, citing this entry.
  Per this entry's own framing, decision 5's follow-up content changes are NOT scheduled by this
  acceptance alone — recorded as a standalone parked item, not silently dropped.

## Q-005 — ARC-020 broad schema: still open, NOT subsumed by BC-11 (correcting this entry's own prior assumption)

- **What:** this entry originally assumed BC-11's customization/vendor-neutrality ADR would "subsume
  or close ARC-020's open remainder." Checked directly while drafting that ADR
  ([ARC-038](../../../DECISIONS.md#arc-038--content-preserving-updates-and-vendor-neutral-governance-content),
  decision 4): it doesn't. ARC-020's remainder (`operator identity`, `provider coordinates`,
  `repository lists`) is manifest **data fields**; ARC-038 is about governance-**content** update
  safety and vendor-neutrality — a different axis. Leaving this entry as originally written would
  have implied ARC-020 got resolved when nothing in ARC-038 touches it.
- **Status:** ARC-020 remains `Proposed` with its full remainder open, no ADR currently drafted
  against it. Recommend closing it incrementally the same way ARC-030/032/033 already did — one
  scoped amendment per field group, attached to whichever future epic actually needs one of those
  fields — rather than waiting for a single ADR to cover all three at once. Not blocking anything in
  this plan; no action needed from you unless you want to prioritize drafting that amendment sooner.
- **Status:** [x] done 2026-09-01 — **Acknowledged, no action taken.** Operator confirmed during
  endgame planning: close incrementally per future epics, as this entry itself already recommended.

## Q-006 — Accept/revise/reject ADR: ARC-037 (Secret and Org-Leak Detection)

- **What:** [ARC-037](../../../DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop)
  is `Proposed`, drafted 2026-08-31 (BC-10) from EF-35's deferred secret-detection gap plus ARC-016
  decision 3's unbuilt org-leak-gate pieces. Implementation is BC-30, gated on your acceptance here.
- **The shape, briefly:** a new step in `.husky/pre-commit` (after lint/typecheck) scans for both
  generic secrets (extending the existing `SECRETS_PATTERNS` engine already used at build time) and
  org tokens (extending the existing org-token-lint logic) in one pass; the existing build-time
  secrets scan widens from `src/assets/`-only to the whole repository as a CI backstop that survives
  a local `--no-verify`; a new `.arcane.json`-configurable exclude-list handles the false-positive
  case this repo's own `test/copy-assets.test.ts` fixture already demonstrates is real; an equivalent
  pre-commit hook installer ships to consumer repos (none exists today); `spell check-leaks` (ARC-016's
  originally mandated standalone command) is retired in favor of folding an on-demand check into
  `spell doctor`, which already exists. Does **not** touch ARC-034's pre-push hook — ruled out
  mechanically (its unconditional block has no reachable branch for a conditional scan).
- **Corrects two prior claims while it's at it:** EF-35's "no scanner exists anywhere" is wrong — a
  homegrown one has run at build time since this repo's first public commit, just narrowly scoped;
  and ARC-016's CI-gate deliverable is already shipped (`org-token-lint.ts`), not still outstanding as
  PLAN.md's BC-10 route text implied.
- **Open questions the ADR deliberately leaves to you or to BC-30** (see ARC-037's own Open Questions
  section): mandatory-for-every-repo vs. opt-in per repo; exact `.arcane.json` field shape for the
  exclude-list; whether the widened CI scan becomes its own named required check.
- **Preconditions:** none — this ADR can be accepted independently of BC-11/BC-12's ADRs.
- **Status:** [x] done 2026-09-01 — **Accepted**, via the endgame-planning session's `AskUserQuestion`
  accept/revise/reject call. `DECISIONS.md`'s ARC-037 Status flipped to Accepted, citing this entry.
  Implementation epic BC-30 is now unblocked; its own open questions (mandatory-vs-opt-in,
  `.arcane.json` exclude-list shape, whether the widened CI scan is its own required check) are
  resolved during BC-30's implementation, not here.

## Q-007 — Accept/revise/reject ADR: ARC-038 (Content-Preserving Updates and Vendor-Neutral Governance Content)

- **What:** [ARC-038](../../../DECISIONS.md#arc-038--content-preserving-updates-and-vendor-neutral-governance-content)
  is `Proposed`, drafted 2026-08-31 (BC-11) from the 2026-07-14 customization/vendor-neutrality
  backlog item and ARC-019's own "Open follow-up" note. Implementation is BC-31, gated on your
  acceptance here.
- **The shape, briefly:** per-file content hashes on `InstalledComponent` let `spell update`
  distinguish "never touched" (safe to overwrite) from "operator edited" (attempt a three-way merge
  using the exact previously-installed version, fetched from npm's own registry, as the merge base —
  writing conflict markers on genuine collisions, same shape as `copier`'s regenerate/diff/merge
  approach); `cicd-standards.md` splits into a vendor-neutral core plus an Azure-DevOps-specific
  profile, reusing the same core/per-provider pattern this repo already ships twice over
  (`external_provider`, ARC-011/032; `development-methodology.md`'s ADO/GitHub sections, BC-09) rather
  than inventing a new one; no new "vendor-specific standards directory" — the split itself is the
  mechanism, applicable wherever a future doc risks the same coupling.
- **Two things this ADR found and corrected while researching, not just proposed:** the 2026-07-14
  item's own premise about `naming-conventions.md` carrying Azure-specific content doesn't hold today
  — checked directly, that file is agent/persona naming only, no cloud-vendor content anywhere in it —
  while the *real* current instance of the exact problem it described turned out to be
  `cicd-standards.md` instead (full Azure DevOps pipeline templates, branch-policy section, and an
  ADO-scoped deployment checklist). Separately, **Q-005 above has been corrected**: this ADR does
  *not* subsume ARC-020's remainder, despite that having been the working assumption recorded there
  before this PR — the two are different axes (data fields vs. content architecture).
- **Open questions the ADR deliberately leaves to BC-31**: exact hash algorithm, conflict-marker UX
  (stop-and-report vs. complete-and-list), whether the npm-registry merge-base fetch should be cached,
  and the exact new file names for `cicd-standards.md`'s split.
- **Preconditions:** none — independent of BC-10/BC-12's ADRs.
- **Status:** [x] done 2026-09-01 — **Accepted**, via the endgame-planning session's `AskUserQuestion`
  accept/revise/reject call. `DECISIONS.md`'s ARC-038 Status flipped to Accepted, citing this entry.
  Implementation epic BC-31 is now unblocked; its own open questions (hash algorithm, conflict-marker
  UX, merge-base caching, exact split filenames) are resolved during BC-31's implementation, not here.

## Q-008 — Accept/revise/reject ADR: ARC-039 (Build-Time Spell Compiler)

- **What:** [ARC-039](../../../DECISIONS.md#arc-039--build-time-spell-compiler-generated-client-stubs-and-shared-prose-fragments)
  is `Proposed`, drafted 2026-08-31 (BC-12) from IDEAS.md's I5 ("spell compiler, not spell runtime")
  and I15 (dual-copy elimination). Implementation is BC-32, gated on your acceptance here. This closes
  out all three ADR-drafting epics (BC-10/ARC-037, BC-11/ARC-038, BC-12/ARC-039) — Q-006, Q-007, and
  this entry are now all waiting on your review.
- **The shape, briefly:** `.github/prompts/spell-*.prompt.md` is formalized as each spell's sole
  authored source; the corresponding `.claude/commands/spell-*.md` stub is generated from its
  frontmatter, reusing `agent-generator.ts`'s already-proven one-source/multiple-renderers pattern.
  Genuinely shared prose (the `tracking_mode`/`external_provider` resolution block this session's own
  BC-09 had to hand-edit identically across five files) becomes named fragments assembled at build
  time. **Explicitly does not** pursue runtime operator-config injection into rendered spell text, and
  says so directly rather than quietly narrowing scope — that part of I5's original vision hits the D2
  Gold vanilla-repo tension with no resolution found that avoids either violating D2 Gold or accepting
  real version skew.
- **Two premises checked and corrected while drafting, not just accepted:** I15's "66 hand-maintained
  files" claim overstated the actual problem — all 36 (not 33) `.claude/commands/` files are already
  9-line thin shims using Claude Code's own `@`-file-inclusion, so body-content drift was never
  actually possible; the real gap is narrower (stub generation, not de-duplication of full bodies).
  I5's hoped-for defusal of EF-02/08/14/19/23/29 and fabricated trailers is **not** delivered by this
  ADR — disclosed as a deliberate scope exclusion (decision 3), not silently dropped.
- **Preconditions:** none — independent of BC-10/BC-11's ADRs.
- **Status:** [x] done 2026-09-01 — **Accepted**, via the endgame-planning session's `AskUserQuestion`
  accept/revise/reject call. `DECISIONS.md`'s ARC-039 Status flipped to Accepted, citing this entry.
  Implementation epic BC-32 is now unblocked; note the ADR's own "36 stub files" count needs
  re-verification against the tree before implementation starts (drifted since drafting).

## Q-009 — Point `arcane-website` at the new `docs/spell-catalog.json` artifact

- **What:** `arcane-website`'s spell catalogue page is (per TODO.md's T15 item) hand-authored site
  data that has already drifted from this repo's actual registry once (the "elevate" miss). This
  repo now generates and commits a machine-readable catalog at
  [`docs/spell-catalog.json`](../../spell-catalog.json) — 38 spells, grouped by the same `spells-*`
  components `spell init`/`spell add` install by, with each spell's real `name`/`description` read
  live from its own `.prompt.md` frontmatter. A CI gate (`check:spell-catalog`) now fails this
  repo's own build if that file (or README's matching block) ever drifts from `registry.ts` again.
- **Why:** wiring the website repo to fetch and render this file (e.g. via the raw GitHub URL for
  a tagged release, or by vendoring it at the website's own build time) is a cross-repo change —
  outside this repo's grant and outside this session's working directory entirely.
- **Exact artifact:** `https://raw.githubusercontent.com/codemagicianhq/arcane/main/docs/spell-catalog.json`
  (or pin to a release tag instead of `main`, operator's call). Shape: `{ totalSpells: number,
  groups: [{ component, label, spells: [{ id, shortName, name, description }] }] }`.
- **Not yet known:** whether this exact JSON shape is sufficient for the website's actual rendering
  needs (e.g. it carries no icon/ordering-priority/URL-slug fields) — this repo has no visibility
  into `arcane-website`'s data model. Treat the shape as a first draft; extending
  `scripts/spell-catalog.ts`'s `SpellCatalogEntry`/`SpellCatalogGroup` types to add fields the
  website actually needs is a small, low-risk follow-up once that's known.
- **Preconditions:** none — the artifact already exists and is gated as of BC-23.
- **Status:** parked 2026-09-01 (operator default during endgame planning) — cross-repo work outside
  this repo's working directory; remains open for the operator to wire up or delegate whenever
  convenient. Not blocking anything in this plan.

## Q-010 — Go/no-go: package-referenced (not copy-in) distribution, given confirmed enabling assumptions

- **What:** I13's "editor files must sit at fixed repo paths" enabling finding rests on two assumptions
  about VS Code's `chat.promptFilesLocations` setting. Both were empirically tested live on 2026-08-31
  (BC-28) — see [docs/research/delivery-channels-smoke-tests.md](../../research/delivery-channels-smoke-tests.md)
  for the full report. **Confirmed:** the setting traverses into `node_modules` (a real risk to
  disclose in any future config, not just a capability), and prompt-file discovery follows a directory
  junction standing in for a true symlink (the enabling mechanism itself works, at least for junctions).
- **Scope correction, disclosed:** this repo's own PLAN.md summarized BC-28's smoke tests as being about
  "MCP prompts; Claude Code plugin" — checked directly against IDEAS.md's actual I13 entry, that
  characterization is wrong. I13's own named smoke tests are specifically about `node_modules`
  traversal and symlink-following, unrelated to MCP prompts or Claude Code plugin marketplaces as
  channels. Both of those (and the other two channels I13's landscape scan names — portable Agent
  Skills, Microsoft APM) remain **entirely unevaluated** — this entry's findings inform only the
  "reference instead of copy" mechanism question, not a go/no-go on any specific channel.
  Implemented what I13 actually asks, not PLAN.md's inaccurate summary of it.
- **The actual decision this queues:** whether to pursue a package-referenced (symlink/junction-based)
  distribution model for Arcane's own spell content as a future direction — relevant to (but not
  identical with) the 2026-08-02 spell-compiler idea's "emit, don't copy" framing. This is a foundational
  distribution-architecture choice, not something to decide unilaterally under this plan's existing
  grant.
- **Not yet known / explicitly out of scope here:** whether MCP prompts, Claude Code plugin
  marketplaces, portable Agent Skills, or Microsoft APM are each individually worth pursuing as
  channels — that needs its own dedicated investigation per channel if the operator wants it, separate
  from this narrow smoke test.
- **Preconditions:** none.
- **Status:** parked 2026-09-01 (operator default during endgame planning) — pending a scan of the
  other three channels (MCP prompts, Claude Code plugin marketplaces, portable Agent Skills, Microsoft
  APM) before a real go/no-go can be made with full context. Not blocking anything in this plan.

<!-- The loop appends Q-011+ below this line. -->
