import { describe, expect, it } from "vitest";
import { cp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  CAPABILITIES_MARKER_END,
  CAPABILITIES_MARKER_START,
  TAGLINE_MAX_LENGTH,
  catalogCapabilities,
  generateSpellCatalog,
  parseExecutiveSummary,
  renderCapabilitiesBlock,
  renderJsonArtifact,
  renderReadmeBlock,
  spliceReadmeBlock,
  taglineProblem,
} from "../scripts/spell-catalog.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { getAllComponents, listProfiles } from "../src/modules/registry.js";
import { AGENT_ROLES } from "../src/config/agent-roles.js";
import { CAPABILITY_LINES, CAPABILITY_THEMES } from "../src/config/capabilities.js";
import type { CapabilityLine } from "../src/config/capabilities.js";

/**
 * T15/BC-23. registry.ts's spells-* components are the single source of
 * truth for which spells exist -- this replaces a hand-maintained README
 * list that silently missed spell-adopt-docs, spell-make-discoverable,
 * spell-scry and spell-sync-pull-request (confirmed drifted: README said
 * "34" while the registry already had 38). Structured the same way ARC-012's
 * agent-roster-parity test is: render live from the source, byte-compare
 * against committed output, so a future spell can never be silently omitted.
 */

const ROOT_DIR = process.cwd();
const ASSETS_DIR = join(ROOT_DIR, "src", "assets");

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

