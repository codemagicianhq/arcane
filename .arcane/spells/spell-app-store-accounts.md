---
name: Spell — App Store Accounts
description: Enroll a new business or product in the Apple Developer Program and Google Play Console — Organization vs Individual, the D-U-N-S prerequisite, verification documents, fees, realistic timelines, and post-approval hardening. Stops at approved, hardened accounts; shipping builds is spell-eas-store-deploy's job.
tagline: Open Apple and Google Play developer accounts
claude_description: Use PROACTIVELY when a new venture or product needs an Apple Developer Program or Google Play Console developer account created, before any app can be built for the stores.
argument-hint: Which store(s) to enroll in (apple, google, or both), who is enrolling (a legal entity or an individual), and any deadline by which the accounts must be active
agent: agent
---

## Executive Summary

- This spell takes a founder from "we need store accounts" to **two approved, hardened developer
  accounts** — one in the Apple Developer Program, one in Google Play Console — for a new business or
  product. It is written at the level of *what you need, why it exists, and how long to budget*, not
  as a click-by-click walkthrough: the consoles change their screens often; the requirements rarely.
- **Account creation only.** It ends when both accounts are approved, paid for, and hardened. Creating
  an app record, certificates, builds, listings, and submissions belongs to `spell-eas-store-deploy`.
- **The two stores are independent enrollments.** Different accounts, different verifiers, different
  fees, different timelines. Track them as two separate checklists from day one; never let one
  store's "approved" stand in for the other's.
- **Timeline is the point.** An Organization enrollment with Apple routinely takes two to four weeks
  end to end because an external party (Dun & Bradstreet) sits in the critical path and Apple's
  verification does not always announce its next step. Google is usually faster but has its own
  verification tasks and deadlines. Start both well before any launch date.
- **Privacy rail.** This process handles government ID, formation documents, ownership percentages
  and revenue figures. Those are entered by the operator, directly into the store's or Dun &
  Bradstreet's own forms — never pasted into an AI session, a repository, or a shared document.

**Facts last verified: 2026-10-27**, against Apple's and Google's own support pages (linked inline).
Fees, document lists, deadlines and verification programs change. When this date is more than about
six months old, re-check every figure below against the live page before quoting it to an operator,
and update this line.

---

## Placeholders

| Placeholder | What it is | Resolution rule |
| --- | --- | --- |
| `{LLC_NAME}` | The exact legal entity name that will own the accounts (Organization enrollment only). | Resolve from the project's own context (`project.md`, a venture's `legal.md`, `.arcane.json`); if unset, **ask** — and ask for it as it appears on the tax registration, punctuation included. |
| `{BUSINESS_NAME}` | The public-facing brand or product name (the "developer name" the stores display). | Resolve from the project's README or PRD frontmatter; if unset, ask. It may differ from `{LLC_NAME}`. |
| `{OPERATOR_DOMAIN}` | The domain the business owns and uses for its website and work email. | Ask if unset. Both stores tie an Organization account to a domain the entity controls. |

Never assume any of these. A wrong legal name here does not produce a local mistake — it produces a
failed verification weeks later.

## Context files

- `project.md` / `.arcane.json` — business context: who is enrolling, whether a legal entity exists,
  any deadline. If missing, ask.
- A venture's `legal.md`, if the hub created one with `spell-summon-venture` — the entity's legal
  checklist usually already records the formation state, the registered name and whether a D-U-N-S
  exists. If missing, proceed from the operator's answers.
- [governance/mobile-release-standards.md](../../.arcane/governance/mobile-release-standards.md) —
  `MR-11` (the Google Play public developer address is sourced from D-U-N-S and locks in on
  confirmation) is cited by ID in Step 2. **If the file is not installed**, this spell still runs in
  full — cite it as `MR-11 (rationale unavailable — install the standards doc)`.

This spell reads nothing else, and it works in a repo with no Arcane context files at all: every
input it needs can be answered by the operator in a few sentences.

---

## Step 0 — Decide the enrollment type, per store

Resolve this first; it determines everything that follows, and in practice it is not reversible
without starting over.

### Apple Developer Program: Organization vs Individual

