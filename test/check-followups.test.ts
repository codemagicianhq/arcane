import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { checkFollowups, checkFollowupsAgainstKnownTruePositive } from "../scripts/check-followups.js";

let dir: string | undefined;

afterEach(async () => {
    if (dir) await removeFixtureDir(dir);
    dir = undefined;
});

async function writeFile(root: string, relPath: string, content: string) {
    const full = join(root, relPath);
    await fs.mkdir(join(full, ".."), { recursive: true });
    await fs.writeFile(full, content, "utf8");
}

describe("checkFollowups (LH-09)", () => {
    it("flags a deferral phrase with no tracker token in the surrounding window", async () => {
        dir = await createFixtureDir("followups-untracked");
        await writeFile(
            dir,
            "TODO.md",
            "Found a real bug while fixing this. Filed as a separate follow-up, will get to it eventually.\n",
        );

        const findings = await checkFollowups(dir);
        expect(findings.length).toBeGreaterThan(0);
        expect(findings.some((f) => f.file === "TODO.md")).toBe(true);
    });

    it("does not flag a deferral phrase that has a tracker token nearby", async () => {
        dir = await createFixtureDir("followups-tracked");
        await writeFile(
            dir,
            "TODO.md",
            "Found a real bug. Left open pending EF-42's own investigation.\n",
        );

        const findings = await checkFollowups(dir);
        expect(findings).toHaveLength(0);
    });

    it("does not flag a deferral phrase with an explicit (untracked: reason) opt-out", async () => {
        dir = await createFixtureDir("followups-opt-out");
        await writeFile(
            dir,
            "TODO.md",
            "This is out of scope for now (untracked: genuinely no forcing function, revisit if it recurs).\n",
        );

        const findings = await checkFollowups(dir);
        expect(findings).toHaveLength(0);
    });

    it("recognizes a bare 'TODO' or 'IDEAS' mention in prose, not just the literal .md filename", async () => {
        dir = await createFixtureDir("followups-bare-tracker");
        await writeFile(
            dir,
            "journal/2026-08-15-something.md",
            "Filed a separate follow-up TODO item for this, with explicit approval.\n",
        );

        const findings = await checkFollowups(dir, new Date("2026-08-20"));
        expect(findings).toHaveLength(0);
    });

    it("scans TODO.md, the verification ledger, and the active Lessons Hardening plan files", async () => {
        dir = await createFixtureDir("followups-scope-static");
        await writeFile(dir, "TODO.md", "This is deferred with no pointer anywhere near it at all.\n");
        await writeFile(
            dir,
            "docs/verification-ledger.md",
            "| claim | method | result | correction |\n| this was left open with nothing tracking it | n/a | corrected | n/a |\n",
        );
        await writeFile(
            dir,
            "docs/plans/lessons-hardening/PLAN.md",
            "---\nstatus: active\n---\nThis follow-up has no tracker mentioned nearby.\n",
        );
        await writeFile(
            dir,
            "docs/plans/lessons-hardening/OPERATOR-QUEUE.md",
            "This item was deferred with absolutely no pointer given.\n",
        );

        const findings = await checkFollowups(dir);
        const filesWithFindings = new Set(findings.map((f) => f.file));
        expect(filesWithFindings.has("TODO.md")).toBe(true);
        expect(filesWithFindings.has("docs/verification-ledger.md")).toBe(true);
        expect(filesWithFindings.has("docs/plans/lessons-hardening/PLAN.md")).toBe(true);
        expect(filesWithFindings.has("docs/plans/lessons-hardening/OPERATOR-QUEUE.md")).toBe(true);
    });

    it("only scans journals within the last 30 days, not older ones", async () => {
        dir = await createFixtureDir("followups-journal-age");
        await writeFile(
            dir,
            "journal/2026-01-01-old.md",
            "This was deferred long ago with nothing tracking it anywhere nearby.\n",
        );
        await writeFile(
            dir,
            "journal/2026-08-20-recent.md",
            "This was also deferred with nothing tracking it anywhere nearby.\n",
        );

        const findings = await checkFollowups(dir, new Date("2026-09-02"));
        const filesWithFindings = new Set(findings.map((f) => f.file));
        expect(filesWithFindings.has(join("journal", "2026-01-01-old.md"))).toBe(false);
        expect(filesWithFindings.has(join("journal", "2026-08-20-recent.md"))).toBe(true);
    });
});

describe("checkFollowupsAgainstKnownTruePositive (LH-09 empirical-first)", () => {
    it("proves the character-window design catches Become Current PLAN.md's real WD-nn sentence", async () => {
        // Runs against this repo's own real, historical docs/plans/become-current/PLAN.md
        // (not a fixture) -- the one-time empirical calibration this epic's own plan
        // called for, deliberately kept separate from checkFollowups()'s shipped scope
        // (a completed plan is a historical record, out of scope for the live scan).
        const findings = await checkFollowupsAgainstKnownTruePositive(process.cwd());
        expect(findings.length).toBeGreaterThan(0);
        expect(findings.some((f) => f.excerpt.includes("out-of-scope follow-up"))).toBe(true);
    });
});
