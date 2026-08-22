# Architecture — Fail-Safe CI Path-Filter Policy

## Overview

One `DECISIONS.md` status flip (ARC-022 Proposed → Accepted). Four pipeline template edits in
`src/assets/.arcane/governance/cicd-standards.md` (canonical, mirrored to root). One new
governance rule (commit-metadata prohibition) and one new subsection (branch-policy alignment).
No application code.

## Decisions

**D1 — Exclude list, filetype-scoped, not directory-scoped. (Corrected after adversarial review.)**
The .NET/Node.js exclude filter is a single entry, `**/*.md` — not the original draft's
directory-wide `docs/**`/`journal/**`/`.arcane/governance/**` list. Review found the directory-wide
version could silently exclude a non-Markdown file (a script, manifest, tooling config) a consumer
placed inside one of those directories, contradicting ARC-022's unconditional requirement that
scripts/manifests/lockfiles/migrations/infrastructure always remain triggering inputs regardless
of which directory they live in. A filetype glob has no such blind spot: it excludes genuine
Markdown, anywhere in the tree, and nothing else — anything NOT `.md`, including a brand-new,
never-seen-before code directory, triggers by default. This is the literal mechanism ARC-022 asks
for ("prefer narrow exclusions... so new code paths fail safe").

**D2 — Terraform/Markdown-lint stay include-based, by design — but as FILETYPE globs, not
directory-prefix ones. (Corrected after adversarial review found the original argument
unsound.)** The deciding factor for whether an include filter is ARC-022's anti-pattern is the
glob's shape, not which pipeline it belongs to: a directory-prefix include (`path/**`) fails
open — new content elsewhere is invisible; a filetype include (`**/*.ext`) does not, since it
matches that filetype at any depth. Terraform's template used a directory-prefix pattern
(`infrastructure/terraform/**`) before this fix — the exact anti-pattern, silently missing any
`.tf` file added outside that one directory, and exactly what EF-22's own report flagged for it
specifically (grouped with .NET's problem, not treated as exempt). Corrected to `**/*.tf`/
`**/*.tfvars`, which has the same any-depth closure property Markdown-lint's pre-existing `**.md`
pattern already had. Both templates are widened to also include each pipeline's own YAML
definition file, so a change to the pipeline itself is validated by CI, not silently unreviewed.

**D3 — The commit-metadata prohibition is a standalone, quotable rule, and (corrected after
adversarial review) names the platform default it can't override.** Placed immediately after the
pipeline templates as its own short subsection, not buried in prose — mirrors ARC-022's own
"Rejected alternatives" reasoning (`[skip ci]`/`docs(...)` commit-prefix skipping is "a security
bypass primitive," commit messages are "attacker-controlled metadata"). Review found the original
wording implied `[skip ci]`-style skipping was something a consumer chooses to add, when Azure
Pipelines honors `[skip ci]` and several documented variants **by default**, independent of this
document. Corrected to state that fact plainly, name that the required-before-merge branch-policy
gate is documented as immune to it (so this repo's own merge requirement stays sound), and flag
that other trigger-based runs outside that one gate are a residual, platform-level exposure this
governance text can disclose but not close from YAML alone.

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

**Two test-rigor gaps closed after adversarial review:**
- The original block extraction indexed templates by ordinal position (`extractYamlBlock(text,
  0)` for .NET, `1` for Node.js, etc.). Review showed this silently couples test identity to
  document order — reordering the four `###` sections, or inserting a new one, would make a test
  validate the wrong block with no error, since the exclude-list shape was identical across .NET
  and Node.js post-fix. Replaced with heading-anchored extraction (`extractYamlBlockAfter(text,
  "### .NET Backend Pipeline")`) — a missing/moved heading now throws immediately instead of
  silently mismatching.
- The original "narrow exclude list" check covered only 3 of ARC-022's 6 named always-trigger
  categories (pipeline definition, manifest, lockfile — missing script, migration,
  infrastructure), via ad-hoc substring checks, plus an arbitrary length bound that wasn't a real
  safety proxy. Replaced with a table of all 6 categories, each checked with a real representative
  path against a small, deliberately-scoped glob matcher (extension-suffix or exact-literal
  matching only — not a general glob library; `minimatch` is present in `node_modules` only as an
  incidental transitive dependency of other tooling, not declared in `package.json`, so importing
  it directly would be an undeclared dependency) — including each category nested under a
  docs-like path, which is exactly the scenario a directory-wide exclude would have broken.

## Security

The commit-metadata prohibition (D3) is itself a security-relevant governance addition — commit
messages, authorship, and branch names are attacker-controlled inputs an agent or malicious actor
could craft to bypass validation; this PRD documents why they must never be trusted, it doesn't
introduce any new trust surface.

## Implementation notes

- Keep each YAML template block syntactically valid (parseable) even after editing — verified via
  a YAML parser in the test suite, not just visual inspection.
