import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { checkCitations } from "../scripts/check-citations.js";
import { getLivingDocs } from "../scripts/lib/living-docs.js";

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

describe("getLivingDocs (LH-07)", () => {
    it("includes the static root living docs when present", async () => {
        dir = await createFixtureDir("living-docs-static");
        await writeFile(dir, "TODO.md", "# TODO\n");
        await writeFile(dir, "IDEAS.md", "# IDEAS\n");

        const docs = await getLivingDocs(dir);
        expect(docs).toContain("TODO.md");
        expect(docs).toContain("IDEAS.md");
    });

    it("includes an active plan's files but excludes a completed plan's", async () => {
        dir = await createFixtureDir("living-docs-plans");
        await writeFile(dir, "docs/plans/active-one/PLAN.md", "---\nstatus: active\n---\n# Active\n");
        await writeFile(dir, "docs/plans/active-one/KICKOFF.md", "# Kickoff\n");
        await writeFile(dir, "docs/plans/done-one/PLAN.md", "---\nstatus: complete\n---\n# Done\n");

        const docs = await getLivingDocs(dir);
        expect(docs).toContain("docs/plans/active-one/PLAN.md");
        expect(docs).toContain("docs/plans/active-one/KICKOFF.md");
        expect(docs).not.toContain("docs/plans/done-one/PLAN.md");
    });

    it("includes src/assets/.arcane/governance and src/assets/.github content", async () => {
        dir = await createFixtureDir("living-docs-assets");
        await writeFile(dir, "src/assets/.arcane/governance/foo.md", "# Foo\n");
        await writeFile(dir, "src/assets/.github/prompts/spell-foo.prompt.md", "# Spell\n");

        const docs = await getLivingDocs(dir);
        expect(docs).toContain("src/assets/.arcane/governance/foo.md");
        expect(docs).toContain("src/assets/.github/prompts/spell-foo.prompt.md");
    });

    it("does not include journal/ or docs/intake/ -- historical records are out of scope", async () => {
        dir = await createFixtureDir("living-docs-historical");
        await writeFile(dir, "journal/2026-01-01-something.md", "# Journal\n");
        await writeFile(dir, "docs/intake/batch-001/EF-01.md", "# EF-01\n");

        const docs = await getLivingDocs(dir);
        expect(docs.some((d) => d.startsWith("journal/"))).toBe(false);
        expect(docs.some((d) => d.startsWith("docs/intake/"))).toBe(false);
    });
});

describe("checkCitations (LH-07)", () => {
    it("flags a bare path:NNN citation with no accompanying anchor or phrase", async () => {
        dir = await createFixtureDir("citations-bare");
        await writeFile(dir, "TODO.md", "See `IDEAS.md:5` for context.\n");
        await writeFile(dir, "IDEAS.md", "line1\nline2\nline3\nline4\nline5\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.reason).toContain("bare path:NNN");
    });

    it("does not flag a bare path:NNN,MMM comma-list -- regression for the gap LH-07's own first pass missed", async () => {
        dir = await createFixtureDir("citations-comma-list");
        await writeFile(dir, "TODO.md", "See `IDEAS.md:5,7` for context.\n");
        await writeFile(dir, "IDEAS.md", "line1\nline2\nline3\nline4\nline5\nline6\nline7\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.citation).toBe("`IDEAS.md:5,7`");
    });

    it("accepts a path#anchor citation when the anchor slugifies to a real heading", async () => {
        dir = await createFixtureDir("citations-anchor-ok");
        await writeFile(dir, "TODO.md", "See `IDEAS.md#my-heading` for context.\n");
        await writeFile(dir, "IDEAS.md", "# Intro\n\n## My Heading\n\nBody.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(0);
    });

    it("flags a path#anchor citation when the anchor does not match any real heading", async () => {
        dir = await createFixtureDir("citations-anchor-bad");
        await writeFile(dir, "TODO.md", "See `IDEAS.md#nonexistent-heading` for context.\n");
        await writeFile(dir, "IDEAS.md", "# Intro\n\n## My Heading\n\nBody.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.reason).toContain("does not slugify-match");
    });

    it('accepts a path ("phrase") citation when the phrase occurs exactly once', async () => {
        dir = await createFixtureDir("citations-phrase-ok");
        await writeFile(dir, "TODO.md", 'See `IDEAS.md ("a genuinely unique sentence")` for context.\n');
        await writeFile(dir, "IDEAS.md", "Some text.\n\na genuinely unique sentence lives here.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(0);
    });

    it('flags a path ("phrase") citation when the phrase occurs zero times', async () => {
        dir = await createFixtureDir("citations-phrase-zero");
        await writeFile(dir, "TODO.md", 'See `IDEAS.md ("a phrase that is not there")` for context.\n');
        await writeFile(dir, "IDEAS.md", "Nothing matching lives here.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.reason).toContain("occurs 0 time(s)");
    });

    it('flags a path ("phrase") citation when the phrase occurs more than once', async () => {
        dir = await createFixtureDir("citations-phrase-dup");
        await writeFile(dir, "TODO.md", 'See `IDEAS.md ("repeated phrase")` for context.\n');
        await writeFile(dir, "IDEAS.md", "repeated phrase here.\n\nAnd repeated phrase again.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.reason).toContain("occurs 2 time(s)");
    });

    it("flags a citation whose path does not resolve to a real file", async () => {
        dir = await createFixtureDir("citations-missing-path");
        await writeFile(dir, "TODO.md", "See `nonexistent.md#some-anchor` for context.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.reason).toContain("does not resolve to a real file");
    });

    it("flags a line number beyond the target file's current length even when paired with a valid anchor", async () => {
        dir = await createFixtureDir("citations-line-beyond");
        await writeFile(dir, "TODO.md", "See `IDEAS.md#heading:99` for context.\n");
        await writeFile(dir, "IDEAS.md", "# Intro\n\n## Heading\n\nBody.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.reason).toContain("is beyond");
    });

    it("resolves a bare filename against .arcane/governance/, .github/prompts/, and .github/instructions/ conventions", async () => {
        dir = await createFixtureDir("citations-bare-filename-resolve");
        await writeFile(dir, "TODO.md", "See `git-conventions.md#some-heading` for context.\n");
        await writeFile(dir, ".arcane/governance/git-conventions.md", "# Intro\n\n## Some Heading\n\nBody.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(0);
    });

    it("does not flag a bare backtick-wrapped filename with no anchor/phrase/line -- a prose mention, not a citation", async () => {
        dir = await createFixtureDir("citations-prose-mention");
        await writeFile(dir, "TODO.md", "The `registry.ts` module handles this.\n");

        const findings = await checkCitations(dir);
        expect(findings).toHaveLength(0);
    });
});
