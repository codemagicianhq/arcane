#!/usr/bin/env tsx
/**
 * scripts/check-citations.ts (LH-07)
 *
 * Report-only citation-hygiene scan over the living-docs set
 * (scripts/lib/living-docs.ts). Checks the stable-locator grammar
 * (agent-output.instructions.md -> Stable-Locator Citation Grammar):
 *
 *   - `path` alone: the path must exist.
 *   - `path#anchor`: the anchor must slugify to a real heading in that file.
 *   - `path ("phrase")`: the phrase must occur exactly once in that file.
 *   - `path:NNN` with no accompanying anchor/phrase on the same line: a
 *     finding -- exactly the pattern that drifted 13+ times (P2).
 *   - Any `path:NNN` present (bare or alongside another form) also gets its
 *     line number sanity-checked against the target file's current line
 *     count, so a stale NNN is caught even when it wasn't the sole locator.
 *
 * Historical records (journal/, docs/intake/, a completed plan) are
 * excluded by construction -- they are not in getLivingDocs()'s output.
 *
 * Modes: --check (exit 1 if any finding), --report (always exit 0, print
 * findings for review). No --fix: re-pointing a citation needs judgment
 * about what the writer actually meant to point at.
 */

import { readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getLivingDocs } from "./lib/living-docs.js";

export interface CitationFinding {
    file: string;
    line: number;
    citation: string;
    reason: string;
}

// The trailing line-number group accepts a single line, a range (`12-15`), or
// a comma-separated list (`7,115`) -- found live (LH-07's own conversion pass
// missed `check-version-bump.ts:7,115` on the first run because the original
// pattern only matched a single number or a single range, not a list).
const CITATION_PATTERN =
    /`([A-Za-z0-9_.\/-]+\.(?:md|ts|tsx|js|jsx|yml|yaml|json))((?:#[a-z0-9-]+)?)(?:\s*\("([^"]+)"\))?(?::(\d+(?:[-,]\d+)*))?`/g;

function slugify(heading: string): string {
    return heading
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

async function readOptional(path: string): Promise<string | null> {
    try {
        return await readFile(path, "utf8");
    } catch {
        return null;
    }
}

function headingsOf(content: string): string[] {
    return [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1]!.trim());
}

function countOccurrences(content: string, phrase: string): number {
    return content.split(phrase).length - 1;
}

/**
 * Resolves a citation's own path against `rootDir`. Citations in these
 * docs are written relative to repo root OR as a bare filename inside
 * `.arcane/governance/`/`.github/prompts/`/`.github/instructions/` (the
 * convention already used throughout this corpus -- e.g. `git-
 * conventions.md:554` meaning `.arcane/governance/git-conventions.md`).
 * Tries the literal path first, then each of those three directories.
 */
async function resolveCitedPath(rootDir: string, citedPath: string): Promise<string | null> {
    if (citedPath.includes("/")) {
        const literal = join(rootDir, citedPath);
        if ((await readOptional(literal)) !== null) return literal;
        return null;
    }
    const candidates = [
        join(rootDir, citedPath),
        join(rootDir, ".arcane", "governance", citedPath),
        join(rootDir, "src", "assets", ".arcane", "governance", citedPath),
        join(rootDir, ".github", "prompts", citedPath),
        join(rootDir, "src", "assets", ".github", "prompts", citedPath),
        join(rootDir, ".github", "instructions", citedPath),
        join(rootDir, "src", "assets", ".github", "instructions", citedPath),
    ];
    for (const candidate of candidates) {
        if ((await readOptional(candidate)) !== null) return candidate;
    }
    return null;
}

