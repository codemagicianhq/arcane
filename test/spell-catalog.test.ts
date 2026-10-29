import { describe, expect, it } from "vitest";
import { cp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  TAGLINE_MAX_LENGTH,
  generateSpellCatalog,
  renderJsonArtifact,
  renderReadmeBlock,
  spliceReadmeBlock,
  taglineProblem,
} from "../scripts/spell-catalog.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { getAllComponents } from "../src/modules/registry.js";

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
