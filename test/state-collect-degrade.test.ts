import { describe, it, expect, afterEach, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { compileStateSchema } from "./helpers/state-schema.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// A collector that throws outright (not one that degrades on its own): the
// orchestrator must turn it into a null section plus one warning (D12).
vi.mock("../src/modules/state/features.js", () => ({
  collectFeatures: vi.fn().mockRejectedValue(new Error("features collector exploded")),
}));

const { collectState } = await import("../src/modules/state/collect.js");

const fixtures: string[] = [];
afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

describe("collectState — a throwing collector (D12)", () => {
  it("exports the section as null, records one warning, and the document still validates", async () => {
    const dir = await createFixtureDir("state-collect-throw");
    fixtures.push(dir);
    await writeFile(
      join(dir, ".arcane.json"),
      JSON.stringify({ version: "0.0.0-test", profile: "lite", installedAt: "2026-01-01T00:00:00.000Z", components: [] }),
      "utf8",
    );
    const doc = await collectState(dir, "0.0.0-test", { online: false, includeLocalPaths: false });
    expect(doc.features).toBeNull();
    expect(doc.warnings).toContain("features: collector failed (features collector exploded); the section is null");
    expect(doc.git).toBeNull(); // not a git repository: its own warning, not a throw
    const validate = await compileStateSchema();
    expect(validate(doc)).toEqual([]);
  }, HEAVY_TEST_TIMEOUT);
});
