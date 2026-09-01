---
title: Development Methodology — The Spell Loop
audience: both
last_updated: YYYY-MM-DD
status: active
tags: [methodology, spell-loop, development, workflow]
---

# Development Methodology — The Spell Loop

A structured development methodology combining progressive context phases and an autonomous implementation loop, delivered through the Arcane spell system. Designed for multi-agent infrastructure.

## Executive Summary

- The Spell Loop is the standard development methodology for all projects that adopt it.
- It combines two proven patterns: the autonomous implementation loop and the spell system (operational workflows), with structured planning phases.
- Work flows through phases: Plan → [Enchant] → [Assess] → Architect → [Implement → Test → Review]\* → Ship.
- Optional enchantment phase uses Alexander (research) and Circe (marketing) to proactively enhance PRD quality.
- The implementation phase is an autonomous loop — agents iterate until all stories pass quality gates.

---

## The Spell Loop Flow

```mermaid
flowchart TD
    A[spell-plan] -->|PRD.md| AE{Enchant?}
    AE -->|Yes| AF[spell-enchant]
    AF -->|Enhanced PRD| AA{Large PRD?}
    AE -->|No| AA{Large PRD?}
    AA -->|Yes| AB[spell-scope]
    AB -->|execution-plan.md| B[spell-architect]
    AA -->|No| B[spell-architect]
    B -->|architecture.md + stories.json| C[spell-implement]
    C -->|code changes| D[spell-test]
    D -->|test results| E{All tests pass?}
    E -->|No| C
    E -->|Yes| F[spell-review]
    F -->|issues found| G{Critical issues?}
    G -->|Yes| C
    G -->|No| H[spell-ship]
    H -->|merge + deploy| I[Done]

    style A fill:#4a90d9,color:#fff
    style AE fill:#d4a017,color:#fff
    style AF fill:#d4a017,color:#fff
    style AA fill:#4a90d9,color:#fff
    style AB fill:#4a90d9,color:#fff
    style B fill:#4a90d9,color:#fff
    style C fill:#e67e22,color:#fff
    style D fill:#27ae60,color:#fff
    style F fill:#8e44ad,color:#fff
    style H fill:#2c3e50,color:#fff
```

### Phase Overview

| Phase              | Spell             | Agent Owner                           | Input                                       | Output                                                                                                 |
| ------------------ | ----------------- | ------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Planning**       | `spell-plan`      | Alexander (research) + Kellar (product)  | Feature description or TODO item            | `PRD.md` — requirements, acceptance criteria, constraints                                              |
| **Enchantment**      | `spell-enchant`   | Alexander (research) + Circe (marketing) | PRD.md                                      | Enhanced PRD — proactive quality improvements, competitive analysis, UX/a11y/perf/security gaps filled |
| **Assessment**     | `spell-scope`     | Merlin + Alexander + Lince              | Large PRD                                   | `execution-plan.md` — epics, dependency graph, ADR candidates, security flags, agent assignments       |
| **Solutioning**    | `spell-architect` | Merlin (architecture)                | PRD.md (or single epic from execution plan) | `architecture.md` + `stories.json` — tech decisions, epic/story breakdown                              |
| **Implementation** | `spell-implement` | Lafayette / Mercurio / Adelaide (build team)      | stories.json                                | Working code, committed per story                                                                      |
| **Quality**        | `spell-test`      | Lince (QA) + dev agent                | Code changes                                | Test results, coverage report, evidence                                                                |
| **Quality**        | `spell-review`    | Lince (QA) or Merlin (arch)          | Code diff                                   | Adversarial review findings                                                                            |
| **Delivery**       | `spell-ship`      | Human (approval) + Prospero (infra)     | Passing code + reviews                      | Merged PR, deployed artifact                                                                           |

---

## Key Concepts

### Work Tracking Modes

Arcane supports two work-tracking modes selected early (during `spell-open-session` or `spell-plan`):

- **`tracking_mode: internal`** — source of truth is repository artifacts (`PRD.md`, `execution-plan.md`, `stories.json`, `TODO.md`), with no external tracker dependency.
- **`tracking_mode: external`** — source of truth is still repository artifacts, but selected milestones/work items are mirrored to an external tracker.

For backward compatibility with existing Azure DevOps workflows, if tracking mode is not explicitly set and an ADO context is already present (work item ID, org, and project), default to:

