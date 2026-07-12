---
name: Spell — Arcane Version
description: Report the version of Arcane installed in this repository, the active profile, installed components, and whether an update is available.
argument-hint: Optional flag — pass "components" to list all installed components in full detail
agent: agent
---

## Executive Summary

- This prompt reads `.arcane.json` and reports the installed Arcane version for this repository.
- It surfaces the install date, profile, and component count.
- Optionally lists every installed component when the "components" argument is passed.
- Use this any time you need to know which Arcane version a repo is running.

---

Report the Arcane installation state for this repository.

## Step 1 — Read the Manifest

Read [.arcane.json](.arcane.json) from the repository root.

If the file does not exist, stop and output:

```
⚠ Arcane is not installed in this repository.
Run `spell init` to install it.
```

## Step 2 — Output Installation Summary

Produce output in this exact structure:

### Arcane Installation

| Field            | Value                         |
| ---------------- | ----------------------------- |
| **Version**      | `{version from .arcane.json}` |
| **Profile**      | `{profile}`                   |
| **Installed At** | `{installedAt}`               |
| **Components**   | `{count}` installed           |

### Update Check

- Fetch the latest published version from the npm registry: `https://registry.npmjs.org/arcane-cli/latest`
- Extract the `version` field from the JSON response.
- Compare to the installed version.

If up to date:

```
✔ You are on the latest version ({version}).
```

If behind:

```
⚠ Update available: {installed} → {latest}
Run `spell update` to upgrade.
```

If the npm registry is unreachable, report:

```
ℹ Could not reach npm registry — update check skipped.
```

## Step 3 — Component Detail (optional)

Only include this section when the user passed "components" as the prompt argument.

List each entry from the `components` array in `.arcane.json` as a table:

| Component | Installed Version | Files |
| --------- | ----------------- | ----- |
| ...       | ...               | ...   |

## Rules

- Do not modify any files.
- Keep output factual — read directly from `.arcane.json`, do not infer or assume values.
- If `installedAt` is an ISO 8601 timestamp, display it as a human-readable date (e.g., "26 May 2026").
