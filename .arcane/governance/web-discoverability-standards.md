---
title: Web Discoverability Standards
audience: both
last_updated: YYYY-MM-DD
status: active
distributable: true
tags: [discoverability, metadata, crawlers, search-indexing, structured-data]
---

# Web Discoverability Standards

How a web property becomes retrievable by search-engine crawlers and by the AI assistants that answer questions from a search index — vendor-neutral and framework-agnostic, applicable regardless of stack or hosting provider.

## Executive Summary

- Per-route metadata must exist in the raw HTML response before any client-side JavaScript runs — link-unfurl scrapers fetch HTML once and never execute JavaScript (WD-01, WD-02).
- A route with no real content must return a genuine not-found HTTP status, not an always-200 shell that looks fine to a human and misleads a crawler (WD-03).
- Any value that legitimately differs per environment — a canonical hostname, an "is this production" flag — must be resolved at runtime from the running environment, never baked into a shared build artifact (WD-04, WD-05).
- Crawler traffic must never pass through endpoints carrying human-traffic side effects, and any crawler-facing content listing must reuse the application's own visibility rule rather than a hand-maintained copy of it (WD-06, WD-07).
- Crawl control (robots exclusion) and index control (a response header) close different gaps and are both required on non-production origins; search-index presence, not a static convention file alone, is the real lever for AI-assistant retrieval (WD-09, WD-12).

---

## Rule index

| ID | Rule (one line) |
|----|------------------|
| WD-01 | Per-route metadata must exist in the raw HTML response before client-side JavaScript runs. |
| WD-02 | Inject metadata at the layer already serving the built app to browsers, not a separate rendering pipeline. |
| WD-03 | Non-existent or non-public routes return a real not-found HTTP status, not an always-200 catch-all. |
| WD-04 | Values that differ per environment (e.g. canonical origin) resolve at runtime, never bake in at build time. |
| WD-05 | Confirm an "is this production" flag actually varies per environment by reading it back — don't trust its configured default. |
| WD-06 | Never route crawler traffic through endpoints with view-count, rate-limit, or other user-traffic side effects. |
| WD-07 | Crawler-facing content listings (e.g. a sitemap) reuse the application's own visibility rule — never a second copy of it. |
| WD-08 | A specific robots.txt allow-rule must be declared to override a broader disallow-prefix that would otherwise swallow it. |
| WD-09 | A non-production origin needs both a robots.txt disallow AND an index-suppression response header — not just one. |
| WD-10 | DNS apex TXT records for search-console verification are appended, never replace the existing record set (see EV-05). |
| WD-11 | Cover instant-notification protocols where supported, and keep a submitted sitemap current for engines that lack them. |
| WD-12 | For AI-assistant retrieval, search-index presence is a stronger lever than any static AI-readable convention file. |
| WD-13 | User-supplied metadata text needs HTML-attribute escaping AND, for inline JSON-LD, "<"-character escaping. |
| WD-14 | Share images follow the ~1.91:1 convention, keep a safe-content margin, and stay modest in file size. |
| WD-15 | AI image generation can't reproduce exact type/logos — composite the real assets over generated artwork instead. |

---

## Where metadata is produced

### WD-01 — Metadata renders before JavaScript runs

**Rule: Per-route share/SEO metadata — title, description, canonical URL, and structured preview tags (Open Graph, a card-style social preview format, JSON-LD) — must be present in the raw HTML response *before* any client-side JavaScript executes. Enforcement: structured spell gate (ARC-023) — spell-make-discoverable's Phase 2 Audit table (Per-route share metadata, WD-01) fetches a live deep route with a non-executing HTTP client and requires a title/description distinct from the homepage before Phase 3's approval gate allows any fix to proceed.**

**Why:** Link-unfurl scrapers used by chat apps, messaging platforms, and social platforms fetch the HTML document once over HTTP and do not execute JavaScript. A client-side head-management approach — a library that sets `document.title` and injects meta tags after the app mounts — is invisible to that entire audience, even though it looks completely correct to a human inspecting the live DOM in a browser. The browser ran the JavaScript; the scraper didn't. "Works when I look at it" and "works for the audience that matters here" are different claims, and only one of them is being tested by opening dev tools.

