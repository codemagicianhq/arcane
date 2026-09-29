import { stat } from "node:fs/promises";
import { join } from "node:path";
import { copyFile, fileExists, hashFile, listDirectoryFiles } from "./copier.js";
import type { RegistryComponent } from "../types.js";

export type DestinationState = "missing" | "identical" | "differs";

export interface PlannedFile {
  /** Installed path, relative to the repository root. */
  file: string;
  /** Absolute path of the packaged file it is copied from. */
  src: string;
  state: DestinationState;
}

/**
 * What installing one component would do, decided from the disk before
 * anything is written. `spell add` and `spell update` both consume it, so a
 * dry run and the real run cannot disagree (ARC-052 decision 3).
 */
export interface InstallPlan {
  component: RegistryComponent;
  /** Every file the component ships, directories flattened. */
  files: PlannedFile[];
  /** Files that will be written: absent, or present under `force`. */
  toCopy: PlannedFile[];
  /** Present and user-owned (`skipExisting`): left alone, and not recorded. */
  kept: PlannedFile[];
  /** Present and not user-owned: refuse unless the caller forces. */
  conflicts: PlannedFile[];
}

export async function planComponentInstall(
  component: RegistryComponent,
  targetDir: string,
  assetsDir: string,
  opts: { force?: boolean } = {},
): Promise<InstallPlan> {
  const files: PlannedFile[] = [];
  const stateOf = async (file: string, src: string): Promise<PlannedFile> => {
    const dest = join(targetDir, file);
    if (!(await fileExists(dest))) return { file, src, state: "missing" };
    if ((await stat(dest)).isDirectory()) return { file, src, state: "differs" };
    const same = (await hashFile(dest)) === (await hashFile(src));
    return { file, src, state: same ? "identical" : "differs" };
  };
  for (const file of component.files) {
    files.push(await stateOf(file, join(assetsDir, component.sourceOverrides?.[file] ?? file)));
  }
  for (const dir of component.directories ?? []) {
    const srcDir = join(assetsDir, dir);
    for (const file of await listDirectoryFiles(srcDir, dir)) {
      files.push(await stateOf(file, join(assetsDir, file)));
    }
  }

  const present = files.filter((f) => f.state !== "missing");
  const missing = files.filter((f) => f.state === "missing");
  if (opts.force) return { component, files, toCopy: files, kept: [], conflicts: [] };
  return component.skipExisting
    ? { component, files, toCopy: missing, kept: present, conflicts: [] }
    : { component, files, toCopy: missing, kept: [], conflicts: present };
}

export interface InstalledFiles {
  files: string[];
  fileHashes: Record<string, string>;
}

/** Writes the plan's `toCopy` set and returns what to record in the manifest. */
export async function executeInstallPlan(plan: InstallPlan, targetDir: string): Promise<InstalledFiles> {
  const files: string[] = [];
  const fileHashes: Record<string, string> = {};
  for (const { file, src } of plan.toCopy) {
    fileHashes[file] = await copyFile(src, targetDir, file, { force: true });
    files.push(file);
  }
  return { files, fileHashes };
}
