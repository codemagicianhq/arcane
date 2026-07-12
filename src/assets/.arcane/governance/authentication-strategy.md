---
title: Authentication Strategy
audience: both
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [security, authentication, credentials, ssh, api-keys]
---

# Authentication Strategy

This document provides rationale for authentication decisions across an agent runtime's operational infrastructure. It is vendor-neutral: apply the principles to whichever runtime, Git host, and model provider you use.

## Executive Summary

- Authentication follows defense in depth: network isolation + credential controls + audit logging.
- Git access uses SSH keys instead of bearer tokens (PATs) to reduce replay exposure.
- Model-provider and gateway secrets use a secret-reference pattern (env var / secret manager), not plaintext in config files.
- This file is the single detailed reference for "why this auth choice over alternatives."

## Principles

**1. Minimize Bearer Token Exposure**
- Bearer tokens (PATs, API keys) can be replayed if intercepted once
- Prefer challenge/response authentication (SSH, OAuth) when available
- When bearer tokens are required, store them as environment variables via a secret-reference pattern

**2. Credential Isolation**
- Each service/agent uses separate credentials with minimal required scope
- Credentials stored outside version control (`.env`, system keychains, secret managers)
- Rotation/revocation must be straightforward without config file changes

**3. Defense in Depth**
- Authentication is one layer; combine with network isolation (loopback bind, VPN/tunnel)
- Audit logging for all credential operations
- Regular review of active credentials and permissions

## Authentication Contexts

### Git Operations

**Decision:** SSH key pairs for agent automation

**Mechanism:**
- An SSH key pair generated on the agent host (prefer Ed25519; fall back to RSA 4096 if the host rejects Ed25519)
- Public key registered with the Git host
- Private key remains local at `~/.ssh/id_*` (`600` permissions)
- Git remote configured to use the SSH URL

**Why SSH Over PAT:**

1. **Bearer Token Replay Risk**
   - PATs are bearer tokens: if exposed once (leaked in logs, environment dumps, shell history), they can be replayed until expiration or manual revocation
   - SSH authentication uses private-key challenge/response; the private key never leaves the local machine
   - Intercepting SSH traffic doesn't expose the private key (only the public key and an encrypted challenge)

2. **Reduced Secret Exposure Surface**
   - PATs must be embedded in Git URLs (`https://token@host/...`), shell commands, or environment variables
   - This increases exposure in process lists, command history, debug logs, and automation scripts
   - SSH keys are referenced by Git automatically; no secret in the command line or URLs

3. **Simplified Rotation Model**
   - Rotating a PAT requires updating everywhere it's stored (environment files, config files, CI/CD secrets)
   - Rotating SSH keys: generate a new pair, upload the new public key, revoke the old one
   - Private-key rotation doesn't require updating config files (Git uses `~/.ssh/id_*` by convention)

4. **Consistent with Industry Practice**
   - GitHub, GitLab, Bitbucket, and Azure DevOps all support SSH for automation over HTTPS+PAT
   - SSH is the standard for CI/CD systems
   - Git and OpenSSH have decades of hardening against SSH key compromise

5. **ACL Enforcement Still Applies**
   - SSH authentication doesn't bypass host-side permissions
   - Repository access, branch policies, and project-level ACLs are still enforced
   - The SSH key is tied to a user identity; audit logs show the authenticated user, not an anonymous token

**Trade-offs:**
- SSH requires initial key generation and registration (one-time setup)
- PATs offer time-based auto-expiration; SSH keys don't expire (must be manually rotated)
- **Chosen:** SSH's reduced exposure risk outweighs the PAT's auto-expiration convenience

**Implementation Notes:**
- Prefer Ed25519 keys; some hosts may reject them, in which case use RSA 4096-bit
- If a private key cannot be passphrase-protected (unattended agent automation), rely on filesystem permissions (`600`) and OS-level security

---

### Model Provider API Access

**Decision:** Workspace/organization-scoped API keys instead of personal keys

**Mechanism:**
- Create a workspace or organization scope with the provider
- Generate an API key within that scope
- Store the key as an environment variable (e.g. in a `.env` file)
- Reference it in config via a secret-reference rather than embedding the value

**Why Scoped Keys Over Personal Keys:**

