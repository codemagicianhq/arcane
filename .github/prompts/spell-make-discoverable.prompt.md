---
name: Spell — Make Discoverable
description: Audit and fix a web property's search and AI-assistant discoverability — per-route share metadata, robots and sitemap policy, non-production noindexing, and search-engine registration. Read-only by default.
claude_description: Use PROACTIVELY when auditing a web property's search/AI-assistant discoverability (metadata, robots, sitemap, indexing).
argument-hint: Optional path or origin of the property to audit (defaults to the repository root). Add --apply only after reviewing a dry run.
agent: agent
---

## Executive Summary

- This spell audits a web property's discoverability to search engines and, by
  extension, to the AI assistants that retrieve from those engines' indexes —
  per-route share metadata, robots/sitemap policy, non-production noindexing,
  and search-engine registration — then proposes fixes.
- **The default run changes nothing.** It produces an audit and a proposed
  change set, and stops at an explicit approval gate. Nothing is written
  without `--apply` *and* that approval.
- **It never performs an outward-facing action on its own** — a DNS write, a
  console submission, a crawl-notification ping. Every such action is
  confirmed individually, with the current live state printed first, never
  batched and never assumed from a prior run.
- **It verifies by content, never by confirmation.** Every claimed fix is
  checked by re-fetching the actual served response or re-reading the actual
  external state, per `EV-01`/`EV-02`.
- **This spell audits a property that is already live.** It does not deploy
  one — run it after your team's own deploy/ship workflow has put something
  live at `{SITE_ORIGIN}`, not instead of it.

---

## Placeholders

Every placeholder below follows the same resolution rule: pull it from
`.arcane.json`, the invoking frontmatter, or the repository's own existing
config; if it is not resolvable from any of those, **ask** — never assume.
A wrong guess in this spell is not a local mistake, it is published to the
public internet.

| Placeholder | What it is | Resolution rule |
| --- | --- | --- |
| `{SITE_ORIGIN}` | The production origin (scheme + host) of the property being audited. | Resolve from `.arcane.json` / frontmatter / the repo's own deploy config; if unset, ask — never assume, a wrong guess here is published to the public internet. |
| `{SERVING_LAYER}` | The component that already serves the built app's HTML responses (a static host, an edge/SSR function, a CDN in front of the origin). | Resolve from `.arcane.json` / frontmatter / the repo's own build-and-deploy config; if unset, ask rather than assuming a serving layer that isn't actually there. |
| `{ENV_SIGNAL}` | The repo's own existing signal for which environment a given request is running in (an env var, a build-time flag, a hostname pattern) — used to gate non-production noindexing. | Resolve from `.arcane.json` / frontmatter / the repo's own config; if unset, ask — guessing wrong here either noindexes production or leaves staging indexable. |
| `{PUBLIC_ASSET_PREFIX}` | The path prefix or origin that serves publicly-fetchable static/share assets (e.g. share-card images) without authentication. | Resolve from `.arcane.json` / frontmatter / the repo's own asset/storage config; if unset, ask. |
| `{RESTRICTED_PREFIX}` | The path prefix for admin, internal, or otherwise non-public routes that must never be indexable or listed in a sitemap. | Resolve from `.arcane.json` / frontmatter / the repo's own routing config; if unset, ask. |
| `{NONPROD_ORIGINS}` | The staging, preview, and development origins for this property that must never be indexed. | Resolve from `.arcane.json` / frontmatter / the repo's own deploy config; if unset, ask — never assume a short list you found is exhaustive. |
| `{DNS_ZONE}` | The DNS zone that holds, or will hold, this property's domain-ownership verification record for search-engine registration. | Resolve from `.arcane.json` / frontmatter / the repo's own infrastructure config; if unset, ask — never assume (see `EV-05`). |
| `{PUBLIC_VISIBILITY_PREDICATE}` | The app's own existing rule for what counts as publicly listed/indexable content, as distinct from private, draft, or restricted content. | Resolve from `.arcane.json` / frontmatter / the app's own existing authorization or visibility logic; if unset, ask — never invent a visibility rule the app doesn't already enforce. |

## Context files

- [governance/web-discoverability-standards.md](../../.arcane/governance/web-discoverability-standards.md) —
  every `WD-nn` rule this spell checks against. Rules are **cited by ID
  only** in this spell, never restated. **If the file is not installed**,
  this spell still runs in full — findings just cite each check as
  `WD-nn (rationale unavailable — install the standards doc)` instead of
  linking to it.
