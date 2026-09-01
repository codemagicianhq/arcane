---
title: Git Conventions — Commit Format and Branching Model
audience: both
status: active
distributable: true
last_updated: 2026-07-05
tags: [git, conventional-commits, workflow, standards, attribution]
---

# Git Conventions

How to structure commits, branches, and pull requests for this repository.

## Executive Summary

- This repo uses Conventional Commits format for all commit messages — industry standard, tool-portable, human-readable.
- Trunk-based development with short-lived feature branches keeps history clean and reduces merge conflicts.
- No custom git hooks — conventions work on any machine without setup, no fragile tooling dependencies. **Enforcement: explicitly advisory prose (ARC-023) — inaccurate as currently written: this repository's own `.husky/pre-commit` (`npm run lint && npm run typecheck`) and `.husky/pre-push` (`npm test`, plus a PR-state check) are custom git hooks that exist today. Neither validates commit message format or branch naming, so the Conventional Commits and branch-naming conventions this document describes remain hook-independent — but the bullet's literal claim of no custom git hooks in this repository does not hold.**
- Use `spell-commit-work` prompt during sessions to automate commit message generation in the correct format.

---

## Conventional Commits Format

All commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) standard. **Enforcement: explicitly advisory prose (ARC-023) — see Validating Format below for the verified specifics; nothing in this Conventional Commits Format section (structure, types, scopes, short-description rules, body, footer) is mechanically checked in this repo.**

### Basic Structure

```
type(scope): short description

[optional body with details]

[optional footer with breaking changes or issue references]
```

### Commit Types

| Type       | When to Use                                     | Example                                                  |
| ---------- | ----------------------------------------------- | -------------------------------------------------------- |
| `feat`     | New feature or capability                       | `feat(prompts): add spell-commit-work for checkpointing` |
| `fix`      | Bug fix                                         | `fix(auth): restore token validation after refactor`     |
| `docs`     | Documentation only                              | `docs(decisions): add table of contents to DECISIONS.md` |
| `refactor` | Code/structure change, no behavior change       | `refactor(playbooks): reorganize setup steps`            |
| `chore`    | Maintenance, deps, tooling, cleanup             | `chore(deps): bump <dependency> to <version>`            |
| `test`     | Adding or fixing tests                          | `test(security): add token-expiry test`                  |
| `perf`     | Performance improvements                        | `perf(api): reduce cold-start latency`                   |
| `ci`       | CI/CD pipeline changes                          | `ci(azure): add DevOps pipeline for repo sync`           |
| `style`    | Code formatting, whitespace (rare in this repo) | `style(markdown): fix inconsistent heading levels`       |
| `revert`   | Revert a previous commit                        | `revert: undo feat(prompts): add spell-commit-work`      |

### Scopes

Scope indicates what part of the repo changed. Use singular, lowercase.

| Scope            | Area                                              |
| ---------------- | ------------------------------------------------- |
| `prompts`        | `.github/prompts/*.prompt.md`                     |
| `agents`         | `agents/` directory, agent config, policies       |
| `security`       | `security/` directory, threat model, hardening    |
| `infrastructure` | `infrastructure/` directory, hardware, OS setup   |
| `decisions`      | `DECISIONS.md` updates                            |
| `journal`        | `journal/` entries                                |
| `governance`     | `governance/` directory, process docs             |
| `playbooks`      | `playbooks/` directory                            |
| `business`       | `ventures/` directory                             |
| `ai-context`     | `ai-context/` directory                           |
| `repo`           | Root-level files (README, TODO, .gitignore, etc.) |
| `naming`         | `naming-conventions.md`                           |

Multiple scopes? Pick the primary one. If everything changed, use `repo` or omit the scope.

### Short Description Rules

- **Imperative mood:** "add", "fix", "update", "remove" (not "added", "fixes", "updating")
- **Lowercase:** start with lowercase letter
- **No period:** don't end with `.`
- **72 characters max:** keeps `git log --oneline` readable

**Good examples:**

- `add spell-commit-work prompt`
- `fix gateway auth regression after onboarding`
- `update table of contents in DECISIONS.md`

**Bad examples:**

- `Added spell-commit-work prompt.` (past tense, period)
- `Fix gateway authentication regression that occurred after running the onboarding wizard` (too long, 84 chars)

### Optional Body

Include a body when:

- The short description doesn't explain _why_
- Multiple related changes need enumeration
- ADR or file references add value
- Future readers need context

**Format:**

- Blank line after the short description
- Bullet list or paragraphs
- Wrap at 72 characters per line
- Reference ADRs, files, or issues

**Example:**

```
feat(prompts): add spell-commit-work for session checkpoints

Enables committing work-in-progress during active sessions without
waiting for spell-close-session. Generates Conventional Commits format
messages with proper type and scope.

Implements ADR-019 spell- naming convention.

Changes:
- Created .github/prompts/spell-commit-work.prompt.md
- Created governance/git-conventions.md as reference doc
- Updated TODO.md to mark git conventions doc complete
```

### Optional Footer

Use for:

- **Breaking changes:** `BREAKING CHANGE: removed support for plaintext token auth`
- **Issue/ticket references:** `Closes #535` or `Fixes #127`

Most commits in this repo won't need footers.

---

## Atomic Commits

Each commit should be a **single logical change** — one coherent unit that can be understood, reviewed, reverted, or cherry-picked on its own.

### The Rule

> **One commit = one purpose.** If you can't describe the commit in a single short description without "and", it's probably two commits. **Enforcement: explicitly advisory prose (ARC-023) — a semantic judgment about what counts as one logical change; no script evaluates commit scope or purpose, and nothing in this repo attempts to.**

### When to Split

| Situation                                          | Action                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| New governance doc + updates to 3 referencing docs | One commit — the doc and its cross-references form one logical unit               |
| New feature + unrelated typo fix                   | Two commits — the typo fix is a separate `fix` or `docs` commit                   |
| Refactor + behavior change                         | Two commits — refactor first (`refactor`), then behavior change (`feat` or `fix`) |
| Multiple ADRs decided independently                | One commit per ADR, each with its related doc updates                             |
| Config change + documentation of that change       | One commit — the config and its docs are one logical unit                         |

### When to Combine

Not every file change needs its own commit. **Group changes that only make sense together:**

- A new spell prompt + updates to the methodology doc, CLAUDE.md, copilot-instructions.md, and DECISIONS.md that reference it = **one commit** (the spell and its integration are one feature)
- A playbook + its template files = **one commit**
- A security fix + its threat model update = **one commit**

The test: if you reverted just one of the commits, would the repo be in an inconsistent state? If yes, they belong together.

### Staging Strategy

Use `git add -p` or selective staging to separate unrelated changes that were edited in the same session:

```bash
# Stage only the files related to one logical change
git add governance/new-standard.md DECISIONS.md CLAUDE.md
git commit -m "docs(governance): add new-standard with ADR-NNN"

# Then stage the unrelated fix
git add README.md
git commit -m "fix(repo): correct broken link in README"
```

---

## Branch Discipline

**Trunk-based development** with mandatory topic branches for all actors. No one — human or agent — commits directly to main.

### The Rule

