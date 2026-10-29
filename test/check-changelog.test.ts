import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  RELEASE_HEADING,
  SECTION_HEADINGS,
  checkChangelog,
  releaseHeadingFor,
} from "../scripts/check-changelog.js";

/**
 * The changelog gate: a version bump without a CHANGELOG.md entry used to
 * reach npm silently, because release-drift.yml cut the Release on the
 * merge and nothing read the changelog. ci.yml now runs this check, and
 * release-drift.yml greps for the same heading before creating a Release.
 */

const ROOT_DIR = process.cwd();

const good = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "### Changed",
  "",
  "- Something merged before the next bump.",
  "",
  "## [1.2.3] - 2026-10-29",
  "",
  "### Added",
  "",
  "- A thing.",
  "",
  "```",
  "## not a heading, inside a fence",
  "### nor this",
  "```",
  "",
  "### Notes",
  "",
  "- A note.",
  "",
  "## [1.2.2] - 2026-10-01",
  "",
  "### Fixed",
  "",
  "- A fix.",
  "",
].join("\n");

describe("checkChangelog", () => {
  it("passes a changelog that has the version's heading and only standard sections", () => {
    expect(checkChangelog(good, "1.2.3")).toEqual([]);
    expect(checkChangelog(good, "1.2.2")).toEqual([]);
  });

  it("fails when the version has no entry, naming the exact heading to add", () => {
    const problems = checkChangelog(good, "1.3.0");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("no entry for package.json's version 1.3.0");
    expect(problems[0]).toContain('"## [1.3.0] - YYYY-MM-DD"');
  });

  it("fails a release heading without a date, with a date in the wrong form, or with a prerelease tag", () => {
    for (const heading of ["## [1.2.3]", "## [1.2.3] - 2026-1-9", "## [1.2.3-rc.1] - 2026-10-29", "## 1.2.3 - 2026-10-29"]) {
      const problems = checkChangelog(good.replace("## [1.2.3] - 2026-10-29", heading), "1.2.3");
      expect(problems.some((p) => p.includes(`release heading "${heading}"`)), heading).toBe(true);
      expect(problems.some((p) => p.includes("no entry for package.json's version 1.2.3")), heading).toBe(true);
    }
  });

  it("fails a section heading outside Added, Changed, Fixed, Removed, Notes", () => {
    for (const heading of ["### Migration", "### Documentation", "### What this deliberately does not claim", "### Security"]) {
      const problems = checkChangelog(good.replace("### Notes", heading), "1.2.3");
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(`section heading "${heading}"`);
      expect(problems[0]).toContain("CHANGELOG.md:20");
    }
  });

  it("accepts the Unreleased heading and headings inside a code fence, and CRLF line endings", () => {
    expect(checkChangelog(good.replace(/\n/g, "\r\n"), "1.2.3")).toEqual([]);
    expect(checkChangelog(good.replace("## [Unreleased]", "## [Unreleased] - 2026-10-29"), "1.2.3")).toHaveLength(1);
  });

  it("releaseHeadingFor builds a heading RELEASE_HEADING accepts", () => {
    const heading = releaseHeadingFor("1.13.0", "2026-10-29");
    expect(heading).toBe("## [1.13.0] - 2026-10-29");
    expect(RELEASE_HEADING.test(heading)).toBe(true);
    expect(SECTION_HEADINGS).toEqual(["Added", "Changed", "Fixed", "Removed", "Notes"]);
  });

  it("the committed CHANGELOG.md passes for the committed package.json version", async () => {
    const changelog = await readFile(join(ROOT_DIR, "CHANGELOG.md"), "utf8");
    const { version } = JSON.parse(await readFile(join(ROOT_DIR, "package.json"), "utf8")) as { version: string };
    expect(checkChangelog(changelog, version)).toEqual([]);
  });

  it("release-drift.yml greps for the same heading shape this check requires", async () => {
    const workflow = await readFile(join(ROOT_DIR, ".github", "workflows", "release-drift.yml"), "utf8");
    // The workflow's pattern, with the version substituted, must match what
    // releaseHeadingFor produces and reject a heading without a date.
    const match = /grep -qE "(\^## \\\[.*?)" CHANGELOG\.md/.exec(workflow);
    expect(match, "release-drift.yml carries the changelog grep").not.toBeNull();
    // Bash expands `${PKG_VERSION//./\\.}` to the version with each dot escaped.
    const pattern = new RegExp(match![1].replace("${PKG_VERSION//./\\\\.}", "1\\.13\\.0"));
    expect(pattern.test(releaseHeadingFor("1.13.0", "2026-10-29"))).toBe(true);
    expect(pattern.test("## [1.13.0]")).toBe(false);
    expect(pattern.test("## [1.13.01] - 2026-10-29")).toBe(false);
  });
});
