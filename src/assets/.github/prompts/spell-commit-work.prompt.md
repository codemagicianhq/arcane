---
name: Spell — Commit Work
description: Generate Conventional Commits message with agent attribution and commit current work during an active session
argument-hint: Optional focus (e.g., security, prompts, agents, infrastructure)
agent: agent
last_updated: 2026-07-05
---

## Executive Summary

- This prompt commits work-in-progress during an active session before moving to the next task.
- It generates Conventional Commits format messages with proper type, scope, and agent attribution trailers.
- Use this when you've completed a discrete chunk of work and want to checkpoint before continuing.
- Enables clean commits without waiting for session-close (which handles journal/session docs separately).

---

Commit the current work in progress using Conventional Commits format.

Use these files first:

- [governance/git-conventions.md](../../governance/git-conventions.md) — Conventional Commits reference and agent attribution model
- [DECISIONS.md](../../DECISIONS.md) — for ADR context if relevant

Workflow:

1. **Check git status and guard the branch** — run `git status` to see what changed, and confirm the current branch.
   - **Protected-branch guard:** if the current branch is `main` or `master`, **STOP — do not stage or commit directly.** Tell the user that committing straight to the integration branch is not allowed, and instruct them to create a topic branch first (e.g., `sessions/YYYY-MM-DD-<slug>` per the session model). Once on a valid topic branch, continue the workflow normally (commit immediately as usual).

2. **Run tests and verify coverage** _(skip only if zero source files changed — e.g., pure docs/config commit)_:
   - Detect the project stack from the root of the changed repo:
     - `package.json` present → `npm run test:coverage` (or `npm test` if no `test:coverage` script exists)
     - `*.csproj` / `*.sln` present → `dotnet test --collect:"Code Coverage"`
     - `pubspec.yaml` present → `flutter test --coverage`
   - **HALT if tests fail or coverage thresholds are not met.** Do not proceed to commit. Report the exact failure output and instruct the operator to fix it first (run the failing tests, add missing coverage, or document an intentional threshold exception with a code comment and a note in the commit body).
   - If coverage passes, record the coverage summary for use in the commit body or PR description.
   - **Never commit code that fails CI locally.** The pipeline is not the first gate — this step is.

   - **Format before committing** _(stack-aware; runs alongside the test gate above)_:
     - Detect the configured formatter from the project's own config — do not assume one. Look for the toolchain's standard markers, for example:
       - JS/TS: `.prettierrc*` / `prettier` in `package.json` → `npx prettier --write .`
       - .NET: `*.csproj` / `*.sln` (optionally an `.editorconfig`) → `dotnet format`
       - Python: `pyproject.toml` / `setup.cfg` declaring Black or Ruff → `black .` or `ruff format .`
       - Go: any `*.go` files → `gofmt -w .` (or `go fmt ./...`)
     - Run the detected formatter, then `git add` the resulting changes so they are part of this commit.
     - **If no formatter is configured, skip this step gracefully** — do not install one and do not block the commit.

3. **Analyze changes** — categorize the work:
   - What was the intent? (new feature, bug fix, docs, refactor, etc.)
   - What scope/area was affected? (prompts, agents, security, infrastructure, journal, etc.)
   - Is this part of a larger initiative or a standalone change?
   - **Commit-splitting heuristic:** if the staged changes span clearly unrelated concerns (e.g., a feature change + an unrelated refactor + a dependency bump), recommend splitting them into multiple focused commits, each with its own message, rather than a single mixed commit. A single commit is fine when the changes serve one purpose. When splitting, stage and commit each concern separately.
   - **Wiki-link check:** For any new `.md` files being committed, verify each has at least one outbound `[[...]]` wiki-link connecting it to the knowledge graph. Orphaned docs (no outbound links) break Obsidian's graph view. If missing, add a `Related:` or `See also:` line before committing. See the CLAUDE.md wiki-link conventions for the correct format.

