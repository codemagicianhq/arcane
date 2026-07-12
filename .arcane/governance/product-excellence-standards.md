---
title: Product Excellence Standards
audience: both
last_updated: YYYY-MM-DD
status: active
tags:
  [quality, ux, accessibility, performance, security, spell-enchant, ADR-052]
---

# Product Excellence Standards

## Purpose

Define what "the best version of an app" means across every dimension — UX, accessibility, performance, security, and polish. This document provides the **PRD Quality Scorecard** that [[.github/prompts/spell-enchant.prompt|spell-enchant]] evaluates against when enchanting a PRD from functional to exceptional.

## Quality Dimensions

### 1. Requirements Completeness

| Criterion                        | Description                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Testable acceptance criteria** | Every requirement has ≥1 acceptance criterion that can be verified by an automated test or a concrete manual check |
| **Priority classification**      | All requirements classified as Must Have / Should Have / Won't Have                                                |
| **Scope boundary**               | "Won't Have" section explicitly excludes items to prevent scope creep                                              |
| **Dependency identification**    | External services, APIs, and decisions the feature depends on are listed                                           |
| **Open questions documented**    | Unresolved items are captured — not ignored or assumed                                                             |

### 2. User Experience (UX)

| Criterion              | Description                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **Full user journey**  | Every user-facing feature defines: happy path, error states, edge cases, empty states               |
| **Loading states**     | Users see meaningful feedback during async operations (skeleton screens, spinners, progress bars)   |
| **Error recovery**     | Errors include actionable messages — users know what went wrong and what to do next                 |
| **Empty states**       | First-use and zero-data states guide users toward the next action rather than showing blank screens |
| **Success feedback**   | Completions are acknowledged (toast, animation, redirect) — users know their action worked          |
| **Onboarding flow**    | New users have a clear path from zero to first value delivered                                      |
| **Consistency**        | UI patterns, terminology, and behavior are consistent across features                               |
| **Micro-interactions** | Transitions, hover effects, and subtle animations provide polish without slowing users down         |

### 3. Accessibility (WCAG 2.1 AA Baseline)

| Criterion                 | Description                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------- |
| **Keyboard navigation**   | All interactive elements reachable and operable via keyboard alone                 |
| **Screen reader support** | Semantic HTML, ARIA labels, live regions for dynamic content                       |
| **Color contrast**        | Text meets 4.5:1 ratio (normal text) or 3:1 (large text) against background        |
| **Focus indicators**      | Visible focus ring on all interactive elements                                     |
| **Alternative text**      | All images, icons, and media have descriptive alt text or are marked decorative    |
| **Form labels**           | All form inputs have associated labels; error messages are programmatically linked |
| **Motion sensitivity**    | Animations respect `prefers-reduced-motion`; no content-critical motion            |
| **Text resizing**         | UI remains usable at 200% zoom                                                     |

### 4. Performance

| Criterion                                         | Description                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| **Largest Contentful Paint**                      | Web: < 2.5s; Mobile: < 3.5s                                                |
| **First Input Delay / Interaction to Next Paint** | Web: < 100ms; Mobile: < 200ms                                              |
| **Cumulative Layout Shift**                       | < 0.1 (no unexpected visual shifts during load)                            |
| **API response time**                             | p95 < 500ms for user-facing endpoints; p95 < 2s for batch/report endpoints |
| **Bundle size**                                   | Web: initial JS bundle < 200KB gzipped; lazy-load non-critical modules     |
| **Offline / degraded**                            | Define behavior when network is slow or unavailable (if applicable)        |
| **Concurrent users**                              | Target number documented; load testing plan defined for > 100 concurrent   |

### 5. Security (Beyond OWASP Baseline)

