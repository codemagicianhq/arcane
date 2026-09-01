#!/usr/bin/env tsx
/**
 * scripts/copy-assets.ts
 *
 * Runs as part of "npm run build" (after tsup).
 * Copies all files from src/assets/ → dist/assets/ and runs two secrets
 * scans (ARC-037): a copy-time scan scoped to src/assets/ (skips writing any
 * offending file, so a secret never reaches dist/assets/), and a
 * repository-wide scan over the whole repo as a CI backstop that catches
 * anything the pre-commit hook missed or bypassed. Both share the same
 * SECRETS_PATTERNS engine (src/modules/secrets-scan.ts). Either failing
 * blocks the build with exit code 1.
 */
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOrgTokenRules,
  dedupeFindings,
  resolveOrgTokens,
  resolvePrivateTokens,
  scanDirectoryByExtension,
  scanPromptDirectory,
  scanRepository,
} from "./org-token-lint.js";
import { SECRETS_PATTERNS, SECRETS_RULES } from "../src/modules/secrets-scan.js";
import { resolveSecretsScanExcludePrefixes } from "../src/modules/manifest.js";
import { INCIDENT_QUEUE } from "../src/config/incidents.js";
import type { IncidentRecord } from "../src/config/incidents.js";
import { evaluateIncidentGate } from "../src/modules/incident-gate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ASSETS = process.env["ARCANE_SRC_ASSETS_DIR"]
  ?? join(__dirname, "../src/assets");
const DIST_ASSETS = process.env["ARCANE_DIST_ASSETS_DIR"]
  ?? join(__dirname, "../dist/assets");
// Root for the repository-wide privacy scan. Overridable so the gate's own
// tests can point it at a fixture tree instead of this repository — otherwise
// a test declaring a denylist would be flagged by the very scan it configures.
const REPO_SCAN_DIR = process.env["ARCANE_REPO_SCAN_DIR"] ?? join(__dirname, "..");

// ─── Secrets scan exclusions ─────────────────────────────────────────────────
// Copy-time exclusions (src/assets/ -> dist/assets/ only). Empty today: no
// file under src/assets/ needs excluding, but the mechanism stays wired for
// a future legitimate example-with-fake-secret shipped there. This is a
// SEPARATE list from the repository-wide scan's exclusions below -- add a
// path here only if it is under src/assets/.
const SCAN_EXCLUDED_PREFIXES: string[] = [];

// Secrets patterns now live in src/modules/secrets-scan.ts (ARC-037), shared
// with the repository-wide scan below and with `spell doctor --leaks`. That
// scan's own exclusions -- "test/copy-assets.test.ts" (a literal
// API-key-shaped fixture proving the scan fires, the self-referential
// collision ARC-037 decision 5 names), "test/org-token-lint.test.ts" (a
// fixture env key set to a variable reference, indistinguishable from a
// literal secret from source text alone), "test/secrets-scan.test.ts" (the
// rule tests, which deliberately feed real-looking credential shapes
// through the regexes -- the same class of collision), and
// "src/modules/secrets-scan.ts" (the pattern definitions themselves, never
// an actual credential) -- are configured via .arcane.json's
// secretsScanExcludePrefixes field (this repo's own self-hosted
// src/assets/.arcane.json), resolved dynamically below rather than
// hardcoded here, so `spell doctor --leaks` and this build-time backstop
// read one shared source of truth.

export interface ScanViolation {
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

// ─── Recursive copy ───────────────────────────────────────────────────────────

export async function copyDir(
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

/**
 * Prunes `dest` before copying, so a file removed or renamed in `src` since
 * the last build cannot survive indefinitely in `dest`. `copyDir` only ever
 * writes -- it has no way to know a destination file's source disappeared --
 * so an incremental build kept `dist/assets/.github/prompts/spell-eas-ios-deploy.prompt.md`
 * alive with no `src/assets/` counterpart, no `registry.ts` entry, and no git
 * history at all, invisibly, in every local build.
 */
export async function copyAssets(
  src: string,
  dest: string,
): Promise<{ count: number; violations: ScanViolation[] }> {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });

  const violations: ScanViolation[] = [];
  const count = await copyDir(src, dest, violations);
  return { count, violations };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const incidentQueuePath = process.env["ARCANE_INCIDENT_QUEUE_PATH"];
  const incidentQueue = incidentQueuePath
    ? JSON.parse(await readFile(incidentQueuePath, "utf8")) as IncidentRecord[]
    : INCIDENT_QUEUE;
  const incidentGate = evaluateIncidentGate(incidentQueue);
  if (incidentGate.blocked) {
    console.error("\n✗ ARC-024 incident release gate FAILED — build blocked.\n");
    for (const blocker of incidentGate.blockers) {
      console.error(`  ${blocker}`);
    }
    process.exit(1);
  }

