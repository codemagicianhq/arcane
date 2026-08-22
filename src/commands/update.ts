import { join } from "node:path";
import { copyFile, copyDirectory, fileExists } from "../modules/copier.js";
import {
  readManifest,
  writeManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { inspectGitRepository } from "../modules/git.js";
import { getComponent, ComponentNotFoundError } from "../modules/registry.js";
import { MANIFEST_RETROFITS, runManifestRetrofits, offerRegistryScaffold } from "../modules/hub.js";
import type { ArcaneManifest, InstalledComponent, SpellUpdateOptions } from "../types.js";

/**
 * Runs the `spell update` command.
 *
 * For each installed component, looks up the current registry definition and
 * re-copies files from the current package assets. User-owned files in a
 * skipExisting component are preserved when present and backfilled when absent.
 * The manifest is updated with the new file paths so future updates remain
 * correct even when source paths change between versions.
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

  console.warn(
    `WARNING: Arcane v${packageVersion} update safety notice: commit your work before updating.`,
  );
  console.warn(
    "Updates can replace managed files. A clean committed baseline is required for recovery.",
  );

  const gitState = await inspectGitRepository(targetDir);
  if (gitState.status === "not-repository") {
    console.error(
      "Update refused: this directory is not a Git repository or Git is unavailable.",
    );
    process.exit(1);
    return;
  }
  if (gitState.status === "no-commits") {
    console.error(
      "Update refused: this repository has no commits. Commit the current baseline before updating.",
    );
    process.exit(1);
    return;
  }
  if (gitState.uncommittedChanges > 0) {
    console.error(
      `Update refused: this repository has ${gitState.uncommittedChanges} uncommitted change${gitState.uncommittedChanges === 1 ? "" : "s"}. Commit or otherwise clean the working tree before updating.`,
    );
    process.exit(1);
    return;
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
      const preserveExisting = component.skipExisting
        && await fileExists(join(targetDir, file));
      if (preserveExisting) {
        console.log(`  ${options.dryRun ? "[dry-run] Would preserve" : "Preserved"}: ${file}`);
      } else if (options.dryRun) {
        console.log(`  [dry-run] Would update: ${file}`);
        fileCount++;
      } else {
        await copyFile(srcPath, targetDir, file, { force: true });
        fileCount++;
      }
      updatedFiles.push(file);
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
    const applicableRetrofits = MANIFEST_RETROFITS.filter((r) => r.needsRetrofit(manifest));
    if (applicableRetrofits.length > 0) {
      console.log(
        `[dry-run] Would ask ${applicableRetrofits.length} manifest retrofit question${applicableRetrofits.length === 1 ? "" : "s"}: ${applicableRetrofits.map((r) => r.field).join(", ")}.`,
      );
    }
    return;
  }

  // Retrofit wizard: ask about any manifest field this install predates
  // (e.g. `role`), once, before writing the updated manifest.
  const retrofitPatch = await runManifestRetrofits(manifest);

  // Update manifest with new version, refreshed component file paths, and
  // any retrofit answers.
  const updated: ArcaneManifest = {
    ...manifest,
    version: packageVersion,
    components: updatedComponents,
    ...retrofitPatch,
  };
  await writeManifest(targetDir, updated);

  console.log(
    `\n\u2713 Updated ${fileCount} files.`,
  );

  // If this update just turned the repo into a hub, offer to scaffold the
  // venture registry from whatever already exists under business_root.
  if (manifest.role !== "hub" && updated.role === "hub") {
    await offerRegistryScaffold(targetDir, updated.business_root ?? "ventures");
  }
}
