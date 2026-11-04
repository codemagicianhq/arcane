/**
 * The features section (PRD ST-08, architecture D7): every
 * `features/<slug>/PRD.md` with its frontmatter `title`, `status`,
 * `implementation_status` and `tracking`, parsed with the YAML parser the
 * roster loader already uses. A PRD without frontmatter exports null fields
 * and a warning. Only the frontmatter is read; bodies never reach the
 * document (ST-11).
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type { FeatureEntry, FeatureTracking } from "./types.js";

const FEATURES_DIR = "features";
const PRD_FILE = "PRD.md";
// A PRD's block may follow one `# Title` line (several of this repository's
// own PRDs are written that way); anything else before `---` means no
// frontmatter.
const FRONTMATTER = /^(?:# [^\n]*\n+)?---\n([\s\S]*?)\n---(?:\n|$)/;
const H1 = /^# (.+?)\s*$/m;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function idOrNull(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") return value;
  return null;
}

/**
 * The tracking block: the nested `tracking:` map when present, else the
 * flat `tracking_mode`/`external_provider` keys older PRDs carry at the top
 * level, else null.
 */
export function featureTracking(frontmatter: Record<string, unknown>): FeatureTracking | null {
  const nested = frontmatter["tracking"];
  const source = isRecord(nested)
    ? nested
    : "tracking_mode" in frontmatter || "external_provider" in frontmatter
      ? frontmatter
      : null;
  if (source === null) return null;
  return {
    tracking_mode: stringOrNull(source["tracking_mode"]),
    external_provider: stringOrNull(source["external_provider"]),
    adoWorkItemId: idOrNull(source["adoWorkItemId"]),
    githubIssueId: idOrNull(source["githubIssueId"]),
  };
}

export interface ParsedPrd {
  fields: Omit<FeatureEntry, "slug" | "path">;
  warning: string | null;
}

/**
 * Reads a PRD's frontmatter into the exported fields; `warning` names why
 * they are null when they are. The title falls back to the first `# `
 * heading, the one line of the body a title legitimately lives on.
 */
export function parsePrd(content: string, displayPath: string): ParsedPrd {
  const text = content.replace(/\r\n?/g, "\n");
  const heading = H1.exec(text);
  const empty: ParsedPrd["fields"] = { title: heading ? heading[1] : null, status: null, implementation_status: null, tracking: null };
  const match = FRONTMATTER.exec(text);
  if (!match) return { fields: empty, warning: `features: ${displayPath} has no frontmatter` };
  let parsed: unknown;
  try {
    parsed = parse(match[1]);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
    return { fields: empty, warning: `features: ${displayPath} has malformed frontmatter (${reason})` };
  }
  if (!isRecord(parsed)) return { fields: empty, warning: `features: ${displayPath} has frontmatter that is not a map` };
  return {
    fields: {
      title: stringOrNull(parsed["title"]) ?? empty.title,
      status: stringOrNull(parsed["status"]),
      implementation_status: stringOrNull(parsed["implementation_status"]),
      tracking: featureTracking(parsed),
    },
    warning: null,
  };
}

export interface CollectFeaturesResult {
  /** Sorted by slug; null when features/ is absent. */
  features: FeatureEntry[] | null;
  warnings: string[];
}

export async function collectFeatures(root: string): Promise<CollectFeaturesResult> {
  const dir = join(root, FEATURES_DIR);
  let slugs: string[];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    slugs = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { features: null, warnings: [] };
    return {
      features: null,
      warnings: [`features: ${FEATURES_DIR}/ could not be read (${error instanceof Error ? error.message : String(error)})`],
    };
  }

  const warnings: string[] = [];
  const features: FeatureEntry[] = [];
  for (const slug of slugs) {
    const path = `${FEATURES_DIR}/${slug}/${PRD_FILE}`;
    let content: string;
    try {
      content = await readFile(join(dir, slug, PRD_FILE), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue; // a folder without a PRD is not a feature
      warnings.push(`features: ${path} could not be read (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    const { fields, warning } = parsePrd(content, path);
    if (warning !== null) warnings.push(warning);
    features.push({ slug, ...fields, path });
  }
  features.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return { features, warnings };
}
