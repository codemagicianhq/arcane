#!/usr/bin/env tsx
/**
 * scripts/check-stale-claims.ts (LH-08)
 *
 * Two independent classes over the living-docs set (scripts/lib/living-docs.ts):
 *
 *   Class A (gate, --check can fail): every `ARC-NNN (Proposed|Accepted|
 *   Superseded|Rejected)` status claim compared against DECISIONS.md's real
 *   `**Status:**` line for that ADR. A mismatch is a stale claim someone will
 *   act on as if it were current.
 *
 *   Class B (report only, explicitly advisory -- ARC-023): occurrences of a
 *   "this doesn't exist yet" phrase (not yet built/supported/implemented,
 *   open backlog item, still unbuilt, tracked as future work) in shipped
 *   governance/prompt content or living root docs. A phrase match is not
 *   proof of staleness by itself -- it's a prompt for a human/agent to check
 *   whether the claim still holds, the same way spell-check-drift's other
 *   detectors work.
 *
 * Empirical-first found the real shape of this repo's corpus is narrower
 * than assumed when the epic was planned: there is exactly one ARC-NNN
 * (Status) parenthetical claim anywhere in the living-docs set (ARC-020 in
 * DECISIONS.md's own prose), and it is accurate. An `EF-NN (status)`
 * parenthetical claim shape does not occur anywhere -- TODO.md tracks EF
 * items via its own checkbox state and markdown links, never an inline
 * "(shipped)"-style annotation next to the ID -- so Class A does not
 * implement EF-NN matching against intake frontmatter; there is nothing in
 * the actual corpus for it to check, and building it would be enforcement
 * for a pattern that does not exist here.
 */

import { readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getLivingDocs } from "./lib/living-docs.js";

export interface StaleClaimFinding {
    file: string;
    line: number;
    excerpt: string;
    reason: string;
}

const ADR_STATUS_CLAIM = /\bARC-(\d{3})\s*\((Proposed|Accepted|Superseded|Rejected)\)/g;

const STALE_PHRASES = [
    "not yet built",
    "not yet supported",
    "not yet implemented",
    "open backlog item",
    "still unbuilt",
    "tracked as future work",
];

async function readOptional(path: string): Promise<string | null> {
    try {
        return await readFile(path, "utf8");
    } catch {
        return null;
    }
}

/** Parses DECISIONS.md once into a map of ADR number -> its real Status field. */
function parseRealAdrStatuses(decisionsContent: string): Map<string, string> {
    const statuses = new Map<string, string>();
    const headingPattern = /^## ARC-(\d{3})\b/gm;
    let match: RegExpExecArray | null;
    const headingPositions: { num: string; index: number }[] = [];
    while ((match = headingPattern.exec(decisionsContent)) !== null) {
        headingPositions.push({ num: match[1]!, index: match.index });
    }
    for (let i = 0; i < headingPositions.length; i += 1) {
        const { num, index } = headingPositions[i]!;
        const end = i + 1 < headingPositions.length ? headingPositions[i + 1]!.index : decisionsContent.length;
        const section = decisionsContent.slice(index, end);
        const statusMatch = /^\*\*Status:\*\*\s*(\S+)/m.exec(section);
        if (statusMatch) statuses.set(num, statusMatch[1]!);
    }
    return statuses;
}

async function checkAdrStatusClaims(rootDir: string, livingDocs: string[]): Promise<StaleClaimFinding[]> {
    const decisionsContent = await readOptional(join(rootDir, "DECISIONS.md"));
    if (decisionsContent === null) return [];
    const realStatuses = parseRealAdrStatuses(decisionsContent);
    const findings: StaleClaimFinding[] = [];

    for (const relPath of livingDocs) {
        const content = await readOptional(join(rootDir, relPath));
        if (content === null) continue;
        const lines = content.split("\n");
        for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
            const line = lines[lineNo]!;
            ADR_STATUS_CLAIM.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = ADR_STATUS_CLAIM.exec(line)) !== null) {
                const [, num, claimedStatus] = match;
                const realStatus = realStatuses.get(num!);
                if (realStatus === undefined) {
                    findings.push({
                        file: relPath,
                        line: lineNo + 1,
                        excerpt: match[0]!,
                        reason: `ARC-${num} has no matching "## ARC-${num}" section in DECISIONS.md at all`,
                    });
                } else if (realStatus !== claimedStatus) {
                    findings.push({
                        file: relPath,
                        line: lineNo + 1,
                        excerpt: match[0]!,
                        reason: `claims "${claimedStatus}" but DECISIONS.md's own Status field says "${realStatus}"`,
                    });
                }
            }
        }
    }
    return findings;
}

async function checkStalePhrases(rootDir: string, livingDocs: string[]): Promise<StaleClaimFinding[]> {
    const findings: StaleClaimFinding[] = [];
    for (const relPath of livingDocs) {
        const content = await readOptional(join(rootDir, relPath));
        if (content === null) continue;
        const lines = content.split("\n");
        for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
            const line = lines[lineNo]!;
            const lower = line.toLowerCase();
            for (const phrase of STALE_PHRASES) {
                if (lower.includes(phrase)) {
                    findings.push({
                        file: relPath,
                        line: lineNo + 1,
                        excerpt: line.trim().slice(0, 160),
                        reason: `contains the phrase "${phrase}" -- verify this claim is still true`,
                    });
                }
            }
        }
    }
    return findings;
}

export async function checkStaleClaims(
    rootDir: string,
): Promise<{ classA: StaleClaimFinding[]; classB: StaleClaimFinding[] }> {
    const livingDocs = await getLivingDocs(rootDir);
    const [classA, classB] = await Promise.all([
        checkAdrStatusClaims(rootDir, livingDocs),
        checkStalePhrases(rootDir, livingDocs),
    ]);
    return { classA, classB };
}

export type StaleClaimsMode = "check" | "report";

async function main(mode: StaleClaimsMode): Promise<void> {
    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const { classA, classB } = await checkStaleClaims(rootDir);

    if (classA.length === 0) {
        console.log("Class A (ADR status claims): passed, zero mismatches.");
    } else {
        console.log(`Class A (ADR status claims): ${classA.length} mismatch(es):`);
        for (const f of classA) console.log(`  ${f.file}:${f.line} — ${f.excerpt} — ${f.reason}`);
    }

    if (classB.length === 0) {
        console.log("Class B (stale-phrase report): none found.");
    } else {
        console.log(`Class B (stale-phrase report, advisory -- verify each, don't assume): ${classB.length} hit(s):`);
        for (const f of classB) console.log(`  ${f.file}:${f.line} — "${f.excerpt}" — ${f.reason}`);
    }

    // Only Class A can fail the build -- Class B is explicitly advisory
    // (ARC-023): a phrase match is a prompt to check, not proof of staleness.
    if (mode === "check" && classA.length > 0) {
        process.exitCode = 1;
    }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
    const mode: StaleClaimsMode = process.argv[2] === "--report" ? "report" : "check";
    main(mode).catch((error: unknown) => {
        console.error("check-stale-claims failed:", error);
        process.exitCode = 1;
    });
}
