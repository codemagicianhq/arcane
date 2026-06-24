---
name: Spell — Elevate
description: "Elevate a PRD from functional to exceptional — proactively enhance features, UX, accessibility, security, and performance using a research lens and a marketing/brand lens"
argument-hint: "Path to PRD, pasted PRD content, or tracker work item ID (e.g., 'Elevate PRD.md for {BUSINESS_NAME} <feature> dashboard')"
agent: agent
---

## Executive Summary

- This spell takes an existing PRD and elevates it to production-grade quality.
- It proactively identifies missing features, UX gaps, accessibility issues, performance targets, and security requirements that the original PRD didn't specify.
- Applies two analytical lenses: a **research lens** (competitive analysis, industry standards) and a **marketing/brand lens** (brand, UX, first-impression review). In the default Arcane roster these map to the Vision and Wanda personas; other orgs map their own — see [agent-policies](../../agents/agent-policies.md) / [naming-conventions](../../governance/naming-conventions.md).
- Output: Enhanced PRD with `[ELEVATED]`-tagged additions, before/after quality scorecard, and research summaries.
- Use this between `spell-plan` and `spell-architect` (or `spell-scope` for large PRDs). It **consumes** a drafted PRD and **feeds** an architecture/scoping spell; it does not author a PRD from scratch (that is `spell-plan`) nor implement one (`spell-implement`).

---

Elevate the provided PRD to exceptional quality.

Use these files for context. All are optional — if a file is absent, fall back as noted and continue rather than aborting:

- [governance/product-excellence-standards.md](../../governance/product-excellence-standards.md) — Quality dimensions, PRD Quality Scorecard, scoring rubric (Bronze / Silver / Gold). **If missing:** warn the user that the canonical scorecard was not found, then proceed with the embedded dimension list (Requirements Completeness, UX, Accessibility, Performance, Security, Responsive Design, Competitive Differentiation) and default to the **Public MVP** profile.
- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop methodology, story sizing rules. **If missing:** treat story sizing as advisory and proceed.
- [governance/testing-standards.md](../../governance/testing-standards.md) — Testing frameworks and coverage thresholds. **If missing:** omit framework-specific coverage targets from acceptance criteria.
- [security/threat-model.md](../../security/threat-model.md) — Active threat model. **If missing:** apply generic OWASP-style security baselines for the Security dimension.
- [agents/agent-policies.md](../../agents/agent-policies.md) / [governance/naming-conventions.md](../../governance/naming-conventions.md) — Agent roster and persona naming. **If missing:** apply the two lenses (research, marketing/brand) without naming personas.
- [DECISIONS.md](../../DECISIONS.md) — Existing ADRs to respect. **If missing:** assume no binding ADR constraints.
- [project.md](../../project.md) — Project goals and business context. **If missing:** infer business context from the PRD itself and flag any assumptions.

---

## Workflow

### 1. PRD Intake

Accept the PRD from one of these input sources:

| Source | Format | How to fetch |
|--------|--------|--------------|
| **File path** | `PRD.md` or any markdown file | Read the file directly |
| **Pasted content** | Inline text in the prompt | Use as-is |
| **Tracker work item ID** | `#508` or `508` with a tracker reference | Respect `tracking_mode` and detect the provider (see below), then fetch the work item and extract its title, description, and acceptance criteria |

If the input is a tracker work item ID:
1. **Determine tracking mode and provider.** Read `tracking_mode` (internal/external) from `.arcane.json` or PRD frontmatter, and detect the configured tracker provider rather than assuming one. The shared tracker-resolution rules live in [governance/development-methodology.md](../../governance/development-methodology.md) — follow them rather than hard-coding a single provider.
   - For an **Azure DevOps** provider, fetch via `az boards work-item show --id {id} --org https://dev.azure.com/{ADO_ORG} --output json` and extract `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, and `System.Title`. Resolve `{ADO_ORG}` (and `{ADO_PROJECT}` if needed) from `.arcane.json` or the PRD frontmatter; **if unset, ask the user** rather than assuming a default.
   - For other providers (e.g. a GitHub issue), use the provider's equivalent fetch and map title / body / acceptance-criteria fields accordingly.
2. If the work item has child items, fetch those too — they may contain additional requirements.
3. If the work item description contains a URL to an external PRD (e.g., a gist, wiki page, or shared document), fetch that content.
4. Combine all content into a single PRD view before proceeding.

Read the full PRD. Identify:
- **Feature name** and business context
- **Target repo** and tech stack
- **Current requirement count** and acceptance criteria count
- **What quality dimensions are already addressed vs missing**

**Quality Profile Selection:** Ask the user which quality profile to target (see `governance/product-excellence-standards.md § Quality Profiles`):

| Profile | Best For | Default? |
|---------|----------|----------|
| **Internal Tool** | Dashboards, CLIs, admin panels, single-user tools | |
| **Public MVP** | First public launch, market validation, early users | ✅ Default |
| **Production SaaS** | Revenue-generating, public-facing, scaled products | |
| **Custom** | User picks target tier per dimension | |

If the user doesn't specify, use **Public MVP**. State the selected profile before proceeding.

### 2. Quality Audit (Scorecard)

Score the PRD against every dimension in `governance/product-excellence-standards.md`.

Use the selected quality profile's target matrix to determine the **gap** for each dimension:

```markdown
## Quality Scorecard — Before Elevation

