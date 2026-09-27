import { confirm, select, input } from "@inquirer/prompts";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileExists } from "./copier.js";
import { detectAdoContext } from "./ado-context.js";
import {
  isValidSubjectRoot,
  validateManifestFields,
  ManifestInvalidFieldError,
  MANIFEST_ENUM_VALUES,
} from "./manifest.js";
import type {
  ArcaneManifest,
  ContentSensitivity,
  ExternalProvider,
  HubRole,
  ManifestFlags,
  PushPolicy,
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
  ask(manifest: ArcaneManifest, targetDir?: string): Promise<Partial<ArcaneManifest>>;
  /** The flag that answers this question without a prompt (PRD D-02). */
  flag: string;
}

/**
 * The tracking-mode and provider questions, shared by init's Step 5b and the
 * tracking_mode retrofit. With an Azure DevOps remote (PRD D-03), external
 * and then ado are pre-selected; otherwise nothing is. Each option names its
 * downstream effect in one line.
 */
export async function askTrackingQuestions(
  targetDir: string | undefined,
): Promise<{ tracking_mode: TrackingMode; external_provider: ExternalProvider | null }> {
  const ado = targetDir !== undefined && (await detectAdoContext(targetDir));
  const tracking_mode = (await select({
    message: "How will work be tracked in this repo?",
    choices: [
      {
        value: "internal",
        name: "Track work in this repo (TODO.md / PRDs)",
        description: "Spells keep TODOs, PRDs and stories in this repository's own files.",
      },
      {
        value: "external",
        name: "Track work in an external tracker (Azure DevOps / GitHub / Jira / other)",
        description: "Spells tie PRDs, commits and PRs to items in the tracker you pick next.",
      },
    ],
    ...(ado ? { default: "external" } : {}),
  })) as TrackingMode;
  if (tracking_mode !== "external") return { tracking_mode, external_provider: null };
  const external_provider = (await select({
    message: "Which external tracker?",
    choices: [
      {
        value: "ado",
        name: "Azure DevOps",
        description: "Each PRD needs an ADO work item ID; plans follow your process template's item types.",
      },
      {
        value: "github",
        name: "GitHub Issues",
        description: "Uses the gh CLI; an issue number is optional and linked from commits and PRs when known.",
      },
      {
        value: "jira",
        name: "Jira",
        description: "No Jira automation yet: spells note linking as a TODO and keep planning in this repo.",
      },
      {
        value: "other",
        name: "Other",
        description: "No automation: spells note linking as a TODO and keep planning in this repo.",
      },
    ],
    ...(ado ? { default: "ado" } : {}),
  })) as ExternalProvider;
  return { tracking_mode, external_provider };
}

