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
 *   Duplicate decision IDs (gate, --check can fail -- ARC-050 decision 4):
 *   two decision headings in DECISIONS.md that share one ID (`## ARC-050`
 *   twice). Parallel sessions that each took "the next number" collide
 *   silently at merge; this catches the race fetching cannot close. The
 *   heading pattern is generic (`## <PREFIX>-<digits>`), not tied to this
 *   repository's `ARC` prefix, so the same check reads an `ADR-NNN` log.
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

/**
 * A decision-record heading: `## ` then an uppercase prefix, a hyphen and a
 * number (`## ARC-050 — ...`, `## ADR-012: ...`). Generic on purpose (ARC-050
 * decision 4): the prefix is captured, never assumed.
 */
export const DECISION_HEADING = /^##[ \t]+([A-Z][A-Z0-9]*)-(\d+)\b/;

const FENCE = /^[ \t]*(```|~~~)/;

/**
 * Finds decision IDs declared by more than one heading. One finding per
 * duplicated ID, placed at its last heading; the reason names every heading
 * that declares it, with its line. Headings inside fenced code blocks are
 * examples, not declarations, and are skipped. IDs compare by prefix and
 * numeric value, so `ARC-050` and `ARC-50` are the same ID.
 */
export function findDuplicateDecisionIds(content: string, file = "DECISIONS.md"): StaleClaimFinding[] {
    const byId = new Map<string, { line: number; heading: string }[]>();
    let inFence = false;
    const lines = content.split("\n");
    for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
        const line = lines[lineNo]!.replace(/\r$/, "");
        if (FENCE.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (inFence) continue;
        const match = DECISION_HEADING.exec(line);
        if (!match) continue;
        const id = `${match[1]!}-${Number(match[2]!)}`;
        const seen = byId.get(id) ?? [];
        seen.push({ line: lineNo + 1, heading: line.trim() });
        byId.set(id, seen);
    }

    const findings: StaleClaimFinding[] = [];
    for (const headings of byId.values()) {
        if (headings.length < 2) continue;
        const last = headings[headings.length - 1]!;
        const declaredBy = headings.map((h) => `line ${h.line} "${h.heading}"`).join(" and ");
        findings.push({
            file,
            line: last.line,
            excerpt: last.heading.slice(0, 160),
            reason: `duplicate decision ID: ${headings.length} headings declare it -- ${declaredBy}. The branch that has not merged yet renumbers its own entry (ARC-050).`,
        });
    }
    return findings;
}

async function checkDuplicateDecisionIds(rootDir: string): Promise<StaleClaimFinding[]> {
    const decisionsContent = await readOptional(join(rootDir, "DECISIONS.md"));
    if (decisionsContent === null) return [];
    return findDuplicateDecisionIds(decisionsContent);
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
): Promise<{ classA: StaleClaimFinding[]; classB: StaleClaimFinding[]; duplicateIds: StaleClaimFinding[] }> {
    const livingDocs = await getLivingDocs(rootDir);
    const [classA, classB, duplicateIds] = await Promise.all([
        checkAdrStatusClaims(rootDir, livingDocs),
        checkStalePhrases(rootDir, livingDocs),
        checkDuplicateDecisionIds(rootDir),
    ]);
    return { classA, classB, duplicateIds };
}

export type StaleClaimsMode = "check" | "report";

/** Runs every class against `rootDir`, prints the report, and returns the exit code. */
export async function runStaleClaims(
    mode: StaleClaimsMode,
    rootDir: string,
    log: (line: string) => void = console.log,
): Promise<number> {
    const { classA, classB, duplicateIds } = await checkStaleClaims(rootDir);

    if (classA.length === 0) {
        log("Class A (ADR status claims): passed, zero mismatches.");
    } else {
        log(`Class A (ADR status claims): ${classA.length} mismatch(es):`);
        for (const f of classA) log(`  ${f.file}:${f.line} — ${f.excerpt} — ${f.reason}`);
    }

    if (duplicateIds.length === 0) {
        log("Duplicate decision IDs: passed, every decision heading has a unique ID.");
    } else {
        log(`Duplicate decision IDs: ${duplicateIds.length} ID(s) declared more than once:`);
        for (const f of duplicateIds) log(`  ${f.file}:${f.line} — ${f.reason}`);
    }

    if (classB.length === 0) {
        log("Class B (stale-phrase report): none found.");
    } else {
        log(`Class B (stale-phrase report, advisory -- verify each, don't assume): ${classB.length} hit(s):`);
        for (const f of classB) log(`  ${f.file}:${f.line} — "${f.excerpt}" — ${f.reason}`);
    }

    // Only Class A and duplicate decision IDs can fail the build -- Class B is
    // explicitly advisory (ARC-023): a phrase match is a prompt to check, not
    // proof of staleness.
    return mode === "check" && (classA.length > 0 || duplicateIds.length > 0) ? 1 : 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
    const mode: StaleClaimsMode = process.argv[2] === "--report" ? "report" : "check";
    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    runStaleClaims(mode, rootDir).then((code) => {
        if (code !== 0) process.exitCode = code;
    }).catch((error: unknown) => {
        console.error("check-stale-claims failed:", error);
        process.exitCode = 1;
    });
}
