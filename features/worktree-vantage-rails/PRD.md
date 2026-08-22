---
status: accepted
tracking_mode: internal
source_intake: batch-001 (EF-33)
---

# PRD — Same-Vantage-Point Rails for Destructive Worktree/Branch Operations

## Problem

`git worktree list` (and `git branch --merged`) can **truthfully** report a live, healthy linked
worktree as `prunable`/merged when read through a cross-filesystem bridge (a Linux-side mount of
a Windows host, a remote-mounted volume, a container bind-mount) — the registered absolute path
doesn't resolve from that vantage point, even though the directory exists and is valid from the
machine that owns it. A destructive command (`git worktree prune`, `git worktree remove`,
`git gc --prune=now`, branch deletion) trusting that read can destroy live work with no error and
no warning distinguishing "confirmed absent" from "not resolvable from this process's view."

Confirmed as a live near-miss during the reporting session (2026-08-03): a Linux-side read
reported all eight linked worktrees `prunable`; the same repository read from Windows (the actual
owning environment) showed zero prunable entries and `git worktree prune -v` removed nothing.

Already partially decided: **ARC-028** (DECISIONS.md, Proposed) already contains this exact rule
as **R7**: *"Any `git worktree prune`, `worktree remove`, `gc`, or branch deletion requires a
same-vantage-point existence check first... A branch attached to an active worktree cannot be
locally deleted — skip local delete, use remote delete + prune."* ARC-028's own follow-up scope
(item 11d) lists "EF-33 rails implementation (flips EF-33 `deferred → shipped`)" as **not executed
by that record** — this PRD is that follow-up.

Re-verified against current HEAD: `git worktree prune`/`worktree remove`/`gc --prune` appear in
**zero** prompts (confirmed by repo-wide grep) — there is no existing rail to harden, only new
governance text plus rails on the existing destructive steps that already exist (branch deletion
in `spell-commit-work.prompt.md`, `spell-close-session.prompt.md`, `spell-ship.prompt.md`; the
worktree-list read itself in `spell-open-session.prompt.md`).

## Scope decision

Per the operator's standing instruction for this run: ship EF-33's R7 rails now; **do not** flip
ARC-028 to Accepted and **do not** pick the concurrency-primitive lore name (Parlor/Séance/
Cabinet) — both remain deferred to a live session. This PRD implements R7 specifically, which the
ADR frames as independently actionable regardless of the ADR's own Proposed status.

## Requirements

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | A new git-conventions.md section states the same-vantage-point rule as a standing operational caution | Placed after Post-Merge Cleanup; names the exact check (cross-reference `git worktree list --porcelain` against an independent path-existence check in the *current* runtime, not assumed from Git's own report) |
| R2 | Every existing branch-deletion step in the three prompts that have one gets the rail | `spell-commit-work.prompt.md`, `spell-close-session.prompt.md`, `spell-ship.prompt.md` |
| R3 | `spell-open-session.prompt.md`'s worktree-list/stale-branch reads carry a caveat about cross-mount false-prunable reports | The read that can produce the false state, per EF-33's own Impact section |
| R4 | `agent-policies.md`'s Multi-Agent Concurrency Rules gains the working-tree dimension (ARC-028 item 11a) | New rule alongside the existing 7 |
| R5 | `DECISIONS.md`'s ARC-028 entry records that item 11(d) shipped this date | ARC-028 stays Proposed; only the follow-up-scope line is annotated |
| R6 | EF-33.md flips to shipped | `docs/intake/batch-001/EF-33.md` |

## Constraints

- EF-33's own "Required tests" section states this is explicitly **not CI-testable** (cross-
  machine/cross-mount filesystem visibility can't be reproduced on a single CI runner) — document
  as standing operational governance, per its own proposed fix. Regression coverage here means
  string-assertion tests proving the rail text exists and is worded correctly, not a functional
  reproduction of the hazard.
- Do not flip ARC-028 to Accepted or select the naming candidate — out of scope per the operator's
  standing instruction for this run.
- Do not invent new tooling (e.g. a `verifyWorktreeVantage()` code helper) — R7 itself, and the
  intake's own proposed fix, frame this as an operational discipline requiring an explicit
  confirmation step, not a code-level guarantee; a fabricated automated check would overclaim
  what's actually being shipped.

## Dependencies

None new. References ARC-028 (Proposed, unchanged by this PR) and the already-shipped EF-34
(shared-`.git` worktree hazard, same general class, cited by DECISIONS.md as related).

## Open Questions

None blocking — EF-33's own open questions are about which bridge/environment produced the
original report, immaterial to shipping the general rail.
