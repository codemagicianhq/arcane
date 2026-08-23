---
name: Spell — Close Session
description: End a work session by logging outcomes in today's journal and pruning completed TODO items with verifiable evidence.
argument-hint: Optional session focus (e.g., a config change, a fix, infrastructure setup)
agent: agent
---

## Executive Summary

- This prompt formally closes a session by capturing work done, decisions made, and lessons learned in the journal.
- It updates TODO.md, DECISIONS.md, and ai-context/system-prompt-context.md to reflect current state.
- Use this at the end of every significant work session to preserve continuity and maintain documentation hygiene.
- The structured workflow ensures nothing is lost between sessions and handoff state is clean.

---

Close the current Arcane session and leave docs in a clean handoff state.

Use these files first:

- [TODO.md](../../TODO.md)
- [DECISIONS.md](../../DECISIONS.md)
- [ai-context/system-prompt-context.md](../../ai-context/system-prompt-context.md)
- Most recent journal file(s) in [journal/](../../journal/)
- Any files changed during this session

Workflow:

1. **Reconstruct the full session** from conversation context, terminal history, and changed files. Identify:
   - Actions completed (config changes, installs, fixes).
   - Decisions made (even implicit ones like naming choices, tool preferences, or workflow patterns).
   - Problems encountered and how they were resolved (troubleshooting).
   - Lessons learned (anything that cost time, surprised the user, or should prevent future mistakes).
   - **Capture tie-in tip:** If this session produced durable analysis worth formalizing (a design, an investigation, a reusable explanation), suggest running `spell-document` before closing so it lands in the right doc. For quick ideas worth keeping but not yet actionable, suggest `spell-save-idea`.

1b. **Verify in-flight async work before writing any output artifact (EF-21). Enforcement: structured spell gate (ARC-023) — this workflow requires the observable state of every dispatched item before proceeding to step 2.** "I started it" is not "it worked." Before the journal, TODO.md, or the handoff are written, enumerate every piece of asynchronous work dispatched during this session that could still be running or could have failed after being kicked off — CI/CD runs, deployments, package publishes, long-running background tasks, PR checks. For each, **actively check** its current status through whatever means is available (CI provider API/CLI, deployment dashboard, `gh run view`, `az pipelines runs show`, etc.) — attempt the check before reaching for `unverifiable`; that state exists for genuine access limits (no CLI/API access, no credentials, provider outage), not for skipping a check that was merely inconvenient to run. Then classify into exactly one state:

    - **succeeded** — confirmed complete and correct. Only this state may be described as "done," "completed," or "shipped" anywhere in the journal, TODO.md, or the handoff.
    - **failed** — confirmed to have failed. Record as a blocker or carry-forward item, never as done.
    - **pending** — still running at last check. Record as in-flight; do not describe as complete.
    - **dispatched** — kicked off, but no result has been observed at all (the letter was handed to the post office — you know it was sent, not whether it arrived).
    - **unverifiable** — only after genuinely attempting the check above and finding this environment cannot query the target system. State the exact command, URL, or action the operator must run to check it themselves — a bare "unverifiable" with no next step is barely better than silence, and reaching for this state without attempting the check first defeats the purpose of this step as surely as skipping it entirely.

    A commit succeeding, code being pushed, or a build being triggered are all **dispatched**, not **succeeded** — do not write any of them as complete until independently confirmed. Carry every non-succeeded item into the handoff's `Pending Verification` field (step 5b), and into `Last completed step` worded as not-yet-complete (also step 5b).

    Step 10's existing PR-merge check ("Verify through the detected provider that the PR is merged before changing branches") is this same requirement applied to one specific, already-shipped case — the close-session's own PR. Running step 10 does not substitute for step 1b's sweep of everything else dispatched this session, and step 1b does not substitute for step 10's specific merge check; both apply.

