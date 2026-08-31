import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  generateSpellCatalog,
  renderJsonArtifact,
  renderReadmeBlock,
  spliceReadmeBlock,
} from "../scripts/spell-catalog.js";
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
        (sum, component) => sum + component.files.filter((file) => file.endsWith(".prompt.md")).length,
        0,
      );

    expect(catalog.totalSpells).toBeGreaterThan(0);
    expect(catalog.totalSpells).toBe(expectedTotal);
    expect(catalog.groups.reduce((sum, group) => sum + group.spells.length, 0)).toBe(expectedTotal);
  });

  it("every spell entry has a non-empty name and description sourced from its own frontmatter", async () => {
    const catalog = await generateSpellCatalog(ASSETS_DIR);
    for (const group of catalog.groups) {
      expect(group.spells.length).toBeGreaterThan(0);
      for (const spell of group.spells) {
        expect(spell.id.startsWith("spell-")).toBe(true);
        expect(spell.shortName.length).toBeGreaterThan(0);
        expect(spell.name.length).toBeGreaterThan(0);
        expect(spell.description.length).toBeGreaterThan(0);
      }
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
