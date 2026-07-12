---
name: Spell — Explain Concept
description: "Explain a technical concept, architecture, or system behavior in a balanced way: enough technical depth to be accurate, enough plain language to be accessible. Use when: confused about how something works, need to understand a system before making decisions, want a 'teach me' breakdown."
argument-hint: "Concept or question to explain (e.g., 'how does our auth middleware inject tokens?', 'what is OAuth2 PKCE flow?', 'why can't {AGENT_NAME} see the config?')"
agent: agent
---

## Executive Summary

- This prompt produces clear, structured explanations of technical concepts, architectures, or system behaviors.
- It balances technical accuracy with accessibility — no dumbing down, no jargon walls.
- Use this when you need to understand something before making a decision or planning implementation.

---

Explain the concept, system, or behavior described in the user's prompt argument.

## Explanation Style

Follow these rules strictly:

1. **Start with the one-sentence answer.** What is it, or why does it happen? No preamble.
2. **Use analogies from the user's world** — relate to tools, systems, or workflows they already use (their editor, their chat/notification tooling, their own agents, their own infrastructure). Check the workspace for context about the user's setup.
3. **Use diagrams when architecture matters.** Mermaid sequence diagrams for flows, flowcharts for decision trees. Don't use diagrams for simple definitions.
4. **Show the "so what?"** — connect the explanation to what the user can *do* with this knowledge. What decisions does it unlock? What options does it create?
5. **Name the moving parts** with a summary table when there are multiple components, layers, or options to compare.
6. **Use real examples from their system** — reference actual agent names, actual config files, actual commands. Don't use generic placeholders when specific is available.
7. **Flag when your explanation hits a boundary** — if something requires verification, testing, or is based on source code reading vs official docs, say so.

## Tone Calibration

- Technical jargon: **Use it, but define it inline** on first use. Example: "the dispatcher (the runtime component that routes a request to the right handler)..."
- Depth: **Go deep enough that the user could explain it to someone else.** If they asked "what is X?", they should walk away knowing what X is, how X works, and when X matters.
- Length: **Match the concept's complexity.** A simple definition gets 3-4 lines. An architecture explanation gets diagrams, tables, and flow breakdowns.

## Research First

Before explaining:
1. Search the workspace for relevant docs, configs, and journal entries about the topic
2. If the concept involves a specific tool or framework, check its config files, source, and official docs as needed
3. If the concept involves infrastructure or deployment, check the relevant infra, config, and ops directories in the repo
4. Ground the explanation in what's actually deployed, not hypothetical setups

## Output Structure

Adapt the structure to the concept — don't force every explanation into the same template. But generally:

- **One-line answer** (always)
- **How it works** (always — the core explanation)
- **Diagram** (when architecture/flow matters)
- **Comparison table** (when there are alternatives or multiple components)
- **What this means for you** (always — connect to decisions or actions)

## Rules

1. **Validate the input is a concept to explain, not a task to perform.** This spell *explains* — it does not build, fix, plan, or change anything. If the argument is empty or too vague to identify a topic (e.g. "explain this" with no referent), ask the user what they want explained before proceeding.
2. **Redirect action requests.** If the argument is actually a request to *do* work rather than understand it, say so and point to the right spell instead of attempting the action:
   - "implement / build / add X" → suggest **`spell-implement`**.
   - "fix / debug X" → suggest **`spell-bug`**.
   - "plan / break down X" → suggest **`spell-plan`**.
   - "design / decide between X and Y (architecture)" → suggest **`spell-architect`**.
   - If the user genuinely wants *both* an explanation and then action, explain first, then hand off.
3. **Explain only — never modify.** Do not edit files, run mutating commands, or make external posts as part of an explanation. Reading and searching the workspace is expected; changing it is out of scope.

## Related Spells

- **`spell-architect`** — when the concept is a *design choice* and the user needs a decision (trade-offs, ADR), explain the landscape here, then hand off to architect to decide.
- **`spell-plan`** — once a concept is understood, plan turns that understanding into ordered, actionable steps.
- **`spell-implement`** / **`spell-bug`** — the build/fix spells this one redirects to when the request is an action rather than a question.
