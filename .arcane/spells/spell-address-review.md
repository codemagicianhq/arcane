---
name: Spell — Address Review
description: Respond to code-review feedback on a pull request — fetch comment threads, triage each, implement fixes or reply with rationale, and resolve every thread.
claude_description: Use PROACTIVELY whenever responding to PR review comments — fetch threads, triage, fix or reply, resolve.
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

Commits in this spell follow `.arcane/governance/git-conventions.md`: Conventional Commits format, agent attribution (`--author` + required `Agent`/`Model`/`Model-Source`/`Provider` trailers, plus `Persona`/`Role` when a roster exists and one was assigned) when an agent authors the change, and — because this is an **interactive session** — present each proposed commit message and **wait for the human's approval before committing** (the Step 4 plan approval covers *what* to do, not the commit itself). Never squash.

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
2. Before pushing, run the push-policy check:

   <!-- fragment:push-policy-check:start -->
   **Push-policy check (ARC-049) — before any push.** Read `push_policy` from the repository's `.arcane.json` at the repository root (a self-hosted source repository with no root manifest keeps it in `src/assets/.arcane.json` when that file declares `selfHosted: true`). An absent file or an absent field means `open`. The check covers every push this spell makes: a branch push, a `--force-with-lease` push, and a remote branch deletion (`git push <remote> --delete <branch>`).
   - **`open` or absent:** proceed with the push.
   - **`guarded`:** before the push, state the policy ("This repository's push policy is `guarded`: every push needs your explicit confirmation."), name the remote, the branch and the kind of push, and ask the operator for explicit confirmation. Push only on an explicit operator confirmation of that push. A timeout, a cancellation, a delegated or host-generated response, or assent given to something else is not confirmation. **In an autonomous run with no operator to ask, do not push:** report the push as pending operator confirmation, naming the branch and the commits it would carry. This fails closed.
   - **`blocked`:** do not attempt the push. Say why: the repository's push policy is recorded as `blocked`, so pushes are refused on purpose. Name `spell unblock-push` as the only way to lift it, run by the operator from an interactive terminal. Never run it yourself, and never work around the block (`--no-verify`, another remote or URL, editing git config or `.arcane.json`).
   - **Any other value, or a `.arcane.json` that cannot be parsed:** do not push. Report what was found and suggest `spell doctor`.
   - When a push does not happen, skip every step that depends on it (opening or updating a PR, remote branch cleanup) and report the commits as committed locally and not pushed.
   - Enforcement: structured spell gate (ARC-023) — for `guarded`, this check is the only thing that holds a push for confirmation. A `blocked` push is also refused by the pre-push hook and the sentinel push URL that `spell init` or `spell block-push` install, and `spell doctor` reports a `blocked` policy whose controls are missing.
   <!-- fragment:push-policy-check:end -->

3. `git push` all commits.
4. Print a summary table of actions taken (category, file, action, commit), thread status (resolved / deferred-with-TODO / needs manual resolution), commits pushed, and next steps (CI, notify reviewer, ready for re-review).
5. Optionally post the summary back to the PR as a top-level comment for a durable record.

## Rules

- Always present the plan and wait for confirmation before changing code.
- This is an interactive session: get human approval for each commit message before committing (per git-conventions Commit Governance).
- Never commit a change whose tests fail — fix, revert, or defer instead.
- Resolve each thread immediately after addressing it — do not batch resolution to the very end (except the final sweep).
- Never dismiss feedback without reasoning, and never resolve a deferred thread without leaving a TODO pointer on it.
- Follow `.arcane/governance/git-conventions.md` for commit format and attribution; do not squash.
- Never include secrets or tokens in replies or commits.
