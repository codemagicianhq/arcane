/**
 * Generic denylist scanning engine: word-boundary matching, tree-walking,
 * and dedup -- shared by `scripts/org-token-lint.ts` (Arcane's own private
 * build gate) and `spell ward` (BC-21, a shipped CLI command any consumer
 * repo can run). Extracted here because these functions were never actually
 * org-token-specific -- only the *resolution* of which tokens to scan for
 * (an env var, a CLI flag, a mandatory vendor list) differs per caller.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export interface DenylistRule {
  label: string;
  pattern: RegExp;
}

export interface DenylistFinding {
  file: string;
  line: number;
  rule: string;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary rules: a token must not be flanked by another word character. */
export function createDenylistRules(
  tokens: string[],
  labelPrefix: string,
): DenylistRule[] {
  return tokens.map((token, index) => ({
    label: `${labelPrefix}-${index + 1}`,
    pattern: new RegExp(
      `(?:^|[^A-Za-z0-9])${escapeRegExp(token)}(?=$|[^A-Za-z0-9])`,
      "i",
    ),
  }));
}

/**
 * Scans one file for denylist rules. Documented {UPPER_SNAKE} placeholders
 * are stripped before matching so they never trip a rule.
 */
export async function scanFile(
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
        break;
      }
    }
  }

  return findings;
}

/**
 * Directories never worth scanning -- generated output, dependencies, VCS
 * metadata. ".claude" specifically covers `.claude/worktrees/`: each entry
 * there is a full nested checkout of this same repository (a linked git
 * worktree), so anything real inside one is scanned again at the primary
 * checkout's own path -- walking it too only triples every finding without
 * surfacing anything new (confirmed empirically widening the ARC-037 scan
 * repository-wide: every one of a worktree's findings duplicated a root-path
 * finding byte-for-byte).
 */
export const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".vitest",
  ".claude",
]);

export const DEFAULT_SCANNABLE_EXTENSIONS = [".md", ".ts", ".js", ".json", ".yml", ".yaml"];

/**
 * Recursively collects every scannable file under `root`, returning
 * [absolutePath, repoRelativePath] pairs. `extensions` defaults to text
 * formats; a caller scanning binary asset strings (ward) passes its own list.
 */
export async function collectScannableFiles(
  root: string,
  repoRoot: string = root,
  extensions: string[] = DEFAULT_SCANNABLE_EXTENSIONS,
): Promise<Array<[string, string]>> {
  const collected: Array<[string, string]> = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return collected;
  }

  for (const entry of entries) {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      collected.push(...(await collectScannableFiles(absolutePath, repoRoot, extensions)));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      const displayPath = relative(repoRoot, absolutePath).replace(/\\/g, "/");
      collected.push([absolutePath, displayPath]);
    }
  }

  return collected;
}

/**
 * Scans an entire repository tree (text files by default) for denylist rules.
 * `excludePrefixes` drops any file whose repo-relative display path contains
 * one of the given literal substrings before it's ever read -- a scan blind
 * spot the caller opted into, not a post-hoc filter on findings (ARC-037).
 */
export async function scanRepository(
  repoRoot: string,
  rules: DenylistRule[],
  extensions?: string[],
  excludePrefixes: string[] = [],
): Promise<DenylistFinding[]> {
  if (rules.length === 0) return [];

  const findings: DenylistFinding[] = [];
  for (const [absolutePath, displayPath] of await collectScannableFiles(repoRoot, repoRoot, extensions)) {
    if (excludePrefixes.some((prefix) => displayPath.includes(prefix))) continue;
    findings.push(...(await scanFile(absolutePath, displayPath, rules)));
  }
  return findings;
}

/** Merges finding lists, collapsing duplicates reported at the same file:line. */
export function dedupeFindings(...lists: DenylistFinding[][]): DenylistFinding[] {
  const seen = new Map<string, DenylistFinding>();
  for (const list of lists) {
    for (const finding of list) {
      const key = `${finding.file}:${finding.line}`;
      if (!seen.has(key)) seen.set(key, finding);
    }
  }
  return [...seen.values()];
}
