---
title: Records Conventions
audience: both
last_updated: YYYY-MM-DD
status: active
tags: [records, documentation, retention, supersession]
---

# Records Conventions

How superseded documents are retained, linked to what replaced them, and when
they may not be deleted. Applies to documentation and records repositories.

## Executive Summary

- A superseded document **stays where it is** and gains a tombstone header. It is
  not moved to an archive directory.
- Every tombstone names its replacement, so a reader who arrives at the old
  document by an old link is never stranded.
- Deletion is a separate, explicit decision from supersession — and some records
  may not be deleted at all.
- These are framework conventions, not legal advice. Where a retention
  obligation applies, that obligation governs.

---

## Why in place, not an archive directory

Moving a superseded document breaks every existing link to it — from other
documents, from commit messages, from external systems, from someone's notes.
The reader most likely to arrive at an outdated document is exactly the reader
who needs to be told it is outdated and where to go instead, and a broken link
cannot tell them anything.

Keeping the document at its original path and marking it in place means:

- Old links keep resolving, and now resolve to a page that redirects the reader.
- The document's own history stays continuous in `git log <path>` rather than
  splitting across a rename.
- No repository-wide layout is imposed on subjects whose organisation is
  determined by something other than Arcane.

A universal archive directory is deliberately **not** prescribed. Where an
external retention system is authoritative, that system's layout wins.

## Tombstone header

Prepend to the superseded document, above its existing content:

```markdown
> **Superseded — 2026-08-23.** Replaced by [Current Title](../path/to/replacement.md).
> Retained for reference; do not treat as current.
```

Add the matching frontmatter so the state is machine-readable, not only prose:

```yaml
---
status: superseded
superseded_on: 2026-08-23
superseded_by: path/to/replacement.md
---
```

Rules:

- **`superseded_by` is required. Enforcement: explicitly advisory prose (ARC-023) — no script checks a superseded document's frontmatter for this field.** A tombstone that does not say what replaced it is
  worse than no tombstone: it tells the reader to stop without telling them
  where to go.
- **If a document was superseded by *several* documents, list all of them. Enforcement: explicitly advisory prose (ARC-023) — no script cross-checks the list against the document's actual replacements.**
- **If a document was retired without replacement, say so explicitly
  (`superseded_by: none — <reason>`), rather than leaving the field off. Enforcement: explicitly advisory prose (ARC-023) — no script distinguishes this explicit form from an omitted field.**
- **Do not delete the original content. Enforcement: explicitly advisory prose (ARC-023) — no diff check runs when a tombstone is added, so nothing confirms the body underneath is untouched.** The tombstone is a header, not a
  replacement for the body.
- **Add the reverse link on the replacement, so the relationship is
  discoverable from either end. Enforcement: explicitly advisory prose (ARC-023) — no script checks that a `supersedes` field exists on the named replacement.** A reader who finds only the current document
  should still be able to see what it replaced:

  ```yaml
  ---
  supersedes: path/to/old-document.md
  ---
  ```

  One-directional linking only helps readers who arrive at the old document.
  The reverse direction is what preserves the record's own history.

## Retention and deletion

Supersession and deletion are different decisions and must not be conflated.
Marking a document superseded is a routine editorial act. Deleting it is not.

**Deletion is prohibited without an explicit, recorded decision when any of the
following is true. Enforcement: explicitly advisory prose (ARC-023) — none of the four conditions below is checked by a script; `content_sensitivity`'s value is schema-validated, but nothing gates deletion on it.**

- The document records a decision, agreement, or obligation that other parties
  relied on.
- The document is referenced by an external system, a contract, or a filing.
- A retention period applies to it — whether by regulation, contract, or the
  operator's own policy.
- The repository is marked `content_sensitivity: sensitive` and the document's
  own existence is part of the record.

**When deletion *is* approved, record it: what was deleted, when, on whose
authority, and why. Enforcement: explicitly advisory prose (ARC-023) — no script checks that a deletion record exists after the fact.** A deletion nobody can account for later is indistinguishable
from data loss.

**Arcane does not ship a retention schedule.** Retention periods are
jurisdiction-, industry-, and contract-specific; a framework default would be
guesswork wearing the costume of a standard. Record the applicable period per
subject where one exists, and treat its absence as "unknown, therefore do not
delete", not as "no obligation".

## Related

- [[DECISIONS]]
- [[governance/decision-documentation-standard|Decision Documentation Standard]]
- [[governance/git-conventions|Git Conventions]]
