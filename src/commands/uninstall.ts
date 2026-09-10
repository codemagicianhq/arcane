import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { confirm } from "@inquirer/prompts";
import { removeWithin } from "../modules/copier.js";
import {
  readManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { stripMarkerSection } from "../modules/merger.js";
import { isHookEnforced, blockedRemotes } from "../modules/push-safety.js";
import { removeSecretsPrecommitHook } from "../modules/secrets-scan.js";
import {
  USER_TIER_SPELLS_DIR,
  describeFanoutOutcomes,
  misplacedUserManifestMessage,
  removeDirectoryIfEmpty,
  resolveInstallScope,
  syncUserTierFanout,
} from "../modules/user-tier.js";
import type { ArcaneManifest } from "../types.js";

/**
 * Runs the `spell uninstall` command.
 *
 * Deletes every file tracked in .arcane.json then removes .arcane.json itself.
 * Prompts for confirmation unless --yes is passed.
 *
 * @param options.yes  Skip confirmation prompt
 * @param options.dryRun  Preview what would be removed without deleting files
 * @param options.user  Uninstall the per-user tier at ~/.arcane instead (CS-04)
 * @param targetDir  Directory containing the Arcane installation
 */
export async function runUninstall(
  options: { yes?: boolean; dryRun?: boolean; user?: boolean },
  targetDir: string,
): Promise<void> {
  // Read existing manifest
  let manifest;
  try {
    manifest = await readManifest(targetDir);
  } catch (err) {
    if (err instanceof ManifestNotFoundError) {
      console.error(`Not initialized. Run "spell init${options.user ? " --user" : ""}" first.`);
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw err;
  }

  // ARC-045 decision 3 / CS-04: the user tier has no push policy, no agent
  // outputs, no marker sections and no hooks -- only the store and the client
  // files it fanned out, which come off under the same hash rule they went
  // on with.
  const resolvedScope = resolveInstallScope(targetDir, manifest.scope, options.user);
  if (resolvedScope.misplacedUserManifest) {
    console.error(misplacedUserManifestMessage(targetDir));
    process.exit(1);
    return;
  }
  if (resolvedScope.scope === "user") {
    await uninstallUserTier(options, targetDir, manifest);
    return;
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

  // Delete each file tracked in the manifest -- through the same traversal
  // guard every write path has: a manifest entry that resolves outside the
  // repository is named and skipped, never deleted.
  let removed = 0;
  for (const component of manifest.components) {
    for (const file of component.files) {
      try {
        await removeWithin(targetDir, file);
        removed++;
      } catch (err) {
        console.log(
          `  ! Skipped ${file}: ${err instanceof Error ? err.message : String(err)}`,
        );
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

  // Secrets pre-commit hook (ARC-037): installed unconditionally by `spell
  // init` regardless of push_policy, so -- unlike the push-safety pre-push
  // hook -- there is no push_policy invariant above already guaranteeing
  // nothing is left behind. Without this, the hook would keep running
  // `spell doctor --leaks` against a project that no longer has an
  // .arcane.json to configure it, since `spell` itself is a separate global
  // install this command never touches. Best-effort: a failure here is a
  // leftover local convenience hook, not a reason to report uninstall itself
  // as failed.
  try {
    await removeSecretsPrecommitHook(targetDir);
  } catch {
    // Non-fatal.
  }

  console.log(`\n✓ Uninstalled — ${removed} files removed.`);
}

// ─── spell uninstall --user ───────────────────────────────────────────────────

/**
 * Removes the user tier: every client file the store manifest recorded (only
 * where its content still matches what Arcane wrote -- an edited one is kept
 * and named, exactly as `update --user` treats it), then the store's spells
 * and manifest, then the store directories if they are empty. `~/.arcane`
 * itself is removed only when nothing else lives there (the version cache
 * and the org-token file share it).
 */
async function uninstallUserTier(
  options: { yes?: boolean; dryRun?: boolean },
  storeRoot: string,
  manifest: ArcaneManifest,
): Promise<void> {
  const homeDir = dirname(storeRoot);
  const storeFiles = manifest.components.flatMap((c) => c.files);
  const recordedCount = Object.keys(manifest.fanout ?? {}).length;

  if (options.dryRun) {
    for (const file of storeFiles) console.log(`[dry-run] Would remove: ${storeRoot}/${file}`);
    const preview = await syncUserTierFanout({
      homeDir,
      storeRoot,
      spellIds: [],
      previous: manifest.fanout,
      dryRun: true,
    });
    for (const line of describeFanoutOutcomes(preview.outcomes, true)) console.log(line);
    console.log(`[dry-run] Would remove: ${storeRoot}/.arcane.json`);
    console.log(
      `\n[dry-run] ${storeFiles.length} spell(s), up to ${recordedCount} client file(s) + manifest would be removed from the user tier.`,
    );
    return;
  }

  if (!options.yes) {
    const confirmed = await confirm({
      message: `This will remove ${storeFiles.length} spells, ${recordedCount} client files and .arcane.json from the user tier at ${storeRoot}. Continue?`,
      default: false,
    });
    if (!confirmed) {
      console.log("Uninstall cancelled.");
      return;
    }
  }

  // Client files first (they reference the store), under the hash rule.
  const fanout = await syncUserTierFanout({
    homeDir,
    storeRoot,
    spellIds: [],
    previous: manifest.fanout,
  });

  let removed = 0;
  for (const file of storeFiles) {
    try {
      await removeWithin(storeRoot, file);
      removed++;
    } catch (err) {
      console.log(`  ! Skipped ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await rm(join(storeRoot, ".arcane.json"), { force: true });
  await removeDirectoryIfEmpty(join(storeRoot, USER_TIER_SPELLS_DIR));
  await removeDirectoryIfEmpty(storeRoot);

  for (const line of describeFanoutOutcomes(fanout.outcomes)) console.log(`  ${line}`);
  const pruned = fanout.outcomes.filter((o) => o.status === "pruned").length;
  const kept = fanout.outcomes.filter((o) => o.status === "kept-edited").length;
  console.log(
    `\n✓ Uninstalled the user tier — ${removed} spells and ${pruned} client files removed${
      kept > 0 ? `; ${kept} edited client file(s) kept` : ""
    }.`,
  );
}
