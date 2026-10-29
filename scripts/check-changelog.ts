#!/usr/bin/env tsx
/**
 * scripts/check-changelog.ts
 *
 * CI gate: fails when CHANGELOG.md has no entry for package.json's version,
 * or when the file strays from its own format.
 *
 * release-drift.yml cuts a GitHub Release and starts the npm publish the
 * moment a merge puts package.json ahead of npm. Nothing checked that the
 * release had a changelog entry, so a bump merged without one shipped
 * silently. This gate runs in ci.yml, so the pull request that bumps the
 * version fails before it merges; release-drift.yml runs the same
 * entry-heading match (as a grep, with no install) right before it creates
 * the Release, so a bump that reached main some other way is refused there.
 *
 * Rules (Keep a Changelog, as this file applies it):
 *   1. Every `## [...]` heading is `## [x.y.z] - YYYY-MM-DD`, or
 *      `## [Unreleased]` for changes merged before the next bump.
 *   2. package.json's version has such a heading.
 *   3. Every `### ` heading under a release is one of the standard set:
 *      Added, Changed, Fixed, Removed, Notes.
 *
 * Exits 0 (pass) or 1 (fail).
 */

import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** The one heading shape a released version may have. Shared with release-drift.yml, which greps for the same thing. */
export const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/;
export const UNRELEASED_HEADING = "## [Unreleased]";
export const SECTION_HEADINGS = ["Added", "Changed", "Fixed", "Removed", "Notes"] as const;

/** Builds the exact heading line a version needs. */
export function releaseHeadingFor(version: string, date: string): string {
  return `## [${version}] - ${date}`;
}

/**
 * Returns every problem found, in file order; an empty list means the
 * changelog passes for `version`.
 */
export function checkChangelog(changelog: string, version: string): string[] {
  const problems: string[] = [];
  const lines = changelog.replace(/\r\n?/g, "\n").split("\n");
  let found = false;
  let inFence = false;
  for (const [index, line] of lines.entries()) {
    const where = `CHANGELOG.md:${index + 1}`;
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    if (line.startsWith("## ")) {
      if (line === UNRELEASED_HEADING) continue;
      const match = RELEASE_HEADING.exec(line);
      if (!match) {
        problems.push(
          `${where}: release heading "${line}" is not "## [x.y.z] - YYYY-MM-DD" (or "${UNRELEASED_HEADING}").`,
        );
        continue;
      }
      if (match[1] === version) found = true;
    } else if (line.startsWith("### ")) {
      const title = line.slice(4).trim();
      if (!(SECTION_HEADINGS as readonly string[]).includes(title)) {
        problems.push(
          `${where}: section heading "${line}" is not one of ${SECTION_HEADINGS.map((h) => `"### ${h}"`).join(", ")}.`,
        );
      }
    }
  }
  if (!found) {
    problems.push(
      `CHANGELOG.md has no entry for package.json's version ${version}: add "${releaseHeadingFor(version, "YYYY-MM-DD")}" with the release's date before merging the bump.`,
    );
  }
  return problems;
}

function main(): void {
  const version = (JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string }).version;
  const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
  const problems = checkChangelog(changelog, version);
  if (problems.length > 0) {
    console.error(`Changelog check FAILED for version ${version}:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Changelog check passed: CHANGELOG.md has an entry for ${version} and every heading is in the standard form.`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main();
}
