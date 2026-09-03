---
title: Project Overview
status: current
---

# Project Overview

> Orientation for a session opening in this repository. This file states what Arcane *is* and the
> constraints that shape work on it. It deliberately does not restate content that is authoritative
> elsewhere — [README.md](README.md) is the public pitch, [DECISIONS.md](DECISIONS.md) is the
> decision record, [TODO.md](TODO.md) is the work queue, and `.arcane/governance/` holds the
> operational rules. Where this file and one of those disagree, the other one wins.

## Mission

Arcane is the **methodology layer for AI-assisted development**. AI agents can already write code;
Arcane supplies the discipline to plan it, govern it, test it, review it, and ship it. It ships as
`arcane-cli` on npm and installs its methodology — spells, governance documents, agent definitions —
into a consuming repository.

## Users

- **Solo operators and small teams** running AI-assisted development who need repeatable process
  without adopting a heavyweight framework. Near-zero friction for a solo developer is a hard
  constraint, not a preference.
- **AI agents themselves.** Much of what this repository ships is read by agents rather than humans:
  the spell prompts under `.github/prompts/`, the governance corpus under `.arcane/governance/`, and
  the standing instructions merged into `CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md`.
  Prose here is an interface, and ambiguity in it is a defect.
- **Consumer repositories**, which receive the managed files and must survive `spell update` without
  losing local modifications.

## Scope

**In this repository:** the CLI (`src/`), the distributable methodology assets (`src/assets/`), the
dogfooded copy of those assets installed at the root (`.arcane/`, `.github/prompts/`), the decision
record, and the intake queue under `docs/intake/`.

**Outside it:** DMC and the operations repositories. ARC-028's DMC rendering contract is the standing
example — it was explicitly reclassified as out of scope for this repository rather than left open
here. Business and venture content belongs in a hub repository; this one is not a hub, and the
drift check treats hub artifacts appearing here as a Critical finding.

## Current Goals

- External intake batch-001 is closed except [EF-18](docs/intake/batch-001/EF-18.md), blocked on a
  genuine independent batch-002 submission — operator input, not effort. EF-35 (secret detection)
  shipped as [ARC-037](DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop)
  (BC-30), and EF-36 (auto-merge racing an open review round) shipped as [ARC-035](DECISIONS.md#arc-035--auto-merge-requires-a-clear-review-round)
  (PR #88).
- [ARC-012](DECISIONS.md#arc-012--generated-distributable-artifacts-require-a-parity-guard) enforcement
  shipped (BC-04's YAML-to-agent-render parity test) — no longer a standing gap.
- **Show Report** is planned and saved as a draft ([docs/plans/show-report/PLAN.md](docs/plans/show-report/PLAN.md),
  `status: draft`) but deliberately not started. SR-00 (program activation) is the next concrete
  action, gated on an explicit operator go.

## Constraints

- **Self-hosting.** Arcane installs itself. `src/assets/` is canonical and the root copies are the
  dogfood; `scripts/self-host-parity.ts` enforces the match, and drift between the two trees is a
  defect rather than a merge artifact. Anything touching `src/assets/` requires a version bump.
- **Trunk-based, PR-only.** No actor commits directly to `main`. Interactive sessions must ask before
  committing. Squash merges are prohibited — they destroy per-commit attribution trailers.
- **One session workspace, one unit of work** ([ARC-028](DECISIONS.md#arc-028--concurrency-and-isolation-model-for-parallel-work)).
  Repo-state management belongs to the primary checkout; concurrent work goes in a linked worktree;
  unattended fleets use full clones. Overlapping footprints serialize rather than isolate.
- **Public repository.** Build-in-public with an org-leak gate. Real venture names and internal
  operational content do not belong here.
- **Verification over assertion.** The working protocol in [CLAUDE.md](CLAUDE.md) governs: cite file
  and line, distinguish checked from inferred from told, and treat a green test suite as insufficient
  evidence on its own. This repository has shipped defects behind green suites and confident
  summaries; the protocol exists because of those, not in the abstract.
