# Architecture — Upstream Intake 2026-09

Related: [[development-methodology]] (story format and sizing), [[agent-policies]] (the multi-agent
concurrency rules these lanes follow).

One section per wave. Each section records the final lane file allowlists: the orchestrator
re-verified them against the tree at wave start (PLAN.md Loop Protocol step 4). It also names the
stories file each lane runs and the decisions the wave builds on.

## UP-02 — Wave 1: safety and setup

**Wave branch:** `sessions/2026-09-27-up-02-safety-setup`, stacked on UP-01's branch (PLAN.md,
"Overnight run amendment").
**Decisions built on:**
- ARC-049 (push policy after init);
- ARC-051 (placeholder taxonomy);
- PRD D-02 (flags), D-03 (ADO context), D-10 (tag vocabulary), D-11 (halted rebase).

**Version:** one minor bump, 1.5.1 → 1.6.0, applied by the orchestrator at integration.

### Rules every lane follows

- **Files.** A lane edits only its allowlist, plus the root copies that `npm run fix:self-host-parity`
  regenerates **from that lane's own source edits**. A story that needs any other file stops and
  reports; it is never done anyway.
- **Orchestrator-owned files** (no lane touches them):
  - `package.json`, `package-lock.json`, `CHANGELOG.md`, `DECISIONS.md`
  - `docs/spell-catalog.json`
  - `.github/workflows/**`, `features/**`, `docs/plans/**`
  - every existing test file not in the lane's allowlist
- **Tests.** Existing shared prompt tests are orchestrator-owned: for example
  `prompt-diagram-emission`, `prompt-tracking-and-business-root`, `prompt-drift-classification`,
  `spell-routing`, `prompt-autonomy-gates`, `prompt-session-branch-gate`,
  `prompt-worktree-vantage-check`, `docs-profile-registry-split`, and `attribution-trailer-split`.
  Lanes put new assertions in **new** test files named `test/up02-<lane>-*.test.ts`. If an existing
  assertion breaks because of an intended change, the lane reports it and does not edit it.
- **Spells.** Edits under `src/assets/` keep spell frontmatter unchanged (the spell catalog is
  generated from it). Prefer additive text over deleting text an existing test asserts.
