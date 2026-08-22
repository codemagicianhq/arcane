import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ArcaneManifest,
  ExternalProvider,
  InstalledComponent,
  Profile,
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
const VALID_EXTERNAL_PROVIDERS: ExternalProvider[] = ["ado", "jira", "other"];

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
