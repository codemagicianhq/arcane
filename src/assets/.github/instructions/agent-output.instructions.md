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
- **Governance docs this framework ships** (`.arcane/governance/*.md`): the full
  canonical-repo URL. A file here lives in *this* repo today but ships into every
  consumer repo's own tree, where a wiki-link or relative path to Arcane's own
  `DECISIONS.md` either fails to resolve, or worse, silently resolves to the
  *consumer's own* `DECISIONS.md` (an empty per-consumer starter template, not
  Arcane's real decision record) — wrong content, not just a dead link.
- **Spell prompts and instructions this framework ships**
  (`.github/prompts/*.prompt.md`, `.github/instructions/*.md`): **plain text only —
  cite the bare ID, no link at all** (`ARC-035`, not `[ARC-035](...)`). A full
  canonical URL is *also* unsafe here, not just a same-repo link: it bakes
  `github.com/codemagicianhq/arcane` — this project's own org and repo name — into
  content the org-token portability gate (`scripts/org-token-lint.ts`, D2 in
  `spell-authoring-standards.md`) exists specifically to keep out of distributed
  spells. **Confirmed live 2026-08-31 (BC-06):** the build's `Org-token lint` failed
  on exactly this pattern in three prompt files, including two this same correction
  pass had introduced minutes earlier while fixing the *other* link defect. Known
  gap: the portability scan today only walks `.github/prompts/`, so a full URL in a
  `.github/instructions/*.md` file — like this one's own Merge Strategy section, two
  paragraphs down — ships uncaught; tracked in `TODO.md`.
- **Cross-repo references from anywhere else** (chat, PR output, another repo
  entirely): the full canonical-repo URL.

**Never fabricate an unresolvable link.** If you cannot confirm the ID exists and where
it resolves to, say so and cite the ID as plain text rather than inventing a link that
looks real but goes nowhere.

## Merge Strategy

All PRs must use **Rebase and fast-forward**. Never squash. Never merge commit. See
ARC-009 §7 (Arcane's own framework decision — cited as plain text, not linked, per
Doc-ID Link Format above: this file ships). **Corrected 2026-08-31 (BC-06), three
times over:** this file previously cited `ADR-048`, which does exist in the shipped
`framework-decisions.md` reference — but its actual topic ("Code Versus Docs Branch
Policy") has nothing to do with merge strategy, a topical miscitation rather than a
missing one. The first fix replaced it with a same-repo wiki-link to this repo's own
`DECISIONS.md` — itself the exact cross-repo defect this section warns about
(`DECISIONS.md` doesn't ship). The second fix replaced that with a full canonical
URL, which held up locally but failed the build's org-token portability gate: a
`github.com/codemagicianhq/arcane` URL bakes this project's own org into a file the
gate treats as distributed content (see Doc-ID Link Format above). Settled on the
bare ID — the gate's own documented safe form.

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
