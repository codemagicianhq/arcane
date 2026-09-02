#!/usr/bin/env tsx
/**
 * scripts/check-followups.ts (LH-09)
 *
 * Closes P9 (6x: a finding gets deferred in prose -- "filed as a separate
 * follow-up", "left open", "out of scope" -- and never promoted to anything
 * that survives past the sentence it's written in). Scans journals (<30 days
 * old), the active Lessons Hardening plan's PLAN.md/OPERATOR-QUEUE.md,
 * TODO.md, and docs/verification-ledger.md for a deferral phrase with no
 * tracker token nearby.
 *
 * Report-only (no --fix -- whether a deferral is genuinely untracked or the
 * tracker is just phrased differently than expected needs judgment).
 *
 * Empirical-first found a real precision problem before this shipped: the
 * known true positive (Become Current PLAN.md's WD-nn "filed as a separate,
 * out-of-scope follow-up" sentence -- see checkFollowupsAgainstKnownTruePositive
 * below) sits inside one enormous, blank-line-free paragraph that also
 * mentions "ARC-023" repeatedly as general framing context, 314 characters
 * away. A block/paragraph-level "is there a tracker token anywhere nearby"
 * check would have found that unrelated ARC-023 mention and produced a false
 * negative on the exact case this tool exists to catch. Uses a fixed
 * character window (150) around each deferral-phrase match instead of the
 * whole enclosing paragraph -- verified against that real example before
 * shipping, not just assumed to be narrow enough.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface FollowupFinding {
    file: string;
    excerpt: string;
    phrase: string;
}

const DEFERRAL_PHRASES = [
    "filed as a separate",
    "follow-up",
    "followup",
    "out of scope",
    "not fixed here",
    "left open",
    "deferred",
    "revisit",
    "future work",
];

// TODO/IDEAS match bare (a "TODO item"/"IDEAS entry" in prose refers to the
// same tracker as literal TODO.md/IDEAS.md -- found live scanning the real
// corpus, where "filed a separate follow-up TODO item" was a false positive
// under a stricter .md-only pattern.
const TRACKER_TOKEN_PATTERN =
    /\bTODO\b|\bIDEAS\b|\bQ-\d+\b|\bARC-\d+\b|\bEF-\d+\b|\bRCA-\d+\b|https?:\/\/\S*\/pull\/\d+|\(untracked:[^)]*\)/i;

const WINDOW = 150;

async function readOptional(path: string): Promise<string | null> {
    try {
        return await readFile(path, "utf8");
    } catch {
        return null;
    }
}

/** Journal filenames start with an ISO date: YYYY-MM-DD-slug.md. */
function journalDate(fileName: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})-/.exec(fileName);
    if (!match) return null;
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

async function listRecentJournals(rootDir: string, maxAgeDays: number, now: Date): Promise<string[]> {
    const journalDir = join(rootDir, "journal");
    let entries;
    try {
        entries = await readdir(journalDir);
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }
    const cutoff = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
    return entries
        .filter((name) => name.endsWith(".md"))
        .filter((name) => {
            const date = journalDate(name);
            return date !== null && date.getTime() >= cutoff;
        })
        .map((name) => join("journal", name));
}

/** Scans one file's content for deferral phrases with no tracker token in the surrounding window. */
function scanContent(relPath: string, content: string): FollowupFinding[] {
    const findings: FollowupFinding[] = [];
    const lower = content.toLowerCase();

    for (const phrase of DEFERRAL_PHRASES) {
        let searchFrom = 0;
        for (;;) {
            const idx = lower.indexOf(phrase, searchFrom);
            if (idx === -1) break;
            searchFrom = idx + phrase.length;

            const windowStart = Math.max(0, idx - WINDOW);
            const windowEnd = Math.min(content.length, idx + phrase.length + WINDOW);
            const window = content.slice(windowStart, windowEnd);

            if (!TRACKER_TOKEN_PATTERN.test(window)) {
                findings.push({
                    file: relPath,
                    phrase,
                    excerpt: window.replace(/\s+/g, " ").trim(),
                });
            }
        }
    }
    return findings;
}

/**
 * Scans one real file used only for the empirical-first proof that the
 * character-window approach actually catches the known true positive.
 * Deliberately NOT part of checkFollowups()'s shipped scan scope -- Become
 * Current's PLAN.md is a completed, historical plan, out of scope by the
 * same "historical records aren't re-litigated" rule every other LH-07/08/09
 * script follows.
 */
export async function checkFollowupsAgainstKnownTruePositive(rootDir: string): Promise<FollowupFinding[]> {
    const path = join(rootDir, "docs", "plans", "become-current", "PLAN.md");
    const content = await readOptional(path);
    if (content === null) return [];
    return scanContent("docs/plans/become-current/PLAN.md", content).filter((f) =>
        f.excerpt.includes("filed as a separate"),
    );
}

export async function checkFollowups(rootDir: string, now: Date = new Date()): Promise<FollowupFinding[]> {
    const scanFiles: string[] = [
        "TODO.md",
        "docs/verification-ledger.md",
        "docs/plans/lessons-hardening/PLAN.md",
        "docs/plans/lessons-hardening/OPERATOR-QUEUE.md",
        ...(await listRecentJournals(rootDir, 30, now)),
    ];

    const findings: FollowupFinding[] = [];
    for (const relPath of scanFiles) {
        const content = await readOptional(join(rootDir, relPath));
        if (content === null) continue;
        findings.push(...scanContent(relPath, content));
    }
    return findings;
}

export type FollowupsMode = "check" | "report";

async function main(mode: FollowupsMode): Promise<void> {
    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const findings = await checkFollowups(rootDir);

    if (findings.length === 0) {
        console.log("Follow-up promotion: no untracked deferral phrases found.");
        return;
    }

    console.log(`Follow-up promotion: ${findings.length} deferral phrase(s) with no tracker token nearby:`);
    for (const f of findings) {
        console.log(`  ${f.file} — "${f.phrase}" — ...${f.excerpt}...`);
    }
    console.log(
        "\nEach of these needs a tracker token (TODO.md, IDEAS.md, Q-NNN, ARC-NNN, EF-NN, RCA-NNN, a PR " +
            "URL) nearby, or an explicit (untracked: <reason>) opt-out. Report-only -- no --fix, since " +
            "whether a deferral is genuinely untracked needs judgment.",
    );

    // Warn mode (the default, and what ci.yml calls today via
    // continue-on-error) never fails the build. --check exists so flipping
    // to a real gate later (once precision is validated across sessions,
    // per this epic's own "warn -> fail" rollout criterion) is a one-line
    // CI change, not new code.
    if (mode === "check") process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
    const mode: FollowupsMode = process.argv[2] === "--check" ? "check" : "report";
    main(mode).catch((error: unknown) => {
        console.error("check-followups failed:", error);
        process.exitCode = 1;
    });
}
