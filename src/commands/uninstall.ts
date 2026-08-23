import { rm } from "node:fs/promises";
import { join } from "node:path";
import { confirm } from "@inquirer/prompts";
import {
  readManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { stripMarkerSection } from "../modules/merger.js";
import { isHookEnforced, blockedRemotes } from "../modules/push-safety.js";

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

  // A push-blocked repository must not be uninstalled while the block stands.
  //
  // Uninstall deletes .arcane.json but has no idea about core.hooksPath or the
  // sentinel push URLs, so the repo was left unable to push while `spell
  // unblock-push` -- the only supported way out -- refused to run because the
  // manifest it reads was gone. The operator was told "Uninstalled" and handed
  // a repository whose recovery required hand-editing git config.
  //
  // Refusing is the right shape rather than silently unblocking: ARC-034 R5
  // makes lifting the block a deliberate, interactive, separately-confirmed act,
  // and quietly doing it as a side effect of `uninstall --yes` would hand any
  // script exactly the bypass that command exists to deny.
  // Keyed on what the repository ACTUALLY has, not only on what the manifest
  // declares. A manifest-only check is the same declaration-versus-enforcement
  // confusion this feature exists to remove, and it is reachable without anyone
  // hand-editing: a partially-failed `unblock-push` writes push_policy "open"
  // while remotes stay blocked, after which uninstall would strand the repo
  // exactly as before.
  const policy = manifest.push_policy ?? "open";
  const controlsInForce =
    (await isHookEnforced(targetDir)) || (await blockedRemotes(targetDir)).length > 0;
  if ((policy === "blocked" || controlsInForce) && !options.dryRun) {
    const why =
      policy === "blocked"
        ? `this repository's push_policy is "blocked"`
        : `this repository still has Arcane's push block in force (the manifest says "${policy}", ` +
          "but the controls are actually installed)";
    console.error(
      `Refusing to uninstall: ${why}.\n` +
        "Uninstalling now would delete .arcane.json while leaving the pre-push hook and the\n" +
        "disabled push URLs in place — the repository could not push, and `spell unblock-push`\n" +
        "would no longer recognise it.\n\n" +
        "Run `spell unblock-push` first (interactive), then uninstall.",
    );
    process.exit(1);
    return; // guard: process.exit is mocked in tests
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
    if (policy === "blocked" || controlsInForce) {
      console.log(
        `[dry-run] BUT the real run would refuse: Arcane's push block is in force. Run \`spell unblock-push\` first.`,
      );
    }
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