2. **Update today's journal file** at `journal/YYYY-MM-DD-topic-slug.md`.
   - If it exists and already has a session section from this chat, **update that section in place** (do not create a duplicate).
   - If it exists but has no section for this session, **append** a new `## Session: <title>` section.
   - If it does not exist, **create** it using the existing journal frontmatter style.
   - Journal entries must include:
     - `### Prompt Context` — original prompt text or a faithful paraphrase of the multi-turn request when the session began from a substantive user ask. Include follow-up scope inputs if they materially changed the direction of the work.
     - `### What Got Done` — numbered list of concrete outcomes with file/ADR references. Only list an outcome here if step 1b classified it `succeeded` (or it never involved async work at all, e.g. a local file edit). A `pending`/`dispatched`/`unverifiable` item belongs in Open Items Carried Forward, not here — do not let this section imply completion step 1b couldn't confirm.
     - `### Decisions Made` — table of ADR number, decision, and rationale. If no decisions were made, omit this section.
     - `### Lessons Learned` — one heading per lesson with enough context to prevent the mistake again. Use narrative, not bullet fragments.
     - `### Open Items Carried Forward` — items that remain undone from this session, including every `pending`/`dispatched`/`failed`/`unverifiable` item from step 1b.

3. **Update [DECISIONS.md](../../DECISIONS.md).**
   - Add ADRs for any decisions made during the session (naming choices, tool preferences, workflow standards, security policies, etc.).
   - Use the next sequential ADR number.
   - Follow the existing format: Date, Status, Context, Decision, Reasoning, Rejected alternatives.

4. **Update [TODO.md](../../TODO.md).**
   - Mark an item done with date only if step 1b classified its outcome `succeeded` (or it required no async verification at all). A `pending`, `dispatched`, `failed`, or `unverifiable` item stays open, regardless of how confident the session felt about it.
   - Keep unresolved items open.
   - Remove completed checklist items only when completion is documented in the correct source-of-truth file.

5. **Update [ai-context/system-prompt-context.md](../../ai-context/system-prompt-context.md).**
   - If priorities, environment state, or agent rules changed during the session, update the file to reflect current reality.
   - If no changes are needed, skip this step.

5b. **Write the Next Session Handoff block.**

In `ai-context/system-prompt-context.md`, replace the existing `## Next Session Handoff` section (or append it if the section is absent) with a freshly generated block. Populate every field from conversation context and current git state:

```markdown
## Next Session Handoff

> Auto-generated by spell-close-session. Consumed by spell-open-session. Do not edit manually.
> Generated: YYYY-MM-DD

- **Active task:** One-line description of the task that was in progress when this session closed.
- **Last completed step:** The final concrete action taken — include file path or command text. If that action was async work step 1b classified as anything other than `succeeded`, do not describe it as done here — name the action in `dispatched`/in-progress terms (e.g. "Pushed the fix and opened PR #NN" is fine; "Merged PR #NN" is not, unless step 1b confirmed the merge) and let `Pending Verification` carry the actual state.
- **Next concrete action:** The exact first thing to do at next session start. Be specific: file, command, or decision. Never write "continue work."
- **Active files:** Files with uncommitted changes or the focus of the last edit (comma-separated).
- **Branch:** Output of `git branch --show-current`.
- **Blockers:** Known unresolved blockers or dependencies. Write "None" if clear.
- **Pending Verification:** One line per non-`succeeded` item from step 1b: `<what> — <state> — <verification action>`. States: `dispatched`, `pending`, `failed`, `unverifiable` (never list a `succeeded` item here — it belongs in `Last completed step` / TODO.md / the journal instead, worded per the gating above). The verification action is required for `dispatched`, `pending`, and `unverifiable` — "N/A" is only valid for `failed`, where the state is already resolved and there is nothing left to check. Write "None" only if step 1b found every dispatched item resolved to `succeeded` or `failed` before this handoff was written.
- **Notes:** Anything time-sensitive, fragile, or contextual that would be lost if not stated explicitly.
```

Rules:

