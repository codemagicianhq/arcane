---
name: Spell — Present Arcane
description: Present Arcane in one of three modes — a full 1-hour talk (default), a live-state executive summary document, or a deck-builder meta-prompt sized to a slide count or duration.
argument-hint: '[summary|deck] + optional audience/size — e.g., "for investors", "summary exec", "deck 10m", "deck 20 slides"'
agent: agent
---

See [[governance/development-methodology|Development Methodology]] for full Spell Loop reference. Project context: [[project|Project Overview]].

## Mode Selection

Parse the first word of the argument before doing anything else. Match case-insensitively:

- `summary` → run **Summary Mode** (produce a finished executive-summary document; skip the slide deck). See the Summary Mode section at the end of this file.
- `deck` → run **Deck Mode** (emit a copy/paste prompt for an external AI to generate slides). See the Deck Mode section at the end of this file.
- `present`, or no argument at all → run **Present Mode** (default): the full 1-hour talk outline defined immediately below (Purpose through Tone).
- Any other leading word → treat the whole argument as an audience hint and run **Present Mode**. (If the word *looks* like an intended mode — e.g. `slides`, `doc`, `pdf`, `talk` — note in one line that it isn't a recognized mode and that you're defaulting to Present, then proceed.)

After identifying the mode, treat every remaining word as an audience and/or size hint and carry it forward into the chosen mode. The mode keyword itself (`summary`/`deck`/`present`) is consumed by routing and is never a hint.

---

## Purpose

Generate a complete, structured presentation for a **1-hour talk about the Arcane project** — including slide-by-slide outline, speaker notes, and a timed demo segment plan.

The presentation should tell the story of *what was built*, *why it matters*, *how it works*, and *where it is going*.

---

## Context Files to Read First

Read these files before generating the presentation. They are the ground truth **when present** — every row is **optional**. If a file is missing, use the listed fallback and continue; flag any gap in the output (see Output Instructions) rather than blocking.

`{BUSINESS_ROOT}` is the directory holding per-business folders (e.g. `ventures/`, `businesses/`, or `projects/`); `{BUSINESS_NAME}` is a specific business. Resolve both from `.arcane.json` / project frontmatter; if unset, **detect** by scanning for a likely root, or ask the operator. There may be zero, one, or many businesses — enumerate whatever exists rather than assuming a fixed count.

| File | What to extract | If missing, fall back to |
|------|----------------|--------------------------|
| [project.md](../../project.md) | Mission, vision, core principles, entities, goals | `README.md`, then ask the operator for the mission |
| [ai-context/system-prompt-context.md](../../ai-context/system-prompt-context.md) | Environment, agent stack, current state | Infer environment from repo; omit slide detail if unknown |
| [DECISIONS.md](../../DECISIONS.md) | Key ADRs — decisions that shaped the architecture | Skip ADR callouts; note that decision records are absent |
| [agents/agent-capability-matrix.md](../../agents/agent-capability-matrix.md) | Agent lineup and capability tiers | `.github/agents/*.agent.md`; else present the system generically |
| [agents/agent-policies.md](../../agents/agent-policies.md) | Power levels, autonomy model | [[governance/naming-conventions]]; else describe roles generically |
| `{BUSINESS_ROOT}/<business>/overview.md` | Per-business status (repeat for each business found) | Enumerate `{BUSINESS_ROOT}/*`; if none, present Arcane without a ventures act |
| [governance/development-methodology.md](../../governance/development-methodology.md) | The Spell Loop — development workflow | Describe the Spell Loop from the spell library filenames |
| `{INFRA_DOC}` — hardware/infra inventory (e.g. `infrastructure/hardware-inventory.md`) | Hardware context for demo credibility | Detect any infra/hardware doc; else omit the infrastructure slide |
| [README.md](../../README.md) | Repo structure overview | List top-level directories directly |

---

## Presentation Requirements

### Format
- **Total runtime:** 60 minutes
- **Structure:** Slides + speaker notes + timed demo plan
- **Output format:** Markdown outline suitable for pasting into Gamma.app, Google Slides, or PowerPoint
  - Each slide = `## Slide N — Title` heading
  - Bullet points = talking points (not wall-of-text)
  - Speaker notes = italic block under each slide
  - Max 6 bullets per slide

### Timing Budget
| Segment | Minutes |
|---------|---------|
| Opening hook + who I am | 5 |
| What is Arcane / the vision | 8 |
| The problem being solved | 5 |
| Architecture & stack walkthrough | 12 |
| Ventures — what's been built | 8 |
| Live demo | 15 |
| Lessons learned & what's next | 5 |
| Q&A buffer | 2 |
| **Total** | **60** |

---

## Slide Structure to Generate

### Act 1 — Hook & Context (Slides 1–4, ~13 min)

1. **Title slide** — Project name, presenter, date, one-line tagline
2. **The dream** — "One person. Multiple businesses. AI does the work." The vision in human terms.
3. **Who I am** — {OPERATOR_NAME}'s background, technical role, what motivated this project
4. **The problem** — Running a business is brutal. AI tooling exists but isn't wired together. This project wires it together.

### Act 2 — What Was Built (Slides 5–11, ~20 min)

