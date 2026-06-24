---
name: Spell — Full Cycle
description: End-to-end autonomous Spell Loop — chains plan, architect, implement, test, review, and ship into a single invocation with one human approval gate at merge time
argument-hint: "Feature description, optional work item ID, target repo (e.g., 'Add user auth to the mobile app, #507, {REPO_ORG}/{REPO_NAME}')"
agent: agent
---

## Executive Summary

- This prompt chains all Spell Loop phases into a single autonomous pipeline.
- Includes optional PRD elevation (spell-elevate) between Plan and Architect for quality enhancement.
- Only one human touchpoint: approving the PR at ship time.
- Delegates each phase to the appropriate specialized agent role (research, architecture, build, QA, marketing review). Resolve concrete personas from [agent-policies](../../governance/agent-policies.md) / [naming-conventions](../../governance/naming-conventions.md); if neither is present, proceed with role names directly.
- If any phase fails, the pipeline halts and reports the blocker — no silent failures.

---

Run the complete Spell Loop end-to-end for the described feature.

Use these files for context:

- [governance/development-methodology.md](../../governance/development-methodology.md) — Spell Loop methodology and stories.json format
- [governance/testing-standards.md](../../governance/testing-standards.md) — Testing frameworks and coverage requirements
- [governance/cicd-standards.md](../../governance/cicd-standards.md) — CI/CD pipeline and deployment gates
- [governance/git-conventions.md](../../governance/git-conventions.md) — Branch discipline and commit format
- [project.md](../../project.md) — Project goals and priorities
- [DECISIONS.md](../../DECISIONS.md) — Existing ADRs to respect
- [governance/product-excellence-standards.md](../../governance/product-excellence-standards.md) — PRD Quality Scorecard for elevation

---

## Required Inputs

Before proceeding, confirm you have all three:

1. **Feature description** — what to build and why. Accepted formats:
   - Inline text in the prompt
   - Path to a PRD file (e.g., `PRD.md`)
   - **Tracker work item ID** (e.g., `#507`) in `external` mode — fetch it using the detected provider's CLI/API. For an ADO provider, fetch via `az boards work-item show --id {id} --org https://dev.azure.com/{ADO_ORG} --output json` and extract `System.Title`, `System.Description`, and `Microsoft.VSTS.Common.AcceptanceCriteria`; for other providers, fetch the title, description, and acceptance criteria via that provider's equivalent. If the work item has child items, fetch those too. `{ADO_ORG}` resolves from `.arcane.json` or the PRD/feature frontmatter; ask if unset.
2. **Tracking configuration** — required before execution:
   - `tracking_mode: internal | external`
   - `external_provider: ado | jira | other` (required when `tracking_mode=external`)
   - If omitted and an ADO context is already present, default to `external` + `ado` (backward compatibility).
   - If `tracking_mode=external` and `external_provider=ado`, an `adoWorkItemId` is required for commit/PR linkage.
   - In ADO mode, resolve available work item types and apply process-template-aware fallback mapping from `governance/development-methodology.md` before creating/linking hierarchy items.
3. **Target repo** — which repository and org (e.g., `{REPO_ORG}/{REPO_NAME}`). `{REPO_ORG}`/`{REPO_NAME}` resolve from `.arcane.json` or the PRD/feature frontmatter; if not provided, infer from context or ask.

If `external_provider=jira` or `external_provider=other`, record TODO notes for provider-specific automation and continue with internal artifact flow unless explicit provider commands are supplied.

---

## Pipeline Phases

### Phase 1 — Plan

Execute the `spell-plan` workflow:

1. Gather requirements from the feature description.
2. Check existing ADRs and business docs for constraints.
3. Produce `PRD.md` with requirements, acceptance criteria, constraints, and tracking configuration (`tracking_mode`, optional `external_provider`, optional `adoWorkItemId`).
4. **Gate:** Validate every requirement has at least one testable acceptance criterion. If scope is too large for one sprint, halt and recommend splitting.

Store the PRD in the working directory. Proceed automatically to Phase 1.5.

### Phase 1.5 — Elevate (Optional)

Run a quick quality audit of the PRD against the scorecard in `governance/product-excellence-standards.md`. Score each dimension as Bronze / Silver / Gold.

**Decision logic:**
- If the user specified `--elevate` or explicitly requested elevation: run `spell-elevate` workflow fully.
- If any dimension scores Bronze: recommend elevation, but proceed without it if the user hasn't requested it.
- If all dimensions score Silver or above: skip elevation and proceed to Phase 2.