4. **Determine authorship** — who produced this content? See [governance/git-conventions.md](../../governance/git-conventions.md) Agent Attribution Model section and ADR-028.
   - **Human wrote it:** no `--author` override needed (uses global Git config)
   - **AI agent/tool produced it:** use `--author` with the agent's registered identity:
     - Roster agent: `--author="{AGENT_NAME} <{AGENT_EMAIL}>"` — resolve `{AGENT_NAME}` / `{AGENT_EMAIL}` from the active agent config (see [[agent-policies]] / [[naming-conventions]]); ask if unset.
     - Generic CLI/IDE tool: `--author="{TOOL_NAME} <{TOOL_NAME_LOWER}@{OPERATOR_DOMAIN}>"` — resolve `{TOOL_NAME}` from the channel in use and `{OPERATOR_DOMAIN}` from `.arcane.json`; ask if unset.
   - When in doubt, ask the user who produced the content.

5. **Determine commit type** using Conventional Commits standard:
   - `feat` — new feature or capability
   - `fix` — bug fix
   - `docs` — documentation only changes
   - `refactor` — code/structure changes without behavior change
   - `chore` — maintenance, deps, tooling, cleanup
   - `test` — adding or fixing tests
   - `perf` — performance improvements
   - `ci` — CI/CD pipeline changes

6. **Determine scope** — what part of the repo changed:
   - `prompts` — .github/prompts/ files
   - `agents` — agents/ directory or config
   - `security` — security/ directory, hardening, threat model
   - `infrastructure` — infrastructure/ directory, hardware, OS setup
   - `decisions` — DECISIONS.md updates
   - `journal` — journal/ entries
   - `business` — ventures/ directory
   - `playbooks` — playbooks/ directory
   - `governance` — governance/ directory
   - Multiple scopes? Pick the primary one or use a broader scope like `docs` or `repo`.

7. **Generate commit message with trailers** (ADR-029). For agent-authored commits, include required trailers. Format:

   ```
   type(scope): short description (72 chars max)

   [Optional body with details if needed:
   - Bullet list of key changes
   - References to ADRs or files
   - Context for why]

   Agent: [lowercase-persona or tool name]
   Model: [model identifier, e.g., claude-opus-4-20250918]
   Provider: [anthropic or openai]
   Role: [agent role slug, if applicable]
   Task-Type: [docs, code, review, marketing, infra]
   Channel: [vscode, cli, chat]
   ```

   **Rules:**
   - Short description: imperative mood ("add", "fix", "update"), lowercase, no period
   - Keep first line under 72 characters for git log readability
   - Body is optional but useful for complex changes
   - Reference ADRs if applicable (e.g., "Implements ADR-028")
   - Trailers go after a blank line following the body (standard Git footer position)
   - Required trailers for agent commits: `Agent`, `Model`, `Provider`
   - Human-authored commits: trailers are optional

8. **Execute commit immediately** once message and attribution are determined:
   - Run `git add -A` (or selective `git add` if user specifies files)
   - Run `git commit --author="..." --trailer="..." -m "message"` with all flags
   - Confirm success and show the resulting commit hash

