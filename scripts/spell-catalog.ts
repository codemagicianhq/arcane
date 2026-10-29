#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { getAllComponents, getComponent, listProfiles } from "../src/modules/registry.js";
import { MARKER_START, MARKER_END } from "../src/modules/merger.js";
import { AGENT_ROLES } from "../src/config/agent-roles.js";
import { loadAllAgentDefinitions } from "../src/modules/agent-loader.js";
import { applyArcanosNames } from "../src/modules/naming.js";
import type { RegistryComponent } from "../src/types.js";
import {
  CAPABILITY_HOLDS,
  CAPABILITY_LEGEND,
  CAPABILITY_LINES,
  CAPABILITY_THEMES,
} from "../src/config/capabilities.js";
import type {
  CapabilityHoldDefinition,
  CapabilityLine,
  CapabilityTheme,
} from "../src/config/capabilities.js";

// A spell is identified by its canonical source (ARC-045 / CS-03) -- the
// client shims that follow it in each spells-* component are the same spell
// three more times, never counted.
const SPELL_PREFIX = ".arcane/spells/";
const SPELL_SUFFIX = ".md";
const GOVERNANCE_PREFIX = ".arcane/governance/";
const GOVERNANCE_SUFFIX = ".md";

/**
 * The tagline contract, shared by every spell and governance doc: one
 * marketing-quality sentence of at most TAGLINE_MAX_LENGTH characters with
 * no trailing period, so a consumer can render it as a card title or a list
 * entry without editing it. Enforced here (the CI gate) and stated in
 * spell-authoring-standards.md's D1 Bronze bar.
 */
export const TAGLINE_MAX_LENGTH = 60;

export interface SpellCatalogEntry {
  id: string;
  shortName: string;
  name: string;
  description: string;
  tagline: string;
}

export interface SpellCatalogGroup {
  component: string;
  label: string;
  spells: SpellCatalogEntry[];
}

/** One spell, flat: everything a consumer needs to render it without opening the file. */
export interface SpellCatalogSpell extends SpellCatalogEntry {
  /** The Claude Code stub's proactive-invocation hint; falls back to `description`, as the compiler does. */
  claudeDescription: string;
  /** What the user passes, with an example. */
  argumentHint: string;
  /** The `spells-*` component the spell ships in (`groups[].component`). */
  group: string;
  /** The bullets of the spell's `## Executive Summary`, in order; empty when the spell has none. */
  executiveSummary: string[];
}

export interface GovernanceCatalogEntry {
  slug: string;
  title: string;
  tagline: string;
  status: string;
  audience: string;
  tags: string[];
}

export interface ProfileCatalogEntry {
  id: string;
  displayName: string;
  description: string;
  /** Spell ids installed by this profile, in registry order. */
  spellIds: string[];
  /** Governance slugs installed by this profile, in registry order. */
  governanceSlugs: string[];
  /** The profile's other components (templates, baselines, instructions), by registry name. */
  extras: string[];
}

export interface AgentCatalogEntry {
  id: string;
  role: string;
  category: string;
  /** The persona name under the framework's own naming strategy. */
  codename: string;
  /** The persona's epithet under that strategy. */
  epithet: string;
}

/** Capabilities as data: the legend, the hold vocabulary, the themes and the lines, verbatim from src/config/capabilities.ts. */
export interface CapabilityCatalog {
  legend: string;
  holds: CapabilityHoldDefinition[];
  themes: CapabilityTheme[];
  lines: CapabilityLine[];
}

export interface SpellCatalog {
  totalSpells: number;
  totalAgents: number;
  totalGovernanceDocs: number;
  governanceDocs: string[];
  groups: SpellCatalogGroup[];
  spells: SpellCatalogSpell[];
  governance: GovernanceCatalogEntry[];
  profiles: ProfileCatalogEntry[];
  agents: AgentCatalogEntry[];
  capabilities: CapabilityCatalog;
}

export interface SpellCatalogResult {
  drifted: string[];
  repaired: string[];
}

