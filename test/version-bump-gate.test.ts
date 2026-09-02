import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { resolveTsxCli, TSX_SKIP_REASON } from "./helpers/resolve-cli.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

const tempDirs: string[] = [];
const TSX = resolveTsxCli();
if (!TSX) console.warn(`[version-bump-gate.test.ts] ${TSX_SKIP_REASON}`);
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

function runGate(dir: string, mode?: "--staged" | "--working-tree") {
    const args = [TSX!, "scripts/check-version-bump.ts"];
    if (mode) args.push(mode);
    return spawnSync(process.execPath, args, {
        cwd: dir,
        encoding: "utf8",
    });
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => removeFixtureDir(dir)),
    );
});

describe("distributable version bump gate", () => {
    it.skipIf(!TSX)("fails a PR that changes src/assets without changing package version", async () => {
        const dir = await createPullRequestFixture();
        await fs.mkdir(join(dir, "src", "assets"), { recursive: true });
        await fs.writeFile(join(dir, "src", "assets", "fixture.md"), "changed\n", "utf8");
        runGit(dir, ["add", "-A"]);
        runGit(dir, ["commit", "-m", "feat: change distributable asset"]);

        const result = runGate(dir);

        expect(result.status).toBe(1);
        expect(result.stdout).toContain("src/assets/fixture.md");
        expect(result.stderr).toContain("Version bump required");
    }, HEAVY_TEST_TIMEOUT);

    it.skipIf(!TSX)("passes a PR with only non-distributable changes and no version bump", async () => {
        const dir = await createPullRequestFixture();
        await fs.writeFile(join(dir, "README.md"), "# Updated fixture\n", "utf8");
        runGit(dir, ["add", "-A"]);
        runGit(dir, ["commit", "-m", "docs: update readme"]);

        const result = runGate(dir);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("No distributable paths changed");
    }, HEAVY_TEST_TIMEOUT);

    // LH-06a: run BEFORE committing (spell-bump Step 1), when merge-base..HEAD
    // can't see today's not-yet-committed work at all -- the exact false
    // "no bump required" pass this mode exists to close.
    it.skipIf(!TSX)("--staged catches a distributable change that is staged but not yet committed", async () => {
        const dir = await createPullRequestFixture();
        await fs.mkdir(join(dir, "src", "assets"), { recursive: true });
        await fs.writeFile(join(dir, "src", "assets", "fixture.md"), "changed\n", "utf8");
        runGit(dir, ["add", "-A"]);
        // Deliberately NOT committed -- default mode's merge-base..HEAD diff
        // is blind to this; that blindness is exactly bug G1 this mode fixes.

        const defaultResult = runGate(dir);
        expect(defaultResult.status).toBe(0);
        expect(defaultResult.stdout).toContain("No distributable paths changed");

        const stagedResult = runGate(dir, "--staged");
        expect(stagedResult.status).toBe(1);
        expect(stagedResult.stdout).toContain("src/assets/fixture.md");
        expect(stagedResult.stderr).toContain("Version bump required");
    }, HEAVY_TEST_TIMEOUT);

    it.skipIf(!TSX)("--staged passes when the staged change is non-distributable", async () => {
        const dir = await createPullRequestFixture();
        await fs.writeFile(join(dir, "README.md"), "# Updated fixture\n", "utf8");
        runGit(dir, ["add", "-A"]);

        const result = runGate(dir, "--staged");

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("No distributable paths changed");
    }, HEAVY_TEST_TIMEOUT);

    it.skipIf(!TSX)("--staged warns (twice) rather than silently passing when origin/main is fully unreachable, even with a distributable file staged", async () => {
        const dir = await createPullRequestFixture();
        // Remove the very ref the gate resolves merge-base (and the version
        // comparison) against -- the "offline, or origin/main not fetched"
        // case named in the epic. With zero access to origin/main's version,
        // the gate genuinely cannot know whether a bump already happened --
        // exit 0 is the honest answer here, not a bug, PROVIDED it says so
        // loudly rather than looking identical to a real, verified pass.
        runGit(dir, ["update-ref", "-d", "refs/remotes/origin/main"]);

        await fs.mkdir(join(dir, "src", "assets"), { recursive: true });
        await fs.writeFile(join(dir, "src", "assets", "fixture.md"), "changed\n", "utf8");
        runGit(dir, ["add", "-A"]);

        const result = runGate(dir, "--staged");

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("src/assets/fixture.md");
        expect(result.stderr).toContain("Could not determine merge base");
        expect(result.stderr).toContain("Could not read version from origin/main");
    }, HEAVY_TEST_TIMEOUT);

    it.skipIf(!TSX)("--staged warns rather than silently passing when offline AND nothing distributable is staged", async () => {
        const dir = await createPullRequestFixture();
        runGit(dir, ["update-ref", "-d", "refs/remotes/origin/main"]);
        await fs.writeFile(join(dir, "README.md"), "# Updated fixture\n", "utf8");
        runGit(dir, ["add", "-A"]);

        const result = runGate(dir, "--staged");

        // A pass here is legitimate (nothing distributable is staged), but it
        // must say plainly that the full picture (merge-base diff) wasn't
        // checked -- this is the "skip-with-warning, not a false pass"
        // distinction the epic calls for, not a silent, unqualified "clean."
        expect(result.status).toBe(0);
        expect(result.stderr).toContain("Could not determine merge base");
        expect(result.stdout).toContain("could not be checked");
    }, HEAVY_TEST_TIMEOUT);

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