import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { canonicalSpellPath } from "../src/modules/spell-compiler.js";
import { USER_FANOUT_PATHS, storeSpellPath, syncUserTierFanout } from "../src/modules/user-tier.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// ─── Mock @inquirer/prompts ───────────────────────────────────────────────────
vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue("lite"),
}));

const { runUninstall } = await import("../src/commands/uninstall.js");
const inquirer = await import("@inquirer/prompts");

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[uninstall.test.ts] ${BUILT_CLI_SKIP_REASON}`);
const PACKAGE_VERSION = "0.1.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function writeManifest(dir: string, partial?: Partial<ArcaneManifest>) {
  const manifest: ArcaneManifest = {
    version: PACKAGE_VERSION,
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [],
    ...partial,
  };
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

async function seedFile(dir: string, relative: string, content = "content") {
  const fullPath = join(dir, relative);
  await fs.mkdir(join(fullPath, ".."), { recursive: true });
  await fs.writeFile(fullPath, content);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe("spell uninstall — handler", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "uninstall-test-"));
    vi.mocked(inquirer.confirm).mockResolvedValue(true);
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.clearAllMocks();
  });

  // ─── Not initialized ───────────────────────────────────────────────────────

  it("prints helpful error and exits 1 when not initialized", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);

    await runUninstall({}, tmpDir);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("spell init"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // ─── Confirmation prompt ───────────────────────────────────────────────────

  it("prompts for confirmation before deleting", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");

    await runUninstall({}, tmpDir);

    expect(vi.mocked(inquirer.confirm)).toHaveBeenCalledOnce();
    const callArg = vi.mocked(inquirer.confirm).mock.calls[0]![0] as { message: string; default: boolean };
    expect(callArg.message).toContain("Continue?");
    expect(callArg.default).toBe(false);
  });

  it("cancels without changes when user declines", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");
    vi.mocked(inquirer.confirm).mockResolvedValue(false);

    const consoleSpy = vi.spyOn(console, "log");
    await runUninstall({}, tmpDir);

    expect(consoleSpy).toHaveBeenCalledWith("Uninstall cancelled.");
    // files still exist
    expect(await fileExists(join(tmpDir, "governance/testing-standards.md"))).toBe(true);
    expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(true);
  });

  // ─── Successful uninstall ──────────────────────────────────────────────────

  it("deletes all manifest-tracked files on confirm", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
        { name: "git-conventions", files: [".arcane/governance/git-conventions.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");
    await seedFile(tmpDir, ".arcane/governance/git-conventions.md");

    await runUninstall({}, tmpDir);

    expect(await fileExists(join(tmpDir, "governance/testing-standards.md"))).toBe(false);
    expect(await fileExists(join(tmpDir, ".arcane/governance/git-conventions.md"))).toBe(false);
  });

  it("deletes .arcane.json after confirming", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");

    await runUninstall({}, tmpDir);

    expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(false);
  });

  it("prints success message with count of removed files", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");

    const consoleSpy = vi.spyOn(console, "log");
    await runUninstall({}, tmpDir);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Uninstalled"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1 files removed"));
  });

  it("does NOT delete files not tracked in the manifest", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");
    await seedFile(tmpDir, "my-custom-notes.md", "keep me");

    await runUninstall({}, tmpDir);

    expect(await fileExists(join(tmpDir, "my-custom-notes.md"))).toBe(true);
    const content = await fs.readFile(join(tmpDir, "my-custom-notes.md"), "utf8");
    expect(content).toBe("keep me");
  });

  // ─── --yes flag ────────────────────────────────────────────────────────────

  it("skips confirmation prompt when --yes is passed", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");

    await runUninstall({ yes: true }, tmpDir);

    expect(vi.mocked(inquirer.confirm)).not.toHaveBeenCalled();
    expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(false);
  });

  // ─── --dry-run flag ────────────────────────────────────────────────────────

  it("--dry-run prints what would be removed without deleting files", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");

    const consoleSpy = vi.spyOn(console, "log");
    await runUninstall({ dryRun: true }, tmpDir);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[dry-run]"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("governance/testing-standards.md"));
    // Files and manifest must still exist
    expect(await fileExists(join(tmpDir, "governance/testing-standards.md"))).toBe(true);
    expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(true);
  });

  it("--dry-run does not prompt for confirmation", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    await seedFile(tmpDir, "governance/testing-standards.md");

    await runUninstall({ dryRun: true }, tmpDir);

    expect(vi.mocked(inquirer.confirm)).not.toHaveBeenCalled();
  });

  // ─── Missing files in manifest ─────────────────────────────────────────────

  it("completes successfully even if tracked files are already missing", async () => {
    await writeManifest(tmpDir, {
      components: [
        { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
      ],
    });
    // Do NOT seed the file — it doesn't exist on disk

    const consoleSpy = vi.spyOn(console, "log");
    await runUninstall({ yes: true }, tmpDir);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Uninstalled"));
    expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(false);
  });

  // ─── Empty components ──────────────────────────────────────────────────────

  it("runs successfully with --yes on an install with no components", async () => {
    await writeManifest(tmpDir, { components: [] });

    const consoleSpy = vi.spyOn(console, "log");
    await runUninstall({ yes: true }, tmpDir);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Uninstalled"));
    expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(false);
  });

  // ─── Agent sync output cleanup ─────────────────────────────────────────────

  it("removes .github/agents/ directory on uninstall", async () => {
    await writeManifest(tmpDir, { components: [] });
    await seedFile(tmpDir, ".github/agents/architect.agent.md");
    await seedFile(tmpDir, ".github/agents/qa-lead.agent.md");

    await runUninstall({ yes: true }, tmpDir);

    expect(await fileExists(join(tmpDir, ".github/agents"))).toBe(false);
  });

  it("removes .arcane/agents/ directory and agents.yaml on uninstall", async () => {
    await writeManifest(tmpDir, { components: [] });
    await seedFile(tmpDir, ".arcane/agents/orchestrator.yaml");
    await seedFile(tmpDir, ".arcane/agents.yaml", "roster");

    await runUninstall({ yes: true }, tmpDir);

    expect(await fileExists(join(tmpDir, ".arcane/agents"))).toBe(false);
    expect(await fileExists(join(tmpDir, ".arcane/agents.yaml"))).toBe(false);
  });

  it("removes .arcane/generated/ directory on uninstall", async () => {
    await writeManifest(tmpDir, { components: [] });
    await seedFile(tmpDir, ".arcane/generated/openclaw-roster.json");

    await runUninstall({ yes: true }, tmpDir);

    expect(await fileExists(join(tmpDir, ".arcane/generated"))).toBe(false);
  });

  it("strips arcane marker section from CLAUDE.md, preserving user content", async () => {
    await writeManifest(tmpDir, { components: [] });
    const claudeContent = `# My Project\n\nSome notes.\n\n<!-- arcane:start -->\n## Agent Roster\n\n| Agent | Role |\n<!-- arcane:end -->\n`;
    await seedFile(tmpDir, "CLAUDE.md", claudeContent);

    await runUninstall({ yes: true }, tmpDir);

    const remaining = await fs.readFile(join(tmpDir, "CLAUDE.md"), "utf8");
    expect(remaining).toContain("My Project");
    expect(remaining).toContain("Some notes");
    expect(remaining).not.toContain("arcane:start");
    expect(remaining).not.toContain("Agent Roster");
  });

  it("deletes CLAUDE.md entirely if it only contains the arcane section", async () => {
    await writeManifest(tmpDir, { components: [] });
    const claudeContent = `<!-- arcane:start -->\n## Agent Roster\n<!-- arcane:end -->\n`;
    await seedFile(tmpDir, "CLAUDE.md", claudeContent);

    await runUninstall({ yes: true }, tmpDir);

    expect(await fileExists(join(tmpDir, "CLAUDE.md"))).toBe(false);
  });

  it("strips arcane marker section from AGENTS.md", async () => {
    await writeManifest(tmpDir, { components: [] });
    const agentsContent = `# Agents\n\n<!-- arcane:start -->\nRoster here\n<!-- arcane:end -->\n\nOther stuff.\n`;
    await seedFile(tmpDir, "AGENTS.md", agentsContent);

    await runUninstall({ yes: true }, tmpDir);

    const remaining = await fs.readFile(join(tmpDir, "AGENTS.md"), "utf8");
    expect(remaining).toContain("# Agents");
    expect(remaining).toContain("Other stuff");
    expect(remaining).not.toContain("arcane:start");
  });

  it("does not fail if agent sync files do not exist", async () => {
    await writeManifest(tmpDir, { components: [] });
    // No agent files seeded — should still succeed
    await expect(runUninstall({ yes: true }, tmpDir)).resolves.not.toThrow();
  });

  it("never deletes a manifest entry that resolves outside the repository — it names it and moves on (TODO.md traversal finding)", async () => {
    const outside = await fs.mkdtemp(join(tmpdir(), "uninstall-outside-"));
    try {
      const victim = join(outside, "keep-me.md");
      await fs.writeFile(victim, "precious");
      const escaping = `../${outside.split(/[\\/]/).pop()}/keep-me.md`;
      await writeManifest(tmpDir, {
        components: [
          { name: "testing-standards", files: [escaping, "governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
        ],
      });
      await seedFile(tmpDir, "governance/testing-standards.md");
      const consoleSpy = vi.spyOn(console, "log");

      await runUninstall({ yes: true }, tmpDir);

      expect(await fs.readFile(victim, "utf8")).toBe("precious");
      expect(await fileExists(join(tmpDir, "governance/testing-standards.md"))).toBe(false);
      expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(false);
      const output = consoleSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain(`Skipped ${escaping}`);
      expect(output).toContain("Path traversal detected");
    } finally {
      await removeFixtureDir(outside);
    }
  });

  // ─── --user: the per-user tier (ARC-045 decision 3 / CS-04) ────────────────
  // tmpDir is the home directory; the store is its `.arcane` child, seeded
  // exactly as `spell init --user` leaves it (one spell, two client files,
  // both recorded).

  describe("--user", () => {
    const ASSETS_DIR = join(process.cwd(), "src/assets");
    const codexFile = USER_FANOUT_PATHS.codex("spell-status");
    const claudeFile = USER_FANOUT_PATHS.claude("spell-status");
    let home: string;
    let storeRoot: string;

    beforeEach(async () => {
      home = tmpDir;
      storeRoot = join(home, ".arcane");
      const dest = join(storeRoot, storeSpellPath("spell-status"));
      await fs.mkdir(join(dest, ".."), { recursive: true });
      await fs.copyFile(join(ASSETS_DIR, canonicalSpellPath("spell-status")), dest);
      const { record } = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ["spell-status"] });
      await writeManifest(storeRoot, {
        profile: "full",
        components: [
          { name: "spells-session", files: [storeSpellPath("spell-status")], installedVersion: PACKAGE_VERSION },
        ],
        scope: "user",
        fanout: record,
      });
    });

    it("removes the client files, their per-spell directory, the store spells and the manifest — and the store itself once it is empty", async () => {
      const consoleSpy = vi.spyOn(console, "log");

      await runUninstall({ user: true }, storeRoot);

      const callArg = vi.mocked(inquirer.confirm).mock.calls[0]![0] as { message: string };
      expect(callArg.message).toContain(`user tier at ${storeRoot}`);
      expect(await fileExists(join(home, codexFile))).toBe(false);
      expect(await fileExists(join(home, ".agents/skills/spell-status"))).toBe(false);
      expect(await fileExists(join(home, claudeFile))).toBe(false);
      // The client's own directory is never removed, even when Arcane's file was the last one in it.
      expect(await fileExists(join(home, ".claude/commands"))).toBe(true);
      expect(await fileExists(join(storeRoot, storeSpellPath("spell-status")))).toBe(false);
      expect(await fileExists(join(storeRoot, ".arcane.json"))).toBe(false);
      expect(await fileExists(storeRoot)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Uninstalled the user tier — 1 spells and 2 client files removed."),
      );
    });

    it("keeps an edited client file, names it, and still removes everything else (--yes skips the prompt)", async () => {
      const edited = `${await fs.readFile(join(home, codexFile), "utf8")}\nOPERATOR EDIT\n`;
      await fs.writeFile(join(home, codexFile), edited, "utf8");
      const consoleSpy = vi.spyOn(console, "log");

      await runUninstall({ user: true, yes: true }, storeRoot);

      expect(vi.mocked(inquirer.confirm)).not.toHaveBeenCalled();
      expect(await fs.readFile(join(home, codexFile), "utf8")).toBe(edited);
      expect(await fileExists(join(home, claudeFile))).toBe(false);
      expect(await fileExists(join(storeRoot, ".arcane.json"))).toBe(false);
      const output = consoleSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("Kept 1 edited client file(s)");
      expect(output).toContain(`~/${codexFile}`);
      expect(output).toContain("1 edited client file(s) kept");
    });

    it("--dry-run lists what would go and removes nothing", async () => {
      const consoleSpy = vi.spyOn(console, "log");

      await runUninstall({ user: true, dryRun: true }, storeRoot);

      const output = consoleSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain(`[dry-run] Would remove: ${storeRoot}/${storeSpellPath("spell-status")}`);
      expect(output).toContain("[dry-run] Would remove 2 client file(s) no longer needed.");
      expect(output).toContain(`[dry-run] Would remove: ${storeRoot}/.arcane.json`);
      expect(vi.mocked(inquirer.confirm)).not.toHaveBeenCalled();
      expect(await fileExists(join(home, codexFile))).toBe(true);
      expect(await fileExists(join(home, claudeFile))).toBe(true);
      expect(await fileExists(join(storeRoot, ".arcane.json"))).toBe(true);
    });

    it("a manifest with scope: user is uninstalled as the user tier without the flag when the directory IS the store", async () => {
      // The inference is honored only at ~/.arcane itself (review F4), so
      // point the home directory at this fixture for the duration.
      const saved = { USERPROFILE: process.env["USERPROFILE"], HOME: process.env["HOME"] };
      process.env["USERPROFILE"] = home;
      process.env["HOME"] = home;
      try {
        await runUninstall({ yes: true }, storeRoot);
      } finally {
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }

      expect(await fileExists(join(home, codexFile))).toBe(false);
      expect(await fileExists(join(home, claudeFile))).toBe(false);
      expect(await fileExists(join(storeRoot, ".arcane.json"))).toBe(false);
    });

    it("refuses a scope: user manifest found outside the store when --user is not given (review F4)", async () => {
      const elsewhere = await fs.mkdtemp(join(tmpdir(), "uninstall-user-misplaced-"));
      const consoleSpy = vi.spyOn(console, "error");
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);
      try {
        await writeManifest(elsewhere, { scope: "user", fanout: {} });

        await runUninstall({ yes: true }, elsewhere);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("is not the store"));
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(await fileExists(join(elsewhere, ".arcane.json"))).toBe(true);
      } finally {
        await removeFixtureDir(elsewhere);
      }
    });

    it("points a missing store at spell init --user", async () => {
      const consoleSpy = vi.spyOn(console, "error");
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);
      const emptyHome = await fs.mkdtemp(join(tmpdir(), "uninstall-user-empty-"));
      try {
        await runUninstall({ user: true }, join(emptyHome, ".arcane"));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("spell init --user"));
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        await removeFixtureDir(emptyHome);
      }
    });
  });
});

