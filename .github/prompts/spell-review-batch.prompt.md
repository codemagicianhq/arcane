---
name: Spell — Review Batch
description: Adversarially review many pull requests in one run and emit per-PR verdicts plus a consolidated go/no-go readiness gate report. Provider-agnostic.
argument-hint: '--prs <n,n,…> | --pr <n> | --file <path> | --query <q>  [--repos <r,…>] [--html] [--title <t>]'
agent: agent
---

## Executive Summary

- This spell runs the `spell-review` engine across a batch of pull requests and rolls the results into one report.
- It produces a per-PR verdict (approve / request-changes) plus an overall **go / no-go** gate for the batch — useful for a release-readiness or UAT gate.
- It is provider-agnostic: GitHub (`gh`) and Azure DevOps (`az repos`), detected from the git remote.
- This is the reviewer-side, many-PR counterpart to `spell-review` (single diff). The author-side spell is `spell-address-review`; PRs are typically opened with `spell-create-pull-request`.

---

Review a batch of pull requests and produce a consolidated readiness report.

Context to consult:

- `.arcane/governance/git-conventions.md` — review severity and merge policy.
- The `spell-review` spell — the single-PR review engine this spell reuses per PR (dimension-coverage lenses, severity, stable finding IDs `R1`, `R2`…).

## Arguments

- `--pr <n>` — a single PR.
- `--prs <n,n,…>` — comma-separated PR numbers.
- `--file <path>` — a file to extract PR numbers from (match `\b\d{2,}\b`).
- `--query <q>` — a provider query to discover matching PRs.
- `--repos <r,…>` — optional repo scoping for multi-repo orgs.
- `--html` — also emit a self-contained HTML version of the consolidated report for easy sharing.
- `--title <t>` — optional title for the consolidated report (e.g. "Sprint 42 UAT Gate").

If no input mode is given, ask the user how they want to specify the PRs.

## Step 1 — Resolve inputs

1. Detect the provider first from `git remote get-url origin` (GitHub vs Azure DevOps). If the remote is ambiguous or unrecognized, stop and ask. Confirm the CLI is authenticated (`gh auth status` / `az account show`) before proceeding; on an auth failure, report the exact remediation command and stop — do not partially run.
2. Parse the input mode and collect the PR list. For `--query`, discover PRs via the provider:
   - **GitHub:** `gh pr list --search "<q>" --json number,title,headRefName`
   - **Azure DevOps:** `az repos pr list --status active --query "<filter>"`
   - If `--query` returns zero PRs, report "no PRs matched" and stop — there is nothing to gate.
3. Deduplicate and validate every PR number (positive integers). Drop and note any malformed token rather than aborting. If the resulting list is empty, stop and ask for valid input.
4. Resolve scope per PR. `--repos` scopes discovery and disambiguates PR numbers across a multi-repo org; carry the owning repo with each PR number so mixed-repo batches fetch from the right repo (`gh pr view <n> --repo <r>` / `az repos pr show --id <n>`). A bare number with no repo defaults to the origin repo.
5. **Batch size.** Process PRs sequentially (each review is independent). If the batch exceeds **20 PRs**, warn the user, confirm intent, and proceed in order — do not silently truncate.

## Step 2 — Review each PR

For each PR in the batch, independently:

1. Fetch the PR diff and metadata (`gh pr diff <n>` / `az repos pr show --id <n>` + diff). If a PR can't be fetched (deleted, no access, network error), **skip it, record it as `SKIPPED` with the reason, and continue** — never abort the whole batch for one bad PR.
2. Run the `spell-review` workflow against that diff — the full dimension-coverage sweep (correctness, security, performance, tests, naming/clarity, architecture), severity-ranked findings (`HIGH` / `MEDIUM` / `LOW`, matching the `spell-review` ladder) with stable IDs, and the PASS/WARN/FAIL coverage table.
3. Record a per-PR result: verdict (**approve** / **request-changes**), finding counts by severity, and the coverage table.

Reviews are adversarial — actively look for problems, do not just confirm quality. Apply the same no-fabrication coverage mandate as `spell-review`: a clean lens is reported as "no issues," never padded.

## Step 3 — Consolidate

Build one report:

```markdown
# Batch Review — {title or "PR Readiness"}  ({date})

## Gate: {GO / NO-GO}

> GO only if every PR was reviewed and no PR carries an unresolved HIGH finding.

| PR | Repo | Title | Verdict | High | Med | Low |
| -- | ---- | ----- | ------- | ---- | --- | --- |
| #n | repo | …     | approve / request-changes | 0 | 1 | 2 |
| #n | repo | …     | SKIPPED — {reason}        | —  | —  | —  |

## Per-PR detail
### PR #n — {title}
- Verdict: …
- Coverage: {PASS/WARN/FAIL per lens}
- Findings: {R1 …}
```

The overall gate is **NO-GO** if any reviewed PR has an unresolved HIGH finding, **or** if any requested PR was skipped (an un-reviewed PR can't be cleared) — otherwise **GO**. `HIGH` is the top severity in the `spell-review` ladder; do not invent a "Critical" tier the engine never emits.

## Step 4 — Output

1. Write the consolidated markdown report to a sensible path (e.g. `reviews/batch-review-{date}.md`).
2. If `--html` was passed, also emit a self-contained HTML file (inline CSS, no external assets) at the same base path so it can be shared by email/chat.
3. Print a summary to the user: total reviewed / skipped, verdict counts, total findings by severity, the GO/NO-GO gate, and the output path(s).

## Rules

- Reuse the `spell-review` engine per PR — do not invent a parallel, weaker rubric.
- Reviews are adversarial but honest — no fabricated findings to inflate counts.
- The HTML report must be fully self-contained (inline styles) so it works offline.
- Do not commit or post anything to external systems — the report is a local file the user shares deliberately.
- Never include secrets or tokens in the report.
