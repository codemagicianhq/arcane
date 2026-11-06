---
title: Threat Model
tagline: Security posture, attack surfaces, mitigations
audience: both
last_updated: YYYY-MM-DD
status: draft
distributable: true
tags: [security, threat-model]
---

# Threat Model

> **Status:** Draft — expand this document as your environment evolves.

## Executive Summary

- The primary risk is autonomous agent misuse or compromise on a host that also holds sensitive data.
- Core mitigations are full-disk encryption, least-privilege execution, a loopback-bound gateway, and network isolation via tunnel/VPN.
- This file defines what must be protected, who/what could attack it, and where controls must be applied.
- Security decisions here map directly to the hardening checklist and authentication strategy.

See also: [Hardening Checklist](hardening-checklist.md), [Authentication Strategy](authentication-strategy.md)

---

## Assets to Protect

| Asset | Value | Location |
|-------|-------|----------|
| Local sensitive data | Personal files, documents, custom apps | Primary local disk |
| Business credentials | API keys, payment-processor accounts, marketplace accounts | Secret store |
| Customer data | Order info, contact details | To be defined per platform |

---

## Threat Actors

- **Compromised AI agent (the runtime or its dependencies):** An autonomous agent with shell access could enumerate drives, exfiltrate data, or escalate privileges.
- **Supply-chain attack:** A compromised package or model pulled by the runtime acts maliciously.
- **Network attacker:** Exploits exposed services on the agent host.

---

## Attack Surfaces

| Surface | Status | Mitigation |
|---------|--------|------------|
| Sensitive local drive accessible from another OS | **Mitigated** | Full-disk encryption renders the drive unreadable from a different OS or a stolen disk |
| Agent runtime with shell access | **Partially mitigated** | Runs as a non-root user; loopback-only bind; token auth. Tool hardening (exec/fs restrictions) pending. |
| Network exposure on the agent host | **Mitigated** | Gateway bound to loopback only. An encrypted tunnel/VPN is the only remote-access path. No ports open on the LAN. |
| Supply chain (package installs) | **Mitigated** | Global package installs use a user-owned directory, not a system directory. No `sudo` during install. |
| Inter-machine communication | **Mitigated** | Encrypted mesh tunnel/VPN. No direct unencrypted LAN communication. |
| Token/credential exposure (at rest) | **Mitigated** | Token stored as an env var in a `.env` file. Config uses a secret reference, not plaintext. State directory is mode `700`. |
| Credential committed to version control | **Partially mitigated** (ARC-037) | A pattern-based scanner (`src/modules/secrets-scan.ts`) runs at two points: a pre-commit hook step (local, `--no-verify`-bypassable by design) and a repository-wide backstop inside `npm run build`'s existing CI gate (not bypassable, catches anything that skipped or bypassed the hook before merge) — plus an on-demand `spell doctor --leaks` for a manual check anytime. This is detection, not prevention: a regex denylist can miss non-standard credential shapes, and neither point runs on a commit that is never pushed. `spell-security-review`'s secrets step remains an on-demand agent read, not a control, and is unchanged by this. **Treat every credential that reaches a commit as compromised and rotate it — history, existing clones, and remote backups all survive deleting the file (EF-35). Enforcement: explicitly advisory prose (ARC-023) — rotating a leaked credential happens at the third-party provider that issued it; no Arcane mechanism can perform or verify that a specific credential was actually rotated.** |

---

## Mitigations Completed

- [ ] Full-disk encryption on drives holding sensitive data
- [ ] Gateway: loopback bind, token via secret reference, encrypted tunnel/VPN for remote access
- [ ] Package supply chain: user-owned global directory, no `sudo`
- [ ] State directory permissions set to `700`
- [ ] Runtime security audit: zero critical issues

## Mitigations In Progress

- [ ] Agent policies: define allowed/denied actions per agent
- [ ] Tool hardening: restrict exec, filesystem scope, control-plane access
- [ ] Host security hardening checklist (see [Hardening Checklist](hardening-checklist.md))
- [ ] Network ACL review — confirm only expected devices reach the gateway

---

## Local Presence Service (`spell presence`)

> **Status:** every row is **Planned** until the operator verifies it against the installed build on each machine that runs the service, and records the result in the security audit log. Decision record: ARC-060 (the presence channel) in the Arcane framework repository.

`spell presence serve` is an optional, operator-started foreground process that AI sessions report to (agent, task, repository, status and "action required" lines) and that dashboards read. Nothing listens until the operator starts it. It adds one listening socket and one secret to the machine. It is **observation only by contract** (capability descriptor `{ observe: true, actions: [] }`) and **never authoritative**: everything it holds is reconstructable from `spell state --json` and the repository's files.

