import { describe, it, expect, afterEach } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { collectRegistry, parseRegistry } from "../src/modules/state/registry.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { compileStateSchema, minimalDocument } from "./helpers/state-schema.js";

const fixtures: string[] = [];
afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

const THIS_MACHINE = "Ordovica-Workstation";
const FOREIGN_MACHINE = "tidewright-build-02";
const THIS_PATH = "/home/dev/ventures/ordovica";
const FOREIGN_PATH = "/srv/builds/tidewright-build-02/ordovica";

const REGISTRY = {
  _comment: "Hub-owned venture registry. Private.",
  updated: "2026-11-01",
  ventures: {
    tidewright: {
      name: "Tidewright",
      aliases: ["tide", "tw"],
      status: "active",
      visibility: "private",
      ownership: "llc",
      tracking: { provider: "ado", project: "platform" },
      repos: [{ name: "repair", remote: "https://dev.azure.com/tidewright/platform/_git/repair", default: true, clones: { [FOREIGN_MACHINE]: FOREIGN_PATH } }],
    },
    ordovica: {
      name: "Ordovica",
      aliases: ["ordo", "ord"],
      status: "active",
      visibility: "public",
      ownership: "llc",
      tracking: "github",
      repos: [
        {
          name: "survey",
          remote: "https://github.com/ordovica/survey.git",
          default: true,
          clones: { [THIS_MACHINE.toUpperCase()]: THIS_PATH, [FOREIGN_MACHINE]: FOREIGN_PATH },
        },
        { name: "local-only", remote: null, default: false },
      ],
    },
    overshore: { name: "Overshore", status: "idea", visibility: "private", ownership: "personal", tracking: "none", repos: [] },
  },
};

function hub(partial: Partial<ArcaneManifest> = {}): ArcaneManifest {
  return { version: "1.0.0", profile: "full", installedAt: "2026-01-01T00:00:00.000Z", components: [], role: "hub", ...partial };
}

describe("parseRegistry (ST-07, D9)", () => {
  it("exports ventures sorted by slug with no local_path and no clones by default", async () => {
    const registry = parseRegistry(REGISTRY, { includeLocalPaths: false, hostname: THIS_MACHINE });
    expect(registry.updated).toBe("2026-11-01");
    expect(registry.ventures.map((v) => v.slug)).toEqual(["ordovica", "overshore", "tidewright"]);
    expect(registry.ventures[0].repos).toEqual([
      { name: "survey", remote: "https://github.com/ordovica/survey.git", default: true },
      { name: "local-only", remote: null, default: false },
    ]);
    expect(registry.ventures[1].aliases).toEqual([]);
    expect(registry.ventures[2].tracking).toEqual({ provider: "ado", project: "platform" });
    const text = JSON.stringify(registry);
    expect(text).not.toContain("clones");
    expect(text).not.toContain(FOREIGN_MACHINE);
    expect(text).not.toContain(FOREIGN_PATH);
    expect(text).not.toContain(THIS_PATH);
    const validate = await compileStateSchema();
    expect(validate({ ...minimalDocument(), registry })).toEqual([]);
  });

  it("with --include-local-paths adds this machine's clone path only, matched case-insensitively", async () => {
    const registry = parseRegistry(REGISTRY, { includeLocalPaths: true, hostname: THIS_MACHINE });
    const [ordovica, , tidewright] = registry.ventures;
    expect(ordovica.repos[0].local_path).toBe(THIS_PATH);
    expect(ordovica.repos[1].local_path).toBeNull();
    expect(tidewright.repos[0].local_path).toBeNull();
    const text = JSON.stringify(registry);
    expect(text).not.toContain("clones");
    expect(text).not.toContain(FOREIGN_MACHINE);
    expect(text).not.toContain(FOREIGN_PATH);
    const validate = await compileStateSchema();
    expect(validate({ ...minimalDocument(), registry })).toEqual([]);
  });

  it("defaults the hostname to this machine's", () => {
    const own = { ventures: { x: { repos: [{ remote: null, default: true, clones: { [hostname()]: "/here" } }] } } };
    expect(parseRegistry(own, { includeLocalPaths: true }).ventures[0].repos[0].local_path).toBe("/here");
  });

  it("accepts an array of ventures carrying slugs, and tolerates malformed entries", () => {
    const registry = parseRegistry(
      { ventures: [{ slug: "b", repos: "not-a-list", aliases: ["ok", 3] }, { slug: "a" }, "junk", { name: "no slug" }] },
      { includeLocalPaths: true, hostname: THIS_MACHINE },
    );
    expect(registry.updated).toBeNull();
    expect(registry.ventures.map((v) => v.slug)).toEqual(["a", "b"]);
    expect(registry.ventures[1].aliases).toEqual(["ok"]);
    expect(registry.ventures[1].repos).toEqual([]);
    expect(parseRegistry("not an object", { includeLocalPaths: false })).toEqual({ updated: null, ventures: [] });
  });
});

describe("collectRegistry", () => {
  it("is null on a consumer, without a warning", async () => {
    const dir = await createFixtureDir("state-registry-consumer");
    fixtures.push(dir);
    expect(await collectRegistry(dir, hub({ role: "consumer" }), { includeLocalPaths: false })).toEqual({ registry: null, warnings: [] });
    expect(await collectRegistry(dir, hub({ role: undefined }), { includeLocalPaths: false })).toEqual({ registry: null, warnings: [] });
  });

  it("reads {business_root}/registry.json on a hub, honouring a custom business_root", async () => {
    const dir = await createFixtureDir("state-registry-hub");
    fixtures.push(dir);
    await mkdir(join(dir, "portfolio"));
    await writeFile(join(dir, "portfolio", "registry.json"), JSON.stringify(REGISTRY), "utf8");
    const result = await collectRegistry(dir, hub({ business_root: "portfolio" }), { includeLocalPaths: false, hostname: THIS_MACHINE });
    expect(result.warnings).toEqual([]);
    expect(result.registry?.ventures).toHaveLength(3);
  });

  it("is null with one warning on a hub with no registry.json, and on one with invalid JSON", async () => {
    const dir = await createFixtureDir("state-registry-missing");
    fixtures.push(dir);
    const missing = await collectRegistry(dir, hub(), { includeLocalPaths: false });
    expect(missing.registry).toBeNull();
    expect(missing.warnings).toEqual(["registry: this repository is a hub but ventures/registry.json is missing"]);
    await mkdir(join(dir, "ventures"));
    await writeFile(join(dir, "ventures", "registry.json"), "{ not json", "utf8");
    const invalid = await collectRegistry(dir, hub(), { includeLocalPaths: false });
    expect(invalid.registry).toBeNull();
    expect(invalid.warnings).toHaveLength(1);
    expect(invalid.warnings[0]).toContain("not valid JSON");
  });
});
