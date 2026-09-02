---
title: Universal Agent Rules — Single Source of Truth
audience: ai
status: active
tags: [rules, governance, ai-agents, multi-client]
---

# Universal Agent Rules

These rules apply to **every AI agent and tool** working in this repository, regardless of client (GitHub Copilot, Claude Code, Codex, your agent runtime, or any future tool). This file is the canonical source; client-specific instruction files reference this document and add client-specific behavior on top.

See also: [[README]], [[DECISIONS]], [[governance/git-conventions|Git Conventions]], [[agents/agent-policies|Agent Policies]].

---

## Non-Negotiable Safety Rules

1. **Never access an encrypted or cross-OS volume you are not authorized to touch. Enforcement: explicitly advisory prose (ARC-023) — depends on agent judgment about authorization boundaries; no script scans proposed commands for drive or volume access before execution.** Do not suggest, execute, or recommend any action that would mount, read, or probe a drive outside the agent's authorized environment. This rule stands as defense-in-depth regardless of encryption status.

2. **No root commands without justification. Enforcement: explicitly advisory prose (ARC-023) — depends on judgment about what justifies root scope; no script inspects generated commands for root usage before they run.** Do not generate or suggest commands that run as root unless explicitly scoped and justified. The agent runtime should run as a dedicated non-root user by design. See [[security/hardening-checklist|Hardening Checklist]].

3. **No secrets on the command line. Enforcement: explicitly advisory prose (ARC-023) for the command-line/chat case this rule is really about — a secret only ever typed there, never written to a file, is invisible to any file scanner by construction, so no mechanical check catches that. The narrower config-file case is stronger: BC-30 shipped a repo-wide credential-pattern scan (`src/modules/secrets-scan.ts`, executable check) enforced at both pre-commit (`doctor:leaks`) and CI, catching a secret that lands in any committed file. (Corrected 2026-09-02, LH-08 — this previously claimed no scanner existed at all, which stopped being true once BC-30 shipped.)** Never pass API keys, tokens, or secrets on the command line, in chat, or in config files. Use SecretRef (env vars) and `read -s` for interactive input.

4. **This is a production system. Enforcement: explicitly advisory prose (ARC-023) — the no-shortcuts and rollback-plan requirements depend on engineering judgment; no check evaluates whether a rollback plan exists.** No "fix it later" shortcuts. No experimental changes without rollback plans.

---

## Documentation Rules

5. **Update `last_updated` frontmatter. Enforcement: explicitly advisory prose (ARC-023) — no lint validates frontmatter fields or verifies `last_updated` was bumped when a document changes.** whenever you edit a document. Every document must have YAML frontmatter with `audience`, `status`, `last_updated`, and `tags`.

6. **Log significant decisions in [[DECISIONS]]. Enforcement: explicitly advisory prose (ARC-023) — whether a decision is "significant" enough to log is a judgment call; `check:adr-references` verifies that ADR citations resolve, not that decisions get logged in the first place.** Use the next sequential ADR number. Format: Date, Status, Context, Decision, Reasoning, Rejected alternatives.

7. **Use wiki-links for cross-references. Enforcement: explicitly advisory prose (ARC-023) — no link-checker validates wiki-link usage or resolution across this repo's docs.** (e.g., `[[DECISIONS#ADR-NNN|Short Title]]`, `[[journal/YYYY-MM-DD-topic-slug|Session Label]]`). This enables knowledge graph visualization.

