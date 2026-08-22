# Architecture — Fail-Safe CI Path-Filter Policy

## Overview

One `DECISIONS.md` status flip (ARC-022 Proposed → Accepted). Four pipeline template edits in
`src/assets/.arcane/governance/cicd-standards.md` (canonical, mirrored to root). One new
governance rule (commit-metadata prohibition) and one new subsection (branch-policy alignment).
No application code.

## Decisions

**D1 — Exclude list, not a blanket "always trigger."** The .NET/Node.js exclude filters name a
short, explicit set of known-inert paths: `**/*.md`, `docs/**`, `journal/**`,
`.arcane/governance/**` (governance prose, not code). Anything NOT in that list — including a
brand-new, never-seen-before directory — triggers by default. This is the literal mechanism
ARC-022 asks for ("prefer narrow exclusions... so new code paths fail safe").

**D2 — Terraform/Markdown-lint stay include-based, by design, not by oversight.** Per the PRD's
design-nuance section: these pipelines are inherently scoped to one technology/filetype, and an
include filter matching that exact scope is the *correct* design, not the anti-pattern ARC-022
rejects (general-purpose validation pipelines using include lists that can miss new code
locations). Widened to also include each pipeline's own YAML definition file, so a change to the
pipeline itself is validated by CI, not silently unreviewed.

**D3 — The commit-metadata prohibition is a standalone, quotable rule.** Placed immediately after
the pipeline templates as its own short subsection, not buried in prose — mirrors ARC-022's own
"Rejected alternatives" reasoning (`[skip ci]`/`docs(...)` commit-prefix skipping is "a security
bypass primitive," commit messages are "attacker-controlled metadata").

**D4 — Branch-policy alignment is documented as a failure mode, with a concrete example, not just
an instruction to "keep them in sync."** A YAML trigger and an ADO branch-policy path filter are
two independent mechanisms; either alone controlling CI execution vs. whether CI is *required*
before merge is not enough — if the pipeline is scoped correctly but the branch policy's own path
filter is narrower, a change outside that narrower scope can merge with no build check required at
all, even though the pipeline itself would have run correctly.

## Data flow

```
DECISIONS.md          ARC-022: Proposed -> Accepted (R1)

cicd-standards.md
  .NET Backend Pipeline    include -> exclude (D1, R2)
  Node.js Pipeline         (no filter) -> exclude (D1, R2)
  Terraform Pipeline       include, widened to cover its own YAML path (D2, R3)
  Markdown Lint Pipeline   include, widened to cover its own YAML path (D2, R3)
  + new "Never Trust Commit Metadata for CI Skipping" subsection (D3, R4)
  + new "Branch-Policy Path-Filter Alignment" subsection (D4, R5)

docs/intake/batch-001/EF-22.md   deferred -> shipped (R7)
```

## Testing strategy

String-assertion + YAML-parse tests (the pipeline fragments are real YAML, so parseability is
checkable even though pipeline *behavior* isn't executable in this repo's own CI). Covers R2-R5's
content directly, plus the five acceptance scenario classes ARC-022 names (docs-only / code-only /
mixed / new-directory / pipeline-definition) as documented reasoning checks: does the exclude
list's own content prove a docs-only change would be skipped and a new, unlisted directory would
NOT be skipped, by construction of what is and isn't in the exclude list.

## Security

The commit-metadata prohibition (D3) is itself a security-relevant governance addition — commit
messages, authorship, and branch names are attacker-controlled inputs an agent or malicious actor
could craft to bypass validation; this PRD documents why they must never be trusted, it doesn't
introduce any new trust surface.

## Implementation notes

- Keep each YAML template block syntactically valid (parseable) even after editing — verified via
  a YAML parser in the test suite, not just visual inspection.
