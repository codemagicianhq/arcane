---
name: Spell — Bootstrap Business
description: Create a new business documentation starter in Arcane using the template, naming rules, and setup playbook.
argument-hint: Business Name | Business Type | One-line description
agent: agent
---

## Executive Summary

- This prompt scaffolds a new business documentation package from the template automatically.
- It applies naming conventions, creates required files, and initializes checklists per business type.
- Use this when starting a new business to ensure consistent structure and avoid missing setup steps.
- Input format is: `Business Name | Business Type | Description` — prompt will ask for missing fields.

---

Bootstrap a new business in this repository.

Parse prompt argument as:
`<Business Name> | <Business Type> | <One-line Description>`

If any required value is missing, ask only for missing fields.

Use these files first (each is optional — if missing, proceed as noted):

- [playbooks/new-business-setup.md](../../playbooks/new-business-setup.md) — setup playbook. If `playbooks/` doesn't exist, skip and derive steps from the business-type checklist below.
- [naming-conventions.md](../../naming-conventions.md) — slug/file naming rules. If missing, default to lowercase-with-dashes slugs.
- [ventures/\_template/overview.md](../../ventures/_template/overview.md) — overview template. If missing, generate a minimal overview from the fields below.
- [README.md](../../README.md) — repo navigation. If missing, skip cross-linking.
- [project.md](../../project.md) — project context. If missing, skip.

> **Business root.** `{BUSINESS_ROOT}` is the directory that holds business/venture folders (default: `ventures/`). Resolve from `.arcane.json` or repo frontmatter; if `ventures/` doesn't exist and no business root is configured, ask the user where business folders live before creating anything.

Workflow:

1. Create `{BUSINESS_ROOT}/<slug>/` using existing repo style (lowercase with dashes). If the business root doesn't exist yet, create it at the configured location (or the path the user provided).
2. Create these files:
   - `overview.md` from template, filled with provided business details and current date.
   - `config.md` with placeholders for `{PLATFORM_NAME}` configuration, data paths, and platform integrations. (`{PLATFORM_NAME}` is the org's operating platform — resolve from `.arcane.json`/frontmatter; ask if unset.)
   - `legal.md` with baseline legal checklist and links to relevant repo docs.
3. Add a startup checklist tailored to the business type (`e-commerce`, `app`, `protocol`, or `service`).
4. Add cross-links only when appropriate:
   - Update [README.md](../../README.md) only if there is a clear place for business navigation.
   - Update [TODO.md](../../TODO.md) only with concrete, actionable next tasks.
5. Return a ready-to-start summary.

Output format:

## Created

- File and folder paths created.

## Defaults Applied

- Slug, naming decisions, and template assumptions used.

## Immediate Next Actions

1. Action one.
2. Action two.
3. Action three.
4. Action four.
5. Action five.

## Questions To Finalize

- Up to 3 targeted questions, or `None`.

Rules:

- Follow repository frontmatter conventions.
- Do not create Azure resources directly; document steps only.
- Keep generated docs editable and operational, not verbose.
