import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";

// ─── Mock @inquirer/prompts ───────────────────────────────────────────────────
vi.mock("@inquirer/prompts", () => ({
  select: vi.fn().mockResolvedValue("lite"),
  confirm: vi.fn().mockResolvedValue(true),
  checkbox: vi.fn().mockResolvedValue([]),
  input: vi.fn().mockResolvedValue("Agent"),
}));

// ─── Mock git module ──────────────────────────────────────────────────────────
vi.mock("../src/modules/git.js", () => ({
  countUncommittedChanges: vi.fn().mockResolvedValue(0),
  inspectGitRepository: vi.fn().mockResolvedValue({ status: "not-repository" }),
  correctUnbornMasterDefault: vi.fn().mockResolvedValue({ corrected: false, to: "main" }),
  ensureLocalPullRebase: vi.fn().mockResolvedValue({ action: "already-set" }),
}));

const { runInit } = await import("../src/commands/init.js");
const { checkArcaneManifest, checkSessionContinuity, fixSessionContinuity } = await import("../src/commands/doctor.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const PACKAGE_VERSION = "0.1.0";

const SESSION_FILES = [
  "README.md",
  "project.md",
  "TODO.md",
  "DECISIONS.md",
  "ai-context/system-prompt-context.md",
  "journal/.gitkeep",
];

describe("doctor — self-hosted source manifest", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "doctor-manifest-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("accepts only the explicit self-hosted source manifest", async () => {
    await fs.mkdir(join(tmpDir, "src/assets"), { recursive: true });
    await fs.writeFile(
      join(tmpDir, "src/assets/.arcane.json"),
      JSON.stringify({ selfHosted: true, tracking_mode: "internal" }),
    );

    const result = await checkArcaneManifest(tmpDir);

    expect(result.passed).toBe(true);
    expect(result.message).toContain("self-hosted source tree");
  });

  it("does not exempt an unmarked or externally tracked source manifest", async () => {
    await fs.mkdir(join(tmpDir, "src/assets"), { recursive: true });
    await fs.writeFile(
      join(tmpDir, "src/assets/.arcane.json"),
      JSON.stringify({ selfHosted: true, tracking_mode: "external" }),
    );

    const result = await checkArcaneManifest(tmpDir);

    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
  });

  it("does not hide a corrupt installed manifest behind the source marker", async () => {
    await fs.mkdir(join(tmpDir, "src/assets"), { recursive: true });
    await fs.writeFile(
      join(tmpDir, "src/assets/.arcane.json"),
      JSON.stringify({ selfHosted: true, tracking_mode: "internal" }),
    );
    await fs.writeFile(join(tmpDir, ".arcane.json"), "{ invalid json");

    const result = await checkArcaneManifest(tmpDir);

    expect(result.passed).toBe(false);
    expect(result.message).toContain("invalid JSON");
  });

  it("does not throw when the self-hosted source manifest is valid JSON but not an object", async () => {
    await fs.mkdir(join(tmpDir, "src/assets"), { recursive: true });
    await fs.writeFile(join(tmpDir, "src/assets/.arcane.json"), "null");

    const result = await checkArcaneManifest(tmpDir);

    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
  });

  it("does not throw when the installed manifest is valid JSON but not an object", async () => {
    await fs.writeFile(join(tmpDir, ".arcane.json"), "42");

    const result = await checkArcaneManifest(tmpDir);

    expect(result.passed).toBe(false);
    expect(result.message).toContain("missing required fields");
  });

  it("rejects a non-string version instead of silently stringifying it", async () => {
    await fs.writeFile(
      join(tmpDir, ".arcane.json"),
      JSON.stringify({ version: 29, components: ["core"] }),
    );

    const result = await checkArcaneManifest(tmpDir);

    expect(result.passed).toBe(false);
    expect(result.message).toContain("missing required fields");
  });
});

