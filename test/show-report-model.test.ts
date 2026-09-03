import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { buildShowReportModel } from "../src/modules/show-report/model.js";

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

async function writePackageVersion(root: string, version: string) {
  await writeFile(root, "package.json", JSON.stringify({ name: "fixture", version }, null, 2));
}

const PLAN_RELPATH = "docs/plans/test-program/PLAN.md";
const QUEUE_RELPATH = "docs/plans/test-program/OPERATOR-QUEUE.md";

describe("show-report model: buildShowReportModel (end to end against a real git fixture)", () => {
  it("assembles a full ShowReport from PLAN.md, OPERATOR-QUEUE.md, the verification ledger, and git history", async () => {
    dir = await createFixtureDir("show-report-model");
    runGit(dir, ["init", "-b", "main"]);
    runGit(dir, ["config", "user.name", "Arcane Tests"]);
    runGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);

    // Baseline commit: no PLAN.md yet, package.json at 1.0.0.
    await writePackageVersion(dir, "1.0.0");
    runGit(dir, ["add", "-A"]);
    runGit(dir, ["commit", "-m", "chore: seed baseline"]);
    const baselineSha = runGit(dir, ["rev-parse", "HEAD"]);

    // Program artifacts, authored against that baseline.
    await writeFile(
      dir,
      PLAN_RELPATH,
      [
        "---",
        "title: Test Program",
        "status: complete",
        "created: 2026-09-01",
        `baseline: ${baselineSha} (main)`,
        "---",
        "",
        "## Wave Plan",
        "",
        "### Wave 1 — Setup",
        "",
        "- [x] **TP-01 — First epic.** Route: direct.",
        "  **Done:** [PR #10](https://github.com/codemagicianhq/arcane/pull/10), merged 2026-09-01.",
        "",
        "  **Report:** Shipped the first thing. · category: feature · glyph: ✨",
        "",
        "- [x] **TP-02 — Second epic, no report yet.** Route: direct.",
        "  **Done:** merged without a report line.",
        "",
        "## Parked — Needs Operator",
        "",
        "- **Some parked item** — waiting on operator input.",
        "",
        "## Coverage Map (every id → disposition)",
        "",
        "| ID | Item | → |",
        "|---|---|---|",
        "| X1 | Thing one | TP-01 |",
        "| X2 | Thing two | **Park** |",
      ].join("\n"),
    );
    await writeFile(
      dir,
      QUEUE_RELPATH,
      [
        "# Operator Queue — Test Program",
        "",
        "## Q-001 — Still open",
        "",
        "- **What:** Decide something.",
        "- **Why:** Needs a human call.",
        "- **Status:** [ ] open",
        "",
        "## Q-002 — Already resolved",
        "",
        "- **What:** Decide something else.",
        "- **Why:** Already handled.",
        "- **Status:** [x] done 2026-09-02 — resolved.",
      ].join("\n"),
    );
    await writeFile(
      dir,
      "docs/verification-ledger.md",
      [
        "# Verification Ledger",
        "",
        "## 2026-09-02 — Test Program corrections",
        "",
        "| Claim | Verification method | Result | Correction |",
        "| --- | --- | --- | --- |",
        "| Something was true | checked directly | corrected | it was not, actually. |",
        "| Something else was true | checked directly | confirmed | — |",
      ].join("\n"),
    );
    await writeFile(
      dir,
      "DECISIONS.md",
      [
        "## ARC-001 — Inside the window, accepted",
        "",
        "**Date:** 2026-09-01",
        "**Status:** Accepted",
        "",
        "## ARC-002 — Before the window, accepted",
        "",
        "**Date:** 2026-01-01",
        "**Status:** Accepted",
      ].join("\n"),
    );
    await writePackageVersion(dir, "1.1.0");
    runGit(dir, ["add", "-A"]);
    runGit(dir, [
      "commit",
      "-m",
      "docs: add test program plan",
      "-m",
      "Agent: claude",
      "-m",
      "Persona: TestPersona",
    ]);

    const model = await buildShowReportModel({
      rootDir: dir,
      slug: "test-program",
      planRelPath: PLAN_RELPATH,
      queueRelPath: QUEUE_RELPATH,
      ledgerProgramName: "Test Program",
      compiledAt: "2026-09-03T00:00:00Z",
      templateVersion: "0.0.0-test",
    });

    expect(model.schemaVersion).toBe(1);
    expect(model.program).toMatchObject({
      id: "test-program",
      title: "Test Program",
      status: "complete",
      versionSpan: { from: "1.0.0", to: "1.1.0" },
    });

    expect(model.sections).toHaveLength(1);
    expect(model.sections[0]!.title).toBe("Wave 1 — Setup");
    expect(model.sections[0]!.rows).toHaveLength(2);
    expect(model.sections[0]!.rows[0]).toMatchObject({
      id: "TP-01",
      title: "First epic",
      description: "Shipped the first thing.",
      descriptionState: "authored",
      category: "feature",
      glyph: "✨",
      href: "https://github.com/codemagicianhq/arcane/pull/10",
    });
    expect(model.sections[0]!.rows[1]).toMatchObject({
      id: "TP-02",
      description: null,
      descriptionState: "unwritten",
    });

    expect(model.needsYou).toEqual([{ id: "Q-001", title: "Still open", reason: "Needs a human call." }]);

    expect(model.parked).toEqual([{ title: "Some parked item", reason: "waiting on operator input." }]);
    expect(model.outcome).toBe("2 of 2 items dispositioned — 1 routed to an epic, 1 parked");

    expect(model.corrections).toMatchObject({ checked: 2, corrected: 1, unverifiable: 0 });
    expect(model.corrections!.highlights).toHaveLength(1);
    expect(model.corrections!.highlights[0]!.description).toBe("it was not, actually.");

    expect(model.cast).toEqual([{ name: "TestPersona", commits: 1, source: "commit-trailer" }]);

    const epicsStat = model.stats.find((s) => s.id === "epics");
    expect(epicsStat).toMatchObject({ value: "2/2", label: "epics shipped" });

    // Window is [created, compiledAt's date] since this fixture has no `completed:` field:
    // [2026-09-01, 2026-09-03]. ARC-001 falls inside it; ARC-002 (2026-01-01) does not.
    const adrsStat = model.stats.find((s) => s.id === "adrs");
    expect(adrsStat).toMatchObject({ value: 1, label: "ADRs accepted" });

    expect(model.colophon).toMatchObject({
      sources: [PLAN_RELPATH, QUEUE_RELPATH, "docs/verification-ledger.md"],
      compiledAt: "2026-09-03T00:00:00Z",
      templateVersion: "0.0.0-test",
    });
  });

  it("omits versionSpan and cast gracefully when the plan has no derivable baseline", async () => {
    dir = await createFixtureDir("show-report-model-no-baseline");
    runGit(dir, ["init", "-b", "main"]);
    runGit(dir, ["config", "user.name", "Arcane Tests"]);
    runGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);

    await writePackageVersion(dir, "1.0.0");
    await writeFile(
      dir,
      PLAN_RELPATH,
      [
        "---",
        "title: No Baseline Program",
        "status: draft",
        "created: 2026-09-01",
        "---",
        "",
        "## Wave Plan",
        "",
        "- [ ] **NB-01 — Only epic.** Not started yet.",
      ].join("\n"),
    );
    runGit(dir, ["add", "-A"]);
    runGit(dir, ["commit", "-m", "chore: seed"]);

    const model = await buildShowReportModel({
      rootDir: dir,
      slug: "no-baseline",
      planRelPath: PLAN_RELPATH,
      queueRelPath: QUEUE_RELPATH,
      ledgerProgramName: "No Baseline Program",
      compiledAt: "2026-09-03T00:00:00Z",
      templateVersion: "0.0.0-test",
    });

    expect(model.program.versionSpan).toBeUndefined();
    expect(model.cast).toEqual([]);
    expect(model.needsYou).toEqual([]); // no OPERATOR-QUEUE.md file at all
    expect(model.corrections).toBeUndefined(); // no verification-ledger.md file at all
  });

  it(
    "the close is the commit main stood at when the completed day ended -- any path, by landing date -- so neither a later bump-only commit nor a later edit to the finished plan is misattributed",
    async () => {
      dir = await createFixtureDir("show-report-model-close-bound");
      runGit(dir, ["init", "-b", "main"]);
      runGit(dir, ["config", "user.name", "Arcane Tests"]);
      runGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
      const on = (day: string) => ({ authorDate: `${day}T12:00:00`, committerDate: `${day}T12:00:00` });

      await writePackageVersion(dir, "1.0.0");
      runGit(dir, ["add", "-A"]);
      runGit(dir, ["commit", "-m", "chore: seed baseline"], on("2026-08-30"));
      const baselineSha = runGit(dir, ["rev-parse", "HEAD"]);

      const planWith = (completedLine: string) =>
        [
          "---",
          "title: Bounded Program",
          "status: complete",
          "created: 2026-08-30",
          completedLine,
          `baseline: ${baselineSha} (main)`,
          "---",
          "",
          "## Wave Plan",
          "",
          "- [x] **BP-01 — Only epic.** Done.",
        ]
          .filter((line) => line !== "")
          .join("\n");

      // 09-01: the plan's last epic ticks with the version at 1.0.5.
      await writeFile(dir, PLAN_RELPATH, planWith("completed: 2026-09-02"));
      await writePackageVersion(dir, "1.0.5");
      runGit(dir, ["add", "-A"]);
      runGit(dir, ["commit", "-m", "docs: close the program"], on("2026-09-01"));

      // 09-02 (still inside the completed day): a bump lands WITHOUT touching
      // the plan -- the Become Current shape, where two bumps followed the
      // last PLAN.md commit the same day and the real close is the higher one.
      await writePackageVersion(dir, "1.0.6");
      runGit(dir, ["add", "-A"]);
      runGit(dir, ["commit", "-m", "chore(release): bump version to 1.0.6"], on("2026-09-02"));

      // 09-03: a later epic edits the finished plan (a backfill) after a bump to 1.1.0.
      await writeFile(
        dir,
        PLAN_RELPATH,
        `${planWith("completed: 2026-09-02")}\n  **Report:** Backfilled. · category: docs · glyph: 📝`,
      );
      await writePackageVersion(dir, "1.1.0");
      runGit(dir, ["add", "-A"]);
      runGit(dir, ["commit", "-m", "docs: backfill a report line"], on("2026-09-03"));

      const bounded = await buildShowReportModel({
        rootDir: dir,
        slug: "bounded",
        planRelPath: PLAN_RELPATH,
        queueRelPath: QUEUE_RELPATH,
        ledgerProgramName: "Bounded Program",
        compiledAt: "2026-09-03T00:00:00Z",
        templateVersion: "0.0.0-test",
      });
      expect(bounded.program.versionSpan).toEqual({ from: "1.0.0", to: "1.0.6" });

      // Without a completed date (an in-progress program) the close is HEAD: "as of now".
      await writeFile(dir, PLAN_RELPATH, planWith(""));
      const unbounded = await buildShowReportModel({
        rootDir: dir,
        slug: "bounded",
        planRelPath: PLAN_RELPATH,
        queueRelPath: QUEUE_RELPATH,
        ledgerProgramName: "Bounded Program",
        compiledAt: "2026-09-03T00:00:00Z",
        templateVersion: "0.0.0-test",
      });
      expect(unbounded.program.versionSpan).toEqual({ from: "1.0.0", to: "1.1.0" });
    },
    HEAVY_TEST_TIMEOUT,
  );

  it("falls back to 'unknown' for status/baseline/started when frontmatter omits them entirely", async () => {
    dir = await createFixtureDir("show-report-model-bare-frontmatter");
    runGit(dir, ["init", "-b", "main"]);
    runGit(dir, ["config", "user.name", "Arcane Tests"]);
    runGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);

    await writeFile(dir, PLAN_RELPATH, ["## Wave Plan", "", "- [ ] **BF-01 — Only epic.** No frontmatter at all."].join("\n"));
    runGit(dir, ["add", "-A"]);
    runGit(dir, ["commit", "-m", "chore: seed"]);

    const model = await buildShowReportModel({
      rootDir: dir,
      slug: "bare-frontmatter",
      planRelPath: PLAN_RELPATH,
      queueRelPath: QUEUE_RELPATH,
      ledgerProgramName: "Bare Frontmatter Program",
      compiledAt: "2026-09-03T00:00:00Z",
      templateVersion: "0.0.0-test",
    });

    expect(model.program).toMatchObject({ title: "bare-frontmatter", status: "unknown", baseline: "unknown", started: "unknown" });
    expect(model.masthead.dek).toBe("unknown — 0 of 1 epics shipped");
  });
});
