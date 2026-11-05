# 2026-11-05 — The presence channel: architected and built (1.18.0, not yet merged)

Related: [[DECISIONS#ARC-060|ARC-060 — The Presence Channel]], [[DECISIONS#ARC-059|ARC-059 — Agent Identity]], [[features/presence-channel/architecture|presence channel architecture]], [[2026-11-04-identity-and-presence-planning]].

## Session: presence channel architect and implementation (PRs #433, #434, #435)

### Prompt Context

A side session started from the ops-hub session with one task: open a session in this repository and run `spell-architect` on `features/presence-channel/PRD.md`, basing the architecture on ARC-060 — The Presence Channel and ARC-059 — Agent Identity. The stories had to cover every ARC-060 decision, make each of the hub threat-model section's fifteen controls testable, fit the 2026-11-09 to 2026-11-20 build window ahead of train T3 (2026-12-02), and answer or assign ARC-060's three deferred questions. Commits only with the operator's approval.

The operator then:

- approved the architecture commit and asked for the PR ("Approve, open PR");
- answered the architecture's question Q1 ("Yes, amend it"), approved that commit and its PR;
- merged both, then asked for the whole implementation to run autonomously overnight, with any questions asked up front. Before leaving, the operator answered four: commit each story, push and open one PR without asking; stop at a green PR and do not merge (merging publishes 1.18.0); keep the two readings (a 21-line `needs_you` is refused; byte-identity is tested through the reporter's silence); mark a stuck story and continue, never changing a decision record without them.

### What Got Done

1. **Architecture and stories**: `features/presence-channel/architecture.md` (23 decisions, the control traceability table, a schedule) and `stories.json` (PS-01 to PS-16). Merged as [PR #433](https://github.com/codemagicianhq/arcane/pull/433), `main` `6d367fd`.
2. **ARC-060 decision 13** (the operator's answer to Q1): on a v2 roster the agent block is filled from the entry (`slug` = its id; `ref` null, `aliases` []). Merged as [PR #434](https://github.com/codemagicianhq/arcane/pull/434), `main` `510f283`.
3. **All sixteen stories implemented** on `claude/feat/presence-channel`, one commit per story, in [PR #435](https://github.com/codemagicianhq/arcane/pull/435): the reference module, the presence schema and twin, the session table, validation, the token store, the HTTP server and event feed, `serve | status | stop | report | end | mcp`, the v2 agent seam and harness table, the timing test on three OSes, the dual-era MCP server, the `presence-report` fragment in four spells, the threat-model template section, the control-evidence suite, and the README, CHANGELOG, PRD and TODO updates. Version 1.18.0.
4. **Latency, measured** (report process start to event at a loopback subscriber, p95 of 20): local macOS 149 ms against 500; CI ubuntu 142, macOS 251, Windows 468 against 1000.
5. **An independent review** by a subagent found seven defects; all are fixed with tests in `58e5bf7` (EPERM pid, the hello cap, a second `serve` on another port, the connection-check interval, MCP id and era handling, `stop` without a token, a post-listen server error).
6. **CI on #435**: all seven checks green on run 42013918550 (stories PS-01 to PS-12). Run 42016564388 (the review fixes) failed one test, which exposed a real race in `serve`: it printed its "listening" line before installing its signal handlers, so a SIGTERM sent at once killed it outright. Fixed in `af73b64` (handlers installed first). The CI result for the final push is in the handoff's Pending Verification, because this entry is committed before that run.
7. **Full suite locally**: 3,031 tests pass in the pre-push run of the review fixes; `npm run test:coverage` passed every threshold (93.8 % lines overall; `auth.ts` and `store.ts` at the 95 % tier).

### Decisions Made

No new decision record. Three choices taken inside ARC-060 and put to the operator in the PR description: the MCP server serves both the legacy `initialize` handshake and the 2026-07-28 per-request protocol; caps of 256 sessions and 32 aliases added to decision 3's limits; the harness table holds only the row that was observed.

The operator's answers, the morning of 2026-11-05: the dual-era MCP server and the two caps are accepted. The harness choice rested on a wrong premise. The overnight check was `which codex copilot`, which looks only at `PATH`. Codex (the ChatGPT app, `~/.codex` and the `openai.chatgpt` VS Code extension), Copilot in VS Code and the GitHub Copilot app are all installed on this machine. Their rows still needed an observation from a real shell of each harness (architecture D8). With the operator running a names-only probe in each app, the rows were added the same morning: `CODEX_CI=1` for Codex, and `COPILOT_AGENT=1` (VS Code) or `COPILOT_CLI=1` (the Copilot app) for Copilot. A plain VS Code terminal sets none of them (`progress.txt`, iteration 20).

### Lessons Learned

#### The current MCP revision had moved on from the record

ARC-060 named `initialize` and five methods. The specification read on the day (2026-11-05) makes 2026-07-28 current, which has no handshake and requires `server/discover`. A server built to the record alone would have failed every client on the current revision. The story's rule, "read the spec on the day, assert nothing from memory", is what caught it. A framework-shaped lesson: a decision record that names an external protocol's methods should name the revision it was written against.

#### The repository-wide secrets scan reads identifiers, not values

`npm run build` and the pre-commit hook flag any upper-case identifier containing the word TOKEN when it is followed by an equals sign or a colon and eight more characters, in any file. An environment-name constant, a file-name constant and a test's environment object all tripped it while this feature was built (and so did the first draft of this very paragraph, which quoted them). Lowercase keys (`PRESENCE_ENV.token`, `STORE_FILES.token`) and computed keys in tests avoid it. Worth knowing before naming anything token-related here.

#### The Write tool turns ` ` into the character itself

U+2028 is a line terminator inside a JavaScript regular-expression literal, so a pattern meant to match it broke the parse. Build such patterns with `new RegExp("...")` and a doubled backslash, and grep for the literal character after writing.

#### The first real Windows ACL check disagreed with the record's wording

ARC-054 decision 3's restriction is described as "restricted to the current account". On `windows-latest` the token file keeps explicit entries for SYSTEM and the Administrators group as well (the default DACL). Both can override any ACL, so the posture holds, but the wording does not; the template and the test now say so.

#### An independent review found what the author's tests did not

Seven defects survived sixteen stories of the author's own tests, the worst a token sent to whatever held a stale port when the recorded pid belonged to another account. The reviewer saw the code, not the author's reasoning.

#### A signal handler installed after the ready line is a race

`serve` printed "listening" and then installed its SIGTERM handler; a test (or a supervisor) that signals on that line can win, and a signal with no handler kills a Node process outright. Install handlers before announcing readiness. The regression test written for it states the requirement but did not reproduce the race on a fast machine; the fix rests on the cause.

#### A failed lint in a `&&` chain skipped the build

A built-CLI test then ran the old `dist/` and failed for a reason unrelated to the code under test. Build on its own line before built-CLI tests.

### Open Items Carried Forward

- PR #435 is open and not merged; merging it publishes 1.18.0 (`TODO.md`, "Presence channel (ARC-060): accept the record, architect it, implement roadmap item 2.1 before T3 (2026-12-02).").
- The lesson routing above: the operator said yes on 2026-11-05, and the two framework-shaped lessons (the MCP revision and the secrets scan) are queued in `FEEDBACK.md` under "Feedback — Arcane workflow (2026-11-05)".
- Harness rows: Codex and Copilot added the same morning; OpenClaw is unobserved and reports `other` until it is observed on the Ubuntu machine.
- Registered in `TODO.md`: PC-17 to PC-21, the on-disk v3 alias test, the orchestrator-default re-read, marking ARC-060 shipped after the merge, and the stories-key drift.
- For the hub (its own records): the two further threat-model surfaces and the Windows ACL wording.
