# TODO

<!-- Arcane session-continuity file. Managed by spell-close-session and spell-open-session. -->

## Open Items

<!-- Add task items here during sessions. Mark completed with [x] and date. -->

- [ ] **Add a `spell-eas-ios-deploy` prompt** (new `.github/prompts/spell-eas-ios-deploy.prompt.md`, plus `src/assets/.github/prompts/` source copy + `registry.ts` entry — following the `spell-dotnet-expert.prompt.md` stack-expert pattern) documenting the Expo/EAS iOS App Store deployment pipeline end to end. Deliberately scoped to the **EAS Build + EAS Submit** tech stack specifically — not a build-method-agnostic skill (no local Xcode, Xcode Cloud, or Fastlane coverage) — since that's what keeps the steps concrete and copy-pasteable. App-specific values (bundle identifier, Apple Team ID, App Store Connect App ID, Apple ID email, EAS project ID/slug, org name) are placeholders so a fresh session in any Arcane-consuming Expo repo can execute it verbatim. Dogfooded for real on a consumer repo's first-ever TestFlight build+submit (2026-07-08). Must cover, in order:
  - **Initial one-time setup:** Apple Developer Program enrollment prerequisites; creating the App Store Connect app record (name, bundle ID, SKU, user access); `eas.json` build + submit profile structure (`appVersionSource: "local"`, `production.autoIncrement: true`, `submit.production.ios` block with `appleId`/`ascAppId`/`appleTeamId`); generating remote EAS-managed credentials (Distribution Certificate, Provisioning Profile, Push Notifications key — no local Mac/Xcode needed); creating the App Store Connect API key (role selection, EAS-managed vs. manually uploaded) for non-interactive submits; manual capability toggles in the Apple Developer console for cases where EAS's automatic capability-sync fails against an already-linked ASC app record.
  - **Repeat deployments:** `eas build --platform ios --profile production` → `eas submit --platform ios --profile production --latest`; how build numbers auto-increment (no manual version bump needed with the above `eas.json` config); realistic wait times (build ~10-20min, Apple binary processing ~5-10min before visible in TestFlight).
  - **Known pitfalls + fixes**, hit dogfooding this exact flow on a real app: `EXPO_NO_CAPABILITY_SYNC=1` env var workaround for "Failed to patch capabilities: X ON, Y OFF" (happens when an ASC app is already linked to the bundle ID and Apple rejects the capability sync — fix is manual capability toggles in the Apple Developer console Identifiers page instead); re-running the exact same `eas build` command after EAS auto-installs `expo-updates` mid-build ("Command must be re-run to pick up new updates configuration"); retrying `eas submit` on a transient Apple "Internal Server Error" during App Store Connect API key creation (clears on simple retry, no code change needed).

  Backlog only — do not write the skill content yet.

- [ ] **`spell update`: manifest-diff orphan report + `--prune` flag.** Field test #1 surfaced that the current update is additive-only and left stale spells behind. Add a manifest-diff pass that reports orphaned managed files (present in the repo but no longer in the source manifest) and a `--prune` flag to remove them safely.

- [ ] **`spell-commit-work`: disclose full plan incl. PR auto-complete; gate completion on Magus+.** Field test #1 hit an unexpected self-merge. The spell must disclose its full plan up front (including any PR auto-complete step) and gate PR completion behind the Magus+ ladder rung.

- [ ] **`doctor`/`ward`: verify platform branch policies match the declared ladder.** Detect paper-vs-enforced governance drift — confirm the actual platform branch policies align with the ladder declared in config, and flag mismatches.

- [ ] Agent autonomy UX: solo-operator mode — self-approve delegation was granted ad hoc and forgotten; make delegations explicit, listable (spell doctor?), and revocable per repo without becoming PR friction for solo devs

- [ ] visual_description: declared but not yet rendered — KEEP with agent definitions by design (data with the definition, rendering with the renderer). DMC is renderer #1; document the field in the roster schema so third-party renderers can consume it. Extensibility seam, not dead metadata.

