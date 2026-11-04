import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { addWorktree, commitFiles, initRepo, withUpstream } from "./state-fixtures.js";

// ─── The three snapshot fixtures (architecture, Testing Strategy) ─────────────
// Everything here is fictional (ARC-031): Ordovica, Tidewright, Overshore.
// Two strings are planted where the export must NOT carry them, and the leak
// scan test looks for exactly these: a foreign machine's name and clone path
// (in `clones`), and a private name that appears only in file bodies.

/** A machine that is not the one running the tests: its clone path must never be exported. */
export const FOREIGN_HOSTNAME = "tidewright-build-02";
export const FOREIGN_CLONE_PATH = "/srv/builds/tidewright-build-02/clones/ordovica";
/** The hostname the fixtures' own `clones` entries are keyed by (passed to the collector). */
export const FIXTURE_HOSTNAME = "ordovica-workstation";
export const FIXTURE_CLONE_PATH = "/home/dev/ventures/ordovica";
/** A private name planted in bodies only (item continuation lines, journal and decision prose). */
export const PRIVATE_NAME = "ordovica-undisclosed-partner";
/** Userinfo on a remote URL; must be stripped (ST-11). */
export const USERINFO_CREDENTIAL = "ordovica:userinfo-credential-value";

const CONSUMER_MANIFEST = {
  version: "1.17.0",
  profile: "lite",
  installedAt: "2026-10-01T00:00:00.000Z",
  components: [
    { name: "git-conventions", files: [".arcane/governance/git-conventions.md"], installedVersion: "1.17.0" },
    { name: "agent-policies", files: [".arcane/governance/agent-policies.md"], installedVersion: "1.16.0" },
  ],
  tracking_mode: "internal",
  external_provider: null,
  push_policy: "open",
  content_sensitivity: "standard",
};

const DECISIONS_ADR = [
  "# Decisions",
  "",
  "## Table of Contents",
  "",
  "| ID | Title |",
  "| --- | --- |",
  "| [ADR-001](#adr-001--geothermal-survey-cadence) | Geothermal survey cadence |",
  "",
  "## ADR-001 — Geothermal survey cadence",
  "",
  "**Date:** 2026-10-01",
  "**Status:** Accepted (operator, 2026-10-02)",
  "",
  `Context: the survey partner (${PRIVATE_NAME}) asked for a quarterly cadence.`,
  "",
  "## ADR-002 — Tidal repair fleet sizing",
  "",
  "**Date:** 2026-10-05",
  "**Status:** Proposed",
  "",
].join("\n");

const TODO_BOOK = [
  "---",
  "last_updated: 2026-11-01",
  "---",
  "",
  "# TODO",
  "",
  "## Open Items",
  "",
  "- [ ] **Survey the Ordovica deep-earth site.** Type: `todo`; domain: `survey`.",
  `  Continuation line naming ${PRIVATE_NAME}, which must stay in the body.`,
  "- [x] **Order the Tidewright repair drones.** Done 2026-11-01. <!-- status: done -->",
  "",
  "### Operator follow-ups",
  "",
  "- [ ] Confirm the Overshore orbit window",
  "",
].join("\n");

/**
 * A consumer: lite manifest, ADR- decisions, a TODO book, a GitHub upstream
 * whose recorded URL carries userinfo, no roster, no features, no journal.
 */
export async function buildConsumerFixture(parent: string): Promise<string> {
  const dir = join(parent, "consumer");
  await mkdir(dir);
  initRepo(dir);
  await commitFiles(dir, "test: seed consumer", {
    ".arcane.json": `${JSON.stringify(CONSUMER_MANIFEST, null, 2)}\n`,
    "DECISIONS.md": DECISIONS_ADR,
    "TODO.md": TODO_BOOK,
  });
  await withUpstream(dir, join(parent, "consumer-remote"), {
    ahead: 1,
    behind: 0,
    originUrl: `https://${USERINFO_CREDENTIAL}@github.com/ordovica/survey.git`,
  });
  return dir;
}

const HUB_MANIFEST = {
  version: "1.17.0",
  profile: "full",
  installedAt: "2026-10-01T00:00:00.000Z",
  components: [{ name: "spells-core", files: [".arcane/spells/spell-open-session.md"], installedVersion: "1.17.0" }],
  role: "hub",
  business_root: "ventures",
  tracking_mode: "internal",
  external_provider: null,
  push_policy: "guarded",
  content_sensitivity: "sensitive",
};

const HUB_REGISTRY = {
  _comment: "Hub-owned venture registry. Private.",
  updated: "2026-11-01",
  ventures: {
    tidewright: {
      name: "Tidewright",
      aliases: ["tide", "tw"],
      status: "active",
      visibility: "private",
      ownership: "llc",
      tracking: { provider: "ado", project: "platform" },
      repos: [
        {
          name: "repair",
          remote: "https://dev.azure.com/tidewright/platform/_git/repair",
          default: true,
          clones: { [FOREIGN_HOSTNAME]: FOREIGN_CLONE_PATH.replace("ordovica", "repair") },
        },
      ],
    },
    ordovica: {
      name: "Ordovica",
      aliases: ["ordo", "ord"],
      status: "active",
      visibility: "public",
      ownership: "llc",
      tracking: "github",
      repos: [
        {
          name: "survey",
          remote: "https://github.com/ordovica/survey.git",
          default: true,
          clones: { "ORDOVICA-WORKSTATION": FIXTURE_CLONE_PATH, [FOREIGN_HOSTNAME]: FOREIGN_CLONE_PATH },
        },
        { name: "notes", remote: null, default: false },
      ],
    },
    overshore: { name: "Overshore", aliases: ["over", "osh"], status: "idea", visibility: "private", ownership: "personal", tracking: "none", repos: [] },
  },
};

