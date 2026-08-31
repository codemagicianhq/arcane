import { readdir } from "node:fs/promises";
import { join } from "node:path";
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

export function createOrgTokenRules(tokens: string[]): DenylistRule[] {
  return createDenylistRules(tokens, "org-token");
}

export async function scanPromptDirectory(
  promptsDir: string,
  rules: DenylistRule[],
): Promise<DenylistFinding[]> {
  const findings: DenylistFinding[] = [];
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