- [ ] **Concurrency model: parallel work for solo operators (research spike → ADR).**
      Problem: one working tree = one thing at a time; a live session had its
      branch switched underneath it mid-run (2026-07-10 incident — this exact
      failure class). Evaluate: git worktrees (what Claude Code / Copilot agent
      UIs use), multiple clones, plain branches, or an Arcane-native model
      nobody has shipped yet. Untangle the four colliding "workspace" terms
      (git worktree · VS Code workspace · Codespaces · OpenClaw workspace) and
      pick ONE Arcane word for the concept — lore-eligible, Naming Test applies.
      Constraints: near-zero friction for solo devs; DMC must be able to render
      N concurrent sessions as a control center; passes the brother test — a
      non-technical user should never fear the button. Output: ADR proposing
      the model BEFORE any implementation; this changes core architecture.

- [ ] **Website spell catalog: generate from the CLI registry, not hand-maintained
      site data (single source of truth).** The `arcane-website` spell catalog is
      authored by hand and drifts from the CLI's actual source of truth
      (`src/modules/registry.ts` + `src/assets/.github/prompts/*.prompt.md`, 33 spells
      at v0.13.1). The `elevate` miss was exactly this drift class — a spell present in
      one place but not reflected in the other. Fix: generate the website catalog from
      the CLI registry so there is one source of truth. Note the same pattern lives
      _inside this repo_ — the README's hand-listed catalogue (`README.md`, the
      "33 spells" count + the `<details>` spell list) is maintained by hand too; a
      registry-driven generator should emit both the README block and the website data
      from the same source. Scope the generator + a CI drift-check that fails the build
      when hand-maintained catalogs diverge from the registry.

- [ ] Persona schema: add `epithet` field to agent YAML + openclaw-roster generation (schema v2 already shipped; optional field) — website cards, DMC roster/cards, and README then all READ it. Data with the definition.

- [ ] Lore capture — **Prospero's insignia.** He wears an early Arcane emblem on his
      chest: one of the first insignias of the Arcane universe, still worn proudly by the
      Stormcaller. Record in his `prospero-image-prompt.md` namesake notes and in the
      Arcanos Codex; keep the emblem consistent across avatar, avatar-full, and hero.
      (Replaces the original "A" mark — 2026-07-12.)

- [ ] **New spells `ward` + `scry`**. `spell ward` — local IP/trademark leakage scan of a repo: denylist + word-boundary grep across tree, filenames, and binary asset strings; substring-hazard exclusions (author/provision class); flags grep-proof media (GIF/PNG/MP4/audio) for manual review; CI-gate mode. `spell scry <term>` — live external name clearance: web-search the term across software/app/AI/game contexts, classify hits (same-space / adjacent / out-of-space), apply the four checks (who coined it · is an estate still trading · same-audience giants · first-association salience per market) and return pass / pass-with-disclosure / kill with sources. Ward finds what leaked in; Scry clears what goes out. **Ward must ship with a vendor-identifier denylist** — automated renames can corrupt vendor identifiers (e.g., third-party model ids) and self-consistent mocks will bless the corruption.

- [ ] Copy pass: branded surfaces say **"the Arcanos"** where "roster" appears as a _title_ — DMC panel done ("THE ARCANOS | ARC"); the website's "SUMMON THE ROSTER" headline is the next candidate. Generic prose uses of "roster" stay.

