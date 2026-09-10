# 2026-09-09 — Codex Support: CS-01 through CS-03 shipped, the CHANGELOG caught up, 1.0.0 ready for the operator

Related: [[development-methodology]] (the Spell Loop these epics ran under), [[git-conventions]]
(the branch, PR and attribution rules every commit here followed).

## Session: CS-01, CS-02, ARC-045's acceptance, the CHANGELOG catch-up, and CS-03's canonical move (1.0.0)

### Prompt Context

The same conversation that activated the program (see
`journal/2026-09-09-codex-support-cs00-activation.md`) continued after the operator merged CS-00.
The operator's standing direction for the rest of it: *"i want to run the full cycle spell on the
whole plan… leave you autonomously run the whole thing, at my green light"* → *"defaults, let's go"*,
with three explicitly retained operator acts — merging CS-00, accepting ARC-045, and CS-03's merge with
its version number. Mid-session the operator switched the model (commit trailers before the switch
read `claude-sonnet-5`, after it `claude-fable-5-1`), merged several PRs by hand (*"ok all prs are
merged now, you may continue"*), and gave the ADR verdict directly (*"accept ARC-045"*). The version
number for CS-03 was chosen through a structured question: **1.0.0**.

### What Got Done

1. **CS-01 — Codex ships** ([PR #221](https://github.com/codemagicianhq/arcane/pull/221), `0.39.0`,
   self-merged under the delegation): `renderCodexSkill()`, `runSkillParity`, a third registry file
   per spell (41), the org-token lint over `.agents/skills/`, 60 new tests. The read-and-follow shim
   mechanism was proven live against `codex-cli 0.153.4` before it was designed in.
2. **CS-02 — ARC-045 drafted** ([PR #226](https://github.com/codemagicianhq/arcane/pull/226)) and
   **accepted by the operator** ([PR #230](https://github.com/codemagicianhq/arcane/pull/230), the
   status flip and Q-002 done). Both merged.
3. **Dependabot unblocked** in passing: the vitest 5 coverage regression turned out to be genuinely
   untested `stripMarkerSection` branches (eight real tests, [PR #228](https://github.com/codemagicianhq/arcane/pull/228)),
   plus `@types/node ^22` ([PR #227](https://github.com/codemagicianhq/arcane/pull/227)).
4. **The CHANGELOG catch-up** ([PR #231](https://github.com/codemagicianhq/arcane/pull/231),
   self-merged): 60 entries, `0.22.1` → `0.39.0`, every version cross-checked against
   `npm view arcane-cli versions`, every date against its tag, every `DECISIONS.md` anchor against the
   real headings, every commit→PR mapping through the GitHub API. Two versions that exist in git but
   never reached npm are recorded with their causes read from the workflow logs: `0.32.1`
   (release-drift got `HTTP 500` from the Releases API) and `0.34.3` (publish's shallow checkout broke
   the show-report parity test — the defect SR-03 fixed).
5. **CS-03 — the canonical move — built, reviewed, green, and left for the operator's merge as
   [PR #232](https://github.com/codemagicianhq/arcane/pull/232) (`1.0.0`).** Eleven commits: the
   architecture (`features/codex-support/architecture.md`, D1–D9, ten stories), one atomic feature
   commit (`git mv` of 41 spells to `src/assets/.arcane/spells/`, `renderCopilotPromptShim`, the
   retargeted Claude and Codex renderers, `runShimParity` over three targets, registry four-per-spell,
   every gate that enumerated the old folder retargeted, 28 test files repointed), the `spell update`
   migration commit, docs and the `## [1.0.0]` changelog with a consumer migration table, the client
   re-confirmation record, the version bump, program bookkeeping, and the review-fix commit —
   interleaved with trailer-free show-report regenerations. Full suite 84/84 files, 1378 passed; CI
   green on the final head `a3d1d48`; both required gates for starting CS-03 (ARC-045 Accepted, Q-003's
   1.0.0) were re-verified on `main` before the branch was cut.
6. **The migration was designed against observed behavior, not the plan's wording.** Four fixture
   variants were run against a real `0.39.0` consumer *before* any code: an appended edit three-way
   merged "successfully" into the new shim with the edit dangling underneath (reported as `Merged your
   edits`); an in-body edit left conflict markers over a vanished body; an entry without a recorded
   hash was overwritten silently; and — new — an edit merged at one update was **overwritten at the
   next**, because the merged file's hash had been recorded as "what Arcane last wrote". The shipped
   `update` keeps customized shims untouched with a named remedy, carries the recorded hash forward,
   restores missing tracked files at the same version, and records the vendor hash after a merge.
7. **DoD item 3 re-confirmed by direct client observation** and recorded in
   `docs/research/skill-discovery-smoke-tests.md`: Claude Code's regenerated stub loaded the canonical
   body through its `@` include in this very session; the real `codex exec`, in a consumer installed from
   the 1.0.0 build, read `.arcane/spells/spell-status.md` (visible in its tool trace). Copilot Chat is
   recorded as an operator check (`docs/plans/codex-support/OPERATOR-QUEUE.md` Q-004).
8. **An independent adversarial review** (fresh context, read-only, with its own scratch probe of
   `runUpdate`) returned 0 HIGH / 3 MEDIUM / 6 LOW, verdict "nothing blocks"; all nine were addressed in
   `78bbebc`, and its one pre-existing observation (two `rm` paths without the traversal guard) became a
   `TODO.md` item.
9. **The verification ledger** gained this session's twelve events (`docs/verification-ledger.md`,
   "2026-09-09 — Codex Support CS-03"): three confirmed, nine corrected.

### Decisions Made

No new ADR — CS-03 implements ARC-045 decisions 1–2, and the implementation-level decisions are
recorded in `features/codex-support/architecture.md` (D1–D9) and ARC-045's implementation note.
The ones a future reader is most likely to look for:

| Where | Decision | Rationale |
| --- | --- | --- |
| architecture D2 | The Copilot shim copies the canonical frontmatter block **verbatim**, then one paragraph with a relative Markdown link *and* the read-and-follow sentence | VS Code's docs do not say whether a linked file is attached; the picker must see exactly the fields it saw before; every spell runs `agent: agent`, so the model has a file-read tool either way |
| architecture D5 | A customized client shim is **kept, never merged**; its previously recorded hash is carried forward | A shim carries no prose to merge into; recording the edited hash would make the next update overwrite it, recording nothing would drop it into the pre-ARC-038 overwrite path |
| architecture D5 (after review F1/F6) | Same-version restore writes exactly the set the gate counted — tracked, absent, vendor-owned — never `initOnly` or user-owned `skipExisting` files | The gate and the action must agree; a deliberately deleted `journal/.gitkeep` must not return on every run |
| architecture D5 | After a successful three-way merge, record the **vendor** content's hash | The recorded hash means "what a clean install of this version wrote"; the merged-file hash made an operator's edit survive exactly one update (ARC-038 gap, present since 0.32.0) |
| this close | Session-close docs ride in the operator-merged PR #232 rather than a second PR | Two open PRs that both regenerate the codex-support show-report make whichever merges second leave `main`'s golden pair stale; CS-00's close followed the same shape in PR #220 |

### Lessons Learned

#### Run the migration against the tree before believing the plan's failure mode

PLAN.md framed CS-03's consumer risk as "hash mismatch → conflict". Fifteen minutes with a real
`0.39.0` consumer fixture showed the actual behavior was worse and quieter: a clean three-way merge
that reported success while orphaning the operator's edit under the new shim, conflict soup only for
in-body edits, silence for unhashed files — and a second, unrelated defect (edits survive exactly one
update) that no test had ever exercised because every merge test asserted after one update. The
Loop Protocol's "empirical-first step" is not ceremony; it produced the two most important lines of
this epic. Corrected on the record in PLAN.md and ARC-045's implementation note.

#### A verification script has to prove it checked something

My CHANGELOG date check reported `dateMismatch: []` for 60 entries. Its own side field, `noTag`,
listed every version — the tag map was empty, because `execSync` on Windows runs through cmd.exe,
where the single quotes around `--format='…'` are literal characters. "Zero mismatches" is evidence
only next to "N compared, N > 0"; the re-run with double quotes compared 60 and found 0. The same
failure class hit again an hour later in the other direction: I read `check:citations` through
`tail -1`, saw the one pre-existing finding, and wrote "no new findings" into a commit message
(`649d4ce`) — the full listing had eleven more, six of them caused by the move. That commit message is
wrong on the record and is logged as such in the ledger. Read the whole gate output, never its last
line.

#### `codex exec` blocks on stdin from a background shell

A background `codex exec` sat silent for ten minutes. Its stderr held the answer:
`Reading additional input from stdin...` — in a background shell stdin is neither a terminal nor
closed, so codex waits for piped input forever. `< /dev/null` and it finished in under a minute. The
hung process was killed by matching its command line, not by image name: the Codex desktop app keeps
several `codex.exe` helpers alive that were not mine. Recorded in the research doc's operational note.

#### Two open PRs that both regenerate the same show-report is a trap

The golden-parity gate counts every `Agent:` trailer up to `HEAD` for an active program, so every
branch regenerates `docs/plans/codex-support/show-report.*` against its own history. Whichever of two
such PRs merges second leaves `main` with a stale pair and a red `test/report-cli.test.ts` — the exact
thing that happened between #230 and #231 earlier today and was absorbed by rebasing and regenerating
before the second merge. With CS-03 operator-merged, a separate session-close PR would have handed
that rebase-and-regenerate step to the operator; the close docs therefore ride in #232. The real fix
remains `TODO.md`'s Show Report item (freeze the cast at the generator's own commit).

#### The reviewer's probe found what the tests didn't

The same-version restore path had a present-file branch no test executed and a gate/action mismatch
(two files counted, six written) that only a scratch run against a real temp repository exposed. A
fresh-context reviewer with permission to *run* things — not just read — is worth its cost on the
riskiest commit of a program; the fix was three lines, the test it lacked was the finding.

#### Living-doc citations that name a file by its old name break silently on a move

Six citations in `DECISIONS.md`, `IDEAS.md` and `TODO.md` cited spells as `spell-x.prompt.md` with an
anchor or quoted phrase. After the move those names still *resolve* — to the shim — where the heading
or phrase no longer exists, so LH-07's check flagged them, in warn mode. Any future relocation of a
cited file needs a citation pass in the same PR; grep for the old filename across the living-doc set
before declaring the gates clean.

### Open Items Carried Forward

- **Merge [PR #232](https://github.com/codemagicianhq/arcane/pull/232)** — operator, via
  `docs/plans/codex-support/OPERATOR-QUEUE.md` Q-003 (merge or rebase, never squash). Then watch
  `publish.yml` for `1.0.0` and mark Q-003 done with the merge commit only once the publish has
  succeeded — a merged bump is not a published one (0.34.3).
- **Copilot Chat check** — operator, Q-004: `/spell-status` in agent mode returns the snapshot line, not
  a paraphrase of the shim. If it paraphrases, the fallback is an inlined-body Copilot renderer (the
  `render()` mode variance ARC-045 allowed) as a small follow-up epic.
- **Next epic after the merge: CS-04 (user tier install)** per `docs/plans/codex-support/KICKOFF.md`;
  CS-08 (the restore-model spike) may run any time after CS-03 lands. Nothing eligible remains while
  #232 is open — the loop halts here by its own rule.
- **Tracked, not done:** `TODO.md` gained a LOW (byte-exact hashes read a CRLF rewrite as an operator
  edit — now routing a shim into keep-and-warn) and a MEDIUM (`resolveOrphan`/`uninstall` `rm`
  manifest paths without `validateTargetPath`); the Show Report self-count item is unchanged and still
  the reason every report regeneration here is a trailer-free commit.
- **On the record, not fixable:** commit `649d4ce`'s message claims `check:citations` had no new
  findings; it did (ledger entry). The correction is in `051a6ea`.
- **Five `backup/*` local branches** (2026-08-02 / 2026-08-15) hold content not on `main` by design;
  reported by the close sweep, not deleted — the operator's call (see the closure report).