- [governance/external-verification-standards.md](../../.arcane/governance/external-verification-standards.md) —
  every `EV-nn` rule the Verify phase (and the outward-facing-action gating
  in Phase 4b) checks against, cited by ID only. **If the file is not
  installed**, this spell still runs, and Phase 5 still re-fetches and
  re-reads rather than trusting a write's own success signal — it just
  cites those checks as `EV-nn (rationale unavailable — install the
  standards doc)` instead of linking to it.
- An existing decisions or architecture doc, if one is present (e.g.
  `DECISIONS.md` or an equivalent) — check it for any prior decision that
  already governs this property's discoverability approach before proposing
  something that would conflict with it. **If none is present**, proceed
  without it and note in Phase 6 that no prior decision was found.

## Preconditions

Stop and report, without changing anything, if any of these fail:

1. **`{SITE_ORIGIN}` resolves**, per the Placeholders rule above, or the
   operator supplies it when asked. If it cannot be resolved and the
   operator does not answer, stop before Phase 1.
2. **At least one HTTP(S) response is actually reachable at
   `{SITE_ORIGIN}`.** This spell audits a property that is already live; if
   nothing responds, stop and report that a deploy needs to happen first
   (see Related) rather than auditing an empty origin.
3. **`--apply` never substitutes for approval.** If `--apply` is passed up
   front, the explicit approval gate in Phase 3 still applies in full before
   Phase 4 runs anything.

## Phase 1 — Inventory (always read-only)

Enumerate the current state before proposing anything to change. Do not
judge it yet — just record what is actually there, for `{SITE_ORIGIN}` and
for each of `{NONPROD_ORIGINS}`:

- **Per-route metadata**, sampled across a small set of distinct route
  types (not just the homepage): `<title>`, meta description, canonical
  link, Open Graph / social-card tags, and any structured-data block —
  fetched with a plain HTTP client that does not execute JavaScript.
- **`robots.txt`** — full raw contents, and whether it exists at all.
- **`sitemap.xml`** (or wherever `robots.txt` points) — full raw contents,
  and whether it parses as well-formed.
- **Non-production noindex signals** — for each `{NONPROD_ORIGINS}` host,
  the response headers and parsed `<head>` of one sampled route.
- **DNS state at `{DNS_ZONE}`** relevant to search-engine registration —
  the full current record set for the relevant name, queried directly
  rather than read from a console (per `EV-01`).
- **Anything unreachable** — a route, origin, or DNS name that doesn't
  resolve at all. Report it; never silently skip it.

## Phase 2 — Audit

For each check below, capture the stated evidence and mark it
`PASS`/`FAIL`. **Do not restate any rule's justification here — cite the ID
only**; the reasoning lives in `web-discoverability-standards.md`. A row
marked *(supplementary)* is a useful check that doesn't correspond to any
single `WD-nn` rule — capture its evidence the same way, but don't cite a
rule ID for it.

**Per-route share metadata**

| Rule ID | Check | Evidence to capture |
| --- | --- | --- |
| `WD-01` | Fetch `{SITE_ORIGIN}`/&lt;a specific deep route, not the homepage&gt; with a plain HTTP client that does not execute JavaScript. Does the raw response body carry a `<title>` and meta description distinct from the homepage's? | The two raw response bodies, with the extracted `<title>`/description values highlighted. |
| *(supplementary)* | In that same response, do the Open Graph / social-card tags (`og:title`, `og:description`, `og:image`) reflect the route's own content, not the homepage's or a hard-coded default? | Extracted `og:*` tag values per sampled route. |
| `WD-03` | Fetch a route representing content that no longer exists, or that was never public. Does the response return a genuine `404` or `410` status — not a `200` that merely renders a not-found-looking page? | The response status code, and the rendered body (to confirm it's the application's own not-found UI, not a generic host error page). |
| *(supplementary)* | Does each fetched route carry exactly one `<link rel="canonical">`, self-referential or pointing at the one intended canonical URL, with no second conflicting canonical tag? | Canonical URL(s) found per route; flag any route with more than one. |
| *(supplementary)* | Where the route type is expected to carry structured data, is an `application/ld+json` block present and does it parse as valid JSON? | The raw JSON-LD block per route, and the parse result. |
| `WD-13` | Where a share-metadata or structured-data value is built from user- or content-supplied text (e.g. a title containing a quote or ampersand), is it correctly escaped for both contexts it appears in — JSON-escaped inside the JSON-LD payload, and separately HTML-escaped in surrounding markup — with no raw pass-through? | One sampled route whose content contains a quote, ampersand, or angle bracket, with the rendered JSON-LD and HTML attribute shown side by side. |
| *(supplementary)* | Fetch a sampled `{PUBLIC_ASSET_PREFIX}` share-image URL with a plain, unauthenticated HTTP client. Does it return `200` with an image content-type and no auth redirect? | Response status, `Content-Type` header, and byte size for the sampled asset. |