- **Git.** Lanes commit locally (one commit per story, with the program's trailers) and never push,
  fetch, prune or `gc`.

### Lane allowlists

| Lane | Allowlist | Stories |
|---|---|---|
| A: CLI questions and push enforcement | `src/modules/hub.ts`, `src/commands/init.ts`, `src/commands/update.ts`, `src/index.ts`, `src/types.ts`, `src/modules/manifest.ts`, `src/modules/push-safety.ts`, new `src/commands/block-push.ts`, new `src/modules/ado-context.ts`, `README.md`, `test/hub-retrofit.test.ts`, `test/init.test.ts`, `test/init-git-state.test.ts`, `test/update.test.ts`, `test/lifecycle.test.ts`, `test/push-safety.test.ts`, `test/manifest.test.ts`, new `test/block-push.test.ts`, new `test/up02-a-*.test.ts` | `stories/UP-02-lane-a.json` |
| B: push and PR spells | `src/assets/.arcane/spells/{spell-commit-work,spell-create-pull-request,spell-ship,spell-sync-pull-request,spell-close-session}.md`, new `src/assets/.arcane/spells/_fragments/push-policy-check.md`, `src/assets/.arcane/governance/{git-conventions,universal-agent-rules}.md`, new `test/up02-b-*.test.ts` | `stories/UP-02-lane-b.json` |
| C: idea privacy | `src/assets/.arcane/spells/{spell-manifest,spell-save-idea}.md`, new `test/up02-c-*.test.ts` | `stories/UP-02-lane-c.json` |
| D: placeholder check | `src/commands/doctor.ts`, new `src/modules/placeholders.ts`, `src/assets/.arcane/governance/spell-authoring-standards.md`, governance docs re-statused to `status: template` (fill-in documents only), `src/assets/.arcane/spells/spell-check-drift.md`, `test/registry.test.ts`, existing `test/doctor-*.test.ts`, new `test/doctor-placeholders.test.ts`, new `test/up02-d-*.test.ts` | `stories/UP-02-lane-d.json` |

**Cross-lane contract.**
- Lane A creates the `spell block-push` command.
- Lanes B and D refer to it by name only. D updates `doctor`'s remedy text, because `doctor.ts` is
  D's file.
- No lane imports another lane's new code.

**Collision checks, done at wave start:**
- `src/index.ts`: lane A only.
- `doctor.ts`: lane D only.
- `README.md`: lane A only.
- Fragment files: lane B adds `push-policy-check.md`, the only fragment added this wave.
- Root instruction files (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`) do not embed
  `universal-agent-rules.md`, so lane B's governance edit regenerates only
  `.arcane/governance/universal-agent-rules.md`.

## UP-03 — Wave 2: registry deltas, idea lifecycle, sessions

**Wave branch:** `sessions/2026-09-27-up-03-registry-lifecycle`, stacked on UP-02's branch.
**Decisions built on:**
- ARC-050 (decision-number allocation);
- PRD D-08 (sweep scope), D-09 (`.gitattributes`), D-15 (registry deltas), D-02 (#282's spell
  half).

**Version:** one minor, 1.6.0 → 1.7.0. The new component follows `spell-bump`'s "New component
added to registry → minor". It is applied by the orchestrator at integration.
**Deferred tonight:** #267, pending Q-004 (PLAN.md, "Overnight run amendment").

**Rules:** identical to UP-02's "Rules every lane follows", with UP-03 names (`test/up03-<lane>-*.test.ts`).

**Orchestrator-owned shared tests** (re-verified by grepping `test/` against every file below):
- `prompt-diagram-emission`
- `prompt-tracking-and-business-root`
- `prompt-handoff-durability`
- `prompt-pending-verification`
- `prompt-session-branch-gate`
- `prompt-worktree-vantage-check`
- `spell-routing`
- `research-doc-capability`
- `verification-ledger`
- `agent-generator`
- `prompt-drift-classification`

| Lane | Allowlist | Stories |
|---|---|---|
| A: registry deltas | `src/commands/update.ts`, `src/modules/registry.ts`, `src/config/profiles.ts`, `src/commands/doctor.ts`, `src/types.ts`, new `src/modules/registry-changes.ts`, new asset files for the split `.gitattributes` component (if one is needed), `docs/spell-catalog.json` and `README.md` **only as rewritten by `npm run fix:spell-catalog`**, `test/update.test.ts`, `test/registry.test.ts`, `test/docs-profile-registry-split.test.ts`, `test/line-ending-policy.test.ts`, `test/init.test.ts`, `test/lifecycle.test.ts`, `test/spell-catalog.test.ts`, existing `test/doctor-*.test.ts`, new `test/up03-a-*.test.ts` | `stories/UP-03-lane-a.json` |
| B: idea lifecycle | `src/assets/.arcane/spells/{spell-todo,spell-save-idea,spell-manifest}.md`, `src/assets/.arcane/governance/development-methodology.md`, their root copies, `test/up02-c-*.test.ts`, `test/cicd-fail-safe-path-filters.test.ts`, new `test/up03-b-*.test.ts` | `stories/UP-03-lane-b.json` |
| C: decisions and lessons | `src/assets/.arcane/spells/{spell-close-session,spell-feedback}.md`, `src/assets/.arcane/governance/decision-documentation-standard.md`, their root copies, `scripts/check-stale-claims.ts`, `test/check-stale-claims.test.ts`, new `test/up03-c-*.test.ts` | `stories/UP-03-lane-c.json` |
| D: session start | `src/assets/.arcane/spells/{spell-open-session,spell-arcane-version}.md`, their root copies, new `test/up03-d-*.test.ts` | `stories/UP-03-lane-d.json` |

**Cross-lane contract:**
- Lane B references lane C's lesson-routing step by name only, and lane C references
  `spell-save-idea` by name only (lane B owns that file).
- Lane D quotes the CLI flag names shipped in UP-02, reading them from `src/index.ts`.

## UP-04 — Wave 3: the needs-you sweep (lane B only tonight)

**Wave branch:** `sessions/2026-09-27-up-04-needs-you`, stacked on UP-03's branch.
**Lane A (#271, Show Report theme) is deferred.** It waits on OPERATOR-QUEUE Q-006, the change in
`arcane-ui`, and becomes UP-04b (recorded in PLAN.md as UP-06) when that lands (PLAN.md, "Overnight
run amendment").
**Decision built on:** PRD D-13, one ARC-039 fragment landed last as a single sweep.
**Version:** one minor, 1.7.0 → 1.8.0. A new distributable fragment and new spell text fall under
`spell-bump`'s "When in doubt: new distributable content = minor". Applied by the orchestrator.

**Rules:** identical to UP-02's "Rules every lane follows", with UP-04 names
(`test/up04-b-*.test.ts`).

| Lane | Allowlist | Stories |
|---|---|---|
| B: needs you | new `src/assets/.arcane/spells/_fragments/needs-you.md`; the canonical spells that get the fragment (chosen by story UP04-B-02); `src/assets/.arcane/governance/spell-authoring-standards.md`; their root copies; new `test/up04-b-*.test.ts` | `stories/UP-04-lane-b.json` |

**Single-lane wave: no collision set to check.** The one rule that still bites is fragment spans:
the lane must not edit inside the `push-policy-check` or `tracking-mode-declaration` spans, because
`fix:self-host-parity` owns them.