9. **Push branch and run platform-specific PR flow:**

   a. Run `git push origin <branch>`.

   b. **🛑 Mandatory pre-PR rebase (governance guard, applies to every path below).** Before invoking any PR-creation command — whether via `spell-create-pull-request`, raw `gh pr create`, raw `az repos pr create`, or an MCP `create_pull_request` tool — you MUST:

   ```bash
   git fetch origin
   git rebase origin/<target-branch>   # default: main
   # resolve conflicts locally; never open a PR on a branch that will conflict with target
   git push --force-with-lease         # only if the branch already existed on origin
   ```

   This is not optional. Skipping the rebase (for example by shelling out to `az repos pr create` directly and hoping reviewers will merge over the conflict) is a governance violation. See `.arcane/governance/git-conventions.md` → **🛑 Agent-mandatory pre-PR guard**. If a rebase produces conflicts you cannot confidently resolve, **STOP** and hand off to the human — do not open the PR.

   Prefer delegating to `spell-create-pull-request`, which encodes this check as its Step 0.6. The steps below are the raw-CLI fallback and still require the rebase above to have already been performed.

   c. Detect remote platform from `git remote get-url origin`:
   - `github.com` → GitHub flow
   - `dev.azure.com` / `visualstudio.com` → Azure DevOps flow

   d. **GitHub flow (when remote is GitHub):**
   - Create PR with `gh pr create --title "<Conventional Commits title>" --body-file <pr-body-file.md>`.
   - Use `--body-file` (not inline `--body`) to preserve multi-line markdown reliably.
   - Assign reviewer by default (operator/reviewer identity) if available.
   - Self-approve only when platform/policy allows. If blocked by policy, report and continue with human approval required.
   - Complete using **merge commit (no-fast-forward)** or **rebase+fast-forward** only. Do not use squash.

   e. **Azure DevOps flow (when remote is ADO):**
   - Check if an active PR already exists for the source branch:
     - `az repos pr list --source-branch <branch> --status active --output json`
     - If one exists, reuse it; otherwise create via `az repos pr create`.
   - For multi-line markdown descriptions:
     - Bash: `--description "$(cat <pr-body-file.md>)"`
     - PowerShell: `--description (Get-Content -Raw .\<pr-body-file.md>)`
   - Assign reviewer by default to the operator/reviewer identity (for example from `git config user.email`), idempotently (skip if already assigned).
   - Approve via CLI first: `az repos pr set-vote --id <PR_ID> --vote approve`.
   - If self-approval is blocked by policy, report that a second human approval is required and continue without forcing approval.
   - Complete idempotently with source-branch deletion enabled and squash disabled: `az repos pr update --id <PR_ID> --status completed --delete-source-branch true --squash false`.
   - Use only **merge (no-fast-forward)** or **rebase+fast-forward** merge strategy; never squash.
   - REST fallback only when CLI commands fail or are unavailable. Ensure the request URI is fully qualified and includes exactly one `?api-version=7.1`.

   f. **PR description quality rules** (both platforms):
   - `## Summary` with why the PR exists.
   - Structured `###` sections for each logical change area.
   - A `### Testing` checklist (`- [x]` / `- [ ]`).
   - Tables/code blocks where they improve clarity.

   g. Capture PR ID/URL from command output.
   - Always render PRs as clickable markdown links with the full URL.
   - Never write a bare `PR #NNN`.

10. **Post-merge cleanup (worktree-safe):**

- Ensure remote cleanup:
  - `git push origin --delete <branch>` (if already deleted, treat as non-fatal)
  - `git fetch --prune origin`
- If `<branch>` is attached to an active worktree, skip local branch deletion.
- If branch is not attached to any active worktree, run `git branch -d <branch>`.
- Return to `main` only when appropriate for the active session/worktree context.
- If other stale local branches exist (merged or older than 7 days), list them and suggest cleanup.
- See [governance/git-conventions.md](../../governance/git-conventions.md) Post-Merge Cleanup section.

## Troubleshooting

- **Wrong platform commands:** Always detect platform from `git remote get-url origin` before running PR commands.
- **ADO `api-version` errors:** Prefer `az repos pr set-vote` and `az repos pr update` first. If REST fallback is needed, verify URI path and single `?api-version=7.1`.
- **Reviewer already assigned:** Treat as non-fatal; continue without re-adding reviewer.
- **Vote API quirks / policy blocks:** If `set-vote` succeeds but approval does not satisfy policy, confirm reviewer vote state and require a second human approval.
- **Worktree branch delete failure:** If branch is attached to a worktree, skip local delete and continue with remote delete + prune.
- **Remote branch already deleted:** Continue and run `git fetch --prune origin`.

Output format after execution:

## Commit Complete

```
[commit hash] type(scope): description
Author: Display Name <email>
```

**Files committed:**

- File 1
- File 2
- ...

**Commit metadata used:**

- Author override: `yes/no`
- Agent trailers: `included/skipped`
- Provider trailer: `included/skipped`

**Pull Request:** [full PR URL](https://github.com/{org}/{repo}/pull/{id} or https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id})

**Next:** Continue work or run `spell-close-session` to finalize journal and session docs.
