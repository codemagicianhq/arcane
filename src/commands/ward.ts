import { readFile } from "node:fs/promises";
import { runWard, type WardExclusion } from "../modules/ward.js";

export interface WardCliOptions {
  terms?: string;
  termsFile?: string;
  gate?: boolean;
}

function parseTerms(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * ARC-041: --terms-file escapes the shell-history exposure a --terms value
 * has on any multi-user or logged machine. Same delimiter convention as
 * resolvePrivateTokens() (comma and/or newline) -- one format across every
 * place this framework accepts a local denylist, nothing new to document.
 */
function parseTermsFileContent(raw: string): string[] {
  return raw
    .split(/[,\r\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

async function readTermsFile(filePath: string): Promise<string[]> {
  try {
    return parseTermsFileContent(await readFile(filePath, "utf8"));
  } catch (error: unknown) {
    console.warn(
      `⚠ arcane: could not read --terms-file "${filePath}": ${(error as Error).message}`,
    );
    return [];
  }
}

/**
 * spell ward CLI entry point. Report-only by default (matching
 * spell-check-drift's own convention); --gate exits non-zero on any `leak`
 * finding so it can be wired into CI. A `protected-vendor-identifier`
 * finding is informational -- it exists to make a human look before an
 * automated rename touches a real vendor identifier, not to fail a build by
 * itself.
 */
export async function runWardCli(
  targetDir: string,
  options: WardCliOptions = {},
  exclusions: WardExclusion[] = [],
): Promise<void> {
  const terms = [
    ...parseTerms(options.terms),
    ...(options.termsFile ? await readTermsFile(options.termsFile) : []),
  ];
  const report = await runWard(targetDir, { terms, exclusions });

  console.log("\nspell ward — scanning for leaked identifiers\n");

  const leaks = report.findings.filter((f) => f.category === "leak");
  const protectedHits = report.findings.filter((f) => f.category === "protected-vendor-identifier");

  if (leaks.length === 0 && protectedHits.length === 0) {
    console.log("  ✓ No denylisted terms found.");
  }

  for (const finding of leaks) {
    const where = finding.line === 0 ? `${finding.file} (filename)` : `${finding.file}:${finding.line}`;
    console.log(`  ✗ [leak] ${where} — rule: ${finding.rule}`);
  }

  for (const finding of protectedHits) {
    const where = finding.line === 0 ? `${finding.file} (filename)` : `${finding.file}:${finding.line}`;
    console.log(
      `  ⚠ [protected-vendor-identifier] ${where} — rule: ${finding.rule} — verify before any automated rename touches this line`,
    );
  }

  if (report.mediaFlags.length > 0) {
    console.log("\n  Grep-proof media flagged for manual review:");
    for (const flag of report.mediaFlags) {
      console.log(`    ? ${flag.file} — ${flag.reason}`);
    }
  }

  console.log();

  if (options.gate && leaks.length > 0) {
    console.log(`  ${leaks.length} leak(s) found. Failing (--gate mode).\n`);
    process.exitCode = 1;
    return;
  }

  if (leaks.length > 0) {
    console.log(`  ${leaks.length} leak(s) found. Run with --gate to fail CI on this.\n`);
  }
}
