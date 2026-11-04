/**
 * The hub registry section (PRD ST-07, architecture D9). On a hub (ARC-030
 * `role: hub`) the export mirrors `{business_root}/registry.json`'s venture
 * entries. Local clone paths are opt-in (`--include-local-paths`) and
 * this-machine-only: each repo gains one `local_path`, the entry of its
 * `clones` map whose key equals this hostname case-insensitively. The
 * `clones` map itself is never serialized: its keys are machine names the
 * leak scan treats as sensitive (ARC-030 decision 6), and other machines'
 * paths are nobody else's business. On a consumer the section is null.
 */

import { readFile } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../../types.js";
import type { RegistryRepo, RegistrySection, RegistryVenture } from "./types.js";

export const DEFAULT_BUSINESS_ROOT = "ventures";

export interface CollectRegistryOptions {
  includeLocalPaths: boolean;
  /** This machine's name; defaults to `os.hostname()`. Tests pass one. */
  hostname?: string;
}

export interface CollectRegistryResult {
  /** Null on a consumer, and null with a warning on a hub whose registry is missing or unreadable. */
  registry: RegistrySection | null;
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function localPathFor(clones: unknown, machine: string): string | null {
  if (!isRecord(clones)) return null;
  const wanted = machine.toLowerCase();
  for (const [key, value] of Object.entries(clones)) {
    if (key.toLowerCase() === wanted) return typeof value === "string" ? value : null;
  }
  return null;
}

function repoEntry(raw: unknown, options: CollectRegistryOptions, machine: string): RegistryRepo {
  const repo = isRecord(raw) ? raw : {};
  const entry: RegistryRepo = {
    name: stringOrNull(repo["name"]),
    remote: stringOrNull(repo["remote"]),
    default: repo["default"] === true,
  };
  if (options.includeLocalPaths) entry.local_path = localPathFor(repo["clones"], machine);
  return entry;
}

function ventureEntry(slug: string, raw: unknown, options: CollectRegistryOptions, machine: string): RegistryVenture {
  const venture = isRecord(raw) ? raw : {};
  const aliases = Array.isArray(venture["aliases"]) ? venture["aliases"].filter((a): a is string => typeof a === "string") : [];
  const repos = Array.isArray(venture["repos"]) ? venture["repos"].map((repo) => repoEntry(repo, options, machine)) : [];
  return {
    slug,
    name: stringOrNull(venture["name"]),
    aliases,
    status: stringOrNull(venture["status"]),
    visibility: stringOrNull(venture["visibility"]),
    ownership: stringOrNull(venture["ownership"]),
    tracking: venture["tracking"] ?? null,
    repos,
  };
}

/** Parses a registry document. Ventures may be a slug-keyed map (the scaffolded shape) or an array of entries carrying `slug`. */
export function parseRegistry(raw: unknown, options: CollectRegistryOptions): RegistrySection {
  const machine = options.hostname ?? hostname();
  const registry = isRecord(raw) ? raw : {};
  const ventures: RegistryVenture[] = [];
  const source = registry["ventures"];
  if (Array.isArray(source)) {
    for (const entry of source) {
      if (isRecord(entry) && typeof entry["slug"] === "string") ventures.push(ventureEntry(entry["slug"], entry, options, machine));
    }
  } else if (isRecord(source)) {
    for (const [slug, entry] of Object.entries(source)) ventures.push(ventureEntry(slug, entry, options, machine));
  }
  ventures.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return { updated: stringOrNull(registry["updated"]), ventures };
}

export async function collectRegistry(
  root: string,
  manifest: ArcaneManifest,
  options: CollectRegistryOptions,
): Promise<CollectRegistryResult> {
  if (manifest.role !== "hub") return { registry: null, warnings: [] };
  const businessRoot = manifest.business_root ?? DEFAULT_BUSINESS_ROOT;
  const relativePath = `${businessRoot}/registry.json`;
  let content: string;
  try {
    content = await readFile(join(root, businessRoot, "registry.json"), "utf8");
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === "ENOENT" ? "is missing" : `could not be read (${error instanceof Error ? error.message : String(error)})`;
    return { registry: null, warnings: [`registry: this repository is a hub but ${relativePath} ${reason}`] };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    return {
      registry: null,
      warnings: [`registry: ${relativePath} is not valid JSON (${error instanceof Error ? error.message : String(error)})`],
    };
  }
  return { registry: parseRegistry(raw, options), warnings: [] };
}
