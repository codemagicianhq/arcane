import { REGISTRY_RETIREMENTS } from "./registry.js";
import type { InstalledComponent, RegistryRetirement } from "../types.js";

/**
 * The "Registry changes since your install" section `spell update` prints
 * (PRD D-15). Report-only by construction: everything here reads the manifest
 * and the registry and returns lines; nothing writes, installs or deletes.
 */
export interface RegistryChanges {
  /** Renamed or retired spells/components this manifest still tracks (#279). */
  retired: RegistryRetirement[];
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

export function formatRegistryChanges(changes: RegistryChanges): string[] {
  if (changes.retired.length === 0) return [];

  const lines = ["", "Registry changes since your install:"];
  lines.push("  Renamed or retired, still tracked here:");
  for (const entry of changes.retired) {
    const successor = entry.successors.length > 0 ? entry.successors.join(", ") : "no successor";
    lines.push(`    ${entry.name} (${entry.kind}) → ${successor}: ${entry.reason}`);
  }
  lines.push(
    "    Nothing is deleted because of this list: their files go through the orphan handling above, which removes an untouched one only under `spell update --prune`.",
  );
  return lines;
}
