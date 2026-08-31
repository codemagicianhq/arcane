/**
 * spell ward (T18/BC-21): local IP/trademark leakage scan.
 *
 * Finds what leaked IN -- third-party identifiers, brand tokens, org names
 * baked into a repo's content, filenames, or binary assets. The opposite
 * concern from spell scry (T18), which clears a candidate name before it
 * ships OUT.
 *
 * Deliberately out of scope: secret/credential detection. That is a
 * different scanning concern reserved for BC-10's secret-detection ADR
 * (ARC-037, still Proposed) -- ward never attempts pattern-matching on
 * keys, tokens, or credentials, only on identifiers and trademarks.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  createDenylistRules,
  collectScannableFiles,
  SKIP_DIRECTORIES,
  type DenylistRule,
  type DenylistFinding,
} from "./denylist-scan.js";

/**
 * Ward's own content scan, deliberately NOT reusing denylist-scan.ts's
 * `scanFile` -- that function stops at the first matching rule per line
 * (correct for org-token-lint, which only needs "does this line have any
 * hit"), but ward must distinguish a leak from a protected-vendor-identifier
 * hit even when both land on the same line, so it needs every matching rule
 * per line, not just the first.
 */
async function scanFileAllRules(
  absolutePath: string,
  displayPath: string,
  rules: DenylistRule[],
): Promise<DenylistFinding[]> {
  const findings: DenylistFinding[] = [];
  let content: string;
  try {
    content = await readFile(absolutePath, "utf8");
  } catch {
    return findings;
  }

  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const searchable = lines[index]!.replace(/\{[A-Z][A-Z0-9_]*\}/g, "");
    for (const rule of rules) {
      if (rule.pattern.test(searchable)) {
        findings.push({ file: displayPath, line: index + 1, rule: rule.label });
      }
    }
  }

  return findings;
}

// ─── Mandatory vendor-identifier protection list ─────────────────────────────

/**
 * Always active, independent of any user-supplied terms. A reasonable
 * starting set (not exhaustive -- see the PRD's Open Questions), covering
 * widely-referenced third-party AI model and vendor identifiers that an
 * automated rename/refactor pass could plausibly mistake for a project-local
 * token and "correct" into something else, corrupting a real API reference.
 * A match here is reported as PROTECTED, never as a plain leak finding --
 * ward's job for these terms is to stop automated correction, not to flag
 * their legitimate presence as a problem.
 */
export const VENDOR_IDENTIFIER_PROTECTION_LIST: readonly string[] = [
  "claude",
  "gpt-4",
  "gpt-3.5",
  "gemini",
  "llama",
  "mistral",
  "copilot",
  "anthropic",
  "openai",
];

export interface WardExclusion {
  /** The denylist rule label this exclusion applies to. */
  rule: string;
  /** A substring that, if present on the same line as a match, suppresses it. */
  context: string;
  reason: string;
}

export interface WardOptions {
  /** User-supplied terms, in addition to the mandatory vendor list. */
  terms?: string[];
  /** Substring-hazard exclusions (the "author/provision" class). */
  exclusions?: WardExclusion[];
  /** Extra file extensions to treat as scannable binary-asset carriers. */
  binaryExtensions?: string[];
}

export interface WardFinding extends DenylistFinding {
  category: "leak" | "protected-vendor-identifier";
}

export interface WardMediaFlag {
  file: string;
  reason: string;
}

export interface WardReport {
  findings: WardFinding[];
  /** Grep-proof media flagged for manual review, never silently cleared. */
  mediaFlags: WardMediaFlag[];
}

/** Binary media formats where reliable text extraction isn't possible. */
const GREP_PROOF_EXTENSIONS = [".gif", ".png", ".jpg", ".jpeg", ".mp4", ".mov", ".mp3", ".wav"];

/** Extensions ward treats as text-scannable content, beyond denylist-scan's default set. */
const WARD_TEXT_EXTENSIONS = [
  ".md", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".txt", ".mdx",
];