function labelForComponent(componentName: string): string {
  const stripped = componentName.replace(/^spells-/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function idForPromptFile(filePath: string): string {
  const base = filePath.slice(filePath.lastIndexOf("/") + 1);
  return base.slice(0, -SPELL_SUFFIX.length);
}

/**
 * Validates one tagline against the contract. Returns the reason it fails,
 * or null when it passes. Exported so the test can pin each rule.
 */
export function taglineProblem(value: unknown): string | null {
  if (typeof value !== "string") return 'missing a string "tagline"';
  const tagline = value.trim();
  if (tagline.length === 0) return '"tagline" is empty';
  if (tagline !== value) return '"tagline" has leading or trailing whitespace';
  if (tagline.length > TAGLINE_MAX_LENGTH) {
    return `"tagline" is ${tagline.length} characters; the maximum is ${TAGLINE_MAX_LENGTH}`;
  }
  if (/[.!?]$/.test(tagline)) return '"tagline" must not end with a period or other sentence mark';
  if (/\r|\n/.test(tagline)) return '"tagline" must be a single line';
  if (/[.!?]\s+\S/.test(tagline)) return '"tagline" must be one sentence';
  return null;
}

async function readFrontmatter(
  assetsDir: string,
  filePath: string,
): Promise<Record<string, unknown>> {
  const raw = await readFile(join(assetsDir, filePath), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) {
    throw new Error(`${filePath}: no YAML frontmatter block found`);
  }
  const parsed = parseYaml(match[1]) as Record<string, unknown> | null;
  return parsed ?? {};
}

function requireTagline(filePath: string, frontmatter: Record<string, unknown>): string {
  const problem = taglineProblem(frontmatter["tagline"]);
  if (problem !== null) {
    throw new Error(`${filePath}: frontmatter ${problem}`);
  }
  return frontmatter["tagline"] as string;
}

function requireString(filePath: string, frontmatter: Record<string, unknown>, key: string): string {
  const value = frontmatter[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${filePath}: frontmatter is missing a string "${key}"`);
  }
  return value;
}

function requireStringList(filePath: string, frontmatter: Record<string, unknown>, key: string): string[] {
  const value = frontmatter[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${filePath}: frontmatter "${key}" must be a list of strings`);
  }
  return value as string[];
}

/**
 * The bullets of a spell's `## Executive Summary`, each continuation line
 * (indented under its bullet) folded into the bullet it belongs to, and the
 * section ending at the first `---` rule. A spell without the section yields
 * an empty list rather than failing: the authoring standard puts the summary
 * at D1 Silver, not Bronze.
 */
export function parseExecutiveSummary(content: string): string[] {
  const header = /^## Executive Summary[ \t]*\r?\n/m.exec(content);
  if (!header) return [];
  const body = content.slice(header.index + header[0].length);
  const rule = /^---[ \t]*\r?$/m.exec(body);
  const section = rule ? body.slice(0, rule.index) : body;
  const bullets: string[] = [];
  for (const rawLine of section.split(/\r?\n/)) {
    if (/^- /.test(rawLine)) {
      bullets.push(rawLine.slice(2).trim());
    } else if (/^\s+\S/.test(rawLine) && bullets.length > 0) {
      bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${rawLine.trim()}`;
    }
  }
  return bullets;
}

interface SpellFrontmatter {
  name: string;
  description: string;
  tagline: string;
  claudeDescription: string;
  argumentHint: string;
  executiveSummary: string[];
}

async function loadFrontmatter(assetsDir: string, promptPath: string): Promise<SpellFrontmatter> {
  const raw = await readFile(join(assetsDir, promptPath), "utf8");
  const parsed = await readFrontmatter(assetsDir, promptPath);
  if (typeof parsed["name"] !== "string" || typeof parsed["description"] !== "string") {
    throw new Error(`${promptPath}: frontmatter is missing a string "name" or "description"`);
  }
  const tagline = requireTagline(promptPath, parsed);
  const claudeDescription =
    typeof parsed["claude_description"] === "string" ? parsed["claude_description"] : parsed["description"];
  // D1 Bronze in spell-authoring-standards.md: `argument-hint` is required.
  const argumentHint = requireString(promptPath, parsed, "argument-hint");
  return {
    name: parsed["name"],
    description: parsed["description"],
    tagline,
    claudeDescription,
    argumentHint,
    executiveSummary: parseExecutiveSummary(raw),
  };
}

/**
 * A governance doc's frontmatter has `title` where a spell has `name`; both
 * carry `tagline` under the same contract. Checked for every governance file
 * the registry distributes, so a doc added without one fails the gate the
 * same way a spell does.
 */
async function loadGovernanceFrontmatter(
  assetsDir: string,
  docPath: string,
): Promise<Omit<GovernanceCatalogEntry, "slug">> {
  const parsed = await readFrontmatter(assetsDir, docPath);
  const title = requireString(docPath, parsed, "title");
  const tagline = requireTagline(docPath, parsed);
  const status = requireString(docPath, parsed, "status");
  const audience = requireString(docPath, parsed, "audience");
  const tags = requireStringList(docPath, parsed, "tags");
  return { title, tagline, status, audience, tags };
}

function spellIdsOf(component: RegistryComponent): string[] {
  return component.files
    .filter((file) => file.startsWith(SPELL_PREFIX) && file.endsWith(SPELL_SUFFIX))
    .map(idForPromptFile);
}

function governanceSlugsOf(component: RegistryComponent): string[] {
  return component.files
    .filter((file) => file.startsWith(GOVERNANCE_PREFIX) && file.endsWith(GOVERNANCE_SUFFIX))
    .map((file) => file.slice(GOVERNANCE_PREFIX.length, -GOVERNANCE_SUFFIX.length));
}

/**
 * Profiles as data, from src/config/profiles.ts through the registry's own
 * expansion (so `"*"` means what `spell init` makes it mean). A component is
 * reported once, under whichever of the three lists fits it: its spells, its
 * governance docs, or -- for templates, baselines and instruction files -- its
 * registry name under `extras`.
 */
function catalogProfiles(): ProfileCatalogEntry[] {
  return listProfiles().map((profile) => {
    const spellIds: string[] = [];
    const governanceSlugs: string[] = [];
    const extras: string[] = [];
    for (const name of profile.components) {
      const component = getComponent(name);
      const spells = spellIdsOf(component);
      const slugs = governanceSlugsOf(component);
      if (spells.length > 0) spellIds.push(...spells);
      if (slugs.length > 0) governanceSlugs.push(...slugs);
      if (spells.length === 0 && slugs.length === 0) extras.push(name);
    }
    return {
      id: profile.id,
      displayName: profile.displayName,
      description: profile.description,
      spellIds,
      governanceSlugs,
      extras,
    };
  });
}

/**
 * Agents as data: the canonical role list (src/config/agent-roles.ts) joined
 * with the framework's own naming strategy (src/modules/naming.ts), checked
 * against the shipped definition files so a role without a YAML, or a YAML
 * without a role, fails here rather than at `spell agents init`.
 */
async function catalogAgents(assetsDir: string): Promise<AgentCatalogEntry[]> {
  const definitions = await loadAllAgentDefinitions(join(assetsDir, "agents"));
  const definitionIds = new Set(definitions.map((definition) => definition.id));
  const roleIds = new Set(AGENT_ROLES.map((role) => role.id));
  for (const role of AGENT_ROLES) {
    if (!definitionIds.has(role.id)) throw new Error(`agents/${role.id}.yaml: no definition for role "${role.id}"`);
  }
  for (const id of definitionIds) {
    if (!roleIds.has(id)) throw new Error(`agents/${id}.yaml: definition has no entry in agent-roles.ts`);
  }
  const named = new Map(applyArcanosNames(AGENT_ROLES.map((role) => role.id)).map((n) => [n.definition, n]));
  return AGENT_ROLES.map((role) => {
    const naming = named.get(role.id);
    if (!naming?.epithet) throw new Error(`agent-roles.ts: role "${role.id}" has no codename or epithet in naming.ts`);
    return { id: role.id, role: role.role, category: role.category, codename: naming.name, epithet: naming.epithet };
  });
}

/**
 * T15/BC-23. Derives the spell catalog from registry.ts's spells-* components
 * -- the same grouping `spell init`/`spell add` install by -- so a spell can
 * never be silently omitted the way spell-adopt-docs, spell-make-discoverable,
 * spell-scry and spell-sync-pull-request were from the hand-maintained
 * README list this replaces.
 */
export async function generateSpellCatalog(assetsDir: string): Promise<SpellCatalog> {
  const groups: SpellCatalogGroup[] = [];
  const spells: SpellCatalogSpell[] = [];
  const governance: GovernanceCatalogEntry[] = [];
  let totalSpells = 0;
  const governanceFiles = new Set<string>();
  const governanceDocs: string[] = [];

  for (const component of getAllComponents()) {
    for (const file of component.files) {
      if (file.startsWith(GOVERNANCE_PREFIX) && file.endsWith(GOVERNANCE_SUFFIX)) {
        if (!governanceFiles.has(file)) {
          const slug = file.slice(GOVERNANCE_PREFIX.length, -GOVERNANCE_SUFFIX.length);
          governanceDocs.push(slug);
          governance.push({ slug, ...(await loadGovernanceFrontmatter(assetsDir, file)) });
        }
        governanceFiles.add(file);
      }
    }

    if (!component.name.startsWith("spells-")) continue;

    const promptFiles = component.files.filter(
      (file) => file.startsWith(SPELL_PREFIX) && file.endsWith(SPELL_SUFFIX),
    );

    const groupSpells: SpellCatalogEntry[] = [];
    for (const file of promptFiles) {
      const id = idForPromptFile(file);
      const frontmatter = await loadFrontmatter(assetsDir, file);
      const entry: SpellCatalogEntry = {
        id,
        shortName: id.replace(/^spell-/, ""),
        name: frontmatter.name,
        description: frontmatter.description,
        tagline: frontmatter.tagline,
      };
      groupSpells.push(entry);
      spells.push({
        ...entry,
        claudeDescription: frontmatter.claudeDescription,
        argumentHint: frontmatter.argumentHint,
        group: component.name,
        executiveSummary: frontmatter.executiveSummary,
      });
    }

    groups.push({ component: component.name, label: labelForComponent(component.name), spells: groupSpells });
    totalSpells += groupSpells.length;
  }

  const agents = await catalogAgents(assetsDir);

  return {
    totalSpells,
    totalAgents: agents.length,
    totalGovernanceDocs: governanceFiles.size,
    governanceDocs,
    groups,
    spells,
    governance,
    profiles: catalogProfiles(),
    agents,
    capabilities: catalogCapabilities(),
  };
}

/**
 * Validates src/config/capabilities.ts before it is rendered anywhere: ids
 * unique, every line under a declared theme and every theme with at least
 * one line, every hold in the vocabulary, every line with a non-empty
 * headline, text and source, and -- the one semantic rule -- a line with no
 * mechanism belongs to the `limits` theme and a line in it has none, since a
 * non-claim rendered with a "CLI" marker would read as a checked claim.
 */
export function catalogCapabilities(
  source: CapabilityCatalog = {
    legend: CAPABILITY_LEGEND,
    holds: CAPABILITY_HOLDS,
    themes: CAPABILITY_THEMES,
    lines: CAPABILITY_LINES,
  },
): CapabilityCatalog {
  const holdIds = new Set(source.holds.map((hold) => hold.id));
  const themeIds = new Set<string>();
  for (const theme of source.themes) {
    if (themeIds.has(theme.id)) throw new Error(`capabilities.ts: duplicate theme id "${theme.id}"`);
    themeIds.add(theme.id);
    if (theme.title.trim() === "") throw new Error(`capabilities.ts: theme "${theme.id}" has an empty title`);
  }
  const lineIds = new Set<string>();
  const linesPerTheme = new Map<string, number>();
  for (const line of source.lines) {
    if (lineIds.has(line.id)) throw new Error(`capabilities.ts: duplicate line id "${line.id}"`);
    lineIds.add(line.id);
    if (!themeIds.has(line.theme)) throw new Error(`capabilities.ts: line "${line.id}" names unknown theme "${line.theme}"`);
    linesPerTheme.set(line.theme, (linesPerTheme.get(line.theme) ?? 0) + 1);
    for (const key of ["headline", "text", "source"] as const) {
      if (line[key].trim() === "") throw new Error(`capabilities.ts: line "${line.id}" has an empty ${key}`);
    }
    for (const hold of line.holds) {
      if (!holdIds.has(hold)) throw new Error(`capabilities.ts: line "${line.id}" names unknown hold "${hold}"`);
    }
    if (new Set(line.holds).size !== line.holds.length) {
      throw new Error(`capabilities.ts: line "${line.id}" repeats a hold`);
    }
    if ((line.theme === "limits") !== (line.holds.length === 0)) {
      throw new Error(
        `capabilities.ts: line "${line.id}" must have no hold if and only if it is in the "limits" theme`,
      );
    }
  }
  for (const theme of source.themes) {
    if (!linesPerTheme.has(theme.id)) throw new Error(`capabilities.ts: theme "${theme.id}" has no lines`);
  }
  return {
    legend: source.legend,
    holds: source.holds.map((hold) => ({ ...hold })),
    themes: source.themes.map((theme) => ({ ...theme })),
    lines: source.lines.map((line) => ({ ...line, holds: [...line.holds] })),
  };
}

export const CAPABILITIES_MARKER_START = "<!-- arcane:capabilities:start -->";
export const CAPABILITIES_MARKER_END = "<!-- arcane:capabilities:end -->";

/**
 * Renders the README's "What the framework does" block: the legend with the
 * hold vocabulary, then each theme as a bold heading over its lines, each
 * line as its text, qualifier and limit in that order, followed by the
 * italic marker(s) of what holds it. A line with no hold ends without a
 * marker.
 */
export function renderCapabilitiesBlock(capabilities: CapabilityCatalog): string {
  const legend = [
    capabilities.legend,
    ...capabilities.holds.map((hold) => `*${hold.label}:* ${hold.meaning}`),
  ].join(" ");
  const labelFor = new Map(capabilities.holds.map((hold) => [hold.id, hold.label]));
  const sections = capabilities.themes.map((theme) => {
    const lines = capabilities.lines
      .filter((line) => line.theme === theme.id)
      .map((line) => {
        const prose = [line.text, line.qualifier, line.limit].filter((part) => part !== undefined).join(" ");
        const marker = line.holds.map((hold) => labelFor.get(hold)).join(" · ");
        return marker === "" ? `- ${prose}` : `- ${prose} *${marker}*`;
      });
    const heading = theme.lede === undefined ? `**${theme.title}**` : `**${theme.title}** ${theme.lede}`;
    return [heading, ...lines].join("\n");
  });
  return [legend, "", sections.join("\n\n")].join("\n");
}

export function renderJsonArtifact(catalog: SpellCatalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export function renderReadmeBlock(catalog: SpellCatalog): string {
  const lines = catalog.groups
    .filter((group) => group.spells.length > 0)
    .map((group) => {
      const names = group.spells.map((spell) => `\`${spell.shortName}\``).join(" · ");
      return `**${group.label}** — ${names}`;
    });

  return [
    "<details>",
    `<summary><b>📜 The full spell catalogue (${catalog.totalSpells})</b></summary>`,
    "",
    ...lines,
    "",
    "</details>",
  ].join("\n");
}