```yaml
tracking_mode: external
external_provider: ado
```

Persist tracking configuration in PRD frontmatter (and in `.arcane.json` when available) so downstream spells do not lose context:

```yaml
tracking:
  tracking_mode: external # internal | external
  external_provider: ado  # ado | github | jira | other
  ado:
    org: "{ADO_ORG}"
    project: "{ADO_PROJECT}"
    process_template: "Agile"
```

Or, for a GitHub-tracked repo:

```yaml
tracking:
  tracking_mode: external
  external_provider: github
  github:
    repo: "{owner}/{repo}"
```

### Process-Template-Aware ADO Hierarchy Rules

When `tracking_mode=external` and `external_provider=ado`, do not hardcode work item types. Resolve types from the project's process template and currently enabled types first:

```bash
az devops project show \
  --org https://dev.azure.com/{org} \
  --project {project} \
  --query "capabilities.processTemplate.templateName" \
  --output tsv

az boards work-item-type list \
  --org https://dev.azure.com/{org} \
  --project {project} \
  --output json \
  --query "[].name"
```

Use this fallback order against the discovered type list (baseline observed options: `Bug`, `Epic`, `Feature`, `Issue`, `Task`, `Test Case`, `User Story`):

| Logical level | Preferred type order |
| --- | --- |
| Epic-level | Epic → Feature → User Story → Issue |
| Feature-level | Feature → User Story → Issue |
| Story-level | User Story → Issue → Task |
| Task-level | Task → Issue |
| Defect-level | Bug → Issue → Task |

Child linkage rules:

1. Preserve logical hierarchy order (Epic-level parent of Feature-level, Feature-level parent of Story-level, Story-level parent of Task/Bug-level).
2. Attempt native ADO parent/child hierarchy links first.
3. If the selected fallback type combination cannot be linked as parent/child in that process template, use `Related` links and prefix titles with logical level tags (for example: `[EPIC]`, `[FEATURE]`) to preserve intent.
4. Never silently flatten hierarchy. Document fallback/link decisions in `execution-plan.md` notes.

**Enforcement: explicitly advisory prose (ARC-023) — no script verifies the fallback order was followed or that `execution-plan.md` documents a link decision; compliance depends entirely on the executing agent's judgment.**

### GitHub Issues Conventions

