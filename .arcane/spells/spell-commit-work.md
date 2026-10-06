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
     - **Supported, authenticated GitHub/ADO remote + `main` or `master` checked out:** **STOP — do not stage or commit directly.** Create and switch the current worktree to a compliant topic branch (a session branch, named per `git-conventions.md` → Branch Naming), then continue.
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

   - **Distributable-change halt** (LH-06a; only when this repo has its own `scripts/check-version-bump.ts` — Arcane's own repo, or one that adopted the same convention; skip gracefully otherwise, this is not a general-purpose check every consumer repo can run):
     - Run `npm run check:version-bump -- --staged` before committing. This is the staged-diff mode, not the default CI mode — it can see today's not-yet-committed change, which the default `merge-base..HEAD` diff cannot.
     - **HALT if it fails.** Distributable content (`src/assets/`, `registry.ts`, `profiles.ts`) changed without a version bump. Run `spell-bump` first, then return here.

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
   - **TODO linkage assist (LH-09; only when this repo has its own `TODO.md` convention with backticked paths):** run `git diff --cached --name-only` and check whether any staged path also appears backticked in an open (`- [ ]`) `TODO.md` item. If so, print a one-line reminder naming the matching item so the author can close or update it in the same commit — advisory only, never blocks the commit.

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
   - `prompts` — .arcane/spells/ canonical spell files (their .github/prompts, .claude/commands and .agents/skills shims are generated, never hand-edited)
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
   Model: [model identifier, e.g., claude-opus-4-20250918 -- or `withheld` when the runtime forbids disclosing it]
   Model-Source: [self-reported -- marks Model/Agent as self-reported, not independently verified; or withheld-by-runtime, paired with Model: withheld -- see git-conventions.md, "When the runtime withholds the model"]
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

   a. **Push-policy check, then push.** Run this check before the push below. It also governs every later push in this step and in Step 10: the step 9b `--force-with-lease` push and `git push origin --delete <branch>`.

   <!-- fragment:push-policy-check:start -->
   **Push-policy check (ARC-049) — before any push.** Read `push_policy` from the repository's `.arcane.json` at the repository root (a self-hosted source repository with no root manifest keeps it in `src/assets/.arcane.json` when that file declares `selfHosted: true`). An absent file or an absent field means `open`. The check covers every push this spell makes: a branch push, a `--force-with-lease` push, and a remote branch deletion (`git push <remote> --delete <branch>`).
   - **`open` or absent:** proceed with the push.
   - **`guarded`:** before the push, state the policy ("This repository's push policy is `guarded`: every push needs your explicit confirmation."), name the remote, the branch and the kind of push, and ask the operator for explicit confirmation. Push only on an explicit operator confirmation of that push. A timeout, a cancellation, a delegated or host-generated response, or assent given to something else is not confirmation. **In an autonomous run with no operator to ask, do not push:** report the push as pending operator confirmation, naming the branch and the commits it would carry. This fails closed.
   - **`blocked`:** do not attempt the push. Say why: the repository's push policy is recorded as `blocked`, so pushes are refused on purpose. Name `spell unblock-push` as the only way to lift it, run by the operator from an interactive terminal. Never run it yourself, and never work around the block (`--no-verify`, another remote or URL, editing git config or `.arcane.json`).
   - **Any other value, or a `.arcane.json` that cannot be parsed:** do not push. Report what was found and suggest `spell doctor`.
   - When a push does not happen, skip every step that depends on it (opening or updating a PR, remote branch cleanup) and report the commits as committed locally and not pushed.
   - Enforcement: structured spell gate (ARC-023) — for `guarded`, this check is the only thing that holds a push for confirmation. A `blocked` push is also refused by the pre-push hook and the sentinel push URL that `spell init` or `spell block-push` install, and `spell doctor` reports a `blocked` policy whose controls are missing.
   <!-- fragment:push-policy-check:end -->

   **PR-state check — before a branch push.** Run it after the push-policy check, before the push below and before the step 9b `--force-with-lease` push. It does not cover Step 10's `git push origin --delete <branch>`, which runs because the PR merged. Ask the provider for the branch's pull requests: `gh pr list --head <branch> --state all --json number,state` on GitHub, `az repos pr list --source-branch <branch> --status all` on Azure DevOps, or the provider's MCP equivalent. Judge by the most recent one:
   - **`OPEN`, or no pull request:** proceed.
   - **`MERGED` (`completed` on Azure DevOps):** do not push: stop and name the merged PR. A push there recreates the remote branch the merge deleted and carries already-merged commits with it; put the follow-up work on a fresh branch from `<trunk>` instead. This is stricter than the warning ARC-035 decision 4 gave this repository's own pre-push hook, because a merged branch is never a live target.
   - **`CLOSED` without merging (`abandoned` on Azure DevOps):** name the PR and ask before pushing, since new commits there reach no open review. In an autonomous run, do not push; report it.
   - **The provider cannot be queried:** say so. Push only a branch this session created and opened no pull request for; otherwise ask, or in an autonomous run report the push as pending.
   - Enforcement: structured spell gate (ARC-023) — only this spell runs the check. This repository's own `.husky/pre-push` warns on a closed or merged PR without blocking, and consumer repositories get no such hook.

   When the checks allow it, run `git push origin <branch>`.

   a1. **MCP fail-fast / fallback.** If an MCP tool used anywhere in this step (e.g. `create_pull_request`) fails abnormally once — a hang, an idle-timeout abort, a transport error, or an empty response where data is clearly expected — treat that server as down for the rest of this session. Do not retry it blindly; fall back to the raw CLI paths below (`gh pr create` / `az repos pr create`) and report the downgrade. Full rule: `.arcane/governance/git-conventions.md` → Known issues.

   a2. **Write the PR body file first.** Before step 9b — the first step here that can halt — write the PR description to a file, so a rebase that stops (a conflict, a hand-off to `spell-sync-pull-request`, a resumed session) cannot lose it. Resolve the path with `git rev-parse --git-dir` (it handles worktrees) and write `<git-dir>/arcane-pr-body.md`, following the quality rules in 9f, with the first line `<!-- arcane-pr-body: <current-branch> -->` naming the branch it was written for; this is the same file `spell-create-pull-request` Step 4 writes. The `.git` directory is never committed and a rebase does not touch it, so the file survives a halted rebase. Confirm it is non-empty before continuing. If you delegate the PR to `spell-create-pull-request`, it writes this file itself at its Step 4.

   b. **🛑 Mandatory pre-PR rebase (governance guard, applies to every path below).** Before invoking any PR-creation command — whether via `spell-create-pull-request`, raw `gh pr create`, raw `az repos pr create`, or an MCP `create_pull_request` tool — you MUST:

   ```bash
   git fetch origin
   git rebase --autostash origin/<target-branch>   # default: main
   # resolve conflicts locally; never open a PR on a branch that will conflict with target
   git push --force-with-lease         # only if the branch already existed on origin
   ```

   `--autostash` stashes any uncommitted change before the rebase and re-applies it afterwards, so a dirty tree does not stop the rebase before it starts. If the re-apply itself conflicts, git keeps the change in the stash and says so; report that and do not open the PR.

   This is not optional. Skipping the rebase (for example by shelling out to `az repos pr create` directly and hoping reviewers will merge over the conflict) is a governance violation. See `.arcane/governance/git-conventions.md` → **🛑 Agent-mandatory pre-PR guard**. If a rebase produces conflicts you cannot confidently resolve, **STOP** and hand off to the human — do not open the PR.

   Prefer delegating to `spell-create-pull-request`, which encodes this check as its Step 0.6. The steps below are the raw-CLI fallback and still require the rebase above to have already been performed.

   c. Detect remote platform from `git remote get-url origin`:
   - `github.com` → GitHub flow
   - `dev.azure.com` / `visualstudio.com` → Azure DevOps flow

   d. **GitHub flow (when remote is GitHub):**
   - **Refuse to create the PR if the body file is missing, empty, or written for another branch.** Check `<git-dir>/arcane-pr-body.md` (step 9a2) exists, has content, and its first line names the current branch; if not, stop, rewrite it per 9a2, and only then continue. Never fall back to an empty or placeholder `--body`.
   - Create PR with `gh pr create --title "<Conventional Commits title>" --body-file <git-dir>/arcane-pr-body.md`.
   - Use `--body-file` (not inline `--body`) to preserve multi-line markdown reliably.
   - Assign reviewer by default (operator/reviewer identity) if available.
   - Self-approve only when platform/policy allows. If blocked by policy, report and continue with human approval required.
   - Complete only after the separate merge authorization gate passes, using **merge commit (no-fast-forward)** or **rebase+fast-forward**. Do not use squash.

   e. **Azure DevOps flow (when remote is ADO):**
   - Check if an active PR already exists for the source branch:
     - `az repos pr list --source-branch <branch> --status active --output json`
     - If one exists, reuse it; otherwise create via `az repos pr create`.
   - **Refuse to create the PR if the body file is missing, empty, or written for another branch.** Check `<git-dir>/arcane-pr-body.md` (step 9a2) exists, has content, and its first line names the current branch before `az repos pr create`; if not, stop, rewrite it per 9a2, and only then continue.
   - For multi-line markdown descriptions:
     - Bash: `--description "$(cat <git-dir>/arcane-pr-body.md)"`
     - PowerShell: `--description (Get-Content -Raw <git-dir>\arcane-pr-body.md)`
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
   - `## For the record` — **only when this PR is one epic of a tracked program** (one with a
     `docs/plans/<slug>/PLAN.md`); omit the heading entirely otherwise. One plain sentence a
     non-engineer reading the finished program would understand, plus `· category: <…>`.
     It is copied verbatim into the epic's `PLAN.md` entry as its `**Report:**` line when the epic
     is recorded. See `spell-create-pull-request`'s Step 4 for the full convention — defined there,
     referenced here.

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

<!-- fragment:needs-you:start -->
**Needs you — required operator actions.** When this run leaves an action that only the operator can take, and the work is not correct or complete until it is taken, report it in one block at the very top of the final report, before every other section and before any optional next step:

```markdown
## ⚠ Needs you

- <exactly what to do: the command, the link, or the question> — <why the agent cannot do it itself>
```

- **What belongs in it:** an action the work needs that only the operator can take — approving or merging a pull request, accepting a decision record, answering a question the work is waiting on, confirming a `guarded` push, running an interactive command such as `spell unblock-push`, or a step on an external platform the agent cannot reach. An optional suggestion, a next spell to run, or anything the agent could do itself is not a required action and stays out of the block.
- **One line per action.** Say exactly what to do, then, after the dash, why the agent cannot do it. Write the command, link or question out in full; never point elsewhere with "see above".
- **Never only among optional steps.** An action required for correctness is never listed only under next steps, suggestions, `Carry Forward` or `What's Next?`. It may be repeated there, but it always appears in this block.
- **Omit it when empty.** When nothing needs the operator, leave the block out entirely: no heading and no "None" line.
- **Every final report.** The block belongs in whatever report ends the run, including a report written when the spell stops early.
- Enforcement: explicitly advisory prose (ARC-023) — no check reads a spell's actual output for this block; it holds by these instructions alone.
<!-- fragment:needs-you:end -->

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
