# 2026-09-10 — Codex Support: CS-04 shipped — the user tier (1.1.0)

Related: [[development-methodology]] (the Spell Loop the epic ran under), [[git-conventions]]
(branch, PR and attribution rules every commit here followed), [[naming-conventions]] (the Naming
Test that settled the CLI surface).

## Session: CS-04 — `--user` on init/update/status/uninstall, the `~/.arcane` store, and the home-directory fan-out

### Prompt Context

The same autonomous run that shipped CS-01 through CS-03 (see
`journal/2026-09-09-codex-support-cs01-to-cs03-shipping.md`) continued after the operator merged
CS-03: *"merged 232, whats next"*. The standing direction for the program is unchanged — *"i want to
run the full cycle spell on the whole plan… leave you autonomously run the whole thing"* → *"defaults,
let's go"* — with the operator's retained acts already spent (CS-00's merge, ARC-045's acceptance,
CS-03's merge and version). CS-04 is not on the delegation's exclusion list, so this epic was built,
reviewed, merged and released without an operator gate. The session spanned a usage-limit reset
mid-way (*"I hit my usage limit while you were working, but it has reset now. Please continue from
where you left off."*) and two *"Try again"* nudges after a batch of edits appeared to stall; the work
resumed from the tree each time.

### What Got Done

1. **CS-04 designed before it was built** — `features/codex-support/architecture.md` gained its
   CS-04 section (D1–D9) and `features/codex-support/stories.json` its seven stories, committed as
   `edd0ccd` together with the consumed handoff and two Low drift fixes from the session opener.
2. **Empirical-first, before any code:** Codex followed a user-level skill at `~/.agents/skills/` to
   an absolute path from an empty working directory (marker returned; two `Get-Content -Raw` reads in
   the trace). VS Code's own documentation, fetched the same day, showed the `chat.*FilesLocations`
   settings deprecated and `~/.agents/skills` / `~/.claude/skills` scanned by default. The Claude Code
   equivalent could not be observed from this session (see Lessons Learned). Recorded in
   `docs/research/skill-discovery-smoke-tests.md`, "CS-04".
3. **The feature** (`0d89536`): `--user` on the four verbs; a scope-aware view of the registry
   (`componentForScope`) so the copier, hash record, same-version restore and the ARC-038 merge run
   over the store unchanged; `src/modules/user-tier.ts` with the fan-out and its reconciliation rules
   (write, rewrite-on-change, keep-customized with the hash carried forward, collision never claimed,
   prune only while hash-matched, the client's own directory never removed); `scope`/`fanout` manifest
   fields; `spell doctor`'s non-blocking row; a general fix to the merge path's published-file fetch
   (asset path). Tests stub `USERPROFILE`/`HOME`, never `homedir()`.
4. **Docs and release**: README "Once per machine", CHANGELOG `1.1.0`, `portable-bootstrap.md`'s tier
   sentence (source + parity copy), an ARC-045 implementation note recording the two variances, the
   research-doc section (`e0e26a7`); `chore(release): bump version to 1.1.0` (`cd94592`); fan-out key
   hardening (`fd588d0`); the program record (`ff477cb`); the Phase 5 review fixes (`81f18dc`); two
   trailer-free show-report regenerations.
5. **EV-01 in the operator's real home, then reversed**: the built CLI's `spell init --user` wrote 41
   store spells and 82 client files; `codex exec` from an empty directory read
   `~/.agents/skills/spell-status/SKILL.md`, then `~/.arcane/spells/spell-status.md`, and answered the
   canonical heading plus the marker; `status --user`, `doctor` (`✓ [pass] User tier (ARC-045)`) and
   `uninstall --user --yes` behaved as designed; the home directory was back to its baseline (28
   third-party skills, no `~/.arcane`), and the empty `~/.claude/commands` directory the session's
   own probe had created was removed by hand.
6. **Independent Phase 5 review**: 0 HIGH, 2 MEDIUM, 5 LOW — all seven addressed in `81f18dc` (dry-run
   rendering from the vendor asset before a restore; `checkUserTier` never throws; `lstat`
   classification so a directory or symlink is never written through or deleted; scope inference
   honored only at `~/.arcane` itself; the vacuous retrofit test made real; D4 amended to what shipped;
   the registry invariant pinned).
7. **Shipped**: [PR #234](https://github.com/codemagicianhq/arcane/pull/234) opened with the ship
   report and `## For the record`, three required checks green on head `665a910`, rebase-merged
   2026-09-10T15:46Z (`dac7a8f`); `release-drift.yml` cut `v1.1.0` (15:46:33Z); `publish.yml` run
   34497846257 succeeded; `npm view arcane-cli version` → `1.1.0` (15:47:27Z); the tarball was unpacked
   (`dist/index.js` carries the user tier, 41 canonical spells) and a scratch `npm install
   arcane-cli@1.1.0` lists `--user` in all four commands' help. Branch deleted after `git cherry`
   showed every commit landed.
8. **Program record**: PLAN.md's CS-04 entry ticked with the premise correction, the Naming Test call,
   PR, merge and publish evidence, and its Report line (copied verbatim from the PR); OPERATOR-QUEUE.md
   gained Q-005; PRD AC5 marked partially met; TODO.md gained one LOW; `docs/verification-ledger.md`
   gained a fourteen-row section for this session.

### Decisions Made

No new ADR. ARC-045 gained an implementation note for CS-04 recording two implementation-level
variances against decision 3's letter, both grounded in vendor documentation fetched before building:

| Decision | Rationale |
| --- | --- |
| The CLI surface is `--user` on `init`/`update`/`status`/`uninstall`, not a `spell user` noun (ARC-045 open question 1) | Naming Test: a per-user modifier flag on an existing verb is the established idiom (`pip install --user`, `git config --global`); a noun would fork every verb into two spellings. |
| No VS Code settings snippet is printed; a note that no setting is needed is printed instead | VS Code marks `chat.promptFilesLocations` and its siblings deprecated ("will be removed in a future release") and discovers `~/.agents/skills` by default with skills listed under `/`. "Printed, never auto-applied" holds trivially. |
| The Claude Code file is a personal command at `~/.claude/commands/<id>.md`, not a skill at `~/.claude/skills/` | Copilot's default skill locations include `~/.claude/skills`; a skill there would list every spell twice. Claude Code documents commands and skills as the same invocable thing, and `~/.claude/commands` is outside Copilot's scan set. |
| The store holds canonical spells only, at `~/.arcane/spells/<id>.md`, through a scope-aware registry view rather than new copy logic | The repository-relative shims would be inert in the store; the existing copier/hash/merge machinery covers the store unchanged; `targetDir = ~` was rejected (manifest at `~/.arcane.json`, stray `~/.github/prompts`, a traversal guard weakened to "anywhere under home"). |
| The session's live install was uninstalled afterwards rather than left in place | Installing the tier changes which copy of every `/spell-*` Claude Code runs in every repository on the machine (documented "personal over project"); that is the operator's call, now Q-005. |

### Lessons Learned

#### Vendor documentation can invalidate a plan's mechanism between the plan and the epic

The plan and the accepted ADR both said the user tier would print a `chat.promptFilesLocations`
snippet. By the time CS-04 ran, VS Code had deprecated that whole family of settings and was
discovering `~/.agents/skills` by default. The empirical-first step caught it because it fetched the
current documentation instead of trusting the plan's premise; the correction is recorded in the plan,
the architecture, the ADR and the ledger rather than quietly absorbed. The same fetch surfaced the
second correction — Copilot scanning `~/.claude/skills` — which would otherwise have shipped as a
double-listing bug the operator found in the picker.

#### A user-level probe cannot be run from inside the session that wants to observe it

Claude Code's skill list is fixed when a session starts, and a nested `claude -p` in this environment
is a different install with a separate credential store. Roughly twenty minutes went into confirming
both dead ends before the question was routed to the operator. The design did not wait on it: the
Claude stub carries the read-and-follow sentence as well as the `@` include, so an include that failed
to inline would degrade to the file-read path Codex was proven to take. Next time, decide up front
which clients an agent session can observe and put the rest on the operator queue before building.

#### `fs.rm` does not remove an empty directory without `recursive`

`rm(dir, { recursive: false })` returns `EISDIR`; the swallowed error left every emptied per-spell
directory behind, and only the prune test caught it. `rmdir` removes exactly an empty directory and
refuses a non-empty one, which is also the safer primitive against a file appearing between the
emptiness check and the removal.

#### A test that cannot fail is not a test — the reviewer found one

"Asks no retrofit question" asserted that the prompt mocks were never called, but the retrofit wizard
is gated on `process.stdin.isTTY`, which vitest never sets — the assertion would have held for a
repository manifest too. The fix was one forced TTY; the lesson is to ask, for every negative
assertion, what would make it fail.

#### Dry-run must be able to render what the real run would write

`update --user --dry-run` rendered the fan-out from the store before the restore the real run would
have performed, so a missing store spell threw with no preview. The fix — render from the vendor asset
when the store copy is missing — is small, but the pattern is general: a dry run that depends on state
the real run creates first is a dry run that fails exactly when it is needed.

#### Inference from a manifest field needs an anchor, not just a value

`scope: "user"` in a manifest anywhere but `~/.arcane` would have fanned 82 files out relative to
whatever directory the copy sat in. A field that changes *where* a command writes must be honored only
where the field's assumptions hold; everywhere else the command refuses and says why.

### Open Items Carried Forward

- **Q-005** (`docs/plans/codex-support/OPERATOR-QUEUE.md`): the operator's Claude Code and VS Code
  Copilot checks of the user tier — the two clients no agent session can observe there. Preconditions
  met (`1.1.0` on npm). The operator's machine has no user tier installed right now, by design.
- **Q-004** (same file): the one-minute Copilot Chat check of the repo-tier shim, unchanged.
- **CS-05 — repo opt-out (`spell_scope`)** is the next eligible epic (`docs/plans/codex-support/PLAN.md`);
  CS-06 follows sequentially; CS-08 may run any time. AC5's second half (one set of `/spell-*` across
  two repositories in one workspace) waits for CS-05 plus an operator count.
- **TODO.md, LOW:** a home path containing a space is untested in the Claude stub's `@` include.
- **TODO.md, pre-existing and still open:** the CRLF-vs-recorded-hash edge, the two manifest-driven
  `rm` paths without a traversal guard (the user tier's own delete paths are hash-gated and, since
  `fd588d0`, key-validated), and the show-report self-count gap.

## Session (continued): the 1.1.1 findings release, Q-005 prepared, and the CS-08 spike

### Prompt Context

The operator, on reading the CS-04 closure: *"Let's proceed, let's fix all low medium and high
findings, and continue with q-005 and cs-08 if make sense to run it now."* Read as three asks. The
Phase 5 review's seven findings were already fixed before the CS-04 merge, so "all findings" meant
the four open items the program's own sessions and reviews had filed in `TODO.md` (two MEDIUM, two
LOW). "Continue with Q-005" meant installing the user tier for real on this machine so the operator's
two client checks can be run — the precedence change is thereby the operator's decision, made. CS-08
made sense now: research-only, no `src/assets`/registry footprint to serialize against, and the user
tier finally exists to compare a restore model with.

### What Got Done

1. **Session re-opened** on `sessions/2026-09-10-program-findings` with a `--scope git` drift check
   (GO: parity 322, ADR references clean, decision IDs 001–045 sequential and unique, Class B hits
   unchanged); the CS-04 handoff consumed.
2. **Q-005 prepared.** The global CLI was upgraded `1.0.0` → `1.1.0` and `spell init --user` run in
   the operator's real home (41 spells, 82 client files); after the release below, `1.1.1` and
   `spell update --user` (`Updated 41 files`, store at `1.1.1`). A subagent probe showed subagents
   inherit the parent session's fixed skill list (it loaded the repository's copy), so the Claude Code
   and Copilot observations remain the operator's — the environment is ready for them.
3. **The four findings fixed and released as `1.1.1`** —
   [PR #236](https://github.com/codemagicianhq/arcane/pull/236), rebase-merged `b72dd6c`, release
   `v1.1.1` 2026-09-10T16:24:41Z, `publish.yml` run 34501917963 succeeded, npm `1.1.1` confirmed:
   `removeWithin` and the traversal guard on every delete path (MEDIUM); line-ending-normalized
   recorded hashes with raw-digest tolerance for older records (LOW); the quoted `@` include for a
   home path with whitespace, Claude Code's documented form (LOW); and for the show-report gate, an
   active program's close anchored on its last non-report commit **and** report-only commits
   excluded from the cast (MEDIUM) — the trailer-free-regeneration discipline is retired, the
   committed report regenerated once (cast 33 → 32, one pre-discipline commit). Independent test
   evidence for each is named in the TODO resolutions.
4. **CS-08 ran and concluded.** A live prototype (a `lite` consumer with its four spell folders
   gitignored; a fresh clone restored in full by today's same-version `spell update`; Codex listing
   the restored, ignored skills; an edit to a restored spell invisible to git and gone on a second
   clone) grounded `docs/research/restore-based-delivery.md` and ARC-046, drafted `Proposed`:
   **no-go for now, mechanism retained**, the symlink/junction variant rejected outright. Q-006 asks
   the operator to decide; PRD AC9 met; PLAN.md ticked. Opened as
   [PR #237](https://github.com/codemagicianhq/arcane/pull/237), operator-merged (ADR-drafting PR);
   this closure record rides in it because only one open PR may regenerate the program's report.
5. **Records:** `TODO.md` (four items resolved; one new LOW — `spell update` refuses on a
   line-ending-only modification of the manifest it just wrote on a `core.autocrlf=true` checkout);
   `docs/verification-ledger.md` (eight rows for this stretch); `ai-context/system-prompt-context.md`
   (priority 8 and the handoff).

### Decisions Made

| Decision | Rationale |
| --- | --- |
| ARC-046 (Proposed): no program for restore-based delivery; the symlink/junction variant rejected outright; the same-version restore path, hash record and `scope` field retained as the pieces a future overlay design would build on | The restore step already exists and works; edits to gitignored files are lost by construction (demonstrated); the user tier and the coming opt-out answer the duplication; ARC-027's `core.symlinks=false` plus VS Code's deprecation of the setting BC-28's junction finding relied on. Operator decides via Q-006. |
| The show-report cast never counts a commit that touched only the program's report files, and an active program's close is the last non-report commit | Path-based, so rebase-merges cannot break it; retires the trailer-free rule; anchoring the close alone left buried regenerations counted (found by the regression). |
| CS-08 ran after CS-04 rather than last | Operator's call; research-only with no shared footprint; the user tier now exists to compare against; its verdict can inform CS-05's design and CS-07's docs earlier. |
| The four findings shipped as one patch release rather than four | One coherent hardening release with no new surface; each finding kept its own regression and TODO resolution. |

### Lessons Learned

#### A `0` from a count is not evidence until the thing counted is shown

`npx --yes arcane-cli@1.1.0 init --help | grep -c -- --user` printed `0`, and for a moment the
published CLI looked wrong. It never ran: the package's bins are `spell` and `arcane`, so `npx
arcane-cli` had nothing to execute. The same class as the earlier `execSync` quoting trap — a count
that can be zero for a reason unrelated to the claim. Unpacking the tarball and running the installed
binary's help for all four commands settled it. Print what was counted, not just how many.

#### The regression found what the reasoning missed

Anchoring an active program's close on its last non-report commit was correct and insufficient: it
kept a regeneration from counting itself while it was the tip, and the moment real content landed
after it, the earlier regeneration fell back inside the cast range. The test written for the fix
failed with "expected 2, received 3" before the fix shipped. Write the regression for the scenario
the design claims to cover, not for the scenario that motivated it.

#### A count over a range is only as good as the range's lower bound

The first search for report-only commits carrying a trailer used the CS-00 merge commit as the lower
bound and found none; the plan's real `baseline:` is an earlier commit, and one such commit exists
there. The "33 → 32" explanation was right, but the first check that would have justified it was
wrong. Read the bound from the source that defines it.

#### An output filter that hides the summary turns a failure into a mystery

The second push of the CS-08 branch failed and the pattern used to trim the hook's output dropped
vitest's summary and failure lines; a local rerun was green and a third push passed unchanged. The
failing test is unknown — an uncaptured under-contention flake, the class `TODO.md`'s Test Suite item
describes, and the exact situation its advice ("read the pre-push hook's log") exists for. Filter
after saving the full log, never instead of it.

#### Build the model, then decide

The restore-model question had been open since August. Twenty minutes with the shipped CLI — a
gitignored consumer, a clone, an update, an edit, a second clone, one `codex exec` — produced every
finding the decision rests on and one incidental bug. Planning had rightly deferred the question to a
spike; the spike's value was in running it, not in reasoning about it.

### Open Items Carried Forward

- **[PR #237](https://github.com/codemagicianhq/arcane/pull/237)** — CS-08's ADR-drafting PR,
  open for the operator's merge; this closure record is in it. Merging it is separate from deciding
  **Q-006** (accept, revise or reject ARC-046).
- **Q-005** — the user tier is installed on this machine at `1.1.1`; the operator's Claude Code and
  Copilot checks can be run as-is. **Q-004** unchanged.
- **CS-05 — repo opt-out (`spell_scope`)** is the next eligible epic; CS-06 follows; CS-07 (docs, PRD
  close, drift) after CS-05, CS-06 and CS-08's merge.
- **TODO.md, new LOW:** the autocrlf line-ending refusal in `spell update`. **Pre-existing and still
  open:** the worktree branch-naming MEDIUM, the governance-doc dependency MEDIUM, the ARC-031
  mis-citation LOW, the Show Report share lens.
- **An uncaptured test flake** on one pre-push run; nothing to act on beyond the lesson above.
