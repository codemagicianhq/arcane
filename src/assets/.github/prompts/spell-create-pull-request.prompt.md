---
name: Spell — Create Pull Request
description: Open a pull request for the current branch with an auto-generated title and description from commit history. Provider-agnostic (GitHub or Azure DevOps).
argument-hint: '[--draft] [--reviewers <name,...>] [--target <branch>] [--docs-only]'
agent: agent
last_updated: 2026-07-05
---

## Executive Summary

- This spell creates a pull request for the current feature branch — no manual title/description writing.
- It auto-generates a Conventional-Commits title and a structured description from the commit log.
- It is provider-agnostic: it detects GitHub vs Azure DevOps from the git remote and uses the right CLI.
- The PR is the only path to `main` (direct pushes are blocked by policy). See `.arcane/governance/git-conventions.md`.

---

Create a pull request for the current branch.

Context to consult:

- `.arcane/governance/git-conventions.md` — PR requirements, branch policy, merge strategy (the no-squash rule).
- `.arcane/governance/testing-standards.md` — coverage thresholds to cite in the description.

Related spells:

- `spell-commit-work` — land your work as Conventional-Commits commits before opening the PR.
- `spell-ship` — the broader release flow that records the PR URL after this spell creates it.
- `spell-address-review` — resolve reviewer feedback once the PR is open.
- `spell-sync-pull-request` — the recovery path when Step 0.6's rebase guard hits a conflict.

## Arguments

- `--draft` — create the PR as a draft (work-in-progress / early feedback).
- `--reviewers <name,...>` — comma-separated reviewers. Optional.
- `--target <branch>` — target branch (default `main`).
- `--docs-only` — lightweight mode for documentation-only changes: prefixes `[docs]` in the title and skips test-evidence/review sections. It does not bypass merge authorization.

## Authorization Gate

Before enabling auto-complete/auto-merge or completing an existing PR, resolve `interaction_context`, effective power level, and `exec_allowed` through the EF-27 loader-validated roster/definition. Missing or invalid authority visibly downgrades to PR creation only. Print the invalid/missing input and state that human completion is required.

- Below Magus: create the PR and stop; never request auto-complete or invoke merge.
- Autonomous Magus+: auto-complete/self-merge is allowed within approved scope when `exec_allowed` is true.
- Interactive Magus+: require separate authenticated operator approval bound to the exact PR ID and head SHA. Commit approval is not merge approval.
- Re-check authority, PR ID, and head SHA immediately before completion; any change invalidates approval.

## Step 0 — Guard checks

> **🛑 AGENT-MANDATORY PRE-PR CHECKLIST — READ FIRST.** Before *any* PR-creation call (this spell, raw `az repos pr create`, raw `gh pr create`, the `create_pull_request` MCP tool, REST, web hook, or anything else):
>
> 1. `git fetch origin`
> 2. `git rebase origin/<target-branch>` (default `main`) and resolve conflicts locally
> 3. `git push --force-with-lease` if the branch was already on origin
> 4. *Then* run the PR-creation call
>
> This rule is on the **agent**, not on the spell. Calling `az repos pr create` / `gh pr create` directly is **not** an escape hatch — it is a governance violation. See `.arcane/governance/git-conventions.md` → **🛑 Agent-mandatory pre-PR guard**.

1. Run `git branch --show-current`. **STOP** if on `main`/`master` — you cannot PR the integration branch into itself. Also **STOP** if detached HEAD (empty output) — check out a named branch first.
2. **Verify the target exists:** `git rev-parse --verify origin/<target>`. If it fails, `git fetch origin <target>`; if still missing, **STOP** and ask the user for the correct `--target`.
3. **Ensure the branch is on origin (upstream):** if `git rev-parse --abbrev-ref --symbolic-full-name @{u}` fails, the branch was never pushed — run `git push -u origin <branch>`. The provider CLIs can only open a PR for a branch that exists on the remote.
4. **STOP** if the branch has no commits ahead of the target: `git log origin/<target>..HEAD --oneline` is empty → nothing to PR.
5. Check for an existing **open** PR for this branch (provider-specific, Step 2). If one exists, print its URL and stop — never create duplicates.
6. **Mandatory rebase on target (governance guard):** `git fetch origin` then `git rebase origin/<target>`. On clean rebase, `git push --force-with-lease` (only if the branch existed remotely before the rebase). On conflicts: **STOP**, list conflicting files, ask the user to resolve **or run `spell-sync-pull-request`** — it draws the same mechanical-vs-ambiguous conflict line this guard doesn't attempt to, with a recoverable ref before it touches anything; never push a branch that will produce a merge conflict on the target (see git-conventions "🛑 Agent-mandatory pre-PR guard"). This step is not optional and is not skippable by calling a different PR-creation tool.
7. **Auto-suggest `--docs-only`** (only if not already passed): if every changed file vs target is documentation/session files (`*.md`, `TODO.md`, `DECISIONS.md`, `journal/**`, `IDEAS.md`, `FEEDBACK.md`), print a one-line hint suggesting `--docs-only` and proceed with the standard path.

## Step 1 — Gather context

```bash
git branch --show-current
git log origin/<target>..HEAD --format="%h %s" --reverse   # commit list
git diff origin/<target>..HEAD --stat | tail -1            # files / insertions / deletions
git remote get-url origin                                  # provider detection
```

