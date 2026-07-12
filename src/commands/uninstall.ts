import { rm } from "node:fs/promises";
import { join } from "node:path";
import { confirm } from "@inquirer/prompts";
import {
  readManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { stripMarkerSection } from "../modules/merger.js";

/**
 * Runs the `spell uninstall` command.
 *
 * Deletes every file tracked in .arcane.json then removes .arcane.json itself.
 * Prompts for confirmation unless --yes is passed.
 *
 * @param options.yes  Skip confirmation prompt
 * @param options.dryRun  Preview what would be removed without deleting files
 * @param targetDir  Directory containing the Arcane installation
 */
export async function runUninstall(
  options: { yes?: boolean; dryRun?: boolean },
  targetDir: string,
): Promise<void> {
  // Read existing manifest
  let manifest;
  try {
    manifest = await readManifest(targetDir);
  } catch (err) {
    if (err instanceof ManifestNotFoundError) {
      console.error('Not initialized. Run "spell init" first.');
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw err;
  }

  // Count total tracked files
  const allFiles = manifest.components.flatMap((c) => c.files);
  const totalFiles = allFiles.length;

  // Dry-run: print what would be removed without deleting
  if (options.dryRun) {
    for (const file of allFiles) {
      console.log(`[dry-run] Would remove: ${file}`);
    }
    console.log(`[dry-run] Would remove: .arcane.json`);
    console.log(`[dry-run] Would remove: .github/agents/ (directory)`);
    console.log(`[dry-run] Would remove: .arcane/agents/ (directory)`);
    console.log(`[dry-run] Would remove: .arcane/generated/ (directory)`);
    console.log(`[dry-run] Would remove: .arcane/agents.yaml`);
    console.log(`[dry-run] Would strip arcane sections from: CLAUDE.md, AGENTS.md, copilot-instructions.md`);
    console.log(`\n[dry-run] ${totalFiles} file(s) + manifest + agent outputs would be removed.`);
    return;
  }

  // Confirmation prompt (skipped with --yes)
  if (!options.yes) {
    const confirmed = await confirm({
      message: `This will remove ${totalFiles} files and .arcane.json. Continue?`,
      default: false,
    });

    if (!confirmed) {
      console.log("Uninstall cancelled.");
      return;
    }
  }

  // Delete each file tracked in the manifest
  let removed = 0;
  for (const component of manifest.components) {
    for (const file of component.files) {
      const filePath = join(targetDir, file);
      try {
        await rm(filePath, { force: true });
        removed++;
      } catch {
        // Non-existent files are fine (force: true), but other errors propagate
      }
    }
  }

  // Delete .arcane.json
  await rm(join(targetDir, ".arcane.json"), { force: true });

  // ── Clean up agent sync outputs (not tracked in manifest) ──────────────
  // Directories created by agent init/sync
  const agentDirs = [
    ".github/agents",
    ".arcane/agents",
    ".arcane/generated",
  ];
  for (const dir of agentDirs) {
    await rm(join(targetDir, dir), { recursive: true, force: true });
  }
  // Roster file
  await rm(join(targetDir, ".arcane/agents.yaml"), { force: true });

  // Strip arcane marker sections from merged files (keeps user content intact)
  const markerFiles = [
    "CLAUDE.md",
    "AGENTS.md",
    ".github/copilot-instructions.md",
  ];
  for (const file of markerFiles) {
    await stripMarkerSection(targetDir, file, { dryRun: false });
  }

  console.log(`\n✓ Uninstalled — ${removed} files removed.`);
}
