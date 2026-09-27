import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import type { ArcaneManifest } from "../src/types.js";

// Findings from UP-02's adversarial review, each reproduced through the built CLI with no terminal.

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[up02-integration-fixes.test.ts] ${BUILT_CLI_SKIP_REASON}`);

const savedEnv: Record<string, string | undefined> = {};
let home: string;
let scopes: string;

beforeAll(async () => {
  scopes = await createFixtureDir("up02-fixes-scopes-");
  await fs.writeFile(join(scopes, "global"), "");
  await fs.writeFile(join(scopes, "system"), "");
  home = await createFixtureDir("up02-fixes-home-");
  for (const key of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "HOME", "USERPROFILE"]) savedEnv[key] = process.env[key];
  process.env["GIT_CONFIG_GLOBAL"] = join(scopes, "global");
  process.env["GIT_CONFIG_SYSTEM"] = join(scopes, "system");
  process.env["HOME"] = home;
  process.env["USERPROFILE"] = home;
});

afterAll(async () => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await removeFixtureDir(home);
  await removeFixtureDir(scopes);
});

async function freshRepo(): Promise<string> {
  const bare = await createFixtureDir("up02-fixes-bare-");
  fixtureGit(bare, ["init", "--bare", "-b", "main"]);
  const work = await createFixtureDir("up02-fixes-work-");
  fixtureGit(work, ["init", "-b", "main"]);
  fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
  await fs.writeFile(join(work, "a.txt"), "hello\n");
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: seed"]);
  fixtureGit(work, ["remote", "add", "origin", bare]);
  return work;
}

const run = (cwd: string, args: string[]) =>
  spawnSync("node", [BIN!, ...args], { cwd, encoding: "utf-8", input: "", env: { ...process.env } });

describe.skipIf(!BIN)("UP-02 review fixes (built CLI, no terminal)", () => {
  it(
    "`spell update --role hub` without a terminal prints a hint instead of crashing on the registry prompt",
    async () => {
      const work = await freshRepo();
      const manifest: ArcaneManifest = {
        version: "0.0.9",
        profile: "lite",
        installedAt: "2026-01-01T00:00:00.000Z",
        components: [
          { name: "testing-standards", files: [".arcane/governance/testing-standards.md"], installedVersion: "0.0.9" },
        ],
      };
      await fs.writeFile(join(work, ".arcane.json"), JSON.stringify(manifest, null, 2));
      await fs.mkdir(join(work, "ventures", "acme"), { recursive: true });
      await fs.writeFile(join(work, "ventures", "acme", "overview.md"), "# acme\n");
      fixtureGit(work, ["add", "-A"]);
      fixtureGit(work, ["commit", "-m", "test: install"]);

      const result = run(work, ["update", "--role", "hub"]);

      expect(result.stderr).not.toContain("ExitPromptError");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("This repository is now a hub.");
      const recorded = JSON.parse(await fs.readFile(join(work, ".arcane.json"), "utf-8")) as ArcaneManifest;
      expect(recorded.role).toBe("hub");
    },
    VERY_HEAVY_TEST_TIMEOUT,
  );

  it(
    "`spell init --push-policy blocked` exits non-zero and names `spell block-push` when another manager owns core.hooksPath",
    async () => {
      const work = await freshRepo();
      fixtureGit(work, ["config", "core.hooksPath", ".foreign-hooks"]);

      const result = run(work, ["init", "--profile", "governance-only", "--push-policy", "blocked"]);

      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain("not fully in force");
      expect(result.stdout + result.stderr).toContain("spell block-push");
      expect(
        spawnSync("git", ["config", "--local", "core.hooksPath"], { cwd: work, encoding: "utf-8" }).stdout.trim(),
      ).toBe(".foreign-hooks");
    },
    VERY_HEAVY_TEST_TIMEOUT,
  );

  it(
    "`spell init --user` with a manifest-question flag exits 1 with a message, not a stack trace",
    async () => {
      const work = await freshRepo();

      const result = run(work, ["init", "--user", "--push-policy", "blocked"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("the user tier has none of those fields");
      expect(result.stderr).not.toMatch(/\n\s+at /);
    },
    VERY_HEAVY_TEST_TIMEOUT,
  );
});
