---
title: Independent login adversarial and security review
date: 2026-10-08
status: review-complete
---

# Independent login review

Related: [[features/spell-login/PRD|Spell login PRD]], [[features/spell-login/architecture|login architecture]]

Scope: merged Arcane CLI login work in PRs #345, #347, #349, and #350, including browser and device flows, local session storage, and logout. The earlier `spell-review` and `spell-security-review` reports were Codex self-reviews. GitHub records show no submitted reviews on these PRs. No configured Custodio agent roster was found; the security pass below was performed by an independent Codex subagent using Custodio's security remit, not by a formally configured Custodio agent.

## Findings

1. **Medium, correctness: saved session can be reported as a failed login.** `src/modules/oidc.ts` calls `onValidated` to persist the session before the callback's redirect, but resolves `browserLogin` only after the browser requests `/result/success`. If the browser closes, blocks, or fails to follow that redirect, the CLI times out and says “Nothing was changed” despite the stored session. `src/commands/login.ts` then exits unsuccessfully. Resolve terminal completion after successful persistence, while keeping the listener open long enough to serve the browser result, or explicitly report the stored state on timeout. Add a test for a validated callback with no subsequent result-page request.

2. **Low, availability: an invalid callback consumes the attempt.** `src/modules/oidc.ts` sets `callbackConsumed` before checking `state`. A local process that reaches the ephemeral loopback port first can send a wrong-state callback and prevent the real callback from completing this sign-in attempt. Reject a wrong state without consuming the one valid callback, retain the overall timeout, and test a wrong-state request followed by a valid callback. State and PKCE still prevent account substitution.

3. **Low, documentation and disclosure: browser fallback prints the authorization URL.** `src/commands/login.ts` deliberately prints the full URL if it cannot open a browser, including state and nonce, while PRD R10 says no state appears in terminal output. The PKCE verifier is not printed, so this is not by itself an account takeover path. Reconcile the requirement with the intended manual fallback and document the terminal exposure boundary.

## Six review lenses

| Lens | Result |
| --- | --- |
| Correctness | Medium browser completion issue above. |
| Security | Low callback denial of service and terminal URL disclosure above. No critical or high account compromise issue found. |
| Performance | No issue found in the bounded loopback flow. |
| Tests | Existing tests cover callback headers, state failure, storage, and timeout separately; the two combined sequences above are missing. |
| Naming and clarity | No issue found beyond the PRD and behavior mismatch above. |
| Architecture | PKCE, loopback binding, identity validation, and OS keychain default follow the documented design. The terminal completion semantics need adjustment. |

## Security coverage and verification limits

The independent pass covered the loopback and identity-service trust boundaries, OWASP Top 10 categories, local storage, dependencies, and AI/agent exposure. A01/A07 yielded the low availability finding; A09 yielded the PRD mismatch. A02, A03, A05, A06, A08, and A10 yielded no concrete login finding. A04 entitlement checks remain future scope because this feature establishes identity, not product authorization. AI prompt-injection categories do not apply to this login path.

No tracked `.env` file was found. `.gitignore` does not explicitly ignore `.env*`, which is a future secret-hygiene hardening item. The current `npm audit --omit=dev` could not reach the audit endpoint in the sandbox; the October 7 review recorded zero production dependency advisories. This review does not assert a current clean audit result.

## Remediation on `sessions/2026-10-08-login-review-fixes`

All three findings above have focused fixes and regression coverage. The terminal flow now reports a persisted session as success even when the browser misses the result page; wrong-state requests receive a fixed 400 page without consuming the callback; and failed browser opening exits with device-code guidance instead of printing the authorization URL. Focused tests: 66 passed across three files. The build passed after rerunning with filesystem access outside the restricted sandbox.

The full Windows suite on 2026-10-08 finished with 2,270 passed, 5 failed, and 7 skipped. All five failures were timeouts in unchanged `init`, `update`, and prompt-drift tests; the auth test files passed. This is **not a passing full-suite gate**. A first serial attempt in the restricted sandbox stalled without useful progress and was stopped; the completed run used normal filesystem access.

A follow-up serial run of the three affected test files with normal Temp directory access passed all 119 tests in 26.05 seconds. Thus the five failures did not reproduce without full-suite contention. The sandboxed retry was unable to create Vitest's temporary `ssr` directory and ran no tests; that permission failure is separate from the five full-suite timeouts.

A subsequent complete Windows run, `npm test -- --no-file-parallelism --silent --reporter=dot`, passed: 139 test files passed, 1 skipped; 2,275 tests passed, 7 skipped. Duration: 263.88 seconds. The required coverage run, `npm run test:coverage -- --no-file-parallelism --silent --reporter=dot`, also passed all 2,275 tests with 7 skipped. Coverage was 93.05% lines, 87.01% branches, 93.88% functions, and 91.88% statements overall. `src/modules/oidc.ts` had 100% line coverage and 95.83% branch coverage; `src/commands/login.ts` had 100% line coverage and 96.77% branch coverage.