### WD-02 — Inject at the existing serving layer, not a new rendering pipeline

**Rule: The correct injection point for per-route metadata is the layer *already* serving the built application to browsers — intercept and augment the response there (template substitution, response rewriting, an edge/proxy rule) — not a separate server-side rendering pipeline built to solve this one problem. Enforcement: explicitly advisory (ARC-023) — which layer performed the injection is indistinguishable from the outside, so no executable check or spell gate confirms it; spell-make-discoverable's Phase 2 table cites WD-02 only for Open Graph tag content, not injection-layer architecture.**

**Why:** That layer already sees every request and already returns the HTML document; per-route string-level substitution at that point gets the metadata into the raw response without introducing a second rendering runtime, a hydration story, or a new build target. See "Why per-route injection beats both alternatives" below for the fuller comparison.

### WD-03 — Dead or non-public routes return a real not-found status

**Rule: A route representing content that no longer exists, or that was never public, must return a genuine "not found" HTTP status (404, or 410 if the removal is intentional and permanent) while still rendering the application's own not-found UI in the response body. Enforcement: explicitly advisory (ARC-023) — no executable check or spell gate in this codebase asserts response status codes for dead routes; spell-make-discoverable's Phase 2 table cites WD-03 for canonical-tag uniqueness, a different check.**

**Why:** An always-200 catch-all — common with client-side routing, where every path resolves to the same shell and the app decides what to render after the fact — is invisible to a human browsing normally; they see a "not found" page and move on. A search engine reads the status code, not the rendered pixels. A 200 on a dead URL tells the crawler the page is valid and indexable — a "soft 404" — and the URL gets indexed, sometimes ranked, and eventually shown to a searcher as a dead end.

---

## Why per-route injection beats both alternatives

Two alternatives get rejected here, for different reasons.

**A full separate server-rendering pipeline (SSR/SSG)** overcorrects. It does make metadata available before any client-side JavaScript runs — but only as a side effect of rendering the *entire* page server-side. Adopting it takes on a second build/runtime target, hydration-mismatch failure modes, and an architecture decision that has nothing to do with the actual problem, which is that a handful of `<head>` tags need to exist before JavaScript runs. Teams that adopt a full rendering pipeline solely to fix metadata end up carrying its ongoing cost for the life of the application, for a problem that didn't require it.

**A client-side head/meta-tag management library** fails to solve it at all. It looks correct — inspect the live DOM in any browser and the tags are right there — but a scraper that never executes JavaScript never sees them. The library isn't buggy; it simply depends on JavaScript running to do its one job, and the audience this problem is about is defined by *not* running JavaScript.

Between an approach that solves a narrower problem than it claims to and one that solves a different, larger problem than the one that exists, neither is the right size. Per-route injection at the layer already serving the app — WD-02 — is the one that matches the actual shape of the problem.

---

## Values that differ by environment

### WD-04 — Environment-specific values resolve at runtime

**Rule: Any value that legitimately differs between deployed environments — most commonly the canonical public origin or hostname embedded in canonical URLs, structured data, or preview metadata — must be resolved at runtime from the actual running environment, never baked in at build time. Enforcement: explicitly advisory (ARC-023) — no executable check confirms build-time values are absent from the running artifact; spell-make-discoverable's Phase 2 table cites WD-04 for JSON-LD validity, a different check.**

**Why:** When a single build artifact is deployed unchanged to multiple environments (build once, promote the same artifact — standard practice, and good practice for other reasons), any value fixed at build time is physically identical across every environment that artifact runs in. It cannot carry an environment-specific answer no matter how carefully it was set at build time, because build time happens once, upstream of every environment the artifact will later run in. There is no way to make a single frozen value simultaneously correct for staging and production; the fix is to stop trying and read the value from the environment that's actually running.

### WD-05 — Confirm environment flags actually vary, don't trust their default

