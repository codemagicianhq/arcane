---
title: Compliance Standards
audience: both
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [compliance, privacy, gdpr, ccpa, soc2, hipaa]
---

# Compliance Standards

A starting reference for the regulatory and privacy obligations a typical SaaS product runs into —
GDPR, CCPA, SOC 2, and HIPAA — mapped to the concrete artifacts a product actually needs (data
inventory, consent, retention/deletion, breach notification, access controls, audit logs), plus a
tiered guide for which frameworks plausibly apply at which stage.

**This is not legal advice.** It is a governance reference and a self-assessment starting point,
written at the level of established, uncontroversial obligations — not a substitute for a qualified
lawyer's analysis of a specific business's specific facts. Applicability determinations, especially
close calls, should be confirmed with counsel before being treated as settled.

## Executive Summary

- GDPR and CCPA both apply based on **whose data you handle and how**, not where your business is
  incorporated — a US-only company with EU visitors or California residents can still be in scope.
- Both frameworks converge on the same underlying artifacts regardless of which one applies: know what
  personal data you hold and why (a data inventory), get real consent before non-essential processing,
  define and enforce retention/deletion periods, and be able to act on a user's rights request within a
  bounded time.
- SOC 2 is an operational-controls attestation, not a privacy law — it becomes relevant when a customer
  (typically enterprise) requires it contractually, not from a regulatory trigger.
- HIPAA has a narrow trigger: it applies to covered entities and their business associates handling
  protected health information specifically. Most consumer SaaS products never trigger it.
- Treat this doc as a checklist of what to go verify, not as verification itself — every rule below
  names the artifact or evidence that would actually demonstrate compliance, not just the obligation in
  the abstract.

---

## Rule index

| ID | Rule (one line) |
|----|------|
| CS-01 | GDPR applies based on whose data is processed (EU residents) and what the processing does (offering goods/services, or monitoring behavior), regardless of where the business is based. |
| CS-02 | GDPR requires a documented lawful basis for every category of processing, and grants data subjects enforceable rights (access, rectification, erasure, portability, objection) with a response-time bound. |
| CS-03 | GDPR requires notifying the relevant supervisory authority of a qualifying personal-data breach within 72 hours of becoming aware of it. |
| CS-04 | CCPA/CPRA applies based on revenue/data-volume thresholds and California residency, and grants consumers rights to know, delete, correct, and opt out of sale/sharing of their personal information. |
| CS-05 | A CCPA-covered business must provide a clear opt-out mechanism for the sale/sharing of personal information, not just a general privacy policy. |
| CS-06 | Consent, where required by either framework, must be specific, informed, freely given, and distinguishable from other terms — pre-ticked boxes and bundled consent do not qualify. |
| CS-07 | A data inventory (what personal data exists, where, and why) is the prerequisite artifact every other obligation in this doc depends on — rights requests and retention policy are both unenforceable without it. |
| CS-08 | Data minimization requires a defined retention period per data category and actual deletion at the end of it — not merely marking a record inactive. |
| CS-09 | SOC 2 is a controls attestation against the Trust Services Criteria, not a privacy law — Security is mandatory, the other four criteria are opted into based on what a customer's contract or questionnaire actually requires; Type I attests to a point in time, Type II to operating effectiveness over a period. |
| CS-10 | SOC 2's Security criterion expects least-privilege access control, periodic access reviews, and audit logging of access to systems holding customer data. |
| CS-11 | HIPAA applies narrowly, to covered entities and their business associates handling protected health information — most consumer SaaS products never trigger it. |
| CS-12 | Which frameworks plausibly apply changes by product stage: a privacy policy and lawful-basis/consent groundwork are day-one MVP concerns if any EU or California user could sign up; a working data-subject-request process is a public-launch concern; SOC 2 readiness typically becomes an enterprise-sales-stage concern, not an earlier one. |

---

## GDPR

### CS-01: Applicability is about whose data and what processing, not where the business sits

The GDPR applies to any organization processing the personal data of individuals in the EU, when that
processing relates to offering goods or services to those individuals (paid or free) or to monitoring
their behavior — regardless of whether the organization itself has any EU presence. A US-only company
with EU visitors signing up for a free product is a plausible trigger; a company with zero EU users is
not, but "zero" needs to be an actual verified fact about the user base, not an assumption based on
where the company is headquartered.

**Rule (CS-01): Determine GDPR applicability from the actual or intended user base's location and what the processing does, never from the business's own location alone. Enforcement: explicitly advisory prose (ARC-023) — GDPR applicability turns on real-world facts about a specific business's actual user base and processing, a legal/business judgment call no Arcane mechanism observes or verifies.**

### CS-02: A lawful basis and enforceable data-subject rights

Every category of personal-data processing needs a documented lawful basis (consent, contract necessity,
legal obligation, legitimate interest, among others) — "we're processing it" is not itself a basis. Data
subjects additionally hold enforceable rights: access to their data, rectification of inaccuracies,
erasure ("right to be forgotten"), portability to another provider, and objection to certain processing.
Requests exercising these rights carry a response deadline (commonly one month, extendable in limited
cases) — a rights-request process that has no defined owner or turnaround time is itself a gap, even
before any request arrives.

