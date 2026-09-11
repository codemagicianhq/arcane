---
title: Skill Discovery Smoke Tests — Codex, Claude Code, and the Read-and-Follow Shim Mechanism
audience: both
last_updated: 2026-09-10
status: active
tags: [research, distribution, codex, claude-code, skills, smoke-test, codex-support, user-tier]
sources: [a live empirical test performed 2026-09-09 against installed codex-cli 0.153.4, this session's own Claude Code available-skills listing (system reminder, 2026-09-09), IDEAS.md I13, docs/research/delivery-channels-smoke-tests.md, a second live codex exec run 2026-09-09 against a consumer installed from the 1.0.0 build (CS-03), the same session's Skill invocation of spell-status through the regenerated .claude/commands stub, VS Code's prompt-files documentation fetched 2026-09-09, two further live codex exec runs at the USER tier (a probe skill 2026-09-09 and the real `spell init --user` output 2026-09-10, CS-04), VS Code's AI settings reference and agent-skills documentation fetched 2026-09-09, Claude Code's skills and common-workflows documentation checked 2026-09-09]
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
- **Re-confirmed after CS-03's canonical move (2026-09-09, see the last section):** Claude Code's `@`
  include and Codex's read-and-follow shim both resolved the relocated `.arcane/spells/<id>.md` on the
  first attempt; VS Code Copilot remains a one-minute operator check, with the fallback named.

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

## CS-03 re-confirmation (2026-09-09) — after the canonical move

`docs/plans/codex-support/PLAN.md`'s Definition of Done item 3 requires the clients to be re-checked
by direct observation once the canonical source moved to `.arcane/spells/<id>.md` and every client
file became a generated shim (ARC-045; shipped as `1.0.0`). Same evidence bar as above: the client's
own behavior, never the filesystem.

### Claude Code — observed in the session that shipped the move

Invoking `spell-status` through the regenerated `.claude/commands/spell-status.md` (a `description`,
a title, the sentence "See the full prompt at `.arcane/spells/spell-status.md`", and the include line
`@.arcane/spells/spell-status.md`) loaded the full canonical body into the session: the harness
resolved the `@` include and returned the spell's Executive Summary, Steps 0–6, Output and Rules
sections, none of which exist in the stub. The workflow then ran normally (the read-only snapshot
line). Same mechanism as before the move with only its target changed; it worked on the first
invocation after `npm run fix:self-host-parity` regenerated the root copies.

### Codex CLI — `codex exec` against a consumer installed from the new build

A disposable consumer repository under the session scratchpad was initialized with the built `1.0.0`
CLI (`spell init --profile full`: 41 canonical files, 41 Copilot shims, 41 Codex skills; the init
summary reads `✨ 41 Spells (Copilot, Claude Code, Codex)`). Its
`.agents/skills/spell-status/SKILL.md` body is the regenerated one:

> This skill is the Arcane `spell-status` spell. Read `.arcane/spells/spell-status.md` and follow it as the complete workflow.

Invocation — unchanged from Test 3 except for the prompt, and `< /dev/null` (see the note below):

```
codex exec --cd <consumer> --sandbox read-only --skip-git-repo-check \
  "Use the spell-status skill, but do NOT run its workflow. Instead reply with exactly three lines:
   (1) the relative path of the file the skill told you to read, (2) that file's first line
   beginning with '## ' verbatim, (3) the literal text CS03-EV01-DONE."
```

Complete stdout:

```
.arcane/spells/spell-status.md
## Executive Summary
CS03-EV01-DONE
```

`## Executive Summary` is the canonical file's first heading and appears nowhere in the skill file, so
Codex read the file the shim named, at the bare repository-relative path — exactly the behavior Test 3
predicted for this path shape. The tool trace on stderr shows the two reads it issued, in order: the
skill file itself, then

```
exec
"C:\Program Files\PowerShell\7\pwsh.exe" -Command "Get-Content -Raw '.arcane\spells\spell-status.md'" in <consumer>
```

— a shell read of the canonical file at the relative path the shim named, no path rewriting. stderr carried the same two pre-existing, unrelated items as Test 1
(the malformed third-party `azure-app-onboard` skills under `~/.agents/skills/`, and the
skills-context-budget truncation warning) and nothing about `spell-status`.

**Operational note for anyone repeating this:** `codex exec` reads additional input from stdin when
stdin is neither a terminal nor closed. Launched from a background shell it printed `Reading
additional input from stdin...` and waited indefinitely (killed after roughly ten minutes); with
`< /dev/null` it completed in well under a minute. The CS-00 runs never hit this because they ran in
the foreground.

### VS Code Copilot — not driven; what the operator should check

The Copilot shim carries the canonical frontmatter block verbatim (so the `/spell-*` picker entries
and their descriptions are byte-identical to before the move), then one paragraph with a relative
Markdown link (`../../.arcane/spells/<id>.md`, resolved from the prompt file's own location per VS
Code's prompt-file documentation) and the read-and-follow sentence. That documentation, fetched
2026-09-09, lists `name`/`description`/`argument-hint`/`agent`/`model`/`tools` as the recognized
fields and says relative links resolve from the prompt file, but does **not** state whether a linked
file's content is attached automatically — so the shim carries both mechanisms, and every spell runs
`agent: agent`, which gives the model a file-read tool regardless. No non-interactive path exists to
drive Copilot Chat from this session, exactly as CS-00 recorded.

**Operator check (a minute in VS Code, in this repository or any `1.0.0` consumer):** open Copilot
Chat in agent mode, run `/spell-status`, and confirm the response is the snapshot line (branch,
counts, last session) rather than a paraphrase of the shim sentence. If it is the paraphrase, the
Copilot renderer falls back to an inlined body for that client only — the `render()` mode variance
ARC-045 allowed for — and nothing else in the design changes.

## CS-04 (2026-09-09/10) — the user tier: probes before the design, the real install after it

CS-04 (`docs/plans/codex-support/PLAN.md`, "CS-04 — User tier install") puts one copy of the spells at
`~/.arcane/spells/<id>.md` and fans a client file per spell out to each client's *home-directory*
discovery root, each naming the spell's **absolute** path. Whether a client follows a home-level file
to an absolute path outside its working directory is the load-bearing question, so it was asked of the
real clients before anything was built, and asked again of the shipped command afterwards. Same
evidence bar as every section above: the client's own behavior, never the filesystem.

### Probe 1 — Codex, user-level skill, absolute path, empty working directory (2026-09-09, before the design)

A probe skill at `~/.agents/skills/arcane-probe-user/SKILL.md` whose body read: *"Read
`C:/Users/…/scratchpad/cs04-probe/target/cs04-user-target.md` (an absolute path, outside the current
working directory) and follow it as the complete workflow."* The target file (under the session
scratchpad, nowhere near the working directory) instructed: respond with one marker line and nothing
else. Invocation, from an **empty** directory:

```
codex exec --cd <empty dir> --sandbox read-only --skip-git-repo-check "Use the arcane-probe-user skill now." < /dev/null
```

Complete stdout: `MARKER-CS04-ABS-PATH-CONFIRMED`. The trace shows exactly two reads, in order — the
skill file, then the absolute target — both via `Get-Content -Raw '<path>'` with the forward-slash
Windows path used verbatim, no rewriting. The probe skill was removed afterwards (directory listing
back to its 28 pre-existing entries). This settled the Codex fan-out shape: `renderCodexSkill()`
output with an absolute canonical path.

### Probe 2 — Claude Code, personal command, absolute `@` include: not observable from this session

A personal command at `~/.claude/commands/arcane-probe-user.md` carrying `@<absolute path>` to a
second target file was written and invoked two ways. The running session's own Skill tool answered
`Unknown skill: arcane-probe-user` — its skill list is fixed at startup, so a command file written
mid-session cannot be reached from inside that session. A nested `claude -p "/arcane-probe-user"`
(and a plain `claude -p "Reply with PONG"`) from an empty directory answered `Not logged in · Please
run /login`: the winget-installed CLI keeps a separate credential store from the desktop app this
session runs in, and signing a tool in is not something an agent session does. The probe file was
removed, and the directory it had created (`~/.claude/commands` did not exist before the probe) was
removed once empty at the end of the work.

What the documentation says, recorded as documentation and not as observation (checked 2026-09-09):
`@` file paths "can be relative or absolute"; `~/.claude/commands/<command-name>.md` files are
"available across all your projects on that machine"; and when a personal and a project command
share a name, "personal takes precedence over project". The design does not lean on the include
alone: the user-level Claude stub carries the read-and-follow sentence *and* the `@` include, exactly
as the repo-tier stub does, so an include that failed to inline would degrade to the file-read path
Codex was proven to take. The live check is the operator's (Q-005, below).

### What VS Code's documentation said (fetched 2026-09-09) — and what it changed

- The AI settings reference marks `chat.promptFilesLocations`, `chat.agentFilesLocations`,
  `chat.agentSkillsLocations` and `chat.instructionsFilesLocations` **deprecated** — each entry reads
  "This setting and the Local agent will be removed in a future release" — and points prompt-file users
  at a migration to agent skills.
- The agent-skills page lists the discovery locations: `.github/skills`, `.claude/skills`,
  `.agents/skills` in a workspace and `~/.copilot/skills`, `~/.claude/skills`, `~/.agents/skills` for
  the user; `chat.useAgentSkills` defaults to `true`; "Type / in the chat input field to see a list of
  available skills".

Consequences, recorded as premise corrections in `features/codex-support/architecture.md` (CS-04,
finding 2): the settings snippet the plan intended to print would recommend a setting the vendor has
announced it will remove, for a location Copilot already covers without any setting — so the user tier
prints a note saying no setting is needed, and never touches `settings.json`; and because Copilot also
scans `~/.claude/skills`, the Claude Code file went to `~/.claude/commands/<id>.md` rather than
`~/.claude/skills/<id>/SKILL.md`, so Copilot does not list every spell twice.

### EV-01 — the shipped command, in the real home directory (2026-09-10)

Built CLI (`node dist/index.js`, the CS-04 tree before its version bump), operator's actual home,
baseline recorded first: `~/.agents/skills` held 28 third-party entries, no `~/.arcane`.

`spell init --user` printed the tier summary (`✨ 41 Spells → C:\Users\…\.arcane/spells/ · 🔗 82
client files → ~/.agents/skills (Codex, Copilot), ~/.claude/commands (Claude Code)`), then `Wrote 82
client file(s): 41 Codex/Copilot skills, 41 Claude Code commands.`, the Clients note (no VS Code
setting needed; Claude Code precedence) and two next steps. On disk: 41 store spells, 41 skills, 41
commands. `~/.agents/skills/spell-status/SKILL.md`:

> This skill is the Arcane `spell-status` spell. Read `C:/Users/payini/.arcane/spells/spell-status.md` and follow it as the complete workflow.

Then, from the same **empty** directory as Probe 1 — no repository, no repo-tier files anywhere near
it:

```
codex exec --cd <empty dir> --sandbox read-only --skip-git-repo-check \
  "Use the spell-status skill, but do NOT run its workflow. Instead reply with exactly three lines:
   (1) the exact path the skill told you to read, (2) that file's first line beginning with '## '
   verbatim, (3) the literal text CS04-EV01-DONE." < /dev/null
```

Complete stdout:

```
C:/Users/payini/.arcane/spells/spell-status.md
## Executive Summary
CS04-EV01-DONE
```

`## Executive Summary` exists only in the canonical file; the trace shows the two reads
(`~/.agents/skills/spell-status/SKILL.md`, then `~/.arcane/spells/spell-status.md`, both
`Get-Content -Raw`). `spell status --user` then reported the nine `spells-*` components, `Scope: user —
C:\Users\…\.arcane`, `Client files: 82 (41 Codex/Copilot skills, 41 Claude Code commands)`; `spell
doctor` (run in this repository) showed `✓ [pass] User tier (ARC-045)`. `spell uninstall --user --yes`
printed `Removed 82 client file(s) no longer needed.` and `Uninstalled the user tier — 41 spells and
82 client files removed.`; afterwards `~/.agents/skills` was back to its 28 entries with no `spell-*`,
and `~/.arcane` was gone (nothing else lived in it). The tier was uninstalled on purpose: installing it
for keeps changes which copy of every `/spell-*` Claude Code runs in every repository on the machine
(personal over project), and that is the operator's call — Q-005 asks for it.

### Q-005 — what the operator should check (a few minutes, once)

1. `spell init --user` (any `1.1.0`+ CLI), then in **Claude Code**, from a directory that is *not* an
   Arcane repository, run `/spell-status`: the snapshot line (branch/none, counts) rather than a
   paraphrase of the stub means the absolute `@` include (or the read-and-follow sentence) resolved.
2. In **VS Code Copilot Chat**, open a folder that is *not* an Arcane repository, type `/` and confirm
   `spell-status` is listed; run it. (Inside an Arcane repository that still carries its own shims,
   seeing the entry twice — the repo prompt and the user skill — is expected until CS-05's repo
   opt-out.)
3. If either client paraphrases instead of running the spell, the remedy is the same `render()` mode
   variance ARC-045 allowed for — an inlined-body renderer for that client's user-level file — a small
   follow-up, not a redesign. Record the result on the queue entry either way.

## CS-05 (2026-09-10) — which tier's `/spell-*` actually runs, and the opt-out that settles it

CS-05 gives a repository a way to stop carrying its own spells
(`spell_scope: "user"`). Its motivation had always been stated as picker clutter across a
multi-root workspace. Designing it produced a sharper reason, observed rather than argued.

### Observation — with both tiers present, the answer is per-command

In the session that designed CS-05, this repository carried its own `.claude/commands/spell-*.md`
(each including `@.arcane/spells/<id>.md`, a repository-relative path) **and** the machine had the
user tier installed, whose personal commands at `~/.claude/commands/spell-*.md` include the
**absolute** `@C:/Users/<name>/.arcane/spells/<id>.md`. The two are distinguishable by exactly that
line, so which file the harness loaded is visible in its own output.

Minutes apart, in one session:

| Invocation | Include the harness expanded | Which tier |
|---|---|---|
| `/spell-open-session` | `.arcane/spells/spell-open-session.md` | project |
| `/spell-full-cycle` | `C:/Users/payini/.arcane/spells/spell-full-cycle.md` | **user** |

Claude Code's documentation states that a personal command takes precedence over a project command
of the same name. What was observed is that with both tiers installed the effective answer varied
between two commands in a single session. No cause was established and none is claimed here — the
point for CS-05 is narrower and does not depend on one: **while two tiers both own a command name,
which copy runs is not something an operator can predict from the documentation alone.** A
repository that opts out has no project copy, so there is nothing to resolve.

Two things follow. First, this is the strongest argument the program has produced for the opt-out,
and it is about correctness rather than tidiness. Second, it is the first **live** confirmation that
a personal command's absolute `@` include resolves and loads the canonical body — which CS-04 could
only take from documentation, and which `OPERATOR-QUEUE.md` Q-005 still asks the operator to confirm
deliberately, in a clean-room check rather than as a side effect of a working session.

### EV-01 — the opt-out end to end, with the built CLI

Two disposable repositories beside one user tier in a stubbed home (full transcript and the
`spell_scope` design in `features/codex-support/architecture.md`, "CS-05"):

- Both installed `--profile lite`: **160** spell paths each (40 canonical + 120 shims).
- One repository set `spell_scope: "user"` and ran `spell update`: `160 tracked files are no longer
  managed here — reviewing.`, the orphan list, and the reason line naming the user tier. **Nothing
  deleted**, and the working tree stayed clean.
- `spell update --prune`: that repository went to **0** spell paths with no empty directories left
  behind; the other stayed at **160**; governance (3 docs) was untouched in both.
- `spell doctor` in the opted-in repository: `✓ [pass] Spell scope (ARC-045)`, exit 0. With the store
  removed: `✗ [FAIL]` naming the store path and `spell init --user`, **exit 1** — the one blocking
  user-tier check, because an opted-in repository with no store has no spells in any client.
  `spell status` said `Scope: repo (spells: user tier)` and flagged the missing store.

### Incidental, unrelated to spells: `spell doctor` can hang on Windows

The EV-01 run stalled past five minutes until the cause was found: `checkVSCodeExtension` looks for
extensions under `process.env["HOME"]` only, and when neither `.vscode/extensions` nor
`.vscode-insiders/extensions` is there it shells out to `code --version` and then
`code-insiders --version`. On this machine that spawn does not return — measured directly at
**>25s before a hard kill**, twice per run. `HOME` is routinely unset on Windows (where the home
directory is `USERPROFILE`), so an ordinary consumer running `spell doctor` from PowerShell or
cmd.exe reaches that path every time. Filed in `TODO.md`; not fixed in CS-05, which owns none of
that code.

## 2026-09-11 — the operator counts the pickers: how the two tiers actually compose

Q-004 and Q-005's client checks were run by the operator on their own machine (both pass; recorded on
the queue). Counting the pickers while doing so produced the first real evidence of how repository and
user-tier entries **compose**, which neither CS-00 nor CS-04 had measured — both reasoned about one
tier at a time. Four configurations were observed at once, which is what makes the rules readable.