8. **Use Mermaid for diagrams. Enforcement: explicitly advisory prose (ARC-023) — no lint validates diagram block type or the generated-state-diagrams determinism convention.** (` ```mermaid ` blocks) for all flow charts, architecture diagrams, and sequence diagrams. Directory trees stay as plain code blocks. Spell output describing state the spell already computed — not authored, freehand explanatory content — additionally follows the **generated state diagrams** convention ([ARC-036](https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state)): a deterministic, data-derived Mermaid diagram built only from values already in scope, never modeled or invented. Skip it for one-line outputs, speed-rule spells, or any state with only a single reading — the diagram exists to make relationships between multiple already-computed values legible, not to decorate simple output.

9. **Journal files use date-prefix naming. Enforcement: explicitly advisory prose (ARC-023) — `checkSessionContinuity` only verifies `journal/.gitkeep` exists, not that individual journal filenames follow the date-prefix pattern.** `journal/YYYY-MM-DD-topic-slug.md` for chronological sorting.

---

## Git Rules

10. **Never auto-commit during interactive sessions. Enforcement: structured spell gate (ARC-023) — `spell-commit-work`'s Step 8 computes an approval fingerprint over the staged diff and message and halts until an authenticated operator response is tied to it before `git commit` runs.** Stage changes and present the proposed commit message for human approval before executing `git commit`. This applies to Copilot, Claude Code, Codex, and any other interactive AI tool. The human decides when to commit. Exception: autonomous agents at Magus+ power level may self-commit within approved scope.

11. **Use Conventional Commits format. Enforcement: explicitly advisory prose (ARC-023) — no commitlint or equivalent hook validates commit message format.** for all commit messages: `type(scope): description`. See [[governance/git-conventions|Git Conventions]] for types, scopes, and examples.

12. **Agent attribution trailers. Enforcement: explicitly advisory prose (ARC-023) — `spell-commit-work`'s Step 7 documents the required trailers, but no hook or CI check verifies they are actually present on a given commit.** are required on agent-authored commits (`Agent`, `Model`, `Model-Source`, `Provider`). `Persona`/`Role` are conditional — present only when a roster exists and one was assigned, never guessed. See [[governance/git-conventions#agent-attribution-model|Attribution Model]].

13. **For runtime config changes. Enforcement: structured spell gate (ARC-023), hedged — `spell-commit-work`'s Step 8 operator-approval gate covers this commit like any other before it can be made, though it verifies diff/message approval rather than a dedicated confirmation that testing occurred.** (anything touching the agent runtime's config files or service restarts): do NOT commit supporting docs until the user has confirmed the change is working. Stage and present — but wait for explicit approval after testing.

14. **Never commit directly to main. Enforcement: explicitly advisory prose (ARC-023) — `spell doctor`'s `checkPlatformBranchPolicy` verifies only the platform's merge-method policy (squash disallowed), not that direct pushes/commits to main are blocked.** All work — human or agent — happens on topic branches. Humans use `type/short-description`; agents use `{agent-slug}/type/short-description`. Main receives changes only through PR completion, not local direct merges. See [[governance/git-conventions#branch-discipline|Branch Discipline]].

---

## Spell Lifecycle

22. **Lifecycle operations run through their spell when one is installed. Enforcement: explicitly advisory prose (ARC-023) — invoking the correct spell instead of improvising depends on agent judgment; no check verifies that a matching spell was actually invoked for a given operation.** Committing, opening a PR, opening or closing a session, reviewing code, and shipping each have a dedicated spell (`spell-commit-work`, `spell-create-pull-request`, `spell-open-session`/`spell-close-session`, `spell-review`, `spell-ship`). When the installed component set includes the matching spell, invoke it for that operation rather than improvising the workflow from general knowledge — even when the user does not name the spell explicitly. The intent→spell routing table injected into each client's L1 instruction file (`CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`) is normative for this mapping, not illustrative.

---

## Recommendation Guardrails (ADR-034)

15. **Flag actionable recommendations. Enforcement: explicitly advisory prose (ARC-023) — whether a recommendation is flagged, sourced, and confidence-rated depends on judgment; no automated check evaluates response content against this policy.** Any recommendation that could lead to a purchase, subscription, account creation, or irreversible action must: (a) be flagged explicitly, (b) use verified current information — never assume or fabricate, (c) present free/no-cost alternatives when they exist, (d) state confidence level if based on general knowledge. For >$50 or contracts, require explicit confirmation. See [[agents/agent-policies#actionable-recommendation-policy-adr-034|Full Policy]].

---

## Screenshot Curation

24. **Curate screenshots — not every screenshot needs saving. Enforcement: explicitly advisory prose (ARC-023) — which screenshots to keep is a judgment call; no check evaluates screenshot-retention decisions.** Use these heuristics:
    - **Save** when it shows a completed setup, config state, UI result, or evidence of a problem/fix.
    - **Save** when the user explicitly says "save this" or "add this to docs."
    - **Save key decision points and final states** in multi-step flows; skip intermediate steps.
    - **Don't save** external reference material, transient troubleshooting, or items marked "just for reference."
    - **When ambiguous, save it** — easier to delete than to re-paste.
    - Saved screenshots go to `assets/screenshots/YYYY-MM-DD/` with descriptive lowercase-with-dashes filenames.
    - Never save screenshots containing secrets, API keys, tokens, or PII.

---

## Sensitive Repositories

21. **Reference, don't transcribe, when the repository is marked sensitive. Enforcement: explicitly advisory prose (ARC-023) — whether written output cites versus transcribes sensitive content depends on judgment; no check scans agent output for this distinction.** If
    `.arcane.json` has `content_sensitivity: "sensitive"`, the repository's own
    documents are the sensitive material — not just credentials inside them. In
    that mode:
    - **Cite paths, never contents.** Write "see `records/2024/lease.md`", not a
      quotation, summary-with-details, or paraphrase of what it says. This
      applies to journal entries, decision records, commit messages, PR
      descriptions, and TODO items alike — every one of those is a durable,
      often-published artifact that outlives the session.
    - **Retain no screenshots of repository contents.** Read them, act on them,
      then do not save them. The screenshot-curation heuristics above are
      superseded here: "when ambiguous, save it" inverts to "when ambiguous,
      don't."
    - **A sanitized summary is still permitted where it carries no recoverable
      detail** — "three lease agreements, one expiring this quarter" is fine;
      naming the parties, addresses, sums, or dates is not.
    - This is a governance default, not an access control. It constrains what
      agents *write down*; it does not restrict what they may read, and it is
      not a substitute for repository permissions or the push-safety controls in
      `git-conventions.md`.
    - Absent or `"standard"` means normal behaviour — this rule adds nothing.

---

## Naming Conventions

16. **Three naming tiers — never mix them. Enforcement: explicitly advisory prose (ARC-023) — `spell ward` and `org-token-lint` scan for denylisted org/venture/customer names, not for adherence to this tier taxonomy; no check verifies tier consistency.**

| Tier | What | Style | Examples |
|------|------|-------|---------|
| Machines | Physical hardware | Iconic character names | Atlas, Voyager |
| AI Agents | Autonomous agents | Persona name + role title | Merlin — CTO, Kellar — Product Ops |
| Systems/Services | DBs, APIs, tools | Functional `[slug]-[function]` | `inventory-api`, `orders-worker` |

17. **Projects and repos follow a consistent naming convention. Enforcement: explicitly advisory prose (ARC-023) — no check verifies TitleCase/kebab-case consistency across projects and repos.** Pick one (TitleCase or kebab-case) and apply it uniformly across your org.

---

## Operational Rules

18. **TODO.md is a scratchpad. Enforcement: explicitly advisory prose (ARC-023) — `checkSessionContinuity` verifies TODO.md exists, not that resolved items are removed from it.** Resolved items move to the relevant doc, then get deleted from TODO.md.

19. **After any onboarding or config wizard. Enforcement: explicitly advisory prose (ARC-023) — no wizard or check re-validates authentication and network-exposure settings after configuration changes.**, re-validate authentication and network-exposure settings — wizards can silently downgrade security settings.

20. **For repo path requests. Enforcement: explicitly advisory prose (ARC-023) — performing read-only discovery before claiming no access depends on agent judgment; no check verifies this behavior occurred.**, perform read-only discovery before claiming "no access." Use [[agents/agent-approved-paths|Agent Approved Paths Registry]].

23. **Diff before deleting a "duplicate." Enforcement: explicitly advisory prose (ARC-023) — the branch-specific case this generalizes from has a structured procedure (git-conventions.md's Content-Verified Branch Deletion), but no equivalent structured check exists for arbitrary documents, configs, or data files.** When housekeeping surfaces two blocks of content that look
    like duplicates — in a document, a config, a data file — compare them in full before removing
    either. A near-identical pair is usually a **drifted copy carrying unique content in one and not the
    other**, not byte-identical redundancy; deleting on sight can destroy the unique content silently.
    Merge anything unique to either copy into the one that survives, and only delete a copy confirmed
    byte-identical to (or a confirmed strict subset of) the one kept. This generalizes the same
    content-verification discipline
    [[governance/git-conventions#content-verified-branch-deletion-todomd-merged-branch-cleanup-finding|Content-Verified
    Branch Deletion]] already applies to branches specifically.

25. **Never quote a denylisted token, even when documenting its removal. Enforcement: explicitly advisory prose (ARC-023) — the org-token gate itself is a CI-only executable check; nothing local catches an agent re-typing the flagged string, which is exactly the failure mode this rule addresses.** A privacy-denylist gate (e.g. `ARCANE_ORG_TOKENS`, ARC-031) can only scan for the literal string it's configured to catch — it cannot tell "quoting a leak to explain the fix" from "the leak itself." Confirmed live: a real client name leaked into shipped content, was fixed, and the commit message describing that fix quoted the same name while narrating its removal — retriggering the identical CI failure minutes later. When describing a leak or its removal, name the class of thing that leaked ("a real client name," "an internal machine name") rather than repeating the flagged string, in commit messages, journals, and any other content a portability gate scans.

26. **A zero-match search is evidence about the pattern, not the thing. Enforcement: explicitly advisory prose (ARC-023) — recognizing that a search's own shape (case sensitivity, exact wording, scope) can produce a false negative depends on agent judgment; no check re-runs a prior search with a different shape before a conclusion is accepted.** Concluding "X doesn't exist" or "X is still true" from one grep, one case-sensitive match attempt, or one narrowly-worded query treats the search as if it were exhaustive. Confirmed live: a case-sensitive grep for a lowercase term missed a real match spelled with a capital letter, producing an on-the-record false "still open" conclusion about an item that had, in fact, already shipped. Before stating an absence as fact, run at least one differently-shaped search (case-insensitive, a synonym, a broader scope) and say which searches actually ran, rather than reporting the first search's silence as the answer.

27. **Dispatched-agent supervision: review the diff, not the summary. Enforcement: explicitly advisory prose (ARC-023) — no subagent registry or diff-review gate ships in this repo; supervising a dispatched agent's actual output, rather than trusting its self-report, depends on the dispatching agent's own judgment.** A dispatched agent's summary describes what it intended to do, not necessarily what it did — verify by reading its actual changes before reporting the work as complete. When multiple agents edit concurrently, assign at most one agent per file to avoid silently-overwritten or merge-conflicting work. A dispatched agent may override an instruction it was given after independently verifying that instruction is wrong for the situation at hand — but it must say so explicitly on the record, not silently substitute its own judgment.

---

## Client-Specific Instruction Locations

| Client | Instruction File | Notes |
|--------|-----------------|-------|
| GitHub Copilot | `.github/copilot-instructions.md` | Auto-loaded by Copilot in workspace |
| Claude Code (CLI) | `CLAUDE.md` | Auto-loaded by Claude Code in repo root |
| Codex | `AGENTS.md` | Auto-loaded by Codex in repo root |
| Your agent runtime | [[agents/agent-policies]] | Loaded via agent config |
| Ad-hoc chat clients | [[ai-context/portable-bootstrap]] | Copy-paste into conversation |
| Any new tool | This file | Read this, then follow links above |
