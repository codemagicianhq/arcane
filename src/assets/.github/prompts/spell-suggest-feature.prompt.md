---
name: Spell — Suggest Feature
description: Capture a feature suggestion from smoke testing or usage — assesses impact, files a tracker item (provider-aware), and adds to backlog
argument-hint: Feature idea (e.g., "Settings page to change instance name and gateway URL")
agent: agent
---

## Executive Summary

- This prompt captures feature suggestions discovered during smoke testing or regular use.
- It creates a structured user story, assesses impact, and files a tracker item using whatever provider the repo is configured for (respects `tracking_mode`; ADO is one option, not an assumption).
- Output is a tracked backlog item ready for future `spell-plan` invocation (or `spell-scope` for large, multi-feature suggestions).
- See [[governance/development-methodology|Development Methodology]] for the full Spell Loop reference and tracker-provider specifics.

---

Capture and document the described feature suggestion.

Use these files for context:

- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop methodology
- [project.md](../../project.md) — Project goals and priorities
- [DECISIONS.md](../../DECISIONS.md) — Existing ADRs to check for overlap
- [TODO.md](../../TODO.md) — Current backlog items

Workflow:

1. **Capture the suggestion** — gather these details from the user (ask if missing):

   | Field | Description |
   |-------|-------------|
   | **Title** | Short descriptive name for the feature |
   | **User story** | "As a [role], I want [capability], so that [benefit]" |
   | **Discovery context** | What were you doing when you noticed this gap? |
   | **Affected area** | Page, component, workflow, or system |
   | **Priority suggestion** | Must-have / Should-have / Nice-to-have |

2. **Check for duplicates** — before creating a work item:
   - Search `TODO.md` for related items.
   - Search `DECISIONS.md` for ADRs that already cover this.
   - Check the relevant PRD at `{PRD_PATH}` for existing must-haves (resolve from `.arcane.json` or the active feature/PRD frontmatter; if unset, ask the user — or skip this check if the repo has no PRD).
   - If the feature is already planned, note which must-have (MH-XX) it maps to and skip to Step 6.

3. **Assess impact** — quick evaluation:

   | Dimension | Assessment |
   |-----------|------------|
   | **Who benefits?** | Which users/personas are affected |
   | **Effort estimate** | S (< 1 day) / M (1-3 days) / L (3+ days) |
   | **Dependencies** | What must exist first? Other features, infrastructure, ADRs? |
   | **Risk** | Low / Medium / High — any security, UX, or architecture implications? |
   | **Phase recommendation** | Which phase should this land in? (current, next, future) |

4. **Resolve tracking mode** — before creating a tracker item:
   - Read `tracking_mode` / `external_provider` from `.arcane.json` or the active PRD frontmatter if available.
   - If missing, ask the user:
     - `tracking_mode: internal | external`
     - `external_provider: ado | jira | other` (required only for external mode)
   - If ADO context is already active and no explicit choice is provided, default to `external` + `ado` for backward compatibility.

5. **Create tracker item (conditional)**:
   - If `tracking_mode=external` and `external_provider=ado`, create a work item:
     ```bash
     az boards work-item create \
       --type "User Story" \
       --title "{title}" \
       --description "{formatted user story + impact assessment}" \
       --org https://dev.azure.com/{org} \
       --project {project} \
       --output json
     ```
     Extract the work item ID from the response.
   - If `tracking_mode=internal`, skip external item creation and track in `TODO.md` only.
   - If `external_provider=jira` or `other`, add a TODO note for provider-specific automation and continue with `TODO.md` tracking.
   - The ADO command above is illustrative; for the authoritative per-provider creation steps and field mappings, see [[governance/development-methodology|Development Methodology]].

6. **Update backlog** — add a line to `TODO.md`:
   ```markdown
   - [ ] {Title} — {one-line description} (tracking: {internal|provider#{id}|provider TODO}, {priority}, {effort})
   ```
   If the feature maps to an existing must-have, note the mapping instead of creating a duplicate entry.

7. **Present summary** — show the user what was captured:
   ```markdown
   ## Feature Suggestion: {Title}

   **User Story:** As a {role}, I want {capability}, so that {benefit}.
   **Discovery:** {context}
   **Impact:** {who benefits} | Effort: {S/M/L} | Phase: {recommendation}
   **Tracking:** {internal-only | ado #{workItemId} | jira/other TODO + TODO.md}
   **Dependencies:** {list or "None"}
   **Duplicates/Overlaps:** {existing MH-XX or "None found"}
   ```

Rules:
- Do not implement the feature — this spell only captures and tracks it.
- If the suggestion overlaps with an existing planned feature, make the connection explicit rather than creating a duplicate.
- The user decides priority — recommendations are just that.
- Present the `TODO.md` edit for approval before saving.
- If multiple related suggestions come in at once, capture each as a separate work item but note the relationship.

## Related Spells

This spell sits at the front of the Spell Loop — it captures and tracks; it does not plan or build. Hand off downstream:

- **Feeds into [[spell-plan|spell-plan]]** — a captured suggestion is the input to planning. Once tracked here, invoke `spell-plan` to turn it into an implementation plan.
- **Feeds into [[spell-scope|spell-scope]]** for large or multi-feature suggestions — if the impact assessment lands on **L** effort (or the idea spans several features), route it to `spell-scope` first to break it down before planning.
- **Consumes from usage/testing** — there is no upstream spell; suggestions originate from smoke testing or regular use (e.g. while running `spell-test`).

See [[governance/development-methodology|Development Methodology]] for the canonical Spell Loop hand-off flow.
