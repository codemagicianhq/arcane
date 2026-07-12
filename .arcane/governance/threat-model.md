---
title: Threat Model
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
| Token/credential exposure | **Mitigated** | Token stored as an env var in a `.env` file. Config uses a secret reference, not plaintext. State directory is mode `700`. |

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

- Project-level isolation is the primary boundary: each business is a separate project with its own access control.
- A partner's access is limited to a single business's project, through a dedicated org only.
- An operations co-owner receives access only to their business's project and relevant platform accounts — not to infrastructure configs.
- System-level and multi-business reference documentation stays private to the owner unless explicitly shared.
- New collaborator access requires an explicit entry in this table and an entry in the security audit log.

---

*Document your runtime's execution model here as your environment is finalized: which user account it runs as, how shell access is scoped, and which model provider performs inference.*
