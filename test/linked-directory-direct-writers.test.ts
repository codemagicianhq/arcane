import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { AgentRoster, ArcaneManifest } from "../src/types.js";
import { syncAgents } from "../src/modules/agent-generator.js";
import { installPrePushHook, removePrePushHook } from "../src/modules/push-safety.js";
import { MARKER_END, MARKER_START } from "../src/modules/merger.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// The linked-directory refusal (TODO.md, decided 2026-10-22) for the writers
// that build their own repository paths instead of going through copier.ts:
// agent files and the roster, the git hooks, `spell doctor --fix`, and the
// deletes `spell uninstall` makes, among them a recursive one that would
// empty a directory a linked .arcane points at. Junctions, so this runs on
// Windows too.

vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn(),
  checkbox: vi.fn(),
}));

const { runUninstall } = await import("../src/commands/uninstall.js");
const { runAgentsInit } = await import("../src/modules/agents.js");
const { fixSessionContinuity, runDoctor } = await import("../src/commands/doctor.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");

let repo: string;
let outside: string;
let home: string;
let savedHome: { HOME: string | undefined; USERPROFILE: string | undefined };

beforeEach(async () => {
  repo = await createFixtureDir("linked-writers-repo");
  outside = await createFixtureDir("linked-writers-outside");
  // Nothing here may reach the real home directory (OpenClaw workspaces live
  // under ~/.openclaw).
  home = await createFixtureDir("linked-writers-home");
  savedHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (savedHome.HOME === undefined) delete process.env.HOME;
  else process.env.HOME = savedHome.HOME;
  if (savedHome.USERPROFILE === undefined) delete process.env.USERPROFILE;
  else process.env.USERPROFILE = savedHome.USERPROFILE;
  await removeFixtureDir(repo);
  await removeFixtureDir(outside);
  await removeFixtureDir(home);
});

/** A directory link at `relative` inside the repository: a junction on Windows, a symlink elsewhere. */
async function linkDirectory(relative: string, target: string): Promise<void> {
  await fs.mkdir(join(repo, relative, ".."), { recursive: true });
  await fs.symlink(target, join(repo, relative), "junction");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linkedRefusal(path: string, link: string): RegExp {
  return new RegExp(`^Linked directory: "${escapeRegExp(path)}" is under "${escapeRegExp(link)}", a link to "`);
}

function roster(name: string): AgentRoster {
  return {
    schema_version: 2,
    naming_strategy: "custom",
    agent_profile: "base",
    openclaw: { enabled: false, workspace_root: join(home, ".openclaw") },
    roster: [{ definition: "orchestrator", name, id: "main" }],
  };
}

describe("agent outputs refuse a linked directory that leaves the repository", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("spell agents sync writes no agent file through a linked .github", async () => {
    await linkDirectory(".github", outside);

    await expect(syncAgents(repo, ASSETS_DIR, roster("Kellar"), { openclaw: false })).rejects.toThrow(
      linkedRefusal(".github/agents", ".github"),
    );
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("a roster name cannot walk an agent file out of the repository", async () => {
    // agents.yaml is repository content; its names become file names.
    const escaped = `linked-writers-escaped-${Math.random().toString(36).slice(2, 10)}`;
    const landing = join(repo, "..", `${escaped}.agent.md`);
    try {
      await expect(
        syncAgents(repo, ASSETS_DIR, roster(`../../../${escaped}`), { openclaw: false, claude: false, codex: false }),
      ).rejects.toThrow(/^Path traversal detected/);
      await expect(fs.access(landing)).rejects.toThrow();
    } finally {
      // Only present when the guard fails: the file the old code wrote.
      await removeFixtureDir(landing);
    }
  });

  it("spell agents init writes no roster through a linked .arcane", async () => {
    await linkDirectory(".arcane", outside);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(runAgentsInit({ profile: "base", naming: "generic" }, repo, ASSETS_DIR)).rejects.toThrow(
      linkedRefusal(".arcane/agents", ".arcane"),
    );
    expect(await fs.readdir(outside)).toEqual([]);
  });

  // Review of the fix: agents.yaml sits one level above agents/. With .arcane
  // linked to the parent of a repository named "agents", .arcane/agents
  // resolves back to the repository itself while .arcane/agents.yaml lands
  // beside it.
  it("spell agents init writes no roster above its agents/ directory either", async () => {
    const named = join(outside, "agents");
    await fs.mkdir(named);
    await fs.symlink(outside, join(named, ".arcane"), "junction");
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(runAgentsInit({ profile: "base", naming: "generic" }, named, ASSETS_DIR)).rejects.toThrow(
      linkedRefusal(".arcane/agents.yaml", ".arcane"),
    );
    expect(await fs.readdir(outside)).toEqual(["agents"]);
  });
});

describe("git hooks refuse it too", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("installs no hook through a linked .arcane and leaves core.hooksPath unset", async () => {
    runGit(repo, ["init", "-q"]);
    await linkDirectory(".arcane", outside);

    await expect(installPrePushHook(repo)).rejects.toThrow(linkedRefusal(".arcane/hooks", ".arcane"));
    expect(await fs.readdir(outside)).toEqual([]);
    expect(() => runGit(repo, ["config", "--local", "--get", "core.hooksPath"])).toThrow();
  });

  it("removes no hook through a linked .arcane, leaving core.hooksPath for spell unblock-push to report", async () => {
    runGit(repo, ["init", "-q"]);
    await fs.mkdir(join(outside, "hooks"));
    await fs.writeFile(join(outside, "hooks", "pre-push"), "not the repository's hook\n");
    await linkDirectory(".arcane", outside);
    // The value Arcane itself writes: the repository's own .arcane/hooks under git's root.
    const hooksPath = `${runGit(repo, ["rev-parse", "--show-toplevel"]).trim()}/.arcane/hooks`;
    runGit(repo, ["config", "--local", "core.hooksPath", hooksPath]);

    await removePrePushHook(repo);

    expect(await fs.readFile(join(outside, "hooks", "pre-push"), "utf8")).toBe("not the repository's hook\n");
    expect(runGit(repo, ["config", "--local", "--get", "core.hooksPath"]).trim()).toBe(hooksPath);
  });
});

describe("spell doctor --fix refuses it too", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("creates no session file through a linked ai-context, names it, and creates the others", async () => {
    await linkDirectory("ai-context", outside);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const created = await fixSessionContinuity(repo, ASSETS_DIR);

    expect(created).toContain("TODO.md");
    expect(created).not.toContain("ai-context/system-prompt-context.md");
    expect(await fs.readdir(outside)).toEqual([]);
    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toContain(
      'Not created: ai-context/system-prompt-context.md — it is under "ai-context", a link to',
    );
  });

  // Review of the fix: the report used to say "all present" or
  // "close-session-ready" with that file still missing.
  it("reports the refused file as still missing, never the repository as ready", async () => {
    await linkDirectory("ai-context", outside);
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const saved = process.exitCode;
    try {
      await runDoctor(repo, { fix: true }, ASSETS_DIR);
    } finally {
      process.exitCode = saved;
    }

    const output = lines.join("\n");
    expect(output).toContain("still missing (named above)");
    expect(output).not.toContain("Repo is now close-session-ready");
    expect(output).not.toContain("No files needed creation");
  });
});

