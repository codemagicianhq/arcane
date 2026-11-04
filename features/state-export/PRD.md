---
title: "PRD: The state export — `spell state --json`"
status: accepted
implementation_status: shipped
accepted: 2026-11-04
shipped: 2026-11-04
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
source_intake: operator hub roadmap item 1.1 (private record), re-planned 2026-11-03
created: 2026-11-03
decision: ARC-044
---

# PRD: The state export — `spell state --json`

## Problem Statement

[ARC-044 — Client Architecture: Files-First State Contract and a Local Presence Channel](../../DECISIONS.md#arc-044--client-architecture-files-first-state-contract-and-a-local-presence-channel)
was accepted on 2026-09-16 and nothing of it is built: there is no `src/commands/state.ts`, no
published schema, and no snapshot test. Meanwhile the state it describes is computed three times
over — `spell status` prints per-component versions, `spell-open-session`'s two-axis version check
reads the same three numbers in prose, and
[ARC-036](../../DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state)'s
diagram generator takes them as arguments. Every client that wants a repository's state today has
to parse Arcane-managed files itself, which is the drift ARC-044 exists to prevent.

Two consumers are waiting on it. An operations cockpit needs real repository state to render
instead of its mock gateway, and a mobile companion needs a read-only project window. Both are
scheduled after this item in the same train, so this is the first build of the current order.

## Target Users

- **Client developers** building the cockpit adapter and the mobile companion: they get one
  versioned JSON document per repository and never read `.arcane.json`, `DECISIONS.md` or
  `TODO.md` themselves (ARC-044 decision 4).
- **Spells**: `spell status` and the open-session version check become consumers of the same
  computation (ARC-044 consequence 1), so a fact is computed once.
- **Operators of a hub** (ARC-030 `role: hub`): the export carries the venture registry, so a
  client can show the portfolio without parsing `registry.json`.
- **Agents** opening a session in any Arcane repository: a single command answers "what is the
  state of this repository" without a tour of files.

## Requirements

Identifiers are `ST-NN` so `spell-architect` can carry them into stories.

### Must Have

- **ST-01 — The command.** `spell state --json` prints exactly one JSON document to stdout and
  exits 0. Diagnostics go to stderr only. In a directory without `.arcane.json` it prints the same
  `Not initialized` error `spell status` prints and exits 1. Without `--json` the command prints a
  one-line pointer to `--json` and exits 2; a human rendering is not in this iteration (see Won't
  Have).
  - *Acceptance:* `spell state --json | node -e 'JSON.parse(require("fs").readFileSync(0))'`
    succeeds in the arcane repository and in a consumer fixture; stdout contains nothing else.
- **ST-02 — Versioned envelope.** The document carries `schema_version` (semver string, `"1.0.0"`
  at first release), `generated_at` (ISO 8601 UTC), `generator` (`arcane-cli` and its version),
  and `repository` (`root` path, `scope`, `role`, `profile`). After `1.0.0` the schema is
  **additive-only**: a field is never removed or retyped; a breaking change is a new major and a
  new decision record (ARC-044 decision 1).
  - *Acceptance:* a test asserts every top-level key of the published schema is present in the
    fixture output; the schema file declares `additionalProperties: false` at the envelope.
- **ST-03 — Versions, computed once.** A `versions` section with `files` (manifest `version`),
  `cli` (package version), `latest` (npm; `null` unless `--online` is passed, and `null`
  with a warning when the lookup fails), `drift` (`{ files_behind_cli: boolean,
  cli_behind_latest: boolean | null }`) and `components[]`
  (`name`, `installedVersion`). The computation moves into one module that `spell status` and the
  version-drift diagram generator call; `status.ts` stops reading the manifest on its own.
  - *Acceptance:* `spell status` output is byte-identical before and after the refactor on the
    same fixture; one unit test covers all four drift combinations.
- **ST-04 — Git topology.** A `git` section: `branch`, `trunk`, `ahead`, `behind`, `uncommitted`
  (count), `remote` (`provider` ∈ `github | ado | other | null`, `url` with credentials stripped),
  `worktrees[]` (`path`, `branch`), and `pull_request` (`{ id, url, state }` or `null`). Every git
  read uses the existing `runGit` with its timeout (`src/modules/git.ts`); a timed-out or failing
  read yields `null` for that field and a `warnings[]` entry, never a non-zero exit. The
  `pull_request` lookup is a network read (`gh pr list` / `az repos pr list`), so it runs only
  under `--online` (ST-13); without the flag it is `null` with no warning, with the flag and no
  tooling or authentication it is `null` with a warning.
  - *Acceptance:* a fixture with a detached HEAD, a fixture with no remote, and a fixture with a
    second worktree each produce valid output; a mocked timeout produces `null` + a warning.
- **ST-05 — Per-repository indexes.** An `indexes` section with one entry per continuity file the
  repository carries: `decisions[]` (`id`, `title`, `status`, `date`, `anchor`), `todos`
  (`open`, `done` counts and `items[]` with `text`, `locator`, `checked`), `ideas[]` (same shape
  as todos when `IDEAS.md` exists), `journal[]` (`date`, `slug`, `title`, `path`), and `done[]`
  (the append-only done book, when present). An absent file is `null`, never an error. Item text
  is the first line only; file bodies are never exported.
  - *Acceptance:* the arcane repository's own `DECISIONS.md` parses to the same count of `ARC-NNN`
    entries the TOC lists; the ops-shaped fixture (`ADR-NNN`) parses too; a malformed entry is
    skipped with a warning.
- **ST-06 — Tracking and policy configuration.** A `config` section carrying the persisted manifest
  answers: `tracking_mode`, `external_provider`, `push_policy`, `role`, `business_root`,
  `spell_scope`, `content_sensitivity` (ARC-032, ARC-033, ARC-034, ARC-030). Absent answers export
  as `null`, which clients must treat as "not asked".
  - *Acceptance:* a manifest with every field set and a pre-ARC-032 manifest with none both
    validate against the schema.
- **ST-07 — Hub registry.** When `role` is `hub`, a `registry` section mirrors
  `{business_root}/registry.json` (ARC-030 decision 2): per venture `slug`, `name`, `aliases`,
  `status`, `visibility`, `ownership`, `tracking`, and `repos[]` (`remote`, `default`). Local
  paths are **omitted by default**: with `--include-local-paths`, each repository gains one
  `local_path` field, the path on the machine running the command (current hostname matched
  against the registry's per-machine `clones` map). The `clones` map itself is never exported,
  because its keys are machine names the leak scan treats as sensitive (ARC-030 decision 6) and
  other machines' paths are nobody else's business. On a consumer, `registry` is `null`.
  - *Acceptance:* the hub fixture exports N ventures with no `local_path` and no `clones`; with
    the flag, `local_path` appears for the fixture's own hostname only; a consumer fixture exports
    `null`.
- **ST-08 — Program and feature status.** A `features[]` section listing every `features/*/PRD.md`
  with its frontmatter `status`, `implementation_status`, `tracking` and `title`, so a client can
  show what is planned, blocked, in progress and shipped.
  - *Acceptance:* the arcane repository's own `features/` directory lists every PRD; a PRD without
    frontmatter appears with `null` fields and a warning.
- **ST-09 — Deterministic output.** Two runs on an unchanged repository differ only in
  `generated_at` (and `versions.latest` when the network answers differently). Object keys are
  emitted in schema order, arrays are sorted by their declared key (`id`, `date`, `slug`), and
  paths are POSIX-relative to `repository.root`.
  - *Acceptance:* snapshot tests on three fixtures (consumer, hub, self-hosted arcane) pass on
    Windows, macOS and Linux CI with `generated_at` masked.
- **ST-10 — Published schema.** A JSON Schema (draft 2020-12) with `$id`
  `https://arcaneai.net/schemas/state/v1` ships in the package as `schemas/state.schema.json`
  and is linked from `README.md` and `CHANGELOG.md`; the fixture outputs validate against it in
  the test suite with no new runtime dependency (ARC-037 decision 8: validation may use a
  dev-dependency only).
  - *Acceptance:* `npm pack` lists the schema file; a test fails when a fixture output drifts from
    the schema.
- **ST-11 — Privacy posture.** The export contains titles, identifiers, one-line item texts and
  paths — never file bodies, never secrets, never credentials in remote URLs. The existing
  org-token denylist scan (ARC-037) runs over the fixture outputs in the test suite so a leak in
  the shape itself is caught before release.
  - *Acceptance:* the leak-scan test passes over all three fixtures; a fixture remote URL with an
    embedded token exports without it.

### Should Have

- **ST-12 — Resolved agent roster, with its identity export.** An `agents` section exporting the
  *effective* roster after precedence resolution — the repository's roster wins; the opted-in user
  tier applies only when the repository has none; a malformed roster is a hard error (the
  precedence ARC-047 already implements) — with `origin` (`repo | user`) and `definition_revision`
  on every entry. **The roster v3 shape (`ref` as `arcane:agent:<uuidv7>`, `slug`, `aliases`,
  `derived_from`, `binding`) depends on a framework decision record that is not yet filed** (the
  operator's agent-identity decision of 2026-09-22 asks for it; see Dependencies). Until it is
  accepted, `agents` exports today's roster v2 entries (`definition`, `name`, `id`, `epithet`)
  under `agents.schema: "roster-v2"`; the v3 fields are then added additively, which is why this
  is a Should and not a Must.
  - *Acceptance:* a repository with its own roster exports it with `origin: "repo"`; a repository
    with none and an opted-in user tier exports `origin: "user"`; a malformed roster exits 1 with
    the loader's error.
- **ST-13 — `--online`.** One switch for every network read: the npm lookup (`versions.latest`,
  `drift.cli_behind_latest`) and the pull-request lookup (`git.pull_request`). Without it all
  three are `null` and a plain run makes no network request, so the export is deterministic and
  safe in CI and air-gapped repositories by default. `spell status` keeps its own default-on
  lookup. A once-per-day cache in the user store is a welcome optimisation, not a requirement.
  - *Acceptance:* without the flag, a mocked fetch and a mocked provider CLI assert zero calls;
    with it, `latest` is populated, `drift.cli_behind_latest` is a boolean, and `pull_request`
    is populated on a fixture with a mocked open PR.
- **ST-14 — Open-session consumes it.** `spell-open-session`'s Workspace Health Check gains one
  optional sentence: when `spell state --json` is available, read the versions and git sections
  from it instead of running the individual commands. Prose only; no spell behaviour changes when
  the command is absent.
  - *Acceptance:* the spell prompt diff is one shared fragment (ARC-039), rendered to every client.

### Won't Have (this iteration)

- The presence channel (`arcane-mcp`, ARC-044 decision 2) and the spell reporting convention
  (decision 3). They are the next item in the roadmap order, not this one.
- A human-readable `spell state` rendering. `spell status` remains the human view.
- `spell state --user` for the user-tier store. The store has no decisions, todos or git topology;
  its versions already print from `spell status --user`.
- Aggregation across a hub's registered clones. The hub exports its registry *entries*; a client
  that wants each venture's state runs the command in that clone.
- Mermaid or any rendered form of the export. ARC-036's generator stays a separate consumer.
- The cockpit adapter and the mobile companion themselves. They consume this; they are not it.
- The roster v3 **write path** (minting refs, migrating roster files, the `Persona-Ref:` trailer).
  ST-12 exports whatever the roster files already say.
- Hosted or multi-user anything (ARC-044 decision 5).

## Constraints

- **Technical:** TypeScript CLI in `src/commands/` and `src/modules/`, registered in
  `src/index.ts` beside `status`; existing test runner and fixtures under `test/`; no new runtime
  dependency (ARC-037 decision 8); every git call through `runGit` with a per-call timeout
  (the EF-20 Windows lock hazard in `git-conventions.md`); paths resolved by real path
  (ARC-057); CRLF-safe parsing of every continuity file.
- **Business:** due with the T3 milestone (2026-12-02); first in the current work order, with the
  cockpit adapter blocked behind it. Scope fits one sprint only if ST-12 ships in its v2 form —
  the v3 roster is the first thing to split off if the sprint runs long.
- **Decision records:** the contract takes no new name (open question 5): the schema's `$id` is
  `https://arcaneai.net/schemas/state/v1`, which closes ARC-044 open question 3 for the state
  side; the schema's first stable version and the additive-only rule go in the CHANGELOG under
  ARC-044, no new ARC. ST-12's v3 fields need the
  agent-identity ARC **before** they are exported; exporting them without it would pre-empt a
  record the operator asked to be filed first.
- **Security:** no file bodies; credentials stripped from URLs; machine paths opt-in; leak-scan
  test over fixtures; the export never writes a repository file (ARC-044 decision 1: derived,
  never authoritative).
- **Privacy of this document:** examples use the fictional venture names of ARC-031; no hub
  venture, client or machine name appears in fixtures.

## Acceptance Criteria

- [ ] `spell state --json` runs in the arcane repository, a consumer fixture and a hub fixture, prints one JSON document to stdout, nothing else, and exits 0 (ST-01).
- [ ] The document validates against the shipped JSON Schema in the test suite; the schema is in the npm package and linked from `README.md` (ST-02, ST-10).
- [ ] `spell status` output is byte-identical to the pre-refactor output on the same fixture, and both read versions from the shared module (ST-03).
- [ ] Detached HEAD, no-remote and second-worktree fixtures produce valid output; a mocked git timeout yields `null` plus a warning and exit 0 (ST-04).
- [ ] `DECISIONS.md` entry count in the export equals the TOC row count for both `ARC-` and `ADR-` fixtures; absent continuity files export as `null` (ST-05).
- [ ] A fully-answered and a never-asked manifest both validate; unanswered fields are `null` (ST-06).
- [ ] The hub fixture exports its ventures without `clones`; `--include-local-paths` adds it; a consumer exports `registry: null` (ST-07).
- [ ] Every `features/*/PRD.md` appears in `features[]` with its frontmatter status (ST-08).
- [ ] Snapshot tests for the three fixtures pass on the Windows, macOS and Linux CI jobs with `generated_at` masked (ST-09).
- [ ] The org-token leak scan passes over all fixture outputs; a token in a fixture remote URL does not appear in the export (ST-11).
- [ ] `agents` exports the effective roster with `origin` and `definition_revision`; `agents.schema` is `"roster-v2"` until the identity ARC is accepted (ST-12).
- [ ] A plain run makes zero network calls; `--online` populates `versions.latest` and `git.pull_request` (ST-04, ST-13).
- [ ] CHANGELOG entry under ARC-044 records schema `1.0.0` and the additive-only rule; version bumped by `spell-bump`.

## Dependencies

- [ARC-044](../../DECISIONS.md#arc-044--client-architecture-files-first-state-contract-and-a-local-presence-channel) — the decision this implements (accepted).
- [ARC-030](../../DECISIONS.md#arc-030--venture-idea-lifecycle-hub-role-registry-and-spell-manifest-promotion) — hub role and `registry.json` shape (ST-07).
- [ARC-032](../../DECISIONS.md#arc-032--persisted-tracking-configuration-tracking_mode-and-external_provider-in-the-manifest) — persisted tracking configuration (ST-06).
- [ARC-036](../../DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state) — the computed state this externalizes; its generator becomes a consumer (ST-03).
- [ARC-037](../../DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop) — leak scan and zero-extra-install posture (ST-10, ST-11).
- [ARC-047](../../DECISIONS.md#arc-047--agents-are-roster-rendered-not-registry-distributed-and-get-a-user-tier) — roster precedence the `agents` section resolves through (ST-12).
- **Not yet filed:** the agent-identity framework ARC (reference format `arcane:agent:<uuidv7>`, roster v3, neutral export) requested by the operator's hub decision of 2026-09-22. ST-12's v3 fields wait on it; the ARC is to be drafted from an arcane session, sanitized per ARC-031.
- Downstream: the cockpit adapter (roadmap 1.2) and the mobile companion (1.5) consume this; neither is a dependency of it.

## Open Questions

1. ~~**Roster v3 timing.**~~ **Decided 2026-11-03 (operator): A.** 1.1 ships `agents` as `roster-v2`; the identity ARC and the roster v3 write path are the next item after 1.1, before the cockpit adapter (1.2) starts, so no consumer ever reads v2 and migrates. Reason: exporting v3 needs the write-path migration the Won't Have excludes, which would make B a second feature inside the T3 sprint.
2. ~~**Machine paths.**~~ **Decided 2026-11-03 (operator): A, refined.** Flag off by default; with `--include-local-paths` the export carries `repos[].local_path` for the current machine only, never the full `clones` map, so the shape survives the registry change below. A manifest answer was rejected: a hub that said yes once would leak paths into every export, including pasted ones.
   - **Follow-up (its own record, not 1.1):** per-machine clone paths move out of the committed `registry.json` into an untracked local overlay (`.arcane/local/` or the user store), keyed by venture slug and remote — an ARC-030 decision 2 amendment. On a team sharing one hub, the committed map would push every member's machine name and folder layout to everyone and collide on common machine names. File before any multi-person hub install; the export's `local_path` field is unchanged by it.
3. ~~**The npm lookup.**~~ **Decided 2026-11-03 (operator): B.** Off by default, `--online` opts in. A contract for programs must not make a network request on every call; the one caller that wants the reading, open-session's version check, asks for it (ST-14 passes the flag).
4. ~~**Pull-request lookup.**~~ **Decided 2026-11-04 (operator): C.** The field stays; it populates only under `--online`, the same switch as the npm lookup (renamed from `--check-latest` so one flag names the whole class of network reads). Without the flag, `null` and no warning; with it and no tooling or auth, `null` and a warning, exit 0.
5. ~~**Name.**~~ **Decided 2026-11-04 (operator): C — no new name.** The identifier is the command's own word: `$id` `https://arcaneai.net/schemas/state/v1`, file `schemas/state.schema.json`, "the state export" in prose. `arcane-state` remains only as ARC-044's historical working name; nothing is coined, so nothing goes through `spell-scry`. The URL is on the canonical domain and may be made resolvable later without changing it.

## Example tracking configuration

```yaml
tracking:
  tracking_mode: internal
  external_provider: null
```
