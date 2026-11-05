---
title: "PRD: Agent identity — stable references and the roster v3 write path"
status: draft
implementation_status: planned
tracking:
  tracking_mode: internal
  external_provider: null
  adoWorkItemId: null
  githubIssueId: null
source_intake: the operator's agent-identity decision of 2026-09-22 (a private record); features/state-export/PRD.md open question 1 (decided 2026-11-03)
created: 2026-11-04
decision: ARC-059 (Accepted 2026-11-04)
---

# PRD: Agent identity — stable references and the roster v3 write path

## Problem Statement

An agent in an Arcane roster has no identity apart from its name. `spell agents init`
(`src/modules/agents.ts`, "Build roster") computes each entry's `id` once, as the display name
lowercased with spaces turned into hyphens, except the orchestrator, which gets the OpenClaw id
`main`. `validateAgentRoster` (`src/modules/agent-schema.ts`) only requires `id` and `name` to be
strings: nothing checks that an id is unique in its roster, and nothing ties an entry to anything
but the words in it. Every output is then named from those words. `syncAgents`
(`src/modules/agent-generator.ts`) writes `.github/agents/<display-name-slug>.agent.md`,
`~/.claude/agents/<slug>.md` at the user tier, and `<workspace_root>/workspace-<id>/` for
OpenClaw. Four consequences, each read in the tree on 2026-11-04:

1. **A rename orphans everything.** Change `name` and the next sync writes a new agent file beside
   the old one; the old OpenClaw workspace stays. Commit trailers (`Persona: merlin`) written
   before the rename point at a name that no longer resolves.
2. **Two agents with one name collide silently.** A roster with two entries named Merlin renders
   two files at the same path; the second overwrites the first and the sync reports success.
3. **An adapter id is standing in for identity.** `main` is what one harness calls its default
   agent. It is the only id in the roster that is not derived from a name, which is why every
   consumer that wants "the orchestrator" ends up special-casing the string.
4. **Clients have nothing stable to key on.** The state export shipped in 1.17.0 with the roster
   under `agents.schema: "roster-v2"` and the note that the v3 fields "arrive additively with the
   agent-identity decision record" (`src/assets/schemas/state.schema.json`). A client that keys
   its directory on names today will key it on names across every repository tomorrow, and the
   migration grows with every repository it indexes.

Why now: the operator's decision of 2026-09-22 asked for the framework contract to be filed before
any consumer reads the roster, and `features/state-export/PRD.md` open question 1 placed it
exactly here, after the export and before the presence channel and the first client adapter. No
consumer has read `agents` yet, so this is the last point at which a reference can be introduced
without a client migration.

## Target Users

- **Client developers** (the operations cockpit, the mobile companion, any later reader of
  `spell state --json`): one opaque reference per agent that survives renames, re-rostering and
  sharing, so a directory can be keyed once.
- **Operators with several repositories**: same-name agents in independent rosters stay distinct;
  a rename is a display change, not an identity change.
- **Spells that attribute work**: `spell-commit-work` gains a trailer that names the agent by
  reference, so history stays readable after a rename.
- **The presence channel** (the next roadmap item): sessions are reported per agent reference,
  every source declares what it can do, and clients render only what is declared.
- **Template authors** (later, a marketplace): a definition has its own reference and revision;
  installing it mints a new agent, never a copy of someone else's.

## Requirements

Identifiers are `AI-NN` so `spell-architect` can carry them into stories.

### Must Have

- **AI-01 — The reference.** An agent reference is `arcane:agent:<uuid>`; a template reference is
  `arcane:template:<uuid>`. The grammar is `arcane:<type>:<uuid>` with `<type>` a registered
  lowercase word (`agent` and `template` now; `session` reserved for the presence channel, which
  mints none here) and `<uuid>` in canonical lowercase hex form. The reference is opaque,
  unscoped and typed: nothing about its owner, repository, origin or grants is inside it; those
  are records keyed by it (AI-16, and the reserved records in ARC-059). The encoding is UUIDv7
  (open question 1; ULID is the alternative). A `src/modules/agent-ref.ts` module mints, parses
  and validates references with no new runtime dependency (ARC-037 decision 8).
  - *Acceptance:* `mintAgentRef()` returns a value matching
    `^arcane:agent:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`; ten
    thousand mints are unique and non-decreasing in their time prefix; `parseRef` rejects an
    uppercase, braced, prefixed or wrong-type string with a one-line reason.
