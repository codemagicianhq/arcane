import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ArcaneManifest,
  ContentSensitivity,
  ExternalProvider,
  InstalledComponent,
  Profile,
  PushPolicy,
  TrackingMode,
} from "../types.js";

export class ManifestNotFoundError extends Error {
  constructor(manifestPath: string) {
    super(`Manifest not found at "${manifestPath}". Run "spell init" first.`);
    this.name = "ManifestNotFoundError";
  }
}

export class ManifestCorruptError extends Error {
  constructor(manifestPath: string) {
    super(
      `Manifest at "${manifestPath}" contains invalid JSON. It may be corrupted.`,
    );
    this.name = "ManifestCorruptError";
  }
}

/**
 * Distinct from ManifestCorruptError: the file IS valid JSON, but a field
 * holds a value outside its supported enum (EF-14 point 2 -- "reject
 * unsupported values rather than silently treating them as a provider").
 */
export class ManifestInvalidFieldError extends Error {
  constructor(manifestPath: string, field: string, value: unknown) {
    super(
      `Manifest at "${manifestPath}" has an unsupported value for "${field}": ${JSON.stringify(value)}.`,
    );
    this.name = "ManifestInvalidFieldError";
  }
}

const MANIFEST_FILE = ".arcane.json";

const VALID_TRACKING_MODES: TrackingMode[] = ["internal", "external"];
const VALID_EXTERNAL_PROVIDERS: ExternalProvider[] = ["ado", "github", "jira", "other"];
const VALID_CONTENT_SENSITIVITY: ContentSensitivity[] = ["standard", "sensitive"];
const VALID_PUSH_POLICIES: PushPolicy[] = ["open", "guarded", "blocked"];

/**
 * `subject_root` is a free-form relative path, so it gets shape rules rather
 * than an enum. It is resolved against the repository root and handed to
 * spells, so a value that escapes the repo (absolute, or containing `..`)
 * would point agents at files outside the project entirely. "." is explicitly
 * legal: it means the repository root IS the subject tree (EF-07).
 */
/**
 * True when a subject_root value is safe to store. Exported so the interactive
 * prompt can reject a bad value in place rather than writing it and failing on
 * every subsequent command until the operator hand-edits .arcane.json.
 */
export function isValidSubjectRoot(value: string): boolean {
  const invalid =
    value.trim() === "" ||
    path.isAbsolute(value) ||
    // Windows drive-relative ("C:docs") and UNC-ish values also escape.
    /^[a-zA-Z]:/.test(value) ||
    value.startsWith("\\\\") ||
    value.startsWith("\\") ||
    value.split(/[\\/]/).includes("..") ||
    // A stored subject_root is interpolated into agent prompts downstream, so
    // keep it a single path-shaped token rather than a multi-line payload.
    /[\r\n\0]/.test(value);
  return !invalid;
}

function validateSubjectRoot(value: string, filePath: string): void {
  if (!isValidSubjectRoot(value)) {
    throw new ManifestInvalidFieldError(filePath, "subject_root", value);
  }
}

function manifestPath(targetDir: string): string {
  return path.join(targetDir, MANIFEST_FILE);
}

function validateTrackingFields(manifest: ArcaneManifest, filePath: string): void {
  if (
    manifest.tracking_mode !== undefined &&
    !VALID_TRACKING_MODES.includes(manifest.tracking_mode)
  ) {
    throw new ManifestInvalidFieldError(filePath, "tracking_mode", manifest.tracking_mode);
  }
  if (
    manifest.external_provider !== undefined &&
    manifest.external_provider !== null &&
    !VALID_EXTERNAL_PROVIDERS.includes(manifest.external_provider)
  ) {
    throw new ManifestInvalidFieldError(filePath, "external_provider", manifest.external_provider);
  }
  if (
    manifest.content_sensitivity !== undefined &&
    !VALID_CONTENT_SENSITIVITY.includes(manifest.content_sensitivity)
  ) {
    throw new ManifestInvalidFieldError(
      filePath,
      "content_sensitivity",
      manifest.content_sensitivity,
    );
  }
  if (
    manifest.push_policy !== undefined &&
    !VALID_PUSH_POLICIES.includes(manifest.push_policy)
  ) {
    throw new ManifestInvalidFieldError(filePath, "push_policy", manifest.push_policy);
  }
  if (manifest.subject_root !== undefined && manifest.subject_root !== null) {
    if (typeof manifest.subject_root !== "string") {
      throw new ManifestInvalidFieldError(filePath, "subject_root", manifest.subject_root);
    }
    validateSubjectRoot(manifest.subject_root, filePath);
  }
}

/**
 * Reads .arcane.json from targetDir.
 * Throws ManifestNotFoundError if the file is missing.
 * Throws ManifestCorruptError if the file contains invalid JSON.
 * Throws ManifestInvalidFieldError if tracking_mode/external_provider hold
 * an unsupported value.
 */
export async function readManifest(targetDir: string): Promise<ArcaneManifest> {
  const filePath = manifestPath(targetDir);
  let content: string;

  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ManifestNotFoundError(filePath);
    }
    throw err;
  }

  let manifest: ArcaneManifest;
  try {
    manifest = JSON.parse(content) as ArcaneManifest;
  } catch {
    throw new ManifestCorruptError(filePath);
  }

  validateTrackingFields(manifest, filePath);
  return manifest;
}

/**
 * Writes the manifest to .arcane.json in targetDir with 2-space indentation.
 */
export async function writeManifest(
  targetDir: string,
  manifest: ArcaneManifest,
): Promise<void> {
  const filePath = manifestPath(targetDir);
  await writeFile(filePath, JSON.stringify(manifest, null, 2), "utf-8");
}

/**
 * Creates a new .arcane.json in targetDir with an empty components array.
 * Returns the created manifest.
 */
export async function createManifest(
  targetDir: string,
  profile: Profile,
  version: string,
): Promise<ArcaneManifest> {
  const manifest: ArcaneManifest = {
    version,
    profile,
    installedAt: new Date().toISOString(),
    components: [],
  };
  await writeManifest(targetDir, manifest);
  return manifest;
}

/**
 * Pure function — returns a new manifest with the component appended.
 * Does not write to disk.
 */
export function addComponent(
  manifest: ArcaneManifest,
  component: InstalledComponent,
): ArcaneManifest {
  return {
    ...manifest,
    components: [...manifest.components, component],
  };
}

/**
 * Pure function — returns a new manifest with the named component removed.
 * Does not write to disk.
 */
export function removeComponent(
  manifest: ArcaneManifest,
  name: string,
): ArcaneManifest {
  return {
    ...manifest,
    components: manifest.components.filter((c) => c.name !== name),
  };
}

/**
 * Returns true if a component with the given name exists in the manifest.
 */
export function hasComponent(manifest: ArcaneManifest, name: string): boolean {
  return manifest.components.some((c) => c.name === name);
}
