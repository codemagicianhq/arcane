import { confirm } from "@inquirer/prompts";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileExists } from "./copier.js";
import type { ArcaneManifest, HubRole } from "../types.js";

/**
 * A manifest-field retrofit: a schema question `spell update` asks exactly
 * once, for an installed manifest that predates the field. This is a general
 * migration mechanism, not a one-off for `role` -- future manifest fields
 * register a retrofit here instead of leaving older installs permanently
 * unset.
 */
export interface ManifestRetrofit {
  /** Field this retrofit introduces on ArcaneManifest, for logging only. */
  field: string;
  /** True if the installed manifest predates this field and should be asked. */
  needsRetrofit(manifest: ArcaneManifest): boolean;
  /** Ask the operator; return the partial patch to merge into the manifest. */
  ask(): Promise<Partial<ArcaneManifest>>;
}

export const MANIFEST_RETROFITS: ManifestRetrofit[] = [
  {
    field: "role",
    needsRetrofit: (m) => m.role === undefined,
    ask: async () => {
      const isHub = await confirm({
        message:
          "Will this repo manage other ventures as a hub? (idea books, spell-manifest promotion, venture registry)",
        default: false,
      });
      return { role: (isHub ? "hub" : "consumer") as HubRole };
    },
  },
];

/**
 * Runs every retrofit question the installed manifest predates, in order.
 * Returns the partial patch to merge into the manifest being written.
 * Returns {} immediately (no questions, no console output) if nothing
 * applies -- callers should only invoke this outside dry-run and
 * non-interactive modes.
 */
export async function runManifestRetrofits(
  manifest: ArcaneManifest,
): Promise<Partial<ArcaneManifest>> {
  const applicable = MANIFEST_RETROFITS.filter((r) => r.needsRetrofit(manifest));
  if (applicable.length === 0) return {};

  console.log();
  console.log(
    `This install predates ${applicable.length} manifest field${applicable.length === 1 ? "" : "s"} -- a couple of quick questions:`,
  );

  let patch: Partial<ArcaneManifest> = {};
  for (const retrofit of applicable) {
    const answer = await retrofit.ask();
    patch = { ...patch, ...answer };
  }
  return patch;
}

/**
 * Offers to scaffold `{business_root}/registry.json` from existing venture
 * folders, once `role` has just become "hub" (via init or retrofit). Never
 * overwrites an existing registry. No-ops silently (no prompt, no output) if
 * the business root doesn't exist or holds no venture folders -- a brand new
 * hub with nothing under `ventures/` yet has nothing to scaffold.
 */
export async function offerRegistryScaffold(
  targetDir: string,
  businessRoot: string,
): Promise<void> {
  const registryPath = join(targetDir, businessRoot, "registry.json");
  if (await fileExists(registryPath)) return;

  const businessRootPath = join(targetDir, businessRoot);
  let ventureDirs: string[];
  try {
    const entries = await readdir(businessRootPath, { withFileTypes: true });
    ventureDirs = entries
      .filter((e) => e.isDirectory() && e.name !== "_template")
      .map((e) => e.name);
  } catch {
    return;
  }
  if (ventureDirs.length === 0) return;

  console.log();
  const scaffold = await confirm({
    message: `Found ${ventureDirs.length} folder${ventureDirs.length === 1 ? "" : "s"} under ${businessRoot}/ -- scaffold ${businessRoot}/registry.json from them?`,
    default: true,
  });
  if (!scaffold) return;

  const ventures: Record<string, unknown> = {};
  for (const slug of ventureDirs) {
    const include = await confirm({ message: `  Include "${slug}"?`, default: true });
    if (!include) continue;
    ventures[slug] = {
      name: slug,
      aliases: [],
      status: "active",
      visibility: "private",
      ownership: "llc",
      tracking: "none",
      repos: [],
    };
  }
  if (Object.keys(ventures).length === 0) {
    console.log("  No ventures selected -- registry not created.");
    return;
  }

  const registry = {
    _comment:
      "Hub-owned venture registry. Private. Never installed or modified by spell update. " +
      "Seeded by the retrofit wizard -- review and enrich (aliases, ownership, tracking, " +
      "clones) before relying on it.",
    updated: new Date().toISOString().slice(0, 10),
    ventures,
  };
  await writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf-8");
  console.log(
    `  ✓ Scaffolded ${businessRoot}/registry.json with ${Object.keys(ventures).length} venture(s).`,
  );
}