function applyExclusions(
  findings: DenylistFinding[],
  fileLines: Map<string, string[]>,
  exclusions: WardExclusion[],
): DenylistFinding[] {
  if (exclusions.length === 0) return findings;
  return findings.filter((finding) => {
    const applicable = exclusions.filter((e) => e.rule === finding.rule);
    if (applicable.length === 0) return true;
    const lines = fileLines.get(finding.file);
    const lineText = lines?.[finding.line - 1] ?? "";
    return !applicable.some((e) => lineText.includes(e.context));
  });
}

/** Scans filenames themselves (not just content) against the denylist rules. */
async function scanFilenames(
  root: string,
  rules: DenylistRule[],
  repoRoot: string = root,
): Promise<DenylistFinding[]> {
  const findings: DenylistFinding[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return findings;
  }

  for (const entry of entries) {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      findings.push(...(await scanFilenames(absolutePath, rules, repoRoot)));
      continue;
    }
    const displayPath = relative(repoRoot, absolutePath).replace(/\\/g, "/");
    for (const rule of rules) {
      if (rule.pattern.test(entry.name)) {
        findings.push({ file: displayPath, line: 0, rule: rule.label });
        break;
      }
    }
  }

  return findings;
}

/** Flags grep-proof media files for manual review -- never silently cleared. */
async function flagGrepProofMedia(root: string, repoRoot: string = root): Promise<WardMediaFlag[]> {
  const files = await collectScannableFiles(root, repoRoot, GREP_PROOF_EXTENSIONS);
  return files.map(([, displayPath]) => ({
    file: displayPath,
    reason: "binary media format -- text extraction is unreliable; review manually for embedded identifiers",
  }));
}

/**
 * Runs the full ward scan: content, filenames, and grep-proof media flags.
 * Report-only -- never mutates anything. Categorizes each finding as a plain
 * leak or a protected-vendor-identifier hit per VENDOR_IDENTIFIER_PROTECTION_LIST.
 */
export async function runWard(repoRoot: string, options: WardOptions = {}): Promise<WardReport> {
  const userTerms = options.terms ?? [];
  const exclusions = options.exclusions ?? [];
  const extensions = [...WARD_TEXT_EXTENSIONS, ...(options.binaryExtensions ?? [])];

  const userRules = createDenylistRules(userTerms, "ward-term");
  const vendorRules = createDenylistRules([...VENDOR_IDENTIFIER_PROTECTION_LIST], "ward-vendor");
  const allRules = [...userRules, ...vendorRules];

  const contentFiles = await collectScannableFiles(repoRoot, repoRoot, extensions);
  const fileLines = new Map<string, string[]>();
  const contentFindings: DenylistFinding[] = [];
  for (const [absolutePath, displayPath] of contentFiles) {
    const findings = await scanFileAllRules(absolutePath, displayPath, allRules);
    if (findings.length > 0) {
      try {
        fileLines.set(displayPath, (await readFile(absolutePath, "utf8")).split("\n"));
      } catch {
        // Unreadable after the initial scan (rare race) -- leave unmapped; exclusions simply won't match.
      }
    }
    contentFindings.push(...findings);
  }

  // Not dedupeFindings: that collapses on file:line alone, which would
  // wrongly merge a leak and a protected-vendor-identifier hit that land on
  // the same line -- exactly the case ward needs to keep distinct. Content
  // (line >= 1) and filename (line 0) findings can never collide on
  // file:line, and scanFileAllRules never double-reports the same rule on
  // the same line, so a plain concatenation is already duplicate-free.
  const filenameFindings = await scanFilenames(repoRoot, allRules);
  const combined = [...contentFindings, ...filenameFindings];
  const excluded = applyExclusions(combined, fileLines, exclusions);

  const vendorLabels = new Set(vendorRules.map((r) => r.label));
  const findings: WardFinding[] = excluded.map((f) => ({
    ...f,
    category: vendorLabels.has(f.rule) ? "protected-vendor-identifier" : "leak",
  }));

  const mediaFlags = await flagGrepProofMedia(repoRoot);

  return { findings, mediaFlags };
}