**Profile:** [selected profile]

| Dimension | Current | Target | Gap | Notes |
|-----------|---------|--------|-----|-------|
| Requirements Completeness | 🥉 / 🥈 / 🥇 | [from profile] | [tiers to close] | [specific gaps] |
| User Experience (UX) | 🥉 / 🥈 / 🥇 | [from profile] | | [specific gaps] |
| Accessibility | 🥉 / 🥈 / 🥇 | [from profile] | | [specific gaps] |
| Performance | 🥉 / 🥈 / 🥇 | [from profile] | | [specific gaps] |
| Security | 🥉 / 🥈 / 🥇 | [from profile] | | [specific gaps] |
| Responsive Design | 🥉 / 🥈 / 🥇 | [from profile] | | [specific gaps] |
| Competitive Differentiation | 🥉 / 🥈 / 🥇 | [from profile] | | [specific gaps] |
| **Overall** | **🥉 / 🥈 / 🥇** | | | |
```

For each dimension where the current score is **below the profile's target**, identify the **specific gaps** that must be closed. These gaps drive the Must-Add tier. For dimensions already at target, identify what would lift them one tier higher (Should-Add).

### 3. Research Phase (Research Lens)

Apply the **research lens** (in the default Arcane roster this is the Vision / Research & Backlog Analyst persona — see [agent-policies](../../agents/agent-policies.md) / [naming-conventions](../../governance/naming-conventions.md); other orgs map their own analyst). Conduct a thorough analysis:

#### 3a. Competitive Analysis
- Identify the top 3 alternatives/competitors for this type of app
- What do they do well that this PRD doesn't specify?
- What are their weaknesses that this app can capitalize on?
- What features do users of these alternatives consistently request?

#### 3b. Industry UX Patterns
- What are the established UX patterns for this category of app?
- Are there design system conventions this PRD should follow (Material, Fluent, etc.)?
- What interaction patterns do users expect as standard?

#### 3c. Accessibility Audit
- What WCAG 2.1 AA requirements are missing from the PRD?
- Are there accessibility features specific to this app category (e.g., data tables need row headers)?
- What assistive technology considerations apply?

#### 3d. Technology Trends
- Are there modern approaches or frameworks that would improve the implementation?
- Are there emerging standards the PRD should adopt early?
- Are there performance optimization techniques specific to this stack?

#### 3e. User Expectations
- What do users of similar apps consider table-stakes features?
- What are common frustrations with alternative apps that this PRD could address?
- What would a power user expect that a casual user wouldn't think to request?

Document findings as (the persona name below reflects the default roster; substitute your org's analyst):
```markdown
## Research Summary (Research Lens — default: Vision)

### Competitive Landscape
[findings]

### UX Pattern Analysis
[findings]

### Accessibility Gaps
[findings]

### Technology Recommendations
[findings]