| Enroll as | When it applies | What Apple requires that the other type does not |
| --- | --- | --- |
| **Organization** | A legal entity (corporation, LLC, limited partnership or equivalent) will own the apps and the contract with Apple. | A D-U-N-S Number registered to that exact legal entity; a signer with authority to bind it; a work email on the entity's domain; a publicly reachable website on that domain. The entity's legal name becomes the public seller name. |
| **Individual** | A natural person owns the apps. Sole proprietors, DBAs, trade names and branches enroll here — Apple does not accept them as organizations. | Only the person's own legal name, address and payment card. The person's legal name becomes the public seller name. |

Apple's statement of these rules: <https://developer.apple.com/support/enrollment/> and
<https://developer.apple.com/support/D-U-N-S/>.

### Google Play Console: Organization vs Personal

| Register as | When it applies | What Google requires that the other type does not |
| --- | --- | --- |
| **Organization** | A legal entity owns the apps — and **mandatory** for some app categories regardless of preference: financial services, health and medical, apps using the VPN service class, and government apps. | A D-U-N-S Number; organization name and address (taken from the linked Google Payments profile and required to match the Dun & Bradstreet record); an organization phone number and website; a verified developer phone number shown on the public profile. |
| **Personal** | A natural person owns the apps. | Identity verification of the person; and, for personal accounts created after 2023-11-13, a **closed test with at least 12 testers opted in for 14 consecutive days** before the account may publish to production. |

Google's statements: <https://support.google.com/googleplay/android-developer/answer/13628312>
(account details and verification), <https://support.google.com/googleplay/android-developer/answer/10788890>
(which services must register as an Organization), and
<https://support.google.com/googleplay/android-developer/answer/14151465> (the closed-testing rule).

Google's documentation does not describe converting a Personal account into an Organization account
or back. Treat the choice as permanent for planning purposes; if the business will ever hold the
apps, register the Organization from the start.

### Record the decision

Write both choices down in the enrollment tracker (template in **Output**) before touching either
console, with the one-line reason for each.

---

## Step 1 — Gather what both stores will ask for

Collect everything below **before** starting either enrollment, so neither verification stalls on a
missing document. Each row says why the store wants it; the "why" is what tells you whether a
substitute will be accepted.

| You need | Why it exists | Notes |
| --- | --- | --- |
| **The exact legal entity name** (Organization only) | Both stores verify the entity against third-party records — Apple against Dun & Bradstreet, Google against Dun & Bradstreet and the Google Payments profile. A name that differs by a character fails the match. | Copy it from the tax registration or the state filing, **punctuation included**: "Example Co LLC" and "Example Co, LLC" are two different names to a verifier. Use the same spelling in the tax records, the state registration, the D-U-N-S record, both stores, and the Payments profile. |
| **A D-U-N-S Number** (Organization only) | The nine-digit business identifier Dun & Bradstreet issues; both stores use it to confirm the entity exists and has legal-entity status. | Free. Step 2 covers obtaining or correcting one; it is the longest external dependency. |
| **A dedicated store account per store** — an Apple Account and a Google Account | The enrolling account becomes the account holder of record; everything (billing, agreements, team membership) hangs off it. | Use a mailbox on `{OPERATOR_DOMAIN}` that the business controls, not a personal address. Apple requires two-factor authentication on the Apple Account before enrollment can start. |
| **A work email on the entity's domain** (Organization only) | Apple verifies that the signer belongs to the organization through the domain. | Create it before enrolling. |
| **A publicly reachable website on that domain** | Apple requires a functional public site tied to the organization's domain; Google asks for the organization's website and offers to verify ownership of it. | A parked domain with minimal content does not satisfy Apple. A short real page about the business does. |
| **A signer with authority to bind the entity** (Apple Organization) | Apple needs someone who can legally accept the Program License Agreement for the entity: an owner or founder, an executive, a senior project lead, or an employee granted that authority. | If the signer is not the owner or founder, Apple asks for a reference who can confirm their authority — have that person's name and contact ready and warn them they may be called. |
| **Government photo ID** of the enrolling person | Both stores verify the natural person behind the account. | A current passport or driver's license, front and back, in the same legal name used everywhere else. |
| **Formation documents / state filing** (Organization) | Proof that the legal entity exists and who controls it. | The articles or certificate of formation, plus the most recent state annual filing that lists the current managers, members or officers. Google's accepted-document list names a state-issued certificate of business registration. Apple may ask for notarized true copies. |
| **An employment-verification letter** (Apple Organization, when asked) | Apple confirms the signer's relationship to the entity. A sole owner has no employer to write one. | A sole owner writes and signs it themselves, on the entity's letterhead, stating their title and that they have authority to bind the entity. This is routine, not a workaround. |
| **Phone numbers that answer** | Both stores verify phone numbers with one-time codes and may call; Google keeps the organization phone on file and the developer phone on the public profile. | Decide which number is public before entering it. |
| **A payment card in the enroller's own name** | Apple delays enrollment and requests photo ID when the card belongs to someone else. Google requires a valid card for the fee and may use it in identity checks. | Not a prepaid card for Google. |
| **A Google Payments profile** in the legal name and address | Google reads the legal name and address from it and requires them to match the D-U-N-S record. | Create or correct it before registering; a mismatch later triggers a "no longer verified" banner and a deadline. |

