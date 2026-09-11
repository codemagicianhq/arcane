# 2026-09-11 — Codex Support: CS-05 shipped — the repository opt-out (1.2.0)

Related: [[development-methodology]] (the Spell Loop this epic ran under), [[git-conventions]]
(branch, PR and attribution rules every commit here followed).

## Session: CS-05 — `spell_scope`, a repository takes its spells from the user tier

### Prompt Context

Opened on the operator's *"237 approved and merged, what's next?"*, with a standing instruction
attached: *"don't let me forget to run those tests in new folder (or repo) manually, after we are
done (or whenever is necessary) but I'm not on my main pc right now I'm working thru my phone."*
The program's standing delegation (`codex-support-plan`) covers CS-05, so the epic ran end to end
without an operator gate. The session also switched models mid-flight — commits before the switch
carry `Model: claude-fable-5-1`, after it `claude-opus-5`.

### What Got Done

1. **Session opened** on `sessions/2026-09-10-cs05-repo-opt-out`; the CS-04/CS-08 handoff consumed
   after re-checking its one pending item (PR #237 — merged by the operator, `d2c9325`); `--scope
   git` drift check GO (parity 322, ADR references clean, ARC-001..046 sequential, Class A zero).
2. **Designed before built.** `features/codex-support/architecture.md` gained the CS-05 section
   (D1–D9) and `stories.json` its five stories, with four empirical findings taken first against the
   real tree.
3. **Shipped as [PR #238](https://github.com/codemagicianhq/arcane/pull/238)**, rebase-merged
   2026-09-11T06:18Z (`3e0b979`), released as `v1.2.0`, `publish.yml` run 34569378898 succeeded, and
   `arcane-cli@1.2.0` installed from npm into a scratch prefix carries `spell_scope`.
4. **What the epic delivers:** `spell_scope` on the manifest (absent = `repo`, validated);
   `componentForSpellScope` emptying the `spells-*` components while every other component is
   untouched; `spell init` asking only when a tier exists and defaulting to No; `spell update`
   making the opt-out visible on the next run and reversible on the one after; a **blocking**
   `spell doctor` check; the `Scope: repo (spells: user tier)` status line.
5. **EV-01, live:** two repositories beside one user tier — the opted-in one went from 160 spell
   paths to 0 with no empty directories left and governance untouched, the other stayed at 160;
   `spell doctor` exit 0, then exit 1 once the store was removed, naming the remedy.
6. **The operator's machine** was brought to `1.2.0` (global CLI and the user tier, `Updated 41
   files`), so the Q-005 client checks can be run against a consistent version.
7. **Records:** `TODO.md` (one new MEDIUM), `docs/verification-ledger.md` (eight rows),
   `docs/research/skill-discovery-smoke-tests.md` (the CS-05 section), PLAN tick with the Report
   line, PRD AC6/AC7, ARC-045 implementation note, README, CHANGELOG `1.2.0`.

### Decisions Made

No new ADR. ARC-045 gained an implementation note for decision 4.

| Decision | Rationale |
| --- | --- |
| The opt-out empties the `spells-*` components rather than filtering installed paths by prefix | A prefix list would be a fourth place the client-surface shapes are written down, and would miss a fifth client silently. "Which components deliver spells" is already derived, and a test pins that the two definitions coincide. |
| `spell init` asks only when a tier exists, and defaults to No | The field is committed and inherited by every clone: opting out tells everyone who clones the repository to get their spells from a machine-wide install they may not have. That is a choice someone must make on purpose. |
| The retrofit is a silent `"repo"`, not a `MANIFEST_RETROFITS` question | That list asks an existing install a question it predates, once. Asking every repository on every machine about a store most machines do not have is noise, and the answer is already correct without asking. |
| `checkSpellScope` is blocking; CS-04's `checkUserTier` stays advisory | An opted-in repository with no store has no spells in any client — the "silently unreachable" state the decision exists to prevent. The two checks ask different questions: is the tier healthy, versus does this repository depend on it. |
| An orphan still on disk stays tracked in the manifest | Its own commit, and the reason is general rather than CS-05-specific: the manifest records what Arcane put in the repository, and a file that is still there should stay recorded until it is removed. |

### Lessons Learned

#### The epic's stated risk was work that did not exist

PLAN.md framed CS-05 as prune logic that must never drop an edited file. Building the state first —
a real consumer, the field set by hand, a hash sweep — showed the removal path was already built,
already guaranteed, and already tested, and that the epic's actual job was much smaller: make the
components install nothing. An hour of measurement replaced a day of designing something that would
have duplicated `resolveOrphan`. The KICKOFF step that mandates an empirical-first pass earned its
place again.

#### Unit tests said yes; the real CLI said no, three times

Every unit test passed while `spell update` still short-circuited on "Already up to date." for the
one scenario the feature exists to serve, left 41 empty directories behind, and printed a remedy
that did nothing on the next invocation. All three needed the built CLI against a real repository.
Unit tests check the branch you wrote; running the product checks the branch you forgot.

#### A remedy printed is a promise made

The report-only run told the operator to run `spell update --prune` and, in the same breath, dropped
the very files that command would have acted on. Nothing failed, nothing warned — the instruction
was simply false by the time it was read. Worth a standing habit: when output tells someone to run
something, run it yourself, in that order, before believing the feature works.

#### "It hung" is a finding, not an obstacle

EV-01 stalled past five minutes and the reflex was to work around it. Timing the suspected call
directly turned a nuisance into a filed defect: `spell doctor` shells out to `code --version` when
`$HOME/.vscode/extensions` is missing, which on Windows — where `HOME` is routinely unset — is the
ordinary case, at >25s per spawn, twice a run. The workaround took a minute; the finding is worth
more than the minute.

#### A commit message is a claim about its own contents

The docs commit carried a real behaviour change (the orphan-tracking fix) under a `docs:` subject.
Caught before pushing, split into its own `fix(update):` commit with the reasoning that belongs to
it. The branch was unpushed, so the cost was one reset; after a push it would have been history.

### Open Items Carried Forward

- **Q-005** (`docs/plans/codex-support/OPERATOR-QUEUE.md`) — the operator's Claude Code and VS Code
  Copilot checks, now more interesting than when they were written: this session observed the two
  tiers resolving *differently* for two commands, so the clean-room check has something specific to
  confirm. The machine is at `1.2.0` (CLI and tier) and ready. **Q-004** and **Q-006** unchanged.
- **AC5's picker count** stays open until that check happens; the mechanism it depends on is done.
- **CS-06 — agents at the user tier** is the next eligible epic; **CS-07** closes the program once
  CS-06 lands.
- **TODO.md, new MEDIUM:** `spell doctor` can hang on Windows (the VS Code check). Still open from
  before: the autocrlf refusal LOW, the worktree branch-naming MEDIUM, the governance-dependency
  MEDIUM, the ARC-031 mis-citation LOW, the Show Report share lens.
