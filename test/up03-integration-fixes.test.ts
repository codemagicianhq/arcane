import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import { checkComponentRequires } from "../src/commands/doctor.js";
import { moveComponentFiles } from "../src/commands/update.js";

// Findings from UP-03's adversarial review.

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[up03-integration-fixes.test.ts] ${BUILT_CLI_SKIP_REASON}`);

const savedEnv: Record<string, string | undefined> = {};
let scopes: string;
let home: string;

beforeAll(async () => {
  scopes = await createFixtureDir("up03-fixes-scopes-");
  await fs.writeFile(join(scopes, "global"), "");
  await fs.writeFile(join(scopes, "system"), "");
  home = await createFixtureDir("up03-fixes-home-");
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

describe("R1 — doctor on a manifest with no components", () => {
  it("skips the prerequisites check instead of crashing", async () => {
    const dir = await createFixtureDir("up03-fixes-nocomponents-");
    await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify({ version: "1.0.0", profile: "full" }));
    const result = await checkComponentRequires(dir);
    expect(result).toMatchObject({ passed: true, blocking: false, skipped: true });
    await removeFixtureDir(dir);
  });
});

describe("R3 — a moved file already deleted from disk is dropped, not re-homed", () => {
  const legacy = [
    {
      name: "docs-baseline",
      files: [".gitattributes", ".gitignore"],
      installedVersion: "1.5.1",
      fileHashes: { ".gitattributes": "a", ".gitignore": "b" },
    },
  ];

  it("creates no line-ending-baseline entry when .gitattributes is gone, and stops tracking it", () => {
    const moved = moveComponentFiles(legacy, (f) => f !== ".gitattributes");
    expect(moved.map((c) => c.name)).toEqual(["docs-baseline"]);
    expect(moved[0]).toMatchObject({ files: [".gitignore"], fileHashes: { ".gitignore": "b" } });
  });

  it("still re-homes a .gitattributes that is present, with its recorded hash", () => {
    const moved = moveComponentFiles(legacy, () => true);
    expect(moved.find((c) => c.name === "line-ending-baseline")).toMatchObject({
      files: [".gitattributes"],
      fileHashes: { ".gitattributes": "a" },
    });
  });
});

describe.skipIf(!BIN)("R2 — init discloses the .gitattributes it writes (built CLI)", () => {
  it(
    "in a repository with history, warns about renormalization and names .gitattributes in the commit hint",
    async () => {
      const work = await createFixtureDir("up03-fixes-work-");
      fixtureGit(work, ["init", "-b", "main"]);
      fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
      fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
      await fs.writeFile(join(work, "a.txt"), "hello\r\n");
      fixtureGit(work, ["add", "-A"]);
      fixtureGit(work, ["commit", "-m", "test: seed"]);

      const result = spawnSync("node", [BIN!, "init", "--profile", "lite"], {
        cwd: work,
        encoding: "utf-8",
        input: "",
        env: { ...process.env },
      });

      const out = result.stdout + result.stderr;
      expect(await fs.readFile(join(work, ".gitattributes"), "utf-8")).toContain("text=auto");
      expect(out).toContain("Installed .gitattributes, which normalizes text to LF");
      expect(out).toMatch(/git add [^\n]*\.gitattributes/);
      await removeFixtureDir(work);
    },
    VERY_HEAVY_TEST_TIMEOUT,
  );
});