- [ ] `update.ts` docstring claims `.bak` backups; code force-overwrites (update.ts:81 → copier.ts:51-69). Fix with the --prune rework: implement or delete the claim — never ship a lying docstring
- [ ] CI parity gate: regenerate bundled `.agent.md` from canonical YAML and diff — parity is currently discipline, not enforcement. This is **[ARC-012](DECISIONS.md#arc-012--generated-distributable-artifacts-require-a-parity-guard)** (accepted 2026-06-20) never implemented, rediscovered independently via the 2026-07-11 strengths audit (Tier 3 #2) — implement the decision, don't re-decide it.
- [ ] Org-token portability lint is wired but its pattern list ships EMPTY (copy-assets.ts:78) — populate or remove the dead mechanism
- [ ] Roster loaders cast without validation (agent-loader.ts:53,93) — schema_version exists but nothing gates on it; add validation + migration path
- [ ] naming-conventions.md corollary: reword "the more boring its name" → "the plainer/clearer its name" (both trees) — positive framing, owner's call

- [ ] **BUG (confirmed — DATA LOSS): `arcane update` force-overwrites session-continuity user content.** `update.ts:81/92` copies every managed file with `{ force: true }`, and the `session-continuity` component (`registry.ts:169`) lists `TODO.md`, `DECISIONS.md`, and `ai-context/system-prompt-context.md` — all user-authored. So every `arcane update` destroys accumulated TODOs, decisions, and handoff context, with **no backup** (the `.bak` the update.ts docstring promises doesn't exist — see the "lying docstring" item above; the two are the same root cause). Fix: session-continuity (and any user-content / scaffold-once file) must be **install-once** — on update skip if the destination already exists (don't pass `force`), or add a `preserveOnUpdate` / `scaffoldOnly` flag to the registry that `update.ts` honors. Ship a regression test: `init` → edit `TODO.md` → `update` → assert the edit survives. Reported from the field 2026-07-14 (operator hit this on a consumer repo).

- [ ] **Make Arcane customizable + vendor-neutral for open-source users — and preserve customizations across updates.** Now that Arcane is public, it bakes in our stack (Azure CAF naming, GoDaddy, our governance). For other adopters: (a) a documented **customization / override model** — extend or replace governance, spells, and naming standards for your own cloud/tools/preferences — that **survives `arcane update`** (same root cause as the data-loss bug above: user-modified managed files must not be clobbered). (b) `naming-conventions.md` currently encodes our Azure convention — consider a vendor-neutral core + **pluggable vendor profiles** (Azure / AWS / GCP / Netlify / Vercel …), each linking that provider's official naming doc. (c) A home for vendor-specific standards/playbooks distinct from the vendor-neutral core. Scope as a research spike → ADR before implementing. Raised 2026-07-14.

- [ ] **`spell-full-cycle`: no cross-epic coordination for parallel/multi-epic runs against the same target repo.** Real dogfooding finding (a consumer repo, 2026-07-17): ran 4 epics as separate `spell-full-cycle` invocations (3 in parallel isolated worktrees, 1 sequential) against one target repo. Each epic's own Phase 3 "Implement" only ever sees its own isolated worktree, so nothing catches (a) two epics independently claiming the same DB-migration sequence number, or (b) two epics adding distinct imports to the same region of the same file — both surfaced only at human merge-review time. Worse: a migration's Phase 4 "Test" gate only ever runs against a fresh/empty test database, so a schema change that's wrong specifically against *real, pre-existing* target data (a unique index that conflicted with legitimate duplicate rows the target app allows by design) passed every epic's own test run cleanly, then broke the consumer's actual deploy pipeline on the first live attempt — costing two extra pipeline cycles to properly root-cause, since the first fix wrongly assumed the broken migration had already applied somewhere (it never had, since the runner rolls back the whole transaction on failure and halts). Fix ideas: (1) re-derive migration sequence numbers from a fresh `git pull --ff-only` of the target branch immediately before writing a new migration file, not once at branch-creation time, or a shared numbering lock across concurrent epics; (2) a migration-specific Phase 4 gate that replays the migration against a snapshot of the target environment's real data, not just a fresh test DB; (3) document in the multi-epic guidance that "epic checkpointing" (`spell-commit-work` between epics) does not by itself prevent same-file/same-migration-number collisions — recommend serializing any epics that touch migrations until (1)/(2) exist.