**Robots and sitemap policy**

| Rule ID | Check | Evidence to capture |
| --- | --- | --- |
| *(supplementary)* | Fetch `{SITE_ORIGIN}/robots.txt` directly. Does it exist, return `200`, parse as valid, and avoid disallowing any route intended to be indexed? | Raw `robots.txt` body, and any `Disallow` line matching an intended-public route. |
| *(supplementary)* | Does `robots.txt` contain a `Sitemap:` directive, and does fetching that URL return a well-formed sitemap? | The `Sitemap:` line and the fetched sitemap's parse result. |
| `WD-07` | Does every URL listed in the sitemap satisfy `{PUBLIC_VISIBILITY_PREDICATE}`? | Any sitemap entries that fail the predicate. |
| `WD-08` | Where `{PUBLIC_ASSET_PREFIX}` (or another specific public path referenced by page metadata) falls under a broader disallowed prefix in `robots.txt`, is an explicit `Allow:` rule declared for that specific path? | The relevant `Allow:`/`Disallow:` lines from `robots.txt`, and confirmation the specific path is fetchable by a crawler despite the broader disallow. |
| *(supplementary)* | For a sampled route under `{RESTRICTED_PREFIX}`: is it absent from the sitemap, does it carry a noindex signal, and is it unreachable via any link from a route that satisfies `{PUBLIC_VISIBILITY_PREDICATE}`? | Sitemap membership (should be none), noindex signal, and an inbound-link check from the public route set. |

**Non-production noindexing**

| Rule ID | Check | Evidence to capture |
| --- | --- | --- |
| *(supplementary)* | For each `{NONPROD_ORIGINS}` host: is a site-wide `Disallow: /` in `robots.txt` the *only* suppression signal present — no accompanying noindex header or meta tag? Closely related to `WD-09` below. | The host's `robots.txt` plus presence/absence of a noindex header and meta tag on a sampled route. |
| `WD-09` | For each `{NONPROD_ORIGINS}` host: does a sampled route serve **both** an `X-Robots-Tag: noindex` response header **and** an HTML `<meta name="robots" content="noindex">` tag, gated by `{ENV_SIGNAL}`? | Response headers and parsed `<head>` for one sampled route per non-prod host. |

**Search-engine registration**

| Rule ID | Check | Evidence to capture |
| --- | --- | --- |
| `WD-10` | Query `{DNS_ZONE}` directly (independent of any console) for the domain-ownership verification record this property's registration depends on. Is it present, and does it match the value the registration actually expects? | Raw DNS query result — record type, name, and full current value — captured before any write, per `EV-05`. |
| `WD-11` | Is a crawl/recrawl notification path (e.g. IndexNow) wired for URLs that change, and has `{SITE_ORIGIN}` been submitted through the webmaster console for each target search engine? | Notification endpoint configuration (if any), and the submission status shown in each webmaster console. |
| `WD-12` | In the webmaster console for the search engine with the largest share of query volume in the target market, does `{SITE_ORIGIN}` show confirmed index coverage with no outstanding manual-action or coverage blocker? | The console's own coverage/status readout, copied verbatim — this is what downstream AI-assistant retrieval actually depends on, not the site's own claim of being indexable. |

## Phase 3 — Propose

Render every `FAIL` from Phase 2 as one line:

```text
WD-08 FAIL — <what was actually observed, in one sentence>
  → see web-discoverability-standards.md § non-production noindexing
```

Group the findings under the same four headings used in Phase 2. For each,
give the exact remediation: what changes in-repo (Phase 4a) versus what
requires an outward-facing action (Phase 4b).

End with the full proposed change set and one explicit question:

**"Approve this change set? (yes / edit / cancel)"**

Stop here. Nothing before this point writes anything, with or without
`--apply`.

## Phase 4a — Apply: in-repo changes

