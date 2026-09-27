---
name: Spell — Arcane Version
description: Report the version of Arcane installed in this repository, the active profile, installed components, and whether an update is available.
claude_description: Use PROACTIVELY when asked about the installed Arcane version, profile, or whether an update is available.
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

Read [.arcane.json](../../.arcane.json) from the repository root.

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

### Update Check (two-axis)

This repo's `.arcane.json` version is one of three readings — check both axes, the same two as
`spell-open-session`'s own version check:

- **Repo-files version** — already read in Step 1 (`.arcane.json`'s `version` field).
- **Installed CLI version** — determine the version of the installed `arcane-cli` CLI (for example,
  `npx arcane-cli --version`, or the locally installed package version).
- **Npm-latest version** — fetch `https://registry.npmjs.org/arcane-cli/latest` and extract the
  `version` field.

- **(a) Repo-files behind the installed CLI:** `⚠ Managed files out of date: files at {version} → CLI at {cli}. Run spell update to resync files.`
- **(b) Installed CLI behind npm-latest:** `⚠ Update available: CLI at {cli} → latest {latest}. Upgrade the CLI, then run spell update.`
- **If either axis drifts, emit the canonical version-drift diagram** — same template, same collapsing/
  branching rule, same `:::mermaid`-for-ADO-wikis fencing as `spell-open-session.md`'s own
  "Arcane version check (two-axis)" step; that file holds the canonical shape, referenced here rather
  than repeated.
- If both axes are current:

```
✔ You are on the latest version ({version}).
```

If the npm registry is unreachable, report:

```
ℹ Could not reach npm registry — update check skipped.
```

### Setup questions from an AI harness (no interactive terminal, PRD D-02 / #282)

This spell itself stays read-only. If the operator then asks you to run `spell update`, note that a
harness shell is not an interactive terminal. The CLI then skips every unanswered manifest question
and prints ``! Skipped N manifest question(s) (<fields>) — no interactive terminal. Run `spell update` from a terminal, or answer by flags:``,
followed by the exact line to re-run, such as
`spell update --tracking-mode <internal|external> --push-policy <open|guarded|blocked>`.
`spell init --profile <profile>` prints the same kind of `spell update` line when it leaves
questions unanswered. Do not send the operator off to find a terminal. Instead:

1. Ask the operator each skipped question through the harness's own question UI (a plain chat
   question if the harness has none): one question per flag the CLI printed, offering exactly the
   values that flag lists. The flags are `--role`, `--tracking-mode`, `--external-provider`,
   `--content-sensitivity`, `--push-policy` and `--subject-root`. `--tracking-mode external` also
   needs `--external-provider <ado|github|jira|other>`, so ask that too when the answer is
   `external`.
2. Re-run `spell update` with the flags the CLI printed, filled with the operator's answers, for
   example `spell update --tracking-mode internal --push-policy guarded`.
3. Never pass a flag the operator did not answer. No guessed, default or "recommended" value stands
   in for an answer. An unanswered question stays unset: the next interactive run asks it, and the
   next harness run reports it skipped again.
4. Never loosen `push_policy` by flag. `--push-policy` only answers an unset question or tightens a
   recorded policy, and the CLI refuses a loosening. Moving a repository from `blocked` or `guarded`
   toward `open` is only ever `spell unblock-push`, which the operator runs from an interactive
   terminal (ARC-034 decision 6, ARC-049 decision 6). Tell them so; do not try to run it for them.

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
