---
name: Spell — Commit Work
description: Generate Conventional Commits message with agent attribution and commit current work during an active session
claude_description: Use PROACTIVELY whenever committing work during a session, even if the user just says 'commit this'.
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

- [governance/git-conventions.md](../../.arcane/governance/git-conventions.md) — Conventional Commits reference and agent attribution model
- [DECISIONS.md](../../DECISIONS.md) — for ADR context if relevant

Workflow:

1. **Check git status and guard the branch** — run `git status` to see what changed, and confirm the current branch.
   - Classify the Git/remote state before enforcing the protected-branch guard. A usable merge path requires a configured remote on a supported provider (`github.com`, `dev.azure.com`, or `visualstudio.com`) and authenticated provider tooling. A remote URL alone is insufficient.
   - Apply exactly one path:
     - **Supported, authenticated GitHub/ADO remote + `main` or `master` checked out:** **STOP — do not stage or commit directly.** Create and switch the current worktree to a compliant topic branch (for example, `sessions/YYYY-MM-DD-<slug>`), then continue.
     - **Supported, authenticated GitHub/ADO remote + valid topic/PR branch checked out:** stay on that branch and continue.
     - **No remote, unsupported remote, or provider authentication unavailable:** remain on the current trunk. Print `Local-only checkpoint: no usable remote merge path; commit remains on <trunk> and no remote push/PR will run.` Continue through the local commit gate, then skip Steps 9 and 10 entirely.
   - If the current worktree, branch, provider, or authentication state cannot be determined, fail closed before staging and ask the operator. Never strand a local-only commit on a topic branch with no usable merge path.

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

3. **Determine authorship and partition the batch** — who produced each changed file or inseparable change set? See [governance/git-conventions.md](../../.arcane/governance/git-conventions.md) Agent Attribution Model section and ADR-028.
   - **Invariant: one commit has exactly one author.** Changes spanning authors must be split into separate commits.
   - Partition changed files by author first. Step 4 then groups by concern within each author partition; concern grouping must never recombine authors.
   - **Human wrote it:** no `--author` override needed (uses global Git config)
    - **Arcane vendored scaffold/update:** no `--author` override; the operator's Git identity records the repository action. Add `Vendor: arcane-cli` and, when derivable, `Vendor-Version: <version>` trailers.
       - Derive the version at commit time by running `arcane --version` (or the resolved `spell --version` alias). The CLI reads its installed package's `package.json`; never type the version, copy it from memory, or infer it from the repository manifest.
       - If the installed CLI version cannot be read programmatically, omit `Vendor-Version` and report that provenance is incomplete. Never guess.
       - A batch mixing vendored files with human- or agent-authored changes spans provenance authors and must be split before concern grouping.
   - **AI agent/tool produced it:** use `--author` with the agent's registered identity:
     - Roster agent: `--author="{AGENT_NAME} <{AGENT_EMAIL}>"` — resolve `{AGENT_NAME}` / `{AGENT_EMAIL}` from the active agent config (see [[agent-policies]] / [[naming-conventions]]); ask if unset.
     - Generic CLI/IDE tool: `--author="{TOOL_NAME} <{TOOL_NAME_LOWER}@{OPERATOR_DOMAIN}>"` — resolve `{TOOL_NAME}` from the channel in use and `{OPERATOR_DOMAIN}` from `.arcane.json`; ask if unset.
   - When authorship is unknown or disputed, stop and ask. Never select one identity for a mixed-author batch.

4. **Analyze and group changes within each author partition** — categorize the work:
   - What was the intent? (new feature, bug fix, docs, refactor, etc.)
   - What scope/area was affected? (prompts, agents, security, infrastructure, journal, etc.)
   - Is this part of a larger initiative or a standalone change?
   - **Commit-splitting heuristic:** within one author partition, if the changes span clearly unrelated concerns (e.g., a feature change + an unrelated refactor + a dependency bump), recommend splitting them into multiple focused commits, each with its own message, rather than a single mixed commit. A single commit is fine when one author's changes serve one purpose. When splitting, stage and commit each concern separately.
   - **Wiki-link check:** For any new `.md` files being committed, verify each has at least one outbound `[[...]]` wiki-link connecting it to the knowledge graph. Orphaned docs (no outbound links) break Obsidian's graph view. If missing, add a `Related:` or `See also:` line before committing. See the CLAUDE.md wiki-link conventions for the correct format.

4.5. **Resolve execution authority before any commit or merge command:**

- Declare `interaction_context: interactive | autonomous`. VS Code chat, editor chat, Claude Code, and any live operator session are `interactive`; never infer `autonomous` from tool access.
- Resolve the acting agent's effective power level and `exec_allowed` only through the EF-27 loader-validated roster and definition. Do not parse YAML directly or trust an unvalidated value.
- If interaction context, consent provenance, roster identity, power level, or `exec_allowed` is missing/invalid/unavailable, fail closed to the least-authorized path. Print: `Authorization downgraded: <input> is <missing/invalid>. Human execution is required for <commit/merge>.`
- `exec_allowed: false` always requires human execution, regardless of power level.

