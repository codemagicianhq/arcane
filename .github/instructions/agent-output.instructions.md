---
applyTo: "**"
---

# Agent Output Formatting Rules

Source of truth: `.arcane/governance/git-conventions.md` → PR Standards → PR Requirements.

## PR Link Format

All PR references in agent output **must** be clickable markdown links. Never write a bare `PR #NNN`.

**Required format:**
```
[PR #{id} — {title}](https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id})
```

**Example:**
```
[PR #270 — fix: remove Unix-only preinstall script and approve esbuild builds](https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/270)
```

## Doc-ID Link Format

The same rule extends to every other identifier class this framework uses to reference
a decision or record: `ADR-NNN`, `ARC-NNN`, `EF-NN`, venture decision IDs, journal
entries, and named governance docs. A bare decision ID in agent output is the same
defect as a bare `PR #NNN` — the reader has to go find it themselves, and a typo or
stale number is invisible until someone tries.

**Required format, by context:**
- **Inside a repo's own local markdown** (e.g. this repo's `journal/`, `PLAN.md`, or
  `DECISIONS.md` cross-referencing itself): a wiki-link (`[[DECISIONS#ARC-NNN|ARC-NNN]]`)
  or a relative markdown link that actually resolves from that file's own location.
- **Chat or PR output:** a clickable markdown link to the canonical file/anchor.
- **Cross-repo references, and any reference inside a file this framework *ships*:**
  the full canonical-repo URL. **This is not optional for shipped assets** — a file
  under `src/assets/` lives in *this* repo today but ships into every consumer repo's
  own tree, where a wiki-link or relative path to Arcane's own `DECISIONS.md` either
  fails to resolve, or worse, silently resolves to the *consumer's own* `DECISIONS.md`
  (an empty per-consumer starter template, not Arcane's real decision record) — wrong
  content, not just a dead link. Treat every Arcane-framework decision ID cited from a
  shipped file as cross-repo, even while editing it from inside this repo.

**Never fabricate an unresolvable link.** If you cannot confirm the ID exists and where
it resolves to, say so and cite the ID as plain text rather than inventing a link that
looks real but goes nowhere.

## Merge Strategy

All PRs must use **Rebase and fast-forward**. Never squash. Never merge commit. See
[ARC-009](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-009--session-naming-and-pr-lifecycle-reliability-policy)
§7. **Corrected 2026-08-31 (BC-06), twice over:** this file previously cited `ADR-048`,
which does exist in the shipped `framework-decisions.md` reference — but its actual
topic ("Code Versus Docs Branch Policy") has nothing to do with merge strategy, a
topical miscitation rather than a missing one. The first fix attempt replaced it with a
same-repo wiki-link to this repo's own `DECISIONS.md`, which is itself the exact
cross-repo defect this section warns about (`DECISIONS.md` doesn't ship — see above);
caught before merging and replaced with the full canonical URL.

When completing a PR via `az repos pr update`, do **not** pass `--squash true`. The correct command:

```powershell
az repos pr update --id <PR_ID> --org https://dev.azure.com/<org> --status completed --delete-source-branch true
```

## Branch Naming (Interactive Sessions)

Interactive tool session branches use:
```
sessions/YYYY-MM-DD-topic-slug
```

Agent-autonomous branches use:
```
{agent-slug}/type/short-description
```

Human topic branches use:
```
type/short-description
```
