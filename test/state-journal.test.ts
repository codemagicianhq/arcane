import { describe, it, expect, afterEach } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { collectJournal, journalTitle } from "../src/modules/state/journal.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { REPO_ROOT } from "./helpers/state-schema.js";

const fixtures: string[] = [];
afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

describe("journalTitle", () => {
  it("prefers the frontmatter title, quotes stripped, over the first heading", () => {
    expect(journalTitle('---\ntitle: "Survey kickoff"\n---\n\n# Other\n')).toBe("Survey kickoff");
    expect(journalTitle("---\ntitle: 'Single'\n---\n")).toBe("Single");
    expect(journalTitle("---\r\ntitle: Crlf\r\n---\r\n")).toBe("Crlf");
  });

  it("falls back to the first # heading, and to null", () => {
    expect(journalTitle("# 2026-11-03 — Done book\n\nbody\n")).toBe("2026-11-03 — Done book");
    expect(journalTitle("## only a second-level heading\n")).toBeNull();
    expect(journalTitle("")).toBeNull();
  });
});

describe("collectJournal (ST-05, D7)", () => {
  it("indexes three dated files sorted by date then slug, with titles, and skips a mis-named file with one warning", async () => {
    const dir = await createFixtureDir("state-journal");
    fixtures.push(dir);
    await mkdir(join(dir, "journal"));
    await writeFile(join(dir, "journal", "2026-11-03-survey-kickoff.md"), "# Survey kickoff\n", "utf8");
    await writeFile(join(dir, "journal", "2026-11-01-zeta.md"), '---\ntitle: "Zeta"\n---\n', "utf8");
    await writeFile(join(dir, "journal", "2026-11-03-alpha.md"), "no heading here\n", "utf8");
    await writeFile(join(dir, "journal", "notes.md"), "# Not dated\n", "utf8");
    await writeFile(join(dir, "journal", ".gitkeep"), "", "utf8");
    await mkdir(join(dir, "journal", "drafts"));
    const { journal, warnings } = await collectJournal(dir);
    expect(journal).toEqual([
      { date: "2026-11-01", slug: "zeta", title: "Zeta", path: "journal/2026-11-01-zeta.md" },
      { date: "2026-11-03", slug: "alpha", title: null, path: "journal/2026-11-03-alpha.md" },
      { date: "2026-11-03", slug: "survey-kickoff", title: "Survey kickoff", path: "journal/2026-11-03-survey-kickoff.md" },
    ]);
    expect(warnings).toEqual([
      "indexes.journal: journal/2026-11-03-alpha.md has no title: frontmatter or # heading",
      "indexes.journal: journal/notes.md does not match YYYY-MM-DD-<slug>.md and was skipped",
    ]);
  });

  it("yields null when journal/ is absent", async () => {
    const dir = await createFixtureDir("state-journal-absent");
    fixtures.push(dir);
    expect(await collectJournal(dir)).toEqual({ journal: null, warnings: [] });
  });

  it("indexes this repository's journal with a title for every entry", async () => {
    const { journal, warnings } = await collectJournal(REPO_ROOT);
    expect(warnings).toEqual([]);
    expect(journal!.length).toBeGreaterThan(0);
    expect(journal!.every((e) => e.title !== null && e.path.startsWith("journal/"))).toBe(true);
  });
});
