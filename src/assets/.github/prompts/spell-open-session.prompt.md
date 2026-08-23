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
- [naming-conventions.md](../../.arcane/governance/naming-conventions.md)
- [ai-context/system-prompt-context.md](../../ai-context/system-prompt-context.md)
- [agents/agent-policies.md](../../.arcane/governance/agent-policies.md)
- Most recent journal file(s) in [journal/](../../journal/)
- Relevant business overview(s) under `{BUSINESS_ROOT}/` (resolve from `.arcane.json`'s `business_root` field, default `ventures/` if unset)

**Handoff Detection (run before anything else):**

Check `ai-context/system-prompt-context.md` for a `## Next Session Handoff` section.

- If present and **not yet marked consumed** (no `> ✓ Consumed:` line): surface it immediately as `## Picking Up From Last Session` at the very top of your output, before all other sections. Use the `Next concrete action` field as the first item in `## Next Session Plan`. Use the `Active task`, `Active files`, and `Branch` fields to pre-populate the State Snapshot.
- **If the handoff's `Pending Verification` field lists anything other than "None" (EF-21):** surface each listed item explicitly, then actively re-check its current status (per the item's stated verification action) rather than treating the state recorded at close-session time as still current — a `dispatched`/`pending` item may have since succeeded, failed, or still be running, and carrying it forward as inert text would repeat the exact failure mode this field exists to prevent. Report what you found (resolved succeeded / resolved failed / still pending / still unverifiable) before relying on anything downstream that depended on it.
- After surfacing it, apply the Mutation Guard below before appending `> ✓ Consumed: YYYY-MM-DD` (today's date). The marker write is a repository mutation.
- If the section is absent or already marked consumed: skip this step and proceed with the normal workspace scan.

## Mutation Guard (run lazily before the first repository write)

Do not create a branch during a read-only session. Immediately before the first file edit, generated file, staging action, or other repository mutation, classify the current Git/remote state and apply exactly one path:

| Observed state                                                        | Required action before mutation                                                                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supported, authenticated GitHub/ADO remote + trunk checked out        | Create and switch the **current worktree only** to `sessions/YYYY-MM-DD-<topic-slug>`, derived deterministically from the focus, handoff active task, or top next action. |
| Already on a compliant `sessions/YYYY-MM-DD-<topic-slug>` branch      | Stay on it; do not create or switch branches.                                                                                                                             |
| Noncompliant unpushed branch with no active PR                        | Rename it to the deterministic session name before mutation.                                                                                                              |
| Branch has an active PR                                               | Stay on the PR branch and report it; never rename a branch backing an active PR.                                                                                          |
| Current path is a linked worktree                                     | Mutate/switch only the current worktree. Never switch or delete a branch attached to another worktree.                                                                    |
| No remote, unsupported remote, or provider authentication unavailable | Stay on the repository trunk. Print `Local-only session: no usable remote merge path; mutations remain on <trunk> and close-session must use its local-only path.`        |

A usable merge path requires a configured remote on a supported provider (`github.com`, `dev.azure.com`, or `visualstudio.com`) and authenticated provider tooling. A remote URL alone is insufficient. Re-evaluate immediately before the first mutation so a remote added or removed during the read-only portion is handled from observed state.

If branch creation/rename is required, complete it before writing the handoff consumed marker or any other file. If the guard cannot determine the current worktree, active-PR state, or merge capability, fail closed without mutation and ask for operator direction.

**Drift Check (run before deep context gathering):**

Run the `spell-check-drift` spell first, before building the state snapshot or gathering deep context. Drift compounds the longer a session runs, so catch it early.

- If **HIGH** drift is found: list it under the `## Risks And Gaps` output section and ask the user whether to fix it before proceeding. Do not continue deep context gathering until they decide.
- If **MEDIUM** or **LOW** drift is found: note it and suggest deferring it until after the session-opening pass.
- If no drift is found: note `drift check passed` and continue.

Then produce output in this exact structure:

## Workspace Health Check

Before anything else, check:

- **Current branch:** Run `git branch --show-current` and `git worktree list`. Report the current state; do not switch during this read-only check. Branch creation/switching is owned by the lazy Mutation Guard. **Caveat (EF-33):** if this repository or its linked worktrees might be reached through more than one filesystem view (a bridged/remote mount, a container bind-mount), `git worktree list` can truthfully report a live, healthy worktree as `prunable` when read from a vantage point that can't resolve its registered path — this is a read-only report, not a reason to act; never run a destructive worktree/branch command on its output alone (see git-conventions.md's Same-Vantage-Point Check section before any such command elsewhere in this or later sessions).
- **Isolation primitive (ARC-028 R1–R5):** name where this session will run *before* the Mutation Guard creates anything, and state it in the session output. Every unit of work lives in exactly one of three primitives — the **primary checkout**, a **linked worktree**, or a **full clone**. Select from what the previous bullet's `git worktree list` and `git status` already showed, in this order:
  - **Managing repository state** — reconciling uncommitted files, pruning branches, fast-forwarding `main`, cutting a release, or any `git worktree` lifecycle operation → **primary checkout** (R1). These are the only operations that require holding `main`, and only one working tree can.
  - **The primary checkout is occupied** — another session's branch is checked out there, or it holds uncommitted work that is not yours → **linked worktree** (R3). At most one actor occupies the primary checkout at a time. Create it with `git worktree add <path> -b <session-branch>`; never switch or delete a branch attached to a worktree you are not in.
  - **Unattended/automated git operations** (cron, daemon fleets, anything pulling or pushing without a human present) → **full clone** (R5). Linked worktrees share one physical `.git`, so concurrent unattended operations contend on the same locks.
  - **Otherwise** → **primary checkout on a session branch** (R2). This is the default and it is deliberately the do-nothing path: one actor, one checkout, no new tooling.
  - **Footprint overlap overrides the choice (R4).** If this session's work touches the same files or the same shared sequence (migration numbers, generated indexes, lockfiles) as work already running in another primitive, do **not** isolate it — serialize instead: wait, or re-scope to a disjoint footprint first. Isolation does not prevent those collisions, it hides them until merge review.
  - Working in a linked worktree changes two things later in the session and nothing else: `spell-close-session` must not check out `main` (see git-conventions.md's Post-Merge Cleanup section), and the worktree contains no untracked tooling state — budget for `npm install` or equivalent in a code repo. Branch naming, attribution, and the PR gate are identical from every primitive (R8).
- **Session branch naming compliance:** Branch names must be human-readable and policy-compliant:
  - Interactive session default: `sessions/YYYY-MM-DD-<topic-slug>` (kebab-case topic from current task/session objective).
  - Disallow random adjective-noun generator names (example: `ideal-disco`) as session defaults.
  - If current branch is non-compliant and no active PR depends on it, record the required rename for the Mutation Guard. Do not rename during a read-only session.
  - If an active PR uses the old branch name, do not force-delete the old remote branch; flag it and continue with a follow-up rename plan.
- **Stale local branches:** Run `git branch --merged main` to list branches already merged that should be deleted. This lists candidates only — before deleting any, apply the same-vantage-point check (EF-33) and, separately, verify by content rather than trusting ancestry alone (rebase-and-fast-forward merges are invisible to `--merged`; see the merged-branch cleanup item in TODO.md).
- **Tracker configuration check (early):** resolve active tracking settings before planning, in this order: root `.arcane.json` (if present) -> the committed self-hosted source manifest (`src/assets/.arcane.json`, read only when it declares `selfHosted: true` -- this is EF-14's recorded self-hosting resolution tier, distinct from treating the mere presence of a self-host marker as license to infer other, unrelated config) -> the current feature PRD frontmatter -> ask. Persisted once at `spell init`/`spell update` (EF-14); do not re-ask when any of the first three sources already sets it.
  - `tracking_mode: internal | external`
  - `external_provider: ado | jira | other`
  - If all three sources are absent, ask: "Track work in this repo (TODO.md / PRDs)" [internal] vs "Track work in an external tracker (Azure DevOps / Jira / other)" [external]. Default to `external` + `ado` only when existing ADO context already exists (backward compatibility).
- **Open PRs (external/ado mode only):** if tracking mode is `external` with provider `ado` and ADO MCP is available, list all open PRs across all repos in the configured repo list (resolve from `.arcane.json`; if unset, ask the operator which repos to scan). Flag PRs older than 3 days as stale, older than 7 days as overdue. Format each as a clickable markdown link: `[PR #{id} — {title}](https://dev.azure.com/{ADO_ORG}/{ADO_PROJECT}/_git/{repo}/pullrequest/{id})` — resolve `{ADO_ORG}` and `{ADO_PROJECT}` from `.arcane.json` / PRD frontmatter; ask if unset. Never list a bare `PR #NNN`.
- **Uncommitted changes:** Run `git status` and report any uncommitted files.
- **Arcane version check (two-axis):** If `.arcane.json` exists in the repo root, check both whether the repo's managed files are behind the installed CLI _and_ whether the installed CLI is behind the latest published version of `arcane-cli`:
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