| Criterion                  | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Data classification**    | Each data field classified: Public / Internal / Confidential / Restricted       |
| **Auth flows specified**   | Authentication and authorization model defined — no "we'll add auth later"      |
| **Input validation depth** | Server-side validation for all user inputs; client-side validation for UX only  |
| **Audit trail**            | State-changing actions produce audit log entries (who, what, when)              |
| **Rate limiting**          | API endpoints have rate limits to prevent abuse                                 |
| **Session management**     | Session timeout, renewal, and revocation policies defined                       |
| **Secret handling**        | No hardcoded secrets; all credentials via environment variables or secret store |
| **Dependency scanning**    | Third-party packages audited for known vulnerabilities                          |

### 6. Responsive Design

| Criterion                 | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| **Breakpoints defined**   | Mobile (< 768px), Tablet (768–1024px), Desktop (> 1024px)             |
| **Touch targets**         | Interactive elements ≥ 44×44px on mobile                              |
| **Layout adaptation**     | Content reflows appropriately — no horizontal scrolling on mobile     |
| **Navigation adaptation** | Desktop nav collapses to mobile pattern (hamburger, bottom nav, etc.) |

### 7. Competitive Differentiation

| Criterion                 | Description                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| **Alternative analysis**  | Top 3 alternatives identified; what they do well and where they fall short |
| **Unique value**          | At least one feature or quality that sets this app apart from alternatives |
| **Table-stakes coverage** | Features that users expect as standard for this category are all present   |
| **Experience premium**    | At least one UX element that makes users think "this is well-made"         |

---

## Quality Profiles

Not every product needs Gold in every dimension. Quality profiles set the **target** per dimension based on the product type. The target determines what counts as Must-Add (current → target gap), Should-Add (one tier above target), and Could-Add (aspirational). Gold remains the ceiling shown in the scorecard for all profiles — profiles control what you're _aiming_ for.

### Profile Definitions

| Profile             | When to Use                                                           |
| ------------------- | --------------------------------------------------------------------- |
| **Internal Tool**   | Dashboards, CLIs, admin panels, single-user tools, dev utilities      |
| **Public MVP**      | First public launch, market validation, early adopters, beta products |
| **Production SaaS** | Revenue-generating, public-facing, scaled, established products       |
| **Custom**          | User picks target tier per dimension manually                         |

### Target Matrices

#### Internal Tool

| Dimension     | Target | Rationale                                                          |
| ------------- | ------ | ------------------------------------------------------------------ |
| Requirements  | Silver | Clear specs prevent rework even for internal tools                 |
| UX            | Silver | Operator efficiency matters, but polish is secondary               |
| Accessibility | Bronze | Single known user; invest only if the user has accessibility needs |
| Performance   | Silver | Performance issues waste the operator's time                       |
| Security      | Gold   | Internal tools often handle secrets, tokens, and admin access      |
| Responsive    | Bronze | Desktop-only is usually correct for internal tools                 |
| Competitive   | Bronze | No market competition — it's built for you                         |

#### Public MVP

| Dimension     | Target | Rationale                                                            |
| ------------- | ------ | -------------------------------------------------------------------- |
| Requirements  | Silver | Must be clear enough for a small team to ship confidently            |
| UX            | Gold   | First impressions determine adoption; UX is the product at MVP stage |
| Accessibility | Silver | Legal compliance + wider user reach from day one                     |
| Performance   | Silver | Must feel fast; fine-tune later with real usage data                 |
| Security      | Gold   | No second chances on security with real user data                    |
| Responsive    | Silver | Users expect mobile access; at least don't break                     |
| Competitive   | Silver | Must articulate why users should choose this over alternatives       |

#### Production SaaS

| Dimension     | Target | Rationale                                                |
| ------------- | ------ | -------------------------------------------------------- |
| Requirements  | Gold   | Revenue depends on reliability; every edge case matters  |
| UX            | Gold   | Users paying money expect best-in-class experience       |
| Accessibility | Gold   | Legal requirement (ADA/EAA); brand reputation; wider TAM |
| Performance   | Gold   | Performance is a feature; slowness causes churn          |
| Security      | Gold   | Breach = business-ending event at scale                  |
| Responsive    | Gold   | Multi-device is table-stakes for SaaS                    |
| Competitive   | Gold   | Must defend market position with clear differentiation   |