| Asset | Value | Location |
|-------|-------|----------|
| Presence state | Each session's agent, task, message, required-action lines, repository name and remote, branch and checkout path. Business-private: it can name ventures, customers and machine paths | Process memory only; gone on restart, dropped after 24 h of silence |
| Presence token | Bearer capability for every route: read every live session, post or end any session | `~/.arcane/presence/token` (file `0600` in a `0700` directory; on Windows restricted to the current account) or the `ARCANE_PRESENCE_TOKEN` environment variable for a subscriber |
| `server.json` | URL, process id, port, start time and version of the running service. Not a secret | `~/.arcane/presence/server.json`, removed on a clean exit |

**Threat actors added:**

- **A local process without the token:** another account on the machine, or a web page in a browser reaching the loopback port, including through DNS rebinding.
- **A process running as the operator's own account:** a compromised AI session, or any agent runtime that runs under that account, can read the token file like the operator can. It can post forged presence and read every live session.
- **A tunnel or VPN peer**, only when the operator puts a tunnel in front of the loopback port.

| Surface | Status | Mitigation (ARC-060 decision) | How to verify |
|---------|--------|-------------------------------|---------------|
| Listening socket | **Planned** | Binds `127.0.0.1` only; no host or bind option exists (decision 2) | `lsof -nP -iTCP:<port> -sTCP:LISTEN` (macOS) or `ss -ltnp 'sport = :<port>'` (Linux) shows `127.0.0.1` only; a connection from another host to the machine's address on that port is refused; `spell presence serve --help` lists no host or bind option |
| Authentication | **Planned** | Every `/v0/` route requires `Authorization: Bearer <token>`; the only unauthenticated answer is `401` with an empty body; constant-time comparison (decisions 3, 6) | `curl -si http://127.0.0.1:<port>/v0/health` without the token and with a wrong one both answer `401` with no body; with the token, `200` |
| Token storage | **Planned** | 32 random bytes written on first `serve`, `0600` in `0700`; the write is refused when the restriction fails; `--rotate` replaces it; readers take `ARCANE_PRESENCE_TOKEN` first (decision 6). On Windows inherited entries are removed and the current account granted; SYSTEM and the Administrators group can keep explicit entries | `stat` on `~/.arcane/presence` and its `token` shows `drwx------` and `-rw-------`; on Windows `icacls` on the token shows no inherited entry and no principal other than the current account, SYSTEM and Administrators |
| Token exposure | **Planned** | No command takes a token as an argument; `server.json` holds none; no log line prints one (decision 6) | `spell presence --help` and every subcommand's help list no token option; a search of a `serve` run's output for the token value finds nothing |
| Browser and DNS-rebinding reach | **Planned** | No CORS headers, so a cross-origin page cannot read an answer, and the bearer header forces a preflight that is refused. There is no `Host` check (decision 3), so the token is the only control here | A `fetch` to `http://127.0.0.1:<port>/v0/sessions` from any web page fails; a request with a foreign `Host` header and no token answers `401` |
| Repository and filesystem writes | **Planned** | Writes only `token` and `server.json` under `~/.arcane/presence/`; never a repository file, never a session journal (decisions 2, 7) | A filesystem watch across a `serve` run with reports from two checkouts shows writes under `~/.arcane/presence/` only; `git status` is clean in both checkouts afterwards |
| State persistence | **Planned** | Memory only; a session silent for 90 s is stale, for 24 h expired and dropped; a restart starts empty (decision 7) | Restart `serve`: `GET /v0/sessions` answers an empty list; a session silent for 90 s shows `stale: true` |
| Forged or poisoned presence | **Accepted risk** | Any token holder can post or end any session. Bounded: presence is never authoritative and steers nothing (`actions: []`, decision 8); a forged report misleads a dashboard and changes no file, branch or decision | `tools/list` on `spell presence mcp` answers only `presence_report` and `presence_end`; the HTTP surface has six routes, none of which acts |
| Disclosure to token holders | **Accepted risk** | Every token holder can read every session's task, message and path. A process of the operator's account can already read those repositories, so this adds no new data to that account; it is why the token is never shared beyond it | Review which agent runtimes run under the operator's account and what they may read |
| Request limits | **Planned** | 64 KiB bodies, 256-character lines, at most 20 required-action lines and 32 aliases (more is refused), 256 sessions, 32 subscribers, a subscriber that stops reading closed past a 1 MiB backlog, connection and header time limits checked every second (decision 3) | A 65 KiB body and a 21-line required-action list are each refused; the service keeps answering |
| Execution and reads | **Planned** | The service runs no process and reads nothing but its own store; it makes no outbound request (decisions 9, 10) | Code review of the release; no outbound connection from the `serve` process during a run (`lsof -p <pid> -i` shows the listener only) |
| Logging | **Planned** | The service logs an event name, a session reference and a status only; never a task, message, required-action line, path or token (decision 9) | `serve`'s output across a run contains no task, message, path or token |
| Remote access | **Planned** | Nothing listens beyond loopback; the only remote path is a tunnel or VPN the operator places in front of the loopback port, with the token still required (decision 6) | Before exposing the port through a tunnel, review which devices the tunnel admits and record them |
| Git hooks | **Planned** | The reporter is invoked by spell prompts, never by a git hook; `spell presence` is never installed into `.husky/` or `.arcane/hooks/` (decision 10) | A search for `presence` in `.husky/` and `.arcane/hooks/` of each repository after the update that ships it finds nothing |
| Data leaving the machine | **Planned** | No outbound request; a pushed projection would be a later decision record and strips `repository.root` and `checkout.path` first (decision 9) | Same as the execution row |

