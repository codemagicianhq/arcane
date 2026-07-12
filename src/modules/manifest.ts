import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ArcaneManifest,
  InstalledComponent,
  Profile,
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

const MANIFEST_FILE = ".arcane.json";

function manifestPath(targetDir: string): string {
  return path.join(targetDir, MANIFEST_FILE);
}

/**
 * Reads .arcane.json from targetDir.
 * Throws ManifestNotFoundError if the file is missing.
 * Throws ManifestCorruptError if the file contains invalid JSON.
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

  try {
    return JSON.parse(content) as ArcaneManifest;
  } catch {
    throw new ManifestCorruptError(filePath);
  }
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
