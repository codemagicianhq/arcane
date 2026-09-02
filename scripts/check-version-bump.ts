#!/usr/bin/env tsx
/**
 * scripts/check-version-bump.ts
 *
 * CI gate: fails if distributable content changed without a version bump.
 *
 * Rule (from project.md's Constraints section): "Version bump required for any
 * change to src/assets/ or any change to registry.ts / profiles.ts that affects
 * what gets distributed." (Re-pointed 2026-08-31 -- root CLAUDE.md now carries
 * only the 13-line working protocol; the rule's live prose home moved to
 * project.md:56-58.)
 *
 * How it works (default / CI mode):
 *   1. Diffs HEAD against the merge-base with origin/main (i.e. the PR diff).
 *   2. If any DISTRIBUTABLE_PATHS file changed → version must differ from main.
 *   3. If no distributable paths changed → passes unconditionally.
 *
 * --staged / --working-tree modes (LH-06a): run this gate BEFORE committing
 * (spell-bump Step 1, spell-commit-work Step 2), when the merge-base..HEAD
 * diff can't see today's not-yet-committed work at all -- the exact false
 * "no bump required" pass this mode exists to close. --staged unions the
 * merge-base diff with `git diff --cached --name-only` (staged files);
 * --working-tree additionally unions `git diff --name-only` (unstaged
 * modified files too). Both work with no network/origin access at all --
 * staged/working-tree diffs are purely local -- so unlike CI mode, a missing
 * origin/main here degrades to a loud warning plus checking whatever local
 * diffs ARE available, not a full skip.
 *
 * Exits 0 (pass) or 1 (fail).
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Paths that count as "distributable" ─────────────────────────────────────
// Changes to any of these require a version bump.
const DISTRIBUTABLE_PATTERNS: RegExp[] = [
  /^src\/assets\//,
  /^src\/modules\/registry\.ts$/,
  /^src\/config\/profiles\.ts$/,
];

export type CheckMode = "default" | "staged" | "working-tree";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function run(cmd: string): string {
  try {
    // stderr piped, not inherited: this helper swallows failures by design
    // (callers treat "" as "couldn't read"), so letting git's own `fatal:`
    // lines reach the console would report a handled miss as a CI error.
    return execSync(cmd, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function getVersion(ref: string): string {
  try {
    const raw = run(`git show ${ref}:package.json`);
    return (JSON.parse(raw) as { version: string }).version;
  } catch {
    return "";
  }
}

function splitFiles(output: string): string[] {
  return output ? output.split("\n").filter(Boolean) : [];
}

/**
 * Returns the changed-file set for `mode`, and whether the merge-base half
 * of that set could actually be determined (false only matters for the
 * default mode's exit-early path; staged/working-tree modes proceed with a
 * warning instead of exiting, since they have local diffs to fall back on).
 */
export function getChangedFiles(mode: CheckMode): { files: string[]; mergeBaseFound: boolean } {
  const mergeBase = run("git merge-base HEAD origin/main");
  const files = new Set<string>();
  let mergeBaseFound = false;

  if (mergeBase) {
    mergeBaseFound = true;
    for (const f of splitFiles(run(`git diff --name-only ${mergeBase} HEAD`))) files.add(f);
  } else if (mode === "default") {
    console.warn("⚠  Could not determine merge base — skipping version check.");
    process.exit(0);
  } else {
    console.warn(
      "⚠  Could not determine merge base against origin/main (offline, or origin/main not " +
        "fetched) — checking staged/working-tree changes only, not the full PR diff.",
    );
  }

  if (mode === "staged" || mode === "working-tree") {
    for (const f of splitFiles(run("git diff --cached --name-only"))) files.add(f);
  }
  if (mode === "working-tree") {
    for (const f of splitFiles(run("git diff --name-only"))) files.add(f);
  }

  return { files: [...files], mergeBaseFound };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(mode: CheckMode): void {
  const { files: changedFiles, mergeBaseFound } = getChangedFiles(mode);

  const distributableFiles = changedFiles.filter((f) =>
    DISTRIBUTABLE_PATTERNS.some((p) => p.test(f)),
  );

  if (distributableFiles.length === 0) {
    if (mode !== "default" && !mergeBaseFound) {
      console.log(
        "✓ No distributable paths changed in staged/working-tree files — but the merge-base " +
          "diff could not be checked (see warning above). This is not a full guarantee.",
      );
    } else {
      console.log("✓ No distributable paths changed — version bump not required.");
    }
    process.exit(0);
  }

  console.log("Distributable paths changed:");
  for (const f of distributableFiles) console.log(`  • ${f}`);

  // Get current version from working tree package.json
  const currentPkg = JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf-8"),
  ) as { version: string };
  const currentVersion = currentPkg.version;
  // getVersion appends ":package.json" itself -- pass the bare ref. An earlier
  // `getVersion("origin/main:package.json") || getVersion("origin/main")` built
  // "origin/main:package.json:package.json" on the first operand, so it could
  // never resolve and the fallback was doing all the work.
  const mainVersion = getVersion("origin/main");

  if (!mainVersion) {
    console.warn("⚠  Could not read version from origin/main — skipping version check.");
    process.exit(0);
  }

  console.log(`\n  origin/main version : ${mainVersion}`);
  console.log(`  this branch version : ${currentVersion}`);

  if (currentVersion === mainVersion) {
    console.error(
      "\n✗ Version bump required!\n" +
        "  Distributable files changed but package.json version is unchanged.\n" +
        "  Run: npm version patch|minor|major --no-git-tag-version\n" +
        "  See: project.md → Constraints → Self-hosting",
    );
    process.exit(1);
  }

  console.log("\n✓ Version bumped — check passed.");
  process.exit(0);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  const mode: CheckMode = arg === "--staged" ? "staged" : arg === "--working-tree" ? "working-tree" : "default";
  main(mode);
}