> **Main is an integration-only branch.** It receives merges, never direct commits. All work happens on topic branches. **Enforcement: split (ARC-023) — for agent-mediated commits via `spell-commit-work`, this is a structured spell gate: Step 1 checks the current branch and stops before staging or committing if `main`/`master` is checked out against a usable remote, requiring a compliant topic branch first. For a human's raw Git commands, or an agent bypassing the spell, this is explicitly advisory prose: `spell doctor`'s `checkPlatformBranchPolicy` verifies only the platform's merge-method policy (squash disallowed), not that direct pushes/commits to main are blocked — matching `universal-agent-rules.md` rule 14's identical finding for the same underlying claim.**

This applies to:

- Humans editing on any machine
- Autonomous agents working independently
- Interactive AI tools (Copilot, Claude Code, Codex, or any other client)

### Where Work Runs — Session Workspaces

Every unit of work runs in exactly one **session workspace**: one instance of one isolation primitive — the **primary checkout**, a **linked worktree**, or a **full clone** (ARC-028 R1–R5). One session workspace holds one session's work, and it is the unit a control center renders as a tile. Which primitive a session takes is decided by ARC-028 R1–R5; `spell-open-session` states the choice before it writes anything. **Enforcement: structured spell gate (ARC-023) — `spell-open-session`'s "Isolation primitive (ARC-028 R1–R5)" step requires naming the selected primitive in session output before the Mutation Guard creates anything; the selection logic itself (which of the four conditions applies) is evaluated from already-gathered `git worktree list`/`git status` output, not independently re-verified.**

`session workspace` is the **product-level noun only**. The git terms in this document are unchanged: `worktree`, `primary checkout` and `clone` remain correct in every command, path and error message. Shorten to `workspace` only where the surrounding context is unambiguously about sessions — the bare word already means an agent's approved filesystem root in `agent-approved-paths.md` and an OpenClaw config field (`openclaw.workspace_root`), and neither of those is this.

### Branch Naming

**Humans:**

```
type/short-description
```

**Session branches (interactive tools — Copilot, Claude Code, etc.):**

```
sessions/YYYY-MM-DD-topic-slug
```

Create the session branch as the **first action** of any session, before any file edits or commits. All session commits land on this branch. At close, push and open a PR. After merge, return to `main` — **in the primary checkout only** (ARC-028 R8). A session running in a linked worktree ends with push → PR → worktree removal instead; it must not check out `main`, because the primary checkout already holds it and Git will refuse the second checkout.

**Examples:**

- `sessions/2025-11-04-widget-app-implementation` (interactive session)
- `sessions/2025-11-12-payment-webhook-fix` (interactive session)

**Session branch policy (required):**

- Session branches must be deterministic, human-readable, and derived from the active task title. **Enforcement: structured spell gate (ARC-023) — `spell-open-session`'s Mutation Guard renames a noncompliant, unpushed branch to the deterministic `sessions/YYYY-MM-DD-<topic-slug>` format before the first mutation, and its "Session branch naming compliance" check records the required rename when a PR doesn't already depend on the old name.**
- Default format for new interactive sessions: `sessions/YYYY-MM-DD-<topic-slug>`.
- Random adjective-noun branches (for example, `ideal-disco`) are non-compliant and must be renamed.
- If a non-compliant branch was already pushed, migrate it safely:
  1. `git branch -m <old> <new>`
  2. `git push -u origin <new>`
  3. `git push origin --delete <old>` (skip this if an active PR still depends on `<old>`).
