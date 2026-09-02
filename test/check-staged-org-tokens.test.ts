import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { runGit } from "./helpers/git-fixture.js";
import { checkStagedOrgTokens } from "../scripts/check-staged-org-tokens.js";

let dir: string | undefined;
const savedEnv: Record<string, string | undefined> = {};

function stashEnv(...keys: string[]) {
    for (const key of keys) savedEnv[key] = process.env[key];
}

afterEach(async () => {
    if (dir) await removeFixtureDir(dir);
    dir = undefined;
    for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

async function initRepo(): Promise<string> {
    const repo = await createFixtureDir("staged-org-tokens-repo");
    runGit(repo, ["init", "-b", "main"]);
    runGit(repo, ["config", "user.name", "Arcane Tests"]);
    runGit(repo, ["config", "user.email", "arcane-tests@example.invalid"]);
    return repo;
}

describe("checkStagedOrgTokens (ARC-041, LH-12)", () => {
    it("is a no-op when resolvePrivateTokens() has nothing configured", async () => {
        stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");
        delete process.env["ARCANE_ORG_TOKENS"];
        delete process.env["ARCANE_ORG_TOKENS_FILE"];

        dir = await initRepo();
        await fs.writeFile(join(dir, "README.md"), "anything at all\n", "utf8");
        runGit(dir, ["add", "-A"]);

        const findings = await checkStagedOrgTokens(dir);
        expect(findings).toHaveLength(0);
    });

    it("flags a denylisted name in a staged file", async () => {
        stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");
        delete process.env["ARCANE_ORG_TOKENS_FILE"];
        process.env["ARCANE_ORG_TOKENS"] = "realventure";

        dir = await initRepo();
        await fs.writeFile(join(dir, "README.md"), "mentions realventure by name\n", "utf8");
        runGit(dir, ["add", "-A"]);

        const findings = await checkStagedOrgTokens(dir);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.file).toBe("README.md");
    });

    it("only scans STAGED files, not every file in the working tree", async () => {
        stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");
        delete process.env["ARCANE_ORG_TOKENS_FILE"];
        process.env["ARCANE_ORG_TOKENS"] = "realventure";

        dir = await initRepo();
        await fs.writeFile(join(dir, "staged.md"), "realventure here\n", "utf8");
        await fs.writeFile(join(dir, "unstaged.md"), "realventure here too\n", "utf8");
        runGit(dir, ["add", "staged.md"]);

        const findings = await checkStagedOrgTokens(dir);
        expect(findings.map((f) => f.file)).toEqual(["staged.md"]);
    });

    it("does not flag a staged file that was deleted, only added/modified/renamed content", async () => {
        stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");
        delete process.env["ARCANE_ORG_TOKENS_FILE"];
        process.env["ARCANE_ORG_TOKENS"] = "realventure";

        dir = await initRepo();
        await fs.writeFile(join(dir, "gone.md"), "realventure here\n", "utf8");
        runGit(dir, ["add", "-A"]);
        runGit(dir, ["commit", "-m", "test: seed"]);
        await removeFixtureDir(join(dir, "gone.md"));
        runGit(dir, ["add", "-A"]);

        // A deleted file has nothing left on disk to scan -- this proves the
        // scan doesn't crash trying to read a staged-deleted path, and
        // correctly reports no findings for content that no longer exists.
        await expect(checkStagedOrgTokens(dir)).resolves.toEqual([]);
    });
});
