---
title: "PRD: The presence channel — `arcane-mcp` v0"
status: draft
implementation_status: planned
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
source_intake: operator hub roadmap item 2.1 (private record), re-planned 2026-11-03; ARC-044 decisions 2 and 3
created: 2026-11-04
decision: ARC-060 (Accepted 2026-11-04)
---

# PRD: The presence channel — `arcane-mcp` v0

> `arcane-mcp` is the working name ARC-044 gave this component and it stays a working name here:
> the final name goes through the Naming Test (`spell-scry`) before the release that ships it, and
> nothing below depends on the word. The feature folder, the command (`spell presence`) and the
> user-store directory are named for what the thing is, so the Naming Test changes a label, not a
> path.

## Problem Statement

Files cannot carry "right now". The state export shipped in 1.17.0
([ARC-044](../../DECISIONS.md#arc-044--client-architecture-files-first-state-contract-and-a-local-presence-channel)
decision 1, [features/state-export/PRD.md](../state-export/PRD.md)) gives every client one
versioned document of durable state, but which session is working on what at this moment, whether
it is waiting for its operator, and what it needs are facts no Arcane-managed file holds and none
should: a session that wrote its own status into a repository would be a second writer of the
source of truth, the shape ARC-040 and ARC-044 both rejected. ARC-044 decision 2 accepted a thin,
ephemeral, local presence channel for exactly those facts, and decision 3 a reporting convention
for spells. Neither is built. Read in the tree on 2026-11-04: there is no `src/commands/presence.ts`;
no fragment under `src/assets/.arcane/spells/_fragments/` reports anything; `src/index.ts` registers
no command that listens on a port; and the only live presence any client can show is one harness's
own gateway.

Two consumers wait on it, in this order. **The Showstone** (hub roadmap item 2.2, train T3,
2026-12-02) lights a face within 2 s of a session start, sourced from this channel; it gates the
reveal train. **DMC's `arcane` adapter** (item 1.2, T4, 2027-01-06) reads Layer 1 from
`spell state --json` and Layer 2 from this channel and replaces `mock` as the default for real
installs. Contract-first (hub roadmap §2.4): this contract lands in `arcane` first, then the
consumers; item 2.1's own window is 2026-11-09 to 2026-11-20.

What the previous item left for this one (ARC-059 consequences, read 2026-11-04): the reference
grammar with `session` reserved for this channel to mint; the capability descriptor and its
`open` / `resume` / `instruct` vocabulary, which every presence source declares; `origin` and
`definition_revision` on every resolved profile, so a session snapshot records the revision it
started with; aliases qualified by context, so a harness's `main` resolves without a global map;
and the `Persona-Ref:` trailer to correlate commits with the agent that made them.

What the first consumer actually reads (read in DMC on 2026-11-04, nothing changed there): its
gateway adapter interface is transport-agnostic (`getAgents`, `getSessions`, `getActiveSessions`,
`onEvent`, `healthCheck`, `disconnect`); its live path uses only an agent slug, a status string, a
task and a message; it forces any agent silent for 60 s to idle; it has no snapshot for a late
subscriber; and its event bridge is live and tested, not paused (the hub roadmap's "today's
WebSocket bridge, generalized" describes what this channel replaces as a source, not a paused
component). Two corrections to the brief this PRD was planned from, both checked: DMC has three
adapters (`mock`, `openclaw`, `cli`), and no DMC document calls the bridge paused.

## Target Users

- **The Showstone and DMC's `arcane` adapter:** one authenticated loopback feed of session
  records and events, with a snapshot on subscribe, so a face lights within 2 s and a late
  subscriber starts from the current state.
- **Spells, in every harness and in cron:** one command that reports task start, progress and
  "needs you", is silent when no channel is configured, and never blocks the spell.
- **AI sessions that read presence** (an orchestrator asking who is working where; an open-session
  pass in a repository with several checkouts): the same facts as MCP tools and resources.
- **Operators:** one process to start, one file to protect, nothing listening until they say so,
  nothing leaving the machine, and a threat-model section that says exactly that.
- **The mobile companion, later:** the same feed over Tailscale Serve, unchanged, when the operator exposes
  it (hub ADR-007's posture).

## Requirements

Identifiers are `PC-NN` so `spell-architect` can carry them into stories. Open questions 1 to 6
were decided by the operator on 2026-11-04 and are folded in; each requirement names the one it
rests on.

### Must Have

- **PC-01 — One package, zero new dependencies (open question 1).** Everything ships inside
  `arcane-cli` behind `spell presence <subcommand>`: the service, the reporter and the MCP surface.
  The loopback API is `node:http`; the MCP surface is a hand-written JSON-RPC 2.0 server over
  stdio; references are minted by the module ARC-059's AI-01 specifies. No new runtime dependency
  (ARC-037 decision 8). A plain install gains only inert commands: nothing listens, nothing is
  written anywhere, and no client's MCP configuration is touched until the operator runs
  `spell presence serve` and registers the MCP server in their own client (the posture of #328,
  which retired the shipped `.mcp.json` scaffold). There is no registry component, because
  nothing is installed into a repository.
  - *Acceptance:* `package.json`'s `dependencies` are unchanged; `spell init` on every profile
    installs the same file set as 1.17.1 plus the fragment inside the four spells of PC-11; a
    fresh install with no `~/.arcane/presence/` directory runs `spell presence report` with exit 0
    and no output.
- **PC-02 — The service and its lifecycle (open question 6).** `spell presence serve [--port <n>]
  [--rotate]` binds `127.0.0.1` only (no host or bind flag exists), prints the URL once, runs in
  the foreground until `SIGINT` or `SIGTERM`, and writes under `~/.arcane/presence/` and nowhere
  else: `token` (PC-06) and `server.json` (`{ url, pid, port, started_at, generator }`, removed on
  a clean exit). The default port is a constant (`27226`, overridable by `--port` or
  `ARCANE_PRESENCE_PORT`); a port already in use exits 1 with the port named. `spell presence
  status` reads `server.json`, calls `/v0/health` with the token, prints URL, pid, version and the
  session count, and exits 0 when reachable, 1 when not. `spell presence stop` signals the pid
  from `server.json` and exits 0 whether it stopped a service or found none. No command ever
  starts the service as a side effect; running it as a user service (launchd, `systemd --user`,
  Task Scheduler) is the operator's, with one documented example each.
  - *Acceptance:* `serve` on a free port writes exactly the two files with the modes PC-06
    requires and removes `server.json` on `SIGTERM`; `status` exits 1 before `serve` and 0 after;
    a second `serve` on the same port exits 1 naming it; binding is verified by connecting to the
    machine's non-loopback address and being refused.
- **PC-03 — The loopback HTTP contract.** Every route is under `/v0/`, speaks JSON, and requires
  `Authorization: Bearer <token>`; a missing or wrong token is `401` with an empty body; the only
  unauthenticated response is that `401`. Routes: `GET /v0/health` → `{ ok, generator, contract,
  capabilities, sessions, started_at }`; `POST /v0/sessions/report` with a report (PC-05) → `201`
  with the new record or `200` with the updated one; `POST /v0/sessions/end` with
  `{ checkout: { path } }` → `200` with the ended record or `404`; `GET /v0/sessions` → `{
  capabilities, generated_at, sessions: [record] }` (active and stale, never expired); `GET
  /v0/sessions/{session}` → the record or `404`; `GET /v0/events` → the feed (PC-08). Limits: a
  body over 64 KiB is `413`; every one-line string is truncated to 256 characters; `needs_you`
  carries at most 20 lines; no CORS headers (subscribers are processes, not browser origins; a
  web client proxies through its own server, as DMC's bridge does today); no `Host` check (Tailscale
  Serve rewrites it).
  - *Acceptance:* a route table test covers every route with and without the token; the `413`,
    the truncation and the line cap each have a test; a request from a `curl` with an `Origin`
    header gets no `Access-Control-*` header.
- **PC-04 — The session record and its vocabulary (open question 3).** A session is one checkout
  plus the agent it reports as. The checkout key is the worktree's real path (`resolveRealPath`,
  ARC-057); the first report from a checkout makes the service mint `arcane:session:<uuidv7>`
  (ARC-059 decision 1's reserved type, minted here and nowhere else); later reports from the same
  checkout update that record; `end` or expiry closes it and the next report mints anew. The
  record: `session`; `agent` (`ref`, `slug`, `name`, `origin`, `definition_revision`, `aliases`,
  from `resolveRoster`, every field `null` or `[]` when the roster is v2 or the session names no
  agent); `harness` (`claude-code` | `copilot` | `codex` | `openclaw` | `cron` | `other`);
  `repository` (`root`, `name`, `remote` as the state export's `git.remote` or `null`);
  `checkout` (`path`, `branch`, `linked_worktree`); `spell`; `task`; `message`; `status`;
  `needs_you` (a list of `{ action, reason }`); `started_at`, `reported_at`, `ended_at`;
  `stale`. Status is one of `working` (a spell is running), `waiting` (the session asked the
  operator for something: a question or a Needs you block), `blocked` (cannot proceed for an
  external reason), `idle` (open, no spell running), `done` (ended). `stale` is set by the
  service alone (PC-07) and leaves `status` as last reported; a client renders a stale session as
  unknown, never as working. The record has a JSON Schema (draft 2020-12, `$id`
  `https://arcaneai.net/schemas/presence/v0`, shipped as `schemas/presence.schema.json` beside the
  state schema) that fixture records validate against in the test suite, with the same
  devDependency the state schema uses.
  - *Acceptance:* two reports from one checkout yield one record with one reference; `end` then
    `report` yields a second reference; a report from a second worktree of the same repository
    yields a second record; `parseRef` accepts what the service mints; every fixture record
    validates; a report with an unknown status is `400` naming the field.
- **PC-05 — The reporter (open question 2).** `spell presence report --status <status>
  [--task "<line>"] [--spell <id>] [--message "<line>"] [--needs-you "<line>"]... [--agent <slug>]
  [--harness <id>]` and `spell presence end`. The reporter resolves the repository from the
  manifest (`readManifest`; outside an Arcane repository it is silent and exits 0), the checkout
  from `git rev-parse` through `runGit` with its timeout, the agent from `resolveRoster`
  (`--agent` names a slug or an alias in any context; without the flag, the roster's orchestrator
  entry when it has one, else `null`), and the harness from `--harness`, else a best-effort read
  of the environment, else `other`. It reads the token (PC-06), posts to the URL in
  `server.json`, and prints nothing on success. **The silence rule:** with no `server.json`, or a
  service that does not answer `/v0/health`, the command prints nothing and exits 0; with a service
  that answers and refuses the report (`401`, `400`, `413`), it prints one line to stderr and
  still exits 0. It never blocks a spell, never writes a repository file, and no flag takes a token
  value.
  - *Acceptance:* in a fixture repository with no channel, `report` and `end` exit 0 with empty
    stdout and stderr; with a running service, `report` creates the record the schema expects;
    `--agent main` resolves the `openclaw` alias to the entry's slug on a v3 fixture; a wrong token
    file yields one stderr line and exit 0; `report` outside an Arcane repository exits 0 silently.
- **PC-06 — Authentication (open question 4).** `spell presence serve` generates a 32-byte random
  token on first start and writes it to `~/.arcane/presence/token`: on POSIX the directory is
  `0700` and the file `0600`; on Windows the file's access is restricted to the current account
  and the write is refused when that restriction fails (the file rule of ARC-054 decision 3).
  `--rotate` replaces it. Readers, in order: `ARCANE_PRESENCE_TOKEN` when set (the SecretRef a
  subscriber such as DMC's server or a cron runner is given), else the file. No command accepts a
  token as an argument, no log line prints one, and the service compares tokens in constant time.
  Tailnet exposure is the operator's Tailscale Serve in front of the loopback port (hub ADR-007's
  posture); the token is still required there, and nothing in this iteration binds beyond
  loopback.
  - *Acceptance:* the modes are asserted on POSIX and the ACL on Windows (CI); a `report` with
    `ARCANE_PRESENCE_TOKEN` set to the wrong value and a correct file is refused (the variable wins,
    the file never silently rescues it); `--rotate` invalidates a subscriber's open feed on its
    next request; `grep` of the test logs finds no token.
- **PC-07 — Ephemeral state (open question 5).** Sessions live in process memory only. A session
  with no report for 90 s is marked `stale` and a `session.stale` event is emitted; its next report
  clears the flag with `session.resumed`. A session silent for 24 h is expired, dropped from the
  snapshot and announced with `session.expired`. A restart starts empty; the next report from each
  checkout re-creates its session. The service writes only `token` and `server.json` (PC-02),
  never a repository file, never a session journal, never a log of payload bodies. Presence is
  reconstructable from `spell state --json` and never authoritative (ARC-044 decision 2): nothing
  any client needs to be correct lives only here.
  - *Acceptance:* with a test clock, a report then 90 s of silence emits `session.stale` and the
    snapshot shows `stale: true`; 24 h emits `session.expired` and the snapshot omits it; a
    restarted service answers `/v0/sessions` with an empty list; a filesystem watch during a
    full test run sees writes under `~/.arcane/presence/` only.
- **PC-08 — The event feed.** `GET /v0/events` is `text/event-stream`. The first event is
  `server.hello` with `{ contract, capabilities, sessions: [record] }`, so a subscriber, and a
  reconnecting one, starts from the current state. Then one event per change, each carrying the
  full record: `session.started`, `session.updated`, `session.needs_you` (the `needs_you` list
  changed), `session.stale`, `session.resumed`, `session.ended`, `session.expired`. A `:
  keepalive` comment is sent every 15 s. Events are ordered per session; there is no replay
  (`Last-Event-ID` is ignored, because `server.hello` carries the state). A subscriber's
  disconnect frees its slot; the service accepts at least 16 concurrent subscribers.
  - *Acceptance:* a subscriber test client receives `server.hello` with the existing sessions,
    then one event per reporter call in order; a reconnect receives a fresh `server.hello`; 16
    subscribers each receive every event.
- **PC-09 — The MCP surface (open question 2).** `spell presence mcp` is an MCP server over stdio
  (newline-delimited JSON-RPC 2.0): `initialize` with protocol-version negotiation, `ping`,
  `tools/list`, `tools/call`, `resources/list`, `resources/read`. Tools: `presence_report` with
  the reporter's arguments and `presence_end`; both forward to the running service through the
  loopback API with the same token file, so there is one state, and both return a plain result
  that says "no presence channel is configured on this machine" when the service is absent.
  Resources: `arcane://presence/sessions` (the `GET /v0/sessions` document) and
  `arcane://presence/capabilities` (PC-10). The server never spawns the service, never writes a
  file, and never reads a repository file the reporter would not read. Registration is the
  operator's, in their client's own MCP configuration (for example Claude Code's user-scope
  `claude mcp add`); Arcane documents the three clients and writes none of their files.
  - *Acceptance:* a protocol test drives the stdio server through `initialize`, `tools/list`,
    `tools/call` for both tools and `resources/read` for both resources with a running service,
    and gets the "not configured" result without one; an unknown method is a JSON-RPC
    `-32601`; a malformed line never kills the process.
- **PC-10 — The capability descriptor.** The service declares `capabilities: { observe: true,
  actions: [] }` on `/v0/health`, in `server.hello`, in the snapshot envelope and as the MCP
  capabilities resource (ARC-059 decision 10). The `open` / `resume` / `instruct` vocabulary is
  not extended in this iteration; ARC-060 settles ARC-059's open question by saying the vocabulary
  is extended by decision record, not by a vocabulary file. A client renders a control only for a
  declared action; this iteration is observation only, by contract.
  - *Acceptance:* the descriptor appears in all four places with exactly that value; the
    presence schema's `actions` enum is the three words and a fixture with another word fails.
- **PC-11 — The reporting convention (ARC-044 decision 3).** One shared fragment,
  `_fragments/presence-report.md`, compiled by ARC-039 into `spell-open-session`,
  `spell-close-session`, `spell-commit-work` and `spell-implement`, rendered to every client
  shim without per-spell prose. Its text is the example at the end of this document. It tells a
  spell to report `working` with the spell id and the task at its start, `waiting` with the
  lines of any `## ⚠ Needs you` block it emits, `working` with what is now happening at a
  checkpoint (a commit, a story passed), and to run `spell presence end` when the session closes;
  to use the CLI only, never a token on the command line, never a repository write; and that
  when no channel is configured the spell behaves exactly as before. Enforcement is explicitly
  advisory prose (ARC-023).
  - *Acceptance:* `check:self-host-parity` and `check:spell-catalog` pass; the four spells and
    their generated shims carry the fragment markers; no other spell changes; a spell run in a
    fixture repository with no channel produces byte-identical output to 1.17.1.
- **PC-12 — Privacy posture (ARC-044 decision 5, ARC-031, ARC-037).** Nothing leaves the machine:
  the service makes no outbound request, binds loopback only, and exposure beyond it is the
  operator's Tailscale Serve with the token still required. Presence payloads on the operator's
  own loopback are the operator's own data and may name real ventures, repositories and machine
  paths; the gates apply to what this repository ships and to what ever leaves the machine: every
  fixture, snapshot, test, document and example here uses the fictional names of ARC-031 and the
  org-token scan runs over the presence fixtures in the test suite (as ST-11 does for the state
  export); a pushed projection (hub roadmap 2.9, a later record) passes the venture-name and
  org-token gates and strips `repository.root` and `checkout.path` (the ARC-030 decision 6 class)
  before anything is sent. The service logs by session reference, status and event name only;
  it never logs `task`, `message` or `needs_you` text.
  - *Acceptance:* the leak-scan test passes over all presence fixtures; a log-capture test with a
    denylisted word in a task shows the word in no log line.
- **PC-13 — The threat-model template section.** `src/assets/.arcane/governance/threat-model.md`
  (and its root dogfood copy) gains a "Local presence service" section: the asset (presence
  state: agent, task, repository and checkout names, needs-you text; business-private); the
  actors (a local process without the token; a compromised AI session posting forged presence;
  a tailnet peer when exposed); the surfaces and mitigations (loopback bind with no bind option;
  bearer token from a `0600` file in a `0700` directory or a SecretRef, never an argument; no
  repository writes and no writes outside `~/.arcane/presence/`; memory-only state; no shell
  execution and no file reads beyond its own store; body, line and subscriber limits; no CORS;
  Tailscale Serve as the only remote path; a forged report can mislead a dashboard and change
  nothing, because presence is never authoritative); and the git-hook note: the reporter is
  invoked by prompts, never by a git hook, `spell presence` is never installed into `.husky/` or
  `.arcane/hooks/`, so a hook cannot be made to report or exfiltrate. The hub's instance document
  fills the same section with its verified controls before 2.1 ships (Dependencies).
  - *Acceptance:* both copies carry the section; parity passes; `check:stale-claims` passes;
    the section's status column says `Planned` until the implementing release and the hub's
    review change it.
- **PC-14 — The 2-second budget and its test.** The hub milestone is "a Claude Code session shows
  up live in DMC within 2 s of starting a spell", measured by a recorded clip from a session start
  to a lit face (the hub's and 2.2's). This repository owns the first half and budgets it: from
  the start of the `spell presence report` process to the arrival of its event at a loopback
  subscriber, p95 at or under 500 ms over 20 runs on a developer machine and at or under 1 s on
  each CI runner, leaving the adapter and the render more than a second. An integration test
  spawns the built CLI's service on a free port with a temporary home, subscribes, runs the
  reporter from a fixture repository 20 times and asserts the percentile; the measured numbers are
  printed in the test output and recorded in the CHANGELOG entry.
  - *Acceptance:* the test runs on the three CI operating systems; a timing regression fails it.
- **PC-15 — The decision record.** ARC-060 is filed as Proposed with this PRD and accepted by
  the operator before the pull request that implements it merges (the repository's accept-at-PR
  rule). It records open questions 1 to 6, the wire contract, the session key, the token
  posture, the ephemeral rule, the vocabulary rule, the privacy posture and the working-name
  caveat.
  - *Acceptance:* `DECISIONS.md` carries ARC-060 with the status this PRD's pull request
    proposes; `check:stale-claims` Class A passes.
- **PC-16 — Release notes, version, README.** A CHANGELOG entry under ARC-060 with the measured
  budget; a minor bump by `spell-bump`; a README section "Presence" of one paragraph and the
  three registration examples; the fragment noted in the open-session paragraph the state export
  added.
  - *Acceptance:* `check:changelog`, `check:version-bump` and `check:demos` pass.

### Should Have

- **PC-17 — `spell presence sessions [--json]`.** The snapshot as a table for a human and as the
  `GET /v0/sessions` document for a program; exit 1 with the status wording when no channel is
  configured.
  - *Acceptance:* snapshot of the table on a fixture with two sessions; `--json` validates.
- **PC-18 — Every Needs you block reports.** The `needs-you` fragment gains one sentence: when a
  presence channel is configured, report `waiting` with the block's lines, so the eighteen spells
  that render the block report it without carrying the whole convention. Kept out of Must Have
  so v0's prompt change stays four spells wide.
  - *Acceptance:* parity and the catalog check pass; a spell with the fragment and no channel is
    byte-identical to before.
- **PC-19 — MCP resource subscriptions.** `resources/subscribe` on the sessions resource and
  `notifications/resources/updated` driven by the service's feed, so an MCP client sees changes
  without polling.
  - *Acceptance:* the protocol test subscribes, reports through the loopback API and receives the
    notification.
- **PC-20 — A `spell doctor` row.** "Presence service" reports reachable or not, the token file's
  mode, and a `server.json` whose pid no longer runs (a stale file after a crash, removed with
  `--fix`); a missing directory is a silent pass, because the channel is optional.
  - *Acceptance:* the three states have tests; `--fix` removes only the stale file.
- **PC-21 — Open-session reads presence.** One sentence in the Workspace Health Check: when a
  channel is configured, list the sessions reporting from this repository's other checkouts, so
  ARC-028's footprint check has live data.
  - *Acceptance:* prose only; parity passes.

### Won't Have (this iteration)

- Multi-machine or multi-user presence ("Swarms"), hosted synchronization, the cloud relay and
  the pushed projection (hub roadmap 2.9), and Layer 3. ARC-044 decision 5 and hub ADR-101
  decision 5 reserve them for later records.
- Any action: `open`, `resume` and `instruct` stay vocabulary; `actions` is `[]`, and no route,
  tool or event lets a client steer a session.
- DMC's `arcane` adapter (1.2), the Showstone (2.2) and the mobile companion. They consume this.
- A bind or host flag, TLS, or any listener beyond loopback: remote reach is Tailscale Serve.
- Auto-start, `--detach` or daemonization: a user-service example is documented instead
  (open question 6).
- Persistence across restarts, a session journal, replay or `Last-Event-ID` (open question 5).
- Serving `spell state --json` through MCP or HTTP; clients run the command. Prompts, sampling
  and other MCP capabilities beyond tools and resources.
- A registry component, an install step, or a write to any client's MCP configuration.
- Per-agent or per-client tokens: one token per machine; scopes are a later record if a
  multi-user shape ever needs them.
- Running the Naming Test: `arcane-mcp` stays the working name until the operator asks for the
  scry.
- A web view or any rendering of presence inside the CLI beyond PC-17's table.

## Constraints

- **Technical:** TypeScript CLI, commands in `src/commands/` and modules in `src/modules/`,
  registered in `src/index.ts`; Node 18 or later, so `node:http`, `node:crypto` and the
  reference module carry everything and no runtime dependency is added (ARC-037 decision 8);
  every git read through `runGit` with its timeout; every path by real path (ARC-057); the
  session key is the worktree's real path, so a linked worktree is its own session (ARC-028);
  the presence schema is additive-only from its first stable version, like the state schema;
  tests with the existing runner and the fixture builders the state export added; CRLF-safe
  parsing of the token file; Windows ACL handling reuses ARC-054's file rule.
- **Business:** item 2.1's window is 2026-11-09 to 2026-11-20 and the Showstone consumes the
  feed by T3 (2026-12-02), so the contract (PC-03, PC-04, PC-08, PC-10) is frozen first and the
  Should Haves are the first things split off; a minor release train of its own, not held for
  the agent-identity release unless both are ready together.
- **Decision records:** one new record, ARC-060 (PC-15). It extends ARC-044 (decisions 2 and 3,
  and its three open questions: transport, the needs-you shape, naming) and consumes ARC-059
  (the `session` type, the descriptor, provenance, aliases); it amends neither.
- **Security:** the threat-model template section (PC-13) and the hub's filled instance are
  required before the implementing release ships (hub ADR-101 consequence); loopback only;
  token never on a command line or in a log; the service executes nothing and reads nothing
  outside its store and the reporter's own inputs; limits on body, line and subscriber counts.
- **Privacy of this document:** fictional names of ARC-031 only; no venture, customer or
  machine name; the private hub record is cited, never quoted.

## Acceptance Criteria

- [ ] `package.json` dependencies unchanged; every profile's install set is 1.17.1's plus the
      fragment; `spell presence report` in a fresh install is silent and exits 0 (PC-01).
- [ ] `serve` binds loopback only, writes `token` and `server.json` with the required modes,
      removes `server.json` on `SIGTERM`; `status` and `stop` behave as specified (PC-02).
- [ ] Every `/v0/` route is covered with and without the token; `413`, truncation and the line
      cap are tested; no CORS header is ever sent (PC-03).
- [ ] One checkout, one session; `end` then `report` mints a new reference; a second worktree is
      a second session; every fixture record validates against the shipped presence schema
      (PC-04).
- [ ] The reporter is silent and exits 0 without a channel and outside an Arcane repository;
      `--agent` resolves slugs and aliases; a refused report is one stderr line and exit 0
      (PC-05).
- [ ] Token file modes on POSIX and the ACL on Windows are asserted; the environment variable
      wins over the file; `--rotate` works; no token in any log (PC-06).
- [ ] `stale` at 90 s and expiry at 24 h under a test clock; a restart starts empty; the only
      writes during the suite are under `~/.arcane/presence/` (PC-07).
- [ ] `server.hello` carries the snapshot; events arrive in order; 16 subscribers each get every
      event (PC-08).
- [ ] The stdio MCP server passes the protocol test for both tools and both resources, with and
      without a service (PC-09).
- [ ] `capabilities` is `{ observe: true, actions: [] }` in all four places (PC-10).
- [ ] The fragment is in exactly the four spells and their shims; parity and the catalog pass; a
      run without a channel is byte-identical to 1.17.1 (PC-11).
- [ ] The leak scan passes over presence fixtures; no payload text reaches a log (PC-12).
- [ ] Both threat-model copies carry the section; parity passes (PC-13).
- [ ] The timing test passes on the three CI operating systems and its numbers are in the
      CHANGELOG (PC-14).
- [ ] ARC-060 is in `DECISIONS.md` and accepted before the implementing pull request merges;
      `check:stale-claims` Class A passes (PC-15).
- [ ] `check:changelog`, `check:version-bump`, `check:demos`, `check:self-host-parity` and
      `check:spell-catalog` pass (PC-16).

## Dependencies

- [ARC-044](../../DECISIONS.md#arc-044--client-architecture-files-first-state-contract-and-a-local-presence-channel) —
  decisions 2, 3 and 5 are what this builds; its open questions close here.
- [ARC-059](../../DECISIONS.md#arc-059--agent-identity-opaque-typed-references-roster-v3-by-write-path-only-and-a-neutral-identity-export)
  (Proposed) and [features/agent-identity/PRD.md](../agent-identity/PRD.md) — the reference
  module (AI-01) mints `arcane:session:`; `resolveRoster`'s provenance (AI-07) and the descriptor
  (AI-08) are what the record carries. Sequencing: the hub's order is the identity ARC first; if
  2.1 starts before AI-01 has merged, 2.1 builds the shared reference module to AI-01's
  specification and AI-01 adopts it, so neither waits on the other's release.
- [ARC-057](../../DECISIONS.md#arc-057--managed-paths-stay-inside-the-target-directory-by-real-path) —
  real paths for the checkout key and the store writes.
- [ARC-054](../../DECISIONS.md#arc-054--sign-in-from-the-cli-standard-openid-client-keychain-first-storage-split-session-token) —
  decision 3's file rule, reused for the token file.
- [ARC-045](../../DECISIONS.md#arc-045--one-spell-source-thin-client-shims-and-a-user-level-install-tier) /
  [ARC-047](../../DECISIONS.md#arc-047--agents-are-roster-rendered-not-registry-distributed-and-get-a-user-tier) —
  the user tier the store lives in and the roster precedence the reporter resolves through.
- [ARC-039](../../DECISIONS.md#arc-039--build-time-spell-compiler-generated-client-stubs-and-shared-prose-fragments) —
  the fragment mechanism PC-11 and PC-18 use.
- [ARC-031](../../DECISIONS.md#arc-031--fictional-venture-names-for-examples-and-a-repository-wide-privacy-gate) /
  [ARC-037](../../DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop) —
  the gates PC-12 applies and the zero-extra-install posture PC-01 keeps.
- [features/state-export/PRD.md](../state-export/PRD.md) — the Layer 1 contract presence is
  reconstructable from; `git.remote`'s shape is reused in the record.
- **Hub, before the implementing release ships (the hub registers it; hub ADR-101's consequence):**
  the operator's threat-model instance document gains the "Local presence service" section with
  these contents verified on the operator's machine: the asset row for presence state; the three
  actors; the mitigation rows for loopback bind (confirmed by a refused connection from a
  non-loopback address), the token file's mode and owner, the `ARCANE_PRESENCE_TOKEN` SecretRef
  where a subscriber uses one, the absence of any repository write (a filesystem watch during a
  session), memory-only state, the limits, Tailscale Serve as the only remote path if exposed and
  the tailnet ACL review for it; the git-hook note; and a security audit-log entry for the first
  start. The hub's row stays `Planned` until each control is checked there.
- **Downstream, not dependencies:** DMC's `arcane` adapter (1.2) and the Showstone (2.2) consume
  the feed. Three facts recorded for them from the DMC read of 2026-11-04: the adapter keys on an
  agent slug, so it reads `agent.slug` and resolves `main` through `aliases`; DMC forces an agent
  idle after 60 s of silence while this service marks a session stale at 90 s, so the adapter
  re-emits the last known state on `: keepalive` or DMC lengthens its timeout for this adapter;
  and DMC has no snapshot for late subscribers, which `server.hello` supplies. How a session
  with `agent: null` is rendered (the orchestrator's seat, a console seat, or not at all) is the
  consumer's choice. The mobile companion (T5 or later) reads the same feed over Tailscale Serve.

## Open Questions

1. ~~**Shape and packaging.**~~ **Decided 2026-11-04 (operator): A, one package with zero new
   dependencies.** The service, the reporter and the MCP surface ship inside `arcane-cli` behind
   `spell presence`; the loopback API on `node:http`, the MCP server hand-written over stdio.
   Rejected: B, a separate `arcane-mcp` package from a workspace in this repository on the
   official MCP SDK (a workspace conversion, a second publish pipeline and version coupling inside
   the T3 window); C, A now with a recorded trigger for a later split (same v0; the trigger is
   recorded in ARC-060's consequences instead, as a possibility, not a plan). Reason: ARC-044's
   requirement is no new mandatory dependency, which A meets outright; plain installs gain inert
   commands and nothing else; the window is twelve days.
2. ~~**How a session reports, and how much MCP is in v0.**~~ **Decided 2026-11-04 (operator): A,
   the CLI command is the convention's path and the MCP tools are its equivalents.** The fragment
   runs `spell presence report` and `spell presence end`; the stdio MCP server ships in v0 as a
   Must with the same two tools and two resources, for clients that register it, and the prompt
   never depends on it. Rejected: B, MCP tool first with a CLI fallback (two paths in every prompt
   and a per-client registration step before the acceptance test can pass); C, CLI only with the
   MCP surface deferred (the item's name and ARC-044 decision 2 say "local MCP server"). Reason:
   one path that works in every harness and in cron, with the MCP surface as a read-and-report
   mirror rather than a dependency.
3. ~~**What a session is, and who mints `arcane:session:`.**~~ **Decided 2026-11-04 (operator):
   A, keyed by checkout, minted by the service.** A session is one checkout (the worktree's real
   path) plus the agent it reports as; the service mints on the first report and the prompt carries
   nothing between calls. Rejected: B, the reporter mints and the prompt carries `--session <ref>`
   (the reference lives only in the model's context; a reset or a forgotten flag starts a second
   session); C, a harness-provided id with a checkout fallback (undefined in Copilot, Codex and
   cron, so two identity rules). Reason: ARC-028 already makes one checkout one unit of work.
   Planner's note, reversible in architecture: without `--agent`, the reporter defaults to the
   roster's orchestrator entry when there is one, else `null`; a persona session passes the slug
   the `Persona` trailer would carry.
4. ~~**Where the token lives.**~~ **Decided 2026-11-04 (operator): A, a user-store file with an
   environment override.** `~/.arcane/presence/token`, `0600` in a `0700` directory (Windows ACL
   per ARC-054's file rule), generated by `serve`, replaced by `--rotate`; `ARCANE_PRESENCE_TOKEN`
   as the SecretRef for subscribers; never an argument. Rejected: B, keychain first with a file by
   opt-in (every reporter call and DMC's server would hit the keychain; headless Linux and cron
   need the opt-in anyway; a loopback capability is not a remote credential); C, the environment
   variable only (every spell-running shell must carry it, so the acceptance test would depend on
   shell setup). Reason: non-interactive readers everywhere, hub ADR-007's posture kept.
5. ~~**What the service keeps, and where.**~~ **Decided 2026-11-04 (operator): A, memory only
   with stale and expiry clocks.** Stale at 90 s (shown as unknown, never as working), expired at
   24 h, empty after a restart; the service writes only its token and `server.json`. Rejected: B,
   memory plus a user-store journal (a second copy of presence on disk is the authoritative-store
   shape ARC-044 rejected, with rotation and privacy handling of its own); C, memory with no stale
   state (a thinking session would vanish and reappear, and unknown would never be shown).
   Reason: ARC-040's pointer-never-sole-carrier, applied to presence.
6. ~~**How the service starts and stops.**~~ **Decided 2026-11-04 (operator): A, an
   operator-started foreground process.** `serve` runs until a signal, `status` and `stop` read
   the pid and port it wrote; a user service is the operator's, with one documented example per
   platform; "configured" means reachable with the token on this machine; no command spawns it as
   a side effect. Rejected: B, auto-start on first report (a reporting command that launches a
   long-lived listener is a new class of side effect, and a stray server outlives its session);
   C, `--detach` (daemonization and its Windows edge cases for a convenience the service examples
   cover). Reason: the one shape with no surprise.

## Example tracking configuration

```yaml
tracking:
  tracking_mode: internal
  external_provider: null
```

## Example: a session record

```json
{
  "session": "arcane:session:019a4b10-2c3d-7e4f-8a9b-0c1d2e3f4a5b",
  "agent": {
    "ref": "arcane:agent:019a3f2c-7b1e-7d4a-9c0b-3e5f6a7b8c9d",
    "slug": "merlin",
    "name": "Merlin",
    "origin": "repo",
    "definition_revision": "sha256:4c2e0c8d5a9f3b1e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706",
    "aliases": []
  },
  "harness": "claude-code",
  "repository": {
    "root": "/home/operator/ventures/ordovica/geothermal-api",
    "name": "geothermal-api",
    "remote": { "provider": "github", "url": "https://github.com/ordovica/geothermal-api.git" }
  },
  "checkout": {
    "path": "/home/operator/ventures/ordovica/geothermal-api",
    "branch": "sessions/2026-11-12-well-telemetry",
    "linked_worktree": false
  },
  "spell": "spell-implement",
  "task": "WT-03: the telemetry ingest endpoint",
  "message": null,
  "status": "waiting",
  "needs_you": [
    { "action": "Approve the migration 0007_well_readings before the story commits", "reason": "a schema change needs a human" }
  ],
  "started_at": "2026-11-12T15:02:11Z",
  "reported_at": "2026-11-12T15:19:40Z",
  "ended_at": null,
  "stale": false
}
```

## Example: the reporting fragment (PC-11)

```markdown
<!-- fragment:presence-report:start -->
**Presence report (ARC-044 decision 3, ARC-060).** When a presence channel is configured on this
machine, report through it; when none is, this spell behaves exactly as it does without this
paragraph. Configured means `spell presence status` exits 0: the service is running and the token
in the user store opens it. Report with the CLI only; never pass a token on the command line, and
never write a repository file to report.

- At the start of this spell: `spell presence report --spell <spell-id> --status working --task "<the task in one line>"`.
- When this spell's output carries a `## ⚠ Needs you` block: `spell presence report --status waiting --needs-you "<line 1>" --needs-you "<line 2>"`, one flag per line; the block itself is unchanged.
- At a checkpoint worth showing (a commit made, a story passed): `spell presence report --status working --task "<what is now happening>"`.
- When the session closes: `spell presence end`.

The command is silent and exits 0 when no channel is configured, prints one line to stderr and
still exits 0 when the channel refuses a report, and never blocks a spell. The service keeps
presence in memory only, reconstructable from `spell state --json` and never authoritative; a
session that stops reporting is shown as unknown after 90 seconds. Enforcement: explicitly
advisory prose (ARC-023) — no check reads a spell's shell history for these calls.
<!-- fragment:presence-report:end -->
```

## Related

- [[DECISIONS#ARC-060|ARC-060 — The Presence Channel]] — the decision record this PRD proposes.
- [[DECISIONS#ARC-044|ARC-044 — Client Architecture]] — decisions 2 and 3, which this builds.
- [[DECISIONS#ARC-059|ARC-059 — Agent Identity]] — the reference type, descriptor and provenance this consumes.
- [[features/state-export/PRD|State export PRD]] — Layer 1, which presence is reconstructable from.
- [[features/agent-identity/PRD|Agent identity PRD]] — the previous item in the work order.
