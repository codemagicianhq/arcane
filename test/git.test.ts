import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectGitRepository } from "../src/modules/git.js";

const tempDirs: string[] = [];

async function createTempDir() {
    const dir = await fs.mkdtemp(join(tmpdir(), "git-state-test-"));
    tempDirs.push(dir);
    return dir;
}

function runGit(dir: string, args: string[]) {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    if (result.status !== 0) {
        throw new Error(result.stderr || `git ${args.join(" ")} failed`);
    }
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
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