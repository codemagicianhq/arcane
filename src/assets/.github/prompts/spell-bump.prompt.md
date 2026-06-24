---
name: Spell — Bump Version
description: Determine the correct semver bump type for the current change and apply it to package.json
argument-hint: Optional context about the change (e.g., "new component", "bug fix", "breaking API change")
agent: agent
---

## Executive Summary

- This spell determines whether a version bump is required and applies the correct semver type.
- Use it whenever you've changed `src/assets/`, `registry.ts`, or `profiles.ts` in the arcane repo.
- It enforces the rule from CLAUDE.md: "Version bump required for any change to `src/assets/`."

---

Determine the correct semver bump and apply it.

## Step 1 — Check whether a bump is needed

Run the version check gate:

```
npm run check:version-bump
```

- If it **passes** → no bump needed. Stop here and report "No version bump required."
- If it **fails** → proceed to Step 2.

## Step 2 — Determine semver type

Inspect the changed files in `src/assets/`, `registry.ts`, and `profiles.ts`:

| Change type | Bump |
|---|---|
| New component added to registry (new file in `src/assets/`) | `minor` |
| Existing asset file updated (content change, no new component) | `patch` |
| Component removed from registry | `minor` |
| Breaking change to CLI API or registry schema | `major` |
| Bug fix in CLI source (`src/modules/`, `src/commands/`) | `patch` |
| New CLI command or flag | `minor` |

When in doubt: new distributable content = `minor`, content update = `patch`.

## Step 3 — Apply the bump

Run the appropriate command (do **not** use `--git-tag-version` — tagging happens at publish time):

```
npm version patch --no-git-tag-version
# or
npm version minor --no-git-tag-version
# or
npm version major --no-git-tag-version
```

## Step 4 — Verify and stage

```
node -e "const p = require('./package.json'); console.log(p.version)"
git add package.json package-lock.json
```

## Step 5 — Commit

Use `spell-commit-work` to commit the version bump as a separate commit:

```
chore(release): bump version to X.Y.Z
```

Include in the commit body:
- What distributable change triggered the bump
- Which components were added/changed
