import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve as resolvePath, sep } from "node:path";
import { homedir } from "node:os";
import {
  createDenylistRules,
  scanFile,
  collectScannableFiles,
  scanRepository,
  dedupeFindings,
  type DenylistRule,
  type DenylistFinding,
} from "../src/modules/denylist-scan.js";

export type { DenylistRule as OrgTokenRule, DenylistFinding as OrgTokenFinding };
export { scanFile, collectScannableFiles, scanRepository, dedupeFindings };

export interface PackageIdentity {
  author?: string | { name?: string };
  repository?: string | { url?: string };
}

function addToken(tokens: Map<string, string>, value: string | undefined) {
  const token = value?.trim();
  if (!token || token.length < 4) return;
  tokens.set(token.toLocaleLowerCase(), token);
}

/**
 * The repository's own toplevel directory, or null outside a git repo (or
 * when `git` itself is unavailable). Used only to refuse a local org-token
 * file path that resolves inside the repository -- never to locate the
 * repository for any other purpose.
 */
function repoToplevel(cwd: string): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * True when `candidatePath` resolves to somewhere inside `repoRoot`. Both
 * sides are normalized/resolved first so `..`-segments, a trailing slash, or
 * relative-vs-absolute spelling can't produce a false "outside."
 */
function isInsideRepo(candidatePath: string, repoRoot: string): boolean {
  const resolvedCandidate = resolvePath(candidatePath);
  const resolvedRoot = resolvePath(repoRoot);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + sep);
}

/**
 * Reads a local org-token file, refusing (with a loud warning, never a
 * throw) any path that resolves inside the current repository -- ARC-041's
 * structural guard: a gitignored in-repo file can still be force-added
 * (`git add -f`) or accidentally un-ignored later, exactly the hole a CI-only
 * secret already avoids by never living in the repository at all. Missing
 * file, unreadable file, or no repo detected are all silent no-ops (an empty
 * string) -- this is a best-effort local convenience, not a required input.
 */
async function readLocalTokenFile(filePath: string, cwd = process.cwd()): Promise<string> {
  const toplevel = repoToplevel(cwd);
  if (toplevel !== null && isInsideRepo(filePath, toplevel)) {
    console.warn(
      `⚠ arcane: ignoring local org-token file "${filePath}" -- it resolves inside this repository ` +
        `(${toplevel}). A local denylist file must live outside the repo it protects (ARC-041); a ` +
        `gitignored in-repo file can still be force-added or accidentally un-ignored later.`,
    );
    return "";
  }
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

/**
 * Private tokens: names that must appear NOWHERE in the repository -- real
 * venture, customer, or machine names supplied out-of-band via
 * ARCANE_ORG_TOKENS (a CI secret, so the denylist itself stays private while
 * the enforcement is public), or, locally, a file outside the repository
 * (ARC-041): `$ARCANE_ORG_TOKENS_FILE` if set, else `~/.arcane/org-tokens`.
 * The env var always wins when set, matching CI's existing behavior exactly;
 * the file sources are additive, local-only convenience, never required.
 *
 * These are deliberately separate from the package-derived tokens below.
 * "Code Magician" and "codemagicianhq" legitimately appear all over this
 * repository -- it is Code Magician's repository -- they simply must not be
 * baked into the *distributed* spells. A private venture name has no such
 * carve-out: it is not allowed anywhere, in any file.
 */
export async function resolvePrivateTokens(
  configuredTokens = process.env["ARCANE_ORG_TOKENS"] ?? "",
  cwd = process.cwd(),
): Promise<string[]> {
  let raw = configuredTokens;
  if (raw.trim() === "") {
    const explicitFile = process.env["ARCANE_ORG_TOKENS_FILE"];
    raw = explicitFile
      ? await readLocalTokenFile(explicitFile, cwd)
      : await readLocalTokenFile(join(homedir(), ".arcane", "org-tokens"), cwd);
  }

  const tokens = new Map<string, string>();
  for (const token of raw.split(/[,\r\n]+/)) {
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

export function createOrgTokenRules(tokens: string[]): DenylistRule[] {
  return createDenylistRules(tokens, "org-token");
}

/**
 * Scans every file matching `extension` directly inside `dir` (non-recursive)
 * for org tokens, reporting findings under `reportedPrefix/{name}` rather
 * than `dir`'s own (possibly absolute, possibly differently-rooted) path.
 *
 * Generalized from the original prompts-only `scanPromptDirectory` so a
 * second `src/assets/` directory shipping the same way -- `.github/
 * instructions/*.instructions.md` -- can reuse the same scan rather than a
 * second hand-copied loop (found missing entirely: MEDIUM gap, TODO.md,
 * 2026-08-31 BC-06 -- a full `github.com/codemagicianhq/arcane` URL shipped
 * in `agent-output.instructions.md` undetected because instructions files
 * were never in the scanned set at all).
 */
export async function scanDirectoryByExtension(
  dir: string,
  extension: string,
  reportedPrefix: string,
  rules: DenylistRule[],
): Promise<DenylistFinding[]> {
  const findings: DenylistFinding[] = [];
  let names: string[];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith(extension));
  } catch {
    return findings;
  }

  for (const name of names) {
    findings.push(
      ...(await scanFile(join(dir, name), `${reportedPrefix}/${name}`, rules)),
    );
  }

  return findings;
}

export async function scanPromptDirectory(
  promptsDir: string,
  rules: DenylistRule[],
): Promise<DenylistFinding[]> {
  return scanDirectoryByExtension(promptsDir, ".prompt.md", ".github/prompts", rules);
}
