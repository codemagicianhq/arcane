---
title: Loopback callback hardening code review
audience: both
last_updated: 2026-10-07
status: active
tags: [review, login, oidc, loopback]
---

# Code Review — Loopback Callback Hardening

Related: [[features/spell-login/PRD|Spell login PRD]], [[features/spell-login/architecture|login architecture]], [[features/spell-login/assessments/security-review-2026-10-07|security review]]

**Reviewer:** Codex (self-review; independent PR review still recommended)

**Date:** 2026-10-07

## Coverage Summary

| Lens | Verdict | Notes |
| --- | --- | --- |
| Correctness | PASS | No issues. Success is selected only after token validation and persistence; failure and replay paths are deterministic. |
| Security | PASS | No issues. State is checked for both successful and denied callbacks, callback replay returns 409, and result pages expose no OAuth query values. |
| Performance | PASS | No issues. The short-lived loopback server adds one local 303/GET round trip and retains the existing five minute timeout. |
| Tests | PASS | No issues. HTTP-level tests cover success, denial, mismatched state, replay, early/wrong result access, headers, and query removal. |
| Naming/Clarity | PASS | No issues. `BrowserResult`, `callbackConsumed`, `browserResult`, and `RESULT_HEADERS` describe their roles directly. |
| Architecture | PASS | No issues. The implementation follows the updated loopback sequence and keeps the browser page separate from terminal authentication state. |

## Findings

No high, medium, or low findings remain. During review, the provider-denial branch was found to bypass explicit state comparison; the implementation and regression suite were corrected before this report was finalized.

## Architecture Compliance

Compliant. The listener remains bound to `127.0.0.1` on an ephemeral port, accepts one authorization callback, waits through delivery of a fixed result page, and closes on completion, failure, or timeout.

## Test Coverage Assessment

- Full suite: 2,274 passed, 7 skipped, 0 failed.
- Repository coverage: 93.04% lines, 87.03% branches, 93.87% functions, 91.87% statements.
- `src/modules/oidc.ts`: 100% lines/functions, 97.05% branches, 99.13% statements.
- Build, lint, typecheck, leak scan, production dependency audit, and whitespace checks passed.

## Security Assessment

All OWASP Top 10 lenses were reviewed in the linked security assessment. No blocker remains. The production tenant smoke test is manual release evidence and does not change the code-review verdict.

## Verdict

- [x] APPROVE — no critical issues.
- [ ] REQUEST CHANGES — critical issues found.
- [ ] DEFER — needs a human decision.

## Backlog Items

- Complete the separate Gate visual design selection and Arcane UI static-export review before replacing the fixed callback page.
