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
- **Status:** ready — preconditions met. Awaiting your decision to apply.

## Q-002 — Decide: re-enable `allow_auto_merge`

- **What:** `gh api -X PATCH repos/codemagicianhq/arcane -f allow_auto_merge=true`
- **Why:** it is `false` today (changed undocumented after the 2026-08-23 incident); ARC-035
  narrowed auto-merge instead of removing it, assuming it returns. With Q-001 in place the
  PR #63 failure shape is closed.
- **Preconditions:** Q-001 done.
- **Rollback:** same PATCH with `false`.
- **Status:** waiting on Q-001 + your call.

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
- **Status:** ready for your land/abandon call on the four branches above.

## Q-004 — Accept/revise/reject ADR: ARC-029 (Best-Practice-First Solution Selection)

- **What:** ARC-029 has been `Proposed` since EF-34 with no tracking entry anywhere.
- **Preconditions:** BC-13 appends a one-page decision brief here.
- **Status:** waiting on BC-13.

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
- **Status:** ready for your accept/revise/reject call.

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
- **Status:** ready for your accept/revise/reject call.

<!-- The loop appends Q-008+ below this line. -->
