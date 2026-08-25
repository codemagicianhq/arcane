# 2026-08-24 — ARC-028's Name, and the Merge Gate That Shipped a Defect

## Session: The last blocker on a research spike turned out to be answerable by the repository's own naming rule, one step before the check everyone was running

### Prompt Context

Opened with `spell-open-session` against the 2026-08-23 handoff, whose single next
concrete action was to pick the ARC-028 name. The operator asked twice for grounding
before deciding — where the name would actually be used, and what the alternatives had
been — then picked `workspace`, accepted a qualification to `session workspace` when an
internal collision surfaced, and afterwards asked to close out whatever remained. Two
work packages resulted: the naming decision plus ARC-028's acceptance, and the two
follow-ups that had been left dangling.

### What Got Done

1. **ARC-028 is Accepted** ([DECISIONS.md](../DECISIONS.md), entry header and the Table of
   Contents status column). Its concept is a **session workspace** — one instance of one
   isolation primitive, and the unit a control center renders as a tile. Shipped in
   `0.21.1` via [PR #68](https://github.com/codemagicianhq/arcane/pull/68).
2. **The name came from the Naming Test, not the four-check.** Item 10 now records that a
   universe name must be earned by the *absence* of an established industry term, that no
   such absence exists, and that the concept therefore takes no lore word at all — the
   first ARC naming decision to resolve that way. The candidate table, the Chamber kill,
   the unused candidates (Grotto, Cloister, Vestry, Oratory) and the trademark caveat were
   all preserved; only the verdict changed.
3. **Item 11(e) shipped.** `git-conventions.md` gained a "Where Work Runs — Session
   Workspaces" section under Branch Discipline, in both trees. The mechanical instructions
   were deliberately left alone: item 10's own rule says the product noun never displaces
   `worktree` / `primary checkout` / `clone` in commands, paths and error messages.
4. **[EF-36](../docs/intake/batch-001/EF-36.md) filed** — auto-merge fires on CI green with
   no notion of an open review round. HIGH, `route: adr`, deferred pending the decision.
   Shipped via [PR #69](https://github.com/codemagicianhq/arcane/pull/69) and entered in
   TODO.md's PR Workflow section.
5. **`project.md` created.** Both `spell-open-session` and `spell-check-drift` list it as a
   primary input and `registry.ts:297` installs it into consumer repos, but
   `git log --all -- project.md` was empty — it had never existed here.
6. **Drift check run** at session open: journal chronology, decision-ID sequence
   (ARC-001–034 contiguous), self-host parity (96 files), hub-artifact leak, and
   done-vs-carry-forward all passed. The four byte-differing root/`src/assets` pairs were
   confirmed to be seed templates rather than dogfood copies, so not drift.

Verified rather than assumed: both PRs are merged and both commits are ancestors of
`origin/main`; the published `0.22.0` tarball was downloaded and grepped, and contains the
"Where Work Runs — Session Workspaces" section in
`dist/assets/.arcane/governance/git-conventions.md`. All five CI runs completed successfully.

### Decisions Made

| ADR | Decision | Rationale |
| --- | --- | --- |
| [ARC-028](../DECISIONS.md#arc-028--concurrency-and-isolation-model-for-parallel-work) (amended, now Accepted) | The container concept is a **session workspace**; no lore word is earned | An established industry term exists, so the Naming Test resolves it before the four-check applies. Qualified rather than bare because `workspace` was already load-bearing in two internal senses. |

No new ADR was created. The naming decision amended ARC-028 rather than standing alone,
and EF-36 routes to a future ADR that has not been written.

### Lessons Learned

#### A recommendation given before the cheap check is a guess wearing a conclusion's clothes

Asked what the concept would be called if it were not an Arcane dialect word, I argued for
`workspace` on the grounds that the four colliding external meanings were evidence the word
was *right* rather than evidence it was taken. That argument still holds. What did not hold
was the sentence I attached to it: that the collision was purely external and internally the
word was free. I had not checked. A single grep — run only after the operator had already
decided — found `workspace` load-bearing in two other Arcane senses: the agent sandbox root
(`workspace-{agent}` in `agent-approved-paths.md` and `agent-policies.md`), and the
validated schema fields `openclaw.workspace_root` / `workspace_prefix` in `src/types.ts` and
`src/modules/agent-schema.ts` that consumers already set.

The second is the one that mattered. **Arcane ships one of the four colliding meanings the
ADR was written to disambiguate.** Taking the bare word would have used one noun for three
things and reproduced the exact ambiguity the record set out to end — the same
internal-collision class that had already flagged Cabinet against DMC's File Cabinet, which
was sitting in the candidate table I had read aloud one turn earlier.

The correction cost one question and produced a better answer (`session workspace`, no
rename, no schema change). But the ordering was wrong, and the ordering is the lesson: the
check that changed the answer took seconds and could have run before the recommendation
instead of after it.

#### The four-check clears names outward; nothing was checking inward

This is the generalizable half of the above, and it is now a concrete gap rather than an
observation. `spell-scry` as specified in TODO.md applies the four checks — who coined it,
is an estate still trading, do same-audience products claim it, what is the first
association — all of which interrogate the *outside world*. None of them greps the
repository the name is about to ship into. Two naming rounds were spent in the lore-word
space (Chamber killed, then four fresh candidates vetted) while the governing rule pointed
at the plain industry term the whole time, and the collision that finally shaped the answer
was one `grep -ri workspace` away and in a different direction entirely.

#### Plan-local labels do not survive the plan that made them

The auto-merge gap had been raised in two consecutive session handoffs and tracked nowhere,
and the reason was structural rather than negligent: it existed only as "D8", a label from
the 2026-08-23 plan's internal decision list. When that plan closed, the label lost its
referent. Worse, `D8` is also a real, unrelated rule ID in
`spell-authoring-standards.md:87` ("Conciseness & non-duplication"), so anyone searching for
it landed on the wrong thing. A finding worth carrying across sessions needs an identifier
from a namespace that outlives the session — which is what EF-36 now gives it.

#### Verifying a merge means asking whether *your* content landed, not whether the trees match

The repository's standing practice since PR #63 is to verify a merge with
`git diff <branch-tip> origin/main` returning empty rather than trusting the merge report.
Applied to PR #69 that check returned a large diff, which reads as failure. It was not: two
commits from another actor's `0.22.0` work had landed on `main` after mine. The empty-diff
form of the check silently assumes nothing else merged in between, which is exactly the
assumption a busy trunk breaks. The reliable form is narrower and answers the actual
question: `git merge-base --is-ancestor <commit> origin/main`, plus a diff restricted to the
files the change touched. Both were run before anything was written up here.

#### The worktree path misdirect recurred, and this time the cause was legible

A `Write` creating `docs/intake/batch-001/EF-36.md` landed in the primary checkout rather
than this linked worktree. Unlike the 2026-08-22 occurrence there was nothing silent about
it — I passed the primary's absolute path. The two paths differ only by the
`.claude/worktrees/<name>/` segment buried in the middle of an otherwise identical string,
so a path composed from memory or lifted from an earlier tool result lands in the wrong tree
without erroring, because both paths are valid. It was caught by verification, confirmed
untracked in the primary, moved, and checked present-here/absent-there. Left alone it would
have been precisely the "files parked by one session get swept into an unrelated pull
request" incident class ARC-028 exists to prevent — recorded in that record's own Context
section.

#### Two actors, two primitives, zero interference

While this session worked in a linked worktree, another actor shipped `0.22.0` from the
primary checkout — `spell-make-discoverable` plus two new governance documents. Neither
disturbed the other, both merged through the same PR gate, and the release carries both
sets of changes. ARC-028's model was accepted and exercised on the same day, which is
better evidence for it than the record's own reasoning section.

### Open Items Carried Forward

Nothing dispatched this session is unresolved — both PRs merged, both commits confirmed as
ancestors of `origin/main`, `0.22.0` verified in the published tarball, all CI runs
completed successfully. The items below are backlog, not in-flight work.

1. **[EF-36](../docs/intake/batch-001/EF-36.md) needs its ADR.** The decision is the
   authoritative "a review round is open" signal, whether auto-merge is narrowed or removed,
   and how the silent stranded-commit mode is made loud. That last part may be the cheaper
   half and is separately valuable. Open question 4 is answerable from the platform and is
   not: whether repo-level auto-merge is currently enabled.
2. **[EF-35](../docs/intake/batch-001/EF-35.md) needs its ADR** — secret detection, bind
   point unresolved.
3. **[EF-18](../docs/intake/batch-001/EF-18.md) is blocked on operator input**, not effort:
   its PRD cannot leave `draft` without a genuine independent batch-002 submission.
4. **Branch accumulation is now the repository's largest untended item.** 39 local branches
   and 31 remote `sessions/`/`claude/`/`chore/`/`docs/` branches. `git branch --merged
   origin/main` reports 3, but the merged-branch cleanup item in TODO.md is explicit that
   ancestry checks are defeated by this repository's own sanctioned rebase-and-fast-forward
   merges — so 3 is a floor, not an answer, and 5 locals already have deleted remotes. The
   tracked item was filed when a consumer repo reached 18.
5. **The ledger backfill for EF-24 / EF-30 / EF-31** remains open in TODO.md.
6. **`spell-scry` should gain an inward pass** before it is written — see the four-check
   lesson above.

### Post-Session Cleanup Owed to the Primary Checkout

This session ran in the linked worktree at
`.claude/worktrees/spell-open-session-4b716e`. Two merged branches
(`sessions/2026-08-23-arc028-naming-pick`, `sessions/2026-08-24-automerge-gate-and-docs-drift`)
and the worktree itself remain. Per ARC-028 R1/R7/R8 none of that can be done from here — a
worktree cannot remove itself, and `git branch -d` refuses on an attached branch. From the
primary checkout, after the same-vantage-point check:
`git worktree remove <path>` then `git fetch --prune origin`.
