import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest, InstalledComponent } from "../src/types.js";
import { getAllComponents, getComponent } from "../src/modules/registry.js";
import { findMissingRequires } from "../src/modules/registry-changes.js";
import { checkComponentRequires, runDoctor } from "../src/commands/doctor.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { removeFixtureDir } from "./helpers/git-fixture.js";

const { inspectGitRepositoryMock } = vi.hoisted(() => ({ inspectGitRepositoryMock: vi.fn() }));

vi.mock("../src/modules/npm-registry.js", () => ({ fetchPublishedFile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue("internal"),
}));
vi.mock("../src/modules/git.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/modules/git.js")>()),
  inspectGitRepository: inspectGitRepositoryMock,
}));

const { runUpdate } = await import("../src/commands/update.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const OLD_VERSION = "0.0.9";
const NEW_VERSION = "0.1.0";
const STANDARDS = [
  "external-verification-standards",
  "web-discoverability-standards",
  "mobile-release-standards",
  "compliance-standards",
];

async function writeManifest(dir: string, partial: Partial<ArcaneManifest>): Promise<void> {
  const manifest: ArcaneManifest = {
    version: OLD_VERSION,
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [],
    role: "consumer",
    tracking_mode: "internal",
    external_provider: null,
    ...partial,
  };
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
}

function entry(name: string): InstalledComponent {
  return { name, files: [...getComponent(name).files], installedVersion: OLD_VERSION };
}

function logged(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((c: unknown[]) => c.join(" ")).join("\n");
}

describe("UP03-A-04 — `requires` on components (TODO: a spell installed without the doc it cites)", () => {
  it("every `requires` name is a registry component other than the one declaring it", () => {
    const names = new Set(getAllComponents().map((c) => c.name));
    const declaring = getAllComponents().filter((c) => c.requires !== undefined);
    expect(declaring.length).toBeGreaterThan(0);
    for (const c of declaring) {
      for (const required of c.requires!) {
        expect(names.has(required), `${c.name} requires unknown "${required}"`).toBe(true);
        expect(required).not.toBe(c.name);
      }
    }
  });

  it("spells-build requires the four standards its spells cite", () => {
    expect(getComponent("spells-build").requires).toEqual(STANDARDS);
  });

  it("finds each missing prerequisite once, counts installed ones, and reads a legacy entry as its replacements", () => {
    expect(findMissingRequires([entry("spells-build")])).toEqual(
      STANDARDS.map((name) => ({ name, requiredBy: ["spells-build"] })),
    );
    expect(findMissingRequires([entry("spells-build"), ...STANDARDS.map(entry)])).toEqual([]);
    expect(
      findMissingRequires([{ name: "spell-prompts", files: [], installedVersion: OLD_VERSION }]).map((m) => m.name),
    ).toEqual(STANDARDS);
    expect(findMissingRequires([{ name: "agent-files", files: [], installedVersion: OLD_VERSION }])).toEqual([]);
  });

  it("reports only prerequisites the repository's own profile includes, so a fresh lite or methodology install stays clean", () => {
    expect(findMissingRequires([entry("spells-build")], "lite")).toEqual([]);
    expect(findMissingRequires([entry("spells-build")], "methodology")).toEqual([]);
    expect(findMissingRequires([entry("spells-build")], "full")).toEqual(
      STANDARDS.map((name) => ({ name, requiredBy: ["spells-build"] })),
    );
    expect(findMissingRequires([entry("spells-build")], "no-such-profile" as never).map((m) => m.name)).toEqual(STANDARDS);
  });
});

describe("UP03-A-04 — reported by doctor and update", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "up03-a-requires-"));
    inspectGitRepositoryMock.mockResolvedValue({ status: "ready", uncommittedChanges: 0 });
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.restoreAllMocks();
  });

  it("doctor warns, non-blocking, with each `spell add` line when spells-build has no standards docs", async () => {
    await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });

    const result = await checkComponentRequires(tmpDir);

    expect(result).toMatchObject({ passed: false, blocking: false });
    for (const name of STANDARDS) {
      expect(result.message).toContain(`spells-build cites ${name}, which is not installed — \`spell add ${name}\``);
    }
  });

  it("doctor passes for a lite install that leaves the standards out by design", async () => {
    await writeManifest(tmpDir, { profile: "lite", components: [entry("spells-build")] });
    expect(await checkComponentRequires(tmpDir)).toMatchObject({ passed: true });
  });

  it("doctor passes when the prerequisites are installed, and skips without a manifest or in the user tier", async () => {
    await writeManifest(tmpDir, { components: [entry("spells-build"), ...STANDARDS.map(entry)] });
    expect(await checkComponentRequires(tmpDir)).toMatchObject({ passed: true });

    await writeManifest(tmpDir, { scope: "user", components: [entry("spells-build")] });
    expect(await checkComponentRequires(tmpDir)).toMatchObject({ passed: true, skipped: true });

    await removeFixtureDir(join(tmpDir, ".arcane.json"));
    expect(await checkComponentRequires(tmpDir)).toMatchObject({ passed: true, skipped: true });
  });

  it(
    "the full doctor run prints a [warn] row and leaves the exit code as it would be without it",
    async () => {
      const run = async (): Promise<{ output: string; exitCode: number | undefined }> => {
        const lines: string[] = [];
        const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
          lines.push(args.map(String).join(" "));
        });
        const saved = process.exitCode;
        process.exitCode = undefined;
        try {
          await runDoctor(tmpDir);
          return { output: lines.join("\n"), exitCode: process.exitCode as number | undefined };
        } finally {
          process.exitCode = saved;
          spy.mockRestore();
        }
      };

      await writeManifest(tmpDir, { components: [entry("spells-build"), ...STANDARDS.map(entry)] });
      const clean = await run();
      expect(clean.output).toMatch(/\[pass\] Component prerequisites/);

      await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });
      const warned = await run();
      expect(warned.output).toMatch(/⚠ \[warn\] Component prerequisites/);
      expect(warned.output).toContain("spell add web-discoverability-standards");
      expect(warned.exitCode).toBe(clean.exitCode);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it("update lists the missing prerequisites once each, even where the profile also offers them, and installs none", async () => {
    await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });
    const spy = vi.spyOn(console, "log");

    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

    const out = logged(spy);
    expect(out).toContain("Missing prerequisites — installed components cite these, and they are not installed:");
    for (const name of STANDARDS) {
      expect(out).toContain(`    ${name} (required by spells-build)`);
      expect(spy.mock.calls.filter((c: unknown[]) => c[0] === `      spell add ${name}`), name).toHaveLength(1);
      await expect(fs.access(join(tmpDir, getComponent(name).files[0]!))).rejects.toThrow();
    }
  });
});