Two further surfaces, found while designing the service, with their mitigations:

- **A port taken by another process after a crash.** If the service dies without removing `server.json`, another local process could bind the port and receive the token from the next reporter. The reporter treats a `server.json` whose process id is not alive as no channel, and `serve` on a port in use fails without touching the token; a reused process id together with a taken port is the residual.
- **A rewritten `server.json`.** A process of the operator's account can edit it. The client takes only the port from it and always connects to `127.0.0.1`, so the token is never sent to another host; a recorded process id that belongs to another account counts as no service, so the token is not sent to whatever holds the port.

---

## Collaborator Access Policy

This policy defines which collaborators can access which project data. Enforce boundaries at the source-control/project level and document scope explicitly to prevent drift.

### Privacy Levels

| Level | Description | Who Can See |
|-------|-------------|-------------|
| **Public** | Intended for open sharing | Anyone |
| **Shared** | Cross-collaborator projects | Named collaborators only |
| **Business-Private** | Single-business operational data | Business co-owners only |
| **System-Private** | Infrastructure, credentials, security config | Owner only |

### Collaborator Scope Assignments

| Collaborator | Access Level | Explicit Scope | Block From |
|---|---|---|---|
| **Owner** | System-Private | All projects and infrastructure | N/A — owner |
| **Operations Co-Owner** | Business-Private | A single business's data, operations, finances | All other businesses; all infrastructure |
| **Partner** | Shared | A single business only (via a dedicated org) | Other businesses and all system config |

### Enforcement

- **Project-level isolation is the primary boundary: each business is a separate project with its own access control. Enforcement: explicitly advisory prose (ARC-023) — isolation depends on the owner actually configuring separate platform projects/repos with distinct access control; `spell doctor`'s `checkPlatformBranchPolicy` (src/modules/platform-policy.ts) verifies only branch merge-method policy and `checkDelegations` (src/commands/doctor.ts) verifies only agent power-level delegations, so no Arcane check queries collaborator or team membership to verify a given business's project is actually isolated.**
- **A partner's access is limited to a single business's project, through a dedicated org only. Enforcement: explicitly advisory prose (ARC-023) — depends on the owner correctly scoping the partner's platform account to a single org; no Arcane check inspects collaborator or team membership to verify a partner's actual access is so limited.**
- **An operations co-owner receives access only to their business's project and relevant platform accounts — not to infrastructure configs. Enforcement: explicitly advisory prose (ARC-023) — depends on the owner correctly scoping platform-account grants; no Arcane check inspects collaborator permissions to verify infrastructure configs are actually excluded.**
- **System-level and multi-business reference documentation stays private to the owner unless explicitly shared. Enforcement: explicitly advisory prose (ARC-023) — depends on the owner's manual sharing decisions; no Arcane check inspects document visibility or sharing state to verify this boundary holds.**
- **New collaborator access requires an explicit entry in this table and an entry in the security audit log. Enforcement: explicitly advisory prose (ARC-023) — a manual documentation discipline; no Arcane check verifies this table was updated or that a corresponding security audit log entry exists, and the security audit log itself is a manual record referenced across governance docs, not a system Arcane reads or writes.**

---

*Document your runtime's execution model here as your environment is finalized: which user account it runs as, how shell access is scoped, and which model provider performs inference.*
