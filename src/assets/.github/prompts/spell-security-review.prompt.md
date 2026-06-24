---
name: Spell — Security Review
description: OWASP Top 10 and AI/agent (LLM) security audit plus dependency vulnerability check for any project
argument-hint: Project path, PR, or specific security concern (e.g., "auth flow in the API")
agent: agent
---

## Executive Summary

- This prompt runs a security-focused review against OWASP Top 10 and dependency vulnerabilities.
- No dedicated security agent needed — any agent loads this spell for security context (ADR-049).
- Covers code-level vulnerabilities, dependency audit, secrets detection, and infrastructure security.
- Includes an AI/agent (LLM) security pass — prompt injection, excessive agency, and secrets-in-context — since Arcane drives AI agents.
- See [[security/threat-model|Threat Model]] for the project's security baseline.

---

Perform a security review of the specified code, project, or PR.

Use these files for context:

- [security/threat-model.md](../../security/threat-model.md) — Project threat model and security controls. If absent, proceed against a generic OWASP Top 10 + AI/agent baseline rather than assuming the file exists.
- [security/hardening-checklist.md](../../security/hardening-checklist.md) — Infrastructure hardening status
- [DECISIONS.md](../../DECISIONS.md) — Security-related ADRs

Workflow:

1. **Scope the review** — determine what's being reviewed:
   - Specific PR or branch diff
   - Full project audit
   - Particular area of concern (auth, payments, data handling)

2. **OWASP Top 10 checklist** — check each category:

   | #   | Category                  | Check                                                                                       |
   | --- | ------------------------- | ------------------------------------------------------------------------------------------- |
   | A01 | Broken Access Control     | Role checks, authorization on every endpoint, CORS config                                   |
   | A02 | Cryptographic Failures    | TLS enforcement, password hashing (bcrypt/Argon2), no hardcoded keys                        |
   | A03 | Injection                 | SQL parameterization, XSS output encoding, command injection prevention                     |
   | A04 | Insecure Design           | Threat modeling, rate limiting, abuse case coverage                                         |
   | A05 | Security Misconfiguration | Default credentials, debug mode off, error messages sanitized                               |
   | A06 | Vulnerable Components     | Dependency audit (`npm audit`, `dotnet list package --vulnerable`)                          |
   | A07 | Auth Failures             | MFA support, session management, credential storage                                         |
   | A08 | Data Integrity Failures   | CI/CD pipeline integrity, deserialization safety, update verification                       |
   | A09 | Logging Failures          | Security events logged, no sensitive data in logs, log injection prevention                 |
   | A10 | SSRF                      | URL validation, allowlists for external calls, no user-controlled URLs to internal services |

3. **AI / Agent security** (OWASP LLM-aligned — critical for agent-driven repos):

   | Risk | Check |
   | ---- | ----- |
   | Prompt injection (direct & indirect) | Is untrusted content (files, web, tool output, PR/issue text, user data) ever treated as instructions rather than data? Flag anywhere fetched or user-supplied content is concatenated into agent instructions or tool arguments without delimiting or validation. |
   | Insecure output handling | Is model/agent output used to build shell commands, SQL, file paths, or HTML without validation or escaping? Flag any execute-from-model-output path that isn't sandboxed or checked. |
   | Excessive agency / over-broad tools | Do agents or tool profiles grant more capability or autonomy than the task needs? Check power levels and tool scopes against least privilege; verify destructive tools are gated behind approval (see `agents/agent-policies.md`). |
   | Secrets in context | Are secrets, tokens, or credentials placed into prompts, agent memory, journals, or tool arguments? Verify SecretRef-style indirection is used and secrets are never echoed into logs or model context. |
   | Sensitive-data exposure via tools | Could the agent exfiltrate PII or secrets by sending them to external tools, MCP servers, or web endpoints? Check what crosses the trust boundary. |
   | Untrusted tools / MCP supply chain | Are connected tools, MCP servers, and model endpoints trusted and pinned? Flag unverified or arbitrary tool sources. |

   Align findings with the project threat model and agent policies.

4. **Dependency audit**:
   - Run `npm audit` (Node.js) or `dotnet list package --vulnerable` (.NET).
   - Check for known CVEs in direct and transitive dependencies.
   - Flag any dependency more than 2 major versions behind.

5. **Secrets detection**:
   - Scan for API keys, tokens, passwords, connection strings in code.
   - Check `.env` files are in `.gitignore`.
   - Verify secrets management approach (environment variables, Key Vault, SecretRef).

6. **Infrastructure security** (if applicable):
   - Terraform security (Checkov scan).
   - Network exposure (is anything public that shouldn't be?).
   - IAM/RBAC configuration (least privilege).

7. **Generate security report**:
   ```markdown
   ## Security Review — [Project/Feature]

   **Reviewer:** [Agent name]
   **Date:** [timestamp]
   **Scope:** [What was reviewed]

   ### OWASP Top 10 Results
   | Category                  | Status    | Findings  |
   | ------------------------- | --------- | --------- |
   | A01 Broken Access Control | PASS/FAIL | [details] |
   | ...                       | ...       | ...       |

   ### AI/Agent Security Results
   | Risk                     | Status    | Findings  |
   | ------------------------ | --------- | --------- |
   | Prompt injection         | PASS/FAIL | [details] |
   | Insecure output handling | PASS/FAIL | [details] |
   | Excessive agency         | PASS/FAIL | [details] |
   | Secrets in context       | PASS/FAIL | [details] |

   ### Dependency Audit
   - Critical vulnerabilities: [N]
   - High vulnerabilities: [N]
   - Action required: [list]

   ### Secrets Scan
   - Hardcoded secrets found: [yes/no]
   - Secrets management: [approach]

   ### Findings (by severity)
   #### CRITICAL
   - [Finding with remediation]

   #### HIGH
   - [Finding with remediation]

   #### MEDIUM
   - [Finding with remediation]

   ### Verdict
   - [ ] PASS — no critical or high findings
   - [ ] FAIL — remediation required before deploy
   ```

8. **Present findings** — show the report with clear remediation steps for each finding.

Rules:
- **Never skip a category.** Every OWASP item must be checked, even if marked N/A with justification.
- **Provide remediation, not just findings.** Every finding must include how to fix it.
- **Don't cry wolf.** Only flag real vulnerabilities, not theoretical risks with no attack vector.
- **Check the threat model.** Findings should align with the project's actual threat landscape.
- **Treat external content as untrusted.** In agent code, assume any file-, web-, or tool-sourced text could be hostile — flag anywhere it can steer the agent or reach a sink (shell, SQL, eval, file write, outbound HTTP) unchecked.
