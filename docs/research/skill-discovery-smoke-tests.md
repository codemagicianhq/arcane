---
title: Skill Discovery Smoke Tests — Codex, Claude Code, and the Read-and-Follow Shim Mechanism
audience: both
last_updated: 2026-09-09
status: active
tags: [research, distribution, codex, claude-code, skills, smoke-test, codex-support]
sources: [a live empirical test performed 2026-09-09 against installed codex-cli 0.153.4, this session's own Claude Code available-skills listing (system reminder, 2026-09-09), IDEAS.md I13, docs/research/delivery-channels-smoke-tests.md]
---

# Skill Discovery Smoke Tests

## Summary

CS-00 of [docs/plans/codex-support/PLAN.md](../plans/codex-support/PLAN.md). Three of the program's
open technical questions were resolved by direct, live observation rather than general knowledge —
two of them by finding and running the real `codex-cli` binary already installed on this machine,
which turned out to be reachable even though it is not on `PATH`.

- **Both `.agents/skills/` and `.codex/skills/` work as Codex's repo-level skill location — CS-01's
  original plan to target `.agents/skills/` alone was already correct.** A live `codex exec` run
  against a disposable probe repository loaded skills from both paths side by side, distinguishing
  them correctly by their own (author-supplied) descriptions. No collision, no precedence conflict
  observed with two probes present simultaneously.
- **Codex also reads the user-level `~/.agents/skills/` directory** — confirmed as a side effect of
  the same run: a real, pre-existing skill at `~/.agents/skills/azure-app-onboard/` was picked up
  (and logged a parse error unrelated to our work). This directly validates CS-04's plan to fan the
  user tier out to `~/.agents/skills/`, with no need to *also* target `~/.codex/skills/`.
- **The exact "read `<path>` and follow it" shim mechanism CS-01/CS-03 depend on works, end to end,
  for a repo-root-relative path.** A second probe skill instructed Codex to read a file at a bare
  repo-relative path (not relative to the skill's own directory) and follow it as a workflow; Codex
  read it via a real shell command and executed the instructions inside verbatim. This is direct
  evidence for AC2, stronger than the "does it appear in a listing" bar the PRD set.
- **Claude Code reads user-level `~/.claude/skills/` but did not surface user-level
  `~/.agents/skills/` in this session**, despite the latter directory holding several real,
  well-formed skills on this machine. This is evidence *for this session's configuration only* (see
  caveat below), not a documented behavior guarantee.
- **Not verified, and explicitly out of scope for this pass:** the Codex *VS Code extension*'s own
  picker UI, and VS Code Copilot Chat's prompt/agent-file and multi-root duplication behavior.
  Neither can be driven from a non-interactive session; both require the operator's own client.
  Deferred to CS-04's own acceptance check (AC5), where multi-root duplication is actually
  decision-relevant — CS-01 does not touch the Copilot surface at all.

**Confidence caveat, stated directly:** the Codex findings are empirical observations from one live
test session against `codex-cli 0.153.4` on this machine, not from Codex's own published
documentation (none was found locally — see Environment below). A version change could alter this
behavior with no announcement, exactly the caveat `delivery-channels-smoke-tests.md` recorded for
its own VS Code findings. Re-run before treating either as permanent, per that file's own precedent.

## Findings

### Environment and setup

- `codex-cli 0.153.4`, installed as the OpenAI Codex desktop app on this machine. **Not on `PATH`**
  in either Bash or PowerShell (`codex --version` fails not-found in both), but the real binary
  exists at `C:\Users\payini\AppData\Local\OpenAI\Codex\bin\8e5b6932251c2c1c\codex.exe`, matching
  the `CODEX_CLI_PATH` value already recorded in `~/.codex/config.toml`'s `mcp_servers.node_repl.env`
  block — this is how it was located, not a guess.
- Disposable probe repository under the session scratchpad (not this repo), a real git repo
  (`git init`), containing at various points: `.codex/skills/arcane-probe-alpha/SKILL.md`,
  `.agents/skills/arcane-probe-beta/SKILL.md`, `.agents/skills/arcane-probe-gamma/SKILL.md`, and a
  root-level `REFERENCE-TARGET.md`.
- Invocation: `codex exec --cd <probe> --sandbox read-only --skip-git-repo-check "<prompt>"` — the
  CLI's own non-interactive mode, `--sandbox read-only` so no invoked skill could mutate anything
  beyond a local shell read.
- **No local documentation found** describing Codex's skill search paths or precedence order: no
  matching `.md` anywhere under the Codex install directory (only one unrelated `README.md`, for a
  bundled Node runtime); no mention of "project skill" / "repo skill" wording anywhere under
  `~/.codex/` outside the probe files this session created. The behavior below was determined
  entirely by running the real binary, not by reading a spec.

### Test 1 — repo-level discovery, both candidate paths at once

Prompt: *"List every skill or custom capability you currently have loaded or available in this
session, by exact name... Include ones from any source: system, user-level, project-level, or
plugin-provided."*

Relevant lines from the real, complete response (52 skills total — see full transcript in this
session's tool history; both probes are reproduced verbatim, nothing paraphrased):

```
- `arcane-probe-alpha` — Diagnostic skill-discovery probe (project `.codex/skills`).
- `arcane-probe-beta` — Diagnostic skill-discovery probe (project `.agents/skills`).
```

Both appeared, each correctly attributed to the path its own description named — Codex did not
merge or confuse them. The response also carried a genuinely useful, previously-unknown constraint:

> "Skill descriptions were shortened to fit the skills context budget. Codex can still see every
> skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for
> the rest."

**This is a real scaling risk worth flagging to CS-01/CS-04, not just a curiosity:** this operator's
machine already has ~50 real skill/plugin entries before Arcane adds 41 more. A skill's
`description` is exactly the field Codex uses for its own selection reasoning — a truncated
description on a spell whose one-line summary was already tight (some Arcane spell descriptions run
long, e.g. `spell-full-cycle`'s) could degrade Codex's ability to pick the right spell. Not blocking
CS-01, but worth a short mention in CS-01's PR description and revisited if the operator reports
Codex picking the wrong spell in practice.

### Test 2 — user-level discovery (found as a side effect, not deliberately staged)

The same run's stderr carried:

```
ERROR codex_core::session::session: failed to load skill C:\Users\payini\.agents\skills\azure-app-onboard\deploy\SKILL.md: missing YAML frontmatter delimited by ---
ERROR codex_core::session::session: failed to load skill C:\Users\payini\.agents\skills\azure-app-onboard\prepare\SKILL.md: missing YAML frontmatter delimited by ---
ERROR codex_core::session::session: failed to load skill C:\Users\payini\.agents\skills\azure-app-onboard\scaffold\SKILL.md: missing YAML frontmatter delimited by ---
```

`azure-app-onboard` lives only under the user-level `~/.agents/skills/` (confirmed present via a
prior directory listing this session, never placed in the probe repo) — so Codex attempted to load
it from the user tier, and failed on that skill's own malformed frontmatter (a pre-existing defect
in a third-party skill, irrelevant to Arcane, but informative: **the frontmatter parser requires a
literal `---`-delimited block**, matching the exact assumption `spell-compiler.ts`'s
`parsePromptFrontmatter` already makes — no format surprise for `renderCodexSkill()` to account
for). The well-formed sibling skills at the same user-level path (`azure-ai`, `airunway-aks-setup`,
`appinsights-instrumentation`) all appeared correctly in Test 1's listing. Together this confirms
user-level `~/.agents/skills/` discovery unambiguously — CS-04 needs no `~/.codex/skills/` target.

### Test 3 — the read-and-follow shim mechanism, end to end

This is the load-bearing test for CS-01 and CS-03's actual design, not just a discovery check.
`arcane-probe-gamma`'s body read:

> "Read the file at `REFERENCE-TARGET.md` (a path relative to the repository root / current working
> directory, NOT relative to this skill's own directory) and follow it as the complete workflow."

`REFERENCE-TARGET.md`, at the probe repo's root, instructed: respond with an exact marker string
and do nothing else. Prompt: *"Use the arcane-probe-gamma skill now."* Full, unedited response:

```
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command "Get-Content -Raw 'REFERENCE-TARGET.md'" in <probe path>
 succeeded in 239ms:
# Reference Target
...
MARKER-7f3a2c-CONFIRMED: repo-root-relative reference resolved correctly.
```

Codex read the skill body, issued a real shell command to read the referenced file **using the
bare repo-relative path exactly as written — no path rewriting, no resolution relative to the
skill's own directory** — and then followed the referenced file's instructions verbatim, with no
extra commentary and no side effects. This directly validates the shim body design in the approved
plan ("This skill is the Arcane `{id}` spell. Read `{canonicalPath}` and follow it as the complete
workflow.") for both today's `canonicalPath` (`.github/prompts/{id}.prompt.md`) and CS-03's later
one (`.arcane/spells/{id}.md`) — both are repo-root-relative, exactly the form just proven to work.

### Test 4 — Claude Code (this session), by direct inspection of its own available-skills listing

No probe repo needed — this session's own system-reminder listing at conversation start already
answers half of CS-00's Claude Code question:

- `parametric-3d-printing` appears in this session's available-skills list. Confirmed (via a prior
  `Get-ChildItem`) to exist only at `~/.claude/skills/parametric-3d-printing/SKILL.md` — no
  equivalent exists in this repository or anywhere else on this machine. **Claude Code (this
  session's configuration) reads user-level `~/.claude/skills/`.**
- None of the three real, well-formed skills at `~/.agents/skills/` used in Tests 1-2
  (`airunway-aks-setup`, `appinsights-instrumentation`, `azure-ai`) appear anywhere in this same
  listing, despite `azure-ai`'s frontmatter being directly inspected and confirmed valid (`name`,
  `description`, `license`, `metadata` — not a parse failure). **This session did not surface
  `~/.agents/skills/` content.**
- This repository's own `.claude/commands/spell-*.md` files (41 of them) appear in the *same*
  available-skills list, invoked through the same `Skill` tool used throughout this session
  (`spell-open-session`, `spell-check-drift`, `spell-plan`, `spell-scope` were all invoked this way
  earlier in this session) — confirming Claude Code's harness treats a `.claude/commands/*.md`
  prompt stub and a real `SKILL.md`-directory skill as the same kind of invocable thing. This is
  reassurance, not a new decision: CS-03's plan to keep the Claude surface as a generated
  `.claude/commands/{id}.md` stub (unchanged mechanism, new source) needs no rethinking.

**Caveat, stated as plainly as the Codex one:** this is one session's observed configuration, not a
documented Claude Code guarantee — `.agents/skills/` support could be gated behind a setting this
session doesn't have enabled, could vary by Claude Code version, or could simply not exist as a
discovery path at all in this harness. Sufficient to inform CS-01's decision (don't also emit a
Claude-format file at `.agents/skills/` — nothing currently listens there), insufficient to treat as
permanent platform behavior.

### Not tested — explicitly deferred, with reasons

| Question | Why deferred | Where it's picked up |
|---|---|---|
| Codex VS Code extension's own skill picker UI | No running VS Code instance to drive from this non-interactive session; the extension shares the same `codex_core` engine namespace seen in Test 2's error log, so behavior is *expected* to match the CLI, but this is inferred, not observed | Operator's own quick check, or CS-04's acceptance pass if it becomes decision-relevant |
| VS Code Copilot Chat discovery + multi-root duplication count | `code` binary exists but nothing to drive; Copilot's surface is entirely unchanged by CS-01 (Codex-only epic) — this question is actually decision-relevant at CS-04/AC5, not CS-01 | CS-04's own acceptance check (two-folder workspace, count `/spell-*` entries) |
| `chat.promptFilesLocations` / `chat.agentFilesLocations` / `chat.agentSkillsLocations` accepting a `~` path | Same as above — a VS Code settings behavior, not exercised by anything CS-01 ships | CS-04, when the settings snippet is designed |
| Machine-level skill paths (`/etc/codex/skills` etc.) | Out of scope per PRD's Won't Have — recorded here as documented-only, never exercised | N/A — deferred indefinitely per PLAN.md |

## Implication for CS-01

No design change needed. The approved plan's decision — Codex's repo path is `.agents/skills/`
only, `.claude/commands` stays untouched — is now **empirically confirmed**, not merely assumed.
The one addition worth making: `renderCodexSkill()`'s body should stay terse (Test 1's context-budget
finding), and CS-01's PR description should note the skills-context-budget constraint so a future
session isn't surprised if the operator reports a truncated description in practice.