export const MANIFEST_RETROFITS: ManifestRetrofit[] = [
  {
    field: "role",
    flag: "--role <hub|consumer>",
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
    flag: "--tracking-mode <internal|external>",
    needsRetrofit: (m) => m.tracking_mode === undefined,
    // Mirrors init.ts's Step 5b branching exactly (EF-14 D5): docs-only
    // profiles get a silent default, full/lite get asked -- through the same
    // askTrackingQuestions init uses, so the two cannot drift.
    ask: async (manifest, targetDir) => {
      if (
        manifest.profile === "governance-only" ||
        manifest.profile === "methodology" ||
        manifest.profile === "docs"
      ) {
        return { tracking_mode: "internal" as TrackingMode, external_provider: null };
      }
      return askTrackingQuestions(targetDir);
    },
  },
  {
    field: "content_sensitivity",
    flag: "--content-sensitivity <standard|sensitive>",
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
    flag: "--subject-root <path>",
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
  {
    field: "push_policy",
    flag: "--push-policy <open|guarded|blocked>",
    needsRetrofit: (m) => m.push_policy === undefined,
    // EF-09. Defaults to "open", so an operator who just presses enter keeps
    // today's behaviour exactly. NOTE: this only records the choice -- unlike
    // init, the retrofit does not install the hook or disable the push URL,
    // because an update should not silently start blocking pushes in a repo
    // someone is mid-workflow in (ARC-034 decision 7). ARC-049 decision 2:
    // update prints pushPolicyNotice() instead, naming `spell block-push`.
    ask: async () => {
      const push_policy = (await select({
        message: "Should this repository be allowed to push to a remote?",
        choices: [
          { value: "open", name: "Yes — normal repository" },
          { value: "guarded", name: "Sensitive, but keep push working — remind me instead" },
          { value: "blocked", name: "No — block pushes" },
        ],
        default: "open",
      })) as PushPolicy;
      return { push_policy };
    },
  },
];

/**
 * What `spell update` prints after it records a push_policy (ARC-049
 * decision 2). Update never installs controls (ARC-034 decision 7), so a
 * recorded "blocked" is not yet in force and must say so.
 */
export function pushPolicyNotice(policy: PushPolicy | undefined): string[] {
  if (policy === "blocked") {
    return [
      "",
      '  ! Required action: push_policy is now recorded as "blocked", but it is NOT enforced yet.',
      "    `spell update` never installs push controls. Pushes from this repository still work",
      "    until you run:",
      "",
      "      spell block-push",
      "",
    ];
  }
  if (policy === "guarded") {
    return [
      "",
      '  push_policy is now recorded as "guarded". Nothing is installed for it: `spell doctor`',
      "  reports it, and push-performing spells state the policy and ask before pushing.",
      "",
    ];
  }
  return [];
}

/**
 * Runs every retrofit question the installed manifest predates, in order.
 * Returns the partial patch to merge into the manifest being written.
 * Returns {} immediately (no questions, no console output) if nothing
 * applies -- callers should only invoke this outside dry-run and
 * non-interactive modes.
 */
export async function runManifestRetrofits(
  manifest: ArcaneManifest,
  targetDir?: string,
): Promise<Partial<ArcaneManifest>> {
  const applicable = MANIFEST_RETROFITS.filter((r) => r.needsRetrofit(manifest));
  if (applicable.length === 0) return {};

  console.log();
  console.log(
    `This install predates ${applicable.length} manifest field${applicable.length === 1 ? "" : "s"} -- a couple of quick questions:`,
  );

  let patch: Partial<ArcaneManifest> = {};
  for (const retrofit of applicable) {
    const answer = await retrofit.ask({ ...manifest, ...patch }, targetDir);
    patch = { ...patch, ...answer };
  }
  return patch;
}

/**
 * The command line that answers every still-pending question by flags, for a
 * run that could not ask them (PRD D-02). Undefined when nothing is pending.
 */
export function manifestFlagLine(manifest: ArcaneManifest): string[] | undefined {
  const pending = MANIFEST_RETROFITS.filter((r) => r.needsRetrofit(manifest));
  if (pending.length === 0) return undefined;
  const lines = [`spell update ${pending.map((r) => r.flag).join(" ")}`];
  if (pending.some((r) => r.field === "tracking_mode")) {
    lines.push("(--tracking-mode external also needs --external-provider <ado|github|jira|other>)");
  }
  return lines;
}

/** An operator-facing refusal of a manifest flag; the CLI prints it and exits 1. */
export class ManifestFlagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestFlagError";
  }
}

const FLAG_NAMES: Record<string, string> = {
  role: "--role",
  tracking_mode: "--tracking-mode",
  external_provider: "--external-provider",
  content_sensitivity: "--content-sensitivity",
  subject_root: "--subject-root",
  push_policy: "--push-policy",
};

const PUSH_POLICY_STRICTNESS: Record<PushPolicy, number> = { open: 0, guarded: 1, blocked: 2 };

export function hasManifestFlags(flags: ManifestFlags | undefined): flags is ManifestFlags {
  return flags !== undefined && Object.values(flags).some((v) => v !== undefined);
}

/**
 * Validates the manifest-question flags and returns the patch they make to
 * `current` (an empty object for a fresh init). Throws ManifestFlagError.
 *
 * A flag may answer an unset question or TIGHTEN push_policy. It never
 * changes a recorded answer, and it never loosens push_policy: ARC-034
 * decision 6 keeps that interactive-only, in `spell unblock-push`.
 */
