import { confirm, select, input } from "@inquirer/prompts";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileExists } from "./copier.js";
import { isValidSubjectRoot } from "./manifest.js";
import type {
  ArcaneManifest,
  ContentSensitivity,
  ExternalProvider,
  HubRole,
  TrackingMode,
} from "../types.js";

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
  /**
   * Ask the operator (or apply a deterministic default); return the partial
   * patch to merge into the manifest. Receives the manifest so a retrofit
   * can branch on already-known fields (e.g. profile) the way the
   * tracking_mode retrofit below does -- entries that don't need it (role)
   * simply ignore the parameter.
   */
  ask(manifest: ArcaneManifest): Promise<Partial<ArcaneManifest>>;
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
  {
    field: "tracking_mode",
    needsRetrofit: (m) => m.tracking_mode === undefined,
    // Mirrors init.ts's Step 5b branching exactly (EF-14 D5): docs-only
    // profiles get a silent default, full/lite get asked.
    ask: async (manifest) => {
      if (
        manifest.profile === "governance-only" ||
        manifest.profile === "methodology" ||
        manifest.profile === "docs"
      ) {
        return { tracking_mode: "internal" as TrackingMode, external_provider: null };
      }
      const tracking_mode = (await select({
        message: "How will work be tracked in this repo?",
        choices: [
          { value: "internal", name: "Track work in this repo (TODO.md / PRDs)" },
          { value: "external", name: "Track work in an external tracker (Azure DevOps / Jira / other)" },
        ],
      })) as TrackingMode;
      if (tracking_mode === "external") {
        const external_provider = (await select({
          message: "Which external tracker?",
          choices: [
            { value: "ado", name: "Azure DevOps" },
            { value: "jira", name: "Jira" },
            { value: "other", name: "Other" },
          ],
        })) as ExternalProvider;
        return { tracking_mode, external_provider };
      }
      return { tracking_mode, external_provider: null };
    },
  },
  {
    field: "content_sensitivity",
    needsRetrofit: (m) => m.content_sensitivity === undefined,
    // EF-12. Asked for every profile -- a code repo can hold sensitive records
    // too -- and defaults to "standard", so an operator who just presses enter
    // keeps today's behaviour exactly.
    ask: async () => {
      const content_sensitivity = (await select({
        message: "How should agents treat this repository's contents?",
        choices: [
          {
            value: "standard",
            name: "Standard — agents may quote contents in journals and decisions",
          },
          {
            value: "sensitive",
            name: "Sensitive — agents reference documents by path, never transcribe them",
          },
        ],
        default: "standard",
      })) as ContentSensitivity;
      return { content_sensitivity };
    },
  },
  {
    field: "subject_root",
    // EF-07. Only the docs profile is asked: other profiles describe code or a
    // venture portfolio, where "what is this repo about" is already answered.
    // A docs install that legitimately holds several subjects answers
    // "portfolio" and stays unset -- so this retrofit deliberately does NOT
    // re-ask on every update. It is gated on the field being absent AND the
    // profile being docs, and once answered (either way) it never fires again,
    // because "portfolio" writes an explicit empty marker.
    needsRetrofit: (m) => m.profile === "docs" && m.subject_root === undefined,
    ask: async () => {
      const shape = await select({
        message: "What does this repository hold?",
        choices: [
          {
            value: "root",
            name: "One subject, at the repository root (documents sit alongside Arcane's files)",
          },
          { value: "subdir", name: "One subject, in its own directory" },
          { value: "portfolio", name: "Several subjects or ventures" },
        ],
      });
      if (shape === "root") return { subject_root: "." };
      if (shape === "subdir") {
        const answer = await input({
          message: "Directory holding the subject's documents:",
          default: "docs",
          validate: (v) =>
          isValidSubjectRoot(v.trim() || "docs") ||
          "Must be a relative path inside the repository (no leading /, drive letter, or ..).",
        });
        return { subject_root: answer.trim() || "docs" };
      }
      // Portfolio: business_root covers this shape. Recorded as an explicit
      // null rather than left unset, so the question isn't re-asked on every
      // future update.
      return { subject_root: null };
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
    const answer = await retrofit.ask({ ...manifest, ...patch });
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
