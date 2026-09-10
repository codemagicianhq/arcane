import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkUserTier } from "../src/commands/doctor.js";
import { writeManifest } from "../src/modules/manifest.js";
import { canonicalSpellPath } from "../src/modules/spell-compiler.js";
import { storeSpellPath, syncUserTierFanout, userTierRoot } from "../src/modules/user-tier.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

const ASSETS_DIR = join(process.cwd(), "src/assets");

let home: string;

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "doctor-user-tier-"));
});

afterEach(async () => {
  await removeFixtureDir(home);
});

/** A store with one spell and its two client files, as `spell init --user` leaves it. */
async function installTier(version: string) {
  const storeRoot = userTierRoot(home);
  const dest = join(storeRoot, storeSpellPath("spell-status"));
  await fs.mkdir(join(dest, ".."), { recursive: true });
  await fs.copyFile(join(ASSETS_DIR, canonicalSpellPath("spell-status")), dest);
  const { record } = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ["spell-status"] });
  await writeManifest(storeRoot, {
    version,
    profile: "full",
    installedAt: "2026-09-09T00:00:00.000Z",
    components: [
      { name: "spells-session", files: [storeSpellPath("spell-status")], installedVersion: version },
    ],
    scope: "user",
    fanout: record,
  });
  return { storeRoot, record };
}

describe("checkUserTier (ARC-045 / CS-04)", () => {
  it("passes, non-blocking, with the install pointer when no user tier exists", async () => {
    const result = await checkUserTier(home, "1.1.0");
    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("spell init --user");
  });

  it("passes when the store matches the CLI's major.minor and every client file is in place", async () => {
    const { storeRoot } = await installTier("1.1.0");
    const result = await checkUserTier(home, "1.1.3");
    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain(storeRoot);
    expect(result.message).toContain("2 client file(s) in place");
  });

  it("warns, non-blocking, when the store's major.minor differs from the CLI's", async () => {
    await installTier("1.1.0");
    const result = await checkUserTier(home, "1.2.0");
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("installed at v1.1.0, this CLI is v1.2.0");
    expect(result.message).toContain("spell update --user");
  });

  it("warns, non-blocking, when a recorded client file is missing", async () => {
    const { record } = await installTier("1.1.0");
    const [victim] = Object.keys(record);
    await removeFixtureDir(join(home, victim!));
    const result = await checkUserTier(home, "1.1.0");
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("1 of 2 client file(s) missing");
    expect(result.message).toContain("spell update --user");
  });

  it("reports an edited client file in the pass message rather than warning: keeping it is the design", async () => {
    const { record } = await installTier("1.1.0");
    const [edited] = Object.keys(record);
    await fs.appendFile(join(home, edited!), "\nEDIT\n");
    const result = await checkUserTier(home, "1.1.0");
    expect(result.passed).toBe(true);
    expect(result.message).toContain("1 customized");
  });

  it("skips the version comparison when the CLI version is unknown", async () => {
    await installTier("0.9.0");
    const result = await checkUserTier(home);
    expect(result.passed).toBe(true);
  });

  it("warns, non-blocking, when the store manifest has no version — and never throws (review F2)", async () => {
    const storeRoot = userTierRoot(home);
    await fs.mkdir(storeRoot, { recursive: true });
    await fs.writeFile(join(storeRoot, ".arcane.json"), JSON.stringify({ components: [], scope: "user" }), "utf8");
    const result = await checkUserTier(home, "1.1.0");
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("no version field");
  });

  it("counts a recorded path that is now a directory as customized instead of throwing (review F2)", async () => {
    const { record } = await installTier("1.1.0");
    const [victim] = Object.keys(record);
    await removeFixtureDir(join(home, victim!));
    await fs.mkdir(join(home, victim!), { recursive: true });
    const result = await checkUserTier(home, "1.1.0");
    expect(result.passed).toBe(true);
    expect(result.message).toContain("1 customized");
  });

  it("warns, non-blocking, when the store manifest is unreadable", async () => {
    const storeRoot = userTierRoot(home);
    await fs.mkdir(storeRoot, { recursive: true });
    await fs.writeFile(join(storeRoot, ".arcane.json"), "{ not json", "utf8");
    const result = await checkUserTier(home, "1.1.0");
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("could not read");
  });
});
