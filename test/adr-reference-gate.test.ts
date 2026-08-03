import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NPM_CLI = process.env["npm_execpath"];
const tempDirs: string[] = [];

async function createFixture(reference: string, content: string) {
    const root = await fs.mkdtemp(join(tmpdir(), "adr-reference-test-"));
    tempDirs.push(root);
    const assets = join(root, "assets");
    await fs.mkdir(join(assets, ".arcane", "governance"), { recursive: true });
    await fs.mkdir(join(assets, ".github", "prompts"), { recursive: true });
    await fs.mkdir(join(assets, ".github", "instructions"), { recursive: true });
    await fs.writeFile(
        join(assets, ".arcane", "governance", "framework-decisions.md"),
        reference,
        "utf8",
    );
    await fs.writeFile(
        join(assets, ".github", "prompts", "fixture.prompt.md"),
        content,
        "utf8",
    );
    return assets;
}

function runGate(assets: string) {
    if (!NPM_CLI) throw new Error("npm_execpath is required for ADR gate tests");
    return spawnSync(
        process.execPath,
        [NPM_CLI, "run", "check:adr-references", "--silent"],
        {
            cwd: process.cwd(),
            encoding: "utf8",
            env: { ...process.env, ARCANE_ADR_ASSETS_DIR: assets },
        },
    );
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
});

describe("distributed ADR reference gate", () => {
    it("accepts a citation declared in the shipped reference", async () => {
        const assets = await createFixture(
            "# Decisions\n\n## ADR-048 — Branch Policy\n",
            "Follow ADR-048.\n",
        );

        const result = runGate(assets);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("Distributed ADR reference check passed");
    });

    it("fails for a missing citation and identifies its file and line", async () => {
        const assets = await createFixture(
            "# Decisions\n\n## ADR-048 — Branch Policy\n",
            "First line.\nFollow ADR-051.\n",
        );

        const result = runGate(assets);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(".github/prompts/fixture.prompt.md:2");
        expect(result.stderr).toContain("ADR-051 (missing)");
    });

    it("fails for a malformed citation", async () => {
        const assets = await createFixture(
            "# Decisions\n\n## ADR-048 — Branch Policy\n",
            "Follow ADR-48.\n",
        );

        const result = runGate(assets);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain("ADR-48 (malformed)");
    });

    it("runs as a required CI step", async () => {
        const workflow = await fs.readFile(
            join(process.cwd(), ".github", "workflows", "ci.yml"),
            "utf8",
        );
        expect(workflow).toContain("run: npm run check:adr-references");
    });
});