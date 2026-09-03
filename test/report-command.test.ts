import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { runReport } from "../src/commands/report.js";
import { parseEpics } from "../src/modules/show-report/plan-parser.js";

const ROOT_DIR = process.cwd();
// The source tree's assets have the same layout the published package ships
// under dist/assets/, so this stands in for ASSETS_DIR without a build.
const ASSETS_DIR = join(ROOT_DIR, "src", "assets");

let dir: string | undefined;
let originalExitCode: number | string | undefined | null;

beforeEach(() => {
  originalExitCode = process.exitCode;
  process.exitCode = undefined;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  if (dir) await removeFixtureDir(dir);
  dir = undefined;
  process.exitCode = originalExitCode ?? undefined;
  vi.restoreAllMocks();
});

/** A consumer-shaped repo: git history, package.json, and a REAL program plan copied in from this repository. */
async function createConsumerFixture(): Promise<string> {
  const root = await createFixtureDir("report-command");
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.name", "Arcane Tests"]);
  runGit(root, ["config", "user.email", "arcane-tests@example.invalid"]);
  await fs.writeFile(join(root, "package.json"), JSON.stringify({ name: "consumer", version: "1.0.0" }, null, 2), "utf8");
  await fs.mkdir(join(root, "docs", "plans", "lessons-hardening"), { recursive: true });
  for (const file of ["PLAN.md", "OPERATOR-QUEUE.md"]) {
    await fs.copyFile(
      join(ROOT_DIR, "docs", "plans", "lessons-hardening", file),
      join(root, "docs", "plans", "lessons-hardening", file),
    );
  }
  runGit(root, ["add", "-A"]);
  runGit(root, ["commit", "-m", "chore: seed consumer repo"]);
  return root;
}

describe("spell report (SR-03): offline generation in a consumer-shaped repository", () => {
  it(
    "produces show-report.{json,html} from a copied real PLAN.md with no network and no baseline history",
    async () => {
      dir = await createConsumerFixture();
      const planContent = await fs.readFile(join(dir, "docs/plans/lessons-hardening/PLAN.md"), "utf8");
      const expectedRows = parseEpics(planContent).length; // derived from the copied plan, not hardcoded

      await runReport(dir, {}, ASSETS_DIR);

      expect(process.exitCode).toBeUndefined();
      const html = await fs.readFile(join(dir, "docs/plans/lessons-hardening/show-report.html"), "utf8");
      expect(html.startsWith("<!doctype html>")).toBe(true);
      expect(html).toContain("Lessons Hardening");
      expect(html).not.toContain("{{");
      const json = JSON.parse(await fs.readFile(join(dir, "docs/plans/lessons-hardening/show-report.json"), "utf8")) as {
        schemaVersion: number;
        sections: { rows: unknown[] }[];
        program: { versionSpan?: unknown };
      };
      expect(json.schemaVersion).toBe(1);
      expect(json.sections.reduce((n, s) => n + s.rows.length, 0)).toBe(expectedRows);
      // The copied plan's `baseline:` SHA does not exist in this fixture's history, so the
      // version span is omitted rather than invented -- and the page still renders.
      expect(json.program.versionSpan).toBeUndefined();
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "is idempotent: a second run on an up-to-date repository writes nothing",
    async () => {
      dir = await createConsumerFixture();
      await runReport(dir, {}, ASSETS_DIR);
      const before = await fs.stat(join(dir, "docs/plans/lessons-hardening/show-report.html"));
      const logSpy = vi.mocked(console.log);
      logSpy.mockClear();
      await runReport(dir, {}, ASSETS_DIR);
      const after = await fs.stat(join(dir, "docs/plans/lessons-hardening/show-report.html"));
      expect(after.mtimeMs).toBe(before.mtimeMs);
      expect(logSpy.mock.calls.some((c) => String(c[0]).includes("already up to date"))).toBe(true);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "--plan targets one PLAN.md and --out redirects the output directory",
    async () => {
      dir = await createConsumerFixture();
      await runReport(dir, { plan: "docs/plans/lessons-hardening/PLAN.md", out: "reports" }, ASSETS_DIR);
      expect(process.exitCode).toBeUndefined();
      await expect(fs.access(join(dir, "reports", "show-report.json"))).resolves.toBeUndefined();
      await expect(fs.access(join(dir, "reports", "show-report.html"))).resolves.toBeUndefined();
      await expect(fs.access(join(dir, "docs/plans/lessons-hardening/show-report.html"))).rejects.toThrow();
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "exits 1 with guidance when the repository has no reportable program",
    async () => {
      dir = await createFixtureDir("report-command-empty");
      runGit(dir, ["init", "-b", "main"]);
      await runReport(dir, {}, ASSETS_DIR);
      expect(process.exitCode).toBe(1);
      expect(vi.mocked(console.error).mock.calls.some((c) => String(c[0]).includes("no program to report on"))).toBe(true);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it("exits 1 naming the missing template when the assets directory has no report/ template", async () => {
    dir = await createFixtureDir("report-command-no-template");
    await runReport(dir, {}, join(dir, "not-an-assets-dir"));
    expect(process.exitCode).toBe(1);
    expect(vi.mocked(console.error).mock.calls.some((c) => String(c[0]).includes("report template not found"))).toBe(true);
  });
});