- **AI-02 — Roster v3.** `schema_version: 3` adds, per entry: `ref` (AI-01, unique in the
  roster), `slug` (unique in the roster; the stable file-name key; lowercase `[a-z0-9-]`),
  `aliases` (a list of `{ value, context }`, where `context` is `openclaw` for a harness id or
  `slug` for a former slug), `derived_from` (optional: `{ template, revision }`, AI-05) and
  `binding` (`owned`; `shared` is reserved for an explicitly shared instance and is refused by
  this release's writer). `name`, `epithet`, `definition` and the roster-level fields are
  unchanged; `id` is gone, replaced by `slug` plus the `openclaw` alias. The loader accepts
  versions 1, 2 and 3; a v3 roster with a malformed reference, a duplicate slug, a duplicate
  reference, an unknown alias context or an unknown binding is a hard error naming the entry.
  - *Acceptance:* a v3 fixture loads; each malformed variant fails with the entry named; a v2
    fixture still loads exactly as in 1.17.1 (`test/agent-schema.test.ts` extended).
- **AI-03 — Write-path-only migration.** `spell agents init` writes v3 and mints a reference per
  entry. An existing v2 roster keeps loading unchanged until `spell agents sync` rewrites it
  (open question 2, decided: `sync` is the write path; `--dry-run` shows the rewrite without
  performing it). The rewrite mints a reference per entry, sets `slug` to the
  v2 `id` (or, when the id is `main`, to the name's slug with `{ value: "main", context:
  "openclaw" }` recorded as an alias), refuses a roster whose slugs would not be unique and names
  the duplicates, preserves the operator's YAML comments and key order (`yaml`'s
  `parseDocument`, not `stringify` of a parsed object), shows the result under `--dry-run`, and
  goes through `validateRealTargetPath` (ARC-057). Nothing that reads a roster ever mints:
  `spell state --json`, `spell agents list` and the presence channel read v2 as v2.
  - *Acceptance:* a v2 fixture migrated and re-read is v3 with every v2 field intact and its
    comments still present; a fixture with two `merlin` ids is refused with both named; running
    the read-only commands on a v2 fixture leaves the file byte-identical.
- **AI-04 — Outputs are keyed by slug and alias, not by display name.** The Copilot and user-tier
  agent files take their name from `slug`; the OpenClaw workspace takes its name from the
  `openclaw` alias when present, else from `slug`; the OpenClaw patch
  (`.arcane/generated/openclaw-roster.json`) keeps its shape and remains an integration
  artifact. A migrated roster therefore produces the same output paths and bytes it produced as
  v2.
  - *Acceptance:* snapshot test: `spell agents sync` on a migrated roster writes the same set of
    paths with the same bytes as the v2 run, the OpenClaw patch included; a display-name change
    on a v3 roster changes the agent file's content and not its path.
- **AI-05 — Templates carry references; installs record lineage.** Each bundled role definition
  (`src/assets/agents/<role>.yaml`) gains `template_ref: arcane:template:<uuid>`, minted once and
  committed, and `validateAgentDefinition` accepts the optional field. `spell agents init`
  records `derived_from: { template, revision }` on each entry, `revision` being
  `sha256:<hex>` of the bundled file it copied. The migration (AI-03) records `derived_from`
  with `revision: null` when the entry's definition id matches a bundled template, because the
  revision it was installed from is not known, and records nothing for a definition that matches
  no template. A later template update can then show a diff instead of overwriting a
  customization; the diff itself is not in this iteration.
  - *Acceptance:* twelve distinct template references in the bundle, pinned by a test; a fresh
    `spell agents init` records `derived_from` with the right hash; a migrated Arcanos roster
    records the template reference with `revision: null`; a custom definition without
    `template_ref` records no `derived_from`.
- **AI-06 — The state export grows by addition.** State schema `1.1.0` (`$id` unchanged):
  `agents.schema` widens from the constant `"roster-v2"` to the enum `"roster-v2" |
  "roster-v3"`; every entry gains `ref`, `slug`, `aliases`, `derived_from` and `binding`, which
  are `null` (`aliases`: `[]`) when the roster on disk is v2, because the export never mints; the
  document gains a top-level `capabilities` descriptor (AI-08). No existing field is removed or
  retyped; a 1.0.0 document is still valid 1.1.0 output except for the new keys. `agents.schema`
  tells a client whether references are present.
  - *Acceptance:* the three existing fixtures re-snapshot with the new keys null; a v3 fixture
    exports references; `test/state-schema.test.ts`'s key-order walker passes; the serializer's
    key order matches the schema; the leak scan passes over all fixtures.
- **AI-07 — Precedence unchanged, provenance on every resolved profile.** A repository's own
  roster always wins; the opted-in user tier applies only when the repository has none; a
  malformed roster is a hard error (ARC-045 decision 6, ARC-047 decision 12, as `resolveRoster`
  implements them). `resolveRoster` returns `origin` (`repo | user`) and, per entry,
  `definition_revision` (`sha256:` of the definition file it resolved, `null` when missing) so
  every consumer, not only the export, sees the same provenance. No implicit inheritance from any
  other level is introduced.
  - *Acceptance:* the three precedence cases are tested through `resolveRoster` with the
    provenance asserted; `spell agents sync` and the export read the same resolved entries.
- **AI-08 — The capability descriptor.** Every source a client reads declares
  `capabilities: { observe: boolean, actions: string[] }`. `observe` says the source reports
  state or presence; `actions` lists the action identifiers the source accepts, from a vocabulary
  ARC-059 opens with `open`, `resume` and `instruct` and the presence channel's record extends.
  The state export declares `{ observe: true, actions: [] }`. A client renders a control only for
  a declared action, by contract rather than by styling; this iteration declares and exports the
  descriptor and builds no action.
  - *Acceptance:* the descriptor is in the schema and every fixture; a schema test rejects an
    action outside the vocabulary.
- **AI-09 — The `Persona-Ref:` trailer.** `git-conventions.md`'s Required Commit Trailers table
  gains `Persona-Ref` (Conditional): the acting persona's `ref`, present whenever `Persona` is
  present and the roster entry carries one; omitted on a v2 roster; never guessed. The same text
  reaches `spell-commit-work`'s attribution step. Enforcement stays advisory prose (ARC-023), the
  same as the trailers beside it.
  - *Acceptance:* the governance copy and its `src/assets` source agree (`check:self-host-parity`);
    the trailer test in `test/` that pins the table's rows is extended.
- **AI-10 — The scanners ignore well-formed references.** `denylist-scan.ts` strips every
  `arcane:<type>:<uuid>` substring from a line before matching, the way it already strips
  `{PLACEHOLDER}` tokens, so `spell ward` and the org-token lint never flag a denylist term that
  occurs by chance inside a reference's hex. The same term outside a reference still flags, and a
  malformed reference gets no exemption.
  - *Acceptance:* a term that is a substring of a fixture reference's hex is not reported; the
    same term on the same line outside the reference is; `arcane:agent:not-a-uuid` is scanned as
    plain text.
- **AI-11 — The naming convention stops using names as identity.** `naming-conventions.md`'s
  Assignment Rules say that unique persona names are recommended for clarity and are never
  identity; identity is the reference; two independent rosters may both have a Merlin, and they
  are two agents unless one is explicitly shared. The root copy and its `src/assets` source change
  together.
  - *Acceptance:* both copies carry the text; parity passes; the Enforcement line beside the
    rule is updated to name the loader's slug and reference checks.
- **AI-12 — The decision record.** ARC-059 is filed as Proposed with this PRD and is accepted by
  the operator before the pull request that implements it merges (the repository's accept-at-PR
  rule).
  - *Acceptance:* `DECISIONS.md` carries ARC-059 with the status line this PRD's pull request
    proposes; `check:stale-claims` Class A passes.
- **AI-13 — Release notes and version.** A CHANGELOG entry under ARC-059 and a minor bump by
  `spell-bump`; the README's roster section names the reference and the v3 fields in one
  paragraph.
  - *Acceptance:* `check:changelog` and `check:version-bump` pass.

### Should Have

- **AI-14 — `spell agents list` shows identity.** The table gains `Ref` and `Slug` columns; the
  `OpenClaw ID` column becomes the `openclaw` alias, blank when none. On a v2 roster the `Ref`
  column is blank and one line under the table names the write path that mints.
  - *Acceptance:* snapshot of the table on a v2 and a v3 fixture.

### Won't Have (this iteration)

- **AI-15 — `spell agents rename <slug> <new name>`** (open question 4, decided: deferred).
  Would change the display name and, with `--slug <new>`, the slug; record the former slug as a
  `{ value, context: "slug" }` alias; remove the outputs the old slug named and write the new
  ones in the same run; the reference never changes. In this release slugs are immutable and a
  display name is changed by editing `name` in the roster. Registered in `TODO.md`.
- **AI-16 — The origin record** (open question 3, decided: reserved). A per-machine install id
  (UUIDv7, kept under `~/.arcane/`, never committed) and an origin record
  `ref → { install_id, minted_at }` written when a reference is minted. ARC-059 fixes the shape
  and the classification (the reference is public; the install id is internal to the machine;
  neither carries an owner, which is a later record); nothing writes it in this release.
- Writing `binding: shared`, a share or transfer command, owner and grant records, and the
  disclosure record (what an agent may share or must redact). ARC-059 reserves their names and
  keys; a later record and a program deliver them.
- Cryptographic identity (a DID or signed identity card) as a projection of the reference: a
  separate decision, due before any multi-user design.
- Inheritance or overrides between any level above the repository and the repository's roster:
  a separate decision when a real need appears.
- The presence channel itself, session references (`arcane:session:<uuid>` is reserved, not
  minted here), the reporting convention, and any client read model. They consume this.
- Changes to the OpenClaw patch's shape or to what it is for. It stays an integration artifact.
- A template-update diff or merge for customized definitions. AI-05 records what the diff would
  need; the diff is later.
- Human identity. The operator is an account, never an agent profile.

## Constraints

- **Technical:** TypeScript CLI; no new runtime dependency (ARC-037 decision 8); every roster write
  through `validateRealTargetPath` (ARC-057); comment-preserving YAML rewrites; the state schema
  additive-only (ARC-044 decision 1, `features/state-export/PRD.md` ST-02); every new field in
  the schema's key order; CRLF-safe parsing. An older CLI refuses a v3 roster with its existing
  "newer than supported; upgrade Arcane" error, so a team that migrates its roster upgrades
  together; the migration is explicit for that reason.
- **Business:** first in the current work order; the presence channel starts after it. Scope fits
  one sprint now that open questions 3 and 4 have moved the origin record and the rename command
  out; AI-14 is the first thing to split off if it runs long.
- **Decision records:** one new record, ARC-059. The reference format, the roster v3 shape, the
  export growth, the descriptor, the trailer, the scanner exemption and the naming text all sit
  in it; nothing here amends ARC-044's contract, which grows by addition exactly as it said it
  would.
- **Security and privacy:** the reference carries nothing sensitive, so it may appear in commits,
  exports and client rows; the install id (AI-16) never leaves the machine; the export never
  carries a file body; the leak scan runs over every fixture. This document and ARC-059 use only
  the fictional names of ARC-031 and name no private product, record or venture.

## Acceptance Criteria

- [ ] `mintAgentRef()` output matches the UUIDv7 reference grammar; mints are unique and
      time-ordered; malformed references are rejected with a reason (AI-01).
- [ ] A v3 roster loads; each malformed variant is a hard error naming the entry; a v2 roster
      loads as in 1.17.1 (AI-02).
- [ ] `spell agents init` writes v3; the chosen write path migrates a v2 roster with comments and
      order preserved, refuses duplicate slugs, and read-only commands leave a v2 file
      byte-identical (AI-03).
- [ ] A migrated roster's `spell agents sync` writes the same paths and bytes as before the
      migration, the OpenClaw patch included (AI-04).
- [ ] The twelve bundled definitions carry distinct template references; init records
      `derived_from` with the bundle's hash; migration records it with `revision: null` (AI-05).
- [ ] State schema `1.1.0` validates the four fixtures; v2 rosters export `null` references;
      a v3 fixture exports them; `capabilities` is `{ observe: true, actions: [] }` (AI-06, AI-08).
- [ ] `resolveRoster` returns `origin` and per-entry `definition_revision` for all three
      precedence cases, and the export reads them from it (AI-07).
- [ ] `git-conventions.md` and `spell-commit-work` carry `Persona-Ref` as Conditional, in both
      copies (AI-09).
- [ ] A denylist term inside a reference's hex is not reported; outside it is; a malformed
      reference is scanned as text (AI-10).
- [ ] `naming-conventions.md` says names are recommended for clarity and never identity, in both
      copies (AI-11).
- [ ] ARC-059 is in `DECISIONS.md`, accepted before the implementing pull request merges (AI-12).
- [ ] CHANGELOG entry under ARC-059, minor bump, README paragraph (AI-13).
- [ ] `check:self-host-parity`, `check:stale-claims`, `check:changelog`, `check:version-bump` and
      the leak scan pass.

## Dependencies

- ARC-059 (this feature's decision record, Proposed with this PRD).
- [ARC-044](../../DECISIONS.md#arc-044--client-architecture-files-first-state-contract-and-a-local-presence-channel) —
  the state contract this extends by addition; its decision 2 is the presence channel that
  consumes the descriptor.
- [ARC-045](../../DECISIONS.md#arc-045--one-spell-source-thin-client-shims-and-a-user-level-install-tier) /
  [ARC-047](../../DECISIONS.md#arc-047--agents-are-roster-rendered-not-registry-distributed-and-get-a-user-tier) —
  the user tier and the roster precedence AI-07 keeps.
- [ARC-003](../../DECISIONS.md#arc-003--agent-persona-schema-v2-and-operations-comms-persona-replacement) —
  the persona schema v2 whose roster this versions to 3.
- [ARC-031](../../DECISIONS.md#arc-031--fictional-venture-names-for-examples-and-a-repository-wide-privacy-gate) /
  [ARC-037](../../DECISIONS.md#arc-037--secret-and-org-leak-detection-pre-commit-scan-plus-repository-wide-ci-backstop) —
  the scanners AI-10 amends and the privacy posture of this document.
- [ARC-057](../../DECISIONS.md#arc-057--managed-paths-stay-inside-the-target-directory-by-real-path) —
  the write-path rule every roster write follows.
- [features/state-export/PRD.md](../state-export/PRD.md) — ST-12 and open question 1, which
  placed this feature here.
- Downstream: the presence channel (the next roadmap item) and the first client adapter consume
  the reference, the descriptor and the provenance; neither is a dependency of this feature.

## Open Questions

1. ~~**Reference encoding: UUIDv7 or ULID?**~~ **Decided 2026-11-04 (operator): UUIDv7.** Both
   are 128-bit, time-ordered and collision-free without coordination. UUIDv7 is an IETF standard
   (RFC 9562, May 2024) with one canonical text form that every language, database and JSON
   Schema validator already parses, and it is sortable by mint time like ULID. ULID has no
   standard, needs a Crockford base32 codec, and buys nothing here. Either is twenty lines over
   `crypto.getRandomValues`; the choice is about what consumers can parse. Consumers treat the
   value as opaque either way; the time prefix is a sorting convenience, not a field.
2. ~~**Which command migrates a v2 roster to v3?**~~ **Decided 2026-11-04 (operator): A.**
   `spell agents sync` rewrites a v2 roster in place, prints what it minted, and renders;
   `--dry-run` shows it first. Rejected: B, a new `spell agents migrate` command, with `sync` on
   a v2 roster printing a pointer to it; C, `spell update`'s retrofit mechanism asking once.
   Reason: `sync` is the command an operator already runs after touching the roster, so the
   migration happens where the roster is already being regenerated and nowhere surprising; B
   adds a command whose only job is one-time; C runs in the middle of an update the operator
   started for another reason (the objection ARC-049 recorded against installing controls in the
   retrofit). AI-03's write path is therefore `spell agents sync`.
3. ~~**Write the origin record now or reserve it?**~~ **Decided 2026-11-04 (operator): A,
   reserve.** ARC-059 fixes the record's shape and the install id's classification; nothing is
   written under `~/.arcane` in this release. Rejected: B, writing the install id and the origin
   record on every mint. Reason: nothing in the current train reads the record, a repository
   command writing into the home directory is a new class of side effect, and the mint time is
   already inside the reference. AI-16 moves to Won't Have; a later release starts writing the
   record without a second decision.
4. ~~**Ship `spell agents rename` in this feature or defer it?**~~ **Decided 2026-11-04
   (operator): A, defer.** Slugs are immutable in this release and a display name is changed by
   editing `name`. Rejected: B, shipping AI-15 now. Reason: the reference makes a later rename
   safe, so nothing is lost by waiting, and the sprint already carries the schema, the
   migration, the export and five governance changes. AI-15 moves to Won't Have and is
   registered in `TODO.md` ("`spell agents rename <slug> <new name>`").

## Example tracking configuration

```yaml
tracking:
  tracking_mode: internal
  external_provider: null
```

## Example: a roster v3 entry

```yaml
schema_version: 3
naming_strategy: arcanos
agent_profile: base
openclaw:
  enabled: true
  workspace_root: ~/.openclaw
roster:
  - ref: arcane:agent:019a3f2c-7b1e-7d4a-9c0b-3e5f6a7b8c9d
    slug: kellar
    name: Kellar
    epithet: the Maestro
    definition: orchestrator
    derived_from:
      template: arcane:template:019a3f2c-7b1e-7b2a-8f10-1a2b3c4d5e6f
      revision: sha256:4c2e0c8d5a9f3b1e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706
    aliases:
      - value: main
        context: openclaw
    binding: owned
```

## Related

- [[DECISIONS#ARC-059|ARC-059 — Agent Identity]] — the decision record this PRD proposes.
- [[DECISIONS#ARC-044|ARC-044 — Client Architecture]] — the state contract it extends.
- [[features/state-export/PRD|State export PRD]] — ST-12 and open question 1, which placed this feature here.
