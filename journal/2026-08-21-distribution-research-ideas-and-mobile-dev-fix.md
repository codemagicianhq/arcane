# 2026-08-21 — Distribution-Model Research, IDEAS Promotion, and the mobile-dev Agent Fix

## Session: Reconcile a months-old distribution rethink and fix a consumer-found agent bug

### Prompt Context

Resumed a long-dormant session that began as "set up OBS and record a demo of Arcane in VS Code." The demo setup surfaced that Arcane was not yet dogfooding its own governance tree, which the operator turned into a from-scratch rethink of Arcane's distribution model — explicitly asking to question the premise (file-copy vs AI-native delivery) and judge options against adoption, maintainability, discoverability, and best practices. Returning to the session much later, the operator asked to reconcile the old research against the current tree before promoting anything, then to capture a separate consumer-repo bug via `spell-bug`, and finally to close the session.

### What Got Done

1. Ran a five-strand research pass on distribution (upgrade prior art, AI-native delivery channels, editor path-resolution constraints, Arcane's current internals, competitive landscape). Key external findings: copier 3-way merge and Angular `ng update` migrations as the two mechanisms that update user-edited files; MCP prompts as the only single-artifact both-client (Copilot + Claude Code) slash-command path; Claude Code plugin marketplaces and portable Agent Skills as native channels; Microsoft APM as a cross-tool package manager for exactly Arcane's payload; AGENTS.md as a Linux-Foundation cross-tool standard; and that the "editor files must sit at fixed repo paths" assumption is false (`chat.*FilesLocations`, plugins, documented symlinks).
2. Reconciled the (v0.13.0-era) findings against current `v0.15.8`: dogfooding and the source↔dogfood parity guard are **done** (ARC-026, ARC-027 supersede ARC-006); the acute `arcane update` data-loss is fixed (EF-25); AGENTS.md merge exists. Still open / net-new: the general overrides-survive-update model (ARC-019 follow-up / ARC-020), the ARC-012 YAML→`.agent.md` render parity, the spell command/prompt dual-copy, and every AI-native delivery channel (MCP / marketplace / Skills / APM).
3. Promoted only the surviving, net-new slice into [IDEAS.md](../IDEAS.md) as three entries (`#distribution`, `#governance`, `#spell-compiler`), cross-linked to the open threads, and merged them via [PR #44](https://github.com/codemagicianhq/arcane/pull/44) at `1dc990b`. Deliberately did **not** author a new ARC (ARC-017 is taken; convention is idea→triage; overlaps the pending disclosure-model idea and ARC-028/029).
4. Ran `spell-bug` on a consumer-repo finding: `spell agents init`/`sync` silently drops the `mobile-dev` role. Diagnosed the root cause against source and reproduced it with the real loader: `src/assets/agents/mobile-dev.yaml` had an unquoted colon-space in a `behavioral_rules` item, so YAML parsed it as a mapping; `validateAgentDefinition` rejected the array, `loadAgentDefinition` threw, and `agent-generator.ts:176` swallowed it as "definition not found," dropping Mercurio from every client output with a zero exit code.
5. Fixed it by quoting the value, added [test/bundled-agents.test.ts](../test/bundled-agents.test.ts) (loads every shipped `src/assets/agents/*.yaml` and asserts all validate), captured the bug in [TODO.md](../TODO.md), and released `v0.15.9` via [PR #45](https://github.com/codemagicianhq/arcane/pull/45) at `818ea71`. Split the "fail loudly on unresolved roles" hardening into its own open TODO item.

### Lessons Learned

#### Reconcile a stale plan against HEAD before acting on it

Half of the old distribution research was already solved on `main` (dogfooding via ARC-026, source↔dogfood parity via ARC-027, the acute update data-loss via EF-25). Promoting the plan verbatim would have re-filed solved problems and claimed a taken ARC number. The reconciliation pass — checking each finding against the current tree — is what separated the ~20% still-valuable signal from the stale alarm.

#### I asserted from memory twice and was wrong twice

I told the operator the demo "was never recorded" without checking `G:\Data\Videos` (two clips existed), and I called CRLF line endings the mobile-dev "smoking gun" before running the loader (every template is CRLF; the real cause was the colon-space YAML mapping, confirmed only by reproducing). Both were corrected on the record after actually looking / reproducing. This is exactly the failure the repository Working Protocol Rule 5 and the verification-ledger idea target: a summary of state is not evidence of state — check first, then assert.

#### A distributable change is not free — the version-bump gate is load-bearing

The first mobile-dev PR failed CI on `check:version-bump`: `src/assets/` is distributable, so `package.json` had to bump. The gate correctly caught it; the fix was a patch release (`v0.15.9`) plus a CHANGELOG entry. Any change under `src/assets/` needs the bump in the same PR.

### Open Items Carried Forward

- **New:** `spell agents sync`/`init` should fail loudly (non-zero exit) on an unresolved role — split from the mobile-dev fix, open in [TODO.md](../TODO.md).
- The three 2026-08-21 [IDEAS.md](../IDEAS.md) distribution entries await triage via `spell-todo`/`spell-suggest-feature`; coordinate with the pending disclosure-model idea and ARC-028/029 to avoid a topic collision.
- Prior open items remain: EF-05, EF-08, EF-20, EF-21, EF-32, EF-33, and the `spell-sync-pull-request` MEDIUM feature.
