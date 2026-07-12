import { join } from "node:path";
import { copyFile, copyDirectory } from "../modules/copier.js";
import {
  readManifest,
  writeManifest,
  addComponent,
  hasComponent,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { getComponent, ComponentNotFoundError } from "../modules/registry.js";
import type { InstalledComponent, SpellAddOptions } from "../types.js";

/**
 * Runs the `spell add <component>` command.
 *
 * @param name  Component name to install
 * @param options  CLI flags (force, dryRun)
 * @param targetDir  Directory containing the Arcane installation
 * @param assetsDir  Path to the bundled assets root
 * @param packageVersion  Current package version string
 */
export async function runAdd(
  name: string,
  options: SpellAddOptions,
  targetDir: string,
  assetsDir: string,
  packageVersion: string,
): Promise<void> {
  // Read existing manifest (must be initialized first)
  let manifest;
  try {
    manifest = await readManifest(targetDir);
  } catch (err) {
    if (err instanceof ManifestNotFoundError) {
      console.error(
        'Not initialized. Run "spell init" first before adding components.',
      );
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw err;
  }

  // Look up the component in the registry
  let component;
  try {
    component = getComponent(name);
  } catch (err) {
    if (err instanceof ComponentNotFoundError) {
      console.error(err.message);
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw err;
  }

  // Check if already installed
  if (hasComponent(manifest, name)) {
    console.log(
      `Component "${name}" is already installed. Use "spell update" to update it.`,
    );
    return;
  }

  // Copy files and directories
  let fileCount = 0;
  const installedFiles: string[] = [];
  for (const file of component.files) {
    const srcPath = join(assetsDir, file);
    if (options.dryRun) {
      console.log(`  [dry-run] Would copy: ${file}`);
    } else {
      await copyFile(srcPath, targetDir, file, { force: options.force });
    }
    installedFiles.push(file);
    fileCount++;
  }
  for (const dir of component.directories ?? []) {
    const srcDirPath = join(assetsDir, dir);
    if (options.dryRun) {
      console.log(`  [dry-run] Would copy directory: ${dir}/`);
    } else {
      const copied = await copyDirectory(srcDirPath, targetDir, dir, { force: options.force });
      installedFiles.push(...copied);
      fileCount += copied.length;
    }
  }

  if (options.dryRun) {
    console.log(
      `\n[dry-run] Would add component "${name}" \u2014 ${fileCount} files`,
    );
    return;
  }

  // Update manifest
  const newComponent: InstalledComponent = {
    name,
    files: installedFiles,
    installedVersion: packageVersion,
  };
  const updated = addComponent(manifest, newComponent);
  await writeManifest(targetDir, updated);

  console.log(
    `\n\u2713 Added component "${name}" \u2014 ${fileCount} files copied`,
  );
}