Nothing in this table is typed into the AI session. The operator gathers it privately; the spell only
confirms each row is **ready** or **missing**.

---

## Step 2 — D-U-N-S (Organization enrollments, both stores)

A D-U-N-S Number is a free, nine-digit identifier that Dun & Bradstreet assigns to a business
location. Apple and Google both treat it as the authoritative proof that an entity exists, has legal
status (not a sole proprietorship or trade name), and sits at a given address. One number serves both
stores.

1. **Look it up first.** Dun & Bradstreet may already have assigned one. Apple's enrollment flow
   hands off to a D&B lookup (reachable from <https://developer.apple.com/enroll/> and from Apple's
   D-U-N-S support page); searching by legal name and address either returns the existing number or
   offers to request a new one.
2. **If none exists, request one through that same handoff.** D&B then sends a Business Information
   Report questionnaire (dozens of fields: general information, operations, history, finance). It asks
   for ownership percentages, revenue, headcount and personal contact details. **The operator completes
   it privately and returns it directly to D&B** — not in an AI chat, not in a repository, not in a
   shared document. The spell's only job here is to note "questionnaire returned on YYYY-MM-DD" in the
   tracker.
3. **Budget the wait.** Apple's page says to allow up to 5 business days for D&B to issue the
   number and that expediting does not shorten it; after that, allow up to 2 more business days for
   Apple to receive the record from D&B before enrolling. If more than two weeks pass, email D&B.
   D&B may phone to verify the business; an unanswered call can stall or decline the request, so keep
   the phone number you gave them answered.
4. **If a number already exists, check what is on file.** The name and address on the D&B record are
   what both stores will display and verify against. Google in particular publishes the developer
   address from the D-U-N-S record and offers only "confirm" or "contact D&B" — confirming first locks
   in whatever is there (`MR-11`). Correct the record at D&B **before** enrolling, and expect
   propagation to take days to weeks. A D&B record update request can itself be declined if D&B cannot
   reach the business at the new address, so answer their call.
5. **Name discipline.** The legal name you give D&B must be character-for-character the name on the
   tax registration and the state filing. This is the single most common cause of a verification that
   fails weeks later with no obvious error.

Apple's own statement of the timings: <https://developer.apple.com/support/D-U-N-S/>. The D-U-N-S
Number itself is business data, not a secret, but it is an identifier: keep it in the venture's private
records, never in a public repository or a spell.

---

## Step 3 — Apple Developer Program

Entry point: <https://developer.apple.com/enroll/>. Enrollment is also available through the Apple
Developer app on an iPhone or iPad (in some regions, only there), where the membership is an annual
auto-renewing subscription instead of a yearly purchase.

### What the enrollment asks for

