import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { copyFile, fileExists, hashFile, listDirectoryFiles, removeEmptyAncestors, removeWithin } from "./copier.js";
import type { RegistryComponent } from "../types.js";

export type DestinationState = "missing" | "identical" | "differs" | "directory";

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
  /** Files that will be written: absent, identical (adopted), or present under `force`. */
  toCopy: PlannedFile[];
  /** Present and user-owned (`skipExisting`): left alone, and not recorded. */
  kept: PlannedFile[];
  /** Present and not user-owned: refuse unless the caller forces. A directory is always refused. */
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
    if ((await stat(dest)).isDirectory()) return { file, src, state: "directory" };
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

  const of = (...states: DestinationState[]) => files.filter((f) => states.includes(f.state));
  // --force overwrites a file's content; it never deletes a tree, so a directory stays a conflict.
  if (opts.force) {
    return { component, files, toCopy: of("missing", "identical", "differs"), kept: [], conflicts: of("directory") };
  }
  if (component.skipExisting) {
    return { component, files, toCopy: of("missing"), kept: of("identical", "differs", "directory"), conflicts: [] };
  }
  return { component, files, toCopy: of("missing", "identical"), kept: [], conflicts: of("differs", "directory") };
}

export interface InstalledFiles {
  files: string[];
  fileHashes: Record<string, string>;
}

/**
 * Writes the plan's `toCopy` set and returns what to record in the manifest.
 * A failure part-way undoes the files already written (a created file is
 * removed, an overwritten one gets its previous content back) before the
 * error is rethrown, so nothing is half-installed and unrecorded.
 */
export async function executeInstallPlan(plan: InstallPlan, targetDir: string): Promise<InstalledFiles> {
  const files: string[] = [];
  const fileHashes: Record<string, string> = {};
  const written: { file: string; previous: Buffer | null }[] = [];
  try {
    for (const { file, src, state } of plan.toCopy) {
      const previous = state === "missing" ? null : await readFile(join(targetDir, file));
      fileHashes[file] = await copyFile(src, targetDir, file, { force: true });
      written.push({ file, previous });
      files.push(file);
    }
  } catch (err) {
    await rollback(written, targetDir);
    throw err;
  }
  return { files, fileHashes };
}

async function rollback(written: { file: string; previous: Buffer | null }[], targetDir: string): Promise<void> {
  for (const { file, previous } of [...written].reverse()) {
    try {
      if (previous === null) {
        await removeWithin(targetDir, file);
        await removeEmptyAncestors(targetDir, file);
      } else {
        await writeFile(join(targetDir, file), previous);
      }
    } catch {
      // Best effort: the error that stopped the install is the one to report.
    }
  }
}
