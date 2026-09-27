import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP03-C-01 (ARC-050 decisions 1-3 and 5, PRD D-04 / R-264, #264): a spell
// that allocates a decision number fetches the trunk when a usable remote
// exists and allocates max(local, remote trunk) + 1; the local-only path
// allocates from the local maximum and says so; no reservation markers.

const SRC = join(process.cwd(), "src", "assets", ".arcane");
const ROOT = join(process.cwd(), ".arcane");

let closeSession: string;
let rootCloseSession: string;
let standard: string;
let rootStandard: string;

/** The text of close-session's numbered step `n` (from "n. " up to the next top-level step). */
function step(spell: string, n: string, next: string): string {
    const start = spell.indexOf(`\n${n}. **`);
    const end = spell.indexOf(`\n${next}. **`, start + 1);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return spell.slice(start, end);
}

beforeAll(async () => {
    closeSession = await readFile(join(SRC, "spells", "spell-close-session.md"), "utf8");
    rootCloseSession = await readFile(join(ROOT, "spells", "spell-close-session.md"), "utf8");
    standard = await readFile(join(SRC, "governance", "decision-documentation-standard.md"), "utf8");
    rootStandard = await readFile(join(ROOT, "governance", "decision-documentation-standard.md"), "utf8");
});

describe("spell-close-session step 3 allocates decision numbers against the trunk (ARC-050)", () => {
    it("keeps the sequential-number instruction and adds the ARC-050 allocation rule to step 3", () => {
        const s3 = step(closeSession, "3", "4");
        expect(s3).toContain("Use the next sequential ADR number.");
        expect(s3).toContain("ARC-050");
    });

    it("classifies the remote the way spell-open-session's Mutation Guard does", () => {
        const s3 = step(closeSession, "3", "4");
        expect(s3).toContain("the same one `spell-open-session`'s Mutation Guard uses");
        expect(s3).toContain("a remote URL alone is not enough");
        expect(s3).toContain("Never assume `origin` or `main`.");
    });

    it("fetches the trunk and allocates max(local, remote trunk) + 1", () => {
        const s3 = step(closeSession, "3", "4");
        expect(s3).toContain("Run `git fetch <remote> <trunk>`.");
        expect(s3).toContain("git show <remote>/<trunk>:DECISIONS.md");
        expect(s3).toContain(
            "Allocate `max(highest ID on this branch, highest ID on <remote>/<trunk>) + 1`.",
        );
        // The fetch happens before the maximum is taken.
        expect(s3.indexOf("git fetch <remote> <trunk>")).toBeLessThan(s3.indexOf("Allocate `max("));
    });

    it("allocates from the local maximum on the local-only path and says so", () => {
        const s3 = step(closeSession, "3", "4");
        expect(s3).toContain("**Local-only: allocate from the local maximum and say so.**");
        expect(s3).toContain(
            "`Allocated <PREFIX>-NNN from the local maximum only; not checked against any other branch.`",
        );
        expect(s3).toContain("Treat a usable remote whose fetch fails the same way");
    });

    it("forbids reservation markers and allocates several decisions in one pass", () => {
        const s3 = step(closeSession, "3", "4");
        expect(s3).toContain("**No reservation markers.**");
        expect(s3).toContain("allocate them consecutively from the one maximum you just computed");
    });

    it("says the unmerged branch renumbers its own entry on a later collision", () => {
        const s3 = step(closeSession, "3", "4");
        expect(s3).toContain("the branch that has not merged yet renumbers its own entry");
        expect(s3).toContain("Merged entries are never renumbered");
    });

    it("carries an ARC-023 enforcement annotation on the allocation rule", () => {
        const s3 = step(closeSession, "3", "4");
        expect(s3).toMatch(/Enforcement: structured spell gate \(ARC-023\) — this step requires the observed trunk maximum/);
    });

    it("ties the journal's Decisions Made table to the same allocation", () => {
        const s2 = step(closeSession, "2", "3");
        expect(s2).toContain("Take every number in this table from step 3's allocation rule (ARC-050).");
    });

    it("reports how each number was allocated in the Decision Updates output", () => {
        const out = closeSession.slice(closeSession.indexOf("## Decision Updates"));
        expect(out).toContain("how its number was allocated (step 3)");
    });

    it("root copy matches the canonical source", () => {
        expect(rootCloseSession).toBe(closeSession);
    });
});

describe("decision-documentation-standard.md states the ARC-050 allocation rule", () => {
    const section = () => {
        const start = standard.indexOf("## Allocating Decision Numbers");
        const end = standard.indexOf("\n## ", start + 1);
        expect(start).toBeGreaterThan(-1);
        return standard.slice(start, end);
    };

    it("states fetch-then-max and the local-only path", () => {
        const s = section();
        expect(s).toContain("ARC-050");
        expect(s).toContain("`spell-open-session`'s Mutation Guard");
        expect(s).toContain(
            "allocate `max(highest number on the local branch, highest number on the remote trunk) + 1`",
        );
        expect(s).toContain("**A local-only repository allocates from the local maximum and says so**");
    });

    it("states no reservation markers and one allocation for several decisions", () => {
        const s = section();
        expect(s).toContain("**No reservation markers.**");
        expect(s).toContain("allocates all of them at the start of the wave that needs them, from the fetched trunk");
    });

    it("states ARC-050's consequence: the unmerged branch renumbers its own entry", () => {
        const s = section();
        expect(s).toContain("\"Never renumber existing entries\"\n   applies to merged entries");
        expect(s).toContain("the branch that has not merged\n   yet renumbers its own entry");
    });

    it("annotates every numbered rule with an ARC-023 enforcement mode", () => {
        const s = section();
        const rules = s.split(/\n(?=\d\. \*\*)/).filter((chunk) => /^\d\. \*\*/.test(chunk));
        expect(rules).toHaveLength(5);
        // Rules 1 and 2 share one annotation, placed after rule 2.
        for (const rule of rules.slice(1)) {
            expect(rule).toMatch(
                /\*\*Enforcement(?: \(rules 1 and 2\))?:\s+(structured spell gate|explicitly\s+advisory\s+prose|executable check)[^*]*\(ARC-023\)/,
            );
        }
    });

    it("root copy matches the canonical source", () => {
        expect(rootStandard).toBe(standard);
    });
});