  const { count, violations } = await copyAssets(SRC_ASSETS, DIST_ASSETS);

  if (violations.length > 0) {
    console.error("\n✗ Secrets scan FAILED — build blocked.\n");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  [${v.pattern}]`);
      console.error(`  → ${v.content}\n`);
    }
    process.exit(1);
  }

  console.log(`Assets copied: ${count} files`);

  // Org-token lint over the whole repository. Warn or fail per ORG_TOKEN_MODE.
  const packageIdentity = JSON.parse(
    await readFile(join(__dirname, "../package.json"), "utf8"),
  );
  // Portability: distributed spells (and instructions files, which ship the
  // same way from src/assets/ but were missing from this scan entirely until
  // TODO.md's 2026-08-31 BC-06 finding) must carry no org-specific literal at
  // all (package-derived names included) — scanned only where they ship.
  const orgTokenRules = createOrgTokenRules(resolveOrgTokens(packageIdentity));
  const portabilityFindings = [
    ...(await scanPromptDirectory(join(SRC_ASSETS, ".github/prompts"), orgTokenRules)),
    ...(await scanDirectoryByExtension(
      join(SRC_ASSETS, ".github/instructions"),
      ".instructions.md",
      ".github/instructions",
      orgTokenRules,
    )),
  ];
  // Privacy: the ARCANE_ORG_TOKENS denylist (real venture/customer/machine
  // names, supplied as a CI secret) must appear nowhere in the repository —
  // docs, tests and decision records included. ARC-031.
  const privacyFindings = await scanRepository(
    REPO_SCAN_DIR,
    createOrgTokenRules(resolvePrivateTokens()),
  );
  const orgFindings = dedupeFindings(portabilityFindings, privacyFindings);
  if (orgFindings.length > 0) {
    const fail = ORG_TOKEN_MODE === "fail";
    const log = fail ? console.error : console.warn;
    log(
      fail
        ? "\n✗ Org-token lint FAILED — build blocked (org-specific literals).\n  Use a fictional venture name (DECISIONS.md → ARC-031) or a {UPPER_SNAKE} placeholder.\n"
        : `\n⚠ Org-token lint (warn): ${orgFindings.length} org-specific literal(s) — use a fictional venture name or a {UPPER_SNAKE} placeholder.\n`,
    );
    for (const v of orgFindings) {
      log(`  ${v.file}:${v.line}  [${v.rule}]`);
    }
    if (fail) process.exit(1);
  }

  // Repository-wide secrets backstop (ARC-037 decision 3): the copy-time scan
  // above only ever protected src/assets/ -> dist/assets/. This mirrors the
  // org-token privacy scan's own full-tree walk, using the exact same
  // SECRETS_PATTERNS engine, so a credential anywhere in the repository --
  // src/, test/, scripts/, governance docs, journal/ -- fails the same
  // already-required build step rather than shipping undetected. Catches
  // anything that bypassed the new pre-commit hook (--no-verify, a client
  // that skips hooks, a direct API commit) before merge (decision 6).
  const repoSecretsExcludePrefixes = await resolveSecretsScanExcludePrefixes(REPO_SCAN_DIR);
  const secretsFindings = await scanRepository(
    REPO_SCAN_DIR,
    SECRETS_RULES,
    undefined,
    repoSecretsExcludePrefixes,
  );
  if (secretsFindings.length > 0) {
    console.error("\n✗ Repository-wide secrets scan FAILED — build blocked.\n");
    for (const v of secretsFindings) {
      console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    }
    process.exit(1);
  }
}

// Import-safety guard: without this, importing copyAssets/copyDir for tests
// (test/copy-assets.test.ts) ran this ENTIRE module body, including the real
// `main()` -- silently rebuilding this repository's actual dist/assets/ as an
// import side effect, racing any concurrently-running test that reads the
// real dist/assets/ (test/init.test.ts's built-CLI suite). Confirmed live:
// before this guard, running the full suite left dist/assets/ empty and
// broke `spell init` with `ENOENT: dist/assets/agents`. Same pattern as
// scripts/check-review-round.ts and check-distributed-adr-references.ts.
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("copy-assets failed:", err);
    process.exit(1);
  });
}
