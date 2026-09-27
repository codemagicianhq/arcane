import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { hashContent } from "../src/modules/copier.js";
import { getAllComponents, REGISTRY_RETIREMENTS } from "../src/modules/registry.js";
import {
  findTrackedRetirements,
  spellIdFromTrackedPath,
} from "../src/modules/registry-changes.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { removeFixtureDir } from "./helpers/git-fixture.js";

const { inspectGitRepositoryMock } = vi.hoisted(() => ({ inspectGitRepositoryMock: vi.fn() }));

vi.mock("../src/modules/npm-registry.js", () => ({ fetchPublishedFile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue("internal"),
}));
vi.mock("../src/modules/git.js", () => ({
  inspectGitRepository: inspectGitRepositoryMock,
  countUncommittedChanges: vi.fn().mockResolvedValue(0),
  correctUnbornMasterDefault: vi.fn().mockResolvedValue({ corrected: false, to: "main" }),
  ensureLocalPullRebase: vi.fn().mockResolvedValue({ action: "already-set" }),
}));

const { runUpdate } = await import("../src/commands/update.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const OLD_VERSION = "0.0.9";
const NEW_VERSION = "0.1.0";

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

/** Writes a file and returns the hash Arcane would have recorded for it. */
async function seed(dir: string, file: string, content = `# ${file}\n`): Promise<string> {
  await fs.mkdir(join(dir, file, ".."), { recursive: true });
  await fs.writeFile(join(dir, file), content);
  return hashContent(Buffer.from(content));
}

function logged(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((c: unknown[]) => c.join(" ")).join("\n");
}

async function exists(path: string): Promise<boolean> {
  return fs.access(path).then(() => true, () => false);
}

const shippedSpellIds = new Set(
  getAllComponents()
    .flatMap((c) => c.files)
    .map((f) => /^\.arcane\/spells\/(spell-[a-z0-9-]+)\.md$/.exec(f)?.[1])
    .filter((id): id is string => id !== undefined),
);
const componentNames = new Set(getAllComponents().map((c) => c.name));

describe("UP03-A-01 — retirement metadata (#279)", () => {
  it("records the real renames and retirements, each with a one-line reason", () => {
    const byName = new Map(REGISTRY_RETIREMENTS.map((r) => [r.name, r]));
    expect(byName.get("spell-bootstrap-business")?.successors).toEqual(["spell-summon-venture"]);
    expect(byName.get("spell-assess")?.successors).toEqual(["spell-scope"]);
    expect(byName.get("agent-files")?.successors).toEqual([]);
    for (const entry of REGISTRY_RETIREMENTS) {
      expect(entry.reason.trim(), entry.name).not.toBe("");
      expect(entry.reason, entry.name).not.toContain("\n");
    }
  });

  it("every successor exists in the registry, and no retired name is still shipped", () => {
    for (const entry of REGISTRY_RETIREMENTS) {
      const live = entry.kind === "spell" ? shippedSpellIds : componentNames;
      expect(live.has(entry.name), `${entry.name} is retired but still shipped`).toBe(false);
      for (const successor of entry.successors) {
        expect(live.has(successor), `${entry.name} → ${successor}`).toBe(true);
      }
    }
  });

  it("reads a spell id from every installed shape of a spell file", () => {
    const id = "spell-bootstrap-business";
    for (const file of [
      `.arcane/spells/${id}.md`,
      `.github/prompts/${id}.prompt.md`,
      `.claude/commands/${id}.md`,
      `.agents/skills/${id}/SKILL.md`,
      `spells/${id}.md`,
    ]) {
      expect(spellIdFromTrackedPath(file), file).toBe(id);
    }
    expect(spellIdFromTrackedPath(".arcane/governance/git-conventions.md")).toBeUndefined();
  });

  it("finds nothing in a manifest that tracks only current names", () => {
    expect(
      findTrackedRetirements([
        {
          name: "spells-planning",
          files: [".arcane/spells/spell-scope.md", ".github/prompts/spell-scope.prompt.md"],
          installedVersion: OLD_VERSION,
        },
      ]),
    ).toEqual([]);
  });
});

describe("UP03-A-01 — `spell update` explains registry changes (#279)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "up03-a-changes-"));
    inspectGitRepositoryMock.mockResolvedValue({ status: "ready", uncommittedChanges: 0 });
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.restoreAllMocks();
  });

  it(
    "a legacy manifest that tracked spell-bootstrap-business prints its successor and reason, and deletes nothing",
    async () => {
      const file = ".github/prompts/spell-bootstrap-business.prompt.md";
      const hash = await seed(tmpDir, file);
      await writeManifest(tmpDir, {
        components: [
          { name: "spell-prompts", files: [file], installedVersion: OLD_VERSION, fileHashes: { [file]: hash } },
        ],
      });
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      const out = logged(spy);
      expect(out).toContain("Registry changes since your install:");
      expect(out).toMatch(/spell-bootstrap-business \(spell\) → spell-summon-venture: renamed in 0\.16\.0/);
      expect(out).toMatch(/spell-prompts \(component\) → spells-session, .*spells-meta: split in 0\.18\.0/);
      expect(out).toContain(`${file} — not removed`);
      expect(await exists(join(tmpDir, file))).toBe(true);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it("a retired spell kept as an orphan under a current component is explained on every run", async () => {
    const file = ".arcane/spells/spell-assess.md";
    const hash = await seed(tmpDir, file);
    await writeManifest(tmpDir, {
      components: [
        { name: "spells-venture", files: [file], installedVersion: OLD_VERSION, fileHashes: { [file]: hash } },
      ],
    });
    const spy = vi.spyOn(console, "log");

    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

    const out = logged(spy);
    expect(out).toMatch(/spell-assess \(spell\) → spell-scope: renamed to name its outcome/);
    expect(await exists(join(tmpDir, file))).toBe(true);
  });

  it("the retired agent-files component prints its note, and its files stay without --prune", async () => {
    const file = ".github/agents/planner.agent.md";
    const hash = await seed(tmpDir, file);
    await writeManifest(tmpDir, {
      components: [{ name: "agent-files", files: [file], installedVersion: OLD_VERSION, fileHashes: { [file]: hash } }],
    });
    const spy = vi.spyOn(console, "log");

    await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

    const out = logged(spy);
    expect(out).toContain("agent-files not in registry — skipping.");
    expect(out).toMatch(/agent-files \(component\) → no successor: `\.github\/agents\/\*\.agent\.md` files are rendered per roster/);
    expect(out).toContain("removes an untouched one only under `spell update --prune`");
    expect(await exists(join(tmpDir, file))).toBe(true);
    const manifest = JSON.parse(await fs.readFile(join(tmpDir, ".arcane.json"), "utf8")) as ArcaneManifest;
    expect(manifest.components.find((c) => c.name === "agent-files")?.files).toEqual([file]);
  });

  it("--prune still removes an untouched retired file through the existing orphan path, and the note still prints", async () => {
    const file = ".github/agents/planner.agent.md";
    const hash = await seed(tmpDir, file);
    await writeManifest(tmpDir, {
      components: [{ name: "agent-files", files: [file], installedVersion: OLD_VERSION, fileHashes: { [file]: hash } }],
    });
    const spy = vi.spyOn(console, "log");

    await runUpdate({ prune: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

    expect(logged(spy)).toContain("agent-files (component) → no successor");
    expect(await exists(join(tmpDir, file))).toBe(false);
  });

  it("prints no registry-changes section when nothing tracked has been renamed or retired", async () => {
    const file = ".arcane/governance/git-conventions.md";
    const hash = await seed(tmpDir, file);
    await writeManifest(tmpDir, {
      profile: "governance-only",
      components: [{ name: "git-conventions", files: [file], installedVersion: OLD_VERSION, fileHashes: { [file]: hash } }],
    });
    const spy = vi.spyOn(console, "log");

    await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

    expect(logged(spy)).not.toContain("Renamed or retired");
  });
});
