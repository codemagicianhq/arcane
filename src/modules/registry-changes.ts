import { join } from "node:path";
import { fileExists } from "./copier.js";
import { REGISTRY_RETIREMENTS, SPELL_COMPONENT_NAMES, getComponent, listProfiles } from "./registry.js";
import type { InstallScope, InstalledComponent, Profile, RegistryRetirement } from "../types.js";

/**
 * The "Registry changes since your install" section `spell update` prints
 * (PRD D-15). Report-only by construction: everything here reads the manifest,
 * the registry and the disk and returns lines; nothing writes, installs or
 * deletes (EF-17: adding files to an existing repository is the operator's
 * call).
 */
export interface RegistryChanges {
  /** Renamed or retired spells/components this manifest still tracks (#279). */
  retired: RegistryRetirement[];
  /** Components the manifest's profile includes today but the manifest lacks. */
  newlyAvailable?: NewlyAvailableComponent[];
  /** The profile `newlyAvailable` was computed against. */
  profile?: Profile;
}

export interface NewlyAvailableComponent {
  name: string;
  description: string;
  /** Files of a user-owned (skipExisting) component already on disk. */
  alreadyPresent: string[];
}

// Every shape a spell file has been installed under: canonical source, the
// Copilot/Claude shims, the Codex skill, and the user tier's store.
const SPELL_ID_IN_PATH = /(?:^|\/)(spell-[a-z0-9-]+)(?:\/SKILL\.md|\.prompt\.md|\.md)$/;

export function spellIdFromTrackedPath(file: string): string | undefined {
  return SPELL_ID_IN_PATH.exec(file)?.[1];
}

/**
 * Retirements a manifest still tracks: a component entry under a retired
 * name, or a tracked file belonging to a retired spell. Pass the manifest's
 * components as read -- before any legacy migration renames them away.
 */
export function findTrackedRetirements(components: InstalledComponent[]): RegistryRetirement[] {
  const componentNames = new Set(components.map((c) => c.name));
  const spellIds = new Set(
    components
      .flatMap((c) => c.files)
      .map(spellIdFromTrackedPath)
      .filter((id): id is string => id !== undefined),
  );
  return REGISTRY_RETIREMENTS.filter((entry) =>
    entry.kind === "component" ? componentNames.has(entry.name) : spellIds.has(entry.name),
  );
}

/**
 * Components the repository's profile would install today that its manifest
 * does not list -- typically ones added to the registry after this repository
 * was installed. Pass the components after legacy migration, so a renamed
 * entry counts as the components that replaced it.
 *
 * A repository that takes its spells from the user tier is not offered
 * spells-* components: it opted out of them. A user-owned (skipExisting)
 * component whose every file is already on disk is left out -- the operator
 * already has their own, and `spell add` would refuse to overwrite it.
 */
export async function findNewlyAvailable(
  targetDir: string,
  profile: Profile,
  installed: InstalledComponent[],
  spellScope: InstallScope,
): Promise<NewlyAvailableComponent[]> {
  // An unrecognized profile (hand-edited manifest) has nothing to compare to.
  const definition = listProfiles().find((p) => p.id === profile);
  if (!definition) return [];

  const installedNames = new Set(installed.map((c) => c.name));
  const found: NewlyAvailableComponent[] = [];
  for (const name of definition.components) {
    if (installedNames.has(name)) continue;
    if (spellScope === "user" && SPELL_COMPONENT_NAMES.includes(name)) continue;
    const component = getComponent(name);
    const alreadyPresent: string[] = [];
    if (component.skipExisting) {
      for (const file of component.files) {
        if (await fileExists(join(targetDir, file))) alreadyPresent.push(file);
      }
      if (component.files.length > 0 && alreadyPresent.length === component.files.length) continue;
    }
    found.push({ name, description: component.description, alreadyPresent });
  }
  return found;
}

export function formatRegistryChanges(changes: RegistryChanges): string[] {
  const newlyAvailable = changes.newlyAvailable ?? [];
  if (changes.retired.length === 0 && newlyAvailable.length === 0) return [];

  const lines = ["", "Registry changes since your install:"];
  if (changes.retired.length > 0) {
    lines.push("  Renamed or retired, still tracked here:");
    for (const entry of changes.retired) {
      const successor = entry.successors.length > 0 ? entry.successors.join(", ") : "no successor";
      lines.push(`    ${entry.name} (${entry.kind}) → ${successor}: ${entry.reason}`);
    }
    lines.push(
      "    Nothing is deleted because of this list: their files go through the orphan handling above, which removes an untouched one only under `spell update --prune`.",
    );
  }
  if (newlyAvailable.length > 0) {
    const profile = changes.profile ? ` "${changes.profile}"` : "";
    lines.push(`  Newly available for your${profile} profile, not installed — nothing was added:`);
    for (const component of newlyAvailable) {
      lines.push(`    ${component.name} — ${component.description}`);
      lines.push(`      spell add ${component.name}`);
      if (component.alreadyPresent.length > 0) {
        lines.push(
          `      (already here and yours: ${component.alreadyPresent.join(", ")} — \`spell add\` stops at an existing file rather than overwrite it)`,
        );
      }
    }
  }
  return lines;
}
