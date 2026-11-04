# 2026-11-04 — Two planning sessions: agent identity (ARC-059) and the presence channel (ARC-060)

Related: [[DECISIONS#ARC-059|ARC-059 — Agent Identity]], [[DECISIONS#ARC-060|ARC-060 — The Presence Channel]], [[DECISIONS#ARC-044|ARC-044 — Client Architecture]], [[features/agent-identity/PRD|Agent identity PRD]], [[features/presence-channel/PRD|Presence channel PRD]], [[git-conventions]].

Two side sessions, each started from the operator's hub planning session, planned the two items that follow the state export in the work order (the hub roadmap's order after its 2026-11-03 re-plan: 1.1 the state export, then the agent-identity record, then 2.1 the presence channel, then 2.2). Both ran `spell-open-session`, then `spell-plan`, settled each PRD's open questions with the operator one at a time, committed with approval and opened a docs-only pull request with `spell-create-pull-request`. The first session was archived without `spell-close-session`, so this entry, written by the second session's close, covers both. Between them, 1.17.2 shipped from another session (the symlink and roster-path hardening, [PR 422](https://github.com/codemagicianhq/arcane/pull/422)); it is recorded in the CHANGELOG and not here.

## Session: agent-identity planning (ARC-059, PR 423)

### Prompt Context

Plan the agent-identity feature with `spell-plan`: the framework half of the operator's agent-identity decision of 2026-09-22 (a private record), placed here by `features/state-export/PRD.md` open question 1. Stable, opaque, typed agent references; the roster v3 write path; the neutral identity export. Planning only: the PRD and a decision record. Bring each open question to the operator one at a time. Read the hub decision and the state-export contract first; use the fictional names of ARC-031.

### What Got Done

1. **Repository state.** Local `main` was behind origin (`0afcd06` → `84a9869`) and was fast-forwarded first. The brief named the record ARC-058; ARC-058 already existed on `main` (README demos, accepted 2026-11-03), so the identity record is **ARC-059**, allocated against the fetched trunk (ARC-050).
2. **`features/agent-identity/PRD.md`** (new): AI-01 to AI-16. Must Have: the `arcane:<type>:<uuid>` reference grammar with `agent` and `template` registered and `session` reserved for the presence channel; roster v3 (`ref`, `slug`, `aliases`, `derived_from`, `binding`); `spell agents sync` as the only v2 → v3 writer, comment-preserving; outputs keyed by slug and alias so a migrated roster renders the same bytes; template references and lineage; state schema `1.1.0` by addition with the `capabilities` descriptor; `resolveRoster` provenance; the `Persona-Ref:` trailer; the scanners' exemption for well-formed references; the naming-convention text.
3. **`DECISIONS.md`: ARC-059 (Proposed)** with thirteen decisions and the four operator answers folded in; table-of-contents row; `features/state-export/PRD.md`'s "not yet filed" dependency repointed; the deferred `spell agents rename` registered in `TODO.md`; the 2026-11-04 state-export handoff marked consumed.
4. **[PR 423](https://github.com/codemagicianhq/arcane/pull/423)** opened, docs only; merged by the operator at 22:15 UTC as `873e7d0` on `main` (a rebase merge: the branch ids `0c59a1e` and `20dc547` exist nowhere on the trunk). Post-merge CI on `main` (run 41923727959) succeeded; checked 2026-11-04 by the closing session.

### Decisions Made

| Record | Decision | Rationale |
| --- | --- | --- |
| [[DECISIONS#ARC-059\|ARC-059]] (Proposed) | Opaque typed references `arcane:agent:<uuidv7>`, roster v3 by write path only, a neutral identity export inside the state schema (`1.1.0`), the capability descriptor, the `Persona-Ref:` trailer | Identity keyed on names is the drift class every consumer would pay for; a reference minted once, with ownership kept out of the string, makes a transfer a new record instead of a re-key; write-path-only migration keeps reads pure |

Operator answers to the PRD's open questions, 2026-11-04: (1) encoding **UUIDv7**, not ULID (a standard with one text form every validator parses); (2) **`spell agents sync` rewrites a v2 roster in place**, `--dry-run` first, over a `migrate` command or `spell update`'s retrofit; (3) the **origin record is reserved only** (shape fixed, nothing written under `~/.arcane` this release); (4) **`spell agents rename` is deferred** (slugs immutable in the first release).

### Open Items Carried Forward

- ARC-059 stays Proposed until the operator accepts it, before the implementing pull request merges (`features/agent-identity/PRD.md` AI-12).
- `spell agents rename <slug> <new name>` — `TODO.md` ("`spell agents rename <slug> <new name>`").
- The ARC-030 decision 2 amendment moving per-machine clone paths out of the committed `registry.json` — `TODO.md` ("Move per-machine clone paths out of the committed `registry.json`"); rides with the identity implementation or right after it.

## Session: presence-channel planning (ARC-060, PR 425)

### Prompt Context

Plan hub roadmap item 2.1, `arcane-mcp` v0 (a working name), with `spell-plan`: the local presence channel of ARC-044 decision 2 and the reporting convention of decision 3. Planning only. Switch to `main` and delete the merged identity branch first, then open the session on `sessions/2026-11-04-arcane-mcp-v0`. Read ARC-044, ARC-059, ARC-031, ARC-037, ARC-042, ARC-045 and ARC-047, both PRDs, the state schema and module, and the four spells that will carry the convention; in the hub, the roadmap's architecture sections, its decision record for the client architecture and the gateway security posture it inherits, and the threat model; read the cockpit's gateway adapter read-only so the contract fits what its `arcane` adapter (1.2) will consume. Settle, one question at a time: packaging, the HTTP and MCP surface, how clients subscribe, authentication, "never writes repository files" and the ephemeral state, presence versus durable state, the convention text, the capability descriptor, the privacy gates, tailnet exposure, the hub's threat-model section, the 2-second acceptance test, and what is out of scope (untracked: the brief's own list of questions, not a deferral). Keep the working names; the final name goes through the Naming Test only when the operator asks. Public-repository rules throughout. When the PRD is approved, ask whether to continue into `spell-architect`.

### What Got Done

1. **Repository state.** `main` fast-forwarded to `873e7d0`; the merged identity branch deleted after a content check (its `DECISIONS.md`, `features/` and `ai-context/` had no diff against `873e7d0`; the `TODO.md` differences were the symlink pull request's additions). Open-session drift check: parity 368/368, decision ids ARC-001 to ARC-059 contiguous, table of contents complete, stale-claims Class A clean. Low notes: `pull.rebase` unset locally; a tool-generated worktree path under `.claude/worktrees/` at a detached HEAD, left alone (ARC-028).
2. **The consumer, read before the contract.** The cockpit's gateway adapter is transport-agnostic (`getAgents`, `getSessions`, `getActiveSessions`, `onEvent`, `healthCheck`, `disconnect`); its live path uses an agent slug (`main` aliased to the orchestrator's slug), a status string, a task and a message; it forces an agent silent for 60 s to idle; it has no snapshot for a late subscriber; it has three adapters (`mock`, `openclaw`, `cli`), not two; and its event bridge is live and tested, not paused. The last two correct the brief, which took its framing from the hub roadmap.
3. **`features/presence-channel/PRD.md`** (new; the folder is named for the thing, not the working name): PC-01 to PC-21. Must Have: one package with zero new dependencies behind `spell presence serve|status|stop|report|end|mcp`, inert until started; the `/v0/` loopback HTTP contract, bearer token on every route, server-sent events with a `server.hello` snapshot, a shipped presence schema; sessions keyed by the checkout's real path with `arcane:session:<uuidv7>` minted by the service; the token file `0600` in a `0700` directory with `ARCANE_PRESENCE_TOKEN` as the override; memory-only presence, stale at 90 s, expired at 24 h; the reporting convention as one fragment in `spell-open-session`, `spell-close-session`, `spell-commit-work` and `spell-implement`; the descriptor `{ observe: true, actions: [] }`; the privacy posture; the threat-model template section; a tested 500 ms budget for the reporter-to-subscriber half of the 2-second test. Won't Have: multi-machine or multi-user presence, hosted sync, actions, auto-start, any listener beyond loopback, the consumers themselves.
4. **`DECISIONS.md`: ARC-060 (Proposed)**, allocated as `max(059 local, 059 on origin/main) + 1`, with twelve decisions, the six operator answers, three questions deferred to implementation and the working-name caveat; table-of-contents row. ARC-044's three open questions (transport, the needs-you shape, naming) close in it.
5. **Gates before the pull request:** `check:stale-claims` Class A, `check:citations`, `check:self-host-parity`, `test/state-decisions.test.ts`, and `spell ward --terms-file ~/.arcane/org-tokens --gate`, which first failed on three PRD lines (lesson below) and passed after the fix. The pre-push suite: 2797 passed, 5 skipped.
6. **[PR 425](https://github.com/codemagicianhq/arcane/pull/425)** opened, docs only; the operator chose to stop at the pull request rather than continue into `spell-architect`. Merged by the operator at 23:12 UTC as `c966d58` on `main`; post-merge CI (run 41931820005) succeeded; checked by this close.
7. **Hand-over** written to the side-session notes folder outside the repository; a memory note records the denylisted product name.

### Decisions Made

| Record | Decision | Rationale |
| --- | --- | --- |
| [[DECISIONS#ARC-060\|ARC-060]] (Proposed) | The presence channel ships as one package behind `spell presence`, with a loopback HTTP + server-sent-events contract under `/v0/`, checkout-keyed sessions minted by the service, a user-store token file with an environment override, memory-only state with stale and expiry clocks, an operator-started foreground process, the CLI reporter as the convention's path with MCP tools as equivalents, an observe-only descriptor, nothing leaving the machine, and `arcane-mcp` kept as a working name | Zero new dependencies and inert-until-started meets ARC-044's "no new mandatory dependency" inside a twelve-day window; a CLI reporter is the one path every harness and cron has; one checkout is already one unit of work (ARC-028); a loopback capability is not the remote credential the keychain rule was written for; memory-only is the literal form of "reconstructable, never authoritative" |

Operator answers, 2026-11-04: (1) **one package, zero new dependencies**; (2) **CLI command; MCP tools as equivalents**, the MCP stdio server in v0 as a Must; (3) **keyed by checkout; the service mints**; (4) **user-store file plus environment override**; (5) **memory only, with stale and expiry clocks**; (6) **operator-started foreground process**.

### Lessons Learned

#### A hub product name is a leak in a public document, even when the hub uses it in the open

The PRD named the mobile companion by its product name in three sentences, because the hub roadmap does. `spell ward --gate` refused all three: the name is on the private denylist and occurs nowhere else in this repository, so the sentence that reads naturally in the hub is a finding here. The fix was ARC-044's own wording, "the mobile companion", and the gate passed. The cockpit's name and the Showstone's are not on the list and already appear in `project.md` and the decision log. The lesson is to grep a new public document for hub product names before the gate runs, and to prefer the role of a thing ("the mobile companion", "the cockpit") to its name whenever the name is not already in this repository.

#### Read the consumer's code, not the roadmap's description of it, before freezing a contract

The brief described the cockpit's bridge as paused and its adapters as two; a read-only pass over the cockpit found the bridge live and tested, three adapters, a 60-second idle rule and no snapshot for late subscribers. Each of those changed the contract: the feed opens with a snapshot event, the stale clock is documented against the consumer's shorter timeout, and the record carries the slug and the context-qualified aliases the consumer keys on. A roadmap sentence is a plan's view of a component; the component's code is what the contract has to fit.

#### A trailing `echo $?` turns a background command's exit code into zero

The push ran in the background as `… && git push …; echo "push exit: $?"`, so the task's own exit code was the `echo`'s, and the notification said the command completed with exit 0 whether or not the push did. The actual result had to be read from the output file. The state-export journal already records the same trap for pipelines (`| tail`); the rule extends to any trailing command: let the command you care about be the last one, and read its exit from the output when it cannot be.

### Open Items Carried Forward

- The operator accepts ARC-060 (or revises it); then `spell-architect` on `features/presence-channel/PRD.md`; then the implementation of roadmap item 2.1 before train T3 (2026-12-02), with the Showstone (2.2) following — `TODO.md` ("Presence channel (ARC-060): accept the record, architect it, implement roadmap item 2.1 before T3").
- The Naming Test for `arcane-mcp` — `TODO.md` ("Run the Naming Test for `arcane-mcp`"); not run, because the operator did not ask.
- The hub's threat-model instance document gains its "Local presence service" section before the implementing release ships; registered in the hub's own `TODO.md` on 2026-11-04 and named as a dependency in the PRD.
- A ward pass over a new document before it is presented — `TODO.md` ("Run the ward gate over a new PRD or document before presenting it").
- The identity session's carry-forwards above (`spell agents rename`, the ARC-030 amendment) stay open.