### What was observed

| Where | Arcane version | On disk | VS Code Copilot shows, per spell |
|---|---|---|---|
| empty folder (no repo) | — | nothing | one entry, from the user tier |
| `kiubo-mexico` | `1.2.0` | `.github/prompts` + `.agents/skills` + `.claude/commands` + `.arcane/spells` | **two**: `/Spell-Status` and `/spell-status` |
| `ops` | `0.38.3` | `.github/prompts` + `.claude/commands`, **no** `.agents/skills` (that location predates 0.39.0) | **two**: `/Spell-Status` from the repo, `/spell-status` from `~/.agents/skills` |
| `arcane-ui` | `0.35.1` | `.github/prompts` + `.claude/commands` | one Title-case entry from the repo |
| `kiubo` + `arcane-ui` in one workspace | — | — | **three**: two Title-case (one per folder), one lowercase |

### The two rules that explain all of it

1. **The two Copilot surfaces are independent, and every repo-tier install at `0.39.0`+ populates
   both.** `.github/prompts/<id>.prompt.md` is a *prompt file*; `.agents/skills/<id>/SKILL.md` is an
   *agent skill*; VS Code discovers both. They render differently because the shims carry different
   frontmatter by design: the prompt shim copies the canonical block verbatim, so VS Code names it
   from `name: Spell — Status` (hence Title case) and describes it from `description`; the skill
   renders `name: spell-status` and uses `claude_description` (hence the "Use PROACTIVELY" wording).
   Same spell, same body, two entries. Filed as a `TODO.md` MEDIUM with two candidate fixes that point
   in opposite directions, so it is an ADR question rather than a patch.
