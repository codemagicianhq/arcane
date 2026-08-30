# 2026-08-30 — Generated State Diagrams: From a Drift Question to ARC-036

## Session: A consumer-repo question ("why isn't this a picture?") promoted into a framework feature the same day

### Prompt Context

Opened in arcane-website (a consumer repo) with `spell-open-session`, which surfaced two-axis version drift: managed files at 0.14.0, installed CLI at 0.21.1, npm latest at 0.22.1. While the drift was being resolved, the operator asked why the two-axis situation needed paragraphs instead of a picture, sketched git-branch-style mermaid timelines, and asked to formalize it as a framework feature through the Arcane process — explicitly asking to have each process step named as it ran, to learn the tool. Planning ran in the consumer session (two exploration passes over both repos plus a design pass); promotion then executed here on `sessions/2026-08-30-generated-state-diagrams`.

### What Got Done

1. **Captured** the feature plus a link-hygiene side-finding in `IDEAS.md` (`spell-save-idea`; real-clock timestamps), dedupe-checked it (`spell-suggest-feature` — zero mermaid/diagram hits in `TODO.md`/`DECISIONS.md`), and routed it with `adr-candidate` classification (Type `adr-candidate`, Domain `prompts`, Scope `feature`) alongside a tech-debt item on stale CLAUDE.md version-bump citations (`spell-todo`).
2. **Formalized** [features/generated-state-diagrams/PRD.md](../features/generated-state-diagrams/PRD.md) (`spell-plan`, following the handoff-durability house style): three tiers phased as R1–R11 — Tier 1 the deterministic two-axis `gitGraph` in `spell-open-session`/`spell-arcane-version`; Tier 2 CLI parity (also closing the missing axis-A comparison in `src/commands/status.ts:91-99`, where all three values are in scope but never compared) plus topology adopters; Tier 3 harmonization of the three existing freehand prescriptions under one convention with an applicability guard. The PRD embeds the worked gitGraph from the seeding incident.
3. **Accepted [ARC-036](../DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state)** — generated state diagrams as an additive extension of universal-agent-rules rule 8; naming grep clean; IDEAS entry flipped to `promoted`.
4. **Committed (`ccf7dc1`) and opened [PR #84](https://github.com/codemagicianhq/arcane/pull/84)**; docs-only, so the version-bump gate stayed quiet; the pre-push hook ran the full suite (699 passed, 2 skipped). The operator merged it (`b981972`) while the adversarial review round was still running; post-merge cleanup (main fast-forwarded, session branch pruned both sides) verified rather than assumed.
5. **Adversarial review completed post-merge: BLOCKER-FREE.** Every `file:line` claim in the merged content survived attack. Six findings (3 MEDIUM confirmed, 1 MEDIUM plausible, 2 LOW). This close PR fixes the four content findings — the bump-type wording (`spell-bump`'s own table says patch for existing-asset content updates, not minor), `spell-bump.prompt.md:12` reclassified from "live home of the rule" to a third stale CLAUDE.md citer (a shipped one, so its fix is version-bumped implementation work), the Should-Have heading widened to cover R11's Tier-3 row, and `spell-security-review` reclassified from Tier-2 deterministic adopter to Tier-3 agent-authored analysis — and this journal itself heals the dangling `Verified:` link finding by landing at exactly the promised path.
6. **Website close-out** (consumer repo): the TODO seed moved to Completed with canonical GitHub URLs, a positioning item ("the methodology that draws its own state") planted under the existing self-documentation story, and [PR 791](https://dev.azure.com/codemagicianllc/arcane/_git/arcane-website/pullrequest/791) opened carrying the session's four commits (drift fixes, the 0.14.0 → 0.22.1 managed-files update, the idea seed, the promotion close-out).

### Decisions Made

| ADR | Decision | Rationale |
| --- | --- | --- |
| [ARC-036](../DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state) | Spell output describing computed state emits a deterministic, data-derived Mermaid diagram under one named convention ("generated state diagrams"), an additive extension of rule 8 with an applicability guard | The values are already computed — a string template adds no model judgment and no new failure mode; markdown-native rendering (VS Code chat, GitHub, Obsidian; readable source in terminals) matches the no-lock-in pillar; one referenced convention beats per-spell prescriptions; no other AI dev framework auto-visualizes its own governance, version, or session state |

### Lessons Learned

#### The merge outran the review round — ARC-035's gap has a live twin

The operator merged PR #84 while the adversarial review was still running. The verdict came back BLOCKER-FREE, but the shape is exactly what ARC-035 exists for: CI green said nothing about a round in flight, and the round had no platform signal to hold the merge — ARC-035's `Review round clear` required check is Accepted but not yet implemented. The findings became post-merge fix-ups in this close PR instead of pre-merge amendments; cheap this time, not guaranteed cheap.

#### A promised journal filename is a contract, not a guess

ARC-036 shipped with `Verified:` pointing at this file before it existed, and repo precedent shows close-date/slug drift is real (the 2026-08-25 session's journal landed under 2026-08-27 with a different slug). This session healed the link by closing the same day under exactly the promised name. Next time: either add the `Verified:` link in the close PR that creates the journal, or treat the promised filename as a contract the close must honor.

#### "Data already gathered" is not "deterministic"

R10 originally put `spell-security-review`'s trust-boundary diagrams in deterministic Tier 2 on the strength of "emits from data already gathered" — but analysis output is model judgment even when every input is on disk. The tier boundary is *recorded state vs analysis*, not *available data vs new data*. Reclassified to Tier 3, and the Won't-Have's "no model-judgment diagrams in Tiers 1–2" now holds without exception.

### Open Items Carried Forward

- Tier-1 implementation PR per the TODO execution route: rule-8 additive extension + both prompt templates + `test/prompt-diagram-emission.test.ts`, with the version bump typed per the spell-bump table and `fix:self-host-parity`.
- R8 CLI PR (the `src/modules` generator + the `status.ts` axis-A fix + the TTY open question); Tier-2 adopter batches after.
- LOW review finding on the IDEAS link-hygiene entry: bare-ID vs full-URL vs extending `framework-decisions.md`/`check-distributed-adr-references.ts` to ARC ids — resolve at triage.
