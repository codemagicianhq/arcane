import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ArcaneManifest } from "../src/types.js";

// Never the network: the lookup is the mocked module, and a global fetch spy
// proves the offline path never reaches it either.
vi.mock("../src/modules/version-check.js", () => ({
  getFeedUrl: vi.fn().mockReturnValue("https://fake.artifacts.feed/"),
  checkForUpdate: vi.fn(),
}));

const { collectVersions, compareVersions } = await import("../src/modules/state/versions.js");
const versionCheck = await import("../src/modules/version-check.js");

function manifest(partial: Partial<ArcaneManifest> = {}): ArcaneManifest {
  return {
    version: "1.2.3",
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [
      { name: "spells", files: ["a"], installedVersion: "1.2.3" },
      { name: "agents", files: ["b"], installedVersion: "1.2.0" },
    ],
    ...partial,
  };
}

describe("compareVersions", () => {
  it("orders the major.minor.patch core numerically", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.3", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareVersions("1.2.3", "1.2.10")).toBeLessThan(0);
  });

  it("ranks a pre-release below its release and compares two suffixes as strings", () => {
    expect(compareVersions("1.2.3-beta.1", "1.2.3")).toBeLessThan(0);
    expect(compareVersions("1.2.3", "1.2.3-beta.1")).toBeGreaterThan(0);
    expect(compareVersions("1.2.3-alpha", "1.2.3-beta")).toBeLessThan(0);
    expect(compareVersions("1.2.3-beta", "1.2.3-alpha")).toBeGreaterThan(0);
  });

  it("falls back to string order for a value that is not a version", () => {
    expect(compareVersions("unknown", "1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "unknown")).toBeLessThan(0);
    expect(compareVersions("x", "x")).toBe(0);
  });
});

describe("collectVersions (ST-03, ST-13)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network must not be reached"));
    vi.mocked(versionCheck.checkForUpdate).mockReset();
    vi.mocked(versionCheck.getFeedUrl).mockReturnValue("https://fake.artifacts.feed/");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("offline: latest and cli_behind_latest are null, no lookup and no fetch", async () => {
    const result = await collectVersions(manifest(), "1.2.3", { online: false });
    expect(result.versions.latest).toBeNull();
    expect(result.versions.drift.cli_behind_latest).toBeNull();
    expect(result.lookup).toBeNull();
    expect(result.warnings).toEqual([]);
    expect(versionCheck.checkForUpdate).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sorts components by name and reports files/cli as given", async () => {
    const result = await collectVersions(manifest(), "1.2.3", { online: false });
    expect(result.versions.files).toBe("1.2.3");
    expect(result.versions.cli).toBe("1.2.3");
    expect(result.versions.components).toEqual([
      { name: "agents", installedVersion: "1.2.0" },
      { name: "spells", installedVersion: "1.2.3" },
    ]);
  });

  it.each([
    { files: "1.2.3", cli: "1.2.3", latest: "1.2.3", filesBehind: false, cliBehind: false },
    { files: "1.2.0", cli: "1.2.3", latest: "1.2.3", filesBehind: true, cliBehind: false },
    { files: "1.2.3", cli: "1.2.3", latest: "1.3.0", filesBehind: false, cliBehind: true },
    { files: "1.1.0", cli: "1.2.3", latest: "1.3.0", filesBehind: true, cliBehind: true },
  ])(
    "drift files=$files cli=$cli latest=$latest -> files_behind_cli=$filesBehind cli_behind_latest=$cliBehind",
    async ({ files, cli, latest, filesBehind, cliBehind }) => {
      vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({ current: cli, latest, updateAvailable: latest !== cli });
      const result = await collectVersions(manifest({ version: files }), cli, { online: true });
      expect(result.versions.latest).toBe(latest);
      expect(result.versions.drift).toEqual({ files_behind_cli: filesBehind, cli_behind_latest: cliBehind });
      expect(result.warnings).toEqual([]);
      expect(result.lookup?.latest).toBe(latest);
    },
  );

  it("online: passes the feed URL and cache path to checkForUpdate", async () => {
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({ current: "1.2.3", latest: "1.2.3", updateAvailable: false });
    await collectVersions(manifest(), "1.2.3", { online: true, feedUrl: "https://feed.example/", cachePath: "/tmp/cache.json" });
    expect(versionCheck.checkForUpdate).toHaveBeenCalledWith("1.2.3", "https://feed.example/", "/tmp/cache.json");
    expect(versionCheck.getFeedUrl).not.toHaveBeenCalled();
  });

  it("online: a lookup that gives no answer leaves latest null with one warning", async () => {
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({ current: "1.2.3", latest: null, updateAvailable: false });
    const result = await collectVersions(manifest(), "1.2.3", { online: true });
    expect(result.versions.latest).toBeNull();
    expect(result.versions.drift.cli_behind_latest).toBeNull();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("versions.latest");
  });

  it("online: an unavailable feed URL is reported with its reason, and no lookup runs", async () => {
    vi.mocked(versionCheck.getFeedUrl).mockImplementation(() => {
      throw new Error("publishConfig.registry is not set");
    });
    const result = await collectVersions(manifest(), "1.2.3", { online: true });
    expect(versionCheck.checkForUpdate).not.toHaveBeenCalled();
    expect(result.lookup?.error).toBe("Feed URL unavailable: publishConfig.registry is not set");
    expect(result.warnings).toEqual([
      "versions.latest: the npm lookup gave no answer (Feed URL unavailable: publishConfig.registry is not set); latest and drift.cli_behind_latest are null",
    ]);
  });
});