// ─── Built binary integration tests ──────────────────────────────────────────

describe.skipIf(!BIN)("spell uninstall — built CLI integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "uninstall-bin-test-"));
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
  });

  it("exits 1 with helpful message when not initialized", () => {
    const result = spawnSync("node", [BIN!, "uninstall", "--yes"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spell init");
  });

  it("--yes removes tracked files and .arcane.json", async () => {
    await fs.mkdir(join(tmpDir, "governance"), { recursive: true });
    await fs.writeFile(join(tmpDir, "governance/testing-standards.md"), "content");
    await fs.writeFile(
      join(tmpDir, ".arcane.json"),
      JSON.stringify({
        version: PACKAGE_VERSION,
        profile: "lite",
        installedAt: "2026-01-01T00:00:00.000Z",
        components: [
          { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
        ],
      }),
    );

    const result = spawnSync("node", [BIN!, "uninstall", "--yes"], {
      cwd: tmpDir,
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Uninstalled");
    expect(await fileExists(join(tmpDir, "governance/testing-standards.md"))).toBe(false);
    expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(false);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("--dry-run lists files to remove without deleting them", async () => {
    await fs.mkdir(join(tmpDir, "governance"), { recursive: true });
    await fs.writeFile(join(tmpDir, "governance/testing-standards.md"), "content");
    await fs.writeFile(
      join(tmpDir, ".arcane.json"),
      JSON.stringify({
        version: PACKAGE_VERSION,
        profile: "lite",
        installedAt: "2026-01-01T00:00:00.000Z",
        components: [
          { name: "testing-standards", files: ["governance/testing-standards.md"], installedVersion: PACKAGE_VERSION },
        ],
      }),
    );

    const result = spawnSync("node", [BIN!, "uninstall", "--dry-run"], {
      cwd: tmpDir,
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[dry-run]");
    expect(await fileExists(join(tmpDir, "governance/testing-standards.md"))).toBe(true);
    expect(await fileExists(join(tmpDir, ".arcane.json"))).toBe(true);
  }, VERY_HEAVY_TEST_TIMEOUT);
});
