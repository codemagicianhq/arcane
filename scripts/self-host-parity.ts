#!/usr/bin/env tsx
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllComponents } from "../src/modules/registry.js";
import {
    CANONICAL_SPELLS_DIR,
    CLIENT_SHIM_PATHS,
    canonicalSpellPath,
    parsePromptFrontmatter,
    renderClaudeCommandStub,
    renderCodexSkill,
    renderCopilotPromptShim,
    expandFragment,
    referencesFragment,
} from "../src/modules/spell-compiler.js";
import type { PromptFrontmatter } from "../src/modules/spell-compiler.js";

const GENERATED_ROOTS = [".github/", ".arcane/", ".claude/", ".agents/"];

export type ParityMode = "check" | "fix";

export interface ParityResult {
    checked: number;
    repaired: string[];
    drifted: string[];
}

function toRegistryPath(path: string): string {
    return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isGeneratedPath(path: string): boolean {
    return GENERATED_ROOTS.some((prefix) => path.startsWith(prefix));
}

async function listFiles(root: string): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const entryPath = join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...await listFiles(entryPath));
        } else if (entry.isFile()) {
            files.push(entryPath);
        }
    }

    return files;
}

export async function getGeneratedDogfoodPaths(
    assetsDir: string,
): Promise<string[]> {
    const paths = new Set<string>();

    for (const component of getAllComponents()) {
        if (component.skipExisting) continue;

        for (const file of component.files) {
            const path = toRegistryPath(file);
            if (isGeneratedPath(path)) paths.add(path);
        }

        for (const directory of component.directories ?? []) {
            const registryDirectory = toRegistryPath(directory).replace(/\/$/, "");
            if (!isGeneratedPath(`${registryDirectory}/`)) continue;

            const canonicalDirectory = join(assetsDir, registryDirectory);
            for (const file of await listFiles(canonicalDirectory)) {
                paths.add(toRegistryPath(relative(assetsDir, file)));
            }
        }
    }

    return [...paths].sort();
}

function normalizeLineEndings(content: Buffer): string {
    return content.toString("utf8").replace(/\r\n?/g, "\n");
}

async function readOptionalFile(path: string): Promise<Buffer | null> {
    try {
        return await readFile(path);
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
    }
}

function resolveWithin(root: string, registryPath: string): string {
    const rootPath = resolve(root);
    const resolvedPath = resolve(rootPath, registryPath);
    if (resolvedPath !== rootPath && !resolvedPath.startsWith(`${rootPath}${sep}`)) {
        throw new Error(`Registry path escapes its root: ${registryPath}`);
    }
    return resolvedPath;
}

export async function runSelfHostParity(
    mode: ParityMode,
    rootDir: string,
    assetsDir: string,
): Promise<ParityResult> {
    const paths = await getGeneratedDogfoodPaths(assetsDir);
    const drifted: string[] = [];
    const repaired: string[] = [];

    for (const path of paths) {
        const canonicalPath = resolveWithin(assetsDir, path);
        const outputPath = resolveWithin(rootDir, path);
        const canonical = await readFile(canonicalPath);
        const output = await readOptionalFile(outputPath);
        const matches = output !== null
            && normalizeLineEndings(output) === normalizeLineEndings(canonical);

        if (matches) continue;
        drifted.push(path);

        if (mode === "fix") {
            await mkdir(dirname(outputPath), { recursive: true });
            await copyFile(canonicalPath, outputPath);
            repaired.push(path);
        }
    }

    return { checked: paths.length, repaired, drifted };
}

// ─── Shim parity axis (ARC-039 / BC-32, generalized by ARC-045 / CS-03) ───────
// `.arcane/spells/spell-*.md` is each spell's sole authored source; the Copilot
// prompt, the Claude Code command and the Codex skill are generated shims over
// it, with no prose of their own. Unlike the axis above (canonical src/assets/
// vs. generated root copy of the SAME file), this axis compares DIFFERENT
// canonical files against each other, all still inside src/assets/ -- it never
// touches the root dogfood copies directly (those stay covered by the axis
// above, once this one has kept the three shim directories in sync).
//
// Ids are enumerated from the canonical folder and nowhere else: a shim file
// with no canonical source is an orphan the copy axis reports (it is absent
// from the registry), never a spell.

// A canonical spell file is exactly `spell-<lowercase-id>.md`; anything else in
// the folder (a stray `spell-x.prompt.md`, a README) is not a spell and must
// not become a malformed id that renderCodexSkill then rejects mid-run.
const CANONICAL_SPELL_FILE_PATTERN = /^spell-[a-z0-9-]+\.md$/;

async function listSpellIds(spellsDir: string): Promise<string[]> {
    const entries = await readdir(spellsDir).catch(() => [] as string[]);
    return entries
        .filter((name) => CANONICAL_SPELL_FILE_PATTERN.test(name))
        .map((name) => name.replace(/\.md$/, ""))
        .sort();
}

interface ShimTarget {
    label: string;
    relativePath: (id: string) => string;
    render: (id: string, canonicalContent: string, frontmatter: PromptFrontmatter) => string;
}

/** The three client surfaces, each rendered from the same canonical file. */
export const SHIM_TARGETS: readonly ShimTarget[] = [
    {
        label: "copilot",
        relativePath: CLIENT_SHIM_PATHS.copilot,
        render: (id, canonicalContent) => renderCopilotPromptShim(id, canonicalContent),
    },
    {
        label: "claude",
        relativePath: CLIENT_SHIM_PATHS.claude,
        render: (id, _canonicalContent, frontmatter) => renderClaudeCommandStub(id, frontmatter),
    },
    {
        label: "codex",
        relativePath: CLIENT_SHIM_PATHS.codex,
        render: (id, _canonicalContent, frontmatter) =>
            renderCodexSkill(id, frontmatter, canonicalSpellPath(id)),
    },
];