export function resolveManifestFlags(
  flags: ManifestFlags | undefined,
  current: Partial<ArcaneManifest>,
  manifestPath: string,
): Partial<ArcaneManifest> {
  if (!hasManifestFlags(flags)) return {};

  const requested: Partial<Record<keyof ArcaneManifest, unknown>> = {};
  if (flags.role !== undefined) requested.role = flags.role;
  if (flags.trackingMode !== undefined) requested.tracking_mode = flags.trackingMode;
  if (flags.externalProvider !== undefined) requested.external_provider = flags.externalProvider;
  if (flags.contentSensitivity !== undefined) requested.content_sensitivity = flags.contentSensitivity;
  if (flags.subjectRoot !== undefined) requested.subject_root = flags.subjectRoot;
  if (flags.pushPolicy !== undefined) requested.push_policy = flags.pushPolicy;

  const invalid = (error: ManifestInvalidFieldError): ManifestFlagError => {
    const allowed = error.field === "role" ? ["hub", "consumer"] : MANIFEST_ENUM_VALUES[error.field];
    const hint = allowed ? ` Valid values: ${allowed.join(", ")}.` : "";
    return new ManifestFlagError(`Invalid ${FLAG_NAMES[error.field] ?? error.field}: ${error.message}${hint}`);
  };
  // role has no manifest validator of its own; same error class, same wording.
  if (requested.role !== undefined && requested.role !== "hub" && requested.role !== "consumer") {
    throw invalid(new ManifestInvalidFieldError(manifestPath, "role", requested.role));
  }
  try {
    validateManifestFields(requested as Partial<ArcaneManifest>, manifestPath);
  } catch (error) {
    if (error instanceof ManifestInvalidFieldError) throw invalid(error);
    throw error;
  }

  if (requested.external_provider !== undefined && requested.tracking_mode !== "external") {
    throw new ManifestFlagError("--external-provider applies only together with --tracking-mode external.");
  }
  if (requested.tracking_mode === "external" && requested.external_provider === undefined) {
    throw new ManifestFlagError(
      "--tracking-mode external needs --external-provider <ado|github|jira|other> as well.",
    );
  }
  if (requested.tracking_mode === "internal") requested.external_provider = null;

  const patch: Partial<Record<keyof ArcaneManifest, unknown>> = {};
  for (const field of Object.keys(FLAG_NAMES) as (keyof ArcaneManifest)[]) {
    if (!(field in requested)) continue;
    const value = requested[field];
    const recorded = current[field];
    if (recorded === undefined) {
      patch[field] = value;
      continue;
    }
    if (field === "push_policy") {
      const from = PUSH_POLICY_STRICTNESS[recorded as PushPolicy];
      const to = PUSH_POLICY_STRICTNESS[value as PushPolicy];
      if (to < from) {
        throw new ManifestFlagError(
          `--push-policy ${String(value)} would loosen this repository's recorded push_policy ` +
            `"${String(recorded)}". No flag can loosen it: run \`spell unblock-push\` from an ` +
            "interactive terminal.",
        );
      }
      if (to > from) patch[field] = value;
      continue;
    }
    if (recorded === value) continue;
    // external_provider is implied by --tracking-mode internal; name the flag the operator typed.
    const flag =
      field === "external_provider" && flags.externalProvider === undefined ? "--tracking-mode" : FLAG_NAMES[field];
    throw new ManifestFlagError(
      `${flag} conflicts with the recorded ${field}: ${JSON.stringify(recorded)}. A flag only answers ` +
        "a question that has no recorded answer; change .arcane.json deliberately if the recorded " +
        "value is wrong.",
    );
  }
  return patch as Partial<ArcaneManifest>;
}

/** One line per field a flag recorded, for the run's output. */
export function describeFlagPatch(patch: Partial<ArcaneManifest>): string[] {
  return Object.entries(patch)
    .filter(([field]) => field in FLAG_NAMES)
    .map(([field, value]) => `${field}: ${JSON.stringify(value)}`);
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
