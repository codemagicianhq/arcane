import { join } from "node:path";
import { copyFile, copyDirectory } from "../modules/copier.js";
import {
  readManifest,
  writeManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { getComponent, ComponentNotFoundError } from "../modules/registry.js";
import type { InstalledComponent, SpellUpdateOptions } from "../types.js";

/**
 * Runs the `spell update` command.
 *
 * For each installed component, looks up the current registry definition and
 * re-copies files from the current package assets, creating .bak siblings for
 * every overwritten file.  The manifest is updated with the new file paths so
 * future updates remain correct even when source paths change between versions.
 *
 * @param options  CLI flags (dryRun)
 * @param targetDir  Directory containing the Arcane installation
 * @param assetsDir  Path to the bundled assets root
 * @param packageVersion  Current package version string
 */
export async function runUpdate(
  options: SpellUpdateOptions,
  targetDir: string,
  assetsDir: string,
  packageVersion: string,
): Promise<void> {
  // Read existing manifest
  let manifest;
  try {
    manifest = await readManifest(targetDir);
  } catch (err) {
    if (err instanceof ManifestNotFoundError) {
      console.error(
        'Not initialized. Run "spell init" first before updating.',
      );
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw err;
  }

  // Already up to date
  if (manifest.version === packageVersion && manifest.components.length > 0) {
    console.log("Already up to date.");
    return;
  }

  if (manifest.components.length === 0) {
    console.log("No components installed. Nothing to update.");
    return;
  }

  let fileCount = 0;
  const updatedComponents: InstalledComponent[] = [];

  for (const installed of manifest.components) {
    // Look up the current registry definition (source of truth for file paths)
    let component;
    try {
      component = getComponent(installed.name);
    } catch (err) {
      if (err instanceof ComponentNotFoundError) {
        // Component removed from registry — skip but preserve manifest entry
        console.log(`  ! ${installed.name} not in registry — skipping.`);
        updatedComponents.push(installed);
        continue;
      }
      throw err;
    }

    // Copy files using current registry paths (handles path changes between versions)
    const updatedFiles: string[] = [];
    for (const file of component.files) {
      const srcPath = join(assetsDir, file);
      if (options.dryRun) {
        console.log(`  [dry-run] Would update: ${file}`);
      } else {
        await copyFile(srcPath, targetDir, file, { force: true });
      }
      updatedFiles.push(file);
      fileCount++;
    }
    // Also copy directories
    for (const dir of component.directories ?? []) {
      const srcDirPath = join(assetsDir, dir);
      if (options.dryRun) {
        console.log(`  [dry-run] Would update directory: ${dir}/`);
      } else {
        const copied = await copyDirectory(srcDirPath, targetDir, dir, { force: true });
        updatedFiles.push(...copied);
        fileCount += copied.length;
      }
    }

    updatedComponents.push({
      ...installed,
      files: updatedFiles,
      installedVersion: packageVersion,
    });
  }

  if (options.dryRun) {
    console.log(
      `\n[dry-run] Would update ${fileCount} files.`,
    );
    return;
  }

  // Update manifest with new version and refreshed component file paths
  const updated = { ...manifest, version: packageVersion, components: updatedComponents };
  await writeManifest(targetDir, updated);

  console.log(
    `\n\u2713 Updated ${fileCount} files.`,
  );
}
