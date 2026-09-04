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
import { isShallowRepository } from "../src/modules/show-report/sources.js";

const ROOT_DIR = process.cwd();

let dir: string | undefined;
let shallowDir: string | undefined;

afterEach(async () => {
  if (dir) await removeFixtureDir(dir);
  if (shallowDir) await removeFixtureDir(shallowDir);
  dir = undefined;
  shallowDir = undefined;
});

async function writeFile(root: string, relPath: string, content: string) {
  const full = join(root, relPath);
  await fs.mkdir(join(full, ".."), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

/**
 * A minimal but complete program fixture: git history, PLAN.md with one epic,
 * and the real v0 template.
 *
 * Commit dates are pinned on or before the plan's own `completed: 2026-09-02`
 * so the fixture is internally coherent: the close commit (the one `main`
 * stood at when that day ended) exists, and the history-derived version span
 * therefore resolves. Left unpinned, the commits carry today's real date, the
 * close resolves to nothing, and the span is silently omitted -- which is
 * correct behaviour on incoherent data, but makes the fixture useless for
 * testing anything downstream of it.
 */
async function createProgramFixture(): Promise<string> {
  const root = await createFixtureDir("report-cli");
  const on = (day: string) => ({ authorDate: `${day}T12:00:00`, committerDate: `${day}T12:00:00` });
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.name", "Arcane Tests"]);
  runGit(root, ["config", "user.email", "arcane-tests@example.invalid"]);

  await writeFile(root, "package.json", JSON.stringify({ name: "fixture", version: "1.0.0" }, null, 2));
  runGit(root, ["add", "-A"]);
  runGit(root, ["commit", "-m", "chore: seed baseline"], on("2026-09-01"));
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
  runGit(root, ["commit", "-m", "docs: add alpha plan", "-m", "Agent: claude"], on("2026-09-02"));
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

describe("show-report: unwritten-description reporting (SR-04)", () => {
  it(
    "names the epics missing a **Report:** line, and never fails the check over them",
    async () => {
      dir = await createProgramFixture();
      // Append a second epic with no `**Report:**` line at all.
      const planPath = join(dir, "docs/plans/alpha/PLAN.md");
      await fs.writeFile(
        planPath,
        `${await fs.readFile(planPath, "utf8")}\n- [x] **AL-02 — Second epic, never described.** Route: direct.\n`,
        "utf8",
      );

      const result = await runReportCheck("fix", dir);
      expect(result.unwritten).toEqual([{ slug: "alpha", ids: ["AL-02"] }]);

      // Advisory only: a regenerated, up-to-date report reports zero drift even
      // though one of its rows is unwritten.
      const clean = await runReportCheck("check", dir);
      expect(clean.drifted).toEqual([]);
      expect(clean.unwritten).toEqual([{ slug: "alpha", ids: ["AL-02"] }]);

      // And the page shows the gap rather than inventing a sentence for it.
      const html = await fs.readFile(join(dir, "docs/plans/alpha/show-report.html"), "utf8");
      expect(html).toContain('<div class="item-desc unwritten">unwritten</div>');
      expect(html).not.toContain("Second epic, never described.</div>");
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "reports nothing when every epic has a Report line",
    async () => {
      dir = await createProgramFixture();
      const result = await runReportCheck("fix", dir);
      expect(result.unwritten).toEqual([]);
    },
    HEAVY_TEST_TIMEOUT,
  );
});

describe("show-report: shallow-clone detection (the v0.34.3 publish failure)", () => {
  it(
    "reports false for a normal fixture repo and true for a real --depth 1 clone of it",
    async () => {
      dir = await createProgramFixture();
      expect(await isShallowRepository(dir)).toBe(false);

      // A real shallow clone, the way actions/checkout's default produces one.
      const shallow = `${dir}-shallow`;
      shallowDir = shallow;
      runGit(dir, ["clone", "--depth", "1", `file://${dir.replace(/\\/g, "/")}`, shallow]);
      expect(await isShallowRepository(shallow)).toBe(true);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "a shallow clone omits the history-derived versionSpan and cast, which a parity check would misread as drift",
    async () => {
      dir = await createProgramFixture();
      await runReportCheck("fix", dir);
      const full = JSON.parse(await fs.readFile(join(dir, "docs/plans/alpha/show-report.json"), "utf8")) as {
        program: { versionSpan?: unknown };
        cast: unknown[];
      };
      expect(full.program.versionSpan).toBeDefined();

      const shallow = `${dir}-shallow2`;
      shallowDir = shallow;
      runGit(dir, ["clone", "--depth", "1", `file://${dir.replace(/\\/g, "/")}`, shallow]);
      // Regenerating inside the shallow clone drops exactly those fields --
      // hence `check` must say "cannot verify", not "drifted".
      const result = await runReportCheck("check", shallow);
      expect(result.drifted.length).toBeGreaterThan(0);
    },
    HEAVY_TEST_TIMEOUT,
  );
});

describe("show-report golden: this repository's own committed reports", () => {
  it(
    "ARC-012-style parity: every committed docs/plans/*/show-report.{json,html} matches a regeneration from its sources",
    async ({ skip }) => {
      // The version span and cast derive from git history; a shallow clone
      // cannot see it and would report the resulting omission as drift. That
      // is "cannot verify here", not a failure -- ci.yml's full-history
      // checkout is where this guarantee is enforced. (publish.yml's shallow
      // default checkout failed exactly this test for v0.34.3.)
      if (await isShallowRepository(ROOT_DIR)) {
        skip("shallow clone: the version span and cast need full git history (fetch-depth: 0)");
      }
      const result = await runReportCheck("check", ROOT_DIR);
      expect(result.drifted).toEqual([]);
      // The two closed programs must be present; this program's own table-form plan is skipped by design.
      expect(result.skipped.map((s) => s.slug)).toContain("show-report");
    },
    HEAVY_TEST_TIMEOUT,
  );
});