export function spliceReadmeBlock(
  readme: string,
  block: string,
  startMarker: string = MARKER_START,
  endMarker: string = MARKER_END,
): string {
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    throw new Error(`README.md is missing well-formed ${startMarker}/${endMarker} markers`);
  }

  const before = readme.slice(0, startIdx + startMarker.length);
  const after = readme.slice(endIdx);
  return `${before}\n${block}\n${after}`;
}

/**
 * A second, distinctly-named block marker for the governance-standards
 * `<details>` block. MARKER_START/MARKER_END above is a single unnamed pair
 * already claimed by the spell catalogue block -- `readme.indexOf` would
 * find whichever comes first in the file if this block reused it, silently
 * splicing the wrong content into one of the two regions.
 */
export const GOVERNANCE_MARKER_START = "<!-- arcane:governance:start -->";
export const GOVERNANCE_MARKER_END = "<!-- arcane:governance:end -->";

export function renderGovernanceBlock(catalog: SpellCatalog): string {
  const slugs = catalog.governanceDocs.map((slug) => `\`${slug}\``).join(" · ");
  return [
    "<details>",
    `<summary><b>⚖️ The governance standards (${catalog.totalGovernanceDocs})</b></summary>`,
    "",
    slugs,
    "",
    "</details>",
  ].join("\n");
}

