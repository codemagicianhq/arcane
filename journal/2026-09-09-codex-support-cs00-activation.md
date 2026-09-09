# 2026-09-09 — Codex Support: Scoping, Plan Design, and CS-00 Activation

## Session: Open session, design the Codex Support plan, activate it as CS-00

### Prompt Context

Session opened with `/spell-open-session`, no focus argument. The workspace was already mid-flight:
current branch `sessions/2026-09-09-codex-support-scoping` with a staged, draft
`features/codex-support/PRD.md` (created 2026-09-08 via `spell-manifest`, promoting an operator
idea), not reflected in the 2026-09-06 handoff at all — three commits had also landed on `main`
since that handoff was written. Flagged and annotated on the handoff itself rather than silently
corrected, per the repo's own working protocol.

The user then asked to discuss the PRD's own open question — SKILL.md vs. a Codex-specific
generation path vs. a distribution-model change — explicitly asking for a plan, not code, and
raised a second, previously undocumented problem along the way: opening multiple Arcane repos in
one VS Code workspace duplicates every spell and agent per folder (10 repos → 410 prompt entries,
120 Arcanos agent modes). Follow-up turns added: whether to remove repo-committed distribution
entirely in favor of a `node_modules`-style restore model (gitignored, materialized by a build
step); whether a machine-level (all-users) install scope was missing; and whether the existing
Copilot/Claude spell pair is already duplicated or whether Claude already references Copilot's
files (it does — confirmed, and the user directed that Codex get the same treatment: every client
becomes a thin generated shim over one client-neutral canonical source, not a third inlined copy).
After the plan was approved, the user asked to run `spell-full-cycle` epic by epic, autonomously,
at their own green light — given after a preflight readiness check surfaced no blockers beyond the
now-known model-switch request. They then switched from `claude-fable-5-1` to `claude-sonnet-5` and
said "defaults, let's go."

### What Got Done

