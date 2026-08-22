import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export interface PackageIdentity {
  author?: string | { name?: string };
  repository?: string | { url?: string };
}

export interface OrgTokenRule {
  label: string;
  pattern: RegExp;
}

export interface OrgTokenFinding {
  file: string;
  line: number;
  rule: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addToken(tokens: Map<string, string>, value: string | undefined) {
  const token = value?.trim();
  if (!token || token.length < 4) return;
  tokens.set(token.toLocaleLowerCase(), token);
}

/**
 * Private tokens: names that must appear NOWHERE in the repository -- real
 * venture, customer, or machine names supplied out-of-band via
 * ARCANE_ORG_TOKENS (a CI secret, so the denylist itself stays private while
 * the enforcement is public).
 *
 * These are deliberately separate from the package-derived tokens below.
 * "Code Magician" and "codemagicianhq" legitimately appear all over this
 * repository -- it is Code Magician's repository -- they simply must not be
 * baked into the *distributed* spells. A private venture name has no such
 * carve-out: it is not allowed anywhere, in any file.
 */
export function resolvePrivateTokens(
  configuredTokens = process.env["ARCANE_ORG_TOKENS"] ?? "",
): string[] {
  const tokens = new Map<string, string>();
  for (const token of configuredTokens.split(/[,\r\n]+/)) {
    addToken(tokens, token);
  }
  return [...tokens.values()];
}

export function resolveOrgTokens(
  packageIdentity: PackageIdentity,
  configuredTokens = process.env["ARCANE_ORG_TOKENS"] ?? "",
): string[] {
  const tokens = new Map<string, string>();
  const author = typeof packageIdentity.author === "string"
    ? packageIdentity.author
    : packageIdentity.author?.name;
  addToken(tokens, author);

  const authorBase = author?.replace(
    /\s+(?:llc|inc\.?|ltd\.?|corp\.?|corporation)$/i,
    "",
  );
  addToken(tokens, authorBase);
  addToken(tokens, authorBase?.replace(/[^A-Za-z0-9]+/g, ""));

  const repository = typeof packageIdentity.repository === "string"
    ? packageIdentity.repository
    : packageIdentity.repository?.url;
  const githubOwner = repository?.match(/github\.com[/:]([^/]+)/i)?.[1];
  addToken(tokens, githubOwner);

  for (const token of configuredTokens.split(/[,\r\n]+/)) {
    addToken(tokens, token);
  }

  return [...tokens.values()];
}

export function createOrgTokenRules(tokens: string[]): OrgTokenRule[] {
  return tokens.map((token, index) => ({
    label: `org-token-${index + 1}`,
    pattern: new RegExp(
      `(?:^|[^A-Za-z0-9])${escapeRegExp(token)}(?=$|[^A-Za-z0-9])`,
      "i",
    ),
  }));
}

export async function scanPromptDirectory(
  promptsDir: string,
  rules: OrgTokenRule[],
): Promise<OrgTokenFinding[]> {
  const findings: OrgTokenFinding[] = [];
  let names: string[];
  try {
    names = (await readdir(promptsDir)).filter((name) => name.endsWith(".prompt.md"));
  } catch {
    return findings;
  }

  for (const name of names) {
    findings.push(
      ...(await scanFile(join(promptsDir, name), `.github/prompts/${name}`, rules)),
    );
  }

  return findings;
}

/**
 * Scans one file for org tokens. Documented {UPPER_SNAKE} placeholders are
 * stripped before matching so they never trip a rule.
 */
export async function scanFile(
  absolutePath: string,
  displayPath: string,
  rules: OrgTokenRule[],
): Promise<OrgTokenFinding[]> {
  const findings: OrgTokenFinding[] = [];
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
 * metadata, and coverage reports.
 */
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".vitest",
]);

const SCANNABLE_EXTENSIONS = [".md", ".ts", ".js", ".json", ".yml", ".yaml"];

/**
 * Recursively collects every scannable file under `root`, returning
 * [absolutePath, repoRelativePath] pairs.
 *
 * The org-token gate originally scanned only `src/assets/.github/prompts`.
 * That surface was too narrow: real organization names reached a published
 * release through `DECISIONS.md` and a test fixture, neither of which the
 * gate looked at. Scanning the whole repository (minus generated output)
 * closes that gap -- the cost is a few hundred small file reads at build time.
 */
export async function collectScannableFiles(
  root: string,
  repoRoot: string = root,
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
      collected.push(...(await collectScannableFiles(absolutePath, repoRoot)));
    } else if (SCANNABLE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      const displayPath = relative(repoRoot, absolutePath).replace(/\\/g, "/");
      collected.push([absolutePath, displayPath]);
    }
  }

  return collected;
}

/**
 * Scans an entire repository tree for org tokens. This is the build gate's
 * real surface -- anything committed here can end up public, whether or not
 * it ships inside the npm tarball.
 */
export async function scanRepository(
  repoRoot: string,
  rules: OrgTokenRule[],
): Promise<OrgTokenFinding[]> {
  // No private denylist configured (local builds, forks) -- nothing to do,
  // and no reason to pay for the tree walk.
  if (rules.length === 0) return [];

  const findings: OrgTokenFinding[] = [];
  for (const [absolutePath, displayPath] of await collectScannableFiles(repoRoot)) {
    findings.push(...(await scanFile(absolutePath, displayPath, rules)));
  }
  return findings;
}

/** Merges finding lists, collapsing duplicates reported at the same file:line. */
export function dedupeFindings(...lists: OrgTokenFinding[][]): OrgTokenFinding[] {
  const seen = new Map<string, OrgTokenFinding>();
  for (const list of lists) {
    for (const finding of list) {
      const key = `${finding.file}:${finding.line}`;
      if (!seen.has(key)) seen.set(key, finding);
    }
  }
  return [...seen.values()];
}