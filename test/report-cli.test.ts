import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import {
  TEMPLATE_RELPATH,
  deterministicCompiledAt,
  discoverPrograms,
  programNameFromTitle,
  runReportCheck,
} from "../scripts/report.js";

const ROOT_DIR = process.cwd();

let dir: string | undefined;

afterEach(async () => {
  if (dir) await removeFixtureDir(dir);
  dir = undefined;
});

async function writeFile(root: string, relPath: string, content: string) {
  const full = join(root, relPath);
  await fs.mkdir(join(full, ".."), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

/** A minimal but complete program fixture: git history, PLAN.md with one epic, and the real v0 template. */
async function createProgramFixture(): Promise<string> {
  const root = await createFixtureDir("report-cli");
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.name", "Arcane Tests"]);
  runGit(root, ["config", "user.email", "arcane-tests@example.invalid"]);

  await writeFile(root, "package.json", JSON.stringify({ name: "fixture", version: "1.0.0" }, null, 2));
  runGit(root, ["add", "-A"]);
  runGit(root, ["commit", "-m", "chore: seed baseline"]);
  const baselineSha = runGit(root, ["rev-parse", "HEAD"]);

  await writeFile(
    root,
    "docs/plans/alpha/PLAN.md",
    [
      "---",
      "title: Alpha — A Test Program",
      "status: complete",
      "created: 2026-09-01",
      "completed: 2026-09-02",
      `baseline: ${baselineSha} (main)`,
      "---",
      "",
      "## Wave Plan",
      "",
      "### Wave 1 — Setup",
      "",
      "- [x] **AL-01 — Only epic.** Route: direct.",
      "  **Done:** [PR #1](https://github.com/codemagicianhq/arcane/pull/1).",
      "",
      "  **Report:** Shipped the only thing. · category: feature · glyph: ✨",
    ].join("\n"),
  );
  // A second plan whose epics live in a table -- must be skipped, not rendered empty.
  await writeFile(
    root,
    "docs/plans/tabular/PLAN.md",
    ["---", "title: Tabular — Table Epics", "status: active", "created: 2026-09-03", "---", "", "| ID | Epic |", "|---|---|", "| TB-00 | Something |"].join(
      "\n",
    ),
  );
  await fs.mkdir(join(root, "src", "assets", "report"), { recursive: true });
  await fs.copyFile(join(ROOT_DIR, TEMPLATE_RELPATH), join(root, TEMPLATE_RELPATH));
  runGit(root, ["add", "-A"]);
  runGit(root, ["commit", "-m", "docs: add alpha plan", "-m", "Agent: claude"]);
  return root;
}

describe("show-report CLI helpers", () => {
  it("programNameFromTitle takes the part before the em dash, matching verification-ledger headings", () => {
    expect(programNameFromTitle("Lessons Hardening — Mechanical Enforcement for X")).toBe("Lessons Hardening");
    expect(programNameFromTitle("No Dash Here")).toBe("No Dash Here");
  });

  it("deterministicCompiledAt prefers completed, then activated, then created -- never wall-clock", () => {
    expect(deterministicCompiledAt({ completed: "2026-09-02", activated: "2026-09-01", created: "2026-08-30" })).toBe(
      "2026-09-02",
    );
    expect(deterministicCompiledAt({ activated: "2026-09-01", created: "2026-08-30" })).toBe("2026-09-01");
    expect(deterministicCompiledAt({ created: "2026-08-30" })).toBe("2026-08-30");
  });
});

describe("show-report CLI: discoverPrograms", () => {
  it(
    "finds bullet-epic plans and skips (with a reason) a plan whose epics are in a table",
    async () => {
      dir = await createProgramFixture();
      const { programs, skipped } = await discoverPrograms(dir);
      expect(programs.map((p) => p.slug)).toEqual(["alpha"]);
      expect(programs[0]).toMatchObject({
        planRelPath: "docs/plans/alpha/PLAN.md",
        queueRelPath: "docs/plans/alpha/OPERATOR-QUEUE.md",
        ledgerProgramName: "Alpha",
      });
      expect(skipped).toEqual([{ slug: "tabular", reason: "no parseable `- [x] **ID — Title.**` epic bullets" }]);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it("returns nothing when docs/plans does not exist", async () => {
    dir = await createFixtureDir("report-cli-empty");
    expect(await discoverPrograms(dir)).toEqual({ programs: [], skipped: [] });
  });
});

describe("show-report CLI: runReportCheck --check/--fix", () => {
  it(
    "reports drift when the committed artifacts are missing, --fix writes them, and a second --check is clean",
    async () => {
      dir = await createProgramFixture();

      const first = await runReportCheck("check", dir);
      expect(first.drifted).toEqual([
        "docs/plans/alpha/show-report.json does not match a regeneration from its sources.",
        "docs/plans/alpha/show-report.html does not match a regeneration from its sources.",
      ]);
      expect(first.repaired).toEqual([]);

      const fixed = await runReportCheck("fix", dir);
      expect(fixed.repaired).toEqual(["docs/plans/alpha/show-report.json", "docs/plans/alpha/show-report.html"]);

      const second = await runReportCheck("check", dir);
      expect(second.drifted).toEqual([]);

      const json = JSON.parse(await fs.readFile(join(dir, "docs/plans/alpha/show-report.json"), "utf8")) as {
        colophon: { compiledAt: string; templateVersion: string };
      };
      expect(json.colophon.compiledAt).toBe("2026-09-02"); // plan's completed date, not wall-clock
      expect(json.colophon.templateVersion).toBe("v0-interim");
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "two --fix runs are byte-identical (the determinism the CI gate depends on)",
    async () => {
      dir = await createProgramFixture();
      await runReportCheck("fix", dir);
      const jsonA = await fs.readFile(join(dir, "docs/plans/alpha/show-report.json"), "utf8");
      const htmlA = await fs.readFile(join(dir, "docs/plans/alpha/show-report.html"), "utf8");
      await runReportCheck("fix", dir);
      const jsonB = await fs.readFile(join(dir, "docs/plans/alpha/show-report.json"), "utf8");
      const htmlB = await fs.readFile(join(dir, "docs/plans/alpha/show-report.html"), "utf8");
      expect(jsonB).toBe(jsonA);
      expect(htmlB).toBe(htmlA);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "detects a hand-edited artifact as drift",
    async () => {
      dir = await createProgramFixture();
      await runReportCheck("fix", dir);
      const htmlPath = join(dir, "docs/plans/alpha/show-report.html");
      await fs.writeFile(htmlPath, `${await fs.readFile(htmlPath, "utf8")}<!-- hand edit -->\n`, "utf8");
      const result = await runReportCheck("check", dir);
      expect(result.drifted).toEqual([
        "docs/plans/alpha/show-report.html does not match a regeneration from its sources.",
      ]);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "--program <slug> for an unknown slug fails loudly and names what was skipped",
    async () => {
      dir = await createProgramFixture();
      await expect(runReportCheck("check", dir, "nope")).rejects.toThrow(/No program "nope".*tabular/);
    },
    HEAVY_TEST_TIMEOUT,
  );
});

describe("show-report golden: this repository's own committed reports", () => {
  it(
    "ARC-012-style parity: every committed docs/plans/*/show-report.{json,html} matches a regeneration from its sources",
    async () => {
      const result = await runReportCheck("check", ROOT_DIR);
      expect(result.drifted).toEqual([]);
      // The two closed programs must be present; this program's own table-form plan is skipped by design.
      expect(result.skipped.map((s) => s.slug)).toContain("show-report");
    },
    HEAVY_TEST_TIMEOUT,
  );
});
