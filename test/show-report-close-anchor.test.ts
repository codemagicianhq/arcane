import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { TEMPLATE_RELPATH, runReportCheck } from "../scripts/report.js";
import { getCloseCommit } from "../src/modules/show-report/sources.js";

const ROOT_DIR = process.cwd();
const OUTPUTS = ["docs/plans/alpha/show-report.json", "docs/plans/alpha/show-report.html"];

const dirs: string[] = [];
afterEach(async () => {
  for (const d of dirs.splice(0)) await removeFixtureDir(d);
});

async function newRepo(prefix: string): Promise<string> {
  const root = await createFixtureDir(prefix);
  dirs.push(root);
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.name", "Arcane Tests"]);
  runGit(root, ["config", "user.email", "arcane-tests@example.invalid"]);
  return root;
}

async function write(root: string, relPath: string, content: string) {
  const full = join(root, relPath);
  await fs.mkdir(join(full, ".."), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

function commit(root: string, subject: string, authored: string, committed: string, trailer = false) {
  runGit(root, ["add", "-A"]);
  runGit(root, ["commit", "-m", subject, ...(trailer ? ["-m", "Agent: claude"] : [])], {
    authorDate: `${authored}T12:00:00`,
    committerDate: `${committed}T12:00:00`,
  });
}

const subjectOf = (root: string, sha: string | null) => (sha ? runGit(root, ["log", "-1", "--format=%s", sha]) : null);

describe("show-report close anchor (R-CLOSE)", () => {
  it(
    "a trailered regeneration committed on the completed: day does not count itself, so check:report stays clean",
    async () => {
      const dir = await newRepo("close-anchor-check");
      await write(dir, "package.json", JSON.stringify({ name: "fixture", version: "1.0.0" }));
      commit(dir, "chore: seed baseline", "2026-09-01", "2026-09-01");
      const baseline = runGit(dir, ["rev-parse", "HEAD"]);
      await write(
        dir,
        "docs/plans/alpha/PLAN.md",
        [
          "---",
          "title: Alpha — A Test Program",
          "status: complete",
          "completed: 2026-09-02",
          "created: 2026-09-01",
          `baseline: ${baseline} (main)`,
          "---",
          "",
          "## Wave Plan",
          "",
          "### Wave 1 — Setup",
          "",
          "- [x] **AL-01 — Only epic.** Route: direct.",
          "  **Done:** [PR #1](https://github.com/codemagicianhq/arcane/pull/1).",
          "",
          "  **Report:** Shipped the only thing. · category: feature",
        ].join("\n"),
      );
      await fs.mkdir(join(dir, "src", "assets", "report"), { recursive: true });
      await fs.copyFile(join(ROOT_DIR, TEMPLATE_RELPATH), join(dir, TEMPLATE_RELPATH));
      commit(dir, "docs: add alpha plan", "2026-09-02", "2026-09-02", true);

      await runReportCheck("fix", dir);
      commit(dir, "docs: regenerate report", "2026-09-02", "2026-09-02", true);

      expect((await runReportCheck("check", dir)).drifted).toEqual([]);
      const json = JSON.parse(await fs.readFile(join(dir, OUTPUTS[0] as string), "utf8")) as {
        cast: { name: string; commits: number }[];
      };
      // One content commit carried the trailer; the regeneration is not the cast's second.
      expect(json.cast).toEqual([{ name: "claude", commits: 1, source: "commit-trailer" }]);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "getCloseCommit skips a report-only commit on the completed: day",
    async () => {
      const dir = await newRepo("close-anchor-exclude");
      await write(dir, "a.txt", "1\n");
      commit(dir, "feat: real work", "2026-09-02", "2026-09-02");
      await write(dir, OUTPUTS[0] as string, "{}\n");
      commit(dir, "docs: regenerate report", "2026-09-02", "2026-09-02");

      expect(subjectOf(dir, await getCloseCommit(dir, "2026-09-02", OUTPUTS))).toBe("feat: real work");
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "anchors on the landing (committer) date: a commit authored on the completed: day but landed after it is outside",
    async () => {
      const dir = await newRepo("close-anchor-landing");
      await write(dir, "a.txt", "1\n");
      commit(dir, "feat: landed inside", "2026-09-02", "2026-09-02");
      await write(dir, "b.txt", "2\n");
      // Authored on the completed: day, rebased and landed the next day (upstream-intake-2026-09's 538a865).
      commit(dir, "feat: authored inside, landed after", "2026-09-02", "2026-09-03");

      expect(subjectOf(dir, await getCloseCommit(dir, "2026-09-02", OUTPUTS))).toBe("feat: landed inside");
    },
    HEAVY_TEST_TIMEOUT,
  );
});
