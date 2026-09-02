import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { inspectGitRepository } from "../src/modules/git.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";

const tempDirs: string[] = [];

async function createTempDir() {
    const dir = await createFixtureDir("git-state-test");
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => removeFixtureDir(dir)),
    );
});

describe("inspectGitRepository", () => {
    it("identifies a directory that is not a Git repository", async () => {
        const dir = await createTempDir();

        await expect(inspectGitRepository(dir)).resolves.toEqual({
            status: "not-repository",
        });
    });

    it("identifies a repository with no commits", async () => {
        const dir = await createTempDir();
        runGit(dir, ["init"]);

        await expect(inspectGitRepository(dir)).resolves.toEqual({
            status: "no-commits",
        });
    });

    it("counts changes after a committed baseline", async () => {
        const dir = await createTempDir();
        runGit(dir, ["init"]);
        runGit(dir, ["config", "user.name", "Arcane Tests"]);
        runGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
        await fs.writeFile(join(dir, "tracked.txt"), "baseline");
        runGit(dir, ["add", "-A"]);
        runGit(dir, ["commit", "-m", "test: seed baseline"]);

        await expect(inspectGitRepository(dir)).resolves.toEqual({
            status: "ready",
            uncommittedChanges: 0,
        });

        await fs.writeFile(join(dir, "tracked.txt"), "changed");
        await fs.writeFile(join(dir, "untracked.txt"), "new");

        await expect(inspectGitRepository(dir)).resolves.toEqual({
            status: "ready",
            uncommittedChanges: 2,
        });
    });
});