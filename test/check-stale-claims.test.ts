import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { checkStaleClaims } from "../scripts/check-stale-claims.js";

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

describe("checkStaleClaims Class A -- ADR status claims (LH-08)", () => {
    it("passes when a claimed ARC-NNN status matches DECISIONS.md's real Status field", async () => {
        dir = await createFixtureDir("stale-claims-adr-match");
        await writeFile(
            dir,
            "TODO.md",
            "This references ARC-020 (Proposed) as still open.\n",
        );
        await writeFile(
            dir,
            "DECISIONS.md",
            "## ARC-020 — Some Decision\n\n**Status:** Proposed\n",
        );

        const { classA } = await checkStaleClaims(dir);
        expect(classA).toHaveLength(0);
    });

    it("flags a claimed status that no longer matches DECISIONS.md's real Status field", async () => {
        dir = await createFixtureDir("stale-claims-adr-mismatch");
        await writeFile(
            dir,
            "TODO.md",
            "This references ARC-020 (Proposed) as still open.\n",
        );
        await writeFile(
            dir,
            "DECISIONS.md",
            "## ARC-020 — Some Decision\n\n**Status:** Accepted\n",
        );

        const { classA } = await checkStaleClaims(dir);
        expect(classA).toHaveLength(1);
        expect(classA[0]!.reason).toContain('claims "Proposed"');
        expect(classA[0]!.reason).toContain('says "Accepted"');
    });

    it("flags a claim for an ARC number with no matching section in DECISIONS.md at all", async () => {
        dir = await createFixtureDir("stale-claims-adr-missing");
        await writeFile(dir, "TODO.md", "This references ARC-999 (Accepted).\n");
        await writeFile(dir, "DECISIONS.md", "## ARC-001 — Something Else\n\n**Status:** Accepted\n");

        const { classA } = await checkStaleClaims(dir);
        expect(classA).toHaveLength(1);
        expect(classA[0]!.reason).toContain("no matching");
    });

    it("correctly attributes Status fields when DECISIONS.md has multiple ADR sections back to back", async () => {
        dir = await createFixtureDir("stale-claims-adr-multi");
        await writeFile(
            dir,
            "TODO.md",
            "ARC-001 (Accepted) and ARC-002 (Proposed) are both referenced here.\n",
        );
        await writeFile(
            dir,
            "DECISIONS.md",
            [
                "## ARC-001 — First",
                "",
                "**Date:** 2026-01-01",
                "**Status:** Accepted",
                "",
                "## ARC-002 — Second",
                "",
                "**Date:** 2026-01-02",
                "**Status:** Proposed",
                "",
            ].join("\n"),
        );

        const { classA } = await checkStaleClaims(dir);
        expect(classA).toHaveLength(0);
    });
});

describe("checkStaleClaims Class B -- stale-phrase report (LH-08)", () => {
    it("catches the rule-3 proof case: a stale 'tracked as future work' claim in shipped governance", async () => {
        dir = await createFixtureDir("stale-claims-phrase-live");
        await writeFile(
            dir,
            "src/assets/.arcane/governance/universal-agent-rules.md",
            "3. No secrets on the command line. No secret-scanner exists in this repo yet (tracked as future work, BC-30).\n",
        );

        const { classB } = await checkStaleClaims(dir);
        expect(classB.some((f) => f.reason.includes("tracked as future work"))).toBe(true);
    });

    it("is case-insensitive", async () => {
        dir = await createFixtureDir("stale-claims-phrase-case");
        await writeFile(dir, "TODO.md", "This feature is NOT YET BUILT.\n");

        const { classB } = await checkStaleClaims(dir);
        expect(classB.some((f) => f.reason.includes("not yet built"))).toBe(true);
    });

    it("finds nothing when no stale phrase is present", async () => {
        dir = await createFixtureDir("stale-claims-phrase-clean");
        await writeFile(dir, "TODO.md", "This feature ships and works as documented.\n");

        const { classB } = await checkStaleClaims(dir);
        expect(classB).toHaveLength(0);
    });

    it("never fails the build by itself -- Class B is report-only regardless of hit count", async () => {
        dir = await createFixtureDir("stale-claims-phrase-advisory");
        await writeFile(dir, "TODO.md", "Not yet built. Still unbuilt. Tracked as future work.\n");

        const { classA, classB } = await checkStaleClaims(dir);
        expect(classA).toHaveLength(0);
        expect(classB.length).toBeGreaterThan(0);
    });
});
