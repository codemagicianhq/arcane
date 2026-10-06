**Branch naming (every actor).** `main` is integration-only. All work happens on a topic branch, named by who creates it:

| Who creates the branch | Format | Example |
| --- | --- | --- |
| A human | `type/short-description` | `fix/auth-token-regression` |
| An interactive session (Claude Code, Copilot, Codex chat), including every worktree it opens and every parallel subagent it spawns | `sessions/YYYY-MM-DD-<topic-slug>`; a parallel subagent appends `-<agent>` | `sessions/2026-10-05-branch-naming`, `sessions/2026-10-05-branch-naming-merlin` |
| An autonomous roster agent on a dispatched job (`spell-full-cycle`, from `stories.json`) | `{agent-slug}/type/short-description` | `lafayette/feat/api-endpoint` |

The slug comes from the work — the focus, the handoff's active task, the top next action, the story, the pull request title — never from a generator. A tool-generated name (`claude/<adjective>-<surname>-<hash>`, any random adjective-noun name) is noncompliant wherever it appears and is renamed on sight. When a client offers to create a worktree or a parallel agent, supply the branch name yourself: Claude Code's `EnterWorktree` takes a `name`, and `git worktree add <path> -b <branch>` pre-creates the branch for any client; never accept a generated name. **Enforcement: structured spell gate (ARC-023) — `spell-open-session`'s Mutation Guard and `spell-create-pull-request`'s Step 0 run the branch rename gate on the branch they find; `spell agents sync` renders this rule into every client instruction file; no CI check reads a pull request's head-branch name.**