**Rule (CS-02): Document a lawful basis per processing category, and maintain a working process — with a defined owner and turnaround time — for handling data-subject rights requests. Enforcement: explicitly advisory prose (ARC-023) — whether a lawful basis is properly documented and a rights-request process actually functions is a substantive judgment about the downstream product's own operations; `spell-compliance` can only ask and report on it, never verify or gate on it.**

### CS-03: 72-hour breach notification

A personal-data breach that risks the rights and freedoms of data subjects must be reported to the
relevant supervisory authority within 72 hours of the organization becoming aware of it. This clock
starts at awareness, not at confirmation of scope — an incident-response process that only begins
drafting a notification after a full investigation completes risks missing the window entirely.

**Rule (CS-03): Have a breach-notification process that can produce an initial report to the supervisory authority within 72 hours of awareness, even before the full scope of an incident is known. Enforcement: explicitly advisory prose (ARC-023) — whether an incident-response process would actually meet the 72-hour window in a real breach is a judgment call about the team's own readiness that no Arcane mechanism tests.**

---

## CCPA / CPRA

### CS-04: Threshold-based applicability and consumer rights

CCPA (as amended by CPRA) applies to for-profit businesses collecting California residents' personal
information that meet at least one threshold — commonly framed around annual revenue, the volume of
consumers'/households' data processed, or revenue from selling/sharing personal information (exact
thresholds are set in statute and updated periodically; verify current figures rather than treating any
number here as current). Covered businesses must honor consumer rights to know what's collected, delete
it, correct inaccuracies, and opt out of the sale or sharing of their personal information, plus limit
use of sensitive personal information on request.

**Rule (CS-04): Verify CCPA's current statutory thresholds against the business's actual revenue and data volume, rather than assuming applicability (or non-applicability) from the business's category alone. Enforcement: explicitly advisory prose (ARC-023) — confirming current statutory thresholds against a business's actual revenue and data volume is a legal/business determination outside anything Arcane can check itself.**

### CS-05: A real opt-out mechanism, not just a policy statement

A covered business must provide a clear, functioning mechanism for a consumer to opt out of the sale or
sharing of their personal information — commonly a "Do Not Sell or Share My Personal Information" link
or an equivalent global-privacy-control-honoring mechanism. Stating an opt-out right exists in a privacy
policy's prose, without a working mechanism a consumer can actually use, does not satisfy the
requirement.

**Rule (CS-05): Verify the opt-out mechanism itself functions end-to-end — a link that exists in the footer but doesn't actually stop the described sharing is not compliant, regardless of what the privacy policy says. Enforcement: explicitly advisory prose (ARC-023) — `spell-compliance`'s Phase 2 only checks whether an opt-out mechanism's indicators are present, not whether it actually stops sharing end-to-end, so confirming real function stays a human verification step.**

---

## Shared obligations (both frameworks)

### CS-06: Consent must be real, not assumed

Where either framework requires consent, it must be specific to the processing purpose, informed (the
person understands what they're agreeing to), freely given (not a condition of using an unrelated
feature), and distinguishable from other terms — not buried in a general terms-of-service acceptance.
Pre-ticked checkboxes, and consent bundled with acceptance of unrelated terms, do not qualify as valid
consent under either framework.

**Rule (CS-06): Any consent mechanism must be opt-in (not pre-ticked), specific to its actual purpose, and separable from acceptance of unrelated terms. Enforcement: explicitly advisory prose (ARC-023) — `spell-compliance` can render a PASS/FAIL/PARTIAL judgment on a consent mechanism in its report, but that report only surfaces a finding for a human to act on and never gates a workflow, so consent validity remains a judgment call.**

### CS-07: A data inventory is the load-bearing prerequisite

Honoring an access, deletion, or portability request requires first knowing what personal data exists,
where it lives, and why it was collected. Without a maintained data inventory (sometimes called a
Records of Processing Activities under GDPR Article 30), every downstream rights-request and retention
obligation is unenforceable in practice, even if a policy document claims it's honored — there is no way
to actually locate everything that would need to be produced, corrected, or deleted.

**Rule (CS-07): Maintain a data inventory naming what personal data is collected, where it's stored, and why, before treating any rights-request or retention process as operational. Enforcement: explicitly advisory prose (ARC-023) — `spell-compliance` can surface whether a data-inventory document exists, but it neither verifies the inventory's accuracy nor blocks any workflow on its presence, leaving completeness a human-verified judgment call.**

### CS-08: Retention periods must be defined and actually enforced

Data minimization requires defining how long each category of personal data is kept and why, then
actually deleting it at the end of that period — not simply flagging a record as inactive or archived
while the underlying data persists indefinitely. An undefined retention period is itself a gap, distinct
from and prior to the question of whether deletion is correctly implemented.

