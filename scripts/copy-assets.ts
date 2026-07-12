#!/usr/bin/env tsx
/**
 * scripts/copy-assets.ts
 *
 * Runs as part of "npm run build" (after tsup).
 * Copies all files from src/assets/ → dist/assets/ and runs a secrets scan.
 *
 * Secrets scan: if any copied file contains patterns that look like credentials
 * (API keys, tokens, bearer headers, PEM headers, etc.), the build is failed
 * immediately with exit code 1 so no secrets are accidentally published.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ASSETS = join(__dirname, "../src/assets");
const DIST_ASSETS = join(__dirname, "../dist/assets");

// ─── Secrets scan exclusions ─────────────────────────────────────────────────
// Add path prefixes here to exclude directories from secrets scanning.
// Only exclude directories that contain legitimate code examples with credential
// variable names (e.g., test fixtures, documentation snippets).
const SCAN_EXCLUDED_PREFIXES: string[] = [];

// ─── Secrets patterns ──────────────────────────────────────────────────────────
// These patterns are deliberately conservative — they look for common credential
// fragments. False positives block the build, which is the safe direction to fail.

const SECRETS_PATTERNS: RegExp[] = [
  /API[_-]KEY\s*[:=]\s*\S+/i,
  /SECRET\s*[:=]\s*[^\s{]/i,       // avoids matching {SECRET} placeholders
  /TOKEN\s*[:=]\s*[^\s{]/i,         // avoids matching {TOKEN} placeholders
  /Bearer\s+[A-Za-z0-9\-._~+/]{20,}/, // real Bearer tokens are long (20+ chars)
  /sk-[A-Za-z0-9]{20,}/,           // OpenAI-style keys
  /-----BEGIN [A-Z ]+-----/,        // PEM certificates/keys
  /xox[bpars]-[A-Za-z0-9\-]+/,     // Slack tokens
  /AKIA[0-9A-Z]{16}/,               // AWS access key IDs
  /ghp_[A-Za-z0-9]{36}/,            // GitHub personal access tokens
];

interface ScanViolation {
  file: string;
  line: number;
  content: string;
  pattern: string;
}

function scanForSecrets(filePath: string, content: string): ScanViolation[] {
  const violations: ScanViolation[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const pattern of SECRETS_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: i + 1,
          content: line.trim().slice(0, 120),
          pattern: pattern.toString(),
        });
        break; // one violation per line is enough
      }
    }
  }
  return violations;
}

// ─── Org-token lint (D2 Distributability — see spell-authoring-standards.md) ───
// Flags org-specific literals in spell prompts that hurt portability / OSS-readiness.
// Documented {UPPER_SNAKE} placeholders are fine and are not matched here.
// Staged rollout: started "warn"; flipped to "fail" once the library was de-coupled (ARC-014).
const ORG_TOKEN_MODE: "warn" | "fail" = "fail";

// Configure your own organization's tokens here (org names, ventures, machines,
// internal hosts) to fail the build if any leak into distributable spell prompts.
// A config-driven version of this denylist is on the roadmap as the org-leak gate.
const ORG_TOKEN_PATTERNS: RegExp[] = [];

async function scanPromptsForOrgTokens(): Promise<ScanViolation[]> {
  const promptsDir = join(SRC_ASSETS, ".github/prompts");
  const findings: ScanViolation[] = [];
  let names: string[] = [];
  try {
    names = (await readdir(promptsDir)).filter((f) => f.endsWith(".prompt.md"));
  } catch {
    return findings; // no prompts dir — nothing to lint
  }
  for (const name of names) {
    const content = await readFile(join(promptsDir, name), "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const pattern of ORG_TOKEN_PATTERNS) {
        if (pattern.test(line)) {
          findings.push({
            file: `.github/prompts/${name}`,
            line: i + 1,
            content: line.trim().slice(0, 120),
            pattern: pattern.toString(),
          });
          break;
        }
      }
    }
  }
  return findings;
}

// ─── Recursive copy ───────────────────────────────────────────────────────────

async function copyDir(
  src: string,
  dest: string,
  violations: ScanViolation[],
): Promise<number> {
  let count = 0;
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      count += await copyDir(srcPath, destPath, violations);
    } else {
      const content = await readFile(srcPath, "utf8");
      const relPath = relative(join(__dirname, ".."), destPath).replace(/\\/g, "/");
      const isExcluded = SCAN_EXCLUDED_PREFIXES.some((prefix) =>
        relPath.includes(prefix),
      );
      const fileViolations = isExcluded ? [] : scanForSecrets(
        relPath,
        content,
      );
      if (fileViolations.length > 0) {
        violations.push(...fileViolations);
      } else {
        await mkdir(dirname(destPath), { recursive: true });
        await writeFile(destPath, content, "utf8");
        count++;
      }
    }
  }

  return count;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(DIST_ASSETS, { recursive: true });

  const violations: ScanViolation[] = [];
  const count = await copyDir(SRC_ASSETS, DIST_ASSETS, violations);

  if (violations.length > 0) {
    console.error("\n✗ Secrets scan FAILED — build blocked.\n");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  [${v.pattern}]`);
      console.error(`  → ${v.content}\n`);
    }
    process.exit(1);
  }

  console.log(`Assets copied: ${count} files`);

  // Org-token lint over spell prompts (D2). Warn or fail per ORG_TOKEN_MODE.
  const orgFindings = await scanPromptsForOrgTokens();
  if (orgFindings.length > 0) {
    const fail = ORG_TOKEN_MODE === "fail";
    const log = fail ? console.error : console.warn;
    log(
      fail
        ? "\n✗ Org-token lint FAILED — build blocked (org-specific literals in spells).\n"
        : `\n⚠ Org-token lint (warn): ${orgFindings.length} org-specific literal(s) in spells — generalize to {UPPER_SNAKE} placeholders.\n`,
    );
    for (const v of orgFindings) {
      log(`  ${v.file}:${v.line}  [${v.pattern}]  → ${v.content}`);
    }
    if (fail) process.exit(1);
  }
}

main().catch((err) => {
  console.error("copy-assets failed:", err);
  process.exit(1);
});
