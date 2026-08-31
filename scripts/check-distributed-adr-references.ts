#!/usr/bin/env tsx
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCAN_ROOTS = [
    ".arcane/governance",
    ".github/prompts",
    ".github/instructions",
];
const REFERENCE_PATH = ".arcane/governance/framework-decisions.md";

export interface AdrReferenceFinding {
    file: string;
    line: number;
    reference: string;
    reason: "missing" | "malformed" | "cross-repo-hazard";
}

/**
 * ARC-NNN and EF-NN identify records that exist only in THIS repo's own
 * DECISIONS.md / docs/intake/ -- neither ships. `src/assets/DECISIONS.md`
 * (what a consumer actually receives via `spell init`) is an empty starter
 * template for the *consumer's own* decisions, not a copy of Arcane's.
 * A wiki-link or relative-path link to either from shipped content either
 * fails to resolve once installed, or worse, silently resolves to the
 * wrong document (the consumer's own DECISIONS.md) -- confirmed live
 * 2026-08-31 (BC-06): four real instances found this way, including two
 * this repository's own spell-review/spell-review-batch prompts had
 * shipped. A full `https://` canonical-repo URL is the only safe form; a
 * bare, unlinked mention (no brackets at all) is also safe -- the rule's
 * own "cite as plain text" fallback -- and is deliberately not flagged.
 */
const CROSS_REPO_HAZARD_PATTERNS: RegExp[] = [
    // Wiki-link to this repo's own DECISIONS.md, e.g. [[DECISIONS#ARC-035|...]]
    /\[\[DECISIONS#(ARC-\d+|EF-\d+)/g,
    // Non-https markdown link to DECISIONS.md, e.g. [ARC-035](../../DECISIONS.md#...)
    /\[(ARC-\d+|EF-\d+)\]\((?!https?:\/\/)[^)]*DECISIONS\.md/g,
];

async function listFiles(root: string): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const path = join(root, entry.name);
        if (entry.isDirectory()) files.push(...await listFiles(path));
        else if (entry.isFile()) files.push(path);
    }
    return files;
}

export async function checkDistributedAdrReferences(
    assetsDir: string,
): Promise<AdrReferenceFinding[]> {
    const reference = await readFile(join(assetsDir, REFERENCE_PATH), "utf8");
    const declared = new Set(
        [...reference.matchAll(/^## (ADR-\d{3})\b/gm)].map((match) => match[1]!),
    );
    const findings: AdrReferenceFinding[] = [];

    for (const scanRoot of SCAN_ROOTS) {
        for (const filePath of await listFiles(join(assetsDir, scanRoot))) {
            const file = relative(assetsDir, filePath).replace(/\\/g, "/");
            const lines = (await readFile(filePath, "utf8")).split(/\r?\n/);
            for (const [index, line] of lines.entries()) {
                for (const match of line.matchAll(/\bADR-(\d+)\b/g)) {
                    const referenceId = match[0];
                    const reason = match[1]!.length === 3 ? "missing" : "malformed";
                    if (reason === "missing" && declared.has(referenceId)) continue;
                    findings.push({ file, line: index + 1, reference: referenceId, reason });
                }
                for (const pattern of CROSS_REPO_HAZARD_PATTERNS) {
                    for (const match of line.matchAll(pattern)) {
                        findings.push({
                            file,
                            line: index + 1,
                            reference: match[1]!,
                            reason: "cross-repo-hazard",
                        });
                    }
                }
            }
        }
    }

    return findings;
}

async function main(): Promise<void> {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    const assetsDir = process.env["ARCANE_ADR_ASSETS_DIR"]
        ?? resolve(scriptDir, "../src/assets");
    const findings = await checkDistributedAdrReferences(assetsDir);

    if (findings.length > 0) {
        console.error("Distributed ADR reference check FAILED.");
        for (const finding of findings) {
            console.error(
                `  ${finding.file}:${finding.line} ${finding.reference} (${finding.reason})`,
            );
        }
        process.exitCode = 1;
        return;
    }

    console.log("Distributed ADR reference check passed.");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
    main().catch((error: unknown) => {
        console.error("distributed ADR reference check failed:", error);
        process.exitCode = 1;
    });
}