**Rule (CS-08): Define a retention period per data category, and verify deletion is real (data is actually removed, not merely deactivated) at the end of that period. Enforcement: explicitly advisory prose (ARC-023) — whether deletion is actually real rather than merely deactivated requires inspecting the downstream product's live data stores, which is outside anything Arcane's static, read-only self-assessment observes.**

---

## SOC 2

### CS-09: A controls attestation, not a privacy law — and Type I vs. Type II matters

SOC 2 is an attestation against the AICPA's Trust Services Criteria, produced by an independent auditor
— it has no regulatory trigger of its own and becomes relevant when a customer's contract or security
questionnaire requires it, typically at the enterprise sales stage. The Security criterion is mandatory
for any SOC 2 report; Availability, Processing Integrity, Confidentiality, and Privacy are each opted
into based on what's actually being attested to. A **Type I** report attests that controls were
suitably designed at a single point in time; a **Type II** report attests that those controls actually
operated effectively over an observation period (commonly 3-12 months) — a Type I report does not
substitute for a Type II when a customer's requirement specifically calls for one.

**Rule (CS-09): Confirm which Trust Services Criteria and which report type (I vs. II) a customer's actual requirement calls for before scoping a SOC 2 engagement — do not assume Security-only Type I satisfies a requirement that wasn't explicitly checked against what was asked for. Enforcement: explicitly advisory prose (ARC-023) — what a specific customer or auditor actually requires is an external fact no Arcane mechanism observes, so confirming it against a live requirement is inherently a human step.**

### CS-10: Access control and audit logging are the operational backbone

SOC 2's Security criterion expects least-privilege access to systems holding customer data, periodic
review of who has access to what (not just at onboarding), and audit logging of access to
sensitive systems sufficient to reconstruct who did what and when. These are the same operational
controls a real security program needs regardless of whether a SOC 2 report is ever pursued — building
them only when an audit is scheduled means starting the evidentiary trail late.

**Rule (CS-10): Implement least-privilege access control, periodic access review, and audit logging of access to customer-data-holding systems as an ongoing practice, not as audit-time preparation. Enforcement: explicitly advisory prose (ARC-023) — this doc states the obligation and points to `threat-model.md`/`hardening-checklist.md` for the control detail without restating or itself verifying it, so no executable check or platform-policy verification is wired to this rule here.**

---

## HIPAA

### CS-11: A narrow trigger — covered entities and business associates handling PHI

HIPAA applies to covered entities (health plans, healthcare clearinghouses, healthcare providers that
transmit health information electronically) and their business associates — vendors that create,
receive, maintain, or transmit protected health information (PHI) on a covered entity's behalf. A
typical consumer SaaS product with no health-data handling does not trigger HIPAA merely by having
users who happen to be patients elsewhere; the trigger is the product's own handling of PHI, not its
users' medical status in general.

**Rule (CS-11): Confirm HIPAA applicability specifically against whether the product creates, receives, maintains, or transmits PHI as a covered entity or business associate — do not assume applicability (or safety from it) based on the target market alone. Enforcement: explicitly advisory prose (ARC-023) — whether a product actually creates, receives, maintains, or transmits PHI is a factual/legal determination about that specific product that no Arcane mechanism observes.**

---

## Tiered applicability guide

### CS-12: What plausibly applies at which stage

- **Early MVP:** if the product could realistically have any EU visitor or California resident sign up —
  which is the default for anything reachable on the open internet — a privacy policy and a documented
  lawful basis/consent approach are day-one concerns, not deferred ones. Waiting until "we have real
  users" to start is waiting until the obligation is already live.
- **Public launch:** a working data-subject-request process (someone owns it, there's a defined
  turnaround) and a real, functioning consent/opt-out mechanism move from "nice to have documented" to
  "will actually be exercised by a real person" — this is the stage where CS-02, CS-05, CS-06, and CS-07
  need to be operational, not just written down.
- **Enterprise sales stage:** SOC 2 readiness (CS-09, CS-10) typically becomes relevant when a customer's
  procurement or security-questionnaire process asks for it — building the access-control and logging
  practices in CS-10 well before an audit is scheduled makes the eventual Type II observation period
  starts from real evidence rather than a scramble. HIPAA (CS-11) becomes relevant only if the business
  is entering healthcare specifically, at whatever stage that happens.

**Rule (CS-12): Use product stage as a prompt to re-check applicability, not as a substitute for checking it — a pre-launch product with EU beta users is already in GDPR's scope regardless of stage. Enforcement: explicitly advisory prose (ARC-023) — using product stage as a prompt to re-check applicability is itself guidance about when to apply judgment, not a mechanically checkable condition.**

## Related

- [[.arcane/governance/threat-model|Threat Model]] and
  [[.arcane/governance/hardening-checklist|Hardening Checklist]] — the security-control side of SOC 2 and
  breach-notification readiness overlaps with these existing docs; this doc doesn't restate their
  content.
- `spell-compliance` — the runnable self-assessment that cites these rules by ID.
