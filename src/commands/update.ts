import { join } from "node:path";
import { readFile, writeFile, rm } from "node:fs/promises";
import { copyFile, copyDirectory, fileExists, hashFile } from "../modules/copier.js";
import {
  readManifest,
  writeManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { inspectGitRepository } from "../modules/git.js";
import {
  getComponent,
  ComponentNotFoundError,
  LEGACY_COMPONENT_MIGRATIONS,
} from "../modules/registry.js";
import { MANIFEST_RETROFITS, runManifestRetrofits, offerRegistryScaffold } from "../modules/hub.js";
import { merge3 } from "../modules/merge3.js";
import { fetchPublishedFile } from "../modules/npm-registry.js";
import { isClientShimPath } from "../modules/spell-compiler.js";
import type {
  ArcaneManifest,
  InstalledComponent,
  RegistryComponent,
  SpellUpdateOptions,
} from "../types.js";

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
/**
 * Rewrites manifest entries whose component was split or renamed in a later
 * release, so `update` can refresh their files instead of skipping them.
 *
 * Deterministic and idempotent: an already-migrated manifest contains no
 * legacy names, so this returns it unchanged. Entry order is preserved, with
 * each legacy entry's replacements expanded in place. Replacements inherit the
 * legacy entry's `installedVersion` and an empty file list -- the caller
 * immediately re-derives both from the registry, which is the source of truth
 * for what a component contains.
 *
 * Both legacy spell components map to the same replacement set, so a manifest
 * listing both (the common case) is deduped rather than producing doubles.
 */
export function migrateLegacyComponents(
  components: InstalledComponent[],
): InstalledComponent[] {
  const out: InstalledComponent[] = [];
  const seen = new Set<string>();

  for (const entry of components) {
    const replacements = LEGACY_COMPONENT_MIGRATIONS[entry.name];
    if (!replacements) {
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      out.push(entry);
      continue;
    }
    for (const name of replacements) {
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, files: [], installedVersion: entry.installedVersion });
    }
  }

  return out;
}

export type OrphanStatus = "pruned" | "reported" | "not-found";

/**
 * Resolves one orphaned file: previously tracked, no longer part of any
 * current component (TODO.md T10). Report-only unless `prune` is set, and
 * even then only deletes when the on-disk content still matches the hash
 * Arcane last recorded -- an operator edit is exactly as worth preserving
 * here as it is in the main update loop (ARC-038 decision 1's "do not
 * silently discard the edit" applies to deleting a file, not only
 * overwriting one). A file with no recorded hash (predates ARC-038, or was
 * never hashed) is reported but never auto-pruned -- there is nothing to
 * verify it against, and guessing is not this feature's job.
 */
export async function resolveOrphan(
  targetDir: string,
  file: string,
  recordedHash: string | undefined,
  prune: boolean,
): Promise<OrphanStatus> {
  const filePath = join(targetDir, file);
  if (!(await fileExists(filePath))) return "not-found";
  if (!prune) return "reported";

  if (recordedHash === undefined) {
    console.log(`  ! Orphaned, not pruned (no recorded hash to verify it's untouched): ${file}`);
    return "reported";
  }
  const currentHash = await hashFile(filePath);
  if (currentHash !== recordedHash) {
    console.log(`  ! Orphaned but edited since install — not pruning: ${file}`);
    return "reported";
  }
  await rm(filePath, { force: true });
  console.log(`  Pruned orphaned file: ${file}`);
  return "pruned";
}

/**
 * Tracked files that should be on disk but are not. Feeds the same-version
 * restore path in `runUpdate` (ARC-045 / CS-03): an operator who has ported a
 * customized client shim's edits into the canonical spell deletes the old
 * file and runs `spell update` to get the generated shim back -- at the
 * same version, since nothing else changed. Only files the current registry
 * still ships for that component count (anything else is an orphan, handled
 * by `resolveOrphan`), and `initOnly` components never do: `update` must not
 * create those at any version (EF-17). A component the registry no longer
 * knows has nothing to restore from.
 */
