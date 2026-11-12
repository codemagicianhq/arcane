import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { ManifestNotFoundError } from "../src/modules/manifest.js";
import { runState } from "../src/commands/state.js";
import { collectState } from "../src/modules/state/collect.js";
import { STATE_SCHEMA_VERSION, type StateDocument } from "../src/modules/state/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import { compileStateSchema } from "./helpers/state-schema.js";
import { commitFiles, initRepo } from "./helpers/state-fixtures.js";
import { HEAVY_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[state-command.test.ts] ${BUILT_CLI_SKIP_REASON}`);
const PACKAGE_VERSION = "0.0.0-test";
const NOW = () => new Date("2026-11-04T12:00:00.000Z");

const fixtures: string[] = [];
afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

/** A consumer repository: manifest, one commit, DECISIONS.md with ADR- entries, TODO.md, no roster, no features. */
async function consumerFixture(prefix: string): Promise<string> {
  const dir = await createFixtureDir(prefix);
  fixtures.push(dir);
  const manifest: ArcaneManifest = {
    version: "0.0.0-test",
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [{ name: "git-conventions", files: [".arcane/governance/git-conventions.md"], installedVersion: "0.0.0-test" }],
    tracking_mode: "internal",
    external_provider: null,
  };
  initRepo(dir);
  await commitFiles(dir, "test: seed", {
    ".arcane.json": JSON.stringify(manifest, null, 2),
    "DECISIONS.md": "# Decisions\n\n## ADR-001 — Geothermal survey cadence\n\n**Date:** 2026-10-01\n**Status:** Accepted\n",
    "TODO.md": "# TODO\n\n## Open Items\n\n- [ ] Survey the Ordovica site\n- [x] Order the drones\n",
  });
  return dir;
}

describe("collectState (SE-10)", () => {
  it("assembles a complete, valid document from a consumer fixture, with every section from SE-02..SE-09 present", async () => {
    const dir = await consumerFixture("state-collect-consumer");
    const doc = await collectState(dir, PACKAGE_VERSION, { online: false, includeLocalPaths: false, now: NOW });
    const validate = await compileStateSchema();
    expect(validate(doc)).toEqual([]);
    expect(doc.schema_version).toBe(STATE_SCHEMA_VERSION);
    expect(doc.generated_at).toBe("2026-11-04T12:00:00.000Z");
    expect(doc.generator).toEqual({ name: "arcane-cli", version: PACKAGE_VERSION });
    expect(doc.repository).toEqual({ root: dir, scope: "repo", role: "consumer", profile: "lite" });
    expect(doc.versions.components).toEqual([{ name: "git-conventions", installedVersion: "0.0.0-test" }]);
    expect(doc.versions.latest).toBeNull();
    expect(doc.git?.branch).toBe("main");
    expect(doc.git?.uncommitted).toBe(0);
    expect(doc.indexes.decisions?.map((d) => d.id)).toEqual(["ADR-001"]);
    expect(doc.indexes.todos).toMatchObject({ open: 1, done: 1 });
    expect(doc.indexes.ideas).toBeNull();
    expect(doc.indexes.done).toBeNull();
    expect(doc.indexes.journal).toBeNull();
    expect(doc.config.tracking_mode).toBe("internal");
    expect(doc.registry).toBeNull();
    expect(doc.features).toBeNull();
    expect(doc.agents).toBeNull();
    expect(doc.warnings).toEqual([]);
  }, HEAVY_TEST_TIMEOUT);

  it("throws ManifestNotFoundError without a manifest (the command's exit-1 path)", async () => {
    const dir = await createFixtureDir("state-collect-nomanifest");
    fixtures.push(dir);
    await expect(collectState(dir, PACKAGE_VERSION, { online: false, includeLocalPaths: false })).rejects.toBeInstanceOf(ManifestNotFoundError);
  });

  it("degrades a collector that throws to null plus a warning (D12)", async () => {
    const dir = await consumerFixture("state-collect-degrade");
    const doc = await collectState(dir, PACKAGE_VERSION, {
      online: false,
      includeLocalPaths: false,
      now: NOW,
      runGit: () => Promise.reject(new Error("git exploded")),
    });
    // collectGit itself catches its reads; the inside-work-tree probe failing yields git null with a warning.
    expect(doc.git).toBeNull();
    expect(doc.warnings.some((w) => w.startsWith("git:") && w.includes("git exploded"))).toBe(true);
    const validate = await compileStateSchema();
    expect(validate(doc)).toEqual([]);
  }, HEAVY_TEST_TIMEOUT);

  it("warns, instead of failing, about a user-tier manifest outside the store", async () => {
    const dir = await createFixtureDir("state-collect-misplaced");
    fixtures.push(dir);
    await writeFile(
      join(dir, ".arcane.json"),
      JSON.stringify({ version: "0.0.0-test", profile: "lite", installedAt: "2026-01-01T00:00:00.000Z", components: [], scope: "user" }),
      "utf8",
    );
    const doc = await collectState(dir, PACKAGE_VERSION, { online: false, includeLocalPaths: false, now: NOW });
    expect(doc.repository.scope).toBe("repo");
    expect(doc.warnings.some((w) => w.startsWith("repository.scope:"))).toBe(true);
  }, HEAVY_TEST_TIMEOUT);
});

describe("spell state — handler (ST-01)", () => {
  let errorSpy: MockInstance<typeof console.error>;
  let logSpy: MockInstance<typeof console.log>;
  let written: string[];
  const write = async (text: string) => {
    written.push(text);
  };

  beforeEach(() => {
    written = [];
    process.exitCode = undefined;
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("without --json prints a one-line pointer to stderr and sets exit code 2, writing nothing to stdout", async () => {
    await runState("/nowhere", PACKAGE_VERSION, {}, { write });
    expect(process.exitCode).toBe(2);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("spell state --json");
    expect(written).toEqual([]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("prints spell status's Not initialized wording and sets exit code 1 without a manifest", async () => {
    const dir = await createFixtureDir("state-cmd-nomanifest");
    fixtures.push(dir);
    await runState(dir, PACKAGE_VERSION, { json: true }, { write });
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith('Not initialized. Run "spell init" first.');
    expect(written).toEqual([]);
  });

  it("names a self-hosted source repository instead of suggesting spell init", async () => {
    const dir = await createFixtureDir("state-cmd-selfhosted-marker");
    fixtures.push(dir);
    await mkdir(join(dir, "src", "assets"), { recursive: true });
    await writeFile(join(dir, "src", "assets", ".arcane.json"), JSON.stringify({ selfHosted: true, tracking_mode: "internal" }));

    await runState(dir, PACKAGE_VERSION, { json: true }, { write });

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "Self-hosted Arcane repository: spell state cannot determine versions.files or components without a root .arcane.json.",
    );
    expect(written).toEqual([]);
  });

  it("does not treat an incomplete self-hosted marker as the source repository", async () => {
    const dir = await createFixtureDir("state-cmd-incomplete-selfhosted-marker");
    fixtures.push(dir);
    await mkdir(join(dir, "src", "assets"), { recursive: true });
    await writeFile(join(dir, "src", "assets", ".arcane.json"), JSON.stringify({ selfHosted: true }));

    await runState(dir, PACKAGE_VERSION, { json: true }, { write });

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith('Not initialized. Run "spell init" first.');
    expect(written).toEqual([]);
  });

  it("writes exactly one serialized document and nothing else, exit code unset (0)", async () => {
    const dir = await consumerFixture("state-cmd-ok");
    await runState(dir, PACKAGE_VERSION, { json: true }, { write });
    expect(process.exitCode).toBeUndefined();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(written).toHaveLength(1);
    const doc = JSON.parse(written[0]) as StateDocument;
    expect(doc.repository.root).toBe(dir);
    expect(written[0].endsWith("\n")).toBe(true);
  }, HEAVY_TEST_TIMEOUT);

  it("passes --online and --include-local-paths through to the collector", async () => {
    const seen: unknown[] = [];
    const collect = vi.fn(async (_cwd: string, _version: string, options: unknown) => {
      seen.push(options);
      return (await import("./helpers/state-schema.js")).minimalDocument();
    });
    await runState("/repo", PACKAGE_VERSION, { json: true, online: true, includeLocalPaths: true }, { write, collect });
    expect(seen).toEqual([{ online: true, includeLocalPaths: true }]);
    await runState("/repo", PACKAGE_VERSION, { json: true }, { write, collect });
    expect(seen[1]).toEqual({ online: false, includeLocalPaths: false });
  });

  it("reports any other collector error on stderr with exit code 1", async () => {
    const collect = () => Promise.reject(new Error("roster is malformed"));
    await runState("/repo", PACKAGE_VERSION, { json: true }, { write, collect });
    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls[0][0]).toContain("roster is malformed");
    expect(written).toEqual([]);
  });

  it("writes through process.stdout by default", async () => {
    const collect = async () => (await import("./helpers/state-schema.js")).minimalDocument();
    const chunks: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array, callback?: (error?: Error | null) => void) => {
      chunks.push(String(chunk));
      callback?.(null);
      return true;
    }) as typeof process.stdout.write);
    await runState("/repo", PACKAGE_VERSION, { json: true }, { collect });
    stdoutSpy.mockRestore();
    expect(process.exitCode).toBeUndefined();
    expect(chunks).toHaveLength(1);
    expect(JSON.parse(chunks[0])).toMatchObject({ schema_version: STATE_SCHEMA_VERSION });
  });

  it("reports an unwritable stdout with exit code 1 (D12)", async () => {
    const collect = async () => (await import("./helpers/state-schema.js")).minimalDocument();
    await runState("/repo", PACKAGE_VERSION, { json: true }, { collect, write: () => Promise.reject(new Error("EPIPE")) });
    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls[0][0]).toContain("stdout is not writable");
  });
});

describe.skipIf(!BIN)("spell state — built CLI", () => {
  it("prints one parseable JSON document to stdout, nothing on stderr, exit 0; exit 2 without --json; exit 1 without a manifest", async () => {
    const dir = await consumerFixture("state-cli");
    await mkdir(join(dir, "journal"));
    const ok = spawnSync("node", [BIN!, "state", "--json"], { cwd: dir, encoding: "utf8" });
    expect(ok.stderr).toBe("");
    expect(ok.status).toBe(0);
    const doc = JSON.parse(ok.stdout) as StateDocument;
    expect(doc.schema_version).toBe(STATE_SCHEMA_VERSION);
    expect(doc.generator.name).toBe("arcane-cli");
    expect(doc.indexes.journal).toEqual([]);
    const validate = await compileStateSchema();
    expect(validate(doc)).toEqual([]);

    const noJson = spawnSync("node", [BIN!, "state"], { cwd: dir, encoding: "utf8" });
    expect(noJson.status).toBe(2);
    expect(noJson.stdout).toBe("");
    expect(noJson.stderr.trim().split("\n")).toHaveLength(1);

    const empty = await createFixtureDir("state-cli-empty");
    fixtures.push(empty);
    const notInit = spawnSync("node", [BIN!, "state", "--json"], { cwd: empty, encoding: "utf8" });
    expect(notInit.status).toBe(1);
    expect(notInit.stdout).toBe("");
    expect(notInit.stderr).toContain("Not initialized");
  }, VERY_HEAVY_TEST_TIMEOUT);
});
