---
name: Spell — Address Review
description: Respond to code-review feedback on a pull request — fetch comment threads, triage each, implement fixes or reply with rationale, and resolve every thread.
argument-hint: --pr <number> (required) [--fix-all] — the PR to address; --fix-all treats all suggestions/nitpicks as fix-now
agent: agent
---

## Executive Summary

- This spell handles inbound code-review feedback: read comments, act on them, and resolve the threads.
- Each comment is triaged — must-fix / suggestion / question / nitpick — and given a disposition.
- Must-fix items are implemented, committed, and pushed; others are implemented or answered with rationale.
- Every thread is resolved at the end (many providers require all threads resolved before merge).
- This is the author-side counterpart to `spell-review` (the reviewer side). Provider-agnostic.

---

Respond to review feedback for the specified pull request.

Context to consult:

- `.arcane/governance/git-conventions.md` — commit format, agent attribution trailers, PR policy, and the interactive-session commit gate.
- `.arcane/governance/development-methodology.md` — workflow phases.

Related spells:

- `spell-review` — the reviewer side. If review was run here, its findings carry stable IDs (`R1`, `R2`, …); reference those IDs when replying so each thread maps to the original finding.
- `spell-create-pull-request` — opens the PR this spell responds to. Run it first if no PR exists yet.

## Arguments

- `--pr <number>` — **required.** The PR to address. If omitted, check the current branch for an associated PR or ask the user.
- `--fix-all` — optional. Treat all suggestions and nitpicks as fix-now (no deferrals).

## Step 0 — Setup

1. **Resolve the PR.** If `--pr` is given, use it. If omitted, look up the PR for the current branch (`gh pr view --json number` / `az repos pr list --source-branch <branch>`). If still none, **stop** and ask the user for the PR number — do not guess.
2. **Working tree must be clean.** Run `git status`. If dirty, **stop** and ask the user to commit or stash first — never stash silently, since uncommitted work can get tangled into the review-fix commits below.
3. **Detect the provider** from the git remote:

   | Remote URL contains | Provider |
   | --- | --- |
   | `github.com` | GitHub (`gh`) |
   | `dev.azure.com` / `visualstudio.com` | Azure DevOps (`az repos`) |
   | anything else | unknown — **stop** and ask the user |

4. **Fetch the PR plus all comment threads:**
   - **GitHub:** `gh pr view <PR> --comments`
   - **Azure DevOps:** `az repos pr thread list --id <PR>`

## Step 1 — Parse threads

For each thread extract: thread ID, author, file + line (if inline), comment text, status, existing replies. Keep only **active** threads; ignore already-resolved ones. If a comment references a `spell-review` finding ID (`R1`, …), carry it through so the reply can cite it.

**If zero active threads remain:** report "No active review threads to address — nothing to do" and stop. Do not create commits or push.

## Step 2 — Categorize each comment

| Category | Criteria | Action |
| --- | --- | --- |
| must-fix | bug, security issue, logic error, broken behavior, standards violation | implement, commit, push |
| suggestion | better approach, refactor, optional improvement | implement OR reply with rationale |
| question | clarification / "why did you…?" | answer in the thread |
| nitpick | minor style / naming preference | implement OR reply with rationale |

Heuristics: "must"/"should"/"required"/"blocking" → must-fix; ends with "?" or starts "why/how/what" → question; "nit"/"minor"/"optional"/"consider" → nitpick; alternative offered without requiring → suggestion. When unsure, escalate to suggestion (not nitpick).

## Step 3 — Disposition

| Disposition | When |
| --- | --- |
| Fix Now | all must-fix; suggestions/nitpicks < ~30 min effort AND within files the PR already touches |
| Defer | scope-expanding items: new features, infra/tooling, cross-file refactors, > ~1 hr effort |
| Decline | the current approach is intentional — reply with rationale |

`--fix-all` forces all suggestions/nitpicks to Fix Now. Deferred items get a `TODO.md` entry with a `(PR #<n> feedback)` note **and** a reply on the thread pointing to that TODO before the thread is resolved — never resolve a deferred thread silently, or the reviewer cannot tell it was tracked vs. ignored.

## Step 4 — Present the plan, then wait

Show a table (`# | category | disposition | author | file:line | summary | planned action`) plus counts. Wait for confirmation; let the user reclassify any item before proceeding.

## Step 5 — Execute

Commits in this spell follow `.arcane/governance/git-conventions.md`: Conventional Commits format, agent attribution (`--author` + required `Agent`/`Model`/`Provider` trailers) when an agent authors the change, and — because this is an **interactive session** — present each proposed commit message and **wait for the human's approval before committing** (the Step 4 plan approval covers *what* to do, not the commit itself). Never squash.

For **must-fix** (one thread at a time): read the code → implement → run the relevant tests.
- **If tests pass:** commit (e.g. `fix(scope): address review — <desc>`) → reply `Fixed in <hash>. <what changed>` (cite the `R#` finding ID if one exists) → resolve the thread immediately.
- **If tests fail:** do **not** commit. Either fix the regression and re-run, or — if the fix is wrong or larger than expected — revert the change, reply on the thread explaining what blocked it, and reclassify to Defer (TODO + thread note). A broken must-fix must never land.

For **suggestions/nitpicks**: if implementing, make the change, run tests, and batch into one commit; reply and resolve. If declining, reply with specific, respectful rationale (reference an ADR or convention if relevant) and resolve as won't-fix.

For **questions**: answer clearly in the thread; if the question reveals a real issue, reclassify and handle it; resolve after answering.

Resolve threads via the provider:
- **GitHub:** resolve the review thread (`gh` / GitHub MCP resolve-thread).
- **Azure DevOps:** update the thread status (`Fixed` or `WontFix`).
- **If a thread cannot be auto-resolved** (provider API error, insufficient permissions, or the reviewer must resolve it themselves): leave the reply in place, list the thread in the Step 6 report under "needs manual resolution," and do not treat the sweep as complete.

## Step 6 — Sweep, push, report

1. Re-fetch threads; resolve any still-active ones (this is the merge gate on many providers). Any thread that genuinely cannot be auto-resolved (see Step 5) is reported as "needs manual resolution," not silently left open.
2. `git push` all commits.
3. Print a summary table of actions taken (category, file, action, commit), thread status (resolved / deferred-with-TODO / needs manual resolution), commits pushed, and next steps (CI, notify reviewer, ready for re-review).
4. Optionally post the summary back to the PR as a top-level comment for a durable record.

## Rules

- Always present the plan and wait for confirmation before changing code.
- This is an interactive session: get human approval for each commit message before committing (per git-conventions Commit Governance).
- Never commit a change whose tests fail — fix, revert, or defer instead.
- Resolve each thread immediately after addressing it — do not batch resolution to the very end (except the final sweep).
- Never dismiss feedback without reasoning, and never resolve a deferred thread without leaving a TODO pointer on it.
- Follow `.arcane/governance/git-conventions.md` for commit format and attribution; do not squash.
- Never include secrets or tokens in replies or commits.