1. Sign in with the dedicated Apple Account from Step 1 (two-factor authentication on; first and last
   name fields hold the signer's **legal** name — an alias or company name there delays approval).
2. Choose the entity type decided in Step 0.
3. Organization: enter `{LLC_NAME}`, the D-U-N-S Number, the entity's address, the signer's title and
   a work email on `{OPERATOR_DOMAIN}`, and the website. Apple pre-fills some fields from the D&B
   record — read them rather than accepting them: the pre-filled address is whatever the D-U-N-S
   requester gave D&B, which is not always the entity's registered address. The address Apple holds
   here is the contract address; the public listing address is configured separately later, so choose
   the one that matches the entity's records.
4. Individual: enter the person's legal name, address (no P.O. box) and phone.
5. Accept the agreement. Apple issues an **Enrollment ID** — record it in the tracker; every later
   contact with Apple Developer Support needs it.

### Verification

Apple Developer Support verifies the information before you can pay. For organizations this is a
human review, and it may produce a request for documents through a secure upload link: the signer's
government photo ID, the formation documents and latest state filing, and proof of the signer's
authority (the employment-verification letter from Step 1, self-signed by a sole owner). Notarized
copies may be requested. Once uploaded, Apple typically commits to a next step within about two
business days.

**Apple does not always send the next email.** Enrollments have sat for nearly two weeks with no
message because the document request was never sent, and the account page showing "pending" is not
evidence anyone is working on it. **If about five business days pass with no update, call Apple
Developer Support with the Enrollment ID** rather than waiting. Phone contact has produced the missing
document request on the spot; silence has not. Apple's contact options:
<https://developer.apple.com/contact/>.

### Fee and activation

- **99 USD per membership year**, shown in local currency where Apple prices locally. Nonprofits,
  accredited educational institutions and government entities may request a fee waiver. Source:
  <https://developer.apple.com/programs/enroll/>.
- **Payment is prompted only after verification succeeds.** Apple emails that the enrollment is
  verified and the membership can be purchased; nothing is charged before that. Pay with a card in the
  signer's own name.
- Membership confirmation normally arrives within 24 hours of purchase. If it does not, contact Apple
  with the Enrollment ID.
- Calendar the renewal date now. A lapsed membership removes the apps from sale.

---

## Step 4 — Google Play Console

Entry point: <https://play.google.com/console/signup>.

### What the registration asks for

1. Sign in with the dedicated Google Account from Step 1 and link (or create) a Google Payments
   profile whose legal name and address exactly match the D-U-N-S record for an Organization, or the
   person's ID for a Personal account.
2. Choose the account type decided in Step 0.
3. Enter the public **developer name** (`{BUSINESS_NAME}`; it can differ from the legal name and can
   be changed later), the contact email and phone Google uses to reach you, the developer email (and,
   for an Organization, the developer phone) shown on the public profile, and — for an Organization —
   the D-U-N-S Number, organization phone and website.
4. Accept the Developer Distribution Agreement and pay the fee. **Unlike Apple, Google charges before
   verification**, and the fee is not refunded if the identity information is judged invalid — one more
   reason to finish Step 1 first.

### Fee

**25 USD, one time, per account.** No renewal. Prepaid cards are not accepted. Source:
<https://support.google.com/googleplay/android-developer/answer/6112435>.

### Verification tasks

After payment the console lists verification tasks; nothing can be published until they are done,
and some unlock only after others complete. Expect, in roughly this order:

- **Contact details** — the contact email, contact phone and developer email (and developer phone
  for an Organization) are each confirmed with a one-time code. They must keep working for the life of
  the account; Google uses them for policy notices with deadlines.
- **Identity** — upload the enrolling person's government photo ID. Do this first; it has the longest
  review queue.
- **Organization** (Organization accounts) — D-U-N-S match plus a registration document, typically
  the state-issued certificate of business registration or the latest state filing showing the
  current address. Google may also use the organization phone number to verify.
- **Website** — proven through Google Search Console domain verification. A DNS TXT record is the
  method to prefer: it needs no site changes and works before the site is finished. Some registrars
  offer a one-click connector that writes the record for you.
- **Phone numbers** — unlock only after identity and organization documents are approved; Google
  states this explicitly, so a greyed-out phone task is not a defect.
- **Payment method** (only if the account will sell anything) — a small deposit challenge or bank
  documents, which Google says can take up to five days.
- **Android device** — the account owner confirms access to an Android device through the Play
  Console mobile app before publishing.

With every document from Step 1 ready, all of these have been completed in a single day; without
them, each becomes its own wait. Budget a week regardless.

### Standing obligations

- The legal name and address in the Payments profile must keep matching the Dun & Bradstreet record.
  When they drift, the console shows an "organization name or address is no longer verified" banner
  with a deadline; missing it restricts the account and removes its apps from Google Play.
- Personal accounts created after 2023-11-13 must pass the 12-tester, 14-day closed test before
  production access is granted — that is a launch-timeline item, not a formality. Organization
  accounts do not carry this requirement.
- Google has been widening developer identity verification since 2023, including a program announced
  in 2025 to extend it to apps distributed outside Google Play. Re-check the current scope at
  <https://support.google.com/googleplay/android-developer/answer/13628312> when the "last verified"
  date above is stale.

---

## Step 5 — Timeline

Plan the enrollments as two parallel tracks that share only Steps 1 and 2. Figures are planning
budgets, not promises; the stores publish few hard numbers.

| Phase | Budget | Driven by |
| --- | --- | --- |
| Gather documents, create accounts, build the website page (Step 1) | 1–3 days | The operator |
| D-U-N-S issuance or correction (Step 2) | 5 business days issuance + 2 for Apple to receive; up to 2 weeks before escalating; days to weeks for an address correction to propagate | Dun & Bradstreet |
| Apple verification, including a document request (Step 3) | 1–2 weeks when Apple is responsive; longer when nobody calls | Apple Developer Support |
| Apple payment and activation | Same day to 24 hours | Apple |
| Google registration and verification tasks (Step 4) | Same day to 1 week; payment-method verification up to 5 days | Google |
| Post-approval hardening (Step 6) | Half a day | The operator |

**Rules of thumb**

- An Apple Organization enrollment from zero (no D-U-N-S yet) realistically takes **two to four
  weeks**. Google from zero takes **a few days to a week**.
- Start at least **one week earlier than the earliest date the accounts must be active** — and that
  week is a buffer on top of the budgets above, not the budget itself. The first time a deadline is
  missed is usually because the D&B wait was discovered during enrollment rather than before it.
- Not every blocker can be resolved in a session. When the next step is "wait for D&B" or "wait for
  Apple", record the date in the tracker, set a reminder for the escalation point, and stop — do not
  look for workarounds.

---

## Step 6 — Post-approval hardening

Do this the day each account is approved, before anyone builds against it.

- [ ] **Two-factor authentication** on every account that can reach the stores: the Apple Account,
      the Google Account, and the mailbox on `{OPERATOR_DOMAIN}` that both accounts recover through.
      Recovery phone numbers and backup codes belong to the business, not to one person's personal
      devices only.
- [ ] **Account holder succession.** Both stores hang the whole account off the enrolling identity.
      Record who the account holder / account owner is and how a co-founder regains access if that
      person is unavailable — in the venture's private records, not in a repository.
- [ ] **Team roles, least privilege.** Apple: add teammates by role (Admin, App Manager, Developer,
      Marketing, Finance) rather than sharing the account holder's sign-in; the Account Holder role
      stays with the signer. Google: add users to the developer account with per-app or account-level
      permissions; keep the owner role to one business-controlled account. Nobody shares credentials
      for either store.
- [ ] **Certificate and key governance.** Decide, before the first build, who may create a
      distribution certificate, an App Store Connect API key, or a Google Play service-account key;
      where those secrets live (a secrets manager, never a repository or a chat); and when they rotate.
      `spell-eas-store-deploy` assumes these decisions are already made.
- [ ] **Public-facing data check.** Confirm the seller name, the public developer email and (Google)
      the public developer address are the ones you intend to publish — they are now live on the
      store even before any app is.
- [ ] **Calendar the recurring obligations:** Apple's annual renewal; Google's verification-deadline
      notices (watch the contact email); the D-U-N-S record whenever the entity's address or name
      changes, since both stores re-verify against it.
- [ ] **Close the tracker:** approval dates, Enrollment ID, the account holder, where the private
      records live. Then hand off to `spell-eas-store-deploy`.

---

## Output

The spell produces one **enrollment tracker**, kept in the venture's private operations records
(never in a public repository), with the two stores as independent sections:

```markdown
## Store developer accounts — {BUSINESS_NAME}

**Enrolling as:** Apple: Organization | Individual — <reason>. Google: Organization | Personal — <reason>.
**Deadline the accounts must be active by:** YYYY-MM-DD (buffer applied: start by YYYY-MM-DD)

### Shared prerequisites
- [ ] Legal entity name confirmed against tax registration and state filing (punctuation included)
- [ ] D-U-N-S: existing / requested YYYY-MM-DD / issued YYYY-MM-DD; record checked (name, address)
- [ ] Dedicated store accounts created; 2FA on
- [ ] Website live on the entity's domain; work email on the domain
- [ ] Documents ready: photo ID, formation docs + latest state filing, authority letter

### Apple Developer Program
- [ ] Enrollment submitted YYYY-MM-DD — Enrollment ID recorded privately
- [ ] Document request received / uploaded YYYY-MM-DD
- [ ] Escalation date (5 business days of silence): YYYY-MM-DD — called: yes/no
- [ ] Verified; fee paid YYYY-MM-DD; renewal calendared
- [ ] Hardened (Step 6)

### Google Play Console
- [ ] Registered and fee paid YYYY-MM-DD
- [ ] Verification tasks: contact details / identity / organization / website / phone / payment method / device
- [ ] Hardened (Step 6)

### Needs you
- <the one operator action currently blocking either track>
```

### Acceptance checklist

The spell did its job when:

- Both store sections of the tracker read "approved", with dates, and the two were never merged into
  one status.
- The legal entity name is identical across the tax registration, the state filing, the D-U-N-S
  record, both store accounts and the Google Payments profile.
- Every Step 6 box is checked, and the account holder succession is written down somewhere private.
- No identifier from the process — D-U-N-S Number, Enrollment ID, support case number, ID document,
  revenue figure — appears in the repository, in this spell, or in the session transcript.

### Reporting

End every run with a short report. The steps only the operator can take — filling in the D&B
questionnaire, uploading documents, paying a fee, phoning Apple — are required operator actions:

<!-- fragment:needs-you:start -->
**Needs you — required operator actions.** When this run leaves an action that only the operator can take, and the work is not correct or complete until it is taken, report it in one block at the very top of the final report, before every other section and before any optional next step:

```markdown
## ⚠ Needs you

- <exactly what to do: the command, the link, or the question> — <why the agent cannot do it itself>
```

- **What belongs in it:** an action the work needs that only the operator can take — approving or merging a pull request, accepting a decision record, answering a question the work is waiting on, confirming a `guarded` push, running an interactive command such as `spell unblock-push`, or a step on an external platform the agent cannot reach. An optional suggestion, a next spell to run, or anything the agent could do itself is not a required action and stays out of the block.
- **One line per action.** Say exactly what to do, then, after the dash, why the agent cannot do it. Write the command, link or question out in full; never point elsewhere with "see above".
- **Never only among optional steps.** An action required for correctness is never listed only under next steps, suggestions, `Carry Forward` or `What's Next?`. It may be repeated there, but it always appears in this block.
- **Omit it when empty.** When nothing needs the operator, leave the block out entirely: no heading and no "None" line.
- **Every final report.** The block belongs in whatever report ends the run, including a report written when the spell stops early.
- Enforcement: explicitly advisory prose (ARC-023) — no check reads a spell's actual output for this block; it holds by these instructions alone.
<!-- fragment:needs-you:end -->

---

## Rules

- **The operator drives the browser.** The spell never signs in to a store, never enters a payment
  method, and never fills in an identity or questionnaire form. It prepares, tracks and reminds.
- **Sensitive data stays out of the session.** Do not ask the operator to paste ID details,
  ownership percentages, revenue, the D&B questionnaire, or support correspondence into the chat; do
  not write identifiers (D-U-N-S Number, Enrollment ID, case numbers) into any repository file. The
  tracker records *that* a step happened and *when*, not the data it carried.
- **Validate before starting.** Refuse to proceed past Step 0 until the entity type, the exact legal
  name (or the individual's legal name) and the deadline are known. Refuse to start an Organization
  enrollment for an entity that is not a legal entity — a DBA or trade name — and explain why.
- **Verify the facts against the live source when the "last verified" date is stale.** Fees and
  verification rules are quoted here as of that date; where this spell and the store's own page
  disagree, the store's page wins, and this spell gets updated.
- **Two trackers, not one.** Never report a single "store accounts: done". Each store's status is
  stated on its own.
- **Stop cleanly on external waits.** When the critical path is D&B or Apple, record the date and
  the escalation point and end the run; do not improvise alternatives to the wait.
- **Out of scope:** app records, bundle identifiers, certificates, provisioning, builds, listings,
  submissions, and anything after the account is hardened. Point to `spell-eas-store-deploy`.

## Related

- **Feeds into:** `spell-eas-store-deploy.md` — it begins with "confirm Apple Developer Program
  enrollment is active" and "create the Google Play Console app listing", which is exactly where this
  spell ends.
- **Consumes from:** `spell-summon-venture.md` — a venture's `legal.md`, when one exists, is where
  the legal-entity facts this spell needs are first recorded.
- [Mobile Release Standards](../../.arcane/governance/mobile-release-standards.md) — `MR-11`, the
  D-U-N-S-sourced public address.
