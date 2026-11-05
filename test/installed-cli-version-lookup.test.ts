import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import type { StateDocument } from "../src/modules/state/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import {
  installBuiltCli,
  runCli,
  startStubRegistry,
  type StubRegistry,
} from "./helpers/installed-cli.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import { commitFiles, initRepo } from "./helpers/state-fixtures.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// The latest-version lookup, run from an installed copy of the built bundle.
//
// Every other test of the lookup imports `src/modules/version-check.ts` or
// mocks it. From `src/modules/` the package's `package.json` is two folders
// up; from the one bundled `dist/index.js` it is one. A path written for the
// first passed every source-level test and failed in every installed copy:
// `spell status` printed "Latest: unable to check" and `spell state --json
// --online` reported `versions.latest: null` (TODO.md, "the built CLI's
// `spell status` never reaches npm"). These tests run the bundle itself, from
// the layout npm installs, against a registry on loopback.

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[installed-cli-version-lookup.test.ts] ${BUILT_CLI_SKIP_REASON}`);

const INSTALLED = "7.7.7";
const LATEST = "9.9.9";

const fixtures: string[] = [];
let registry: StubRegistry | null = null;

afterEach(async () => {
  await registry?.close();
  registry = null;
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

/** A repository with a manifest and one commit, and an empty home directory for the run. */
async function consumerRepo(): Promise<{ repo: string; home: string }> {
  const repo = await createFixtureDir("installed-cli-repo");
  const home = await createFixtureDir("installed-cli-home");
  fixtures.push(repo, home);
  const manifest: ArcaneManifest = {
    version: INSTALLED,
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [
      { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: INSTALLED },
    ],
  };
  initRepo(repo);
  await commitFiles(repo, "test: seed", { ".arcane.json": JSON.stringify(manifest, null, 2) });
  return { repo, home };
}

async function install(packageJson: Record<string, unknown>): Promise<string> {
  const installed = await installBuiltCli(BIN!, { version: INSTALLED, ...packageJson });
  fixtures.push(installed.root);
  return installed.bin;
}

describe.skipIf(!BIN)("installed bundle — latest-version lookup", () => {
  it("spell status asks the registry its own package.json names, and prints what it answers", async () => {
    registry = await startStubRegistry(LATEST);
    const bin = await install({ publishConfig: { registry: registry.url } });
    const { repo, home } = await consumerRepo();

    const result = await runCli(bin, ["status"], { cwd: repo, home });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("testing-standards");
    expect(result.stdout).toContain(`Installed: ${INSTALLED}  Latest: ${LATEST}  (spell update available)`);
    expect(result.stdout).not.toContain("unable to check");
    // The stub's address exists in one place only: the installed package's
    // publishConfig.registry. A request here is the proof the feed URL came
    // from there.
    expect(registry.requests).toEqual(["GET /arcane-cli"]);
    // The answer is cached under the run's home, not the developer's.
    const cache = JSON.parse(await fs.readFile(join(home, ".arcane", "version-cache.json"), "utf8")) as { latest: string };
    expect(cache.latest).toBe(LATEST);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("spell state --json --online reports versions.latest and a boolean drift.cli_behind_latest", async () => {
    registry = await startStubRegistry(LATEST);
    const bin = await install({ publishConfig: { registry: registry.url } });
    const { repo, home } = await consumerRepo();

    const result = await runCli(bin, ["state", "--json", "--online"], { cwd: repo, home });

    expect(result.code).toBe(0);
    const doc = JSON.parse(result.stdout) as StateDocument;
    expect(doc.versions.cli).toBe(INSTALLED);
    expect(doc.versions.latest).toBe(LATEST);
    expect(doc.versions.drift.cli_behind_latest).toBe(true);
    expect(doc.warnings.filter((warning) => warning.startsWith("versions.latest"))).toEqual([]);
    expect(registry.requests).toEqual(["GET /arcane-cli"]);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("says it could not check when the registry gives no answer, and never prints the manifest's version as Latest", async () => {
    registry = await startStubRegistry(null);
    const bin = await install({ publishConfig: { registry: registry.url } });
    const { repo, home } = await consumerRepo();

    const status = await runCli(bin, ["status"], { cwd: repo, home });
    expect(status.code).toBe(0);
    expect(status.stdout).toContain(`Installed: ${INSTALLED}  Latest: unable to check`);
    expect(status.stdout).not.toContain("spell update available");

    const state = await runCli(bin, ["state", "--json", "--online"], { cwd: repo, home });
    expect(state.code).toBe(0);
    const doc = JSON.parse(state.stdout) as StateDocument;
    expect(doc.versions.latest).toBeNull();
    expect(doc.versions.drift.cli_behind_latest).toBeNull();
    expect(doc.warnings.filter((line) => line.startsWith("versions.latest"))).toEqual([
      "versions.latest: the npm lookup gave no answer; latest and drift.cli_behind_latest are null",
    ]);
    // Both commands asked, and nothing was cached from a failed lookup.
    expect(registry.requests).toEqual(["GET /arcane-cli", "GET /arcane-cli"]);
    await expect(fs.access(join(home, ".arcane", "version-cache.json"))).rejects.toThrow();
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("says why when the installed package names no registry, in both commands", async () => {
    const bin = await install({});
    const { repo, home } = await consumerRepo();

    const status = await runCli(bin, ["status"], { cwd: repo, home });
    expect(status.code).toBe(0);
    expect(status.stdout).toContain(`Installed: ${INSTALLED}  Latest: unable to check`);

    const state = await runCli(bin, ["state", "--json", "--online"], { cwd: repo, home });
    expect(state.code).toBe(0);
    const doc = JSON.parse(state.stdout) as StateDocument;
    expect(doc.versions.latest).toBeNull();
    expect(doc.versions.drift.cli_behind_latest).toBeNull();
    const warning = doc.warnings.find((line) => line.startsWith("versions.latest"));
    expect(warning).toContain("Feed URL unavailable");
    expect(warning).toContain("publishConfig.registry is not set");
  }, VERY_HEAVY_TEST_TIMEOUT);
});
