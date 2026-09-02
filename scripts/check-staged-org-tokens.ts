#!/usr/bin/env tsx
/**
 * scripts/check-staged-org-tokens.ts (ARC-041, LH-12)
 *
 * Pre-commit-only org-token privacy scan over STAGED files, using whatever
 * resolvePrivateTokens() resolves -- the CI secret if set (normally unset
 * locally), else the local file source ARC-041 adds ($ARCANE_ORG_TOKENS_FILE
 * or ~/.arcane/org-tokens). Staged-only, not repository-wide, by design: a
 * full repo scan on every commit is the wrong cost/benefit for a pre-commit
 * hook (a 100-file scan measured at 29.0ms in ARC-041's own empirical-first
 * step; the CI-run repository-wide scan, ARC-031 decision 2, stays the
 * authoritative full check).
 *
 * A no-op, not a warning, when resolvePrivateTokens() has nothing configured
 * -- most local sessions have no denylist file at all, and that is not
 * itself something to complain about on every commit.
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createOrgTokenRules, resolvePrivateTokens, scanFile } from "./org-token-lint.js";
import type { DenylistFinding } from "../src/modules/denylist-scan.js";

function getStagedFiles(rootDir: string): string[] {
  try {
    const output = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();
    return output ? output.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function checkStagedOrgTokens(rootDir: string): Promise<DenylistFinding[]> {
  const tokens = await resolvePrivateTokens(undefined, rootDir);
  if (tokens.length === 0) return [];

  const rules = createOrgTokenRules(tokens);
  const findings: DenylistFinding[] = [];
  for (const relPath of getStagedFiles(rootDir)) {
    findings.push(...(await scanFile(resolve(rootDir, relPath), relPath, rules)));
  }
  return findings;
}

async function main(): Promise<void> {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const findings = await checkStagedOrgTokens(rootDir);

  if (findings.length === 0) {
    console.log("✓ Staged org-token scan: clean (or no local denylist configured).");
    return;
  }

  console.error("\n✗ Staged org-token scan FAILED — a denylisted name is in a staged file.\n");
  for (const f of findings) console.error(`  ${f.file}:${f.line}`);
  console.error(
    "\nName the class of thing that leaked, not the instance (universal-agent-rules.md rule 25) " +
      "-- do not quote the flagged string even to describe removing it.",
  );
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error("check-staged-org-tokens failed:", error);
    process.exitCode = 1;
  });
}
