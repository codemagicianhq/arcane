---
name: Spell — Summon Venture
description: Create a new venture in a hub repo — folder, overview/config/legal docs, idea and todo books, and a registry entry — in one hub-gated move.
argument-hint: Venture Name | Venture Type | One-line description
agent: agent
---

## Executive Summary

- This prompt creates a new venture in a **hub** repo: the venture folder, its starter docs, its two idea/todo books, and its registry entry — one operation instead of several manual steps.
- **Hub-gated:** requires `role: "hub"` in `.arcane.json`. Refuses cleanly in a consumer repo, pointing at the right place to capture the idea instead.
- Use this when starting a new venture (business, product, or personal project) that the hub should track.
- Input format is: `Venture Name | Venture Type | Description` — prompt will ask for missing fields.
- Renamed from `spell-bootstrap-business` — venture books and the registry didn't exist when that spell was named. Clean rename, no compatibility alias, per [ARC-008](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-008--clean-break-for-spell-assess-removal-no-compatibility-alias)'s precedent (full canonical URL, not a same-repo wiki-link — this file ships, and `DECISIONS.md` doesn't; corrected 2026-08-31, BC-06).

---

## Step 0 — Hub Gate

Read `.arcane.json`. If `role` is not `"hub"`, stop and report:

> `spell-summon-venture` runs only in a hub repo (`role: "hub"` in `.arcane.json`). This repo is a consumer. If you're capturing an idea for a venture that should exist, save it in the hub instead — ask there for `spell-save-idea --venture <new-slug> "<idea>"`, which offers to scaffold the venture book if the slug doesn't exist yet.

Do not create anything. Do not infer hub status from a `ventures/` directory existing — that directory can legitimately exist in a consumer repo too (this exact spell creates it there in non-hub contexts under the old model; the gate is what changed).

If `role` is `"hub"`, resolve `{BUSINESS_ROOT}` from `.arcane.json`'s `business_root` field (default `ventures/`) and continue.

## Step 1 — Gather Venture Details

Parse the prompt argument as:
`<Venture Name> | <Venture Type> | <One-line Description>`

If any required value is missing, ask only for missing fields. Additionally ask for **ownership** if not stated or inferable from context: `llc` (company-owned), `co-venture` (shared with an external partner), or `personal` (non-commercial, no co-owner) — never guess this; it's load-bearing for the registry and for later idea-lifecycle disclosure decisions.

Use these files first (each is optional — if missing, proceed as noted):

- [playbooks/new-business-setup.md](../../playbooks/new-business-setup.md) — setup playbook. If `playbooks/` doesn't exist, skip and derive steps from the venture-type checklist below.
- [naming-conventions.md](../../.arcane/governance/naming-conventions.md) — slug/file naming rules. If missing, default to lowercase-with-dashes slugs.
- `{BUSINESS_ROOT}/_template/overview.md` — overview template. If missing, generate a minimal overview from the fields below.
- [.arcane/templates/venture-template/IDEAS.md](../../.arcane/templates/venture-template/IDEAS.md) and [.arcane/templates/venture-template/TODO.md](../../.arcane/templates/venture-template/TODO.md) — book stubs. If missing, use the header format from [[spell-save-idea|spell-save-idea]] / [[spell-todo|spell-todo]].
- [README.md](../../README.md) — repo navigation. If missing, skip cross-linking.
- [project.md](../../project.md) — project context. If missing, skip.

## Step 2 — Create the Venture

1. Create `{BUSINESS_ROOT}/<slug>/` using existing repo style (lowercase with dashes). If `{BUSINESS_ROOT}` doesn't exist yet, create it.
2. Create these files:
   - `overview.md` from template, filled with provided venture details and current date.
   - `config.md` with placeholders for `{PLATFORM_NAME}` configuration, data paths, and platform integrations. (`{PLATFORM_NAME}` is the org's operating platform — resolve from `.arcane.json`/frontmatter; ask if unset.)
   - `legal.md` with baseline legal checklist and links to relevant repo docs.
   - `IDEAS.md` from the venture-template stub, with the venture name filled in.
   - `TODO.md` from the venture-template stub, with the venture name filled in.
3. Add a startup checklist tailored to the venture type (`e-commerce`, `app`, `protocol`, `service`, or `personal`).

## Step 3 — Register the Venture

Open (or create, with the standard header — see `{BUSINESS_ROOT}/registry.json`'s own `_comment` field for the expected shape) `{BUSINESS_ROOT}/registry.json` and append an entry keyed by the slug:

```json
"<slug>": {
  "name": "<Venture Name>",
  "aliases": [],
  "status": "idea",
  "visibility": "private",
  "ownership": "<llc|co-venture|personal>",
  "tracking": "none",
  "repos": []
}
```

`status` starts `"idea"` and `tracking` starts `"none"` — this spell only creates the hub-side folder, it does not provision a code repo or tracker project. Update the `repos[]` array separately once a real repo exists. `visibility` defaults to `"private"`; only change it if the operator states the venture is public-facing at creation time.

## Step 4 — Cross-Links and Summary

Add cross-links only when appropriate:

- Update [README.md](../../README.md) only if there is a clear place for venture navigation.
- Update [TODO.md](../../TODO.md) (hub root) only with concrete, actionable next tasks — venture-specific tasks belong in the new venture's own `TODO.md`, not here.

Return a ready-to-start summary.

Output format:

## Created

- File and folder paths created, including the `{BUSINESS_ROOT}/registry.json` entry.

## Defaults Applied

- Slug, ownership, naming decisions, and template assumptions used.

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
- Never run outside a hub repo. Never infer hub status — only `role: "hub"` counts.
