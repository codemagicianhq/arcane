# PRD: Compliance Standards + `spell-compliance`

---
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
---

## Problem Statement

Arcane has no spell, governance doc, or checklist for any regulatory or privacy framework today. A
consumer repo shipping a consumer-facing SaaS product has no Arcane-provided starting point for GDPR,
CCPA, SOC 2, or HIPAA obligations, and no runnable way to self-assess gaps before those obligations
become a launch blocker, a sales-cycle blocker (SOC 2 is frequently a hard requirement in enterprise
procurement), or a legal liability.

## Target Users

Any Arcane-consuming repo building a product that collects personal data from real users — from an MVP
still deciding whether GDPR/CCPA apply, through public launch (consent flows, a real data-subject-request
process), to an enterprise sales stage where a prospect's security questionnaire asks for a SOC 2 report.

## Requirements

### Must Have

- **(a) `compliance-standards.md`** in `.arcane/governance/`, covering GDPR, CCPA, SOC 2, and HIPAA:
  each framework's applicability trigger, core obligations, and how they map to a typical SaaS product's
  concrete artifacts (data inventory, consent, retention/deletion, breach notification, access controls,
  audit logs). One flat `CS-nn` rule-ID sequence, matching this repo's established convention
  (`WD-nn`/`EV-nn`/`MR-nn`) rather than a per-framework prefix scheme.
- **A tiered applicability guide** as its own rule: which frameworks plausibly apply at which product
  stage (early MVP, public launch, enterprise) — not a substitute for a real determination, but a
  starting point for the question "do I need to worry about this yet."
- **An explicit, prominent "not legal advice" framing** at the top of the doc — the doc is a starting
  reference and a self-assessment aid, not a substitute for qualified legal counsel, and both the doc
  and the spell say so directly rather than implying authority they don't have.
- **(b) `spell-compliance`** — a repo self-assessment spell, structured as an audit-and-report tool (no
  apply/fix phase): determine which frameworks plausibly apply (ask, don't assume — the determination
  has real consequences), inventory what compliance-relevant artifacts already exist in the repo
  (privacy policy, data inventory/ROPA doc, retention policy, consent mechanism indicators, existing
  security docs this repo may already ship — `threat-model.md`, `hardening-checklist.md`), audit each
  applicable framework's obligations by citing `CS-nn` IDs (never restating them), and produce a
  prioritized remediation checklist. Runnable on any Arcane-consuming repo, not just this one.
- Registered under the existing `spells-build` component, alongside its closest sibling in shape,
  `spell-security-review` (both are repo-self-audit spells producing a findings report).

### Should Have

- Nothing beyond Must Have for this iteration — see Won't Have.

### Won't Have (this iteration)

- **An `--apply` / auto-fix mode.** Compliance gaps (a missing privacy policy, an undefined retention
  period) require business and legal judgment to close correctly — an agent drafting a privacy policy or
  inventing a retention period unilaterally would be manufacturing compliance theater, not compliance.
  The spell's own output is a checklist for a human to act on, matching the TODO item's own wording
  ("outputs a prioritized remediation checklist," not "fixes gaps").
- **Full legal coverage of every jurisdiction's privacy law.** Scoped exactly as the TODO item states:
  GDPR + CCPA as the mandatory baseline, SOC 2 as an optional enterprise tier, HIPAA included in the doc
  but flagged as narrow-audience (only businesses actually handling PHI). Other frameworks (LGPD, PIPEDA,
  a state-by-state US patchwork beyond CCPA) are out of scope until real demand surfaces them.
- **A machine-verifiable compliance certification.** Nothing here produces or claims to produce an
  actual SOC 2 report or a legal compliance certification — it is a self-assessment aid, stated as such.

## Constraints

- **D8:** the rule-ID-citation-with-graceful-degradation pattern and the `Context files` section shape
  are reused from `spell-make-discoverable`/`spell-eas-store-deploy`, not reinvented a third time.
- **Accuracy and scope discipline:** regulatory content is written at the level of a governance
  reference (established, uncontroversial obligations any competent engineer building a SaaS product
  should know as a starting point) — not a substitute for the specific-facts legal analysis a lawyer
  would give a specific business. This is stated directly in the doc, not left implicit.
- **Technical:** new files only — `src/assets/.arcane/governance/compliance-standards.md`,
  `src/assets/.github/prompts/spell-compliance.prompt.md` + its `.claude/commands/` stub, `registry.ts`
  component + `spells-build` membership, root dogfood copies via `fix:self-host-parity`,
  `docs/spell-catalog.json` + README regeneration via `fix:spell-catalog`.
- **Version bump:** minor — a brand-new spell is new distributed capability, matching this session's
  established convention.

## Acceptance Criteria

- [ ] `compliance-standards.md` exists with `CS-01` through a full rule set covering GDPR, CCPA, SOC 2,
      HIPAA applicability, and the tiered-applicability guide, each with rule-index-table + full prose
      matching `external-verification-standards.md`'s depth, and an explicit not-legal-advice framing.
- [ ] `spell-compliance.prompt.md` exists: determines applicable frameworks (asking, not assuming),
      inventories existing repo artifacts, audits by citing `CS-nn` IDs only, and produces a prioritized
      remediation checklist with no apply/fix phase.
- [ ] Registered in `registry.ts`'s `spells-build` component; `docs/spell-catalog.json` and README's
      catalogue block regenerate cleanly via `fix:spell-catalog`.
- [ ] `check:self-host-parity`, `check:adr-references`, `check:spell-catalog`, and the full test suite
      stay green; any hardcoded spell/component count elsewhere in `test/` is found and bumped in this
      same PR.
- [ ] Version bumped minor.

## Dependencies

- `spell-make-discoverable`/`spell-eas-store-deploy` (the rule-citation and graceful-degradation
  pattern reused).
- `registry.ts`'s existing `spells-build` component (joined, not replaced).

## Open Questions

- None blocking. Whether this ever needs a companion `spell-privacy-policy` (drafting an actual policy
  document) is deliberately left for real demand to decide — out of scope for a self-assessment tool.
