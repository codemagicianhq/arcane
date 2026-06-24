---
title: POC Management Pattern
audience: both
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [governance, poc, prototypes, ideas, lifecycle, methodology]
---

# POC Management Pattern

How ideas move from concept to product. Establishes folder conventions, artifact expectations per stage, iteration tracking, and promotion criteria. Complements the [[governance/development-methodology|Spell Loop]] methodology.

Related: [[governance/development-methodology|Development Methodology]]

---

## Lifecycle Stages

```
CONCEPT  ──►  PROTOTYPE  ──►  FEATURE  ──►  PRODUCT
ventures/        Prototypes      features/     business repo
(docs repo)      (prototypes repo) (code repo)   (code repo)
```

| Stage | Location | Purpose | Work item? | Code allowed? |
|---|---|---|---|---|
| **Concept** | `ventures/<name>/` in the docs repo | Capture and refine an idea. Permanent archive. | No | No |
| **Prototype** | `<name>/` in the Prototypes repo | Small throwaway demo generated from specs. | No | Yes |
| **Feature** | `features/{id}-{slug}/` in target code repo | Full Spell Loop execution with planning artifacts. | Yes (tracker) | Yes |
| **Product** | Target code repo main branch | Shipped, maintained code. Business docs in the docs repo. | Yes (tracker) | Yes |

### Stage Details

#### Concept (`ventures/<name>/`)

The permanent record of every idea — good, bad, or deferred. Ideas are **never deleted**. Frontmatter `status` tracks where each idea is in its lifecycle.

**Required files:**
- `overview.md` — What is it? Why does it matter? Who is it for? (Minimum viable concept doc.)

**Optional files:**
- `PRD.md` — If the idea has been through `spell-plan`
- `architecture.md` — If the idea has been through `spell-architect`
- `stories.json` — If architecture produced story breakdown
- Screenshots in `assets/screenshots/YYYY-MM-DD/` (linked from docs)

**What does NOT belong here:** Code files (`.js`, `.ts`, `.py`, `.html`, `.css`, etc.). The docs repo is a documentation-only repository.

#### Prototype (Prototypes repo)

Small, self-contained, throwaway code that demonstrates a concept. Prototypes are **convenience snapshots, not source-of-truth code**. In the vibe coding era, the spec (PRD + architecture) is the reproducible artifact — code can be regenerated from it at any time.

**Required files per prototype:**
- `README.md` — What it demos + link back to the concept spec in arcane (e.g., `See specs: arcane/ventures/magic-prompt/`)
- Whatever code files the demo needs

**Folder convention:** `<name>/` at repo root (e.g., `magic-prompt/`, `self-healing-poc/`)

**No governance overhead:** No PRs required, no work items, no branch policies. This is a sandbox. Commit directly to main.

#### Feature (`features/{id}-{slug}/`)

An idea that has entered the [[governance/development-methodology|Spell Loop]] with a tracker work item. Planning artifacts (PRD, architecture, stories.json) live in the target **code repo**, not the docs repo.

#### Product

Feature merged to main and shipped. Business-level documentation lives in `ventures/<name>/` in arcane.

---

## Idea Frontmatter Status

Every file in `ventures/<name>/` uses this frontmatter `status` field:

| Status | Meaning |
|---|---|
| `concept` | Captured but not yet explored. Initial state. |
| `exploring` | Actively being refined — PRD in progress, research happening. |
| `prototyping` | Code prototype exists in the Prototypes repo. |
| `promoted` | Entered Spell Loop as a feature in a code repo. Link to tracker work item. |
| `parked` | Not dead, but not active. May revisit later. |
| `archived` | Explored and intentionally abandoned. Keep for historical record. |