When running elevation:
1. Conduct the research role's analysis (competitive analysis, UX patterns, accessibility audit).
2. Conduct the marketing-review role's pass (first impressions, brand alignment, onboarding).
3. Generate enhancement suggestions (Must-Add / Should-Add / Could-Add / Won't-Add).
4. Check scope budget — if elevated scope exceeds 2× original, flag prominently.
5. Produce the enhanced PRD, preserving all original requirements and tagging additions with `[ELEVATED]`.
6. Replace the working PRD with the elevated version.

**Gate:** If scope budget exceeds 2× and the user hasn't pre-approved, halt and ask for confirmation before proceeding.

Proceed automatically to Phase 2.

### Phase 2 — Architect

Execute the `spell-architect` workflow:

1. Read the PRD from Phase 1.
2. Make architecture decisions (framework, patterns, component structure).
3. Produce `architecture.md` with decisions, component diagram, and testing strategy.
4. Produce `stories.json` with the full schema:
   - Top-level: `feature`, `branchName`, `assignedAgent`, `trackingMode`, optional `externalProvider`, optional `adoWorkItemId`
   - Per story: `id`, `title`, `description`, `acceptanceCriteria`, `priority`, `passes: false`, `assignedTo`, `testEvidence: null`
5. **Gate:** Self-validate `stories.json` schema completeness. If any required field is missing, regenerate before proceeding. Every PRD requirement must map to at least one story. No story may depend on an unresolved Open Question.

Proceed automatically to Phase 3.

### Phase 3 — Implement (Autonomous Loop)

Execute the `spell-implement` workflow:

0. **Sync workspace** — before any code changes, ensure the workspace is current:
   ```bash
   git fetch --prune origin
   git checkout main && git pull --ff-only
   ```
   If `pull --ff-only` fails, halt and report — manual rebase is needed.
1. Create the topic branch from `stories.json.branchName` (format: `{agent}/type/description`).
2. Loop:
   a. Pick the next story where `passes: false`, ordered by priority.
   b. Implement the story — minimum code to satisfy acceptance criteria.
   c. Write tests per `governance/testing-standards.md`.
   d. Run tests. If passing:
      - In `external/ado` mode, commit with `#{adoWorkItemId} type(scope): description` and agent attribution trailers (`Agent`, `Model`, `Provider`).
      - In `internal` mode, commit with standard Conventional Commits format (no ADO prefix) plus attribution trailers.
   e. Update `stories.json`: set `passes: true`, fill `testEvidence`.
   f. Append learnings to `progress.txt`.
   g. Repeat until all stories pass or a story fails 3 consecutive attempts.
3. **Gate:** If any story is stuck after 3 attempts, halt the pipeline and report the blocker with error details. Do not proceed to Phase 4 with failing stories.

Proceed automatically to Phase 4.

### Phase 4 — Test

Execute the `spell-test` workflow:

1. Run the full test suite (not just per-story — full regression).
2. Validate coverage: 80% line minimum, 95% critical path.
3. Map each acceptance criterion from the PRD to a specific passing test.
4. Update `stories.json` with consolidated test evidence.
5. **Gate:** If coverage is below threshold or any acceptance criterion lacks a test, loop back to Phase 3 to add missing tests. Maximum 2 coverage-fix loops before halting.

Proceed automatically to Phase 5.

### Phase 5 — Review (Adversarial)

Execute the `spell-review` workflow:

1. Review the full diff (`git diff main...HEAD`).
2. Check architecture compliance against `architecture.md`.
3. Check for OWASP Top 10 security issues.
4. Find a minimum of 3 issues or justify why fewer exist.
5. Classify findings: HIGH / MEDIUM / LOW.
6. **Gate:** If any HIGH severity finding exists, loop back to Phase 3 to fix it. MEDIUM and LOW findings are noted in the ship report but do not block. Maximum 2 review-fix loops before halting.

Proceed automatically to Phase 6.

### Phase 6 — Ship

Execute the `spell-ship` workflow:

1. Verify all prior phases passed (PRD, architecture, all stories, tests, review).
2. Run pre-deploy checklist:
   - No merge conflicts with target branch.
   - No secrets or credentials in the diff.
   - DECISIONS.md updated if new ADRs were created.
   - Documentation updated for user-facing changes.
3. Generate the ship report (phase status table, test evidence, review findings, recommendation).
4. Create the PR:
   - `external/ado` mode: `az repos pr create --repository {repo} --source-branch {branch} --target-branch main --title "{feature}" --work-items {adoWorkItemId}`
   - `internal` mode (or provider TODO mode): create PR without `--work-items`.
5. **HUMAN GATE:** Present the ship report and PR link. Wait for explicit human approval before merging.
6. After approval: merge via `az repos pr update --id {prId} --status completed`.
7. Pull merge to local, delete the topic branch.

---

## Error Handling

- **Phase failure:** If any gate fails and exhausts its retry budget, halt immediately. Report which phase failed, what the error was, and what input is needed to unblock.
- **Stuck story:** After 3 failed attempts on a single story, mark it in `stories.json` with the error and halt. Do not skip stories and continue — a failing story may indicate an architecture problem.
- **Missing tooling:** If a required tool (test framework, SDK, CLI) is not installed, halt and report the prerequisite. Do not attempt to install system packages without confirmation.

---

## Progress Reporting

After each phase completes, output a brief status line:

```
[Phase 1/6 — Plan] COMPLETE — PRD.md generated (5 requirements, 8 acceptance criteria)
[Phase 2/6 — Architect] COMPLETE — 4 stories in stories.json, branch: thor/feat/feature-name
[Phase 3/6 — Implement] COMPLETE — 4/4 stories passing, 12 tests, 87% coverage
[Phase 4/6 — Test] COMPLETE — full regression green, 87% line / 96% critical path
[Phase 5/6 — Review] COMPLETE — 0 HIGH, 2 MEDIUM, 1 LOW findings
[Phase 6/6 — Ship] AWAITING APPROVAL — PR #77 created, ship report below
```

---

## Rules

- **One human gate only.** Everything before Phase 6 step 5 is autonomous. Do not ask for intermediate approvals unless a gate fails.
- **No scope creep.** Only build what the feature description specifies.
- **Fail fast.** If a phase cannot succeed, halt immediately rather than producing garbage for downstream phases.
- **Attribution required.** Every commit must carry `Agent`, `Model`, and `Provider` trailers per ADR-028/ADR-029.
- **Branch discipline.** All work on topic branches, never on main. Per ADR-048.
- **Fresh context per story.** Do not carry assumptions between stories during Phase 3.
- **Epic checkpointing.** When this spell is run as one epic in a multi-epic plan, recommend running `spell-commit-work` before starting the next epic.
