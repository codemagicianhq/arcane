# 2026-09-02 — Show Report: Research and Planning (Saved as a Draft, Not Started)

## Session: Research and plan automated, arcane-ui-rendered completion reports; persist without starting

### Prompt Context

Same conversation as the Lessons Hardening close (see
[journal/2026-09-02-lessons-hardening-program.md](2026-09-02-lessons-hardening-program.md)), after
the operator merged RCA-001 and a Dependabot fix landed. The operator asked for a second
completion ledger "like the first phase," then — on seeing it — for the next level: the report
generated automatically and rendered with **arcane-ui**, their private React design system, in a
way that open-source `arcane-cli` users can run on their own machines. They asked for research by
the roster agents Alexander and Circe (with Adelaide "if you need design input"), and for a plan
("I don't see the button here to change to plan but do a plan").

The planning ran through several rounds of operator questions that each changed the plan: is the
arcane-ui mechanism general or one-off; should exportability be an explicit marker; does the report
control exist; should Claude Design design it first; fonts and licensing; release tagging in
arcane-ui; random `claude/*` branch names leaking into PRs; and, finally, how hard to enforce branch
naming. The operator approved the plan with "I approve but don't implement," later choosing
explicitly to **save for the next session** rather than execute SR-00 — so this session persists
the plan, the research, and the intake it produced, and starts nothing.

### What Got Done

1. **Research by three roster agents**, dispatched with their persona files embedded and a fixed
   brief (context, numbered questions, verified/inferred/speculative labels, an output path, reply
   = Summary only). Landed, with local machine paths normalized, as
   `docs/research/show-report-feasibility.md` (Alexander), `docs/research/show-report-design.md`
   (Adelaide), `docs/research/show-report-narrative.md` (Circe). Headline verified findings:
   ~80% of a report is derivable from `PLAN.md`/`OPERATOR-QUEUE.md`/`gh`/trailers/the verification
   ledger, but the per-row sentence and category are not; the entire arcane-ui library renders under
   `renderToStaticMarkup` in plain Node (217 exports, zero module-scope DOM access) with three
   named static traps; the light scheme fails AA for pills; the primary reader is the operator
   asking "is it done, and what's waiting on me?".
2. **The plan**, saved as `docs/plans/show-report/PLAN.md` with `status: draft` (also at
   `~/.claude/plans/show-report.md`, renamed from the random slug Claude Code generated).
   Architecture: a **general static-export contract** in arcane-ui (an `exportable` registry, a
   `templateMode` convention, a conformance test) that pre-renders the report once into a Mustache
   template; that artifact — markup plus a CSS subset, zero React — is vendored into `arcane-cli`,
   which fills it from a `show-report.json` derived from the plan documents. Offline for OSS users,
   exact fidelity, no hosted service, no need to open-source arcane-ui. Design happens first in
   Claude Design via `/design-sync` (SR-05a), then the arcane-ui build (SR-05b); today's hand-built
   look is an explicit placeholder. Nine epics SR-00…SR-08; seven operator-owned decisions recorded
   with defaults (template licensing into MIT, the name, the `mustache` dependency, the design
   tool, export-contract scope, fonts — verified Google Fonts/SIL OFL, no action — and arcane-ui
   release tagging).
3. **Intake filed through the proper spells** (`spell-save-idea`, `spell-todo`), not left in prose:
   five `IDEAS.md` entries (a release-tagging policy and what should decide it — possibly a
   `.arcane.json` `publishes`/`repo_kind` attribute; a `check:handoff-freshness`; a standard
   research-dispatch brief / `spell-research`; the `@dependabot rebase` note; the operator's
   branch-naming idea in their own words) and five `TODO.md` items (ARC-041 missing from the
   DECISIONS.md table of contents; LH `PLAN.md` links a PR for only 3 of 14 epics → SR-01; the
   "7 rows" vs 8 miscount in the LH-13 note and journal; the known-stale Become Current artifact
   → SR-01/02; and a **MEDIUM** branch-naming gap — 17 of ~190 PRs in this repo's history carry
   random `claude/*` heads because `EnterWorktree` without a `name` and `Agent` worktree isolation
   bypass `spell-open-session`'s rename). Operator decision on the last: rename-on-sight in the
   spells (structured spell gate), the rule specified once in `git-conventions.md` and referenced
   everywhere else via a shared fragment, no CI check for now.
4. **Two operator questions answered against the tree, not from memory:** fonts — arcane-ui's spec
   names Chakra Petch, Rajdhani, JetBrains Mono from Google Fonts (all SIL OFL), and arcane-ui
   itself already decided consumers supply them, so nothing is licensed or vendored; release
   tagging — `git ls-remote` shows arcane-ui has zero tags, so the plan recommends tagging every
   publish (not release branches) as an `ARCUI-016`-shaped decision in that repo.

### Lessons Learned

**An approved plan is not a go, and the operator will say so more than once.** `ExitPlanMode` was
rejected four times in this stretch — three because the operator had more questions, once with
"I approve but don't implement." Each rejection improved the plan (the general export contract,
the exportable marker, the design-first split, fonts, tagging, branch naming all came from those
rounds). The right response to a rejected plan is to amend the plan file and re-present, not to
defend it — and "save for the next session" is a legitimate, complete outcome of a planning
session.

**Agent-written research cites absolute local paths, including the operator's username.** A
pre-landing scan of the three memos found the operator's user-profile path in two of them (from
the scratchpad locations given in the briefs) and, in one, a measurement source under a real
client's directory. Both are the ARC-031/`spell ward` class of leak and would have entered a public
repo verbatim. A scan-and-normalize step before committing anything an agent wrote is not
optional; the research-dispatch brief idea filed today should include "cite repo-relative paths
only."

**The Bash layer mangles backslashes inside heredocs — and a memory note saying exactly that was
not enough.** The first normalization script used `[\\/]`, `\s`, and `\n` in regex literals inside
a heredoc; every one was silently corrupted and every pattern matched nothing, caught only by a
loud leftover check. The fix that worked builds every escape programmatically
(`String.fromCharCode`, `new RegExp` from concatenated strings) so no backslash appears in the
source. The lesson under the lesson: a leftover/assertion check after any text transformation is
what turns a silent miss into a visible one.

**A rate-limited subagent is a `failed` dispatch, not a missing result.** The Plan agent meant to
stress-test the design was killed by the account's session limit before producing anything. Rather
than re-spend it, the stress-test was done directly against the three completed memos and the
first-hand repo reading — and the journal says so, per the close-session rule that only observed
outcomes get called done.

### Open Items Carried Forward

- **SR-00 — activate the Show Report program** from `docs/plans/show-report/PLAN.md`: `spell-plan`
  → `features/show-report/PRD.md`, ARC-042 drafted `Proposed` (operator accepts), KICKOFF +
  OPERATOR-QUEUE + the `show-report-plan` delegation record, `status: draft` → `active`. Operator
  merges SR-00; nothing past it runs without that merge.
- The five `TODO.md` items filed today, two of which route into SR-01/SR-02 and one of which (branch
  naming) is a MEDIUM governance fix with its enforcement level already decided.
- The Plan-agent dispatch — `failed` (rate limit); no re-run planned, the stress-test was done
  directly. `(untracked: superseded, nothing to track)`.
