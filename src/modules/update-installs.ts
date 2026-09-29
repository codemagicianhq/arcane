import { checkbox } from "@inquirer/prompts";
import { getComponent } from "./registry.js";
import { componentForSpellScope } from "./user-tier.js";
import {
  executeInstallPlan,
  planComponentInstall,
  type InstallPlan,
} from "./component-install.js";
import type { MissingRequirement, NewlyAvailableComponent } from "./registry-changes.js";
import type { InstallScope, InstalledComponent } from "../types.js";

/**
 * What `spell update` installs on top of refreshing what is already there
 * (ARC-052): the `requires` prerequisites of installed components, and the
 * newly available components the operator opted into (R-293b). Nothing here
 * installs an `initOnly` component, and nothing here installs over a file
 * that is already on disk.
 */
export interface UpdateInstallItem {
  plan: InstallPlan;
  kind: "prerequisite" | "new";
  /** Installed components that cite this one; empty for `new`. */
  requiredBy: string[];
}

/** A prerequisite `update` left alone, and why. It stays in the report. */
export interface LeftAlone {
  name: string;
  kind: "prerequisite" | "new";
  reason: string;
}

export interface UpdateInstallPlan {
  items: UpdateInstallItem[];
  leftAlone: LeftAlone[];
}

/** Newly available components `--add-new` or the checklist may offer: never `initOnly`. */
export function offerableNewComponents(
  newlyAvailable: NewlyAvailableComponent[],
  missingRequires: MissingRequirement[],
): NewlyAvailableComponent[] {
  return newlyAvailable.filter(
    (c) => !getComponent(c.name).initOnly && !missingRequires.some((m) => m.name === c.name),
  );
}

/**
 * Which newly available components to install: all of them under `--add-new`,
 * the operator's ticks in a terminal, none otherwise (R-293b).
 */
export async function selectNewComponents(
  candidates: NewlyAvailableComponent[],
  mode: { addNew: boolean; interactive: boolean; dryRun: boolean },
): Promise<NewlyAvailableComponent[]> {
  if (candidates.length === 0) return [];
  if (mode.addNew) return candidates;
  if (!mode.interactive || mode.dryRun) return [];
  const chosen = await checkbox<string>({
    message: "Newly available components. Space to select, Enter to confirm (none selected installs nothing):",
    choices: candidates.map((c) => ({ name: `${c.name} — ${c.description}`, value: c.name, checked: false })),
  });
  return candidates.filter((c) => chosen.includes(c.name));
}

/**
 * Decides, from the disk, what an update run would install. The dry run
 * prints this plan and the real run executes it, so the two cannot disagree.
 */
export async function planUpdateInstalls(args: {
  targetDir: string;
  assetsDir: string;
  spellScope: InstallScope;
  missingRequires: MissingRequirement[];
  selectedNew: NewlyAvailableComponent[];
}): Promise<UpdateInstallPlan> {
  const items: UpdateInstallItem[] = [];
  const leftAlone: LeftAlone[] = [];

  for (const { name, requiredBy } of args.missingRequires) {
    const component = componentForSpellScope(getComponent(name), args.spellScope);
    if (component.initOnly) {
      leftAlone.push({ name, kind: "prerequisite", reason: "it is an initOnly component: adding it mid-life changes how Git treats existing files, so it is your call" });
      continue;
    }
    if (component.files.length === 0) continue;
    const plan = await planComponentInstall(component, args.targetDir, args.assetsDir, {});
    if (plan.conflicts.length > 0) {
      leftAlone.push({ name, kind: "prerequisite", reason: `${plan.conflicts[0]!.file} already exists${plan.conflicts.length > 1 ? ` (and ${plan.conflicts.length - 1} more)` : ""}, and update does not overwrite` });
      continue;
    }
    items.push({ plan, kind: "prerequisite", requiredBy });
  }

  for (const candidate of args.selectedNew) {
    const component = componentForSpellScope(getComponent(candidate.name), args.spellScope);
    if (component.initOnly || component.files.length === 0) continue;
    const plan = await planComponentInstall(component, args.targetDir, args.assetsDir, {});
    if (plan.conflicts.length > 0) {
      leftAlone.push({ name: candidate.name, kind: "new", reason: `${plan.conflicts[0]!.file} already exists, and update does not overwrite` });
      continue;
    }
    items.push({ plan, kind: "new", requiredBy: [] });
  }

  return { items, leftAlone };
}

function label(item: UpdateInstallItem): string {
  return item.kind === "prerequisite"
    ? `prerequisite of ${item.requiredBy.join(", ")}`
    : "newly available";
}

/** The `--dry-run` lines: exactly the components a real run would install. */
export function describeInstallPlan(plan: UpdateInstallPlan): string[] {
  const lines: string[] = [];
  for (const item of plan.items) {
    lines.push(`  [dry-run] Would install: ${item.plan.component.name} (${label(item)}) — ${item.plan.toCopy.length} files`);
    for (const f of item.plan.kept) lines.push(`    [dry-run] Would keep: ${f.file} (exists, yours)`);
  }
  return lines;
}

/** Writes the plan and returns the manifest entries it produced. */
export async function executeUpdateInstalls(
  plan: UpdateInstallPlan,
  targetDir: string,
  packageVersion: string,
): Promise<{ installed: InstalledComponent[]; lines: string[] }> {
  const installed: InstalledComponent[] = [];
  const lines: string[] = [];
  for (const item of plan.items) {
    const { files, fileHashes } = await executeInstallPlan(item.plan, targetDir);
    installed.push({
      name: item.plan.component.name,
      files,
      installedVersion: packageVersion,
      fileHashes,
    });
    lines.push(`  Installed: ${item.plan.component.name} (${label(item)}) — ${files.length} files`);
    for (const f of item.plan.kept) lines.push(`    Kept existing (yours): ${f.file}`);
  }
  return { installed, lines };
}