Only with `--apply` **and** after Phase 3 approval. Typical fixes:

- Inject the missing per-route title/description/`og:*`/canonical tags at
  `{SERVING_LAYER}` (server-rendered or edge-injected — never
  client-side-only, per `WD-01`).
- Add or correct `robots.txt` and `sitemap.xml`, and exclude
  `{RESTRICTED_PREFIX}` from the sitemap.
- Add the missing noindex header and meta tag for `{NONPROD_ORIGINS}`,
  gated by `{ENV_SIGNAL}` so production never picks it up by accident.
- Fix the escaping gap found under `WD-13`.

Each fix lands as its own commit, so any one of them can be reverted on its
own (`git revert`, by commit) without touching the others.

## Phase 4b — Apply: outward-facing actions

Only with `--apply` **and** after Phase 3 approval. Every item here is
confirmed **individually**, one at a time, with current state printed
first — never batched:

- **DNS TXT write at `{DNS_ZONE}`.** Print the CURRENT full record
  verbatim (re-queried live, not from Phase 1's cached inventory). State
  explicitly that the operation is an ADD/APPEND, never a create-or-replace
  (`EV-05`). Require the operator to confirm the resulting full record
  before writing. If the underlying tool only offers a replace operation,
  refuse and require the operator to make the change manually instead.
- **Search-engine registration and verification-value entry.** This spell
  *prepares* the exact value(s) the webmaster console needs and hands them
  to the operator to enter — it does not attempt to drive the console's UI
  itself.
- **Crawl/recrawl instant-notification pings (`WD-11`).** Confirmed once
  per batch of changed URLs. Never auto-re-fired on a later re-run without
  a fresh, explicit confirmation for that run.

## Phase 5 — Verify

Cite `EV-01` and `EV-02` explicitly for every check below.

- For every in-repo fix from Phase 4a: re-fetch the actual served response
  at `{SITE_ORIGIN}` (a fresh request, independent of the deploy that
  shipped the fix) and compare it against the Phase 3 proposal, allowing a
  short, bounded propagation window before treating a fresh mismatch as
  failure (`EV-02`).
- For the DNS write from Phase 4b: re-query `{DNS_ZONE}` independently
  (a different resolver path than whatever console performed the write) and
  compare the full record against what was confirmed.
- For any console value entered by the operator: re-read it back from the
  console rather than trusting the entry UI's own confirmation (`EV-01`).

Report each item as `PASS` / `FAIL` / `UNVERIFIED`. An item that could not
actually be re-checked is `UNVERIFIED` — never silently reported as `PASS`
just because nothing threw an error.

## Phase 6 — Report

Summarize what changed, what's still open, and close with a plain-language,
user-verifiable acceptance checklist:

- [ ] A plain fetch (no JavaScript) of three distinct deep routes returns
      three distinct `<title>` values.
- [ ] `{SITE_ORIGIN}/robots.txt` and its sitemap both return `200`, and the
      sitemap contains no `{RESTRICTED_PREFIX}` or `{NONPROD_ORIGINS}` URLs.
- [ ] Each `{NONPROD_ORIGINS}` host serves both a noindex header and a
      noindex meta tag on a sampled route.
- [ ] The DNS verification record at `{DNS_ZONE}`, re-queried
      independently, matches what the registration expects.
- [ ] The webmaster console for each target search engine shows the
      property verified with no outstanding coverage blocker.

## Rules

This spell defers entirely to
[governance/web-discoverability-standards.md](../../.arcane/governance/web-discoverability-standards.md)
for what "discoverable" means and why, and to
[governance/external-verification-standards.md](../../.arcane/governance/external-verification-standards.md)
for how any claimed fix is verified. Findings and gates in this spell cite
rule IDs from both; they do not re-explain them. Where the two disagree with
what this spell says to do, the governance docs win.

## Related

- **Consumes from:** the spell your team uses to ship/deploy a build (in
  this repository, `spell-ship`). Run `spell-make-discoverable` only after a
  deploy has put something live at `{SITE_ORIGIN}` — it audits an
  already-deployed property, it does not deploy one.
- **Feeds into:** `spell-product-review` — once discoverability fixes are
  applied and verified, carry the before/after state into the next
  product-review cycle as one more measured signal.
- [Web Discoverability Standards](../../.arcane/governance/web-discoverability-standards.md)
- [External Verification Standards](../../.arcane/governance/external-verification-standards.md)