2. **Skills deduplicate by name across locations; prompt files do not deduplicate across workspace
   folders.** Inferred, but from three independent observations that agree: `ops` (no repo skill)
   showed the lowercase entry resolving to `~/.agents/skills`; `kiubo` (repo skill *and* user tier
   present) showed exactly **one** lowercase entry, resolving to the repository's copy; and adding a
   second folder added a second **Title-case** entry while the lowercase count stayed at one.
   Workspace skill beats user skill for the same name, and the user tier is invisible wherever a
   repository supplies the same skill.

**The consequence worth carrying forward:** the per-folder duplication this program was opened to fix
is specifically a **prompt-file** problem. Agent skills already collapse to one entry machine-wide on
their own. That makes CS-05's opt-out — which removes the repository's prompt file — the mechanism
that actually fixes it, and it means the user tier alone would not have.

### Agents, by contrast, do not collapse

The same two-folder workspace showed each of the 12 Arcanos **twice**, one per folder
(`.github/agents/adelaide.agent.md` in each). Custom agent files are per-folder with no dedup
observed, they have no user tier yet, and `spell update` does not touch them at all — they are
roster-generated by `spell agents init`/`sync`, not registry-distributed (the `agent-files` component
was retired). Verified on disk: `kiubo` and `arcane-ui` each have 12 agent files and an
`.arcane/agents.yaml`; `ops` has **neither**, which is why it showed no agent modes — it has simply
never run `spell agents init`, not a regression from any upgrade. This is CS-06's subject, and this
section is the measurement it should be designed against.