### User Expectations
[findings]
```

### 4. Marketing & Brand Review (Marketing/Brand Lens)

Apply the **marketing/brand lens** (in the default Arcane roster this is the Wanda / Marketing Strategist persona — see [agent-policies](../../agents/agent-policies.md) / [naming-conventions](../../governance/naming-conventions.md); other orgs map their own strategist). Evaluate the PRD from a brand and user-perception perspective:

#### 4a. First Impressions
- If a user saw this app for the first time with zero context, what would they think?
- Is the value proposition immediately clear?
- Does the UI convey quality and trustworthiness?

#### 4b. Value Proposition Clarity
- Can the app's purpose be explained in one sentence?
- Does the PRD define a "hero feature" that makes the app memorable?
- Is there a clear differentiator from alternatives?

#### 4c. Brand Consistency
- Does the planned UX align with the business's brand identity?
- Is the tone, terminology, and visual language consistent?
- Would this app feel like it belongs in the same family as the business's other products?

#### 4d. User Onboarding
- Is there a clear path from first launch to first value delivered?
- Does the PRD define what "activation" means (the moment the user gets value)?
- Are there engagement hooks that encourage return visits?

#### 4e. Delight Opportunities
- Where can the app surprise users with thoughtful touches?
- Are there moments where exceeding expectations is easy but impactful?
- What would make users want to recommend this app to others?

Document findings as (the persona name below reflects the default roster; substitute your org's strategist):
```markdown
## Marketing Review (Marketing/Brand Lens — default: Wanda)

### First Impression Assessment
[findings]

### Value Proposition
[findings]

### Brand Alignment
[findings]

### Onboarding Path
[findings]

### Delight Opportunities
[findings]
```

### 5. Generate Enhancement Suggestions

Based on the quality audit, the research-lens analysis, the marketing/brand-lens review, **and the selected quality profile**, produce enhancement suggestions in four priority tiers.

Tier assignment is driven by the profile's target matrix (see `governance/product-excellence-standards.md § How Profiles Drive Enhancement Tiers`):

| Tier | Rule |
|------|------|
| Must-Add | Current score is **below** the profile's target for that dimension |
| Should-Add | Current score **matches** the target; enhancement lifts one tier above |
| Could-Add | Current score **meets or exceeds** target; enhancement is aspirational |
| Won't-Add | Explicitly excluded regardless of profile |

**Override:** Security Bronze is always Must-Add. Accessibility gaps are always at least Should-Add.

#### Must-Add (Below Target — Must Close Gap)
Enhancements required to reach the profile's target tier for each dimension. These aren't optional — the profile demands them.

*Example (Public MVP): UX is Bronze but target is Gold → loading states, error states, empty states, onboarding are all Must-Add.*

#### Should-Add (At Target — Stretch One Tier)
Enhancements that lift a dimension one tier above the profile's target. Not blocking the profile's quality bar but elevating toward the ceiling.

*Example (Internal Tool): UX is Silver (matches target) → dark mode, micro-interactions become Should-Add.*

#### Could-Add (Above Target — Aspirational)
Enhancements for dimensions already meeting or exceeding the target. Premium polish that creates delight.

*Example (Internal Tool): Requirements already at Silver (target) → traceability matrix, open questions tracking become Could-Add.*

#### Won't-Add (Explicitly Excluded)
Items considered but rejected, with clear rationale. This prevents future scope creep around "should we add X?"

*Example: Offline mode (not applicable for real-time dashboard), multi-language support (single market for now).*

For each enhancement:
```markdown
- **[ELEVATED]** [Enhancement title]
  - **Rationale:** [Why this matters — reference research or standards]
  - **Source:** Research lens / Marketing-brand lens / Quality scorecard gap / Industry standard
  - **Impact on scope:** Minimal / Moderate / Significant
  - **Acceptance criteria:** [Testable criterion]
```

### 6. Scope Budget Check

⚠️ **Critical guard against scope creep.**

After generating all enhancements, calculate:
- **Original PRD scope:** [N requirements, estimated M stories]
- **Elevated PRD scope:** [N+X requirements, estimated M+Y stories]
- **Scope increase ratio:** [percentage or multiplier]

**If elevated scope exceeds 2× the original:**
1. Flag this prominently to the user
2. Force prioritization — the user must choose which enhancements to keep
3. Recommend splitting Must-Add into the current cycle and Should-Add/Could-Add into future iterations
4. Never silently double the project scope

Present as:
```markdown
## Scope Impact Assessment

| Metric | Original | Elevated | Change |
|--------|----------|----------|--------|
| Requirements | N | N+X | +X |
| Estimated stories | M | M+Y | +Y |
| Scope multiplier | — | — | X.Xx |

⚠️ [Warning if > 2x, or ✅ within budget if ≤ 2x]
```

### 7. Produce Enhanced PRD

Generate the elevated PRD with these characteristics:

1. **All original requirements preserved** — never remove or weaken what was already specified
2. **New requirements tagged `[ELEVATED]`** — clearly distinguishable from original content
3. **Enhanced acceptance criteria** — original criteria enriched with edge cases
4. **Quality scorecard (after)** — re-scored with all enhancements included
5. **Research and marketing summaries** — appended as reference sections
6. **Scope impact assessment** — included for transparency

Structure:
```markdown
# PRD: [Feature Name] — Elevated

