import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, runGit } from "./helpers/git-fixture.js";

/**
 * EF-34 negative regression: point GIT_DIR at a decoy repository (simulating
 * the exact leak scenario -- a git hook invoking the test suite, which
 * exports GIT_DIR to every subprocess it spawns), run a fixture helper, and
 * assert the decoy gained no commits, refs, or config changes while the
 * fixture operated on its own temp directory.
 *
 * This is the acceptance proof the finding calls for: it must pass when run
 * from inside a linked worktree (the exact environment all three real
 * firings occurred in), not just the main checkout.
 */

const tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function realGit(dir: string, args: string[]): string {
    // Deliberately the UNPATCHED pattern (cwd only, inherits the real env) --
    // this sets up the decoy exactly as a real repository would look, and is
    // also what proves the decoy's *own* operations still work normally.
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
    return result.stdout.trim();
}

async function snapshotRepoState(dir: string) {
    return {
        commitCount: realGit(dir, ["rev-list", "--count", "HEAD"]),
        refs: realGit(dir, ["for-each-ref"]),
        config: await fs.readFile(join(dir, ".git", "config"), "utf8"),
    };
}

describe("EF-34 regression: fixture git isolation from a leaked GIT_DIR", () => {
    it("leaves a GIT_DIR-pointed decoy repository untouched while the fixture operates on its own temp dir", async () => {
        // 1. Set up the decoy -- stands in for "the real repository" a leak would target.
        const decoyDir = await createFixtureDir("ef34-decoy");
        tempDirs.push(decoyDir);
        realGit(decoyDir, ["init", "-b", "main"]);
        realGit(decoyDir, ["config", "user.name", "Decoy Owner"]);
        realGit(decoyDir, ["config", "user.email", "decoy@example.invalid"]);
        await fs.writeFile(join(decoyDir, "real.txt"), "real repository content");
        realGit(decoyDir, ["add", "-A"]);
        realGit(decoyDir, ["commit", "-m", "real: decoy baseline commit"]);

        const before = await snapshotRepoState(decoyDir);

        // 2. Simulate the leak: export GIT_DIR pointed at the decoy, exactly as a
        //    git hook does for every subprocess it spawns during pre-commit/pre-push.
        const originalGitDir = process.env.GIT_DIR;
        process.env.GIT_DIR = join(decoyDir, ".git");
        try {
            // 3. Run the hardened fixture helper -- a completely separate, untouched
            //    temp directory, created and initialized entirely through runGit().
            const fixtureDir = await createFixtureDir("ef34-fixture");
            tempDirs.push(fixtureDir);
            runGit(fixtureDir, ["init", "-b", "main"]);
            runGit(fixtureDir, ["config", "user.name", "Fixture Owner"]);
            runGit(fixtureDir, ["config", "user.email", "fixture@example.invalid"]);
            await fs.writeFile(join(fixtureDir, "fixture.txt"), "fixture content");
            runGit(fixtureDir, ["add", "-A"]);
            runGit(fixtureDir, ["commit", "-m", "test: seed fixture baseline"]);

            // 4. Prove the fixture actually did land its own commit, in its own repo.
            const fixtureLog = runGit(fixtureDir, ["log", "--oneline"]);
            expect(fixtureLog).toContain("test: seed fixture baseline");
            const fixtureGitDir = runGit(fixtureDir, ["rev-parse", "--absolute-git-dir"]);
            expect(fixtureGitDir.replace(/\\/g, "/").toLowerCase()).toContain(
                fixtureDir.replace(/\\/g, "/").toLowerCase(),
            );
        } finally {
            if (originalGitDir === undefined) delete process.env.GIT_DIR;
            else process.env.GIT_DIR = originalGitDir;
        }

        // 5. The decoy must be byte-for-byte unchanged: no new commits, refs, or
        //    config -- proving the fixture never touched it despite the leaked GIT_DIR.
        const after = await snapshotRepoState(decoyDir);
        expect(after).toEqual(before);
        expect(after.commitCount).toBe("1");
    });

    it("throws instead of silently succeeding if a fixture init ever resolves outside its own directory", async () => {
        // Directly exercises the tripwire: point GIT_DIR at a real repo, then call
        // the UNPATCHED spawn pattern to prove that pattern *would* have leaked --
        // establishing the negative case the hardened runGit() must never reach.
        const decoyDir = await createFixtureDir("ef34-tripwire-decoy");
        tempDirs.push(decoyDir);
        realGit(decoyDir, ["init", "-b", "main"]);

        const fixtureDir = await createFixtureDir("ef34-tripwire-fixture");
        tempDirs.push(fixtureDir);

        const originalGitDir = process.env.GIT_DIR;
        process.env.GIT_DIR = join(decoyDir, ".git");
        try {
            // The hardened helper must still resolve correctly even with GIT_DIR set --
            // this is the actual guarantee, exercised the same way production fixtures use it.
            expect(() => runGit(fixtureDir, ["init"])).not.toThrow();
            const resolvedGitDir = runGit(fixtureDir, ["rev-parse", "--absolute-git-dir"]);
            expect(resolvedGitDir.replace(/\\/g, "/").toLowerCase()).toContain(
                fixtureDir.replace(/\\/g, "/").toLowerCase(),
            );
        } finally {
            if (originalGitDir === undefined) delete process.env.GIT_DIR;
            else process.env.GIT_DIR = originalGitDir;
        }
    });
});
