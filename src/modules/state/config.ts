/**
 * The config section (PRD ST-06): the persisted manifest answers (ARC-030,
 * ARC-032, ARC-033, ARC-034). An answer the manifest does not carry exports
 * as null, which a client must read as "not asked", never as a default.
 * Pure: no I/O.
 */

import type { ArcaneManifest } from "../../types.js";
import type { ConfigSection } from "./types.js";

export function collectConfig(manifest: ArcaneManifest): ConfigSection {
  return {
    tracking_mode: manifest.tracking_mode ?? null,
    external_provider: manifest.external_provider ?? null,
    push_policy: manifest.push_policy ?? null,
    role: manifest.role ?? null,
    business_root: manifest.business_root ?? null,
    spell_scope: manifest.spell_scope ?? null,
    content_sensitivity: manifest.content_sensitivity ?? null,
  };
}