## Elevation Summary
- **Quality profile:** [Internal Tool / Public MVP / Production SaaS / Custom]
- **Original score:** [Before]
- **Elevated score:** [After]
- **Enhancements added:** [count by tier]
- **Scope impact:** [multiplier]

## Problem Statement
[Original, enhanced if needed]

## Target Users
[Original, enhanced with persona details if missing]

## Requirements

### Must Have
- [Original requirement 1]
- [Original requirement 2]
- **[ELEVATED]** [New must-have from elevation]

### Should Have
- [Original should-haves]
- **[ELEVATED]** [New should-haves from elevation]

### Won't Have (this iteration)
- [Original exclusions]
- **[ELEVATED]** [New explicit exclusions from elevation]

## User Experience Requirements
**[ELEVATED section if not in original]**
- Loading states: [specification]
- Error states: [specification]
- Empty states: [specification]
- Onboarding: [specification]

## Accessibility Requirements
**[ELEVATED section if not in original]**
- [WCAG 2.1 AA requirements per product-excellence-standards]

## Performance Requirements
**[ELEVATED section if not in original]**
- [Targets per product-excellence-standards]

## Security Requirements
**[ELEVATED section if not in original]**
- [Requirements per product-excellence-standards]

## Responsive Design Requirements
**[ELEVATED section if not in original]**
- [Breakpoints and adaptation rules]

## Acceptance Criteria
- [ ] [Original criteria — preserved]
- [ ] **[ELEVATED]** [New criteria from elevation]

## Dependencies
[Original + any new dependencies from elevated requirements]

## Open Questions
[Original + any new questions raised by elevation]

## Quality Scorecard

| Dimension | Before | After |
|-----------|--------|-------|
| Requirements | 🥉 | 🥇 |
| UX | 🥉 | 🥇 |
| ... | ... | ... |
| **Overall** | **🥉** | **🥇** |

## Research Summary (Research Lens — default: Vision)
[Condensed from Step 3]

## Marketing Review (Marketing/Brand Lens — default: Wanda)
[Condensed from Step 4]
```

### 8. Present for Review

Present the elevated PRD to the user with:

1. **Side-by-side quality score** — before and after across all dimensions
2. **Summary of all additions** — grouped by tier (Must-Add / Should-Add / Could-Add / Won't-Add) with rationale
3. **Scope impact** — clear multiplier and warning if > 2×
4. **Explicit ask:** "Do you want to proceed with the elevated PRD, adjust any enhancements, or revert to the original?"

Wait for user approval before the elevated PRD replaces the original. The user may:
- **Accept all** — proceed with the full elevated PRD
- **Accept with cuts** — remove specific enhancements; re-run scorecard
- **Defer enhancements** — keep the original PRD for this cycle; log enhancements as future work items
- **Reject** — keep the original PRD unchanged

---

## Rules

- **Never remove or weaken original requirements.** Only enhance and add. The user wrote those requirements for a reason.
- **Every enhancement must have a rationale** tied to research findings, competitive analysis, industry standards, or the quality scorecard. No enhancements "because it would be nice."
- **User has final say on all additions.** This spell is a suggestions engine, not a mandate. If the user says "no dark mode," respect that.
- **Flag scope impact honestly.** If enhancements double the project, say so clearly. Don't bury scope creep in a long list.
- **Respect existing ADRs.** If an enhancement contradicts an established ADR, flag the conflict rather than silently adding it.
- **Be honest about unknowns.** If competitive analysis requires actual market research that can't be done in this context, flag it as a research item for the research lens (default: Vision) to investigate separately.
- **Don't gold-plate for the sake of it.** If the PRD already meets the profile's targets across all dimensions, say so and move on. Not every PRD needs elevation.
- **Respect the quality profile.** The profile determines what's Must-Add vs Could-Add. An Internal Tool doesn't need Gold Accessibility unless the user says so. A Production SaaS needs Gold everywhere — no shortcuts.
- **Security enhancement is non-negotiable.** Even if the user skips other enhancements, security gaps identified during elevation must be flagged prominently. The user can still decide, but they must be aware. Security Bronze is always Must-Add regardless of profile.
- **Accessibility is a requirement, not a feature.** Accessibility gaps are always at least Should-Add regardless of profile. WCAG 2.1 AA compliance should be treated as Must-Add for Public MVP and Production SaaS profiles.