describe("session-continuity — init scaffolding", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "session-test-"));
    vi.restoreAllMocks();
    // restoreAllMocks clears a plain vi.fn()'s configured resolved value
    // back to undefined -- re-apply every module-mocked function here, not
    // just declared once in the factory (see test/init.test.ts for the
    // same fix, applied first).
    const { select, confirm } = await import("@inquirer/prompts");
    vi.mocked(select).mockResolvedValue("lite" as never);
    vi.mocked(confirm).mockResolvedValue(true as never);
    const { countUncommittedChanges, inspectGitRepository, correctUnbornMasterDefault, ensureLocalPullRebase } =
      await import("../src/modules/git.js");
    vi.mocked(countUncommittedChanges).mockResolvedValue(0);
    vi.mocked(inspectGitRepository).mockResolvedValue({ status: "not-repository" });
    vi.mocked(correctUnbornMasterDefault).mockResolvedValue({ corrected: false, to: "main" });
    vi.mocked(ensureLocalPullRebase).mockResolvedValue({ action: "already-set" });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("spell init with lite profile creates all session-continuity files", async () => {
    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    for (const file of SESSION_FILES) {
      await expect(fs.access(join(tmpDir, file))).resolves.toBeUndefined();
    }
  });

  it("session-continuity files are listed in the manifest", async () => {
    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const raw = await fs.readFile(join(tmpDir, ".arcane.json"), "utf-8");
    const manifest = JSON.parse(raw) as ArcaneManifest;
    const sc = manifest.components.find((c) => c.name === "session-continuity");

    expect(sc).toBeDefined();
    expect(sc!.files).toEqual(expect.arrayContaining(SESSION_FILES));
  });

  it("does not overwrite existing TODO.md when it already has content", async () => {
    const userContent = "# My Custom TODO\n\n- [x] Important task\n";
    await fs.writeFile(join(tmpDir, "TODO.md"), userContent);

    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const result = await fs.readFile(join(tmpDir, "TODO.md"), "utf-8");
    expect(result).toBe(userContent);
  });

  it("does not overwrite existing project orientation files", async () => {
    const readme = "# Existing README\n";
    const project = "# Existing Project Context\n";
    await fs.writeFile(join(tmpDir, "README.md"), readme);
    await fs.writeFile(join(tmpDir, "project.md"), project);

    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    await expect(fs.readFile(join(tmpDir, "README.md"), "utf8")).resolves.toBe(readme);
    await expect(fs.readFile(join(tmpDir, "project.md"), "utf8")).resolves.toBe(project);
  });

  it("does not overwrite existing DECISIONS.md", async () => {
    const userContent = "# My Decisions\n\n## ADR-001\nCustom decision.\n";
    await fs.writeFile(join(tmpDir, "DECISIONS.md"), userContent);

    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const result = await fs.readFile(join(tmpDir, "DECISIONS.md"), "utf-8");
    expect(result).toBe(userContent);
  });

  it("does not overwrite existing ai-context/system-prompt-context.md", async () => {
    const userContent = "# Custom Context\n\nUser-authored content.\n";
    await fs.mkdir(join(tmpDir, "ai-context"), { recursive: true });
    await fs.writeFile(join(tmpDir, "ai-context/system-prompt-context.md"), userContent);

    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const result = await fs.readFile(join(tmpDir, "ai-context/system-prompt-context.md"), "utf-8");
    expect(result).toBe(userContent);
  });

  it("--force overwrites session-continuity files", async () => {
    await fs.writeFile(join(tmpDir, "TODO.md"), "old content");

    await runInit({ profile: "lite", force: true }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const result = await fs.readFile(join(tmpDir, "TODO.md"), "utf-8");
    expect(result).not.toBe("old content");
    expect(result).toContain("# TODO");
  });
});

describe("session-continuity — doctor --fix", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "doctor-fix-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("checkSessionContinuity reports missing files", async () => {
    const results = await checkSessionContinuity(tmpDir);

    expect(results).toHaveLength(4);
    for (const r of results) {
      expect(r.passed).toBe(false);
      expect(r.message).toContain("Missing");
    }
  });

  it("checkSessionContinuity reports present files as passed", async () => {
    // Create all session files
    await fs.writeFile(join(tmpDir, "TODO.md"), "# TODO\n");
    await fs.writeFile(join(tmpDir, "DECISIONS.md"), "# Decisions\n");
    await fs.mkdir(join(tmpDir, "ai-context"), { recursive: true });
    await fs.writeFile(join(tmpDir, "ai-context/system-prompt-context.md"), "# Context\n");
    await fs.mkdir(join(tmpDir, "journal"), { recursive: true });
    await fs.writeFile(join(tmpDir, "journal/.gitkeep"), "");

    const results = await checkSessionContinuity(tmpDir);

    expect(results).toHaveLength(4);
    for (const r of results) {
      expect(r.passed).toBe(true);
    }
  });

  it("fixSessionContinuity creates missing files without overwriting existing ones", async () => {
    // Pre-create TODO.md with custom content
    const customTodo = "# Existing TODO\n";
    await fs.writeFile(join(tmpDir, "TODO.md"), customTodo);

    const created = await fixSessionContinuity(tmpDir, ASSETS_DIR);

    // TODO.md should NOT be overwritten
    const todoContent = await fs.readFile(join(tmpDir, "TODO.md"), "utf-8");
    expect(todoContent).toBe(customTodo);

    // Other files SHOULD be created
    expect(created).toContain("DECISIONS.md");
    expect(created).toContain("ai-context/system-prompt-context.md");
    expect(created).toContain("journal/.gitkeep");
    expect(created).not.toContain("TODO.md");

    await expect(fs.access(join(tmpDir, "DECISIONS.md"))).resolves.toBeUndefined();
    await expect(fs.access(join(tmpDir, "ai-context/system-prompt-context.md"))).resolves.toBeUndefined();
    await expect(fs.access(join(tmpDir, "journal/.gitkeep"))).resolves.toBeUndefined();
  });

  it("fixSessionContinuity is idempotent — running twice creates nothing on second pass", async () => {
    // First fix — creates all files
    const firstRun = await fixSessionContinuity(tmpDir, ASSETS_DIR);
    expect(firstRun).toHaveLength(4);

    // Second fix — nothing to create
    const secondRun = await fixSessionContinuity(tmpDir, ASSETS_DIR);
    expect(secondRun).toHaveLength(0);
  });
});