- Do not omit any field. Write "N/A" if not applicable.
- The block header must include the generation date.
- This section is ephemeral — it will be overwritten by the next close-session and consumed by the next open-session.

6. **Update troubleshooting sections** in affected operational docs.
   - If problems were encountered and resolved during the session, add troubleshooting entries to the relevant runbook (e.g., `agents/installation.md`, `security/hardening-checklist.md`).
   - Use the standard format: **Symptom**, **Cause**, **Fix**, **Verify**, **Prevention**.
   - If screenshots were provided during the session, reference them in troubleshooting or journal entries.

7. **Process screenshots** (if provided during the session).
   - **First check `content_sensitivity` in `.arcane.json`.** If it is
     `"sensitive"`, retain no screenshots of repository contents and transcribe
     nothing from them into the journal — record the document path instead. See
     universal-agent-rules.md, "Sensitive Repositories".
   - Screenshots should already be saved to `assets/screenshots/YYYY-MM-DD/` — agents must save them immediately when the user pastes them (see global screenshot rule in `copilot-instructions.md`).
   - At close-session time, review all screenshots saved during the session.
   - Keep only screenshots that provide durable evidence for journal/runbook documentation.
   - Delete duplicates, low-signal images, and any screenshot containing sensitive data (secrets, tokens, PII).
   - Ensure every kept screenshot is referenced in at least one doc (journal entry or troubleshooting section).
   - For journal files under `journal/`, reference via: `![description](../assets/screenshots/YYYY-MM-DD/filename.png)`.
   - Reference in troubleshooting docs with context captions.

8. **Flag documentation drift** discovered while closing the session — stale dates, outdated priorities, contradictions between docs.

9. **Stage and commit session-close docs.**

   **Remote-capability check:** classify the state created by `spell-open-session` before branching, staging, push, or PR operations. Check for **not a repository at all** first — every other classification assumes a `.git` directory exists.
   - **Not a Git repository (EF-05):** `git rev-parse --is-inside-work-tree` fails. Do not attempt any git operation (branch, add, commit, push). Fail closed with: `No Git repository detected. Run \`git init -b main\` first (explicit -b avoids landing on "master" on systems where that's the init.defaultBranch default), then re-run spell-close-session.` This mirrors `spell init`'s own next-steps guidance for the same state.
   - **Usable supported remote/merge path:** requires an authenticated supported provider (`github.com`, `dev.azure.com`, or `visualstudio.com`). Keep the current compliant session/PR/worktree branch, resolve the actual remote name and integration branch, and use the provider-neutral PR path below.
   - **No usable remote/merge path:** remain on the current trunk. Do not create a dead session branch, push, pull, or open a PR. Apply the EF-28 interactive commit approval gate, commit locally on trunk after approval, report `Local-only close: committed on <trunk>; no remote PR/pull performed`, and skip steps 9a, 9c, and 10's remote operations.
   - **Read-only session:** if no repository mutation occurred, do not create a branch or commit.

   a. **Branch check — create a topic branch before any staging:**
   This remote branch path applies only when the remote-capability check found a usable merge path.
   Run `git branch --show-current`. If you are on the resolved integration branch `<trunk>`, create a topic branch **now** before any `git add`:

   ```powershell
   git checkout -b docs/session-close-YYYY-MM-DD
   ```

   Never commit directly to a remotely protected integration branch — the branch policy rejects direct pushes. If a session branch already exists (created by `spell-open-session`), stay on it.

   b. **Stage and apply the interactive commit gate from `spell-commit-work`:**
   - Run `git add -A && git diff --stat --cached` to show what changed.
   - Auto-generate a conventional commit message summarizing the session closure (e.g., `docs(journal): close session — <topic>`).
   - Treat session close as `interaction_context: interactive` unless independently dispatched with validated autonomous authority.
   - Bind structured operator approval to the exact staged diff and proposed message fingerprint. Recompute before commit; any change invalidates approval.
   - Timeout, cancellation, fallback, or delegated response is not approval. Print the visible authorization downgrade and halt without committing.

   c. **Push and open a PR through `spell-commit-work` step 9, including its separate merge gate:**
   - Commit approval is not merge approval.
   - Never invoke merge, auto-complete, or `--status completed` below loader-validated Magus authority.
   - Missing/invalid authority visibly downgrades to PR creation only and requires human completion.
   - Interactive Magus+ completion still requires separate authenticated approval tied to the exact PR ID and head SHA.