describe("registry-driven spell catalog (T15/BC-23)", () => {
  it("includes exactly the spells registered under spells-* components, with no omissions", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    const expectedTotal = getAllComponents()
      .filter((component) => component.name.startsWith("spells-"))
      .reduce(
        (sum, component) => sum + component.files.filter((file) => file.startsWith(".arcane/spells/")).length,
        0,
      );

    expect(catalog.totalSpells).toBeGreaterThan(0);
    expect(catalog.totalSpells).toBe(expectedTotal);
    expect(catalog.groups.reduce((sum, group) => sum + group.spells.length, 0)).toBe(expectedTotal);
  });

  it("every spell entry has a non-empty name, description and tagline sourced from its own frontmatter", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    for (const group of catalog.groups) {
      expect(group.spells.length).toBeGreaterThan(0);
      for (const spell of group.spells) {
        expect(spell.id.startsWith("spell-")).toBe(true);
        expect(spell.shortName.length).toBeGreaterThan(0);
        expect(spell.name.length).toBeGreaterThan(0);
        expect(spell.description.length).toBeGreaterThan(0);
        expect(taglineProblem(spell.tagline)).toBeNull();
      }
    }
  });

  it("every distributed governance doc carries a tagline under the same contract", async () => {
    const files = new Set<string>();
    for (const component of getAllComponents()) {
      for (const file of component.files) {
        if (file.startsWith(".arcane/governance/") && file.endsWith(".md")) files.add(file);
      }
    }
    expect(files.size).toBeGreaterThan(0);
    for (const file of files) {
      const raw = await readFile(join(ASSETS_DIR, file), "utf8");
      const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
      expect(block, `${file} has frontmatter`).not.toBeNull();
      const parsed = parseYaml(block![1]) as Record<string, unknown>;
      expect(taglineProblem(parsed["tagline"]), file).toBeNull();
    }
  });

  it("the tagline contract: one sentence, at most 60 characters, no trailing period", () => {
    expect(TAGLINE_MAX_LENGTH).toBe(60);
    expect(taglineProblem("Start a logged working session")).toBeNull();
    expect(taglineProblem("Wrap up; journal the session")).toBeNull();
    expect(taglineProblem("GDPR/CCPA/SOC 2/HIPAA, before you need it")).toBeNull();
    expect(taglineProblem("x".repeat(60))).toBeNull();

    expect(taglineProblem(undefined)).toMatch(/missing/);
    expect(taglineProblem(42)).toMatch(/missing/);
    expect(taglineProblem("")).toMatch(/empty/);
    expect(taglineProblem("   ")).toMatch(/empty/);
    expect(taglineProblem(" padded")).toMatch(/whitespace/);
    expect(taglineProblem("x".repeat(61))).toMatch(/61 characters; the maximum is 60/);
    expect(taglineProblem("Ends with a period.")).toMatch(/period/);
    expect(taglineProblem("Shouts!")).toMatch(/period or other sentence mark/);
    expect(taglineProblem("Two sentences. Not one")).toMatch(/one sentence/);
    expect(taglineProblem("Two\nlines")).toMatch(/single line/);
  });

  it("the gate fails on a spell whose tagline is missing or too long", async () => {
    const fixture = await createFixtureDir("arcane-catalog-tagline");
    try {
      await cp(ASSETS_DIR, fixture, { recursive: true });
      const target = join(fixture, ".arcane", "spells", "spell-open-session.md");
      const original = await readFile(target, "utf8");

      await writeFile(target, original.replace(/^tagline: .*$/m, `tagline: ${"x".repeat(61)}`), "utf8");
      await expect(generateSpellCatalog(fixture)).rejects.toThrow(/spell-open-session\.md: frontmatter "tagline" is 61 characters/);

      await writeFile(target, original.replace(/^tagline: .*\r?\n/m, ""), "utf8");
      await expect(generateSpellCatalog(fixture)).rejects.toThrow(/spell-open-session\.md: frontmatter missing a string "tagline"/);

      const governance = join(fixture, ".arcane", "governance", "git-conventions.md");
      const governanceOriginal = await readFile(governance, "utf8");
      await writeFile(governance, governanceOriginal.replace(/^tagline: .*\r?\n/m, ""), "utf8");
      await writeFile(target, original, "utf8");
      await expect(generateSpellCatalog(fixture)).rejects.toThrow(/git-conventions\.md: frontmatter missing a string "tagline"/);
    } finally {
      await removeFixtureDir(fixture);
    }
  });

  it("spells[] is the flat view of groups[], with the client hints, the group and the Executive Summary bullets", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    const flattened = catalog.groups.flatMap((group) =>
      group.spells.map((spell) => ({ ...spell, group: group.component })),
    );
    expect(catalog.spells.map((s) => s.id)).toEqual(flattened.map((s) => s.id));
    for (const [index, spell] of catalog.spells.entries()) {
      const fromGroup = flattened[index];
      expect(spell).toMatchObject(fromGroup);
      expect(spell.claudeDescription.length).toBeGreaterThan(0);
      expect(spell.argumentHint.length).toBeGreaterThan(0);
      expect(Array.isArray(spell.executiveSummary)).toBe(true);
      for (const bullet of spell.executiveSummary) {
        expect(bullet.trim()).toBe(bullet);
        expect(bullet.length).toBeGreaterThan(0);
        expect(bullet.startsWith("- ")).toBe(false);
      }
    }
    // The one spell authored without the section is the only empty list.
    expect(catalog.spells.filter((s) => s.executiveSummary.length === 0).map((s) => s.id)).toEqual([
      "spell-present-arcane",
    ]);
  });

  it("parseExecutiveSummary folds wrapped bullets, skips prose, and stops at the first rule", () => {
    const content = [
      "---",
      "name: x",
      "---",
      "",
      "## Executive Summary",
      "",
      "- First bullet",
      "  continues here.",
      "- Second bullet",
      "",
      "**Related spells:** a paragraph that is not a bullet.",
      "",
      "---",
      "",
      "- A bullet after the rule is body text, not summary",
      "",
    ].join("\n");
    expect(parseExecutiveSummary(content)).toEqual(["First bullet continues here.", "Second bullet"]);
    expect(parseExecutiveSummary(content.replace(/\n/g, "\r\n"))).toEqual([
      "First bullet continues here.",
      "Second bullet",
    ]);
    expect(parseExecutiveSummary("---\nname: x\n---\n\n## Mode Selection\n\n- not a summary\n")).toEqual([]);
  });

  it("governance[] carries slug, title, tagline, status, audience and tags for every distributed doc, in governanceDocs order", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    expect(catalog.governance.length).toBe(catalog.totalGovernanceDocs);
    expect(catalog.governance.map((doc) => doc.slug)).toEqual(catalog.governanceDocs);
    for (const doc of catalog.governance) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(taglineProblem(doc.tagline)).toBeNull();
      expect(["active", "draft", "template"]).toContain(doc.status);
      expect(["both", "human", "ai", "contributor"]).toContain(doc.audience);
      expect(doc.tags.length).toBeGreaterThan(0);
    }
  });

  it("profiles[] expands src/config/profiles.ts into spell ids, governance slugs and extras, with every component reported once", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    const profiles = listProfiles();
    expect(catalog.profiles.map((p) => p.id)).toEqual(profiles.map((p) => p.id));
    const allSpellIds = new Set(catalog.spells.map((s) => s.id));
    const allSlugs = new Set(catalog.governanceDocs);
    for (const [index, profile] of catalog.profiles.entries()) {
      expect(profile.displayName).toBe(profiles[index].displayName);
      expect(profile.description).toBe(profiles[index].description);
      for (const id of profile.spellIds) expect(allSpellIds.has(id), id).toBe(true);
      for (const slug of profile.governanceSlugs) expect(allSlugs.has(slug), slug).toBe(true);
      expect(new Set(profile.spellIds).size).toBe(profile.spellIds.length);
      expect(new Set(profile.governanceSlugs).size).toBe(profile.governanceSlugs.length);
      // Every extra is a registered component that ships neither spells nor governance docs.
      for (const name of profile.extras) {
        const component = getAllComponents().find((c) => c.name === name);
        expect(component, name).toBeDefined();
        expect(component!.files.some((f) => f.startsWith(".arcane/spells/") || f.startsWith(".arcane/governance/"))).toBe(false);
      }
    }
    const full = catalog.profiles.find((p) => p.id === "full")!;
    expect(full.spellIds).toEqual([...allSpellIds]);
    expect(full.governanceSlugs).toEqual(catalog.governanceDocs);
    const governanceOnly = catalog.profiles.find((p) => p.id === "governance-only")!;
    expect(governanceOnly.spellIds).toEqual([]);
  });

  it("agents[] joins agent-roles.ts with the framework naming strategy, one entry per role", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    expect(catalog.agents.length).toBe(AGENT_ROLES.length);
    expect(catalog.totalAgents).toBe(catalog.agents.length);
    expect(catalog.agents.map((a) => a.id)).toEqual(AGENT_ROLES.map((r) => r.id));
    for (const [index, agent] of catalog.agents.entries()) {
      expect(agent.role).toBe(AGENT_ROLES[index].role);
      expect(agent.category).toBe(AGENT_ROLES[index].category);
      expect(agent.codename.length).toBeGreaterThan(0);
      expect(agent.epithet.startsWith("the ")).toBe(true);
    }
    expect(new Set(catalog.agents.map((a) => a.codename)).size).toBe(catalog.agents.length);
  });

  it("the gate fails on a spell without an argument-hint and on a governance doc without status, audience or tags", async () => {
    const fixture = await createFixtureDir("arcane-catalog-fields");
    try {
      await cp(ASSETS_DIR, fixture, { recursive: true });
      const spell = join(fixture, ".arcane", "spells", "spell-plan.md");
      const spellOriginal = await readFile(spell, "utf8");
      await writeFile(spell, spellOriginal.replace(/^argument-hint: .*\r?\n/m, ""), "utf8");
      await expect(generateSpellCatalog(fixture)).rejects.toThrow(/spell-plan\.md: frontmatter is missing a string "argument-hint"/);
      await writeFile(spell, spellOriginal, "utf8");

      const doc = join(fixture, ".arcane", "governance", "testing-standards.md");
      const docOriginal = await readFile(doc, "utf8");
      await writeFile(doc, docOriginal.replace(/^audience: .*\r?\n/m, ""), "utf8");
      await expect(generateSpellCatalog(fixture)).rejects.toThrow(/testing-standards\.md: frontmatter is missing a string "audience"/);
      await writeFile(doc, docOriginal.replace(/^tags: .*$/m, "tags: not-a-list"), "utf8");
      await expect(generateSpellCatalog(fixture)).rejects.toThrow(/testing-standards\.md: frontmatter "tags" must be a list of strings/);
    } finally {
      await removeFixtureDir(fixture);
    }
  });

  it("capabilities carries src/config/capabilities.ts verbatim, with every line under a declared theme", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    expect(catalog.capabilities.themes).toEqual(CAPABILITY_THEMES);
    expect(catalog.capabilities.lines).toEqual(CAPABILITY_LINES);
    expect(catalog.capabilities.holds.map((h) => h.id)).toEqual(["cli", "spell", "convention"]);
    const themeIds = new Set(catalog.capabilities.themes.map((t) => t.id));
    for (const line of catalog.capabilities.lines) {
      expect(themeIds.has(line.theme), line.id).toBe(true);
      expect(line.headline.length).toBeGreaterThan(0);
      expect(line.text.length).toBeGreaterThan(0);
      expect(line.source.length).toBeGreaterThan(0);
      expect(line.holds.length === 0).toBe(line.theme === "limits");
    }
  });

  it("catalogCapabilities refuses a malformed source", () => {
    const valid = catalogCapabilities();
    const line = (overrides: Partial<CapabilityLine>): CapabilityLine => ({
      id: "x",
      headline: "X",
      text: "X.",
      holds: ["cli"],
      source: "spell x",
      theme: "memory",
      ...overrides,
    });
    const withLines = (lines: CapabilityLine[]) => ({ ...valid, lines });
    expect(() => catalogCapabilities(withLines([...valid.lines, line({ id: "install-once" })]))).toThrow(/duplicate line id/);
    expect(() => catalogCapabilities(withLines([...valid.lines, line({ theme: "nope" })]))).toThrow(/unknown theme "nope"/);
    expect(() => catalogCapabilities(withLines([...valid.lines, line({ holds: ["nope" as never] })]))).toThrow(/unknown hold "nope"/);
    expect(() => catalogCapabilities(withLines([...valid.lines, line({ holds: ["cli", "cli"] })]))).toThrow(/repeats a hold/);
    expect(() => catalogCapabilities(withLines([...valid.lines, line({ headline: " " })]))).toThrow(/empty headline/);
    expect(() => catalogCapabilities(withLines([...valid.lines, line({ holds: [] })]))).toThrow(/no hold if and only if/);
    expect(() => catalogCapabilities(withLines([...valid.lines, line({ theme: "limits" })]))).toThrow(/no hold if and only if/);
    expect(() => catalogCapabilities(withLines(valid.lines.filter((l) => l.theme !== "done")))).toThrow(/theme "done" has no lines/);
    expect(() =>
      catalogCapabilities({ ...valid, themes: [...valid.themes, { id: "memory", title: "Again." }] }),
    ).toThrow(/duplicate theme id/);
  });

  it("renderCapabilitiesBlock prints text, qualifier, limit and the hold markers, and no marker for a non-claim", () => {
    const block = renderCapabilitiesBlock({
      legend: "Legend.",
      holds: [
        { id: "cli", label: "CLI", meaning: "the CLI does it." },
        { id: "spell", label: "Spell step", meaning: "the client does it." },
        { id: "convention", label: "Convention", meaning: "nothing checks it." },
      ],
      themes: [
        { id: "a", title: "A." },
        { id: "limits", title: "Not." },
      ],
      lines: [
        { id: "one", headline: "One", text: "One.", qualifier: "Q.", limit: "L.", holds: ["cli", "spell"], source: "s", theme: "a" },
        { id: "two", headline: "Two", text: "Two.", holds: [], source: "s", theme: "limits" },
      ],
    });
    expect(block).toBe(
      [
        "Legend. *CLI:* the CLI does it. *Spell step:* the client does it. *Convention:* nothing checks it.",
        "",
        "**A.**",
        "- One. Q. L. *CLI · Spell step*",
        "",
        "**Not.**",
        "- Two.",
      ].join("\n"),
    );
  });

  it("ARC-012/ARC-027-style parity: committed README.md's marked capabilities block matches what src/config/capabilities.ts renders", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    const block = renderCapabilitiesBlock(catalog.capabilities);
    const readme = await readFile(join(ROOT_DIR, "README.md"), "utf8");
    const expected = spliceReadmeBlock(readme, block, CAPABILITIES_MARKER_START, CAPABILITIES_MARKER_END);
    expect(normalizeLineEndings(readme)).toBe(normalizeLineEndings(expected));
  });

  it("renders the README block and JSON artifact deterministically", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    expect(renderReadmeBlock(catalog)).toBe(renderReadmeBlock(catalog));
    expect(renderJsonArtifact(catalog)).toBe(renderJsonArtifact(catalog));
  });

  it("ARC-012/ARC-027-style parity: committed docs/spell-catalog.json matches what the generator currently produces", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    const expected = renderJsonArtifact(catalog);
    const committed = await readFile(join(ROOT_DIR, "docs", "spell-catalog.json"), "utf8");
    expect(normalizeLineEndings(committed)).toBe(normalizeLineEndings(expected));
  });

  it("ARC-012/ARC-027-style parity: committed README.md's marked spell-catalogue block matches what the generator currently produces", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    const block = renderReadmeBlock(catalog);
    const readme = await readFile(join(ROOT_DIR, "README.md"), "utf8");
    const expected = spliceReadmeBlock(readme, block);
    expect(normalizeLineEndings(readme)).toBe(normalizeLineEndings(expected));
  });
});
