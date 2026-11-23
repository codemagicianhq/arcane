---
tracking_mode: internal
githubIssueId: 489
status: in-progress
---
# PRD — Fail-safe Azure path filters

## Problem and users

Consumers need to skip inert Arcane records without letting code or test inputs bypass the required build. Azure Pipelines and Azure Repos use separate filters and disagree on case matching.

## Requirements and acceptance

1. Offer Arcane-owned candidates restricted to the paths in #489; exclude neither arbitrary Markdown nor `.arcane/generated/`. Select only tracked, individually reviewed paths; no unreviewed file is skipped.
2. Generate YAML exclusions and the Azure build-validation filter from the same paths. Show the policy update for explicit operator approval and do not modify a consumer policy silently.
3. Fail closed when YAML, the recorded filter and the live enabled, blocking policy disagree; validate repository, branch, pipeline, guard policy and policy identity, and fail on missing/unsupported data or a filter with no tracked match.
4. A separate unfiltered required guard checks the proposed tree and change, including newly added files, protected inputs, case-fold collisions and known references to skipped files. Flag the precise entry and suggest removing it. Uncertain inputs remain build-triggering.
5. Fixtures cover docs, code, mixed, new directories, code under candidate paths, test-consumed Markdown, pipeline files, lockfiles, `.arcane/generated/`, case differences and live-policy failures. Live Azure verification is a separately reported operator-authorized step.

## Constraints

Do not change consumer policies, publish, merge, or close #489 without the relevant authority and observed delivery. Retain an unfiltered default until both independent policies are in place. Avoid private consumer data. Follow ARC-022 and ARC-023; no detection can prove the absence of dynamically computed reads, so selection is a reviewed assertion and scanning is an additional alarm.

Related: [[.arcane/governance/cicd-standards]]