describe("spell uninstall deletes nothing a linked directory points at", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("skips the managed files, agent folders, roster and marker file under linked .arcane and .github, naming each", async () => {
    await fs.mkdir(join(outside, "arcane", "agents"), { recursive: true });
    await fs.writeFile(join(outside, "arcane", "agents", "orchestrator.yaml"), "kept");
    await fs.writeFile(join(outside, "arcane", "agents.yaml"), "kept");
    await fs.mkdir(join(outside, "arcane", "spells"));
    await fs.writeFile(join(outside, "arcane", "spells", "spell-x.md"), "kept");
    await fs.mkdir(join(outside, "github", "agents"), { recursive: true });
    await fs.writeFile(join(outside, "github", "agents", "kellar.agent.md"), "kept");
    const marked = `${MARKER_START}\nrouting\n${MARKER_END}\n`;
    await fs.writeFile(join(outside, "github", "copilot-instructions.md"), marked);
    await linkDirectory(".arcane", join(outside, "arcane"));
    await linkDirectory(".github", join(outside, "github"));
    const manifest: ArcaneManifest = {
      version: "0.1.0",
      profile: "lite",
      installedAt: "2026-01-01T00:00:00.000Z",
      components: [{ name: "spells-x", files: [".arcane/spells/spell-x.md"], installedVersion: "0.1.0" }],
    };
    await fs.writeFile(join(repo, ".arcane.json"), JSON.stringify(manifest, null, 2));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await runUninstall({ yes: true }, repo);

    expect(await fs.readFile(join(outside, "arcane", "agents", "orchestrator.yaml"), "utf8")).toBe("kept");
    expect(await fs.readFile(join(outside, "arcane", "agents.yaml"), "utf8")).toBe("kept");
    expect(await fs.readFile(join(outside, "arcane", "spells", "spell-x.md"), "utf8")).toBe("kept");
    expect(await fs.readFile(join(outside, "github", "agents", "kellar.agent.md"), "utf8")).toBe("kept");
    expect(await fs.readFile(join(outside, "github", "copilot-instructions.md"), "utf8")).toBe(marked);
    const output = log.mock.calls.map((c) => String(c[0])).join("\n");
    for (const path of [
      ".arcane/spells/spell-x.md",
      ".github/agents",
      ".arcane/agents",
      ".arcane/agents.yaml",
      ".github/copilot-instructions.md",
    ]) {
      expect(output).toContain(`! Skipped ${path}: it is under "`);
    }
    // Nothing is there to delete, so there is nothing to name.
    expect(output).not.toContain("Skipped .arcane/generated");
    // Uninstall finishes and removes .arcane.json, so it must not tell the
    // operator to run it again.
    expect(output).toContain("! Left 5 path(s) where a link outside");
    expect(output).not.toContain("run the command again");
  });
});
