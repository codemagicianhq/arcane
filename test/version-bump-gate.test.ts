import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGit } from "./helpers/git-fixture.js";

const tempDirs: string[] = [];
const TSX = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const GATE_SOURCE = join(process.cwd(), "scripts", "check-version-bump.ts");

async function createPullRequestFixture() {
    const dir = await fs.mkdtemp(join(tmpdir(), "version-bump-gate-test-"));
    tempDirs.push(dir);
    await fs.mkdir(join(dir, "scripts"), { recursive: true });
    await fs.copyFile(GATE_SOURCE, join(dir, "scripts", "check-version-bump.ts"));
    await fs.writeFile(
        join(dir, "package.json"),
        JSON.stringify({ name: "fixture", version: "0.14.0" }, null, 2),
        "utf8",
    );
    await fs.writeFile(join(dir, "README.md"), "# Fixture\n", "utf8");

    runGit(dir, ["init", "-b", "main"]);
    runGit(dir, ["config", "user.name", "Arcane Tests"]);
    runGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
    runGit(dir, ["add", "-A"]);
    runGit(dir, ["commit", "-m", "test: seed main"]);
    runGit(dir, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    runGit(dir, ["checkout", "-b", "feature/version-gate"]);
    return dir;
}

function runGate(dir: string) {
    return spawnSync(process.execPath, [TSX, "scripts/check-version-bump.ts"], {
        cwd: dir,
        encoding: "utf8",
    });
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
});

describe("distributable version bump gate", () => {
    it("fails a PR that changes src/assets without changing package version", async () => {
        const dir = await createPullRequestFixture();
        await fs.mkdir(join(dir, "src", "assets"), { recursive: true });
        await fs.writeFile(join(dir, "src", "assets", "fixture.md"), "changed\n", "utf8");
        runGit(dir, ["add", "-A"]);
        runGit(dir, ["commit", "-m", "feat: change distributable asset"]);

        const result = runGate(dir);

        expect(result.status).toBe(1);
        expect(result.stdout).toContain("src/assets/fixture.md");
        expect(result.stderr).toContain("Version bump required");
    }, 15_000);

    it("passes a PR with only non-distributable changes and no version bump", async () => {
        const dir = await createPullRequestFixture();
        await fs.writeFile(join(dir, "README.md"), "# Updated fixture\n", "utf8");
        runGit(dir, ["add", "-A"]);
        runGit(dir, ["commit", "-m", "docs: update readme"]);

        const result = runGate(dir);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("No distributable paths changed");
    }, 15_000);

    it("keeps the required CI job wired to the real gate with full history", async () => {
        const workflow = await fs.readFile(
            join(process.cwd(), ".github", "workflows", "ci.yml"),
            "utf8",
        );

        expect(workflow).toContain("fetch-depth: 0");
        expect(workflow).toContain("git fetch --no-tags origin \"$BASE\"");
        expect(workflow).toContain("npm run check:version-bump");
    });
});