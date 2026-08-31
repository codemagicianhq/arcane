#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { getAllComponents } from "../src/modules/registry.js";
import { MARKER_START, MARKER_END } from "../src/modules/merger.js";

const PROMPT_PREFIX = ".github/prompts/";
const PROMPT_SUFFIX = ".prompt.md";

export interface SpellCatalogEntry {
  id: string;
  shortName: string;
  name: string;
  description: string;
}

export interface SpellCatalogGroup {
  component: string;
  label: string;
  spells: SpellCatalogEntry[];
}

export interface SpellCatalog {
  totalSpells: number;
  groups: SpellCatalogGroup[];
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
  return base.slice(0, -PROMPT_SUFFIX.length);
}

interface PromptFrontmatter {
  name?: unknown;
  description?: unknown;
}

async function loadFrontmatter(
  assetsDir: string,
  promptPath: string,
): Promise<{ name: string; description: string }> {
  const raw = await readFile(join(assetsDir, promptPath), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) {
    throw new Error(`${promptPath}: no YAML frontmatter block found`);
  }

  const parsed = parseYaml(match[1]) as PromptFrontmatter;
  if (typeof parsed.name !== "string" || typeof parsed.description !== "string") {
    throw new Error(`${promptPath}: frontmatter is missing a string "name" or "description"`);
  }

  return { name: parsed.name, description: parsed.description };
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
  let totalSpells = 0;

  for (const component of getAllComponents()) {
    if (!component.name.startsWith("spells-")) continue;

    const promptFiles = component.files.filter(
      (file) => file.startsWith(PROMPT_PREFIX) && file.endsWith(PROMPT_SUFFIX),
    );

    const spells: SpellCatalogEntry[] = [];
    for (const file of promptFiles) {
      const id = idForPromptFile(file);
      const { name, description } = await loadFrontmatter(assetsDir, file);
      spells.push({ id, shortName: id.replace(/^spell-/, ""), name, description });
    }

    groups.push({ component: component.name, label: labelForComponent(component.name), spells });
    totalSpells += spells.length;
  }

  return { totalSpells, groups };
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

export function spliceReadmeBlock(readme: string, block: string): string {
  const startIdx = readme.indexOf(MARKER_START);
  const endIdx = readme.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    throw new Error(
      `README.md is missing well-formed ${MARKER_START}/${MARKER_END} markers around the spell catalogue block`,
    );
  }

  const before = readme.slice(0, startIdx + MARKER_START.length);
  const after = readme.slice(endIdx);
  return `${before}\n${block}\n${after}`;
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
  const block = renderReadmeBlock(catalog);
  const expectedReadme = spliceReadmeBlock(readme, block);
  if (normalizeLineEndings(readme) !== normalizeLineEndings(expectedReadme)) {
    drifted.push("README.md's spell catalogue block does not match the registry.");
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