- **EF-20 hazard:** on some Windows/Git-for-Windows filesystems, a rename or delete can trigger
  an interactive retry prompt (e.g. a file lock from an editor or antivirus scan) that blocks
  indefinitely on a terminal with no non-interactive fallback. When running these commands
  directly through a tool that supports a per-call timeout (an agent's shell tool, a CI step),
  set one rather than assuming the command will return. Arcane's own TypeScript Git helper
  (`src/modules/git.ts`) applies this as a standing contract — closed stdin plus a
  command-class timeout — for every `git` invocation the CLI itself makes. **Enforcement: explicitly advisory prose (ARC-023) — the recommendation to set a timeout applies to an agent's own separate shell tool invocations of raw `git`, which nothing here checks. The cited precedent is independently verified: `runGit` (`src/modules/git.ts`) closes stdin immediately and applies a `DEFAULT_TIMEOUTS_MS`-scoped timeout for every git invocation Arcane's own CLI makes internally — a real executable check, but scoped to Arcane's own code path, not to a human's or agent's independent terminal command.**

**Agents:**

```
{agent-slug}/type/short-description
```

The agent slug prefix makes branch ownership obvious in `git branch -r` output and prevents naming collisions between agents. **Enforcement: explicitly advisory prose (ARC-023) — no check in this repo validates an agent branch name against this format, unlike session-branch naming above (which `spell-open-session` does check and, when noncompliant, rename).**

**Examples:**

- `docs/readme-update` (human)
- `feat/spell-commit-work` (human)
- `fix/auth-token-regression` (human)
- `lafayette/feat/api-endpoint` (agent — Lafayette)
- `merlin/docs/architecture-update` (agent — Merlin)
- `lince/fix/test-regression` (agent — Lince)

### Human Workflow

1. **Start a topic branch** before any work:
   ```bash
   git fetch origin
   git checkout -b docs/my-topic origin/main
   ```
2. **Commit often** using Conventional Commits format.
3. **Push your branch** (especially important for multi-machine work):
   ```bash
   git push origin docs/my-topic
   ```
4. **Merge to main via fast-forward** when done. **This step is primary-checkout work** (ARC-028 R1)
   — it checks out `main`, which a linked worktree cannot do while the primary holds it. From a
   worktree or a clone, open a PR and merge through the platform instead:
   ```bash
   git checkout main
   git pull origin main
   git merge --ff-only docs/my-topic
   git push origin main
   git branch -d docs/my-topic
   git push origin --delete docs/my-topic
   ```
5. **If ff-only fails** (someone else merged first), rebase and retry — **primary checkout only**, same as step 4:
   ```bash
   git checkout docs/my-topic
   git rebase main
   git checkout main
   git merge --ff-only docs/my-topic
   ```

### Agent Workflow

1. **Create a prefixed topic branch:**
   ```bash
   git checkout -b lafayette/feat/api-endpoint origin/main
   ```
2. **Commit with proper attribution** (author identity + required trailers).
3. **Sync with main before opening a PR** — always rebase on the latest origin/main before pushing
   or creating a PR, regardless of whether conflicts are expected. **This is mandatory for every
   agent-initiated PR — see the [🛑 Agent-mandatory pre-PR guard](#-agent-mandatory-pre-pr-guard)
   callout below. It applies even when using raw `az repos pr create` / `gh pr create` / MCP tools
   instead of the `spell-create-pull-request` spell.**
   ```bash
   git fetch origin
   git rebase origin/main
   # If conflicts arise: resolve → git add → git rebase --continue
   ```
   This ensures the PR diff is clean, the CI runs against current main, and reviewers see no
   stale divergence. Resolve conflicts locally — never push a branch with known merge conflicts.
4. **Push the branch to origin** (after rebase).
5. **Merge or queue for review** based on power level:
   - **Magus+ agents, working in the primary checkout:** self-merge via `git merge --ff-only`, then push main
   - **Magus+ agents, working in a linked worktree or a clone:** self-merge through the platform's PR
     merge instead (ARC-028 R1). The authority is the same; only the mechanism changes, because a
     local ff-merge requires checking out `main` and the primary checkout already holds it. Power
     level decides *whether* you may merge without review; the isolation primitive decides *how*.
   - **Below Magus:** push the branch, report branch name, and queue for human merge
6. **Delete the branch** after merge.

### Multi-Machine Workflow

When working across machines, topic branches are the coordination mechanism:

- **Starting work on any machine:** `git fetch && git checkout -b type/topic origin/main`
- **Continuing work started on another machine:** `git fetch && git checkout type/topic && git pull`
- **Push branches frequently** so work is available across machines
- Main stays clean — only receives merges from completed branches

### Merge Strategy by Repo Risk

| Repo Type      | Examples                           | Merge Method | PR Required? |
| -------------- | ---------------------------------- | ------------ | ------------ |
| **Docs repos** | docs hub, prototypes               | PR or local ff-only | No — see note |
| **Code repos** | application, API, storefront repos | PR           | Yes          |

> **Docs-only repositories.** A PR is *not* required. `cicd-standards.md` records
> the docs-only exception (ADR-048): branch discipline still applies — branch,
> work, then fast-forward merge — but a review gate is optional where there is no
> build to validate. This table previously said "PR required: Yes", contradicting
> that exception; the exception governs. Repositories that produce artifacts keep
> the PR requirement in full.

- **Code repos have main branch protection.** Direct pushes to main are rejected, and all changes go through a PR. Docs-only repositories keep branch discipline (branch → work → fast-forward merge) but may merge locally without a PR, per the exception above. **Enforcement: explicitly advisory prose (ARC-023) — `spell doctor`'s `checkPlatformBranchPolicy` (`src/commands/doctor.ts`) verifies only the platform's merge-method policy (squash disallowed), not that direct pushes to main are actually rejected; matches `universal-agent-rules.md` rule 14's identical finding for the same underlying claim. Confirmed live against this repo's own GitHub ruleset ("protect main", id 18841659): it does carry active `pull_request`, `non_fast_forward`, and `required_status_checks` rules with `current_user_can_bypass: "never"`, which together do reject direct/non-fast-forward pushes to `main` in practice — but that live confirmation is this agent's own manual query, not something any Arcane code path checks for an arbitrary consumer repo.**

#### Azure DevOps PR Merge Type

When completing a PR in Azure DevOps, allow only these merge strategies by default:

- **Merge (no fast forward)**, or
- **Rebase and fast-forward**

Do **not** use Squash commit. **Enforcement: verified external platform policy (ARC-023) — `spell doctor`'s `checkPlatformBranchPolicy` (`src/commands/doctor.ts`, backed by `src/modules/platform-policy.ts`'s `evaluateGitHubMergePolicy`/`evaluateAdoMergePolicy`) queries live GitHub Rulesets or Azure DevOps branch policy and verifies the effective merge methods match this same ladder — a local, on-demand CLI check the operator runs, not a check wired into CI itself. Confirmed live against this repo's own GitHub ruleset: `allowed_merge_methods` is `["merge", "rebase"]` — squash is not present.**

| Merge Type                  | Use?    | Why                                                                                               |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| **Rebase and fast-forward** | **Yes** | Preserves linear history while keeping individual commits and attribution trailers intact.        |
| **Merge (no fast forward)** | **Yes** | Preserves full branch context and review traceability where explicit merge commits are preferred. |
| Squash commit               | **No**  | Collapses commit history and breaks per-commit attribution/analytics and granular rollback.       |
| Semi-linear merge           | No      | Adds unnecessary merge commits on top of rebased commits; avoid by default.                       |

### Commit Governance

Commit execution rights depend on the interaction context:

| Context                                                           | Commit Behavior                                                                                                      | Rationale                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Interactive session** (Copilot, Claude in VS Code, Claude Code) | **Must ask human** before committing. Stage changes, present proposed message, wait for approval.                    | Human is actively collaborating; commits are a shared decision. **Enforcement: structured spell gate (ARC-023) — `spell-commit-work`'s Step 8 computes an approval fingerprint from the staged diff and proposed message and requires an authenticated operator response tied to it before `git commit` runs.** |
| **Autonomous agent** at Magus+ power level                        | May self-commit and self-merge within approved scope (per your power-level policy). Must use proper author/trailers. | Agent is operating independently with delegated authority. **Enforcement: structured spell gate (ARC-023) — `spell-commit-work` Step 4.5's loader-validated execution-authority table gates this: EF-27-resolved power level and `exec_allowed` must both check out before a commit/merge is permitted; missing or invalid authority always downgrades to human execution.**      |
| **Autonomous agent** below Magus                                  | Must commit to topic branch and queue merge for human review.                                                        | Insufficient autonomy level for unsupervised merges to main. **Enforcement: structured spell gate (ARC-023) — the same Step 4.5 execution-authority table: below-Magus may commit to the topic branch when `exec_allowed`, but merge/auto-complete is prohibited and the PR is queued for human completion.**    |

**Interactive session rule applies to ALL interactive tools, regardless of agent identity.** Even a high-power-level agent cannot auto-commit when operating through an interactive editor session — the human is present and must approve.

### Post-Merge Cleanup

After every PR merge or local fast-forward merge, **from the primary checkout, always return to main and prune the branch** (ARC-028 R8 — the worktree procedure is below, and differs). Failing to do this leaves you on a stale branch where new work gets committed to the wrong place or stays unpushed. **Enforcement: structured spell gate (ARC-023) — `spell-commit-work` Step 10 performs this cleanup (worktree-safe) after every push; see Content-Verified Branch Deletion and Same-Vantage-Point Check below for the verified branch/worktree-deletion mechanism this step relies on.**

```bash
# After PR merges on remote — from the primary checkout:
git checkout main
git pull origin main
git branch -d type/old-topic            # delete local branch
git push origin --delete type/old-topic  # delete remote branch (safety net; ignore 'does not exist' errors if already auto-deleted)
```

**If `git branch -d` refuses with `error: the branch '<branch>' is not fully merged`, do not assume the branch is genuinely unmerged and do not reach for `-D` on that reading alone** — this repo's own sanctioned Rebase-and-fast-forward strategy (and any pre-ARC-009 squash merge) rewrites commit SHAs, so a fully-landed branch is permanently invisible to `-d`'s ancestry check. See **Content-Verified Branch Deletion** below for the actual procedure.

**From a linked worktree, do not run the block above** (ARC-028 R8). `git checkout main` fails with
`fatal: 'main' is already used by worktree at <path>` when the primary checkout holds it, and
`git branch -d` fails with `error: cannot delete branch '<branch>' used by worktree at <path>` for
any branch still attached to a worktree — including your own, from inside it. Those are the exact
messages; recognising them is the point, because neither is a malfunction. A worktree session cleans
up like this instead:

```bash
# From the worktree: push and let the PR merge land.
git push origin type/old-topic
# Then, from the PRIMARY checkout (R7 — a worktree cannot remove itself safely):
git worktree remove <path>               # after the same-vantage-point check below
git fetch --prune origin                 # drops the remote-tracking ref
git push origin --delete type/old-topic  # if the platform did not auto-delete
```

Neither failure is an obstacle to work around: Git refusing to double-check-out a branch, and
refusing to delete a worktree-attached one, are the enforcement ARC-028 R3/R7 rely on.

This applies to all actors — humans, interactive tools (Copilot, Claude), and autonomous agents. The `spell-commit-work` and `spell-close-session` prompts enforce this check.

### Content-Verified Branch Deletion (TODO.md merged-branch-cleanup finding)

Ancestry (`git branch --merged`, plain `git branch -d`) is not a reliable "is this landed?" test on this repo. Two of this repo's own sanctioned states defeat it identically: **Rebase-and-fast-forward** (ARC-009 §7) and any **pre-ARC-009 squash merge** both rewrite commit SHAs, so a fully-landed branch stays permanently invisible to `--merged` and refused by `-d` — not a rare edge case; every branch merged the sanctioned way hits this. **Enforcement: structured spell gate (ARC-023) — `spell-commit-work` Step 10 and `spell-close-session`'s branch-deletion step both require running this content-verification procedure (steps 1-6 below) before a branch deletion; `spell-close-session` runs it as an idempotent sweep every session, and `spell-open-session`'s stale-branch check applies the same procedure to its read-only candidate list.** Verify by content instead, for any local branch except `<trunk>` and any branch currently attached to another worktree (`git worktree list`):

1. **Fetch first.** `git fetch <remote> --prune` — a stale local `<trunk>` under-counts and produces a false "unmerged" reading.
2. **Prefer the provider's own record when a PR exists.** `gh pr list --head <branch> --state all` (or `az repos pr list --source-branch <branch> --status all`) — a confirmed `MERGED`/`completed` status is the fastest, most authoritative signal and needs no further check.
3. **Otherwise, check patch-id equivalence:** `git cherry <remote>/<trunk> <branch>`. Every `-`-prefixed line is patch-id-identical to a commit already on `<trunk>` — safe. A `+`-prefixed line means "no identical patch found," not "definitely unmerged": a squash merge, or independent re-authoring of the same change, produces a *different* patch-id for *identical resulting content*. Before concluding a `+` commit is genuinely unmerged, check whether its actual content already exists on `<trunk>` (search for the added text, or diff the specific file). This is not hypothetical — confirmed live 2026-08-31 (BC-03): two docs-only commits on one branch both showed `+` via `git cherry`, and both were byte-identical to content that had already landed on `<trunk>` through separate, differently-authored commits.
4. **Delete with `-D`, never plain `-d`**, only branches with **zero** real unmerged content (confirmed by step 2 or step 3) — `-d` will refuse on a rewritten SHA even when the branch is fully landed, which is the whole reason this section exists. Then `git push <remote> --delete <branch>` (ignore "does not exist" if already auto-deleted).
5. **A branch that fails verification is a finding to surface, not an obstacle.** Report it with a one-line summary of what its unmerged commit(s) actually contain, so a human can decide land vs. abandon. Do not delete it, and do not silently drop it from the report either — in a 2026-08-21 field test, content verification cleared 17 of 18 candidate branches as landed and caught the 1 genuinely unmerged branch a naive `-D` sweep would have destroyed.
6. **Idempotent by construction:** an already-deleted branch is simply absent from the next sweep's candidate list; a branch that failed verification is safely re-checked (and re-reported if still unresolved) on every run rather than being deleted or forgotten.

Apply the Same-Vantage-Point Check below before any deletion if this repository or its linked worktrees might be reached through more than one filesystem view. `spell-close-session` runs this as an idempotent sweep every session; `spell-open-session`'s stale-branch check uses the same procedure for its read-only candidate list.

### Same-Vantage-Point Check (EF-33 / ARC-028 R7)

`git worktree list` can **truthfully** report a live, healthy linked worktree as `prunable` when read through a cross-filesystem bridge — a Linux-side mount of a Windows host, a remote-mounted volume, a container bind-mount, any path-translation layer between the reading process and the repository's actual owning environment. The registered absolute path simply doesn't resolve from that vantage point, even though the directory exists and is valid from the machine that owns it. Nothing in Git's own output distinguishes "confirmed absent" from "not resolvable from this process's filesystem view" — both render identically as `prunable`. (A separate, unconditional hazard applies to `git branch --merged` regardless of vantage point — see the note at the end of this section; do not assume that one only matters when a bridge is in play.)

**Before running any Git command with irreversible effects on worktree, branch, or ref state** — `git worktree prune`, `git worktree remove`, `git gc --prune=now`, `git branch -d`/`-D`, or manual deletion of `.git/worktrees/<name>` metadata — **when the repository or its linked worktrees might be reached through more than one filesystem view**, perform the same-vantage-point check first:

1. Resolve the registered path exactly as Git sees it (`git worktree list --porcelain`'s `worktree` field).
2. **First confirm your OWN vantage point, before trusting anything else.** Checking `Test-Path`/`[ -e "$path" ]`/`os.path.exists()` against the registered path is only meaningful if the process running that check is itself in the same environment that registered the worktree — running the "independent" check from the *same* bridged/mounted process that produced the `git worktree list` read reproduces the exact failure this section exists to prevent, since both signals are corrupted by the identical wrong vantage point. A concrete, checkable signal for this: does the registered path's own syntax match the current process's native OS conventions (drive letter + backslashes for Windows; POSIX root + forward-slashes for Linux/macOS)? A registered path in a **foreign** syntax (e.g. a `C:\...` path seen from a POSIX shell, or vice versa) is itself proof you are not viewing this repository from the environment that registered it — treat every entry as unconfirmed on sight, skip step 3 entirely, and go straight to step 4. Matching syntax alone is not proof of a shared vantage point (two different containers can both use POSIX paths) — it only rules out the specific cross-OS case; it does not establish confidence on its own.
3. Only if step 2 gives you a genuine reason to trust your own vantage point (matching path syntax, plus independent knowledge that this is the same machine/container/session that registered the worktree — not merely "the check ran without error"): confirm the path from the current process's own filesystem (`Test-Path` / `[ -e "$path" ]` / `os.path.exists()` / equivalent). Never treat Git's own `prunable` annotation as sufficient evidence on its own, and never treat "the existence check returned a clean answer" as sufficient either — a clean answer from the wrong vantage point is not a safe answer.
4. If step 2 raised any doubt, if the path syntax doesn't match, or if there is any uncertainty about which environment actually owns the repository, **stop and ask** rather than trusting the more convenient answer. This is the default outcome whenever step 2's confidence isn't genuinely established — not a rare escape hatch reserved for exceptional cases.

This is documented as a standing operational caution, not a code-level gate: EF-33's own intake report frames the underlying defect as cross-machine/cross-mount filesystem visibility, which no single CI runner can reproduce — the confirmation step above must be followed manually by whichever human or agent is about to run the destructive command. Confirmed as a live near-miss on 2026-08-03: a Linux-side read reported eight healthy linked worktrees `prunable`; the same repository read from Windows (their actual owning environment) showed zero prunable entries, and `git worktree prune -v` there removed nothing. **Enforcement: structured spell gate (ARC-023) — `spell-commit-work` Step 10 and `spell-close-session`'s branch-deletion step both require running this check before a worktree-adjacent deletion, matching `agent-policies.md`'s Branch Discipline and Multi-Agent Concurrency Rules sections; the vantage-point determination itself (steps 2-4 above) remains the manual judgment call this paragraph already discloses, not a code-level gate.**

**Unconditional, vantage-point-independent note on branch deletion:** `git branch --merged` can also report a fully-landed branch as unmerged, because Git's rebase-and-fast-forward and squash merge strategies (both sanctioned by this repo's own merge-strategy table above) rewrite commit SHAs, defeating ancestry-based detection. This has nothing to do with filesystem bridges — it fires identically on a single machine with no mount involved. See **Content-Verified Branch Deletion** above for the actual procedure; verify branch content before deleting regardless of what vantage-point confidence steps 1-4 above establish.

### ADO PR Lifecycle — Complete Command Reference

When working in an Azure DevOps repo with branch protection (direct push to `main` rejected), use this exact sequence. Several shortcut tools have known reliability issues on Windows — use the commands below instead.

```powershell
# 1. Push your topic branch
git push origin <branch>

# 2. Create the PR
az repos pr create `
  --repository <repo> `
  --org https://dev.azure.com/<org> `
  --source-branch <branch> `
  --target-branch main `
  --title "type(scope): description" `
  --description "Body..."
# Capture pullRequestId from the JSON output

# 3. Assign reviewer (default to operator identity; idempotent)
# Resolve reviewer (example: git config user.email), then:
az repos pr reviewer list --id <PR_ID> --org https://dev.azure.com/<org>
# If reviewer is missing, add:
az repos pr reviewer add --id <PR_ID> --org https://dev.azure.com/<org> --reviewer "<email>"

# 4. Approve via CLI first (self-approve only when policy allows)
az repos pr set-vote --id <PR_ID> --org https://dev.azure.com/<org> --vote approve
# If policy blocks self-approval, record and require second human approval.

# 5. REST fallback only if CLI vote command fails
$bearer  = az account get-access-token --resource "499b84ac-1321-427f-aa17-267ca6975798" --query accessToken -o tsv
$headers = @{ Authorization = "Bearer $bearer"; "Content-Type" = "application/json" }
Invoke-RestMethod -Method PUT `
  -Uri "https://dev.azure.com/<org>/<project>/_apis/git/repositories/<repo>/pullRequests/<PR_ID>/reviewers/<AAD-id>?api-version=7.1" `
  -Headers $headers -Body '{"vote": 10}'

# 6. Verify vote registered (expect vote: 10 unless policy blocks self-approval)
az repos pr reviewer list --id <PR_ID> --org https://dev.azure.com/<org>

# 7. Complete (merge) the PR with source-branch deletion and squash disabled
# Allowed merge strategies: Merge (no fast forward) or Rebase+fast-forward
az repos pr update --id <PR_ID> --org https://dev.azure.com/<org> --status completed --delete-source-branch true --squash false

# 8. Pull merge commit and clean up — PRIMARY CHECKOUT ONLY (ARC-028 R8).
#    From a linked worktree, `git checkout main` fails first and the rest of
#    this block never runs; see Post-Merge Cleanup for the worktree procedure.
git checkout main
git pull origin main
git branch -d <branch>                    # delete local branch (skip if branch is attached to an active worktree)
git push origin --delete <branch>         # delete remote branch (safety net — --delete-source-branch true usually handles this; ignore 'does not exist' errors)
```

**MCP fail-fast / fallback rule:** one abnormal MCP tool failure — a hang, an idle-timeout abort, a
transport error, or an empty response where data is clearly expected — marks that MCP server **down
for the rest of the session**. Do not retry it blindly. All subsequent operations that would have used
it fall back to the documented CLI (`az repos pr` / `gh` / a direct REST call), and the downgrade is
reported in output so a human sees it happened. The known-issues rows below (`MCP vote_pull_request`,
`MCP create_pull_request`) are concrete instances of this general rule, not special cases of their own.
**Consumer hardening:** set a per-server `"timeout"` (milliseconds) in `.mcp.json` so a hang aborts on a
predictable schedule instead of running to the client's own default idle limit (as long as 30 minutes).
Origin: a real ops session lost roughly an hour to two consecutive 30-minute MCP hangs before the
documented `az` fallback was used (2026-08-14). **Enforcement: explicitly advisory prose (ARC-023) — this fail-fast behavior and the `.mcp.json` timeout hardening both depend on the acting agent actually following them; no check in this repo verifies an agent stopped retrying a downed MCP server or that a given `.mcp.json` entry sets a timeout.**

**Known issues:**

| Issue                                                                          | Symptom                               | Fix                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------- |
| Reviewer already assigned                                                      | `reviewer add` returns already exists | Treat as idempotent success and continue                                        |
| `az repos pr set-vote` succeeds but approval still blocked                     | Policy requires additional approver   | Confirm vote state, then request second human approval                          |
| MCP `vote_pull_request` returns "Success" but vote stays 0                     | `reviewer list` shows `vote: 0`       | Use `Invoke-RestMethod` step 5 above                                            |
| `az rest --body '{"vote":10}'` fails                                           | Shell parsing error on Windows        | Use `Invoke-RestMethod`                                                         |
| `az repos pr update --status completed` fails with policy error                | "Needs 1 approval"                    | Verify `vote: 10` first, then retry                                             |
| MCP `create_pull_request` returns no data                                      | No PR ID/URL in response              | Fall back to `az repos pr create`                                               |
| `gh pr create` not found                                                       | `gh` CLI not installed                | Use `az repos pr create`                                                        |
| `creatorVoteCounts` is false on branch policy                                  | Vote registers but PR still blocked   | A second human must approve via ADO web UI                                      |
| `az repos pr update --status completed` returns `status: active` without error | PR silently not merged                | Add `--squash false` to the command; the flag triggers the merge path correctly |
| `git branch -d <branch>` fails after merge, `error: cannot delete branch ... used by worktree` | Branch is attached to a worktree      | Skip local delete; run remote delete + prune                                    |
| `git branch -d <branch>` fails after merge, `error: ... is not fully merged`   | Rebase/squash rewrote the branch's SHAs — see Content-Verified Branch Deletion above | Verify by content (`git cherry` or PR status), then `-D` only what passes        |
| `git push origin --delete <branch>` fails with missing ref                     | Branch already deleted remotely       | Treat as non-fatal and continue                                                 |

### Branch Lifecycle

- **Short-lived:** hours to a few days, not weeks
- **Delete after merge:** don't let branches pile up — delete local and remote
- **No long-running feature branches:** they create merge hell
- **Stale branch cleanup:** branches older than 7 days or already merged should be pruned
- **Scheduled hygiene:** any scheduled auto-pull job should also run `git fetch --prune` to remove stale remote-tracking branches. Locally merged branches are pruned on the next session or scheduled cycle.
- **Workspace isolation:** agents must never create, switch, or modify branches in a human's primary workspace. All agent work happens in their own isolated clones.

**Enforcement: split (ARC-023) — the "already merged" half of stale-branch cleanup is a structured spell gate: `spell-open-session`'s stale-local-branch check and `spell-close-session`'s idempotent sweep (cited in full under Content-Verified Branch Deletion above) surface and prune merged branches every session. Every other bullet here — short-lived/no-long-running-branches as a target duration, the 7-day age threshold specifically (as distinct from merge status), scheduled-hygiene cron jobs, and workspace isolation between agents and a human's primary workspace — is explicitly advisory prose: no check in this repo measures branch age, verifies a scheduled job ran `git fetch --prune`, or confirms an agent never touched a human's primary workspace.**

---

## Ticket Tagging

If your tracker links commits to work items by ID (Azure Boards, GitHub Issues, Jira, etc.), tag commits so the linkage happens automatically.

**Recommended for Spell Loop PRs:**

- Create or identify a work item **before** starting spell-plan
- Include the work item ID in the PR description and link it before merging
- If your branch policy requires a linked work item, PRs without one will be blocked. **Enforcement: verified external platform policy (ARC-023) when such a policy is configured — the platform itself (Azure Boards / GitHub Issues linking policy) blocks the PR, not any Arcane check; this repo has no such policy configured today.**

**Commit prefix format:**

```
#506 test(api): add xUnit test project
```

- Prefix commits with `#WORKITEM` to enable automatic commit → work item linking
- The orchestrating agent should include the work item ID in the initial spell-plan message and carry it through to ship

**Agent responsibility:** When a Spell Loop run is triggered, the work item ID should be provided upfront. The agent stores it in `stories.json` top-level as `"workItemId"` and includes it in every commit and the PR description. **Enforcement: explicitly advisory prose (ARC-023) — no script validates that a commit or PR description actually includes the stored `workItemId`; confirmed by direct search — no reference to `workItemId` validation exists anywhere in `scripts/` or `src/`.**

---

## PR Standards

All pull requests — whether created by humans or agents — must meet these requirements.

### 🛑 Agent-mandatory pre-PR guard

> **AGENTS: BEFORE running any PR-creation tool (`az repos pr create`, `gh pr create`, the `create_pull_request` MCP tool, or any equivalent), you MUST run `git fetch origin && git rebase origin/<target-branch>` and resolve any conflicts. This is not optional. Skipping this step is a governance violation. Enforcement: structured spell gate (ARC-023) — `spell-create-pull-request` Step 0's mandatory rebase guard (its Step 0.6) and `spell-commit-work` Step 9b both require this fetch/rebase sequence before any PR-creation call — backed by an executable check: `.github/workflows/ci.yml`'s `rebase-check` job ("PR branch is rebased on target") independently re-verifies `origin/<base>` is an ancestor of HEAD via `git merge-base --is-ancestor` on every PR, and this repo's own live GitHub ruleset ("protect main") lists that exact check in `required_status_checks` with `current_user_can_bypass: "never"` — an unrebased PR cannot merge even if the spell-level guard were skipped.**

This rule applies **every single time**, regardless of:

- Which tool or CLI is used to open the PR (spell, raw `az`/`gh`, MCP tool, REST call, web UI-triggered automation).
- Whether the branch was recently created off `main` or has been open for hours.
- Whether the agent "thinks" no conflicts are likely — assumptions do not substitute for a rebase.

**Correct sequence for every agent-initiated PR:**

```bash
git fetch origin
git rebase origin/<target-branch>     # resolve conflicts locally, never push a conflicted branch
git push --force-with-lease            # only if the branch existed remotely before the rebase
# ...only THEN run the PR-creation tool of your choice
```

If a rebase produces conflicts the agent cannot confidently resolve, **STOP** and hand off to the human — do **not** open the PR and hope reviewers will sort it out. Pushing a branch that will produce a merge conflict on the target is a governance violation and wastes reviewer time.

The `spell-create-pull-request` spell encodes this check in Step 0, but the guard is on **the agent**, not on the spell. Bypassing the spell (by calling `az repos pr create` / `gh pr create` directly) does **not** bypass this rule.

See also: [Agent Workflow — Sync with main before opening a PR](#agent-workflow) below.

### PR Requirements

| Requirement        | Details                                                                                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Work item link** | Optional. Linking is encouraged for traceability but enforce it only if your branch policy requires it. **Enforcement: explicitly advisory prose (ARC-023) — this repo has no branch policy requiring a work-item link, and no Arcane check verifies one exists even where a policy would require it.** |
| **Title format**   | Conventional Commits format: `type(scope): description` **Enforcement: explicitly advisory prose (ARC-023) — `spell-create-pull-request` Step 3 generates a title in this shape by default, but nothing rejects a PR opened without one.** |
| **Description**    | Must include: summary of changes, rationale, verification steps, and a linked work item ID if applicable. **Enforcement: explicitly advisory prose (ARC-023) — `spell-create-pull-request` Step 4 generates a description in this shape by default, but nothing rejects a PR opened without one — the same reasoning `agent-policies.md`'s PR Creation Requirements section applies to the identical claim.** |
| **Pre-PR sync**    | **Mandatory rebase on latest `origin/<target>` before pushing.** See [🛑 Agent-mandatory pre-PR guard](#-agent-mandatory-pre-pr-guard) above — this applies even when opening PRs via raw `az repos pr create` / `gh pr create` / MCP tools. **Enforcement: same structured-spell-gate-plus-executable-check cited in the guard above.** |
| **Branch cleanup** | After merge, delete the source branch (local and remote). **Enforcement: structured spell gate (ARC-023) — the same `spell-commit-work` Step 10 / `spell-close-session` branch-deletion mechanism cited under Content-Verified Branch Deletion above.** |
| **PR link format** | All PR references in agent output **must** be clickable markdown links to the PR, not a bare `PR #NNN`. **Enforcement: explicitly advisory prose (ARC-023) — no check validates that agent-generated chat/PR output actually used a clickable link instead of a bare `PR #NNN`.** |
| **Doc-ID link format** | The same rule extends to `ADR-NNN`/`ARC-NNN`/`EF-NN`/journal entries/named governance docs — never a bare ID. See `.github/instructions/agent-output.instructions.md` → Doc-ID Link Format for the full rule and required formats per context. **Enforcement: explicitly advisory prose (ARC-023) — `agent-output.instructions.md` is itself instruction text with no validating check; the adjacent `scripts/org-token-lint.ts` check enforces a different, unrelated property (no hardcoded org/repo names in shipped prompts), not link-format compliance.** |

### Agent PR Workflow

1. **Create a work item** (if one doesn't exist) using `spell-suggest-feature` or `spell-bug`.
2. **Open PR** with proper title, description, and work-item link.
3. **Notify the human** through your configured channel with a clickable link, not a bare number:
   `[PR #{number} — {title}]({url}) — {repo} (#{workItemId})`.
4. **Address review feedback** if a reviewer requests changes.
5. **After merge**, delete the branch (local + remote) and confirm cleanup.

### PR Hygiene

- `spell-open-session` checks for open PRs across all repos and reports them. **Enforcement: structured spell gate (ARC-023) — `spell-open-session`'s "Open PRs" step lists open PRs and flags them stale/overdue at these exact thresholds, though only when tracking mode is external/ADO and ADO MCP is available — it is not universal across every provider/session, matching `agent-policies.md`'s PR Hygiene Cadence annotation for the identical rule.**
- PRs open >3 days are flagged as **stale** — the human is prompted to review or close. **Enforcement: same `spell-open-session` step cited above.**
- PRs open >7 days without activity are flagged for **closure** — the human decides. **Enforcement: same `spell-open-session` step cited above.**
- Abandoned PRs should be closed with a comment explaining why (e.g., "superseded by #{newPR}", "scope changed"). **Enforcement: explicitly advisory prose (ARC-023) — no check verifies an abandoned PR was actually closed with an explanatory comment.**

---

## Agent Attribution Model

Every commit must clearly identify **who produced the content** and **who approved/pushed it**.

### Author vs. Committer

| Field                      | Represents                       | Examples                                                             |
| -------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| **Author** (`--author`)    | Entity that produced the content | `{AGENT_NAME} <{AGENT_EMAIL}>`, `{OPERATOR_NAME} <{OPERATOR_EMAIL}>` |
| **Committer** (Git config) | Human who approved and pushed    | Always the operator: `{OPERATOR_NAME} <{OPERATOR_EMAIL}>`            |

- If **you** wrote the content: don't override author. Your global Git config is used.
- If an **agent** produced the content: use `--author` to set the agent's identity.
- If an **interactive AI tool** (Copilot, Claude in VS Code) produced the content: use the tool-level identity.
- If the content is an **Arcane vendored scaffold or managed update**: do not invent a vendor email identity and do not use an agent author. Keep the operator's Git identity and record package provenance with `Vendor: arcane-cli` plus a programmatically derived `Vendor-Version` when available. Split mixed vendor/operator changes first. **Enforcement: structured spell gate (ARC-023) — `spell-commit-work` Step 3 requires determining authorship before commit and explicitly instructs "when authorship is unknown or disputed, stop and ask"; that gate only fires when authorship is flagged as disputed, so a confidently wrong identity choice that is never flagged as disputed is not independently caught.**

### Agent Email Convention

Give every agent/tool a stable email under a domain you control. Most hosts treat author email as metadata only — authentication uses the push credential (SSH key / PAT), not the author email.

**Format:** `[Persona Name] <[lowercase-persona]@{OPERATOR_DOMAIN}>`

Maintain a registry of the identities you use, for example:

| Identity        | Email                         | Type             | Role                       |
| --------------- | ----------------------------- | ---------------- | -------------------------- |
| {OPERATOR_NAME} | `{OPERATOR_EMAIL}`            | Human (owner)    | —                          |
| {AGENT_NAME}    | `{AGENT_EMAIL}`               | Autonomous agent | Product Operations Manager |
| Merlin          | `merlin@{OPERATOR_DOMAIN}`    | Autonomous agent | CTO / Architecture Lead    |
| Lafayette       | `lafayette@{OPERATOR_DOMAIN}` | Autonomous agent | Full-Stack Developer       |
| Copilot         | `copilot@{OPERATOR_DOMAIN}`   | GitHub Copilot   | Tool                       |
| Claude          | `claude@{OPERATOR_DOMAIN}`    | Claude Code      | Tool                       |

New agents are registered during onboarding.

### Required Commit Trailers (Agent Commits)

Agent-authored commits MUST include trailers in the commit message footer. Human commits MAY include them. **Enforcement: explicitly advisory prose (ARC-023) — `spell-commit-work`'s Step 7 documents the required trailers, but no hook or CI check verifies they are actually present on a given commit, matching `universal-agent-rules.md` rule 12's identical finding for the same underlying rule.**

**`Agent` is the runtime/tool only — never a persona name.** The prior single-field model let `kellar` (a persona) and `copilot`/`claude` (runtimes) sit in the same field's example list, which is exactly the conflation this split removes. `Persona` and `Role` are conditional on a roster (`.arcane/agents.yaml`) existing and one having been assigned — omit both, do not guess, when no roster exists or none was assigned this session (this repo's own root has no roster today; the "Solo-Operator Delegation Records (No Roster)" pattern in [[agent-policies#solo-operator-delegation-records-no-roster|agent-policies.md]] is the same "mechanism doesn't apply, degrade gracefully" shape applied to delegation instead of attribution).

| Trailer        | Required    | Example                               | Notes |
| -------------- | ----------- | -------------------------------------- | ----- |
| `Agent`        | Yes         | `claude`, `copilot`, `codex`          | The runtime that executed — always resolvable from the tool itself. |
| `Persona`      | Conditional | `kellar`, `merlin`                    | The roster identity operated as. Present only when a roster exists and one was assigned; omit entirely otherwise — never guess. |
| `Role`         | Conditional | `CTO / Architecture Lead`             | Derived **only** from `Persona`'s roster entry (`AgentDefinition.role`, reached via the roster entry's `definition` pointer — see `agent-loader.ts`), never typed by hand. Present only when `Persona` is present; a `Role` value not sourced from the actual roster file is a defect, not a stylistic choice — see the grading-probe example below. |
| `Model`        | Yes         | `claude-opus-4-20250918`, `gpt-4o`    | Self-reported by the runtime. |
| `Model-Source` | Yes         | `self-reported`                       | Marks that `Model` (and `Agent`) is self-reported, not independently verified — currently the only defined value. Exists because a fabricated `Model`/author trailer once survived eight PRs and human review undetected; the field makes that limitation visible instead of silently trusted. |
| `Provider`     | Yes         | `anthropic`, `openai`                 | |
| `Task-Type`    | Optional    | `docs`, `code`, `review`, `marketing`  | |
| `Approval`     | Optional    | `interactive`, `batch`, `post-review`  | |
| `Channel`      | Optional    | `chat`, `cli`, `editor`                | |
| `Risk-Class`   | Optional    | `low`, `medium`, `high`                | |
| `Request-ID`   | Optional    | `req-001`                              | |
| `Session`      | Optional    | `session-01`                           | |
| `Rollback-Ref` | Optional    | path or commit to the pre-change state | |

**Grading probe for whether a session actually inherited this rule** (not a hypothetical — this exact question surfaced a real gap before this split existed): *"What does `Role: developer` in a commit trailer resolve from?"* The wrong answer is "the agent roster" stated with confidence. The correct behavior is to check — read `.arcane/agents.yaml` if it exists, resolve the acting persona's `AgentDefinition.role` — and if no roster exists or the value can't be traced to a real entry, omit the `Role` trailer rather than typing a plausible-sounding guess.

### Vendored Framework Trailers

Vendored scaffold/update commits use these provenance trailers instead of an invented Arcane author identity:

| Trailer          | Requirement | Value                                                                                                         |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `Vendor`         | Required    | `arcane-cli`                                                                                                  |
| `Vendor-Version` | Conditional | Output of `arcane --version` / `spell --version`, whose value is read from the installed CLI's `package.json` |

Never type or infer `Vendor-Version`. If the installed CLI cannot be resolved programmatically, omit the version trailer and disclose incomplete provenance rather than guessing. **Enforcement: explicitly advisory prose (ARC-023) — the same absence of a hook/CI check noted under Required Commit Trailers above applies here: nothing verifies `Vendor`/`Vendor-Version` presence or correctness on a given commit.**

### Complete Examples

**Agent-authored commit, with an assigned roster persona ({AGENT_NAME}):**

```bash
git commit --author="{AGENT_NAME} <{AGENT_EMAIL}>" \
  --trailer="Agent=claude" \
  --trailer="Persona=kellar" \
  --trailer="Role=Product Operations Manager" \
  --trailer="Model=<model-id>" \
  --trailer="Model-Source=self-reported" \
  --trailer="Provider=<provider>" \
  --trailer="Channel=chat" \
  -m "feat(inventory): generate initial product catalog

Created 47 SKUs from the inventory spreadsheet."
```

**Agent-authored commit, no roster installed (this repo's own current state):**

```bash
git commit --author="{AGENT_NAME} <{AGENT_EMAIL}>" \
  --trailer="Agent=claude" \
  --trailer="Model=<model-id>" \
  --trailer="Model-Source=self-reported" \
  --trailer="Provider=<provider>" \
  --trailer="Channel=chat" \
  -m "feat(inventory): generate initial product catalog

Created 47 SKUs from the inventory spreadsheet."
```

**Copilot-assisted commit (Copilot in editor):**

```bash
git commit --author="Copilot <copilot@{OPERATOR_DOMAIN}>" \
  --trailer="Agent=copilot" \
  --trailer="Model=<model-id>" \
  --trailer="Model-Source=self-reported" \
  --trailer="Provider=<provider>" \
  --trailer="Channel=editor" \
  -m "docs(governance): add attribution model to git conventions"
```

**Human-authored commit (no overrides):**

```bash
git commit -m "docs(decisions): add ADR-028 agent attribution model"
```

### Querying Attribution

```bash
# All commits by {AGENT_NAME}
git log --author="{AGENT_NAME}" --oneline

# All commits by any agent (non-human)
git log --author="@{OPERATOR_DOMAIN}" --oneline

# All human-only commits
git log --author="{OPERATOR_EMAIL}" --oneline

# Extract trailers
git log -10 --format='%H %s%n%(trailers:key=Agent,key=Persona,key=Model,key=Provider)%n'

# Count commits per runtime/tool (Agent) -- coarse, always populated
git log --all --format='%(trailers:key=Agent,valueonly)' | sort | uniq -c | sort -rn

# Count commits per persona -- the finer-grained count the old single-Agent-field
# query used to produce; empty where no roster was ever assigned
git log --all --format='%(trailers:key=Persona,valueonly)' | sort | uniq -c | sort -rn
```

---

## Tools to Help

### Automated Commit Generation

Use `spell-commit-work` prompt during sessions:

1. Type `@spell-commit-work` in chat
2. Prompt analyzes `git status` and conversation context
3. Generates Conventional Commits message
4. Shows for approval
5. Executes `git add -A && git commit` if approved

### Manual Commit Template

If committing manually, use this mental checklist:

```
[ ] Type correct? (feat, fix, docs, chore, refactor, etc.)
[ ] Scope correct? (prompts, agents, security, etc.)
[ ] Imperative mood? ("add" not "added")
[ ] Lowercase start, no period?
[ ] Under 72 chars?
[ ] Body needed for context?
```

### Validating Format

Quick regex to check format (optional — not enforced by hooks): **Enforcement: explicitly advisory prose (ARC-023) — confirmed: no `commitlint` (or equivalent) dependency exists in `package.json`, and no `.husky/commit-msg` hook exists; `.husky/pre-commit` runs only `npm run lint && npm run typecheck`, and `.husky/pre-push` runs only `npm test` plus a PR-state check — neither validates commit message format.**

```bash
# Valid: type(scope): description
^(feat|fix|docs|refactor|chore|test|perf|ci|style|revert)(\([a-z-]+\))?:\s.{1,72}$
```

---

## Examples from This Repo

**Feature addition:**

```
feat(prompts): add spell-commit-work for checkpointing

Enables mid-session commits without waiting for spell-close-session.
Generates Conventional Commits messages with approval workflow.
```

**Documentation update:**

```
docs(decisions): add table of contents to DECISIONS.md
```

**Bug fix:**

```
fix(auth): restore token SecretRef after onboarding

Onboarding wizard overwrote auth config with a plaintext token.
Restored the SecretRef and restarted the service.
```

**Refactor:**

```
refactor(prompts): rename to spell- prefix

- continue-arcane.prompt.md → spell-open-session.prompt.md
- session-close.prompt.md → spell-close-session.prompt.md
- doc-drift-check.prompt.md → spell-check-drift.prompt.md
- new-business-bootstrap.prompt.md → spell-bootstrap-business.prompt.md

Implements ADR-019 spell- naming convention.
```

**Chore:**

```
chore(repo): add root .gitignore

Excludes .env, *.log, node_modules/, .obsidian/, OS artifacts.
```

---

## What NOT to Commit

Enforced by root `.gitignore`: **Enforcement: executable check (ARC-023), partial — git's own ignore engine deterministically excludes any committed path matching a `.gitignore` pattern (absent a forced `git add -f`), a real code-level mechanism, not judgment-dependent prose. The root `.gitignore` currently contains `node_modules/`, `dist/`, `coverage/`, `.obsidian/`, `*.tsbuildinfo`, `*.log`, `.DS_Store`, and `**/.DS_Store` — fully covering the Logs and Obsidian-vault bullets below, and partially covering Dependencies/Build-artifacts/OS-artifacts (`vendor/`, `build/`, `*.pyc`, `Thumbs.db`, and `desktop.ini` are absent). Secrets (`.env`, `*.pem`, `*.key`) and Editor state (`.vscode/settings.json`, `.idea/`) have no matching pattern at all — those two bullets are currently unenforced despite this heading's blanket claim.**

- Secrets (`.env`, `*.pem`, `*.key`)
- Logs (`*.log`)
- Dependencies (`node_modules/`, `vendor/`)
- Build artifacts (`dist/`, `build/`, `*.pyc`)
- OS artifacts (`.DS_Store`, `Thumbs.db`, `desktop.ini`)
- Editor state (`.vscode/settings.json`, `.idea/`)
- Obsidian vault state (`.obsidian/`)

See [.gitignore](../.gitignore) for full list.

---

## When to Commit

**During active work (use `spell-commit-work`):**

- Completed a discrete task (added ADR, renamed files, fixed bug)
- About to switch context to a different task
- Reached a checkpoint before taking a break

**At session close (use `spell-close-session`):**

- Generated journal entry, updated TODO.md
- Finalized session documentation
- Ready to hand off or resume later

**Commit early, commit often.** Small commits with clear messages are easier to review, revert, and understand than giant "end of day" dumps. **Enforcement: explicitly advisory prose (ARC-023) — cadence and timing are judgment calls; no check measures commit frequency or size, and nothing in this repo prevents a large end-of-day commit.**

---

## Troubleshooting Notes

### Git command unavailable in interactive PowerShell terminal

**Symptom:** Running `git` returns "The term 'git' is not recognized" even though recent command output still includes Git diff content.

**Cause:** Terminal PATH resolution can differ between integrated shell contexts, especially when commands are piped or executed in chained command blocks.

**Fix:** Use the explicit executable path:

```powershell
& "C:\Program Files\Git\cmd\git.exe" <subcommand>
```

**Verify:** Run:

```powershell
& "C:\Program Files\Git\cmd\git.exe" --version
& "C:\Program Files\Git\cmd\git.exe" status --short
```

Both commands should return successfully.

**Prevention:** Prefer explicit git path in scripted close-session and commit workflows when shell behavior is inconsistent.
