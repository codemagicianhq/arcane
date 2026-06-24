---
title: Testing Standards
audience: both
last_updated: YYYY-MM-DD
status: active
tags: [testing, qa, coverage, standards, snape]
---

# Testing Standards

Framework selection, coverage thresholds, and test evidence requirements across all your projects.

## Executive Summary

- Every tech stack has a designated test framework — no ambiguity.
- New code requires 80% unit test coverage; critical paths require 95%.
- Snape (QA Lead) must sign off on test evidence before any ticket moves to "Resolved."
- Test evidence is required in every PR: results, coverage report, known limitations.

---

## Frameworks Per Stack

| Stack | Framework | Assertion Library | Runner | Who Writes | Who Validates |
|-------|-----------|------------------|--------|-----------|---------------|
| .NET 10 (backend) | xUnit | FluentAssertions | `dotnet test` | Thor | Snape |
| Arduino/C++ (firmware) | PlatformIO Unity | Unity assertions | `pio test` | Thor + a partner | Snape |
| Flutter (mobile) | flutter_test + integration_test | expect matchers | `flutter test` | Flash | Snape |
| Node.js (agent tools, bots) | Vitest | Vitest matchers (chai-compatible) | `npx vitest run` | Thor | Snape |
| Terraform (IaC) | terraform validate + Checkov | Policy-as-code rules | `checkov -d .` | Scotty | Gandalf |
| Markdown docs (Arcane) | markdownlint + markdown-link-check | Lint rules | `markdownlint .` | Any agent | Scotty |

### Why These Frameworks

- **xUnit** — .NET ecosystem default; best LLM training coverage; clean fixture model.
- **FluentAssertions** — human-readable assertions; better failure messages than Assert.
- **PlatformIO Unity** — the dominant embedded C/C++ test framework; runs on host (no hardware needed for unit tests).
- **flutter_test** — Flutter's built-in; widget testing + integration_test for full-app scenarios.
- **Vitest** — modern, fast, ESM-native; Jest-compatible API but better performance.
- **Checkov** — policy-as-code scanner for Terraform; catches security misconfigurations before apply.
- **markdownlint** — catches formatting issues, broken links, inconsistent heading levels.

---

## Coverage Thresholds

| Category | Minimum Coverage | Examples |
|----------|-----------------|----------|
| **Standard code** | 80% | Business logic, data access, UI components, API handlers |
| **Critical paths** | 95% | Authentication, payment processing, IoT firmware commands, calibration protocols, encryption/signing |

### What Counts as "Critical"

- **Authentication and authorization** — login, token validation, permission checks
- **Payment processing** — any code that touches money or billing
- **IoT firmware commands** — device provisioning, calibration, OTA updates
- **Encryption and signing** — key generation, message signing, certificate validation
- **Data integrity** — database migrations, schema changes, backup/restore

### What Doesn't Count Toward Coverage

- Auto-generated code (EF migrations, gRPC stubs, Swagger output)
- Framework boilerplate (startup.cs routing, middleware registration)
- Configuration-only files (appsettings.json, terraform.tfvars)

---

## Test Evidence Requirements

Every PR must include:

1. **Test results** — pass/fail output from the test runner (screenshot or CI log link)
2. **Coverage report** — line/branch coverage percentage (from `dotnet test --collect`, `flutter test --coverage`, etc.)
3. **Known limitations** — document any untested edge cases or deferred scenarios
4. **Agent attribution** — if an agent wrote the tests, include standard commit trailers

### PR Template (Test Section)

```markdown
## Test Evidence

**Test runner output:**
[paste or link to CI output]

**Coverage:**
- Overall: XX%
- Critical paths: XX%

**Known limitations:**
- [any untested scenarios]

**Agent trailers:**
- Agent: [agent name]
- Model: [model]
- Provider: [provider]
```

---

## Test Types

### Unit Tests (Required)

- Test individual functions/methods in isolation
- Mock external dependencies (DB, API, hardware)
- Fast execution (< 1 second per test)
- Run on every commit and in CI

### Integration Tests (Recommended)

- Test component interactions (API → DB, mobile → backend)
- Use real dependencies where practical (in-memory DB, test containers)
- Run in CI on PR creation and merge

### End-to-End Tests (For UI Stories)

- Test complete user workflows
- Use browser automation (Playwright for web, Flutter integration_test for mobile)
- Run in CI on merge to main (not on every commit — too slow)

### Firmware Tests ({BUSINESS_NAME}-Specific)

- Host-based unit tests via PlatformIO Unity (no hardware required)
- Hardware-in-the-loop tests for calibration validation (requires physical device)
- BLE protocol tests via mock transport

---

## Quality Gate in Ticket Lifecycle

Adapt the ticket lifecycle policy to your tracker:

The **Code Review → QA** transition now requires:

1. All unit tests pass (CI green)
2. Coverage meets thresholds (80% standard / 95% critical)
3. No HIGH-severity review findings unresolved
4. Snape signs off with test evidence linked to the work item

The **QA → Resolved** transition requires:

1. Integration tests pass (if applicable)
2. Manual verification for UI stories (screenshot or recording)
3. Known limitations documented in work item
4. Snape marks ticket as validated

---

## Agent Responsibilities

| Agent | Testing Role |
|-------|-------------|
| **Thor** | Writes unit + integration tests for .NET backend, Node.js tools, firmware |
| **Flash** | Writes unit + widget + integration tests for mobile (Flutter) |
| **Wasp** | Writes unit + E2E tests for frontend (Blazor/React) |
| **Snape** | Validates all test evidence; signs off on QA gates; runs adversarial test review |
| **Scotty** | Maintains CI pipelines that run tests; configures Checkov for Terraform; maintains markdownlint config |
| **Gandalf** | Reviews test architecture decisions; validates Terraform policy compliance |