/**
 * Named inline counters embedded in otherwise-static README prose (the
 * tagline, the "What's in the box" table) -- distinct from
 * MARKER_START/MARKER_END above, which is a single unnamed block-level pair
 * already claimed by the spell catalogue `<details>` block and can't be
 * reused for a second region without the two colliding on the same
 * `indexOf`. Each `<!--count:NAME-->N<!--/count:NAME-->` pair is replaced
 * independently and can repeat (the same NAME may appear more than once in
 * the file); a name with no matching pair anywhere is a hard error rather
 * than a silent no-op, so a typo'd or removed marker fails loudly instead of
 * quietly leaving stale prose in place.
 */
export function spliceNamedCounts(content: string, counts: Record<string, number>): string {
  let result = content;
  for (const [name, value] of Object.entries(counts)) {
    const pattern = new RegExp(`(<!--count:${name}-->)\\d+(<!--\\/count:${name}-->)`, "g");
    if (!new RegExp(pattern.source).test(result)) {
      throw new Error(
        `No <!--count:${name}-->N<!--/count:${name}--> marker found anywhere in the content.`,
      );
    }
    result = result.replace(pattern, `$1${value}$2`);
  }
  return result;
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export type SpellCatalogMode = "check" | "fix";

export async function runSpellCatalogCheck(
  mode: SpellCatalogMode,
  rootDir: string,
  assetsDir: string,
): Promise<SpellCatalogResult> {
  const catalog = await generateSpellCatalog(assetsDir);
  const drifted: string[] = [];
  const repaired: string[] = [];

  const jsonPath = join(rootDir, "docs", "spell-catalog.json");
  const expectedJson = renderJsonArtifact(catalog);
  const actualJson = await readOptionalFile(jsonPath);
  if (actualJson === null || normalizeLineEndings(actualJson) !== normalizeLineEndings(expectedJson)) {
    drifted.push(`docs/spell-catalog.json does not match the registry (${catalog.totalSpells} spells).`);
    if (mode === "fix") {
      await writeFile(jsonPath, expectedJson, "utf8");
      repaired.push("docs/spell-catalog.json");
    }
  }

  const readmePath = join(rootDir, "README.md");
  const readme = await readFile(readmePath, "utf8");
  let expectedReadme = spliceReadmeBlock(readme, renderReadmeBlock(catalog));
  expectedReadme = spliceReadmeBlock(
    expectedReadme,
    renderGovernanceBlock(catalog),
    GOVERNANCE_MARKER_START,
    GOVERNANCE_MARKER_END,
  );
  expectedReadme = spliceReadmeBlock(
    expectedReadme,
    renderCapabilitiesBlock(catalog.capabilities),
    CAPABILITIES_MARKER_START,
    CAPABILITIES_MARKER_END,
  );
  expectedReadme = spliceNamedCounts(expectedReadme, {
    spells: catalog.totalSpells,
    agents: catalog.totalAgents,
    governance: catalog.totalGovernanceDocs,
  });
  if (normalizeLineEndings(readme) !== normalizeLineEndings(expectedReadme)) {
    drifted.push(
      "README.md's spell catalogue block, governance-standards block, capabilities block, and/or spell/agent/governance counts do not match the registry and src/config/capabilities.ts.",
    );
    if (mode === "fix") {
      await writeFile(readmePath, expectedReadme, "utf8");
      repaired.push("README.md");
    }
  }

  return { drifted, repaired };
}

async function main(): Promise<void> {
  const [argument] = process.argv.slice(2);
  if (!["--check", "--fix"].includes(argument ?? "")) {
    console.error("Usage: tsx scripts/spell-catalog.ts --check|--fix");
    process.exitCode = 2;
    return;
  }

  const mode: SpellCatalogMode = argument === "--fix" ? "fix" : "check";
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const assetsDir = join(rootDir, "src", "assets");
  const result = await runSpellCatalogCheck(mode, rootDir, assetsDir);

  if (mode === "fix") {
    console.log(`Spell catalog: regenerated ${result.repaired.length} file(s).`);
    return;
  }

  if (result.drifted.length > 0) {
    console.error("Spell catalog FAILED: generated artifacts are out of date with src/modules/registry.ts.");
    for (const message of result.drifted) console.error(`  ${message}`);
    console.error("Run `npm run fix:spell-catalog`; never hand-edit docs/spell-catalog.json or the README block.");
    process.exitCode = 1;
    return;
  }

  console.log("Spell catalog passed: docs/spell-catalog.json and README.md match src/modules/registry.ts.");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error("spell-catalog failed:", error);
    process.exitCode = 1;
  });
}
