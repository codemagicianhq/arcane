import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

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
    const content = await readFile(join(promptsDir, name), "utf8");
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index++) {
      const searchable = lines[index]!.replace(/\{[A-Z][A-Z0-9_]*\}/g, "");
      for (const rule of rules) {
        if (rule.pattern.test(searchable)) {
          findings.push({
            file: `.github/prompts/${name}`,
            line: index + 1,
            rule: rule.label,
          });
          break;
        }
      }
    }
  }

  return findings;
}