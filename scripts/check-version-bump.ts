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
 * How it works:
 *   1. Diffs HEAD against the merge-base with origin/main (i.e. the PR diff).
 *   2. If any DISTRIBUTABLE_PATHS file changed → version must differ from main.
 *   3. If no distributable paths changed → passes unconditionally.
 *
 * Exits 0 (pass) or 1 (fail).
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
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

function getChangedFiles(): string[] {
  // Get the common ancestor of HEAD and origin/main (the PR base)
  const mergeBase = run("git merge-base HEAD origin/main");
  if (!mergeBase) {
    console.warn("⚠  Could not determine merge base — skipping version check.");
    process.exit(0);
  }
  const output = run(`git diff --name-only ${mergeBase} HEAD`);
  return output ? output.split("\n").filter(Boolean) : [];
}

// ─── Main ────────────────────────────────────────────────────────────────────

const changedFiles = getChangedFiles();

const distributionChanged = changedFiles.some((f) =>
  DISTRIBUTABLE_PATTERNS.some((p) => p.test(f)),
);

if (!distributionChanged) {
  console.log("✓ No distributable paths changed — version bump not required.");
  process.exit(0);
}

console.log("Distributable paths changed:");
for (const f of changedFiles.filter((f) =>
  DISTRIBUTABLE_PATTERNS.some((p) => p.test(f)),
)) {
  console.log(`  • ${f}`);
}

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
