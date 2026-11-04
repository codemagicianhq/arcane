import { describe, it, expect } from "vitest";
import type { ArcaneManifest } from "../src/types.js";
import { collectConfig } from "../src/modules/state/config.js";
import { compileStateSchema, minimalDocument } from "./helpers/state-schema.js";

const base: ArcaneManifest = { version: "1.0.0", profile: "full", installedAt: "2026-01-01T00:00:00.000Z", components: [] };

describe("collectConfig (ST-06)", () => {
  it("exports every persisted answer when the manifest carries them all", async () => {
    const config = collectConfig({
      ...base,
      tracking_mode: "external",
      external_provider: "github",
      push_policy: "guarded",
      role: "hub",
      business_root: "ventures",
      spell_scope: "user",
      content_sensitivity: "sensitive",
    });
    expect(config).toEqual({
      tracking_mode: "external",
      external_provider: "github",
      push_policy: "guarded",
      role: "hub",
      business_root: "ventures",
      spell_scope: "user",
      content_sensitivity: "sensitive",
    });
    const validate = await compileStateSchema();
    expect(validate({ ...minimalDocument(), config })).toEqual([]);
  });

  it("exports null for every answer a pre-ARC-032 manifest never gave, and still validates", async () => {
    const config = collectConfig(base);
    expect(config).toEqual({
      tracking_mode: null,
      external_provider: null,
      push_policy: null,
      role: null,
      business_root: null,
      spell_scope: null,
      content_sensitivity: null,
    });
    const validate = await compileStateSchema();
    expect(validate({ ...minimalDocument(), config })).toEqual([]);
  });

  it("keeps an explicit null external_provider (asked, none) as null", () => {
    expect(collectConfig({ ...base, tracking_mode: "internal", external_provider: null }).external_provider).toBeNull();
  });
});
