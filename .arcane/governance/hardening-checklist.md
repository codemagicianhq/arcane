---
title: Linux Security Hardening Checklist
audience: human
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [security, hardening, linux]
---

# Linux Security Hardening Checklist

Step-by-step hardening for a Linux host that will run an autonomous agent runtime.

## Executive Summary

- This checklist is the operational sequence for securing a host before production use.
- It translates threat-model risks into actionable controls with verification steps.
- Completion status here should be reflected in your security audit log.
- Use this as an execution checklist, not a conceptual guide.

See also: [Threat Model](threat-model.md), [Authentication Strategy](authentication-strategy.md)

---

## Pre-Checklist: Know Your Environment

- [ ] Confirm OS distribution and version (e.g. `lsb_release -a`)
- [ ] Confirm kernel version (e.g. `uname -r`)
- [ ] Document machine hostname (`{HOST}`) and primary user account (`{OPERATOR_USERNAME}`)

---

## 1. System Updates

- [ ] Update all packages (e.g. `sudo apt update && sudo apt upgrade -y`)
- [ ] Enable unattended security updates so patches land automatically

---

## 2. User & Privilege Management

- [ ] Disable direct root login; use `sudo` only
- [ ] Audit the sudoers file — confirm only necessary users have sudo
- [ ] Remove or lock unused accounts
- [ ] Keep any `NOPASSWD` sudoers exceptions narrowly scoped to a single binary, never a wildcard

---

## 3. SSH (if enabled)

- [ ] Disable password authentication — key-based only
- [ ] Disable root login over SSH (`PermitRootLogin no`)
- [ ] Change the default SSH port if externally exposed
- [ ] Enable a brute-force guard (e.g. fail2ban) if SSH is reachable from untrusted networks

---

## 4. Source Control (Git)

- [ ] Configure an SSH key for your Git host (prefer Ed25519, fall back to RSA 4096 if rejected)
- [ ] Use SSH remote URLs so credentials are not embedded in URLs or prompted interactively
- [ ] Keep SSH private keys with mode `600` (`chmod 600 ~/.ssh/id_*`)

---

## 5. Firewall & Network

- [ ] Enable a host firewall (e.g. UFW)
- [ ] Default deny inbound traffic
- [ ] Allow only the inbound ports that are strictly required
- [ ] Enable firewall logging

**Adjacent hosts (general guidance):**
- [ ] Disable network discovery and file sharing on machines sharing the LAN with the agent host
Rationale: minimize attack surface, especially with an autonomous agent on the same network. Prefer on-demand, explicit file transfer over always-on sharing.

---

## 6. Drive Protection

- [ ] Ensure foreign/sensitive drives are not auto-mounted (omit from `/etc/fstab`, or list with `noauto`)
- [ ] Enable full-disk encryption on drives holding sensitive data, so they are unreadable from another OS or a stolen disk
- [ ] Verify encryption: attempt to mount the encrypted volume from another OS and confirm it fails

### Full-Disk Encryption Notes (general best practices)

- **Never store the only recovery key on the encrypted drive.** Keep it in at least two places: a trusted backup location and an offline printed copy.
- **Treat boot-partition directories as critical** — deleting boot entries can render the machine unbootable and require recovery media.

---

## 7. Agent Runtime

- [ ] Define which user account the agent runtime runs as — run as a non-root user
- [ ] Bind the gateway/control plane to loopback only (no LAN exposure)
- [ ] Authenticate the gateway with a token loaded from an env var / secret manager — never in a committed config file
- [ ] Set the runtime state directory to mode `700` (user-only)
- [ ] Remove dead or default-permissive command allow/deny rules left over from onboarding
- [ ] Run the runtime's security audit and resolve critical findings
- [ ] Define which directories the runtime has write access to; scope per agent where possible
- [ ] Define network egress rules — enumerate which external endpoints the runtime may reach
- [ ] Establish a logging review schedule for agent actions (e.g. spot-check weekly, full review monthly)
- [ ] Configure tool hardening: deny shell exec where not needed, restrict filesystem scope per agent
- [ ] Store all API keys via env var / secret manager (mode `600` on any `.env`), never plaintext in config

---

## 8. Remote Access

- [ ] Provide remote access through an encrypted tunnel or VPN rather than open inbound ports
- [ ] Enable TLS/HTTPS for any remotely reachable endpoint
- [ ] Review the access list — confirm only expected devices can reach the gateway
- [ ] Re-verify the device/access list whenever topology changes

---

*Expand each section with the specific commands and verification steps used in your environment, and log completed steps in your security audit log.*
