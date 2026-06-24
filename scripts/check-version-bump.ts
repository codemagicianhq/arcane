#!/usr/bin/env tsx
/**
 * scripts/check-version-bump.ts
 *
 * CI gate: fails if distributable content changed without a version bump.
 *
 * Rule (from CLAUDE.md): "Version bump required for any change to src/assets/ or
 * any change to registry.ts / profiles.ts that affects what gets distributed."
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
    return execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim();
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
const mainVersion = getVersion("origin/main:package.json") || getVersion("origin/main");

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
      "  See: CLAUDE.md → Development Rules #2",
  );
  process.exit(1);
}

console.log("\n✓ Version bumped — check passed.");
process.exit(0);