export async function findMissingTrackedFiles(
  targetDir: string,
  components: InstalledComponent[],
): Promise<string[]> {
  const missing: string[] = [];
  for (const installed of components) {
    let component: RegistryComponent;
    try {
      component = getComponent(installed.name);
    } catch {
      continue;
    }
    if (component.initOnly) continue;
    for (const file of installed.files) {
      if (!component.files.includes(file)) continue;
      if (!(await fileExists(join(targetDir, file)))) missing.push(file);
    }
  }
  return missing;
}

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

  // Already up to date -- unless a tracked file has gone missing, in which
  // case a same-version run restores exactly that and nothing else (the
  // ARC-045 / CS-03 remedy path; see findMissingTrackedFiles).
  let sameVersionRestore = false;
  if (manifest.version === packageVersion && manifest.components.length > 0) {
    const missing = await findMissingTrackedFiles(targetDir, manifest.components);
    if (missing.length === 0) {
      console.log("Already up to date.");
      return;
    }
    sameVersionRestore = true;
    console.log(
      `Already at v${packageVersion}, but ${missing.length} tracked file${missing.length === 1 ? " is" : "s are"} missing — restoring.`,
    );
  }

  if (manifest.components.length === 0) {
    console.log("No components installed. Nothing to update.");
    return;
  }

  let fileCount = 0;
  const updatedComponents: InstalledComponent[] = [];
  // ARC-038 decision 1: files whose merge produced genuine conflict markers,
  // collected across every component so the operator gets one summary at the
  // end rather than a per-file interruption -- the update still completes
  // for every other file either way.
  const conflictedFiles: string[] = [];
  // ARC-045 / CS-03: generated client shims the operator had edited, kept
  // untouched rather than merged -- see the per-file branch below.
  const customizedShims: string[] = [];
  // TODO.md T10: files tracked before this update that no longer belong to
  // any current component, reported always and deleted only with --prune
  // (and only when untouched -- see resolveOrphan).
  const orphanReport: Array<{ file: string; status: OrphanStatus }> = [];

  const componentsToUpdate = migrateLegacyComponents(manifest.components);

  for (const installed of componentsToUpdate) {
    // Look up the current registry definition (source of truth for file paths)
    let component;
    try {
      component = getComponent(installed.name);
    } catch (err) {
      if (err instanceof ComponentNotFoundError) {
        // Component removed from registry entirely -- every file it used to
        // track is now orphaned, not just individually dropped ones. Report
        // even during dry-run (that's the point of a preview); only the
        // actual deletion is dry-run-gated, inside resolveOrphan's `prune`.
        console.log(`  ! ${installed.name} not in registry — skipping.`);
        for (const file of installed.files) {
          const status = await resolveOrphan(
            targetDir,
            file,
            installed.fileHashes?.[file],
            Boolean(options.prune) && !options.dryRun,
          );
          orphanReport.push({ file, status });
        }
        // Drop the manifest entry once every file it tracked is gone or was
        // never there; otherwise keep it so a future update can retry
        // pruning what --prune (or a hash mismatch) left behind.
        if (
          options.prune &&
          !options.dryRun &&
          installed.files.every((f) => orphanReport.find((o) => o.file === f)?.status !== "reported")
        ) {
          continue;
        }
        updatedComponents.push(installed);
        continue;
      }
      throw err;
    }

    // Copy files using current registry paths (handles path changes between versions)
    const updatedFiles: string[] = [];
    const fileHashes: Record<string, string> = {};
    for (const file of component.files) {
      const srcPath = join(assetsDir, component.sourceOverrides?.[file] ?? file);
      const targetExists = await fileExists(join(targetDir, file));
      const preserveExisting = Boolean(component.skipExisting) && targetExists;
      const recordedHash = installed.fileHashes?.[file];

      // initOnly: update never creates these. Their appearance alone changes
      // how Git treats the whole repository, so adding one mid-life is the
      // operator's call, not a side effect of a version upgrade (EF-17).
      if (component.initOnly && !targetExists) {
        console.log(
          `  ! Missing: ${file} — not added automatically, because doing so would change how Git treats existing files. Run "spell add ${component.name}" if you want it.`,
        );
        continue;
      }

      // Same-version restore (see the up-to-date check above): a file that is
      // present keeps exactly its recorded state; only missing files fall
      // through to be written.
      if (sameVersionRestore && targetExists) {
        if (!preserveExisting || installed.files.includes(file)) {
          updatedFiles.push(file);
          if (recordedHash !== undefined) fileHashes[file] = recordedHash;
        }
        continue;
      }

      // ARC-038 decision 1: on-disk content that no longer matches what
      // Arcane last wrote means the operator edited this file, and that edit
      // must never be silently discarded.
      const editedByOperator =
        recordedHash !== undefined &&
        targetExists &&
        !preserveExisting &&
        (await hashFile(join(targetDir, file))) !== recordedHash;

      if (preserveExisting) {
        // skipExisting keeps its pre-ARC-038 whole-file behavior unchanged --
        // no hash tracking, no merge machinery (ARC-038 decision 1).
        console.log(`  ${options.dryRun ? "[dry-run] Would preserve" : "Preserved"}: ${file}`);
      } else if (editedByOperator && isClientShimPath(file)) {
        // ARC-045 decision 2 / CS-03: a generated client shim (Copilot
        // prompt, Claude command, Codex skill) carries no authored prose, so
        // there is nothing an operator's edit could be merged INTO. A
        // three-way merge here either reports success while leaving the edit
        // dangling under the new shim, or writes conflict markers over a body
        // that is gone -- both observed live against a real consumer fixture
        // (2026-09-09, features/codex-support/architecture.md). Keep the
        // operator's file byte-untouched, name it, and carry the previously
        // recorded hash forward: recording the edited content would make the
        // next update read the file as untouched and overwrite it; recording
        // nothing would drop it into the pre-ARC-038 overwrite path. The
        // canonical spell is written beside it as an ordinary new file, so the
        // spell keeps working in every client meanwhile.
        customizedShims.push(file);
        fileHashes[file] = recordedHash!;
        console.log(
          `  ${options.dryRun ? "[dry-run] Would keep" : "Kept"} customized (not merged): ${file}`,
        );
      } else if (options.dryRun) {
        console.log(`  [dry-run] Would ${sameVersionRestore ? "restore missing" : "update"}: ${file}`);
        fileCount++;
      } else {
        let handled = false;

        if (editedByOperator) {
          const oldVendorContent = await fetchPublishedFile(installed.installedVersion, file);
          if (oldVendorContent === undefined) {
            console.log(
              `  ! Could not fetch the previously published version of ${file} to merge your edits — left your version untouched. Update it manually if you want the latest.`,
            );
            // Untouched means still edited: keep the recorded hash so the
            // next update recognizes the edit again instead of reading the
            // file as Arcane-written and overwriting it.
            fileHashes[file] = recordedHash!;
            handled = true;
          } else {
            const [currentContent, newContent] = await Promise.all([
              readFile(join(targetDir, file), "utf-8"),
              readFile(srcPath, "utf-8"),
            ]);
            const result = merge3(oldVendorContent, currentContent, newContent);
            await writeFile(join(targetDir, file), result.content, "utf-8");
            // Record the VENDOR content's hash, not the merged file's. The
            // recorded hash means "what a clean install of this version
            // wrote"; recording the merged content made the next update read
            // the file as untouched and overwrite it, so an operator's edit
            // survived exactly one update (observed live 2026-09-09, variant D
            // in features/codex-support/architecture.md).
            fileHashes[file] = await hashFile(srcPath);
            if (result.hasConflict) {
              conflictedFiles.push(file);
              console.log(`  ⚠ Merge conflict in ${file} — resolve the <<<<<<< markers before committing.`);
            } else {
              console.log(`  Merged your edits into: ${file}`);
            }
            handled = true;
          }
        }

        if (!handled) {
          fileHashes[file] = await copyFile(srcPath, targetDir, file, { force: true });
          if (sameVersionRestore) console.log(`  Restored missing: ${file}`);
        }
        fileCount++;
      }

      // Only record a preserved file if Arcane installed it in the first
      // place. Recording one it merely declined to overwrite would claim
      // ownership of an operator-authored file, and `spell uninstall` deletes
      // everything the manifest lists -- so an operator's own .gitignore or
      // DECISIONS.md would be destroyed by an uninstall that never wrote it.
      // A file Arcane DID write must stay recorded, or uninstall leaks it.
      if (!preserveExisting || installed.files.includes(file)) {
        updatedFiles.push(file);
      }
    }
    // Also copy directories
    for (const dir of component.directories ?? []) {
      const srcDirPath = join(assetsDir, dir);
      if (options.dryRun) {
        console.log(`  [dry-run] Would update directory: ${dir}/`);
      } else {
        // Directory-tracked files are always freshly generated content
        // (agent rosters, etc.), never hand-edited in place -- unconditional
        // overwrite, same as before ARC-038, is still correct here.
        const copied = await copyDirectory(srcDirPath, targetDir, dir, { force: true });
        for (const { path: copiedPath, hash } of copied) {
          updatedFiles.push(copiedPath);
          fileHashes[copiedPath] = hash;
        }
        fileCount += copied.length;
      }
    }

    // TODO.md T10: a file this component tracked before this update but no
    // longer does (dropped from the registry's current file/directory list)
    // is orphaned -- still on disk, no longer represented in the manifest
    // this update is about to write.
    for (const file of installed.files) {
      if (updatedFiles.includes(file)) continue;
      const status = await resolveOrphan(
        targetDir,
        file,
        installed.fileHashes?.[file],
        Boolean(options.prune) && !options.dryRun,
      );
      orphanReport.push({ file, status });
    }

    updatedComponents.push({
      ...installed,
      files: updatedFiles,
      installedVersion: packageVersion,
      fileHashes,
    });
  }

  // TODO.md T10: report orphans -- files tracked before this update but no
  // longer part of any current component -- in both dry-run and real runs.
  // Only files still present matter; anything already gone needs no action.
  const orphansToReport = orphanReport.filter((o) => o.status !== "not-found");
  if (orphansToReport.length > 0) {
    const verb = options.dryRun ? "[dry-run] Found" : "Found";
    console.log(
      `\n${verb} ${orphansToReport.length} orphaned file(s) (tracked before this update, no longer part of any current component):`,
    );
    for (const { file, status } of orphansToReport) {
      const marker = status === "pruned" ? "pruned" : options.prune ? "kept (see reason above)" : "not removed";
      console.log(`    ${file} — ${marker}`);
    }
    if (!options.prune) {
      console.log("  Run `spell update --prune` to remove the ones that are safe to delete.");
    }
  }

  // ARC-045 / CS-03: one summary for every customized client shim, in both
  // dry-run and real runs, with the remedy spelled out once.
  if (customizedShims.length > 0) {
    const verb = options.dryRun ? "[dry-run] Would keep" : "Kept";
    console.log(
      `\n! ${verb} ${customizedShims.length} customized client file(s) untouched (ARC-045): an edited Copilot prompt, Claude command or Codex skill is never merged into the new generated shim, because a shim carries no prose of its own to merge into.\n` +
        customizedShims.map((f) => `    ${f}`).join("\n") +
        `\n  Each keeps working in its client as-is. To converge: move your edits into the canonical spell (.arcane/spells/<id>.md — later updates merge edits there), delete the customized file, and run \`spell update\` again; it restores the generated shim at the current version.`,
    );
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
  //
  // Skipped without a TTY. These are interactive questions, and @inquirer
  // throws ExitPromptError on a closed stdin -- which would crash `update`
  // AFTER files were copied but BEFORE the manifest was written, leaving the
  // repo with new files and a stale recorded version. CI, piped input, and
  // scripted upgrades all land here. The fields stay unset and are asked on
  // the next interactive run, which is exactly how a scripted `init` already
  // behaves.
  const interactive = Boolean(process.stdin.isTTY);
  const retrofitPatch = interactive ? await runManifestRetrofits(manifest) : {};
  if (!interactive) {
    const pending = MANIFEST_RETROFITS.filter((r) => r.needsRetrofit(manifest));
    if (pending.length > 0) {
      console.log(
        `  ! Skipped ${pending.length} manifest question${pending.length === 1 ? "" : "s"} (${pending
          .map((r) => r.field)
          .join(", ")}) — no interactive terminal. Run \`spell update\` from a terminal to answer.`,
      );
    }
  }

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

  // ARC-038 decision 1: the update completes regardless of conflicts -- a
  // conflicted file blocking every other file's update would be a worse
  // outcome than a clearly flagged conflict the operator resolves before
  // committing (this repository's own pre-commit/pre-push hooks, and any
  // CI the operator has, still catch an unresolved <<<<<<< marker before it
  // reaches main).
  if (conflictedFiles.length > 0) {
    console.log(
      `\n\u26a0 ${conflictedFiles.length} file(s) have unresolved merge conflicts:\n` +
        conflictedFiles.map((f) => `    ${f}`).join("\n") +
        `\n  Search for "<<<<<<< yours" and resolve before committing.`,
    );
  }

  // If this update just turned the repo into a hub, offer to scaffold the
  // venture registry from whatever already exists under business_root.
  if (manifest.role !== "hub" && updated.role === "hub") {
    await offerRegistryScaffold(targetDir, updated.business_root ?? "ventures");
  }
}
