---
applyTo: "**"
---

# Agent Output Formatting Rules

Source of truth: `.arcane/governance/git-conventions.md` → PR Standards section.

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

## Merge Strategy

All PRs must use **Rebase and fast-forward**. Never squash. Never merge commit. See ADR-048.

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