export async function checkCitations(rootDir: string): Promise<CitationFinding[]> {
    const livingDocs = await getLivingDocs(rootDir);
    const findings: CitationFinding[] = [];

    for (const relPath of livingDocs) {
        const content = await readOptional(join(rootDir, relPath));
        if (content === null) continue;
        const lines = content.split("\n");

        for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
            const line = lines[lineNo]!;
            CITATION_PATTERN.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = CITATION_PATTERN.exec(line)) !== null) {
                const [, citedPath, anchor, phrase, lineNumRaw] = match;
                const citation = match[0]!;
                const hasAnchor = Boolean(anchor);
                const hasPhrase = Boolean(phrase);
                const hasLineNum = Boolean(lineNumRaw);

                // A bare `path` with none of #anchor/("phrase")/:NNN is just a
                // named mention in prose ("the `registry.ts` module handles
                // X"), not a location claim -- P2 is specifically about
                // NUMBERS going stale, not "does this filename exist
                // somewhere." Checking existence for every backtick-wrapped
                // filename produced 450+ findings dominated by exactly this
                // false-positive shape when first tried against the real
                // tree; narrowed to only citations making an actual specific
                // claim beyond naming a file.
                if (!hasAnchor && !hasPhrase && !hasLineNum) continue;

                if (hasLineNum && !hasAnchor && !hasPhrase) {
                    findings.push({
                        file: relPath,
                        line: lineNo + 1,
                        citation,
                        reason:
                            "bare path:NNN with no accompanying anchor or quoted phrase -- " +
                            "will drift the moment the target file is next edited",
                    });
                    continue;
                }

                const targetPath = await resolveCitedPath(rootDir, citedPath!);
                if (targetPath === null) {
                    findings.push({
                        file: relPath,
                        line: lineNo + 1,
                        citation,
                        reason: `cited path "${citedPath}" does not resolve to a real file`,
                    });
                    continue;
                }
                const targetContent = (await readOptional(targetPath))!;

                if (hasAnchor) {
                    const wantedSlug = anchor!.slice(1);
                    const realSlugs = headingsOf(targetContent).map(slugify);
                    if (!realSlugs.includes(wantedSlug)) {
                        findings.push({
                            file: relPath,
                            line: lineNo + 1,
                            citation,
                            reason: `anchor "#${wantedSlug}" does not slugify-match any heading in ${citedPath}`,
                        });
                    }
                }

                if (hasPhrase) {
                    const count = countOccurrences(targetContent, phrase!);
                    if (count !== 1) {
                        findings.push({
                            file: relPath,
                            line: lineNo + 1,
                            citation,
                            reason: `quoted phrase occurs ${count} time(s) in ${citedPath}, not exactly once`,
                        });
                    }
                }

                if (hasLineNum) {
                    // A range or comma-list (`12-15`, `7,115`) is checked by its
                    // highest number -- the one most likely to have drifted
                    // beyond the file's current length.
                    const cited = Math.max(...lineNumRaw!.split(/[-,]/).map(Number));
                    const targetLineCount = targetContent.split("\n").length;
                    if (cited > targetLineCount) {
                        findings.push({
                            file: relPath,
                            line: lineNo + 1,
                            citation,
                            reason: `line ${cited} is beyond ${citedPath}'s current ${targetLineCount} lines`,
                        });
                    }
                }
            }
        }
    }

    return findings;
}

export type CitationMode = "check" | "report";

async function main(mode: CitationMode): Promise<void> {
    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const findings = await checkCitations(rootDir);

    if (findings.length === 0) {
        console.log("Citations passed: no bare path:NNN or malformed stable-locator citations found.");
        return;
    }

    console.log(`Found ${findings.length} citation finding(s):`);
    for (const f of findings) {
        console.log(`  ${f.file}:${f.line} — ${f.citation} — ${f.reason}`);
    }

    if (mode === "check") {
        console.error(
            "\nRun `tsx scripts/check-citations.ts --report` for details. No --fix mode exists -- " +
                "re-pointing a citation needs judgment about what the writer meant.",
        );
        process.exitCode = 1;
    }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
    const mode: CitationMode = process.argv[2] === "--report" ? "report" : "check";
    main(mode).catch((error: unknown) => {
        console.error("check-citations failed:", error);
        process.exitCode = 1;
    });
}
