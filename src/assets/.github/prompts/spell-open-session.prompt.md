---
name: Spell — Open Session
description: Open an Arcane session in a new chat by rebuilding context, identifying highest-priority unfinished work, and proposing concrete next actions.
argument-hint: Optional focus area (e.g., security hardening, a specific feature, infrastructure setup)
agent: agent
---

## Executive Summary

- This prompt opens a new session after chat reset by reading core docs and identifying unfinished work.
- It produces a state snapshot, top priorities, and concrete next actions to minimize startup friction.
- Use this when opening work in a new chat session to avoid re-reading full context manually.
- Optional focus argument narrows scope to a specific domain (security, business, infrastructure).

---

Open work in this repository after context reset. Treat repository documents as source of truth. See [[README]] and [[CLAUDE]] for repo orientation.

If the user provided a focus area in the prompt argument, prioritize that area. Otherwise perform a general session-opening pass.

Use these files first:

- [README.md](../../README.md)
- [project.md](../../project.md)
- [TODO.md](../../TODO.md)
- [DECISIONS.md](../../DECISIONS.md)
- [naming-conventions.md](../../naming-conventions.md)
- [ai-context/system-prompt-context.md](../../ai-context/system-prompt-context.md)
- [agents/agent-policies.md](../../agents/agent-policies.md)
- Most recent journal file(s) in [journal/](../../journal/)
- Relevant business overview(s) under [ventures/](../../ventures/)

**Handoff Detection (run before anything else):**

Check `ai-context/system-prompt-context.md` for a `## Next Session Handoff` section.

- If present and **not yet marked consumed** (no `> ✓ Consumed:` line): surface it immediately as `## Picking Up From Last Session` at the very top of your output, before all other sections. Use the `Next concrete action` field as the first item in `## Next Session Plan`. Use the `Active task`, `Active files`, and `Branch` fields to pre-populate the State Snapshot.
- After surfacing it, mark it consumed by appending `> ✓ Consumed: YYYY-MM-DD` (today's date) on a new line inside the block, then save the file.
- If the section is absent or already marked consumed: skip this step and proceed with the normal workspace scan.

**Drift Check (run before deep context gathering):**

Run the `spell-check-drift` spell first, before building the state snapshot or gathering deep context. Drift compounds the longer a session runs, so catch it early.

- If **HIGH** drift is found: list it under the `## Risks And Gaps` output section and ask the user whether to fix it before proceeding. Do not continue deep context gathering until they decide.
- If **MEDIUM** or **LOW** drift is found: note it and suggest deferring it until after the session-opening pass.
- If no drift is found: note `drift check passed` and continue.

Then produce output in this exact structure:

## Workspace Health Check

Before anything else, check:

- **Current branch:** Run `git branch --show-current` in the arcane repo. If not on `main`, run `git worktree list`:
  - If this is a worktree-backed session, staying on the topic branch is expected (do not require switching to `main`).
  - If not worktree-backed, warn the user and suggest switching back to `main`.
- **Session branch naming compliance:** Branch names must be human-readable and policy-compliant:
  - Interactive session default: `sessions/YYYY-MM-DD-<topic-slug>` (kebab-case topic from current task/session objective).
  - Disallow random adjective-noun generator names (example: `ideal-disco`) as session defaults.
  - If current branch is non-compliant and no active PR depends on it, rename branch to a compliant name. If it was already pushed, migrate remote tracking (`git push -u origin <new-name>` then `git push origin --delete <old-name>`), then continue.
  - If an active PR uses the old branch name, do not force-delete the old remote branch; flag it and continue with a follow-up rename plan.
- **Stale local branches:** Run `git branch --merged main` to list branches already merged that should be deleted.
- **Tracker configuration check (early):** resolve active tracking settings before planning. Read `.arcane.json` first (if present), then the current feature PRD frontmatter if available:
  - `tracking_mode: internal | external`
  - `external_provider: ado | jira | other`
  - If missing, ask the operator to choose now. Default to `external` + `ado` only when existing ADO context already exists (backward compatibility).
- **Open PRs (external/ado mode only):** if tracking mode is `external` with provider `ado` and ADO MCP is available, list all open PRs across all repos in the configured repo list (resolve from `.arcane.json`; if unset, ask the operator which repos to scan). Flag PRs older than 3 days as stale, older than 7 days as overdue. Format each as a clickable markdown link: `[PR #{id} — {title}](https://dev.azure.com/{ADO_ORG}/{ADO_PROJECT}/_git/{repo}/pullrequest/{id})` — resolve `{ADO_ORG}` and `{ADO_PROJECT}` from `.arcane.json` / PRD frontmatter; ask if unset. Never list a bare `PR #NNN`.
- **Uncommitted changes:** Run `git status` and report any uncommitted files.
- **Arcane version check (two-axis):** If `.arcane.json` exists in the repo root, check both whether the repo's managed files are behind the installed CLI *and* whether the installed CLI is behind the latest published version of `arcane-cli`:
  - Read the installed version from `.arcane.json` (field: `arcaneVersion` or `version`).
  - Determine the version of the installed `arcane-cli` CLI (for example, `npx arcane-cli --version`, or the locally installed package version).
  - Run `npm view arcane-cli version` to get the latest published version.
  - **(a) Managed files behind the installed CLI** (installed CLI version is newer than the version recorded in `.arcane.json`): surface a warning: `⚠️ Managed files out of date: files at <installed> → CLI at <cli>. Run spell update to resync files.`
  - **(b) Installed CLI behind the latest published version** (latest published is newer than the installed CLI): surface a warning: `⚠️ Arcane CLI update available: CLI at <cli> → latest <latest>. Upgrade the CLI, then run spell update.`
  - If both axes are current, report current and continue.
  - If no `.arcane.json` exists, skip silently.

## State Snapshot

- Short bullets by area: security, infrastructure, `{PRIMARY_VENTURE}` readiness, business readiness, and documentation maturity. Resolve `{PRIMARY_VENTURE}` from `.arcane.json` / venture frontmatter; if unset, substitute the active focus area (or omit that bullet).

## Top Unfinished Work

- Prioritized list with severity labels: Critical, High, Medium.
- Every item must include a file reference.

## Next Session Plan

- 3 to 5 concrete actions to execute now.
- Keep actions specific and immediately executable.
- If moving from one completed epic to the next, include an explicit checkpoint action to run `spell-commit-work` first.

## Suggested Session Name

- **Required output field.**
- Provide a 1–4 word, sentence-case, human-meaningful session name.
- If a focus/task argument is provided, generate the name deterministically from that focus (never use the generic name `Open session`).
- If no focus argument is provided, generate the name from the top recommended action in `## Next Session Plan`.
- Optional helper line: `Branch helper: sessions/YYYY-MM-DD-<kebab-case-slug>`.

## Risks And Gaps

- Contradictions, stale assumptions, missing files, or draft documents that block progress.

## Clarifications Needed

- Up to 3 short questions only if they materially change priorities.

Rules:

- Prefer facts from docs over assumptions.
- Keep output concise but actionable.
- Include clickable file paths for claims.
- If you find outdated statements (for example, docs that contradict the current state of the system), call them out explicitly as drift.
- Never return a generic session name like `Open session` when a meaningful alternative can be derived from focus or the top next action.