## Step 2 — Detect provider

| Remote URL contains | Provider |
| --- | --- |
| `github.com` | GitHub (`gh`) |
| `dev.azure.com` / `visualstudio.com` | Azure DevOps (`az repos`) |
| anything else | unknown — **STOP** and ask the user which provider/CLI to use |

If the detected provider's CLI is missing or unauthenticated (`gh auth status` / `az account show` fails), **STOP** with a clear message — do not silently fall back to the other provider.

Check for an existing **open** PR before creating (filter by state so a previously merged/closed PR for the same branch does not falsely block):

- **GitHub:** `gh pr list --head <branch> --base <target> --state open --json url --jq '.[0].url'`
- **Azure DevOps:** `az repos pr list --source-branch <branch> --target-branch <target> --status active --output json`

If an open PR is found, print its URL and stop.

## Step 3 — Build the title

Format: `type(scope): summary`

1. `type` = the majority commit type in the log (e.g. `feat`, `fix`, `chore`).
2. `scope` = optional; derive from the dominant changed area if obvious, else omit the parens.
3. `summary` = a concise one-line synthesis of the commits (≤ 72 chars per git-conventions), lowercase, imperative, no trailing period.
4. With `--docs-only`, prepend `[docs] `.

## Step 4 — Build the description

Write the body to a **temp file** and pass it to the provider CLI by file reference — never pass multiline content as a shell argument (this avoids shell/PowerShell truncation, quoting, and newline-mangling). Resolve the scratch path with `git rev-parse --git-dir` (handles worktrees and non-default `.git` locations) and write to `<git-dir>/arcane-pr-body.md`. The `.git` directory is never committed, so the body file is safe and ignored. Delete it after a successful create (Step 6).

Standard template:

```markdown
## Summary

<1–3 sentences synthesized from the commits — not copied verbatim.>

## Changes

### Features
- <feat summaries>
### Fixes
- <fix summaries>
### Infrastructure / Chores
- <chore/docs/ci/refactor summaries>

> Omit empty sections.

## Testing

- <coverage / test status if known, else "See CI pipeline results.">
```

`--docs-only` template (skip Testing):

```markdown
## Summary
<1–2 sentences on the doc changes.>

## Changes
- <changed files or sections>

## Notes
Documentation-only PR. No functional code changed.
```

## Step 5 — Create the PR

- **GitHub:**
  ```bash
  gh pr create --title "<title>" --body-file <temp> --base <target> --head <branch> [--draft] [--reviewer <r1,r2>]
  ```
  With `--docs-only`, `gh pr merge --auto <PR#>` is permitted only after the authorization gate above passes (use the repo's configured merge method; do **not** force squash — see git-conventions).
- **Azure DevOps:**
  ```bash
  az repos pr create --title "<title>" --description "@<temp>" --source-branch <branch> --target-branch <target> [--draft] [--reviewers "<r1> <r2>"]
  ```
  With `--docs-only`, add `--auto-complete` only after the authorization gate above passes. Respect the repo merge strategy — never enable squash (see git-conventions).

**Reviewers:** pass `--reviewers`/`--reviewer` values through as given. If a reviewer cannot be resolved by the provider, do **not** abort the create — let the PR be created and surface the unresolved name(s) in the Step 6 report so the user can add them manually.

**Post-create verification (both providers):** read the PR back (`gh pr view <PR#> --json url,title,body` / `az repos pr show --id <PR#>`). If the title or description is empty or does not match the temp file, patch it (`gh pr edit` / `az repos pr update`) from the temp file, then re-verify once. This guards against silent body truncation/drop on either CLI.

## Step 6 — Report

```
✓ PR created: <URL>
  Title:     <title>
  PR #:      <number>
  Source → Target: <branch> → <target>
  Reviewers: <list or "none assigned">
```

- If no reviewers were resolved (none passed, or names the provider could not match): `⚠ No reviewers assigned — add them in the PR or re-run with --reviewers`.
- If `--draft`: note it was created as a draft.
- Delete the body temp file (`<git-dir>/arcane-pr-body.md`) once the PR is confirmed created and verified.
- **Branch topology** — per the generated state diagrams convention (rule 8, ARC-036), built only from
  Step 1's already-gathered branch name and commit list (`git log origin/<target>..HEAD --format="%h %s" --reverse`).
  Skip entirely (the applicability guard) if that commit list is empty — Step 0.4 already stops before
  reaching here in that case, so this only re-states the same guard for anyone reading this step in
  isolation:

  ```mermaid
  gitGraph
     commit id: "<target HEAD short-sha>"
     branch <branch-name>
     commit id: "<short-sha 1>"
     commit id: "<short-sha 2>"
  ```

  Same shape `spell-commit-work` uses for the identical concept — reference it rather than re-deriving
  the rule (D8): one commit per gathered log entry, target's short SHA as the fork point.

## Rules

- Never create duplicate PRs — always check first (Step 2).
- Never push directly to `main` — the PR is the only path.
- Always write the description to a file before passing it to the provider CLI.
- Respect the repo merge strategy in `.arcane/governance/git-conventions.md` — **do not squash** (it breaks per-commit attribution).
- Print the PR URL clearly so it can be recorded by `spell-ship` / `spell-close-session`.
- Never include secrets or tokens in the title or description.