10. **Synchronize the configured integration branch after the PR merges (remote path only):**
   - Skip this entire step for local-only and read-only sessions.
   - Resolve `<remote>` and `<trunk>` from observed Git/provider state: use the usable authenticated remote selected in step 9 and the merged PR's target branch (falling back to that remote's default branch). Never assume `origin` or `main`.
   - Verify through the detected provider that the PR is merged before changing branches.
   - Run `git switch <trunk>` followed by `git pull --ff-only <remote> <trunk>`. Do not end a remote-backed session on a topic branch.
    - Delete the local topic branch: `git branch -d <branch>` — if the repository or its linked worktrees might be reached through more than one filesystem view, run the same-vantage-point check first (EF-33 / ARC-028 R7, [governance/git-conventions.md](../../.arcane/governance/git-conventions.md) Same-Vantage-Point Check section).
   - Verify `git log --oneline -3` shows the merged change at HEAD.
    - If stale local branches exist (merged or older than 7 days), list them and suggest cleanup.
    - See [governance/git-conventions.md](../../.arcane/governance/git-conventions.md) Post-Merge Cleanup section.

11. **Return a concise closure report.**

Output format:

## Session Closure

- Summary of what was completed.

## Journal Updates

- Exact file updates made.

## Decision Updates

- ADRs added or note that none were needed.

## TODO Updates

- Exact checklist changes made.

## Drift and Fixes

- Documentation drift found and corrected, or "None."

## Screenshots

- Screenshots saved to `assets/screenshots/YYYY-MM-DD/` with references added to journal/docs, or "None provided."

## PR Readiness

Enumerate the current end state and the prescribed next action. Use this table to classify where the session landed within the provider-neutral lifecycle above:

| End state | Next action |
| --- | --- |
| Local-only trunk, changes committed | Session is integrated locally; no branch or PR cleanup required. |
| Read-only session, no changes | No branch or commit required. |
| Open PR exists | Docs/changes reach `main` when it merges — show the PR URL. |
| No PR + docs-only on a branch | Run `spell-create-pull-request --docs-only`. |
| No PR + mixed code+docs on a branch | Run `spell-create-pull-request` once the feature is complete. |
| Docs-only commit on remote-backed `<trunk>` | Create a `chore/docs` branch, then run `spell-create-pull-request --docs-only`. |
| Nothing ahead of `<remote>/<trunk>` | Branch is fully merged — clean up local/remote branches. |

## Carry Forward

- 3 to 5 concrete next actions.

## What's Next?

Route the user to the right next spell based on the end state:

- **Docs-only commit on remote-backed `<trunk>`** — create a docs branch, then run `spell-create-pull-request --docs-only`.
- **On a feature branch, ready for review** — run `spell-create-pull-request`.
- **On a feature branch, still in progress** — next session, run `spell-open-session` to resume.
- **PR already open** — run `spell-address-review` after reviewers comment.

Rules:

- Do not invent completions — only mark items done if verifiable from context. "Verifiable" means classified `succeeded` under step 1b's five-state vocabulary (`dispatched`/`pending`/`succeeded`/`failed`/`unverifiable`), not merely "I can see it was started" (EF-21).
- Keep frontmatter date values in `YYYY-MM-DD`.
- Preserve existing checklist and journal style.
- Keep edits minimal and factual.
- Never include secrets, API keys, or tokens in any document.
- If a journal entry for this session already exists (same date, same topic), update it rather than creating a duplicate.
