import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    getGeneratedDogfoodPaths,
    runSelfHostParity,
} from "../scripts/self-host-parity.js";

const ASSETS_DIR = join(process.cwd(), "src", "assets");
const NPM_CLI = process.env["npm_execpath"];
const DRIFT_FIXTURE = ".github/prompts/spell-create-pull-request.prompt.md";
const tempDirs: string[] = [];

let driftPrompt: string;

beforeAll(async () => {
    driftPrompt = await fs.readFile(
        join(ASSETS_DIR, ".github", "prompts", "spell-check-drift.prompt.md"),
        "utf8",
    );
});

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
});

function runParity(mode: "--check" | "--fix", root: string, assets: string) {
    if (!NPM_CLI) throw new Error("npm_execpath is required for parity gate tests");
    const script = mode === "--fix" ? "fix:self-host-parity" : "check:self-host-parity";
    return spawnSync(process.execPath, [NPM_CLI, "run", script, "--silent"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
            ...process.env,
            ARCANE_SELF_HOST_ROOT: root,
            ARCANE_SELF_HOST_ASSETS_DIR: assets,
        },
    });
}

async function createParityFixture() {
    const root = await fs.mkdtemp(join(tmpdir(), "self-host-parity-test-"));
    tempDirs.push(root);
    const assets = join(root, "src", "assets");
    await fs.cp(ASSETS_DIR, assets, { recursive: true });

    const result = await runSelfHostParity("fix", root, assets);
    expect(result.repaired.length).toBe(result.checked);
    return { root, assets };
}

describe("self-host parity gate", () => {
    it("derives generated root copies from the component registry", async () => {
        const paths = await getGeneratedDogfoodPaths(ASSETS_DIR);

        expect(paths).toContain(DRIFT_FIXTURE);
        expect(paths).toContain(".arcane/governance/git-conventions.md");
        expect(paths).toContain(".claude/commands/spell-create-pull-request.md");
        expect(paths).not.toContain("TODO.md");
        expect(paths).not.toContain("ai-context/system-prompt-context.md");
    });

    it(
        "fails when a generated root copy has real content drift",
        async () => {
            const { root, assets } = await createParityFixture();
            await fs.appendFile(join(root, DRIFT_FIXTURE), "\nreal drift\n", "utf8");

            const result = runParity("--check", root, assets);

            expect(result.status).toBe(1);
            expect(result.stderr).toContain("Self-host parity FAILED");
            expect(result.stderr).toContain(DRIFT_FIXTURE);
        },
        15_000,
    );

    it("runs the failing check as a required CI step", async () => {
        const workflow = await fs.readFile(
            join(process.cwd(), ".github", "workflows", "ci.yml"),
            "utf8",
        );

        expect(workflow).toContain("run: npm run check:self-host-parity");
    });

    it("ignores line-ending-only differences", async () => {
        const { root, assets } = await createParityFixture();
        const outputPath = join(root, DRIFT_FIXTURE);
        const content = await fs.readFile(outputPath, "utf8");
        await fs.writeFile(outputPath, content.replace(/\r\n?|\n/g, "\r\n"), "utf8");

        const result = await runSelfHostParity("check", root, assets);

        expect(result.drifted).toEqual([]);
    });

    it("repairs drift only in explicit fix mode", async () => {
        const { root, assets } = await createParityFixture();
        const outputPath = join(root, DRIFT_FIXTURE);
        await fs.writeFile(outputPath, "stale content\n", "utf8");

        const result = await runSelfHostParity("fix", root, assets);

        expect(result.repaired).toEqual([DRIFT_FIXTURE]);
        await expect(fs.readFile(outputPath, "utf8")).resolves.toBe(
            await fs.readFile(join(assets, DRIFT_FIXTURE), "utf8"),
        );
    });
});

describe("spell-check-drift classification contract", () => {
    it("separates real content drift from line-ending-only drift", () => {
        expect(driftPrompt).toContain("compare bytes first");
        expect(driftPrompt).toContain("normalize `CRLF` and lone `CR` to `LF`");
        expect(driftPrompt).toContain("## Real Content Drift Findings");
        expect(driftPrompt).toContain("## Line-Ending-Only Drift");
        expect(driftPrompt).toContain("excluded from severity totals");
        expect(driftPrompt).toContain(
            "Never summarize all byte-different files as content drift",
        );
    });
});

describe("spell-open-session self-host tracking source", () => {
    it("does not treat the self-host doctor marker as tracking provenance", async () => {
        const openSessionPrompt = await fs.readFile(
            join(ASSETS_DIR, ".github", "prompts", "spell-open-session.prompt.md"),
            "utf8",
        );

        expect(openSessionPrompt).toContain(
            "A self-host marker under `src/assets/` is doctor metadata, not active repository configuration",
        );
        expect(openSessionPrompt).toContain(
            "treat the answer as session-scoped until EF-14 defines persistent configuration",
        );
    });
});