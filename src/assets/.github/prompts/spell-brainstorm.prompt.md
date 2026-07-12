---
name: Spell — Brainstorm
description: Divergent ideation — explore multiple solutions to a problem space before committing to a plan
argument-hint: "Problem space or opportunity (e.g., 'How should we handle multi-tenant billing?')"
agent: agent
---

## Executive Summary

- This spell generates multiple solution options for a problem space before narrowing to a plan.
- It produces divergent ideas, evaluates trade-offs, and surfaces hidden constraints — without committing to implementation.
- Use this BEFORE `spell-plan` when you're unsure which direction to take, or when the problem is ambiguous.
- Output: structured options with trade-off matrix, recommended path, and open questions.

---

Explore the given problem space and generate solution options.

Use these files for context. Each is **optional** — if a file is missing, proceed without it and note the gap in your output so the user knows what wasn't consulted:

- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop methodology. _If missing:_ proceed with general SDLC reasoning.
- [DECISIONS.md](../../DECISIONS.md) — Existing ADRs (to avoid contradicting decided patterns). _If missing:_ assume no decided patterns and state that ADR conflicts could not be checked.
- [project.md](../../project.md) — Project goals and business context. _If missing:_ infer context from the problem statement and ask a clarifying question if goals are unclear.
- [naming-conventions.md](../../naming-conventions.md) — Agent roster and roles. _If missing:_ proceed without role references.
- [TODO.md](../../../TODO.md) — In-progress work (referenced in step 4). _If missing:_ skip the in-progress-work cross-check and note it.

---

## Workflow

### 1. Problem Framing

Accept the problem from one of these sources:

| Source | Format | How to fetch |
|--------|--------|--------------|
| **Description in prompt** | Inline text | Use as-is |
| **ADO work item ID** | `#507` or `507` with org name | Run: `az boards work-item show --id {id} --org https://dev.azure.com/{org} --output json` |
| **File path** | Path to existing doc | Read the file |

Clarify the problem by identifying:
- **What is the core tension?** — competing goals, missing capability, or scaling pain
- **Who is affected?** — users, operators, downstream systems
- **What constraints exist?** — budget, timeline, tech stack, ADRs already decided
- **What does "good enough" look like?** — minimum viable outcome vs. ideal outcome

If the problem is too vague, ask up to 3 clarifying questions before proceeding.

### 2. Divergent Ideation

Generate **3–5 distinct approaches** to the problem. Each must be meaningfully different — not just parameter variations of the same idea.

For each option:

```markdown
### Option N: [Name]
**One-liner:** [What this approach does in ≤15 words]
**How it works:** [2-3 sentences on mechanism]
**Strengths:** [What this gets right]
**Weaknesses:** [What this sacrifices or risks]
**Effort:** S (< 1 sprint) / M (1-2 sprints) / L (3+ sprints)
**Prerequisite ADRs:** [Decisions that must be made first, or "none"]
```

Guidelines for generating options:
- Include at least one **simple/minimal** option (the "just do the simplest thing" path)
- Include at least one **ambitious** option (the ideal-world approach)
- Include at least one **unconventional** option (reframe the problem, challenge assumptions)
- Do NOT include options that violate existing ADRs unless you explicitly flag the conflict

### 3. Trade-off Matrix

Produce a comparison table:

| Dimension | Option 1 | Option 2 | Option 3 | ... |
|-----------|----------|----------|----------|-----|
| **Complexity** | Low/Med/High | | | |
| **Time to value** | Days/Weeks/Months | | | |
| **Scalability** | Poor/Good/Excellent | | | |
| **Reversibility** | Easy/Hard/Irreversible | | | |
| **Risk** | Low/Med/High | | | |
| **Alignment with goals** | Weak/Moderate/Strong | | | |

### 4. Hidden Constraints & Risks

Surface things the user might not have considered:
- Dependencies on decisions not yet made
- Interaction with other in-progress work (check `TODO.md`)
- Security or compliance implications
- Data migration or backwards-compatibility concerns
- Skills or tooling gaps

### 5. Recommendation

State your recommended path clearly:

```markdown
## Recommended Path

**Option [N]: [Name]**

**Why:** [1-2 sentences on why this balances trade-offs best for the current context]

**Immediate next step:** [One concrete action — likely "run `spell-plan` with this direction"]
```

If no single option is clearly best, say so and identify what additional information would break the tie.

### 6. Open Questions

List up to 5 questions that would refine the decision:
- Questions whose answers would change the recommendation
- Questions about constraints not visible in the docs
- Questions about user preferences or business priorities

---

## Rules

- **Never commit to implementation.** This spell produces options, not plans. The output **feeds into `spell-plan`** (run it with the recommended direction). For a large idea spanning multiple features or sprints, hand off to `spell-scope` first to break it into deliverables, then `spell-plan` each.
- **Quantity over polish.** Brainstorming favors breadth. Options don't need to be fully fleshed out — just distinct enough to compare.
- **Challenge assumptions.** If the user's framing seems to constrain solutions unnecessarily, say so explicitly.
- **Respect decided ADRs.** Flag conflicts but don't silently ignore existing decisions.
- **Stay grounded.** Options must be feasible given the tech stack and team size. No "hire 5 engineers" solutions for a solo operation.
