---
title: "PRD: External Findings Intake"
status: draft
implementation_status: blocked
maturity_gate: manual-batch-002
tracking:
  tracking_mode: internal
  external_provider: null
source_intake: batch-001
created: 2026-07-31
---

# PRD: External Findings Intake

## Problem Statement

Arcane has local capture spells, bug intake, feature intake, and ADR conventions, but no governed path for findings to cross from a consuming repository into the framework. The missing process must verify version-specific claims, protect consumer identity, obtain item-level consent, delete declined submissions without a ledger, and route accepted items without treating submission as approval.

Batch 001 was executed entirely by hand because no spell produces this workflow. It created 29 item reports in total, then deleted one without trace after the operator chose Drop. It preserved EF-14 as one schema issue merged from three submissions, contradicted and re-scoped EF-21 rather than weakening it, and triggered a cross-cutting audit that surfaced five concrete bugs nobody had filed. The structured question channel also returned a synthetic "user unavailable" response while the operator was present, exposing a fail-closed consent requirement.

## Maturity Gate

This PRD is a provisional record of batch-001 learnings, not an accepted implementation contract.

Run the full intake process manually for at least one independent batch 002 before changing `status` from `draft` or beginning implementation. Compare both runs and classify each proposed requirement as stable, revised, rejected, or batch-specific. One execution is an anecdote; automating it now would encode accidents of this batch as framework requirements.

Implementation also queues behind EF-25 through EF-29, with EF-25 first. A new intake feature must not displace fixes for destructive update behavior and other defects in shipped workflows.

## Target Users

- Arcane maintainers receiving field findings from consuming repositories.
- Operators submitting de-identified evidence from client, personal, or internal repositories.
- Agents verifying reports against a newer framework version than the consumer installed.

## Provisional Requirements

### MH-01 — Receive a versioned batch

Accept a batch that identifies the consumer Arcane version, provenance tier, item IDs, intended route, and evidence required to reproduce each claim. Preserve deliberately merged findings as one item.

### MH-02 — Verify every item independently

Check every falsifiable claim against current canonical framework source before asking for disposition. Cite file and line. Report `not-reproduced`, `already-fixed`, partial verification, stale counts, and corrected premises plainly.

### MH-03 — Enforce boundary redaction

Before repository write, reject personal or organization names, usernames in paths, account identifiers, monetary amounts, client identities, and other source-specific identifiers. Preserve technical products, counts, sizes, and failure behavior when they are evidence. If evidence cannot survive de-identification, send it back rather than weakening the claim.

### MH-04 — Maintain one temporary report per item

Create one report per item with claim, verification, impact, proposed fix, and open questions. Reports are provisional intake artifacts until disposition. A merged submission remains merged unless the operator explicitly changes scope.

### MH-05 — Obtain authenticated item-level consent

Survey Keep, Drop, or Defer item by item, or by one explicitly approved interlocking cluster. Submission is not consent. A host-generated absence response, timeout, cancellation, delegated response, or synthetic fallback is not an operator decision. The gate fails closed and surfaces the unresolved question through an alternate channel.

### MH-06 — Delete drops without trace

On Drop, delete the report outright. Do not retain the item, a tombstone, a disposition ledger, or the reason. The reason may be the private part of the submission.

### MH-07 — Route only after reconciliation

Before filing, present the full disposition list and wait for operator reconciliation against the reports. Only then route accepted items to bugs, proposed/accepted ADRs, or PRDs. Deferred items remain intake reports and are not filed.

### MH-08 — Expose enforcement and uncertainty

Record when verification is source-only, runtime-unverified, blocked by unavailable infrastructure, or dependent on an external artifact. Distinguish observed dispatch from observed effect. Never convert a contradicted claim into a different feature silently; re-scope it explicitly and obtain disposition on the surviving claim.

## Won't Have Before Batch 002

- Final prompt wording or command name.
- Automated routing to TODO, ADR, PRD, or external trackers.
- Automated redaction that rewrites evidence without review.
- A permanent rejected-item ledger.
- Implementation work of any kind.

## Batch-001 Evidence

| Observation | Design implication to retest in batch 002 |
| --- | --- |
| 29 reports were produced; one was deleted on Drop | Temporary per-item artifacts plus trace-free discard |
| EF-14 merged three submissions | Preserve intentional item boundaries |
| EF-21's broad premise was contradicted but a narrower defect survived | Explicit re-scope with renewed consent |
| EF-06 did not reproduce and was deleted | Non-reproduction is a successful outcome |
| EF-24 audit surfaced EF-25 through EF-29 | Intake may trigger cross-cutting analysis without absorbing concrete bugs |
| AskUserQuestion returned a synthetic absence response | Consent needs response provenance and fail-closed alternate-channel handling |
| EF-17 changed route after direct repository evidence | Routing remains revisable until final reconciliation |

## Acceptance Criteria for PRD Maturity

- [ ] Manual batch 002 is completed against an independent submission.
- [ ] Batch-001 and batch-002 workflow deltas are documented.
- [ ] Every provisional requirement is marked stable, revised, rejected, or batch-specific.
- [ ] Synthetic/absent consent behavior is tested in at least two AI clients or host channels.
- [ ] Drop leaves no report or reason in repository history created by the intake workflow.
- [ ] Reconciliation prevents routing until the operator confirms the complete list.
- [ ] EF-25 through EF-29 are resolved before implementation begins.

## Dependencies

- [EF-18](../../docs/intake/batch-001/EF-18.md)
- [ARC-023](../../DECISIONS.md#arc-023--normative-controls-require-inline-enforcement-contracts)
- Manual external findings batch 002
- EF-25 through EF-29

## Open Questions for Batch 002

- Which report fields and frontmatter states remain useful across a second batch?
- When is clustering items into one consent question safe and who authorizes it?
- Where should deferred reports live between sessions?
- How should source-version and package-artifact provenance be represented?
- Which response provenance can each supported AI client expose reliably?
- Can redaction checks fail closed without persisting the sensitive match they rejected?