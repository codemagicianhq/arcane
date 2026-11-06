# PRD: Unattended Run spell

Tracking: internal. Status: shipped in 1.22.0 via PR #460; published package and consumer installation verified.

## Problem and users

An operator currently assembles a long session-opening prompt to prepare bounded unattended delivery. They need one portable entry point that works for both a finite issue set and an application brief, without silently granting authority or promising persistent execution.

## Requirements and acceptance

- Use a descriptive name per the naming test; prefer established technical vocabulary. `spell-unattended-run` reuses Arcane's existing unattended-preflight vocabulary without colliding with a current spell ID.
- Reuse open-session, planning/scoping/architecture, the shared preflight and grant fragments, full-cycle, and close-session. The new spell owns the run lifecycle across milestones, not a second implementation loop.
- Settle finite scope, definition of complete, limits, decisions, assignee, access and actions before departure. New applications need observable journeys, UI/a11y/security checks, and honest live-service/device/data gaps.
- Require actual consent, including the grant bootstrap commit. Snapshot issue lists; never inherit completed authority, renew it, bypass reviews/hooks, spend or deploy production implicitly.
- Check host continuity and expiry monitoring, checkpoint and resume idempotently, bound retries, verify releases/apps and closeout actions, and clean only landed run-owned branches.
- Ship in spells-build with generated client shims, catalog and self-host parity. Document invocation and review every rubric dimension. Contract tests establish distribution and safety instructions, not model compliance.

## Exclusions and constraints

No runtime scheduler, new grant mechanism, CLI flags, platform configuration changes or deployment. The previous run grant has ended. The operator explicitly authorized a new grant, `ship-unattended-run-2026-11-06`, for this release. Existing grant behavior is referenced, not modified. No dependencies added.

## Architecture and naming evidence

The canonical asset delegates to existing workflows and embeds the shared preflight, run-grant and action-required fragments. Registry-driven generation supplies Copilot, Claude and Codex discovery and both full/lite build profiles. Tests validate distribution and key workflow boundaries.

Naming: the inward scan found no spell ID collision; existing uses of unattended refer to the preflight and grants this spell orchestrates. "Unattended" is descriptive automation vocabulary ([Microsoft](https://learn.microsoft.com/en-us/power-automate/desktop-flows/run-unattended-desktop-flows), [UiPath](https://docs.uipath.com/robot/standalone/latest/admin-guide/deploying-unattended-automations)); no exclusive coinage or trademark clearance is asserted. PASS WITH DISCLOSURE: same-space generic terminology is intentional, and the chosen name is not a new brand. Cruise control and lore were not selected because the descriptive technical term fits the repository rule.

Related: [[.arcane/governance/spell-authoring-standards]], [[.arcane/spells/spell-unattended-run]].

## Invocation examples

`/spell-unattended-run` followed by issue URLs, a PRD path, or an application brief starts intake. For example: "Build a working inventory application from this PRD through a reviewed PR. Prepare the finite plan, identify real integration needs, batch blocking questions and show the action/authority table before execution." The spell then requests the operator's actual scoped authorization; this example itself supplies none.

The original prompt's repository/issue scope, bootstrap-consent, assignment, non-squash policy, CI/release verification and cleanup requirements are retained as configurable run decisions. Enhancements add application acceptance journeys, budgets, host continuity, threat boundaries, retry limits, idempotent resume, delivery-stage distinctions and an explicit early-completion authority boundary.
