/**
 * scripts/lib/living-docs.ts (LH-07)
 *
 * The set of files whose content is meant to stay accurate as the tree
 * changes -- as opposed to a historical record (journal/, docs/intake/,
 * a completed plan) that describes what was true at a point in time and is
 * never expected to self-update. This is the shared scope every LH-07/08/09
 * script (check-citations, check-stale-claims, check-followups) scans, so
 * "what counts as living" is defined once instead of drifting between them.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const STATIC_LIVING_DOCS = ["TODO.md", "IDEAS.md", "DECISIONS.md", "docs/verification-ledger.md"];

async function listMarkdownFilesRecursive(dir: string): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }

    const files: string[] = [];
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listMarkdownFilesRecursive(fullPath)));
        } else if (entry.name.endsWith(".md")) {
            files.push(fullPath);
        }
    }
    return files;
}

/** Reads a markdown file's frontmatter `status:` field, or null if absent/unparseable. */
async function readFrontmatterStatus(filePath: string): Promise<string | null> {
    let content: string;
    try {
        content = await readFile(filePath, "utf8");
    } catch {
        return null;
    }
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
    if (!match) return null;
    const statusMatch = /^status:\s*(\S+)/m.exec(match[1]!);
    return statusMatch ? statusMatch[1]! : null;
}

/** Every `.md` file inside a `docs/plans/<name>/` directory whose own PLAN.md has `status: active`. */
async function listActivePlanFiles(rootDir: string): Promise<string[]> {
    const plansDir = join(rootDir, "docs", "plans");
    let planDirs;
    try {
        planDirs = (await readdir(plansDir, { withFileTypes: true })).filter((e) => e.isDirectory());
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }

    const files: string[] = [];
    for (const dirEntry of planDirs) {
        const planPath = join(plansDir, dirEntry.name, "PLAN.md");
        const status = await readFrontmatterStatus(planPath);
        if (status !== "active") continue;
        files.push(...(await listMarkdownFilesRecursive(join(plansDir, dirEntry.name))));
    }
    return files;
}

/**
 * Returns every living-doc path, relative to `rootDir`, forward-slashed.
 * Historical records (`journal/`, `docs/intake/`, a completed plan) are
 * deliberately excluded -- they describe what was true at a point in time
 * and are never expected to self-update, so a stale citation inside one is
 * not the defect this scan exists to catch.
 */
export async function getLivingDocs(rootDir: string): Promise<string[]> {
    const files = [...STATIC_LIVING_DOCS];

    files.push(
        ...(await listMarkdownFilesRecursive(join(rootDir, "ai-context"))).map((f) =>
            relative(rootDir, f),
        ),
    );
    files.push(
        ...(await listActivePlanFiles(rootDir)).map((f) => relative(rootDir, f)),
    );
    files.push(
        ...(await listMarkdownFilesRecursive(join(rootDir, "src", "assets", ".arcane", "governance"))).map(
            (f) => relative(rootDir, f),
        ),
    );
    files.push(
        ...(await listMarkdownFilesRecursive(join(rootDir, "src", "assets", ".github"))).map((f) =>
            relative(rootDir, f),
        ),
    );

    return [...new Set(files.map((f) => f.replace(/\\/g, "/")))].sort();
}