1. **Organizational Boundary**
   - Personal keys are tied to an individual account; scoped keys are tied to a business entity
   - Supports multiple team members with separate accounts sharing workspace keys
   - Billing and usage analytics are separated by workspace (clean separation for accounting)

2. **Credential Lifecycle Management**
   - If an individual's personal account changes, workspace keys remain stable
   - Key rotation doesn't require changing personal account credentials
   - Ownership can be transferred to the business entity if needed

3. **Usage Visibility**
   - The workspace dashboard shows per-agent usage when multiple agents are configured
   - Business usage is isolated from personal experimentation

**Trade-offs:**
- Scoped keys may require a paid plan tier; personal keys may be available on a free tier
- Additional setup step (create workspace, configure workspace key)
- **Chosen:** Organizational clarity and multi-agent scaling are worth the cost

**Implementation Notes:**
- Store the API key in a `.env` file (not committed to Git), with `600` permissions
- The secret-reference pattern means config files can be committed without exposing the key

---

### Gateway / Control-Plane Token

**Decision:** Token auth via secret reference

**Mechanism:**
- Generate a random high-entropy token during installation
- Store it as an environment variable (e.g. in a `.env` file or a secret manager)
- Reference it from config rather than embedding the literal value
- Require it in the HTTP header: `Authorization: Bearer <token>`

**Why Token Auth:**

1. **Stateless Authentication**
   - No session management required; the gateway validates the token per request
   - Supports multiple clients (CLI, web UI, agent nodes) with the same token
   - No database or persistent storage needed for auth state

2. **Secret-Reference Benefits**
   - The token never appears in the committed config file
   - The token file (`.env`) has explicit `600` permissions
   - Rotation requires updating the secret store only, not the config file

3. **Defense-in-Depth with Network Isolation**
   - The gateway binds to loopback only; the token is a second layer of defense
   - Even if the token leaks, an attacker still needs local/tunnel access to reach the gateway
   - An encrypted tunnel/VPN provides transport security so the token isn't exposed in plaintext over the network

**Rejected Alternatives:**
- **Password auth:** Requires hashing, salting, and storage; more complex for a single-user setup
- **No auth:** Unacceptable even with a loopback bind (a local process compromise could reach the gateway)
- **Plaintext token in config:** Token visible in the config file; secret reference is strictly better

**Implementation Notes:**
- Generate the token with a cryptographically secure source (e.g. `openssl rand -hex 32`)
- Rotation: generate a new token, update the secret store, restart the gateway (no config change needed)
- Treat the token as shown-once; regenerate it if lost

---

### Network ACLs (Future Hardening)

**Current State:** Default tunnel/VPN ACLs (all nodes can reach all nodes)

**Future Hardening:**
- Restrict the gateway to accept connections only from specific, expected nodes
- Use access tags for role-based access (e.g. a gateway tag vs. an agent-node tag)
- Block all other devices from reaching the gateway

**Implementation Date:** When a second agent node is added

---

## Secret-Reference Pattern Standard

Use this consistently across all credential storage:

```toml
# In config (safe to commit) — reference the secret, don't inline it
[some_service]
auth = { provider = "token", token = { source = "env", id = "SECRET_NAME" } }

# In .env (never committed)
SECRET_NAME=actual-secret-value-here
```

**Benefits:**
- Config files are version-controlled without exposing secrets
- Secrets are rotated by editing the secret store only (no config changes)
- The secret file has strict `600` permissions
- Single source of truth for secret values (not duplicated across config files)

**Common Source Types:**
- `env` — Environment variable from a `.env` file or service unit environment
- `file` — Read from an arbitrary file path (e.g. integration with system keychains)
- `exec` — Execute a command to retrieve the secret (e.g. integration with vault systems)

---

## Credential Audit Checklist

Regular review (quarterly):

- [ ] List all active SSH keys on the Git host; revoke unused keys
- [ ] List all active model-provider API keys; revoke unused keys
- [ ] Verify `.env` file permissions are `600` on all machines
- [ ] Review network ACLs against the current node topology
- [ ] Check `~/.ssh/` permissions (directory `700`, private keys `600`)
- [ ] Grep the codebase for hardcoded secrets (should find zero matches)
- [ ] Review the security audit log for any anomalous credential operations

---

## References

- [Threat Model](threat-model.md) — Attack surfaces and mitigations
- [Hardening Checklist](hardening-checklist.md) — Operational security measures
