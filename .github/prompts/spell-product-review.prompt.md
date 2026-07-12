---
name: Spell — Product Review
description: Build/Measure/Analyze/Decide cycle — evaluate feature performance and recommend next actions
argument-hint: Feature or product area to review (e.g., "{BUSINESS_NAME} storefront performance", "{BUSINESS_NAME} beta feedback")
agent: agent
---

## Executive Summary

- This prompt runs a Build/Measure/Analyze/Decide product review cycle.
- Used after a feature ships to evaluate its impact and decide what's next.
- Combines analytics data, user feedback, and business metrics into an actionable recommendation.
- Feeds back into `spell-plan` for the next iteration of the product.

---

Run a product review cycle for the specified feature or product area.

**Placeholders** (resolve from `.arcane.json` or the feature/PRD frontmatter; if unset, **ask** rather than assuming a default):

- `{BUSINESS_NAME}` — the business/venture under review.
- `{BUSINESS_ROOT}` — the directory holding that business's product docs (KPIs, metrics, strategy). If no such root is configured or present, ask where these docs live; if there is none, treat the per-business metrics docs as absent and apply the fallback in step 2.

Use these files for context:

- [project.md](../../project.md) — Business goals and priorities
- The relevant business docs under `{BUSINESS_ROOT}/` — KPIs, metrics, and product strategy. **If `{BUSINESS_ROOT}` or these docs are missing, proceed with what `project.md` provides and flag the gap; if even `project.md` is absent, report "insufficient context to review" and list what is missing rather than inventing goals.**
- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop context

Workflow:

1. **Build — What was shipped?**
   - Summarize the feature/change that was deployed.
   - List the acceptance criteria and whether they were met.
   - Note the timeline: when was it planned, built, and shipped?

2. **Measure — What data do we have?**
   - Gather available metrics:
     - Usage data (if analytics are configured)
     - Error rates / crash reports
     - User feedback (support tickets, reviews, direct feedback)
     - Business metrics (sales, conversions, engagement)
   - If the KPI/metrics docs under `{BUSINESS_ROOT}` (or any analytics source) are missing or empty, **do not fabricate numbers.** Proceed with "insufficient data to review" and list exactly what is missing (which docs, which metrics, which instrumentation), then recommend adding it before the next review.

3. **Analyze — What does the data tell us?**
   - Is the feature achieving its goal?
   - Are there unexpected behaviors or usage patterns?
   - How does it compare to the hypothesis in the PRD?
   - What's working well? What isn't?

4. **Decide — What do we do next?**
   - **Iterate:** feature needs improvement — generate follow-up PRD items.
   - **Scale:** feature is working — invest in marketing/growth.
   - **Pivot:** feature isn't solving the problem — reconsider approach.
   - **Kill:** feature is net negative — plan removal.

5. **Generate product review report**:
   ```markdown
   ## Product Review — [Feature/Product]

   **Date:** [timestamp]
   **Review Period:** [date range]
   **Business:** {BUSINESS_NAME}

   ### Build Summary
   - Feature: [what was built]
   - Shipped: [date]
   - Stories completed: [N]

   ### Metrics
   | Metric   | Baseline | Current | Target | Status       |
   | -------- | -------- | ------- | ------ | ------------ |
   | [metric] | [before] | [after] | [goal] | ON/OFF TRACK |

   ### Analysis
   - [Key insights from the data]
   - [Unexpected findings]

   ### Decision
   - **Recommendation:** [Iterate / Scale / Pivot / Kill]
   - **Rationale:** [Why]
   - **Next Actions:**
     1. [Action item → owner]
     2. [Action item → owner]

   ### Missing Instrumentation
   - [Metrics we should be tracking but aren't]
   ```

6. **Present for discussion** — this review drives human decision-making, not autonomous action.

Rules:
- **Data-driven, not opinion-driven.** Base recommendations on evidence, not assumptions.
- **Acknowledge uncertainty.** If data is thin, say so — don't overfit to limited signals.
- **Recommendation guardrails:** Flag any recommendation involving purchases or subscriptions for human approval (see your org's decision log / spending policy if one exists).
- **Connect to business goals.** Every analysis must reference the relevant business's KPIs from `{BUSINESS_ROOT}` or `project.md`; if neither is available, say so explicitly instead of asserting goals.
- **No vanity metrics.** Focus on metrics that drive decisions, not numbers that look good.
