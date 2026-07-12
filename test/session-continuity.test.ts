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
}));

const { runInit } = await import("../src/commands/init.js");
const { checkSessionContinuity, fixSessionContinuity } = await import("../src/commands/doctor.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const PACKAGE_VERSION = "0.1.0";

const SESSION_FILES = [
  "TODO.md",
  "DECISIONS.md",
  "ai-context/system-prompt-context.md",
  "journal/.gitkeep",
];

describe("session-continuity — init scaffolding", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "session-test-"));
    vi.restoreAllMocks();
    const { select, confirm } = await import("@inquirer/prompts");
    vi.mocked(select).mockResolvedValue("lite" as never);
    vi.mocked(confirm).mockResolvedValue(true as never);
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
