#!/usr/bin/env tsx
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllComponents } from "../src/modules/registry.js";
import {
    parsePromptFrontmatter,
    renderClaudeCommandStub,
    expandFragment,
    referencesFragment,
} from "../src/modules/spell-compiler.js";

const GENERATED_ROOTS = [".github/", ".arcane/", ".claude/"];

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

// ─── Third parity axis (ARC-039 / BC-32): stub-content-vs-prompt-frontmatter ──
// `.github/prompts/spell-*.prompt.md` is each spell's sole authored source;
// `.claude/commands/spell-*.md` is a generated thin shim. Unlike the axis
// above (canonical src/assets/ vs. generated root copy of the SAME file),
// this axis compares two DIFFERENT canonical files against each other, both
// still inside src/assets/ -- it never touches the root dogfood copies
// directly (those stay covered by the axis above, once this one has kept
// src/assets/.claude/commands/ itself in sync).

async function listSpellPromptIds(promptsDir: string): Promise<string[]> {
    const entries = await readdir(promptsDir).catch(() => [] as string[]);
    return entries
        .filter((name) => name.startsWith("spell-") && name.endsWith(".prompt.md"))
        .map((name) => name.replace(/\.prompt\.md$/, ""))
        .sort();
}

export async function runStubParity(
    mode: ParityMode,
    assetsDir: string,
): Promise<ParityResult> {
    const promptsDir = join(assetsDir, ".github", "prompts");
    const commandsDir = join(assetsDir, ".claude", "commands");
    const ids = await listSpellPromptIds(promptsDir);
    const drifted: string[] = [];
    const repaired: string[] = [];

    for (const id of ids) {
        const promptContent = await readFile(join(promptsDir, `${id}.prompt.md`), "utf8");
        const frontmatter = parsePromptFrontmatter(promptContent);
        const expected = renderClaudeCommandStub(id, frontmatter);
        const stubPath = join(commandsDir, `${id}.md`);
        const actual = await readOptionalFile(stubPath);
        const matches = actual !== null && normalizeLineEndings(actual) === expected;

        if (matches) continue;
        const relativePath = `.claude/commands/${id}.md`;
        drifted.push(relativePath);

        if (mode === "fix") {
            await mkdir(dirname(stubPath), { recursive: true });
            await writeFile(stubPath, expected, "utf8");
            repaired.push(relativePath);
        }
    }

    return { checked: ids.length, repaired, drifted };
}

// ─── Fourth parity axis (ARC-039 / BC-32): shared prose fragments ─────────────
// Fragments under .github/prompts/_fragments/ are never shipped standalone
// (no registry entry) -- they exist only to keep a consuming prompt's marked
// span in sync with its one canonical source, expanded in place at this same
// build step. A prompt that does not reference a given fragment is untouched.

export async function runFragmentParity(
    mode: ParityMode,
    assetsDir: string,
): Promise<ParityResult> {
    const promptsDir = join(assetsDir, ".github", "prompts");
    const fragmentsDir = join(promptsDir, "_fragments");
    const ids = await listSpellPromptIds(promptsDir);
    const fragmentNames = (await readdir(fragmentsDir).catch(() => [] as string[]))
        .filter((name) => name.endsWith(".md"))
        .map((name) => name.replace(/\.md$/, ""));

    const drifted: string[] = [];
    const repaired: string[] = [];
    let checked = 0;

    for (const id of ids) {
        const promptPath = join(promptsDir, `${id}.prompt.md`);
        let content = await readFile(promptPath, "utf8");
        let fileChanged = false;

        for (const fragmentName of fragmentNames) {
            if (!referencesFragment(content, fragmentName)) continue;
            checked++;

            const fragmentContent = await readFile(join(fragmentsDir, `${fragmentName}.md`), "utf8");
            const expanded = expandFragment(content, fragmentName, fragmentContent);
            if (expanded === content) continue;

            drifted.push(`.github/prompts/${id}.prompt.md (fragment: ${fragmentName})`);
            if (mode === "fix") {
                content = expanded;
                fileChanged = true;
            }
        }

        if (fileChanged) {
            await writeFile(promptPath, content, "utf8");
            repaired.push(`.github/prompts/${id}.prompt.md`);
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

    // Fragment and stub axes operate on canonical src/assets/ content itself
    // and must settle first in --fix mode, so the axis-1 canonical-vs-root
    // copy below reflects the fully-repaired canonical state, not a stale one.
    const fragmentResult = await runFragmentParity(mode, assetsDir);
    const stubResult = await runStubParity(mode, assetsDir);
    const copyResult = await runSelfHostParity(mode, rootDir, assetsDir);

    const totalChecked = fragmentResult.checked + stubResult.checked + copyResult.checked;
    const totalDrifted = [
        ...fragmentResult.drifted.map((path) => `[fragment] ${path}`),
        ...stubResult.drifted.map((path) => `[stub] ${path}`),
        ...copyResult.drifted.map((path) => `[copy] ${path}`),
    ];
    const totalRepaired = [...fragmentResult.repaired, ...stubResult.repaired, ...copyResult.repaired];

    if (mode === "fix") {
        console.log(`Self-host parity repaired ${totalRepaired.length} of ${totalChecked} checked (fragments: ${fragmentResult.repaired.length}, stubs: ${stubResult.repaired.length}, copies: ${copyResult.repaired.length}).`);
        return;
    }

    if (totalDrifted.length > 0) {
        console.error(`Self-host parity FAILED: ${totalDrifted.length} of ${totalChecked} checked items differ from their canonical source.`);
        for (const path of totalDrifted) console.error(`  ${path}`);
        console.error("Run `npm run fix:self-host-parity`; never hand-edit generated root copies or .claude/commands/ stubs.");
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