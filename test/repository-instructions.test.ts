import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
    MARKER_END,
    MARKER_START,
    mergeIntoFile,
} from "../src/modules/merger.js";

const REPOSITORY_ROOT = process.cwd();
const INSTRUCTION_PATHS = [
    "CLAUDE.md",
    "AGENTS.md",
    ".github/copilot-instructions.md",
];
const tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
});

describe("repository working protocol", () => {
    it("is identical across all three client instruction files", async () => {
        const contents = await Promise.all(
            INSTRUCTION_PATHS.map((path) => fs.readFile(join(REPOSITORY_ROOT, path), "utf8")),
        );

        expect(new Set(contents).size).toBe(1);
        expect(contents[0]).toContain("## Working protocol");
        expect(contents[0]).toContain(
            "A summary of work is not evidence of work. Neither is a green test suite.",
        );
    });

    it("keeps the protocol below the Arcane marker block", async () => {
        const content = await fs.readFile(
            join(REPOSITORY_ROOT, "CLAUDE.md"),
            "utf8",
        );

        expect(content.indexOf(MARKER_START)).toBeGreaterThanOrEqual(0);
        expect(content.indexOf(MARKER_END)).toBeGreaterThan(content.indexOf(MARKER_START));
        expect(content.indexOf("## Working protocol")).toBeGreaterThan(
            content.indexOf(MARKER_END),
        );
    });

    it("survives a future agent roster merge", async () => {
        const root = await fs.mkdtemp(join(tmpdir(), "repository-instructions-test-"));
        tempDirs.push(root);
        const source = join(REPOSITORY_ROOT, ".github", "copilot-instructions.md");
        const target = join(root, ".github", "copilot-instructions.md");
        await fs.mkdir(dirname(target), { recursive: true });
        await fs.copyFile(source, target);

        await mergeIntoFile(
            root,
            ".github/copilot-instructions.md",
            "## Agent Roster\n\n| Agent | Role |\n| --- | --- |\n| Test | Test |",
            { force: true },
        );

        const merged = await fs.readFile(target, "utf8");
        expect(merged).toContain("| Test | Test |");
        expect(merged).toContain("## Working protocol");
        expect(merged).toContain(
            "A summary of work is not evidence of work. Neither is a green test suite.",
        );
    });
});