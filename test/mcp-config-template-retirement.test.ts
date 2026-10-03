import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { hashContent } from "../src/modules/copier.js";
import { getAllComponents, listProfiles, REGISTRY_RETIREMENTS } from "../src/modules/registry.js";
import { checkMcpConfig } from "../src/commands/doctor.js";
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
const OLD_VERSION = "1.10.2";
const NEW_VERSION = "1.11.0";
const FILE = ".mcp.json";
const COMPONENT = "mcp-config-template";

// The file the retired scaffold wrote into every full-profile repository from
// 1.10.0 to 1.10.2 (#328). Its hash is what those manifests recorded.
const SCAFFOLD = `{
  "$comment": "Example MCP server config. Replace or remove the example server below with your own: the package argument is a placeholder that npm rejects, so the example does not run until you name a real server package. Set a per-server \\"timeout\\" (milliseconds) so a hung server aborts on a predictable schedule instead of running to the client's own default idle limit (as long as 30 minutes) -- see .arcane/governance/git-conventions.md's MCP fail-fast / fallback rule.",
  "mcpServers": {
    "example-server": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server-package>"],
      "timeout": 30000
    }
  }
}
`;
const MINE = '{ "mcpServers": { "mine": { "command": "my-server", "timeout": 30000 } } }\n';

async function writeManifest(dir: string, components: ArcaneManifest["components"]): Promise<void> {
  const manifest: ArcaneManifest = {
    version: OLD_VERSION,
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components,
    role: "consumer",
    tracking_mode: "internal",
    external_provider: null,
  };
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
}

async function readManifest(dir: string): Promise<ArcaneManifest> {
  return JSON.parse(await fs.readFile(join(dir, ".arcane.json"), "utf8")) as ArcaneManifest;
}

async function exists(path: string): Promise<boolean> {
  return fs.access(path).then(
    () => true,
    () => false,
  );
}

function logged(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((c: unknown[]) => c.join(" ")).join("\n");
}

describe("#328 — mcp-config-template is retired, not shipped", () => {
  it("no registered component ships a root .mcp.json, so no profile can write one", () => {
    expect(getAllComponents().some((c) => c.files.includes(FILE))).toBe(false);
    expect(getAllComponents().map((c) => c.name)).not.toContain(COMPONENT);
    for (const profile of listProfiles()) {
      expect(profile.components, profile.id).not.toContain(COMPONENT);
    }
  });

  it("is recorded as retired outright and user-owned, with a one-line reason", () => {
    const entry = REGISTRY_RETIREMENTS.find((r) => r.name === COMPONENT);
    expect(entry?.kind).toBe("component");
    expect(entry?.successors).toEqual([]);
    expect(entry?.userOwned).toBe(true);
    expect(entry?.reason).toContain("#328");
  });
});

