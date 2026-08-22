# Architecture — Same-Vantage-Point Rails

## Overview

One new governance section in `src/assets/.arcane/governance/git-conventions.md` (canonical),
mirrored to root via self-host parity. Rail text added at each of the four existing sites listed
in the PRD's R2-R4. `DECISIONS.md` gets a one-line annotation under ARC-028's existing follow-up
scope list — no structural changes to that ADR.

## Decisions

**D1 — A named, reusable check, referenced by name at each site rather than restated in full.**
`git-conventions.md`'s new section defines "the same-vantage-point check" once, in full, with the
exact mechanism (cross-reference `git worktree list --porcelain`'s registered path against an
independent existence check run in the current process — e.g. `Test-Path` on Windows, `[ -e ]` /
`os.path.exists` elsewhere — never trusting Git's own prunable annotation alone). Every downstream
site (spell-commit-work, spell-close-session, spell-ship, spell-open-session) references it by
name with a one-line reminder, rather than re-deriving the mechanism four times — consistent with
how other cross-cutting rules in this repo (e.g. the 🛑 pre-PR rebase guard) are defined once and
referenced.

**D2 — Scoped to destructive/irreversible operations only, per R7's own text.** `git worktree
list` and `git branch --merged` themselves (read-only) get a *caveat*, not a gate — they can still
run freely; the gate applies to the *next* step that would act on their output destructively
(`prune`, `remove`, `gc`, branch `-d`/`-D`, `push --delete`).

**D1a — (added after adversarial review, HIGH finding) The check must establish the agent's OWN
vantage point before trusting anything it reads through that vantage point.** The first version
of step 2 let an agent "confirm" a registered path via `Test-Path`/`os.path.exists()` run from its
own process, without ever requiring the agent to establish that its own process is actually in the
environment that registered the worktree. Running the "independent" check from the *same*
bridged/mounted process that produced the false `git worktree list` read reproduces the exact
failure the section exists to prevent — both signals share the identical wrong vantage point, so
they agree with each other for the wrong reason. Fixed with a concrete, mechanical, low-effort
first check: does the registered path's own syntax (drive-letter+backslash vs. POSIX
root+forward-slash) match the current process's native OS conventions at all? A mismatch is
proof-positive of the wrong vantage point and short-circuits straight to "stop and ask" — this
directly closes the exact scenario EF-33's own incident describes (a Windows-registered path read
from a Linux-side mount). Matching syntax alone doesn't *prove* a shared vantage point (two
different containers can both speak POSIX) — it only rules out the cross-OS case, which is the
one this fix can address without inventing new tooling. "Stop and ask" was also promoted from an
edge-case escape hatch to the explicit default outcome whenever step 2's confidence isn't
genuinely established.

**D2a — (added after adversarial review, MEDIUM finding) The branch-`--merged` ancestry hazard is
unconditional and must not share the cross-filesystem scope-gate.** The original section's
opening sentence attributed both the worktree-prunable hazard AND the branch-ancestry hazard to
"read through a cross-filesystem bridge" — true for the former, false for the latter (rebase/
squash-driven SHA rewriting defeats `--merged` on a single machine, no bridge required). Worse,
the bolded scope-gate wrapped the entire 4-step procedure including the ancestry reminder, so a
same-machine agent could correctly conclude "no bridge here" and lose the ancestry reminder along
with the vantage-point check it correctly didn't need. Split into a separate, explicitly
unconditional closing paragraph, referenced (not gated) from the opening sentence.

**D3 — No fabricated code-level enforcement.** Per the PRD's constraint: EF-33's own proposed fix
and required-tests section frame this as operational discipline (a confirmation step a human or
agent performs), not a mechanism CI can verify. Adding a `verifyWorktreeVantage()` function nobody
asked for and nothing calls would misrepresent the fix's actual enforcement mode — string-
assertion tests here verify the *governance text* is correct and present, honestly scoped exactly
like WP3's approach to the same class of prose-only enforcement (ARC-023: "Structured spell gate"
requires an observable-state check before proceeding; a human/agent manually running `Test-Path`
before `git worktree prune` **is** that check — it just isn't code-executed).

## Data flow

```
git-conventions.md (new section, after Post-Merge Cleanup)
  defines: same-vantage-point check -- what it is, exact commands, when required (D1, D2)

spell-commit-work.prompt.md step 10   -- git branch -d <branch> gets the rail
spell-close-session.prompt.md step 10 -- git branch -d <branch> gets the rail
spell-ship.prompt.md                  -- git branch -d <branch> gets the rail
spell-open-session.prompt.md          -- worktree list / branch --merged reads get the caveat (D2)
agent-policies.md                     -- Multi-Agent Concurrency Rules gains rule 8 (working-tree dimension)
DECISIONS.md                          -- ARC-028 item 11(d) annotated shipped; ADR itself stays Proposed
docs/intake/batch-001/EF-33.md        -- deferred -> shipped
```

## Testing strategy

String-assertion tests (per D3, honestly scoped — this class of governance has no executable
enforcement surface, matching WP3's precedent) confirming: the new git-conventions.md section
exists with the exact mechanism described; each of the four downstream sites references it; the
worktree-list/branch--merged reads in spell-open-session carry the caveat; agent-policies.md's
rule count and content reflect the addition.

## Security

None — documentation only, no code, no new execution surface.

## Implementation notes

- Keep the four downstream references short (one to two sentences each) — the full mechanism
  lives in one place (git-conventions.md) per D1; repeating it four times would create four
  places that could drift out of sync with each other.