Set `status` in the overview.md (or PRD.md if that's the primary doc). When an idea is promoted, add `promoted_to` with the target repo and work item:

```yaml
status: promoted
promoted_to:
  repo: "{ORG}/{repo}"
  work_item: 0
  date: YYYY-MM-DD
```

When an idea has a prototype, add `prototype_repo`:

```yaml
status: prototyping
prototype_repo: "{ORG}/prototypes"
prototype_path: magic-prompt
```

---

## Iteration Tracking

Ideas evolve. Track iterations without complex versioning:

1. **Use the idea's overview.md (or PRD) changelog section.** Add a `## Changelog` heading at the bottom with dated entries:
   ```markdown
   ## Changelog
   - YYYY-MM-DD: Initial concept captured
   - YYYY-MM-DD: PRD and architecture added (spell-plan + spell-architect)
   - YYYY-MM-DD: Prototype v1 pushed to Prototypes repo
   ```

2. **Screenshots:** Save evidence of each meaningful state to `assets/screenshots/YYYY-MM-DD/` per [[assets/screenshots/README|screenshot conventions]]. Link from the changelog.

3. **Git history is the version control.** Don't create `v1/`, `v2/` folders. The idea folder is a living document — git tracks every change.

---

## Promotion Criteria

### Concept → Prototype

No formal gate. If someone (human or agent) wants to see the idea running, generate code from the spec and push to the Prototypes repo. The concept spec in `ventures/` stays as-is.

### Concept/Prototype → Feature

All of these must be true:
- [ ] A tracker work item exists (User Story or Feature)
- [ ] A business track owns it (maps to a `ventures/<name>/` folder or a project)
- [ ] A target code repo exists (or needs to be created; repo creation is human-only)
- [ ] The idea has at least a PRD (`spell-plan` output)

When promoted: update the idea's frontmatter to `status: promoted` with `promoted_to` metadata. The idea folder stays in arcane forever as the historical record.

### Feature → Product

Standard Spell Loop completion: `spell-implement` → `spell-test` → `spell-review` → `spell-ship`. Feature branch merged to main in the code repo.

---

## Non-Code Ideas

Not every idea needs code. Image projects, design concepts, process improvements, and research topics stay at concept stage permanently. They live in `ventures/<name>/` with an `overview.md` and never need a prototype.

---

## Specs-First Principle

> **The PRD + architecture are the reproducible artifact. Code is ephemeral.**

In the vibe coding era, a well-written spec can regenerate a prototype in minutes. This means:
- **Invest in the spec**, not the code. A good PRD with clear requirements and a solid architecture doc is worth more than throwaway prototype code.
- **Don't mourn lost prototypes.** If prototype code is deleted, damaged, or outdated, regenerate it from the spec.
- **The Prototypes repo is a convenience**, not a vault. It holds the latest snapshot of demo code. It is not versioned, tagged, or released.
- **When an idea enters the Spell Loop**, the spec travels to the code repo (as `features/{id}-{slug}/PRD.md`). The prototype in the Prototypes repo can be abandoned.

---

## Relationship to Existing Patterns

| Pattern | How it connects |
|---|---|
| [[governance/development-methodology\|Spell Loop]] | Ideas enter the loop at `spell-plan`. Concept stage is pre-loop exploration. |
| Repo routing | Code → code repos. Docs → the docs repo. Prototypes → Prototypes repo. |
| Repo governance | Repo creation is human-only. Prototypes repo is a single shared repo, not per-POC. |
| Feature folders | Feature planning artifacts live in the target code repo under `features/`. |
| `ventures/<name>/` | Business-level docs for shipped products. Ideas that graduate here are fully promoted. |

---

## Quick Reference

**I have a new idea:**
→ Create `ventures/<name>/overview.md` with `status: concept`

**I want to see it running:**
→ Generate code from the spec, push to `Prototypes/<name>/` with a README linking to the spec

**I want to build it for real:**
→ Create a tracker work item, run `spell-plan`, move planning artifacts to target code repo `features/{id}-{slug}/`, update idea status to `promoted`

**The idea didn't work out:**
→ Set `status: archived` in the idea frontmatter. Add a note explaining why. Keep forever.

**I want to revisit a parked idea:**
→ Set `status: exploring`, update the changelog, and continue refining the spec