5. **Arcane — the operating system for AI-run businesses** — What the repo is, what it contains, how it's structured
6. **Security model** — full-disk encryption, least privilege, no root, SecretRef, private network mesh — why security is non-negotiable for a production system
7. **The AI agent stack** — the gateway plus the agent lineup, power levels, and tool profiles. Populate the roster from the agent-capability-matrix / `.github/agents/*.agent.md` (see [[governance/agent-policies]] / [[governance/naming-conventions]]); name each `{AGENT_NAME}` with its role rather than assuming a fixed cast. If no roster files exist, describe agent *roles* (e.g. research, marketing, ops, dev) generically.
8. **The Spell Loop** — Arcane's development methodology: spell-plan → spell-architect → spell-implement → spell-ship
9. **Multi-client AI governance** — Same rules enforced across every AI client the operator uses. Cite the relevant governance ADR if a decision record exists (resolve the ADR id from `DECISIONS.md`); otherwise state the principle without an id.
10. **Ventures overview** — one line per business found under `{BUSINESS_ROOT}` (e.g. `{BUSINESS_NAME}` — launch-ready, `{BUSINESS_NAME}` — active dev), plus the idea pipeline. If none exist, replace with a roadmap slide.
11. **Infrastructure** — `{PRIMARY_HOST}` (primary host; resolve from `{INFRA_DOC}` / `.arcane.json`, else ask or omit), the private network mesh, the configured tracker, and any dual-boot/host setup

### Act 3 — Live Demo (Slides 12–13, ~15 min)

12. **Demo plan slide** — What will be shown, in what order, what to look for
13. **Demo backup slide** — Screenshots/recordings of key flows in case of live failure

**Demo script to include (in speaker notes):**
- Show Arcane repo structure in VS Code
- Trigger a spell command (e.g., `spell-open-session` or `spell-sprint-status`) and show it in action
- Show a Spell Loop output artifact (PRD or epics) that was AI-generated
- Show the agent gateway running on `{PRIMARY_HOST}` (status, agent list, or a live agent message). Resolve `{PRIMARY_HOST}` from `{INFRA_DOC}` / `.arcane.json`; if unset, ask the operator or skip this beat.
- Optional: show Gamma.app or SlidesAI generating a quick slide from a prompt (meta moment)

### Act 4 — Reflection & Next (Slides 14–16, ~7 min)

14. **What worked** — Top 3 things that validated the approach
15. **What was hard** — Honest lessons: security overhead, LLM consistency, documentation discipline
16. **What's next** — near-term milestones per business found (e.g. `{BUSINESS_NAME}` launch, `{BUSINESS_NAME}` Sprint 1) and scaling to the next business. Pull these from each `{BUSINESS_ROOT}/<business>/overview.md`; if none exist, present the framework roadmap instead.

### Closing (Slide 17)

17. **Close** — One-sentence takeaway, contact info, repo or demo link

---

## Output Instructions

1. Generate the **full slide outline** with titles, bullet points (max 6 per slide), and speaker notes.
2. Include a **demo timing breakdown** in the speaker notes for slides 12–13 (what to show at each minute mark).
3. At the end, include a **"Gamma.app prompt"** block — a single text prompt the user can paste into Gamma.app to auto-generate the visual deck from this outline.
4. Flag any slides where **content gaps exist** (e.g., a venture overview file that doesn't exist yet) so the user knows what to fill in before presenting.

---

## Tone

- Confident and technical — this is not vaporware, this is a working production system.
- Honest — show real numbers, real stack, real decisions. No marketing fluff.
- Energetic — this is a unique project; present it with pride.
- Audience-aware — if the user provided an audience hint (e.g., "for investors"), adjust language and emphasis accordingly. Default to technical/builder audience.

---

## Summary Mode

Produce a finished, always-current executive summary **document** about Arcane — not a slide deck and not a prompt for another AI. The point is that it reflects live repository state at run time, so counts and versions are never stale.

### Step 1 — Gather live state

Read the repo to populate accurate values:

- `package.json` / `.arcane.json` → Arcane version.
- `.github/prompts/spell-*.prompt.md` → count of spells.
- `.github/agents/*.agent.md` → count of agent personas.
- `.arcane/governance/*.md` → governance/standards docs available.
- `README.md` / `project.md` → scope and mission.

### Step 2 — Tailor to audience

If an audience hint followed `summary` (e.g., `exec`, `engineering`, `onboarding`), adjust emphasis:

- **exec** — governance, auditability, delivery predictability.
- **engineering** — the Spell Loop, quality gates, the spell + agent system.
- **onboarding** — getting started, `spell init`, first session.
- none — balanced general-stakeholder summary.

### Step 3 — Output the document

Output a complete Markdown document (no preamble), with current values filled in: what Arcane is, why it exists, what it includes (spell count, agent count, governance), how adopters use it (the Spell Loop), how quality/governance are enforced, and how to adopt it. End with a one-line generation note including the version. The document must be immediately usable as-is.

---

## Deck Mode

Produce a single copy/paste **prompt** that the user can give to another AI tool to generate a full slide deck about Arcane, sized to the requested length.

### Step 1 — Parse size

From the words after `deck`:

- `N slides` → target exactly N slides.
- `Nm` (minutes) → ~1 slide/minute (10m → 8–12, 30m → 20–30).
- `Nh` (hours) → convert to minutes, ~0.8–1.0 slides/minute (1h → 45–60).

If no size is given (including when only an audience hint like `deck for investors` follows), stop and ask for one (`N slides`, `Nm`, or `Nh`) before emitting anything. Retain any audience hint already provided so the user need not repeat it.

### Step 2 — Gather source material

Use repo docs as ground truth (README, project, development-methodology, git-conventions, the spell library, agent roster). Cover: the Spell Loop lifecycle and quality gates; the spell + agent system; session continuity; governance; adoption path; risks and anti-patterns.

### Step 3 — Emit the meta-prompt

Output one fenced code block containing a prompt that instructs the external AI to produce: the target slide count (or range), a slide-by-slide outline, title + subtitle per slide, 3–5 bullets per slide, a visual suggestion per slide, and speaker notes — plus a final roadmap slide and a risks/limitations slide. Require plain language and claims grounded in the supplied context. After the block, add a one-line tip to paste it into the user's preferred slide generator and request export.