When `tracking_mode=external` and `external_provider=github`, **resolve `{owner}/{repo}` from `git remote get-url origin` (or `.arcane.json`'s `github.repo` field if set) rather than assuming it matches the working directory name. Enforcement: explicitly advisory prose (ARC-023) — no script gates this resolution before issue-tracking commands run; a same-principle utility (`parseGitHubRemote` in `src/modules/platform-policy.ts`) exists but serves `doctor`'s branch-policy check, not this workflow.**

GitHub Issues has no configurable work-item-type hierarchy the way Azure DevOps does — there is no process-template discovery step, and no equivalent to `az boards work-item-type list`. Use these substitutes instead:

- **Categorization** — labels, not types. Resolve the repo's actual labels first (`gh label list`) rather than assuming `bug`/`enhancement`/`epic` exist; a fresh repo may have only GitHub's defaults, or none. Apply a label with `--label <name>` on create, or omit it rather than inventing one.
- **Hierarchy** — GitHub Issues has no native parent/child API field reachable from `gh`. Simulate logical hierarchy with a task-list in the parent issue's body (`- [ ] #43`, `- [ ] #44`) and `Related to #NN` / `Part of #NN` references in child issue bodies. This is a substitute, not true hierarchy — document the simulation in `execution-plan.md` notes the same way an ADO `Related`-link fallback gets documented (see the Child linkage rules above), so a reader doesn't mistake the checkbox list for a first-class relationship the platform enforces.
- **Creation:** `gh issue create --title "{title}" --body "{body}" [--label <name>]` — prints the issue URL on success; the trailing path segment is the issue number.
- **Fetching:** `gh issue view {id} --json title,body,labels`.
- **Closing:** `gh issue close {id} --reason completed [--comment "{note}"]` (`--reason` also accepts `not planned` or `duplicate`).
- **Commit/PR linkage:** `Fixes #{id}` / `Closes #{id}` in a commit message or PR body auto-closes the issue on merge (GitHub-native behavior, no extra command needed) — prefer this over a manual `gh issue close` call when the fix lands via a PR.

### External Provider TODOs

- **Jira (`external_provider=jira`)** — TODO: define issue-type mapping, parent-child/epic linkage strategy, and command examples.
- **Other providers (`external_provider=other`)** — TODO: define required metadata contract and fallback behavior before enabling automation.

### Fresh Context Per Iteration

Each implementation iteration starts with clean context. The only memory between iterations is:

- **`stories.json`** — which stories are done (`passes: true/false`)
- **`progress.txt`** — append-only learnings from previous iterations
- **Git history** — commits from previous iterations

This prevents context poisoning — where an agent's failed approach poisons subsequent attempts.

### Progressive Context Chain

Each phase produces artifacts that inform the next phase:

```
Feature idea
  → PRD.md (requirements, acceptance criteria)
    → architecture.md (tech decisions, ADRs)
      → stories.json (implementable work units)
        → code (guided by architecture + story context)
          → test results (validates requirements)
            → review findings (validates architecture compliance)
```

Without this chain, agents make conflicting decisions across stories (e.g., one uses REST, another uses GraphQL).

### Adversarial Review

`spell-review` requires the reviewer to **cover every lens, not hit a finding count**. "Looks good" without addressing each lens is not an acceptable review. The reviewer must:

1. Explicitly cover every lens — correctness, security, performance, tests, naming/clarity, architecture — and state "no issues" for any lens that is clean. There is no finding quota: zero findings is a valid outcome on a clean or small diff; never fabricate issues to hit one.
2. Classify each real finding as HIGH / MEDIUM / LOW severity
3. Check for missing test coverage, architecture violations, security issues
4. Defer unrelated findings to a backlog (don't derail the current change)

**Enforcement: explicitly advisory prose (ARC-023) — no script counts or verifies lens coverage; this text now matches `spell-review.prompt.md`'s own current Rules section (coverage of effort, not a count of findings) rather than the superseded "minimum of 3" framing an earlier version of this rule stated.**

### Append-Only Progress

`progress.txt` is never edited, only appended. Each iteration adds:

```
## Iteration N — [story-id] — [timestamp]
### What was done
- [summary of changes]
### What was learned
- [patterns discovered, gotchas, conventions]
### What to watch for
- [warnings for future iterations]
```

---

## Story Format (stories.json)

The Arcane story schema for autonomous implementation:

```json
{
  "feature": "Feature Name",
  "branchName": "lafayette/feat/feature-name",
  "assignedAgent": "lafayette",
  "trackingMode": "external",
  "externalProvider": "ado",
  "adoWorkItemId": 541,
  "userStories": [
    {
      "id": "STORY-001",
      "title": "Short description",
      "description": "Detailed requirements",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "priority": 1,
      "passes": false,
      "assignedTo": "lafayette",
      "testEvidence": null
    }
  ]
}
```

### Schema Validation

`spell-architect` must output stories.json using **exactly** this schema — all required fields must be present. Missing fields break `spell-implement`'s autonomous loop. Merlin must validate before outputting:

- `feature`, `branchName`, `assignedAgent`, `trackingMode` — top-level required
- `externalProvider` — required when `trackingMode=external`; optional otherwise
- `adoWorkItemId` — required only when `trackingMode=external` and `externalProvider=ado`
- Per story: `id`, `title`, `description`, `acceptanceCriteria`, `priority`, `passes: false`, `assignedTo`, `testEvidence: null`

If the output is missing required tracking fields, `passes`, `assignedTo`, `priority`, or `testEvidence`, it is malformed and must be regenerated.

**Enforcement: structured spell gate (ARC-023) — `spell-architect` step 5a self-checks every field and must regenerate before outputting if any is missing, and `spell-full-cycle` Phase 2 independently gates on the same schema completeness before proceeding to Phase 3; no external schema-validator script exists, so the check is agent-administered, not tool-verified.**

### Story Sizing

Each story must be small enough to complete in one context window:

**Right-sized:**

- Add a database column and migration
- Add a UI component to an existing page
- Implement a single API endpoint
- Add a filter dropdown to a list

**Too big (split these):**

- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API layer"

---

## Full Cycle (Autonomous Pipeline)

For features that should run end-to-end with minimal human intervention, use `spell-full-cycle`:

```
spell-full-cycle = spell-plan → [spell-enchant] → spell-architect → [spell-implement → spell-test → spell-review]* → spell-ship
```

The entire pipeline runs autonomously with a single human gate at PR approval. Includes optional PRD enchantment between Plan and Architect (runs automatically if any quality dimension scores Bronze, or if `--enchant` is specified). Requires three inputs: feature description, tracking configuration (`tracking_mode` and optional `external_provider`), and target repo. In ADO mode, include the ADO work item ID; in GitHub mode, include the issue number if one already exists. **Each phase has built-in quality gates that halt the pipeline on failure rather than producing garbage for downstream phases. Enforcement: structured spell gate (ARC-023) — `spell-full-cycle.prompt.md` encodes explicit per-phase `Gate:` steps (e.g., Phase 4: "If coverage is below threshold or any acceptance criterion lacks a test, loop back to Phase 3... Maximum 2 coverage-fix loops before halting"; Phase 5: "If any HIGH severity finding exists, loop back to Phase 3... Maximum 2 review-fix loops before halting") plus a human/authority gate before merge.**

See [.github/prompts/spell-full-cycle.prompt.md](../.github/prompts/spell-full-cycle.prompt.md) for the complete prompt.

---

## Assessment Flow (Large PRDs)

For PRDs too large for a single Spell Loop cycle, insert `spell-scope` between planning (and optional enchantment) and solutioning:

```
spell-plan → [spell-enchant] → spell-scope → [spell-architect → spell-implement → spell-test → spell-review → spell-ship]* per epic
```

`spell-scope` reads the full PRD and produces an `execution-plan.md` containing:

- **Epic splitting** — self-contained, sprint-sized work packages with dependency ordering
- **Architecture decision candidates** — new ADRs needed before implementation
- **Security flags** — threat model impact and required mitigations
- **Agent assignments** — which agents handle each epic
- **Dependency graph** — Mermaid diagram of execution order and parallelization opportunities

Each epic then runs through its own Spell Loop cycle (architect → implement → test → review → ship).

**Before starting the next epic after a major output checkpoint (execution plan, architecture + stories, full test evidence, or ship recommendation), run `spell-commit-work` to preserve progress and checkpoint branch state. Enforcement: explicitly advisory prose (ARC-023) — `spell-full-cycle.prompt.md`'s Rules section frames this as a recommendation ("recommend running `spell-commit-work` before starting the next epic"), and nothing blocks epic-start if it is skipped.**

See [.github/prompts/spell-scope.prompt.md](../.github/prompts/spell-scope.prompt.md) for the complete prompt.

---

## Quick Flow (Small Changes)

For bug fixes, small refactors, or single-file changes, skip Planning and Solutioning:

```
spell-implement → spell-test → spell-review → spell-ship
```

No PRD or architecture doc needed. The developer provides the intent directly to `spell-implement`.

---

## Interactive Tool Builds (Copilot / Claude in VS Code)

When GitHub Copilot, Claude in VS Code, or any other interactive AI tool (not an autonomous agent-runtime agent) is used to write code, the **same quality gates apply** as for autonomous agent builds. Interactive tools are implementation executors — they occupy the same position in the Spell Loop as `spell-implement`.

### Rule: Interactive tools cannot self-validate

A tool that writes code **must not also run `spell-review` on that same code. Enforcement: explicitly advisory prose (ARC-023) — no mechanism in this repo can detect that the same agent or session both wrote and reviewed a diff (no session-identity tracking exists); GitHub's own block on self-authored `CHANGES_REQUESTED` reviews operates on GitHub account identity, not agent/session identity, and this repo routinely reuses one account for both.** This is the same constraint that prevents Lafayette from marking his own stories as passing. Specifically:

- Copilot sessions count as implementation (`spell-implement` equivalent)
- `spell-test` must be run to produce test evidence before review
- `spell-review` must be run by a different agent or in a separate session with adversarial intent
- "Looks good to me" within the same Copilot chat that wrote the code is **not** a spell-review

### Minimum gate for any Copilot-produced code

```
Copilot implements → spell-test (run tests, check coverage) → spell-review (adversarial pass, every lens covered) → spell-ship
```

This applies regardless of change size. Even single-file bug fixes must pass `spell-review` before being pushed to `origin/main`.

### Why this rule exists

A tool that both writes and validates its own work cannot be trusted to catch its own mistakes. In practice, when an interactive tool builds a codebase and also self-validates, defects slip through — for example, a roster of fabricated agents that never existed in `agent-policies.md`, or invented APIs that were never defined. A separate adversarial `spell-review` pass reliably catches these. The defects would ship if the gate were skipped.

---

## Agent Roster and Roles

| Role            | Agent               | Notes                                              |
| --------------- | ------------------- | -------------------------------------------------- |
| Product Manager | Kellar + Alexander     | Kellar owns product; Alexander provides research      |
| Architect       | Merlin             | CTO / Architecture Lead                            |
| Developer       | Lafayette / Mercurio / Adelaide | Build team handles implementation                  |
| QA Lead         | Lince               | QA Lead validates test evidence                    |
| Scrum Master    | Kellar              | Product Operations Manager handles sprint tracking |
| UX / Frontend   | Adelaide                | Frontend developer handles UX when needed          |
| Tech Writer     | Any agent           | No dedicated tech writer; any agent can document   |

---

## Spell Reference

### Development Loop Spells

| Spell             | Invocation         | Purpose                                                      |
| ----------------- | ------------------ | ------------------------------------------------------------ | --- | ----------------- | ------------------ | ----------------------------------------------------------------------------- |
| `spell-plan`      | `@spell-plan`      | Generate PRD from feature description                        |     | `spell-enchant`   | `@spell-enchant`   | Enchant PRD quality — competitive research, UX/a11y/perf/security enhancement |
| `spell-scope`     | `@spell-scope`     | Scope and split large PRDs into epics with execution plan    |     | `spell-architect` | `@spell-architect` | Architecture decisions + story breakdown                                      |
| `spell-implement` | `@spell-implement` | Autonomous loop: pick story → build → test → commit → repeat |
| `spell-test`      | `@spell-test`      | Run tests, validate coverage, generate evidence              |
| `spell-review`    | `@spell-review`    | Adversarial code review                                      |
| `spell-ship`      | `@spell-ship`      | Pre-deploy checklist, merge approval                         |

### Specialist Spells

| Spell                   | Invocation               | Purpose                                    |
| ----------------------- | ------------------------ | ------------------------------------------ |
| `spell-dotnet-expert`   | `@spell-dotnet-expert`   | Load .NET best practices for any dev agent |
| `spell-security-review` | `@spell-security-review` | OWASP Top 10 + dependency audit            |
| `spell-product-review`  | `@spell-product-review`  | Build/Measure/Analyze/Decide cycle         |

### Existing Operational Spells

| Spell                      | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `spell-open-session`       | Rebuild context at session start             |
| `spell-close-session`      | Journal, summarize, update TODO              |
| `spell-commit-work`        | Conventional Commits with trailers           |
| `spell-check-drift`        | Documentation audit for staleness            |
| `spell-summon-venture`     | Create a new venture: folder, books, registry entry (hub-gated) |
| `spell-explain-concept`    | Bridge concepts to project context           |
| `spell-todo`               | Manage TODO.md lifecycle                     |
| `spell-generate-bot-icons` | Generate agent avatar assets                 |
| `spell-bug`                | Bug lifecycle: document → tracker/TODO → fix → verify |
| `spell-suggest-feature`    | Feature capture: user story → tracker/TODO → backlog  |
| `spell-save-idea`          | Fast-capture an idea into `IDEAS.md` (hub: optionally into a venture's book) |
| `spell-manifest`           | Hub-gated: promote idea/todo-book entries downstream — consumer repo, PRD, tracker, or public disclosure |
| `spell-feedback`           | Session-quality feedback; framework-shaped items route upstream to arcane's GitHub (genericized, disclosure-gated) |

---

## Open-Source Strategy

The Spell Loop is a candidate for open-source release as a productized automation offering. Key differentiators:

1. **Multi-agent orchestration** — not just one AI tool, but a team of specialized agents
2. **Power-level governance** — agents have scoped autonomy per repo
3. **Git attribution** — every commit traces back to the agent that produced it
4. **Progressive context chain** — structured planning phases feed each successive phase with richer context
5. **Spell prompt packaging** — portable `.prompt.md` files that work across AI IDEs
