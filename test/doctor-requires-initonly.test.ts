import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

// No shipped component cites an initOnly one, so the branch of doctor's
// prerequisites message that omits `spell update` has no live fixture. This
// gives git-conventions a line-ending-baseline requirement for the test only.
vi.mock("../src/modules/registry.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/modules/registry.js")>();
  return {
    ...real,
    getComponent: (name: string) =>
      name === "git-conventions"
        ? { ...real.getComponent(name), requires: ["line-ending-baseline"] }
        : real.getComponent(name),
  };
});

const { checkComponentRequires } = await import("../src/commands/doctor.js");
const { getComponent, listProfiles } = await import("../src/modules/registry.js");

describe("doctor prerequisites message for an initOnly prerequisite", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "doctor-initonly-"));
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
  });

  it("names only `spell add`, because update never installs an initOnly component (ARC-052)", async () => {
    const lite = listProfiles().find((p) => p.id === "lite")!;
    expect(lite.components).toContain("git-conventions");
    expect(lite.components).toContain("line-ending-baseline");
    expect(getComponent("line-ending-baseline").initOnly).toBe(true);
    expect(getComponent("git-conventions").requires).toEqual(["line-ending-baseline"]);

    const manifest: ArcaneManifest = {
      version: "0.1.0",
      profile: "lite",
      installedAt: "2026-01-01T00:00:00.000Z",
      components: [{ name: "git-conventions", files: [...getComponent("git-conventions").files], installedVersion: "0.1.0" }],
    };
    await fs.writeFile(join(tmpDir, ".arcane.json"), JSON.stringify(manifest, null, 2));

    const result = await checkComponentRequires(tmpDir);

    expect(result).toMatchObject({ passed: false, blocking: false });
    expect(result.message).toBe(
      "git-conventions cites line-ending-baseline, which is not installed — `spell add line-ending-baseline`",
    );
    expect(result.message).not.toContain("`spell update` installs it");
  });
});