### Default Profile

If the user does not specify a profile, **Public MVP** is the default. Rationale: it provides the strongest quality-to-scope ratio — Gold where it matters most (UX, Security) without over-engineering internal or infrastructure dimensions.

### How Profiles Drive Enhancement Tiers

| Enhancement Tier | Rule                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| **Must-Add**     | Current score is below the profile's target for that dimension             |
| **Should-Add**   | Current score matches the target; enhancement would lift to one tier above |
| **Could-Add**    | Current score already meets or exceeds target; enhancement is aspirational |
| **Won't-Add**    | Explicitly excluded regardless of profile                                  |

**Override:** Security and Accessibility gaps are always at least Should-Add regardless of profile. A Bronze Security score is always Must-Add.

---

## PRD Quality Scorecard

Score each dimension on a three-tier rubric:

| Level      | Name        | Meaning                                                                                   |
| ---------- | ----------- | ----------------------------------------------------------------------------------------- |
| **Bronze** | Functional  | Meets minimum requirements — works but lacks polish, accessibility, and proactive quality |
| **Silver** | Polished    | Good coverage across all dimensions — professional, accessible, performant                |
| **Gold**   | Exceptional | Best-in-class for this app category — delightful UX, proactive security, competitive edge |

### Scoring Criteria Per Dimension

| Dimension         | Bronze                      | Silver                                          | Gold                                                                            |
| ----------------- | --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| **Requirements**  | Has acceptance criteria     | Priority classified, scope bounded, deps listed | Open questions documented, traceability matrix ready                            |
| **UX**            | Happy path defined          | Error + empty states covered, loading feedback  | Full journey with micro-interactions, onboarding, consistency review            |
| **Accessibility** | Basic semantic HTML         | WCAG 2.1 AA compliance stated                   | Keyboard nav, screen reader, color contrast, motion sensitivity all specified   |
| **Performance**   | No targets stated           | Core Web Vitals targets defined                 | Load budgets, lazy loading strategy, offline behavior specified                 |
| **Security**      | OWASP baseline              | Data classification + auth flows specified      | Audit trail, rate limiting, session management, dependency scanning all defined |
| **Responsive**    | "Mobile friendly" mentioned | Breakpoints and layout adaptation defined       | Touch targets, nav adaptation, and responsive images specified                  |
| **Competitive**   | No analysis                 | Top 3 alternatives listed                       | Unique value articulated, table-stakes confirmed, experience premium identified |

### Overall Score

- **Bronze overall**: Any dimension scores Bronze
- **Silver overall**: All dimensions score Silver or above
- **Gold overall**: All dimensions score Gold

---

## How This Is Used

1. **`spell-enchant`** asks the user to select a quality profile, scores the incoming PRD against this scorecard, and produces enhancement suggestions to reach the profile's targets per dimension.
2. **`spell-scope`** performs a quick scorecard check during PRD intake and recommends `spell-enchant` if any dimension scores below the profile's target.
3. **`spell-plan`** outputs a PRD that starts at Bronze or Silver — `spell-enchant` is the path to the profile's targets.
4. **`spell-review`** can reference these standards when evaluating whether shipped code meets the quality bar.
5. **Quality Profiles** control what "good enough" means — Internal Tool, Public MVP (default), Production SaaS, or Custom.

## Related

- [[DECISIONS#ADR-052|ADR-052 — Product Excellence Standards and spell-enchant]]
- [[governance/testing-standards|Testing Standards]] — Coverage thresholds and framework selection
- [[governance/cicd-standards|CI/CD Standards]] — Pipeline quality gates
- [[security/threat-model|Threat Model]] — Active security concerns
- [[governance/development-methodology|Development Methodology]] — Spell Loop flow
