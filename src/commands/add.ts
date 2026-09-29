import {
  readManifest,
  writeManifest,
  addComponent,
  hasComponent,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { getComponent, ComponentNotFoundError } from "../modules/registry.js";
import {
  planComponentInstall,
  executeInstallPlan,
  type InstallPlan,
  type PlannedFile,
} from "../modules/component-install.js";
import type { InstalledComponent, SpellAddOptions } from "../types.js";

type AddOutcome = "added" | "skipped" | "failed";

function describeExisting(f: PlannedFile): string {
  return f.state === "identical" ? "identical to the packaged file" : "differs from the packaged file";
}

function printDryRun(name: string, plan: InstallPlan, options: SpellAddOptions): void {
  for (const f of plan.files) {
    if (f.state === "missing") {
      console.log(`  [dry-run] Would copy: ${f.file}`);
    } else if (options.force) {
      console.log(`  [dry-run] Would overwrite: ${f.file} (exists, ${describeExisting(f)})`);
    } else if (plan.component.skipExisting) {
      console.log(`  [dry-run] Would keep: ${f.file} (exists, yours, ${describeExisting(f)})`);
    } else {
      console.log(`  [dry-run] Would refuse: ${f.file} (exists, ${describeExisting(f)}) — needs --force`);
    }
  }
  if (plan.conflicts.length > 0) {
    console.log(
      `\n[dry-run] Would refuse component "${name}": ${plan.conflicts.length} existing file${plan.conflicts.length === 1 ? "" : "s"}. Re-run with --force to overwrite.`,
    );
    return;
  }
  console.log(`\n[dry-run] Would add component "${name}" \u2014 ${plan.toCopy.length} files`);
}

async function addOne(
  name: string,
  options: SpellAddOptions,
  targetDir: string,
  assetsDir: string,
  packageVersion: string,
): Promise<AddOutcome> {
  const manifest = await readManifest(targetDir);

  let component;
  try {
    component = getComponent(name);
  } catch (err) {
    if (err instanceof ComponentNotFoundError) {
      console.error(err.message);
      return "failed";
    }
    throw err;
  }

  if (hasComponent(manifest, name)) {
    console.log(
      `Component "${name}" is already installed. Use "spell update" to update it.`,
    );
    return "skipped";
  }

  const plan = await planComponentInstall(component, targetDir, assetsDir, { force: options.force });

  if (options.dryRun) {
    printDryRun(name, plan, options);
    return plan.conflicts.length > 0 ? "failed" : "added";
  }

  if (plan.conflicts.length > 0) {
    const others = plan.conflicts.length - 1;
    console.error(
      `Cannot add "${name}": "${plan.conflicts[0]!.file}" already exists${others > 0 ? ` (and ${others} more)` : ""}. Nothing was written. Use --force to overwrite.`,
    );
    return "failed";
  }

  const { files, fileHashes } = await executeInstallPlan(plan, targetDir);
  for (const f of plan.kept) console.log(`  Kept existing (yours): ${f.file}`);

  const newComponent: InstalledComponent = {
    name,
    files,
    installedVersion: packageVersion,
    fileHashes,
  };
  await writeManifest(targetDir, addComponent(manifest, newComponent));

  console.log(
    `\n\u2713 Added component "${name}" \u2014 ${files.length} files copied${plan.kept.length > 0 ? `, ${plan.kept.length} kept` : ""}`,
  );
  return "added";
}

/**
 * Runs the `spell add <component...>` command: each name in order, stopping
 * at the first failure (R-293c); a dry run walks every name so it reports all
 * the refusals at once. A name already installed is skipped, not a
 * failure. A refusal is one error line and exit 1, with nothing written for
 * that component (R-294b).
 *
 * @param names  Component names to install
 * @param options  CLI flags (force, dryRun)
 * @param targetDir  Directory containing the Arcane installation
 * @param assetsDir  Path to the bundled assets root
 * @param packageVersion  Current package version string
 */
export async function runAdd(
  names: string[],
  options: SpellAddOptions,
  targetDir: string,
  assetsDir: string,
  packageVersion: string,
): Promise<void> {
  try {
    await readManifest(targetDir);
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

  const added: string[] = [];
  const refused: string[] = [];
  for (const [index, name] of names.entries()) {
    const outcome = await addOne(name, options, targetDir, assetsDir, packageVersion);
    if (outcome === "added") added.push(name);
    if (outcome !== "failed") continue;
    refused.push(name);
    if (options.dryRun) continue;
    if (names.length > 1) {
      const notAttempted = names.slice(index + 1);
      console.error(
        `Added: ${added.length > 0 ? added.join(", ") : "none"}.${notAttempted.length > 0 ? ` Not attempted: ${notAttempted.join(", ")}.` : ""}`,
      );
    }
    process.exit(1);
    return; // guard: process.exit is mocked in tests
  }
  if (refused.length > 0) {
    console.error(`[dry-run] Would refuse: ${refused.join(", ")}.`);
    process.exit(1);
  }
}
