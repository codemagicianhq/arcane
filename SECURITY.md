# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, use one of these private channels:

1. **GitHub Private Vulnerability Reporting** (preferred) — go to the **Security** tab → **Report a vulnerability**.
2. **Email** — `security@codemagician.net` with a description and reproduction steps.

We'll acknowledge your report within **3 business days** and aim to provide a remediation timeline within **10 business days**. Please give us a reasonable window to address the issue before any public disclosure.

## Scope

Arcane is a CLI that scaffolds governance files and runs prompt-driven workflows. Security-relevant areas include:

- The CLI's file-writing behavior (`init`, `add`, `update`, `uninstall`) — path traversal, unintended overwrites.
- The build-time secrets scan (`scripts/copy-assets.ts`) — false negatives that could let a credential reach the published package.
- Supply-chain integrity of the published `arcane-cli` package.

## Supported versions

Arcane is pre-1.0 and ships from `main`. Security fixes land on the latest published version. Please verify a report against the most recent release before filing.