**Rule: A generic "is this production" flag commonly defaults to the same value across *all* deployed environments, not only production. Branching discoverability logic on it (for example, suppressing indexing everywhere that isn't production) silently gives every environment the production answer unless that default has been checked. Before relying on any such signal, confirm it actually differs per environment by reading it back from each running environment — not by trusting how it was configured or assumed to behave. Enforcement: explicitly advisory (ARC-023) — confirming this requires operator judgment about which signal to trust and read back per environment; spell-make-discoverable's Phase 2 table cites WD-05 for basic robots.txt validity, a different check.**

**Why:** The mistake is invisible precisely because production looks correct — it's the one environment where the flag's default happens to match reality. The bug only shows up in every *other* environment, which is exactly where it's least likely to get noticed during a review that (reasonably) focuses attention on production. Prefer a signal already confirmed to vary — a runtime-resolved hostname, an explicitly-set per-environment value — over a flag whose default was never actually read back from a non-production environment.

---

## Crawler-facing paths and data access

### WD-06 — Never route crawlers through user-traffic side effects

**Rule: Never route crawler or bot traffic through an endpoint that has view-counting, rate-limiting-by-request, or other side effects meant for real user traffic. Serve crawler-facing responses — sitemaps, crawler-visible pages, structured-data feeds — by reading the underlying data directly, bypassing those side-effecting code paths. Enforcement: explicitly advisory (ARC-023) — no executable check or spell gate in this codebase confirms crawler routes bypass side-effecting code paths; spell-make-discoverable's Phase 2 table cites WD-06 for sitemap-directive presence, a different check.**

**Why:** A well-behaved crawler generates a high volume of requests across a large route set in a short window, and that volume is not representative of user behavior even when the crawler is behaving exactly as intended. Run that volume through a view counter and the counter becomes meaningless noise on top of real signal. Run it through a rate limiter designed to catch abusive human traffic and it trips the limiter, throttling or blocking the crawler — and the content behind it — for doing nothing wrong.

### WD-07 — Crawler listings reuse the application's own visibility rule

**Rule: Any listing of publicly discoverable content generated for a crawler — most commonly a sitemap — must be derived from the *exact same* visibility rule the application's own public listing or feed uses for that content, never a second, independently written copy of that rule. Enforcement: structured spell gate (ARC-023) — spell-make-discoverable's Phase 2 Audit table (Robots and sitemap policy, WD-07) checks every sitemap URL against `{PUBLIC_VISIBILITY_PREDICATE}` before Phase 3's approval gate allows any fix to proceed.**

**Why:** A hand-maintained second copy of a visibility rule is correct on the day it's written and drifts silently after that. The real rule gains a condition over time — a moderation flag, a scheduled-publish date, a soft-delete check — and the sitemap-generation copy doesn't get the same update, because nothing forces the two to change together. The result is a sitemap that lists things a visitor can't actually reach, or omits things that are genuinely public. Call or import the same predicate the listing endpoint already uses; don't restate its logic anywhere else.

---

## Crawl control and index control

### WD-08 — A specific allow-rule must be declared to escape a broader disallow

**Rule: In a robots-exclusion file, when both an explicit allow-rule for a specific path (for example, a public media/asset path that page metadata references) and a broader disallow-rule for a prefix that would otherwise contain it (for example, a general API path prefix) are both relevant, the specific allow-rule *must be declared* so that it actually takes effect. Enforcement: explicitly advisory (ARC-023) — no executable check or spell gate in this codebase verifies allow/disallow specificity for a given path; spell-make-discoverable's Phase 2 table cites WD-08 for an unrelated non-production noindex-signal check, not this rule's actual claim.**

**Why:** Crawlers that respect a robots-exclusion file resolve overlapping rules by specificity — the most specific matching path generally wins over a broader one, not "whichever rule appears first in the file" and not "disallow always wins." Get the specificity wrong, or simply omit the specific allow-rule and assume the broader disallow won't apply to it, and a media-asset path nested under a disallowed API prefix becomes entirely invisible to image crawling — even though the page's own metadata correctly points at that image. A correct metadata reference doesn't help if the crawler was never permitted to fetch what it points to.

```txt
User-agent: *
Allow: /api/public-media/
Disallow: /api/
```

The allow-rule for the more specific path has to exist in the file; it isn't inferred from the disallow-rule simply being broader.

### WD-09 — Non-production origins need crawl control AND index control

**Rule: A non-production or staging origin needs *both* a crawl-blocking mechanism (a robots-exclusion rule disallowing the origin) *and* an index-suppression response header (for example, a `noindex` directive delivered via response header, or an equivalent tag) on every response. Enforcement: structured spell gate (ARC-023) — spell-make-discoverable's Phase 2 Audit table (Non-production noindexing, WD-09) fetches a sampled non-prod route and requires both an `X-Robots-Tag: noindex` header and a matching meta tag before Phase 3's approval gate allows any fix to proceed.**

```http
X-Robots-Tag: noindex, nofollow
```

```txt
User-agent: *
Disallow: /
```

**Why:** see "Why two noindex mechanisms, not one" below.

---

## Why two noindex mechanisms, not one

The two mechanisms close different gaps, and neither one covers the other's gap.

Crawl-blocking (the robots-exclusion rule) stops a well-behaved crawler from *fetching* content at all. It does not stop a search engine from listing the bare URL if that URL is linked to from somewhere else the crawler *does* fetch — a URL-only listing with no title or snippet, because the crawler was never allowed in to get one, but a listing all the same.

Index-suppression (the response header) stops indexing outright — but only for a request the crawler actually makes. A crawler that obeyed the crawl-block never fetches the response, and so never sees the header telling it not to index. The header can't suppress what the crawler was never allowed to retrieve.

Using only the robots-exclusion rule leaves the bare-URL-listing gap open. Using only the header leaves the origin fully crawlable by anything that doesn't respect (or bothers to check) the crawl-block. Only running both closes both gaps, which is why WD-09 requires both, not either.

---

## Registration, DNS, and notification

### WD-10 — Apex DNS verification records are appended, not replaced

**Rule: Registering a property's ownership with a search console commonly requires adding a DNS TXT record at the domain apex. Follow EV-05 (see [[.arcane/governance/external-verification-standards|External Verification Standards]]) when writing it, rather than re-deriving the append-vs-replace reasoning here — the apex TXT record set is very often already carrying other unrelated values (a mail-sender authorization policy, other verification strings), and a careless write destroys them. Enforcement: structured spell gate (ARC-023) — spell-make-discoverable's Phase 2 Audit table (Search-engine registration, WD-10) re-queries the live DNS record, and Phase 4b requires the operator to confirm the full resulting record as an append before any write is made.**

### WD-11 — Cover both instant notification and sitemap freshness

**Rule: Instant crawl/recrawl notification protocols exist and are adopted by some search engines and services — IndexNow is one — but not by the search engine with the largest share of global query volume, which instead relies on periodically re-fetching a submitted sitemap. Covering "notify search engines the moment content changes" therefore requires *both*: an instant-notification call where the protocol is supported, *and* ensuring the sitemap itself is submitted through the relevant search console and kept current for the engine(s) that don't support instant notification. Enforcement: structured spell gate (ARC-023) — spell-make-discoverable's Phase 2 Audit table (Search-engine registration, WD-11) checks notification-endpoint wiring and console submission status before Phase 3's approval gate allows any fix to proceed.**

### WD-12 — Search-index presence outweighs a static AI-readable file

**Rule/observation: For the specific goal of being retrievable *by AI assistants* — as distinct from being found by a human searching directly — being present and current in a major search engine's index is a substantially stronger lever than any single static "AI-readable" convention file placed at a well-known path (for example, a plain-text site-description file such as the emerging `llms.txt` convention). Several AI assistants answer by drawing on a search engine's index rather than crawling the web independently, so an assistant's ability to surface a page is frequently bottlenecked on that page's search-index presence, not on whether a convention file exists at all. A convention file is still worth publishing — it costs little and helps the assistants that do read it directly — but it should not be mistaken for the primary lever. The everything-else in this document (WD-01 through WD-11) is the primary lever. Enforcement: structured spell gate (ARC-023) — spell-make-discoverable's Phase 2 Audit table (Search-engine registration, WD-12) reads the webmaster console's own coverage status verbatim before Phase 3's approval gate allows any fix to proceed.**

---

## Untrusted content in metadata

### WD-13 — Two escaping treatments, not one

**Rule:** Any user-supplied text embedded into page metadata needs two independent escaping treatments:

1. **Standard HTML-attribute escaping for the visible meta tags (title, description, preview-card values) — the ordinary defense against a value breaking out of an attribute or tag context.**
2. **Separately, for structured data embedded as inline JSON inside a `<script type="application/ld+json">` tag: escape the `<` character wherever it appears inside JSON string values (for example, to its Unicode-escape form), in addition to standard JSON string escaping. Enforcement: structured spell gate (ARC-023) — spell-make-discoverable's Phase 2 Audit table (Per-route share metadata, WD-13) renders a sampled route's JSON-LD and surrounding HTML attribute side by side before Phase 3's approval gate allows any fix to proceed.**

```json
{
  "@type": "Review",
  "reviewBody": "quoted text containing </script><script>..."
}
```

**Why:** A literal closing-script-tag sequence smuggled inside a JSON string value can prematurely terminate the surrounding script block the moment the HTML parser reads it — regardless of whether the JSON itself is well-formed and correctly escaped by a standard JSON serializer. A JSON serializer's job is producing valid JSON; it has no reason to know its output is about to be embedded inside an HTML `<script>` tag, so it has no reason to escape a byte sequence that is perfectly legal JSON but breaks the HTML around it. The two treatments defend two different parsing contexts reading the same untrusted input — the HTML attribute parser for the visible meta tags, and the HTML parser's script-tag boundary detection for the JSON-LD block — and one does not substitute for the other.

---

## Share images

### WD-14 — Aspect ratio, safe margin, file size

**Rule: Link-preview (share) images should follow the aspect ratio broadly adopted across major platforms — close to 1.91:1 — with a safe-content margin around the edges so platform-specific cropping doesn't cut off text or a focal subject, and should stay modest in file size. Enforcement: explicitly advisory (ARC-023) — no executable check measures aspect ratio or safe-margin compliance in this codebase; spell-make-discoverable's Phase 2 table cites WD-14 for restricted-path sitemap exclusion, a different check, and checks share-image fetchability/size under the WD-15 label instead.**

**Why:** Scrapers fetch preview images synchronously as part of unfurling a link, and some platforms silently refuse to fetch, or silently fail to display, an image above their own size ceiling — there is usually no visible error; the preview simply renders without an image. A safe-content margin matters because different platforms crop the same source image to slightly different final frames; content placed right at the edge survives on some platforms and gets cut on others.

### WD-15 — Composite real assets; don't ask a generator for exact type or logos

**Rule: Current AI image-generation tools cannot reliably reproduce an exact existing typeface or an exact existing vector logo/mark — both come out as a visible approximation, and no amount of prompt refinement reliably fixes this. It's a property of how these generators work (they produce plausible-looking glyphs and marks probabilistically rather than reproducing exact vector paths or font outlines), not a quality issue specific to any one generation attempt. When brand-exact typography or an exact logo mark matters for a share image, composite the real font files and the real vector logo asset over separately generated artwork or background — don't ask the generator to produce the whole image including the exact type and mark. Enforcement: explicitly advisory (ARC-023) — whether generated artwork faithfully reproduces exact type or a logo is a design judgment call no automated check can verify; spell-make-discoverable's Phase 2 table cites WD-15 for share-image fetchability, a different, mechanically-checkable concern.**

---

## Related

- [[.arcane/governance/external-verification-standards|External Verification Standards]] — the verification steps WD-10 (and any other rule here that touches DNS records or an external console) depends on.
- A consuming spell should cite these rule IDs (WD-01 … WD-15) rather than restate them.
