---
name: Spell — Plan
description: Generate a Product Requirements Document (PRD) from a feature description using structured planning
argument-hint: Feature or initiative to plan (e.g., "user authentication for a mobile app")
agent: agent
---

## Executive Summary

- This prompt generates a PRD.md from a feature description or TODO item.
- It follows a structured analysis pattern — requirements, acceptance criteria, and constraints.
- Output feeds directly into `spell-architect` as the next phase of the Spell Loop.
- See [[governance/development-methodology|Development Methodology]] for full Spell Loop reference.

---

Generate a Product Requirements Document for the described feature or initiative.

Use these files for context:

- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop methodology
- [project.md](../../project.md) — Project goals and priorities
- [DECISIONS.md](../../DECISIONS.md) — Existing ADRs to respect

Workflow:

1. **Configure tracking mode first** — decide how this work will be tracked before requirement intake:

   ```yaml
   tracking_mode: internal | external
   external_provider: ado | jira | other
   ```

   Rules:
   - If not explicitly set and ADO context is already present (work item ID + org/project), default to `tracking_mode: external`, `external_provider: ado` for backward compatibility.
   - If `tracking_mode=internal`, do not require an external tracker ID.
   - If `tracking_mode=external` and `external_provider=ado`, collect org/project and resolve process template + available work item types before planning:
     ```bash
     az devops project show --org https://dev.azure.com/{org} --project {project} --query "capabilities.processTemplate.templateName" --output tsv
     az boards work-item-type list --org https://dev.azure.com/{org} --project {project} --output json --query "[].name"
     ```
     Then enforce level-to-type mapping using the first available type in order:
     - Epic-level: `Epic → Feature → User Story → Issue`
     - Feature-level: `Feature → User Story → Issue`
     - Story-level: `User Story → Issue → Task`
     - Task-level: `Task → Issue`
     - Defect-level: `Bug → Issue → Task`
   - If `external_provider=jira` or `other`, record as TODO and continue with internal artifacts unless the operator provides explicit provider workflow steps.

2. **Gather requirements** — accept input from any of these sources:

   | Source | Format | How to fetch |
   |--------|--------|--------------|
   | **Description in prompt** | Inline text | Use as-is |
   | **ADO work item ID** (external/ado mode) | `#507` or `507` with org name | Run: `az boards work-item show --id {id} --org https://dev.azure.com/{org} --output json` and extract `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, and `System.Title` |
   | **File path** | Path to existing doc | Read the file |

   If the input is an ADO work item ID, fetch its content first, then use it as the feature description. If it has child work items, fetch those too for additional context.

   Ask clarifying questions if the feature description is ambiguous. You need to understand:
   - What problem does this solve?
   - Who is the user/audience?
   - What business does this belong to?
   - Are there existing ADRs or constraints?
   - **If `tracking_mode=external` and `external_provider=ado`: What is the ADO work item ID?** — required before proceeding in ADO mode. Store it as `adoWorkItemId` in PRD frontmatter so it flows to `spell-architect` and `stories.json`.

3. **Research context** — check the relevant business docs in `ventures/` and any existing code repos.

4. **Generate PRD.md** with these sections:
   ```markdown
   # PRD: [Feature Name]

   ---
   tracking:
     tracking_mode: [internal|external]
     external_provider: [ado|jira|other|null]
     adoWorkItemId: [number|null]
   ---

   ## Problem Statement
   [What problem are we solving? Why now?]

   ## Target Users
   [Who benefits? Which business?]

   ## Requirements
   ### Must Have
   - [Requirement with acceptance criteria]

   ### Should Have
   - [Requirement with acceptance criteria]

   ### Won't Have (this iteration)
   - [Explicitly excluded scope]

   ## Constraints
   - [Technical: frameworks, platforms, existing architecture]
   - [Business: budget, timeline, dependencies]
   - [Security: per threat model]

   ## Acceptance Criteria
   - [ ] [Testable criterion 1]
   - [ ] [Testable criterion 2]

   ## Dependencies
   - [Other features, services, or decisions needed]

   ## Open Questions
   - [Unresolved items that need human decision]
   ```

   Include an **example config snippet** when presenting the draft:
   ```yaml
   tracking:
     tracking_mode: external
     external_provider: ado
     adoWorkItemId: 541
   ```

5. **Validate against existing ADRs** — ensure the PRD doesn't contradict established decisions.

6. **Save to disk** — derive the feature folder from the tracking configuration and slugified feature name, then write the PRD:
   ```bash
   # external/ado example: adoWorkItemId=541, feature name="Phase 2A" → slug="phase-2a"
   # FEATURE_DIR="features/{adoWorkItemId}-{slug}"

   # internal or non-ado external example:
   # FEATURE_DIR="features/{slug}"
   mkdir -p "$FEATURE_DIR"
   # Write PRD.md to the feature folder
   ```
   Save the generated PRD.md using:
   - `features/{adoWorkItemId}-{slug}/PRD.md` when `tracking_mode=external` and `external_provider=ado`
   - `features/{slug}/PRD.md` when `tracking_mode=internal` or other providers without an ADO ID
   Confirm the resolved path to the user.

7. **Present for review** — show the PRD to the user for approval before proceeding to `spell-architect`.

8. **Provider TODO handling** — if `external_provider=jira` or `external_provider=other`, add a TODO note in PRD open questions that provider-specific automation/linking is pending.

Rules:
- Every requirement must have at least one testable acceptance criterion.
- Scope must be small enough for one sprint (1-2 weeks of agent work).
- If the scope is too large, recommend splitting into multiple PRDs.
- Flag any requirements that would need a new ADR decision.