describe("#328 — `spell update` in a repository that received the scaffold", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "mcp-template-retirement-"));
    inspectGitRepositoryMock.mockResolvedValue({ status: "ready", uncommittedChanges: 0 });
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.restoreAllMocks();
  });

  /** The manifest always records the scaffold's hash; `onDisk` is what the file holds now. */
  async function installedScaffold(onDisk = SCAFFOLD, withHash = true): Promise<void> {
    await fs.writeFile(join(tmpDir, FILE), onDisk);
    const hash = hashContent(Buffer.from(SCAFFOLD));
    await writeManifest(tmpDir, [
      {
        name: COMPONENT,
        files: [FILE],
        installedVersion: "1.10.0",
        ...(withHash ? { fileHashes: { [FILE]: hash } } : {}),
      },
    ]);
  }

  function entryOf(manifest: ArcaneManifest) {
    return manifest.components.find((c) => c.name === COMPONENT);
  }

  it(
    "an untouched scaffold is reported and kept without --prune, and the retirement is explained",
    async () => {
      await installedScaffold();
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      const out = logged(spy);
      expect(out).toContain(`${COMPONENT} not in registry — skipping.`);
      expect(out).toMatch(/mcp-config-template \(component\) → no successor: retired 2026-10-02 \(#328\)/);
      expect(out).toContain("user-owned: a copy you edited is released from tracking, never deleted");
      expect(out).not.toContain("Released");
      expect(await fs.readFile(join(tmpDir, FILE), "utf8")).toBe(SCAFFOLD);
      expect(entryOf(await readManifest(tmpDir))?.files).toEqual([FILE]);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "--prune removes an untouched scaffold and closes the manifest entry",
    async () => {
      await installedScaffold();

      await runUpdate({ prune: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(await exists(join(tmpDir, FILE))).toBe(false);
      expect(entryOf(await readManifest(tmpDir))).toBeUndefined();
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "a scaffold the operator edited into real config is released: kept on disk, untracked, no --prune needed",
    async () => {
      await installedScaffold(MINE);
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      const out = logged(spy);
      expect(out).toContain(`Released: ${FILE}`);
      expect(out).not.toContain(`${FILE} — not removed`);
      expect(await fs.readFile(join(tmpDir, FILE), "utf8")).toBe(MINE);
      expect(entryOf(await readManifest(tmpDir))).toBeUndefined();
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "once released, the next update says nothing about the component",
    async () => {
      await installedScaffold(MINE);
      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(logged(spy)).not.toContain(COMPONENT);
      expect(await fs.readFile(join(tmpDir, FILE), "utf8")).toBe(MINE);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "a copy Arcane never hashed is released too",
    async () => {
      await installedScaffold(SCAFFOLD, false);
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(logged(spy)).toContain(`Released: ${FILE}`);
      expect(await exists(join(tmpDir, FILE))).toBe(true);
      expect(entryOf(await readManifest(tmpDir))).toBeUndefined();
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "--dry-run previews the release and changes nothing",
    async () => {
      await installedScaffold(MINE);
      const spy = vi.spyOn(console, "log");

      await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(logged(spy)).toContain(`[dry-run] Would release: ${FILE}`);
      expect(await fs.readFile(join(tmpDir, FILE), "utf8")).toBe(MINE);
      expect(entryOf(await readManifest(tmpDir))?.files).toEqual([FILE]);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "a retired component that is not user-owned keeps the old behaviour: an edited file stays tracked",
    async () => {
      const file = ".github/agents/planner.agent.md";
      await fs.mkdir(join(tmpDir, ".github/agents"), { recursive: true });
      await fs.writeFile(join(tmpDir, file), "edited\n");
      await writeManifest(tmpDir, [
        {
          name: "agent-files",
          files: [file],
          installedVersion: "1.0.0",
          fileHashes: { [file]: hashContent(Buffer.from("original\n")) },
        },
      ]);
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(logged(spy)).not.toContain("Released");
      expect((await readManifest(tmpDir)).components.find((c) => c.name === "agent-files")?.files).toEqual([file]);
    },
    HEAVY_TEST_TIMEOUT,
  );
});

describe("#328 — `spell doctor` on the scaffold's placeholder", () => {
  let dir: string | undefined;

  afterEach(async () => {
    if (dir) await removeFixtureDir(dir);
    dir = undefined;
  });

  it("warns, non-blocking, naming the server, the placeholder, the fix and `spell update --prune`; edits nothing", async () => {
    dir = await fs.mkdtemp(join(tmpdir(), "doctor-mcp-placeholder-"));
    await fs.writeFile(join(dir, FILE), SCAFFOLD);

    const result = await checkMcpConfig(dir);

    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("example-server");
    expect(result.message).toContain("<your-mcp-server-package>");
    expect(result.message).toMatch(/delete|replace/i);
    expect(result.message).toContain("spell update --prune");
    expect(await fs.readFile(join(dir, FILE), "utf8")).toBe(SCAFFOLD);
  });

  it("the missing-timeout warning carries the exact edit, the unit and the minimum", async () => {
    dir = await fs.mkdtemp(join(tmpdir(), "doctor-mcp-timeout-edit-"));
    await fs.writeFile(
      join(dir, FILE),
      JSON.stringify({ mcpServers: { beta: { command: "npx", args: ["-y", "some-real-server"] } } }),
    );

    const result = await checkMcpConfig(dir);

    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("beta");
    expect(result.message).toContain('"timeout": 30000');
    expect(result.message).toContain("milliseconds");
    expect(result.message).toContain("1000");
  });
});