| Context / validated authority | Commit                                         | Merge / auto-complete                                    |
| ----------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Interactive, any power        | Exact operator approval required               | Separate exact operator approval **and** Magus+ required |
| Autonomous, below Magus       | May commit to topic branch when `exec_allowed` | Prohibited; queue PR for human completion                |
| Autonomous, Magus+            | May commit when `exec_allowed`                 | May self-merge within approved scope                     |
| Missing or invalid authority  | Human execution required                       | Human execution required                                 |

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
   - `business` — `{BUSINESS_ROOT}` directory (resolve from `.arcane.json`'s `business_root` field, default `ventures/` if unset)
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

   Agent: [runtime/tool name only -- claude, copilot, codex -- never a persona name]
   Persona: [roster identity operated as, ONLY if a roster exists (.arcane/agents.yaml) and one was assigned this session -- omit entirely otherwise, never guess]
   Role: [Persona's own AgentDefinition.role value, resolved from the roster -- never typed by hand. Present only if Persona is present]
   Model: [model identifier, e.g., claude-opus-4-20250918]
   Model-Source: [self-reported -- currently the only defined value; marks Model/Agent as self-reported, not independently verified]
   Provider: [anthropic or openai]
   Vendor: [arcane-cli, for vendored scaffold/update commits]
   Vendor-Version: [programmatically derived installed package version, when available]
   Task-Type: [docs, code, review, marketing, infra]
   Channel: [vscode, cli, chat]
   ```

   **Rules:**
   - Short description: imperative mood ("add", "fix", "update"), lowercase, no period
   - Keep first line under 72 characters for git log readability
   - Body is optional but useful for complex changes
   - Reference ADRs if applicable (e.g., "Implements ADR-028")
   - Trailers go after a blank line following the body (standard Git footer position)
   - Required trailers for agent commits: `Agent`, `Model`, `Model-Source`, `Provider`. `Persona`/`Role` are conditional -- see `.arcane/governance/git-conventions.md`'s Agent Attribution Model for the full rule and the grading-probe example of what happens when `Role` is guessed instead of sourced.
   - Required trailer for Arcane-vendored commits: `Vendor: arcane-cli`; include `Vendor-Version` only when derived from the installed CLI at commit time
   - Human-authored commits: trailers are optional

8. **Gate and execute the commit:**
   - Run `git add -A` (or selective `git add` if user specifies files), show `git diff --stat --cached`, and compute an approval fingerprint from the exact staged diff plus proposed commit message.
   - In an interactive context, present the staged diff summary, full proposed message, and fingerprint through a structured approval control. Wait for an authenticated operator response tied to that fingerprint.
   - Timeout, cancellation, host-generated fallback, delegated response, or ordinary conversational assent is not approval. Halt without committing.
   - Recompute the fingerprint immediately before `git commit`. If the staged diff or message changed, invalidate approval and ask again.
   - In autonomous context, execute only when loader-validated `exec_allowed` is true. Below-Magus authority may commit to the topic branch but may not complete its PR.
   - Run `git commit --author="..." --trailer="..." -m "message"` only after the applicable gate passes, then confirm the commit hash.

9. **Push branch and run platform-specific PR flow:**

   **Local-only exit:** if Step 1 classified the repository as having no usable remote merge path, skip this entire step and Step 10. Print `Local-only checkpoint: committed on <trunk>; no remote push/PR performed.` The local commit is the completed checkpoint.

   **Separate merge authorization gate:** commit approval never authorizes merge. Bind any interactive merge approval to the exact PR ID and current head SHA, and re-check both immediately before completion. Missing/changed approval invalidates the gate. Never invoke merge, auto-merge, auto-complete, or `--status completed` below loader-validated Magus authority; create/update the PR, print the visible downgrade, and leave completion to a human.

   a. Run `git push origin <branch>`.

   a1. **MCP fail-fast / fallback.** If an MCP tool used anywhere in this step (e.g. `create_pull_request`) fails abnormally once — a hang, an idle-timeout abort, a transport error, or an empty response where data is clearly expected — treat that server as down for the rest of this session. Do not retry it blindly; fall back to the raw CLI paths below (`gh pr create` / `az repos pr create`) and report the downgrade. Full rule: `.arcane/governance/git-conventions.md` → Known issues.

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
   - Complete only after the separate merge authorization gate passes, using **merge commit (no-fast-forward)** or **rebase+fast-forward**. Do not use squash.

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
   - Only after the separate merge authorization gate passes, complete idempotently with source-branch deletion enabled and squash disabled: `az repos pr update --id <PR_ID> --status completed --delete-source-branch true --squash false`.
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
- If branch is not attached to any active worktree, run `git branch -d <branch>` — but if the repository or its linked worktrees might be reached through more than one filesystem view, run the same-vantage-point check first (EF-33 / ARC-028 R7, [governance/git-conventions.md](../../.arcane/governance/git-conventions.md) Same-Vantage-Point Check section) before trusting a "safe to delete" read.
- Return to `main` only when appropriate for the active session/worktree context.
- If other stale local branches exist (merged or older than 7 days), list them and suggest cleanup.
- See [governance/git-conventions.md](../../.arcane/governance/git-conventions.md) Post-Merge Cleanup section.

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

**Branch topology** — per the generated state diagrams convention (rule 8, ARC-036), built only from
data Step 1/9 already gathered (current branch name, commits ahead of target via
`git log origin/<target>..HEAD --format="%h %s" --reverse`). Skip entirely — this is the applicability
guard — when there is no separate topic branch (the local-only-checkpoint path, committing directly on
trunk) or no usable remote (nothing to compare against):

```mermaid
gitGraph
   commit id: "<target HEAD short-sha>"
   branch <branch-name>
   commit id: "<short-sha 1>"
   commit id: "<short-sha 2>"
```

One commit per entry in the gathered commit list, in the same order; omit the diagram (not just the
commits) if that list is empty. Use `<target>`'s short SHA as the fork-point commit id.

**Next:** Continue work or run `spell-close-session` to finalize journal and session docs.