const HUB_ROSTER = [
  "schema_version: 2",
  "naming_strategy: arcanos",
  "agent_profile: base",
  "openclaw:",
  "  enabled: false",
  "  workspace_root: ~/.openclaw/never-written",
  "roster:",
  "  - definition: architecture-lead",
  "    name: Merlin",
  "    id: merlin",
  "    epithet: the Archmage",
  "  - definition: qa-lead",
  "    name: Lince",
  "    id: lince",
  "",
].join("\n");

const IDEAS_BOOK = [
  "# Idea Inbox",
  "",
  "- [ ] **[2026-10-20]** [#orbit] Overshore could lease vacuum time to the Tidewright sensor team.",
  "- [x] **[2026-10-21]** [#survey] Pair the Ordovica survey with a coastal scan. <!-- status: promoted -->",
  "",
].join("\n");

/**
 * A hub: role hub with a registry (clones keyed by the fixture's own hostname
 * in another letter case and by a foreign one), an IDEAS book, a roster with
 * one definition file, a journal, no remote, and a second worktree.
 */
export async function buildHubFixture(parent: string): Promise<string> {
  const dir = join(parent, "hub");
  await mkdir(dir);
  initRepo(dir);
  await commitFiles(dir, "test: seed hub", {
    ".arcane.json": `${JSON.stringify(HUB_MANIFEST, null, 2)}\n`,
    "ventures/registry.json": `${JSON.stringify(HUB_REGISTRY, null, 2)}\n`,
    "DECISIONS.md": DECISIONS_ADR,
    "TODO.md": TODO_BOOK,
    "IDEAS.md": IDEAS_BOOK,
    ".arcane/agents.yaml": HUB_ROSTER,
    ".arcane/agents/architecture-lead.yaml": "id: architecture-lead\nrole: Architecture Lead\ncategory: engineering\n",
    "journal/2026-10-30-portfolio-review.md": `---\ntitle: "Portfolio review"\n---\n\n# 2026-10-30 — Portfolio review\n\nDiscussed ${PRIVATE_NAME} in private.\n`,
    "journal/.gitkeep": "",
  });
  addWorktree(dir, parent, "hub-wt");
  return dir;
}

const SELF_HOSTED_MANIFEST = {
  selfHosted: true,
  version: "1.17.0",
  profile: "full",
  installedAt: "2026-10-01T00:00:00.000Z",
  components: [
    { name: "spells-core", files: [".arcane/spells/spell-open-session.md"], installedVersion: "1.17.0" },
    { name: "governance", files: [".arcane/governance/git-conventions.md"], installedVersion: "1.17.0" },
  ],
  tracking_mode: "internal",
  external_provider: null,
  spell_scope: "repo",
};

const DECISIONS_ARC = [
  "# Arcane Framework — Architecture Decision Records (ARC)",
  "",
  "## ARC-001 — Framework / Operations Separation",
  "",
  "**Date:** 2026-05-04",
  "**Status:** Accepted",
  "",
  "## ARC-002 — Distribute Agent Files via spell init",
  "",
  "**Date:** 2026-05-14",
  "**Status:** Superseded by [ARC-003](#arc-003--agents-are-roster-rendered) (2026-09-11)",
  "",
  "## ARC-003 — Agents Are Roster-Rendered",
  "",
  "**Date:** 2026-09-11",
  "**Status:** Accepted",
  "",
  `Prose mentioning ${PRIVATE_NAME} stays in the body.`,
  "",
].join("\n");

/**
 * The self-hosted shape: selfHosted manifest, ARC- decisions, features with
 * and without frontmatter, a done book, a journal with a mis-named file, a
 * GitHub upstream two ahead and one behind.
 */
export async function buildSelfHostedFixture(parent: string): Promise<string> {
  const dir = join(parent, "self-hosted");
  await mkdir(dir);
  initRepo(dir);
  await commitFiles(dir, "test: seed self-hosted", {
    ".arcane.json": `${JSON.stringify(SELF_HOSTED_MANIFEST, null, 2)}\n`,
    "DECISIONS.md": DECISIONS_ARC,
    "TODO.md": TODO_BOOK,
    "DONE.md": "# Done\n\n## 2026-10\n\n- [x] **Ship the state export schema.** Moved 2026-10-31.\n",
    "features/state-export/PRD.md":
      '---\ntitle: "PRD: The state export"\nstatus: accepted\nimplementation_status: in-progress\ntracking:\n  tracking_mode: internal\n  external_provider: null\n  adoWorkItemId: null\n  githubIssueId: null\n---\n\n# PRD\n',
    "features/legacy-flat/PRD.md": "---\nstatus: shipped\ntracking_mode: internal\n---\n\n# PRD: Legacy flat tracking\n",
    "features/no-frontmatter/PRD.md": "Just prose, no heading and no frontmatter.\n",
    "features/not-a-feature/notes.md": "# Notes\n",
    "journal/2026-10-29-schema-draft.md": "---\ntitle: Schema draft\n---\n\n# 2026-10-29 — Schema draft\n",
    "journal/2026-11-02-serializer.md": "# 2026-11-02 — Serializer\n\nbody\n",
    "journal/notes.md": "# Not an entry\n",
    "journal/.gitkeep": "",
  });
  await withUpstream(dir, join(parent, "self-hosted-remote"), { ahead: 2, behind: 1, originUrl: "https://github.com/overshore/orbit.git" });
  return dir;
}