1. **Session opened and the stale handoff reconciled.** `ai-context/system-prompt-context.md`'s
   2026-09-06 handoff was marked `✓ Consumed: 2026-09-09` with an explicit note that it understated
   in-progress work (the durability check on its two cited `TODO.md` items passed; the "nothing in
   progress" framing did not match observed git state).
2. **Explored the current distribution mechanics and prior decisions/research** via two parallel
   Explore agents: confirmed every spell ships as a Copilot-prompt/Claude-stub pair with no
   `SKILL.md`/`.agents/` anywhere in the codebase; confirmed the Claude stub is already a thin
   `@include` shim over the Copilot file; found the only existing out-of-repo write is OpenClaw's
   `~/.openclaw`; and confirmed [OPERATOR-QUEUE.md Q-010](../docs/plans/become-current/OPERATOR-QUEUE.md#q-010--decide-whether-to-pursue-a-package-referenced-distribution-model)
   had parked the restore-model question as "entirely unevaluated."
3. **Designed and iterated the plan through three rounds** in Plan mode, incorporating: the
   client-neutral canonical-source redesign (`.arcane/spells/`), a user-level install tier, a
   `spell_scope` repo opt-out, removing a machine-level scope the operator decided against, and
   scoping the restore-model question as a research spike (CS-08) rather than folding it into
   implementation. Approved as an 8-epic (CS-00–CS-08) program plus a consolidated CLI-surface
   summary table the user asked for explicitly.
4. **CS-00 executed and shipped as [PR #220](https://github.com/codemagicianhq/arcane/pull/220)**
   (open, CI in progress at session close — not yet merged):
   - `features/codex-support/PRD.md` completed via `spell-plan` (Requirements, Acceptance Criteria,
     Constraints, Dependencies, Target Users).
   - `docs/plans/codex-support/PLAN.md`/`KICKOFF.md`/`OPERATOR-QUEUE.md` produced via `spell-scope`
     (Program-scale classification), following Become Current/Lessons Hardening/Show Report's own
     program shape rather than `spell-scope`'s bare `execution-plan.md` template — noted explicitly
     as a deliberate adaptation, not silent drift from the spell's stated output.
   - `.arcane/delegations.json` gained the `codex-support-plan` entry, inert until CS-00 merges.
   - `docs/research/skill-discovery-smoke-tests.md` — CS-00's own empirical-first step, run against
     the real installed `codex-cli 0.153.4` (the binary exists at a path recorded in the user's own
     `config.toml`, not on `PATH` — found by reading that file rather than assumed absent). Three
     live `codex exec` probes against a disposable repo confirmed: Codex discovers skills at both
     `.agents/skills/` and `.codex/skills/` (repo level) with no collision; a real, pre-existing
     user-level skill at `~/.agents/skills/azure-app-onboard` was independently picked up, proving
     user-level discovery too; and — the load-bearing result — a skill body instructing Codex to
     "read `<repo-root-relative path>` and follow it as the complete workflow" worked end to end, a
     real shell read followed by exact compliance with the referenced file's instructions. This
     directly validates CS-01/CS-03's shim mechanism with live evidence, not inferred behavior.
   - Also found, from this session's own Claude Code available-skills listing (no probe needed):
     Claude Code (this session) reads user-level `~/.claude/skills/` but did not surface
     `~/.agents/skills/`, despite real, well-formed skills existing there.
5. **Found and fixed a real bug in the Show Report golden-parity gate**, exposed because
   `codex-support` is the first *active* (non-`complete`) program that gate has ever processed:
   `getCloseCommit()` falls back to live `HEAD` when a program has no `completed:` date, so the
   `cast` count is a moving target — the commit that adds/updates a program's own
   `show-report.json` is itself counted on the next regeneration, making the just-committed file
   immediately stale. Worked around (not root-caused) by omitting the `Agent:`/`Persona:` trailer
   on any commit whose sole content is a report regeneration, mirroring how "Arcane vendored
   scaffold/update" commits already omit those trailers — verified this actually produces a stable
   fixed point across two regeneration cycles. Documented as a new `TODO.md` item under
   **Show Report** rather than fixed at the source (real fix needs a design decision and touches
   `src/modules/show-report/generate.ts`'s core model — out of scope for a docs-only session).
6. **Full suite verified green multiple times** (1246 passed, 2 skipped, 84/84 files) — once after
   the initial CS-00 commit surfaced the report-cli failure, once after the first regeneration (which
   turned out to still be wrong), and once after the trailer-omission fix, so the final push carried
   an independently re-confirmed green state, not a trusted-once result.

### Decisions Made

No new ADRs this session — ARC-045 (the canonical-source/user-tier decision) is scoped as CS-02, a
future epic gated on CS-01 shipping first. This session's decisions are process/scoping choices
recorded directly in `docs/plans/codex-support/PLAN.md` rather than `DECISIONS.md`: the Coverage
Map, the Authority & Delegation exclusions (notably that CS-03's merge stays operator-only even
after the standing delegation activates, since it auto-publishes to npm), and the sequencing that
puts the restore-model spike (CS-08) last and research-only.

### Lessons Learned

**A CLI that "isn't on PATH" may still exist and be directly invocable.** The initial assumption
that Codex CLI verification was out of reach (no `codex` command found in Bash or PowerShell) was
wrong — the real binary was findable by reading the user's own `~/.codex/config.toml`, which
referenced its own path via `CODEX_CLI_PATH`. This turned an assumed-unverifiable acceptance
criterion into three real, decisive, empirical tests. The general lesson: before writing off a
verification as "needs the operator's own client," check whether the tool is merely unlisted on
`PATH` rather than genuinely absent — installed desktop apps commonly bundle a real CLI.

**A golden-parity gate built and tested only against completed programs can hide a structural
assumption until an active program exercises it.** `getCloseCommit()`'s live-`HEAD` fallback was
never wrong for Become Current, Lessons Hardening, or Show Report, because none of them generated
a report before their `completed:` date existed. The bug was latent, not absent, and surfaced the
moment this session tried to do something those three programs never did: commit a report for a
program still at 0% complete. Worth remembering for any future gate that has only ever been
exercised by one class of input.

**Marking a plan epic's checkbox `[x]` before its PR actually merges is a real category of
"inventing a completion."** Caught mid-edit in this same session: `docs/plans/codex-support/PLAN.md`
was momentarily edited to tick CS-00 done while [PR #220](https://github.com/codemagicianhq/arcane/pull/220)
was still open with CI pending. Corrected before it was committed, but worth naming as a mistake
made, not just a check that happened to catch nothing — `spell-close-session`'s own step 1b
vocabulary exists precisely to prevent this, and it is easy to reach for `[x]` out of habit once a
PR exists at all, rather than once it is actually merged.

### Open Items Carried Forward

- **[PR #220](https://github.com/codemagicianhq/arcane/pull/220) — dispatched, not yet merged.**
  Last checked via `gh pr checks 220`: `PR branch is rebased on target` and `Review round clear`
  both passed; `Lint, typecheck, test, build` was still `pending` at last check. Verification
  action: re-run `gh pr checks 220` (or check the PR page directly) before merging — do not assume
  it went green just because the local pre-push run did.
- **Merging CS-00 is the next concrete action** (registered at
  [OPERATOR-QUEUE.md Q-001](../docs/plans/codex-support/OPERATOR-QUEUE.md#q-001--merge-cs-00)) —
  this is what activates the `codex-support-plan` standing delegation for every later epic.
- **CS-01 (Codex shim, repo tier) is next in the Coverage Map** once CS-00 merges — fully specified
  in `docs/plans/codex-support/PLAN.md`, no open design questions left after this session's
  empirical work.
- **The Show Report self-count gap** ([TODO.md](../TODO.md), under Show Report) has no code fix yet
  — needs an operator decision on approach (freeze cast at generation time vs. exclude active
  programs from the gate) before anyone attempts it.
