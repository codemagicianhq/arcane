---
status: planned
tracking_mode: internal
external_provider: null
source_intake: operator idea 2026-09-08, promoted via spell-manifest 2026-09-08
planned: 2026-09-09 — see docs/plans/codex-support/PLAN.md for the epic-level execution plan (spell-scope: this PRD's scope exceeds one Spell Loop cycle)
---

# PRD — OpenAI Codex Support, a Client-Neutral Spell Source, and a User-Level Install Tier

## Problem Statement

Arcane does not currently work on OpenAI Codex: the spells are not visible to Codex, so they
cannot be invoked natively from that client. The likely path is the `SKILL.md` format, which
may force a reconsideration of the current distribution model. The current distribution serves
one use case (the current one) well, but Skills raise a question Arcane has not answered: if
skills were installed at the user-level or machine-wide location, they would become available
everywhere, and Arcane has no equivalent of that today. It may be time to tackle this problem
once more.

Codex support is needed immediately, to restart active work on that stack.

**Verified 2026-09-08 against this repo:** it ships zero `SKILL.md` files and no
`.agents/skills/` component. Codex appears only in `AGENTS.md`-generation code and governance
prose. At least one consumer has been observed hand-authoring its own `.agents/skills/`
dispatcher skill locally because nothing managed reaches it, which also means that dispatcher
never reaches any other consumer.

**Prior art in this repo:** the BC-28 delivery-channels spike
([docs/research/delivery-channels-smoke-tests.md](../../docs/research/delivery-channels-smoke-tests.md))
already scanned AI-native delivery channels, naming portable Agent Skills (`SKILL.md`) and
Microsoft APM as cross-tool paths spanning Copilot, Claude, Cursor, and Codex. This request is
the concrete, urgent Codex slice of that broader distribution question. [OPERATOR-QUEUE.md
Q-010](../../docs/plans/become-current/OPERATOR-QUEUE.md#q-010--decide-whether-to-pursue-a-package-referenced-distribution-model)
parked that channel as "entirely unevaluated" on 2026-09-01 — this program unparks it. The
existing `spell agents sync` fan-out covers agent definitions but not spells.

**Second problem, surfaced during planning (2026-09-09, operator report):** opening more than one
Arcane-managed repository in a single VS Code workspace duplicates every spell and every agent
per folder — Copilot's prompt files and custom agent modes are workspace-folder-scoped. Ten
Arcane repos in one workspace surfaces 410 `/spell-*` entries and 120 Arcanos agent modes. Not
previously documented anywhere in this repository (confirmed by keyword sweep: no hit for
"multi-root", "duplicate", or equivalent in any `.md`/`.ts`/`.json`). Solving Codex support and
solving this duplication converge on the same mechanism (see Requirements), so both are scoped
into one program rather than two.

**Third problem, surfaced during planning:** the distributed spell source is Copilot-shaped by
historical accident (`.github/prompts/` is canonical only because Arcane started Copilot-only).
The existing Claude Code stub already proves the better model — a four-line shim referencing the
canonical prompt — and the operator has directed that every client surface (Copilot, Claude,
Codex) become an equally thin, generated shim over one client-neutral canonical source, rather
than growing a third format that copies content again.

## Target Users

- **The operator**, working across multiple Arcane-managed repositories in one VS Code workspace
  and in OpenAI Codex (CLI and IDE extension), who needs spells and agents to work without
  clutter or duplication.
- **Solo-operator Arcane consumers generally** — this is not venture-specific; it is a framework
  capability change affecting every consumer of `arcane-cli`.
- **AI agents themselves** (Codex specifically) as a first-class reader of Arcane's distributed
  content, on par with Copilot and Claude Code today.

## Requirements

### Must Have

- **R1 — Codex can discover and invoke every Arcane spell.** Each spell ships a `SKILL.md` at a
  path Codex (CLI and VS Code extension) discovers, carrying correct `name`/`description`
  frontmatter and a body that reliably leads Codex to execute the full spell workflow.
  *Acceptance:* AC1, AC2.
- **R2 — One client-neutral canonical source per spell.** Every spell's authored body lives in
  exactly one file; the Copilot prompt, the Claude Code command, and the Codex skill are each a
  generated shim referencing it, structurally incapable of drifting apart (mirroring the existing
  parity-guard model, extended). *Acceptance:* AC3, AC4.
- **R3 — A user-level (home-directory) install tier for spells and agents.** An operator can
  install the full spell and agent set once per machine; two or more repositories opted into the
  user tier show exactly one set of spells and one set of agents in a shared VS Code workspace,
  not one set per repository. *Acceptance:* AC5, AC6.
- **R4 — A repository may opt out of carrying repo-local spell/agent files** when a compatible
  user-tier install exists, without breaking `spell doctor`, `spell update`, or losing spell
  access in that repo. *Acceptance:* AC6, AC7.
- **R5 — No silent data loss during the canonical-source migration.** A consumer who has
  hand-edited a distributed prompt or command file never has that edit silently overwritten or
  discarded by `spell update`. *Acceptance:* AC8.
- **R6 — The distribution-model question this request opened is answered on the record**, not
  left implicit: whether generated client files should also become restorable/gitignored
  (`node_modules`-style) is evaluated and given an explicit go/no-go, separate from and not
  blocking R1–R5. *Acceptance:* AC9.

### Should Have

- Governance/authoring documentation (README, `portable-bootstrap.md`, `spell-authoring-standards.md`)
  updated to describe the new canonical location and the user tier, so a new contributor or
  consumer does not have to reverse-engineer the model from code.
- `spell doctor` verifies user-tier/repo-tier version compatibility when a repo has opted out of
  repo-local files, with an actionable remedy on failure.

### Won't Have (this iteration)

- **Machine-level (all-users) install scope.** Considered and explicitly deferred: it requires
  elevated write access, which `.arcane/governance/agent-policies.md`'s Execution Restriction
  Baseline prohibits for agents, and provides no benefit over the user tier for a solo operator.
  The scope type is `repo | user` only; a `machine` value is not introduced in this iteration and
  can be added later without a schema break.
- **Implementing** the restore-based (`node_modules`-style) distribution model — R6 only requires
  a researched decision, not a shipped mechanism. A "go" verdict becomes its own future program.
- **Cross-repo work in a private design/UI repository.** Unlike Show Report, this program has no
  arcane-ui dependency; everything ships from this repository alone.
- **Retiring or consolidating away the Copilot-prompt or Claude-command formats.** All three
  client formats (Copilot, Claude, Codex) continue to ship side by side, each a thin generated
  shim; dropping any of them is a separate, later decision, not part of this scope.

## Constraints

- **Technical:**
  - No symlinks or filesystem junctions as a distribution mechanism (reaffirms
    [ARC-027](../../DECISIONS.md#arc-027--registry-driven-self-host-parity-guard): the
    maintainer's own environment runs `core.symlinks=false`). All cross-location delivery is by
    file copy.
  - Every committed generated artifact requires a byte-parity guard, registry-derived, never a
    second hand-maintained file list ([ARC-012](../../DECISIONS.md#arc-012--generated-distributable-artifacts-require-a-parity-guard),
    [ARC-027](../../DECISIONS.md#arc-027--registry-driven-self-host-parity-guard)).
  - Any `src/assets/` change requires a `package.json` version bump in the same PR
    (`scripts/check-version-bump.ts`, enforced in CI).
  - The canonical-source relocation is a breaking change to the distribution contract
    ([ARC-033](../../DECISIONS.md#arc-033--docs-mode-subject-root-content-sensitivity-and-capability-scoped-spell-components)
    decision 1, "no spell file is renamed or moved," requires an explicit amendment) — expected to
    ship as a major version bump; the exact version is an operator decision at that epic, informed
    by a CHANGELOG catch-up (`CHANGELOG.md` currently stops at `0.22.0` against `package.json`'s
    `0.38.3`).
  - `.arcane/governance/*` content is unaffected — it is not a harness-discovered surface and
    stays committed under every model.
- **Business:** solo-operator project; no external team coordination, but public OSS consumers
  are affected by the breaking change and must have a safe `spell update` migration path (R5).
- **Security:** no new attack surface identified; the user tier writes only within the operating
  user's own home directory, following the existing OpenClaw (`~/.openclaw`) precedent in
  `src/modules/agent-generator.ts`.

## Acceptance Criteria

- [ ] **AC1** — `spell init --profile full` into a fresh repository produces
  `.agents/skills/<id>/SKILL.md` for every spell in the profile, with valid `name`/`description`
  frontmatter, and `npm run check:self-host-parity` passes.
- [ ] **AC2** — In OpenAI Codex (CLI and/or VS Code extension), an installed spell (e.g.
  `spell-plan`) appears in Codex's own skill listing and, when invoked, executes the referenced
  workflow — verified by direct observation in Codex, not by filesystem inspection alone, and
  recorded in `docs/research/skill-discovery-smoke-tests.md`.
- [x] **AC3** — Every spell's Copilot prompt, Claude Code command, and Codex skill file are each
  generated from one canonical source file by a documented `render*()` function; no client file
  contains authored prose that isn't in the canonical source. *Met 2026-09-09 (CS-03):*
  `renderCopilotPromptShim()` / `renderClaudeCommandStub()` / `renderCodexSkill()` over
  `.arcane/spells/<id>.md`; `test/spell-compiler.test.ts` guards that no shipped Copilot prompt
  carries a body.
- [x] **AC4** — A change to a spell's canonical source, followed by `npm run fix:self-host-parity`,
  updates all three client-format files identically; `npm run check:self-host-parity` fails if any
  one of them is hand-edited out of sync. *Met 2026-09-09 (CS-03):* `runShimParity` over the three
  targets; drift and repair covered on a temp tree and on the real assets.
- [ ] **AC5** — `spell init --user` (or the chosen CLI surface) installs the full spell and agent
  set to a single per-machine location; two disposable repositories in one VS Code workspace, both
  configured for the user tier, show exactly one set of `/spell-*` entries and one set of the 12
  Arcanos agent modes — verified by direct count in VS Code, recorded in the same research doc.
- [ ] **AC6** — A repository with `spell_scope: "user"` (or equivalent field) passes `spell doctor`
  when a compatible user-tier install exists, and fails with an actionable remedy message when it
  does not.
- [ ] **AC7** — `spell init`/`spell update` on a repo opted into the user tier does not write
  repo-local `.github/prompts`, `.claude/commands`, `.github/agents`, or `.agents/skills` files;
  running the same commands on a repo NOT opted in is unaffected (default behavior unchanged).
- [x] **AC8** — A fixture consumer repo with one hand-edited distributed prompt file, run through
  the canonical-source migration via `spell update`, retains the hand-edited file's content
  unmodified and surfaces an explicit warning naming the file; every non-edited file is replaced
  by the new shim. Covered by an automated regression test. *Met 2026-09-09 (CS-03):* the
  `spells-docs` migration fixture in `test/update.test.ts` (edited, untouched and dry-run cases),
  designed after a live run of the pre-CS-03 `update` against a real consumer showed it merging an
  edit "successfully" into the new shim.
- [ ] **AC9** — `docs/research/restore-based-delivery.md` and an ADR draft exist, stating an
  explicit go/no-go on the restore-based distribution model with named reasoning, before this
  program's Definition of Done is declared met.

## Dependencies

- **ARC-045 (new ADR, to be drafted in this program):** must be accepted by the operator before
  the canonical-source migration (R2) begins — every delegation in this repository excludes
  ADR acceptance; see Authority & Delegation in `docs/plans/codex-support/PLAN.md`.
- **CHANGELOG.md catch-up** (0.22.0 → current) should land before the major version bump, so the
  bump has a real changelog rather than a 16-version gap.
- **This PRD's scope exceeds one Spell Loop cycle** (multiple epics, one breaking version, a
  research spike) — routed through `spell-scope` for epic-splitting into
  `docs/plans/codex-support/PLAN.md`, following the precedent set by Become Current, Lessons
  Hardening, and Show Report (each a PRD-scale intent doc plus a separate multi-epic PLAN.md).
- No dependency on any other repository (unlike Show Report's `arcane-ui` dependency) — everything
  ships from `arcane-cli` alone.

## Open Questions

- **Resolved during planning, recorded for the trail:** tracking mode is `internal` (no external
  tracker); machine-level install scope is deliberately out of scope (see Won't Have); the
  restore-based distribution model is scoped as a research spike (R6/AC9), not an implementation
  target, in this iteration.
- **Still open, and expected to stay open until the relevant epic runs:** the exact CLI surface
  for the user tier (`--user` flag vs. a `spell user` noun — a naming-conventions "Naming Test"
  call); whether any client's skill discovery fails to follow an external file reference (in which
  case that client's shim falls back to an inlined body, per the compiler's `mode` design); the
  final version number for the breaking canonical-source change (recommended `1.0.0`, operator
  confirms at that epic).
