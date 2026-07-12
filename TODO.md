# TODO

<!-- Arcane session-continuity file. Managed by spell-close-session and spell-open-session. -->

## Open Items

<!-- Add task items here during sessions. Mark completed with [x] and date. -->

- [ ] **Add a `spell-eas-ios-deploy` prompt** (new `.github/prompts/spell-eas-ios-deploy.prompt.md`, plus `src/assets/.github/prompts/` source copy + `registry.ts` entry — following the `spell-dotnet-expert.prompt.md` stack-expert pattern) documenting the Expo/EAS iOS App Store deployment pipeline end to end. Deliberately scoped to the **EAS Build + EAS Submit** tech stack specifically — not a build-method-agnostic skill (no local Xcode, Xcode Cloud, or Fastlane coverage) — since that's what keeps the steps concrete and copy-pasteable. App-specific values (bundle identifier, Apple Team ID, App Store Connect App ID, Apple ID email, EAS project ID/slug, org name) are placeholders so a fresh session in any Arcane-consuming Expo repo can execute it verbatim. Dogfooded for real on a consumer repo's first-ever TestFlight build+submit (Kiubo México, 2026-07-08). Must cover, in order:
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
