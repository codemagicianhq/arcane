---
date: 2026-07-11
topic: Read-only code audit, the Arcane Manifesto, and rediscovery of ARC-012's unimplemented parity guard
status: PR #16 open, awaiting operator review/merge
---

# 2026-07-11 — Code Audit, Manifesto, ARC-012 Drift

## Session: Skeptical code audit + manifesto/TODO commit + close-session

### Prompt Context

Opened via `/spell-open-session` with an explicit read-only constraint: walk the repo as a skeptical senior engineer and answer one question — what is genuinely GOOD here — with file-path evidence for every claim, rejecting anything aspirational. The only permitted write was an untracked audit file at the repo root. After the audit was written, the operator asked to commit two files that were already pending at session start (`TODO.md`, `MANIFESTO.md` — both authored outside this transcript), lifting the read-only constraint on confirmation, then run `/spell-close-session` and open a PR to `main`.

### What Got Done

1. **Ran a read-only code audit** (untracked by design) via a 4-agent parallel evidence sweep covering: the two-dialect naming rule, IP-hygiene naming guidance, the trust-ladder autonomy model, governance-as-code install/versioning, the multi-client agent generator, naming-strategy pluggability, and overall CLI engineering rigor. Every claim was file-path-verified; three claims (`visual_description` as a wired renderer contract, enforced generator/output parity, and the "any tracker" adapter story) were explicitly rejected as aspirational rather than softened.
2. **Committed the two pending files** on `sessions/2026-07-11-manifesto-and-audit-todos` (created fresh off `main` — session started on `main`, which `spell-commit-work`'s protected-branch guard blocks):
   - `69793b0` — `docs(repo): add the Arcane Manifesto` (added a `See also:` wiki-link to `[[naming-conventions]]` / `[[git-conventions]]` per the orphaned-doc check before committing).
   - `2513210` — `docs(todo): add punch list from the strengths audit` (five items sourced from the audit's Tier 2/3 findings).
3. **Opened [PR #16](https://github.com/codemagicianhq/arcane/pull/16)** targeting `main`. No reviewer assignment available (no `.arcane.json` operator config in this repo; solo-maintainer commit history).
4. **Rediscovered that [ARC-012](../DECISIONS.md#arc-012--generated-distributable-artifacts-require-a-parity-guard) was decided but never implemented.** The audit's roster/generator evidence slice independently found no parity test, script, or CI step anywhere in the repo that regenerates or diff-checks `src/assets/.github/agents/*.agent.md` against the canonical YAML — the exact guard ARC-012 (2026-06-20) accepted as a decision. TODO.md's new item #59 was reworded during close-session to cite ARC-012 directly so the backlog item reads as "implement an accepted decision," not a fresh idea.

### Decisions Made

None — this session surfaced drift against an existing decision (ARC-012) rather than making a new one. See Drift and Fixes below.

### Lessons Learned

**A read-only session's scope is a real constraint, not a suggestion — and lifting it needs an explicit ask.** The session opened with "do not modify anything except the audit file," and when the operator later asked to commit unrelated pending files, that was flagged as a scope change and confirmed before acting, rather than assumed to be implicitly authorized by the follow-up request. Worth continuing to treat stated session constraints as sticky until the user explicitly overrides them.

**A parallel multi-agent audit can rediscover an existing ADR from first principles — that's a signal worth cross-checking, not just accepting.** The generator/parity-guard subagent found "no parity enforcement exists" purely from code evidence, with no awareness of ARC-012. Checking DECISIONS.md after the fact turned an audit finding into a much sharper one: this isn't an unnoticed gap, it's an accepted decision from 2026-06-20 that quietly never shipped. Any future audit-style session should diff its own findings against DECISIONS.md before finalizing conclusions — the ADR log is the fastest way to tell "nobody thought of this" from "somebody already decided this and it slipped."

**This repo's actual commit-attribution convention differs from the spell's generic template.** `spell-commit-work.prompt.md` describes structured `Agent:`/`Model:`/`Provider:` trailers for agent-authored commits, but a repo history check (`git log --all --format='%(trailers:key=Agent,valueonly)'`) showed only 2 of ~38 recent commits ever used that trailer, while the rest use the plain `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` line with the human's own git identity as author — matching Claude Code's own global commit convention. Followed the repo's actual precedent over the spell's generic template.

### Open Items Carried Forward

- **[ARC-012's parity guard is still unimplemented](../TODO.md)** — now explicitly tracked (see TODO.md, cross-referenced to the ADR). Highest-leverage item surfaced this session: an already-accepted decision with zero implementation.
- **`update.ts`'s `.bak`-backup docstring doesn't match the force-overwrite implementation** (TODO.md) — a false claim in shipped code comments, not just a missing feature.
- **Org-token portability lint ships with an empty pattern list** (TODO.md) — wired but unarmed.
- **Roster loaders cast YAML without schema validation** despite a `schema_version` field existing (TODO.md).
- **`arcane-cli` npm package still shows `404 Unpublished`** since 2026-07-06 — carried from the prior session, still unresolved.
- **Stale local branches** (`fix/release-drift-cascade`, `payini-fix-release-drift-cascade`, `payini-rename-publish-secrets-vg`) — still pending cleanup.
- **PR #16 needs operator review/merge** — self-approval is blocked on this repo's GitHub plan (confirmed in prior sessions); cannot be completed autonomously.