export async function runShimParity(
    mode: ParityMode,
    assetsDir: string,
): Promise<ParityResult> {
    const spellsDir = join(assetsDir, CANONICAL_SPELLS_DIR);
    const ids = await listSpellIds(spellsDir);
    const drifted: string[] = [];
    const repaired: string[] = [];

    for (const id of ids) {
        const canonicalContent = await readFile(join(spellsDir, `${id}.md`), "utf8");
        const frontmatter = parsePromptFrontmatter(canonicalContent);

        for (const target of SHIM_TARGETS) {
            const relativePath = target.relativePath(id);
            const expected = target.render(id, canonicalContent, frontmatter);
            const outputPath = join(assetsDir, relativePath);
            const actual = await readOptionalFile(outputPath);
            const matches = actual !== null && normalizeLineEndings(actual) === expected;

            if (matches) continue;
            drifted.push(relativePath);

            if (mode === "fix") {
                await mkdir(dirname(outputPath), { recursive: true });
                await writeFile(outputPath, expected, "utf8");
                repaired.push(relativePath);
            }
        }
    }

    return { checked: ids.length * SHIM_TARGETS.length, repaired, drifted };
}

// ─── Fragment parity axis (ARC-039 / BC-32) ───────────────────────────────────
// Fragments under .arcane/spells/_fragments/ are never shipped standalone
// (no registry entry) -- they exist only to keep a consuming spell's marked
// span in sync with its one canonical source, expanded in place at this same
// build step. A spell that does not reference a given fragment is untouched.

export async function runFragmentParity(
    mode: ParityMode,
    assetsDir: string,
): Promise<ParityResult> {
    const spellsDir = join(assetsDir, CANONICAL_SPELLS_DIR);
    const fragmentsDir = join(spellsDir, "_fragments");
    const ids = await listSpellIds(spellsDir);
    const fragmentNames = (await readdir(fragmentsDir).catch(() => [] as string[]))
        .filter((name) => name.endsWith(".md"))
        .map((name) => name.replace(/\.md$/, ""));

    const drifted: string[] = [];
    const repaired: string[] = [];
    let checked = 0;

    for (const id of ids) {
        const spellPath = join(spellsDir, `${id}.md`);
        let content = await readFile(spellPath, "utf8");
        let fileChanged = false;

        for (const fragmentName of fragmentNames) {
            if (!referencesFragment(content, fragmentName)) continue;
            checked++;

            const fragmentContent = await readFile(join(fragmentsDir, `${fragmentName}.md`), "utf8");
            const expanded = expandFragment(content, fragmentName, fragmentContent);
            if (expanded === content) continue;

            drifted.push(`${canonicalSpellPath(id)} (fragment: ${fragmentName})`);
            if (mode === "fix") {
                content = expanded;
                fileChanged = true;
            }
        }

        if (fileChanged) {
            await writeFile(spellPath, content, "utf8");
            repaired.push(canonicalSpellPath(id));
        }
    }

    return { checked, repaired, drifted };
}

async function main(): Promise<void> {
    const [argument, ...extraArguments] = process.argv.slice(2);
    if (extraArguments.length > 0 || !["--check", "--fix"].includes(argument ?? "")) {
        console.error("Usage: tsx scripts/self-host-parity.ts --check|--fix");
        process.exitCode = 2;
        return;
    }

    const mode: ParityMode = argument === "--fix" ? "fix" : "check";
    const rootDir = process.env["ARCANE_SELF_HOST_ROOT"] ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const assetsDir = process.env["ARCANE_SELF_HOST_ASSETS_DIR"] ?? join(rootDir, "src", "assets");

    // The fragment and shim axes operate on canonical src/assets/ content
    // itself and must settle first in --fix mode, so the canonical-vs-root
    // copy axis below reflects the fully-repaired canonical state, not a
    // stale one. Fragments before shims: a shim's frontmatter comes from the
    // canonical file the fragment pass may have just rewritten.
    const fragmentResult = await runFragmentParity(mode, assetsDir);
    const shimResult = await runShimParity(mode, assetsDir);
    const copyResult = await runSelfHostParity(mode, rootDir, assetsDir);

    const totalChecked = fragmentResult.checked + shimResult.checked + copyResult.checked;
    const totalDrifted = [
        ...fragmentResult.drifted.map((path) => `[fragment] ${path}`),
        ...shimResult.drifted.map((path) => `[shim] ${path}`),
        ...copyResult.drifted.map((path) => `[copy] ${path}`),
    ];
    const totalRepaired = [...fragmentResult.repaired, ...shimResult.repaired, ...copyResult.repaired];

    if (mode === "fix") {
        console.log(`Self-host parity repaired ${totalRepaired.length} of ${totalChecked} checked (fragments: ${fragmentResult.repaired.length}, shims: ${shimResult.repaired.length}, copies: ${copyResult.repaired.length}).`);
        return;
    }

    if (totalDrifted.length > 0) {
        console.error(`Self-host parity FAILED: ${totalDrifted.length} of ${totalChecked} checked items differ from their canonical source.`);
        for (const path of totalDrifted) console.error(`  ${path}`);
        console.error("Run `npm run fix:self-host-parity`; never hand-edit generated root copies or any client shim (.github/prompts/, .claude/commands/, .agents/skills/) -- edit .arcane/spells/<id>.md.");
        process.exitCode = 1;
        return;
    }

    console.log(`Self-host parity passed: ${totalChecked} checked items match their canonical source.`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
    main().catch((error: unknown) => {
        console.error("self-host-parity failed:", error);
        process.exitCode = 1;
    });
}
