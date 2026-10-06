---
name: Spell — Architect
description: Generate architecture decisions and story breakdown from a PRD, producing architecture.md and stories.json
claude_description: Use PROACTIVELY once a PRD exists and needs architecture decisions and a story breakdown before implementation starts.
argument-hint: Path to PRD.md or paste the PRD content
agent: agent
---

## Executive Summary

- This prompt takes a PRD and produces architecture decisions plus an implementable story breakdown.
- It follows a structured solutioning pattern — progressive context chain from requirements to implementation plan.
- Outputs `architecture.md` and `stories.json` that feed into `spell-implement`.
- See [[.arcane/governance/development-methodology|Development Methodology]] for full Spell Loop reference.

---

Generate architecture decisions and story breakdown from the provided PRD.

Use these files for context:

- [governance/development-methodology.md](../../.arcane/governance/development-methodology.md) — Spell Loop methodology and stories.json format
- [governance/testing-standards.md](../../.arcane/governance/testing-standards.md) — Testing frameworks and coverage requirements
- [DECISIONS.md](../../DECISIONS.md) — Existing ADRs to respect and extend

Workflow:

1. **Read the PRD** — understand requirements, constraints, and acceptance criteria.
   - If no PRD exists for the feature, do not architect against assumptions — recommend the user run `spell-plan` first to produce one, then return here.

2. **Verify PRD coverage** — before designing the architecture, confirm the PRD covers the scope needed to design against. Never guess to fill holes. If there are gaps or ambiguities (missing requirements, undefined constraints, unresolved acceptance criteria), list them explicitly and ask the user to resolve them — or loop back to `spell-plan` — before proceeding. Only continue once the gaps are resolved.

3. **Make architecture decisions** — for each significant technical choice:
   - What are the options?
   - What are the tradeoffs?
   - What does the decision depend on?
   - Propose a recommendation with rationale.
   - Flag decisions that need a new ADR in DECISIONS.md.

4. **Generate architecture.md**:
   ```markdown
   # Architecture: [Feature Name]

   ## Overview
   [High-level approach in 2-3 sentences]

   ## Decisions
   ### [Decision 1: e.g., API Design]
   - **Options:** [A, B, C]
   - **Decision:** [Chosen option]
   - **Rationale:** [Why]
   - **ADR:** [Existing ADR-NNN or "Needs new ADR"]

   ## Component Diagram
   [Mermaid diagram showing how components interact]

   ## Data Flow
   [Sequence diagram for key workflows]

   ## Testing Strategy
   - [Framework per governance/testing-standards.md]
   - [Key test scenarios from acceptance criteria]
   - [Coverage targets]

   ## Security Considerations
   - [Per threat model]

   ## Implementation Notes
   - [Tech stack specifics, package versions, patterns to follow]
   ```

5. **Break into stories** — generate `stories.json` per the format in development-methodology.md:
   - Each story must be completable in one AI context window (one file change, one endpoint, one component).
   - Order stories by dependency (infrastructure first, then API, then UI).
   - Include acceptance criteria from the PRD mapped to specific stories.
   - Mark all stories as `"passes": false`.

5a. **Validate stories.json schema** — before outputting, self-check every field. Missing fields break `spell-implement`. Required top-level fields:
   - `feature` (string)
   - `branchName` (string, in the autonomous roster-agent form of the branch-naming rule — `git-conventions.md` → Branch Naming)
   - `assignedAgent` (string, agent slug)
   - `trackingMode` (`internal` or `external`)
   - `externalProvider` (required when `trackingMode=external`)
   - `adoWorkItemId` (required only when `trackingMode=external` and `externalProvider=ado`)

   Required per-story fields:
   - `id` (string, e.g. `FEAT-001`)
   - `title` (string)
   - `description` (string — detailed enough for implementation without additional context)
   - `acceptanceCriteria` (array of strings)
   - `priority` (number, 1 = highest)
   - `passes` (boolean, always `false` on output)
   - `assignedTo` (string, agent slug)
   - `testEvidence` (null on output)

   If any required field is missing, regenerate before outputting. Do not present incomplete stories.json.

6. **Implementation readiness check** — verify:
   - Every PRD requirement maps to at least one story.
   - No story depends on an unresolved Open Question from the PRD.
   - Testing strategy covers all acceptance criteria.
   - No architecture decision contradicts existing ADRs.

7. **Save to disk** — write both outputs to the feature folder:
   - `features/{adoWorkItemId}-{slug}/architecture.md` and `features/{adoWorkItemId}-{slug}/stories.json` when `trackingMode=external` and `externalProvider=ado`
   - `features/{slug}/architecture.md` and `features/{slug}/stories.json` when `trackingMode=internal` (or non-ADO external providers without an ADO ID)

   Resolve `trackingMode`, `externalProvider`, optional `adoWorkItemId`, and slug from PRD frontmatter first. If the folder does not exist, create it with `mkdir -p`.
   Confirm the paths to the user after writing.

8. **Present for review** — show the architecture and story breakdown to the user.

   <!-- fragment:needs-you:start -->
   **Needs you — required operator actions.** When this run leaves an action that only the operator can take, and the work is not correct or complete until it is taken, report it in one block at the very top of the final report, before every other section and before any optional next step:

   ```markdown
   ## ⚠ Needs you

   - <exactly what to do: the command, the link, or the question> — <why the agent cannot do it itself>
   ```

   - **What belongs in it:** an action the work needs that only the operator can take — approving or merging a pull request, accepting a decision record, answering a question the work is waiting on, confirming a `guarded` push, running an interactive command such as `spell unblock-push`, or a step on an external platform the agent cannot reach. An optional suggestion, a next spell to run, or anything the agent could do itself is not a required action and stays out of the block.
   - **One line per action.** Say exactly what to do, then, after the dash, why the agent cannot do it. Write the command, link or question out in full; never point elsewhere with "see above".
   - **Never only among optional steps.** An action required for correctness is never listed only under next steps, suggestions, `Carry Forward` or `What's Next?`. It may be repeated there, but it always appears in this block.
   - **Omit it when empty.** When nothing needs the operator, leave the block out entirely: no heading and no "None" line.
   - **Every final report.** The block belongs in whatever report ends the run, including a report written when the spell stops early.
   - Enforcement: explicitly advisory prose (ARC-023) — no check reads a spell's actual output for this block; it holds by these instructions alone.
   <!-- fragment:needs-you:end -->

Rules:
- Stories must be right-sized per the methodology doc (not "build the entire dashboard").
- Architecture decisions must reference existing ADRs when relevant.
- Use Mermaid for all diagrams, per rule 8 (`.arcane/governance/universal-agent-rules.md`) — this spell's component/data-flow diagrams are agent-authored design output, not the generated-state-diagrams sub-convention ARC-036 covers.
- If PRD scope is too large, recommend splitting before proceeding.
