import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { AgentRoster, ArcaneManifest } from "../src/types.js";
import { syncAgents } from "../src/modules/agent-generator.js";
import { validateAgentRoster } from "../src/modules/agent-schema.js";
import { installPrePushHook } from "../src/modules/push-safety.js";
import { MARKER_END, MARKER_START, mergeIntoFile, stripMarkerSection } from "../src/modules/merger.js";
import { writeManifest } from "../src/modules/manifest.js";
import {
  LinkedDirectoryError,
  LinkedFileError,
  findLinkedFileEscape,
  validateRealTargetFile,
} from "../src/modules/copier.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// TODO.md, "writers outside `copier.ts` follow a symlink at the file itself":
// a cloned repository can carry a link AT a file Arcane writes, appends to or
// chmods, and every writer but writeManagedFile wrote through it. File
// symlinks need privileges this project's Windows machines lack, so the link
// cases run on CI's Linux and macOS runners; the roster rules (TODO.md,
// "roster names, ids and the OpenClaw root ... become file paths unchecked")
// run everywhere.

vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn(),
  checkbox: vi.fn(),
}));

const { runAgentsInit } = await import("../src/modules/agents.js");
const { fixSessionContinuity } = await import("../src/commands/doctor.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const POSIX = process.platform !== "win32";

let repo: string;
let outside: string;
let home: string;
let savedHome: { HOME: string | undefined; USERPROFILE: string | undefined };

beforeEach(async () => {
  repo = await createFixtureDir("linked-files-repo");
  outside = await createFixtureDir("linked-files-outside");
  // OpenClaw workspaces live under ~/.openclaw: never the real one.
  home = await createFixtureDir("linked-files-home");
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

/** A file link at `relative` under `root` (the repository by default). */
async function linkFile(relative: string, target: string, root: string = repo): Promise<void> {
  await fs.mkdir(join(root, relative, ".."), { recursive: true });
  await fs.symlink(target, join(root, relative), "file");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linkedFileRefusal(path: string): RegExp {
  return new RegExp(`^Linked file: "${escapeRegExp(path)}" is a link to "`);
}

function roster(overrides: Partial<AgentRoster> = {}): AgentRoster {
  return {
    schema_version: 2,
    naming_strategy: "custom",
    agent_profile: "base",
    openclaw: { enabled: false, workspace_root: "~/.openclaw" },
    roster: [{ definition: "orchestrator", name: "Kellar", id: "main" }],
    ...overrides,
  };
}

describe.skipIf(!POSIX)("marker merges refuse a link at the file that leaves the repository", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("appends nothing to the file a linked CLAUDE.md names (the authorized_keys scenario)", async () => {
    const keys = join(outside, "authorized_keys");
    await fs.writeFile(keys, "ssh-ed25519 AAAA operator\n");
    await linkFile("CLAUDE.md", keys);

    await expect(mergeIntoFile(repo, "CLAUDE.md", "planted", { force: true })).rejects.toThrow(
      linkedFileRefusal("CLAUDE.md"),
    );
    expect(await fs.readFile(keys, "utf8")).toBe("ssh-ed25519 AAAA operator\n");
  });

  it("creates nothing through a dangling link", async () => {
    await linkFile("AGENTS.md", join(outside, "created-by-arcane"));

    await expect(mergeIntoFile(repo, "AGENTS.md", "x", { force: true })).rejects.toThrow(LinkedFileError);
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("refuses a loop of links rather than following it", async () => {
    await fs.symlink("loop-b", join(repo, "CLAUDE.md"));
    await fs.symlink("CLAUDE.md", join(repo, "loop-b"));

    await expect(mergeIntoFile(repo, "CLAUDE.md", "x", { force: true })).rejects.toThrow(/a loop of links/);
  });

  it("still follows a link that stays inside: CLAUDE.md -> AGENTS.md", async () => {
    await fs.writeFile(join(repo, "AGENTS.md"), "# Agents\n");
    await fs.symlink("AGENTS.md", join(repo, "CLAUDE.md"));

    expect(await mergeIntoFile(repo, "CLAUDE.md", "routing", { force: true })).toBe(true);
    expect(await fs.readFile(join(repo, "AGENTS.md"), "utf8")).toContain(`${MARKER_START}\nrouting\n${MARKER_END}`);
    expect((await fs.lstat(join(repo, "CLAUDE.md"))).isSymbolicLink()).toBe(true);
  });

  it("strips nothing from the file a linked copilot-instructions.md names", async () => {
    const target = join(outside, "notes.md");
    const marked = `keep\n${MARKER_START}\nx\n${MARKER_END}\n`;
    await fs.writeFile(target, marked);
    await linkFile(".github/copilot-instructions.md", target);

    await expect(stripMarkerSection(repo, ".github/copilot-instructions.md")).rejects.toThrow(LinkedDirectoryError);
    expect(await fs.readFile(target, "utf8")).toBe(marked);
  });
});

describe.skipIf(!POSIX)("the git hook refuses it (the shell-profile scenario)", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("neither overwrites nor chmods the file a linked pre-push names, and leaves core.hooksPath unset", async () => {
    runGit(repo, ["init", "-q"]);
    const profile = join(outside, ".bashrc");
    await fs.writeFile(profile, "export PATH\n", { mode: 0o644 });
    await linkFile(".arcane/hooks/pre-push", profile);

    await expect(installPrePushHook(repo)).rejects.toThrow(linkedFileRefusal(".arcane/hooks/pre-push"));
    expect(await fs.readFile(profile, "utf8")).toBe("export PATH\n");
    expect((await fs.stat(profile)).mode & 0o777).toBe(0o644);
    expect(() => runGit(repo, ["config", "--local", "--get", "core.hooksPath"])).toThrow();
  });
});

describe.skipIf(!POSIX)("agent outputs refuse it", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("spell agents init writes no roster through a linked agents.yaml", async () => {
    const target = join(outside, "agents.yaml");
    await fs.writeFile(target, "kept\n");
    await linkFile(".arcane/agents.yaml", target);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(runAgentsInit({ profile: "base", naming: "generic" }, repo, ASSETS_DIR)).rejects.toThrow(
      linkedFileRefusal(".arcane/agents.yaml"),
    );
    expect(await fs.readFile(target, "utf8")).toBe("kept\n");
  });

  it("spell agents init copies no definition through a linked definition file", async () => {
    await linkFile(".arcane/agents/orchestrator.yaml", join(outside, "orchestrator.yaml"));
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(runAgentsInit({ profile: "base", naming: "generic" }, repo, ASSETS_DIR)).rejects.toThrow(
      linkedFileRefusal(".arcane/agents/orchestrator.yaml"),
    );
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("spell agents sync writes no agent file through a linked .agent.md", async () => {
    await linkFile(".github/agents/kellar.agent.md", join(outside, "kellar.agent.md"));

    await expect(
      syncAgents(repo, ASSETS_DIR, roster(), { openclaw: false, claude: false, codex: false }),
    ).rejects.toThrow(linkedFileRefusal(".github/agents/kellar.agent.md"));
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("spell agents sync writes no OpenClaw file through a link inside the OpenClaw home", async () => {
    await linkFile("workspace/IDENTITY.md", join(outside, "IDENTITY.md"), join(home, ".openclaw"));

    await expect(
      syncAgents(repo, ASSETS_DIR, roster({ openclaw: { enabled: true, workspace_root: "~/.openclaw" } }), {
        copilot: false,
        claude: false,
        codex: false,
      }),
    ).rejects.toThrow(linkedFileRefusal("workspace/IDENTITY.md"));
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("spell agents sync writes no roster patch through a linked openclaw-roster.json", async () => {
    await linkFile(".arcane/generated/openclaw-roster.json", join(outside, "patch.json"));

    await expect(
      syncAgents(repo, ASSETS_DIR, roster({ openclaw: { enabled: true, workspace_root: "~/.openclaw" } }), {
        copilot: false,
        claude: false,
        codex: false,
      }),
    ).rejects.toThrow(linkedFileRefusal(".arcane/generated/openclaw-roster.json"));
    expect(await fs.readdir(outside)).toEqual([]);
  });
});

describe.skipIf(!POSIX)("doctor --fix and the manifest refuse it", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("doctor --fix creates nothing through a dangling TODO.md, names it, and creates the others", async () => {
    await linkFile("TODO.md", join(outside, "TODO.md"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const created = await fixSessionContinuity(repo, ASSETS_DIR);

    expect(created).not.toContain("TODO.md");
    expect(created.length).toBeGreaterThan(0);
    expect(await fs.readdir(outside)).toEqual([]);
    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toContain("Not created: TODO.md — it is a link to");
  });

  it("writeManifest refuses a linked .arcane.json in a repository and follows it for the user tier", async () => {
    const target = join(outside, "manifest.json");
    await fs.writeFile(target, "{}");
    await linkFile(".arcane.json", target);
    const manifest: ArcaneManifest = { version: "1.0.0", profile: "lite", installedAt: "2026-01-01T00:00:00.000Z", components: [] };

    await expect(writeManifest(repo, manifest)).rejects.toThrow(linkedFileRefusal(".arcane.json"));
    expect(await fs.readFile(target, "utf8")).toBe("{}");

    await writeManifest(repo, manifest, { followLinks: true });
    expect(JSON.parse(await fs.readFile(target, "utf8"))).toMatchObject({ version: "1.0.0" });
  });
});

// The guard itself, on every platform: Node reports a Windows junction as a
// symlink and follows it like one, so a junction standing where a file is
// expected drives the same code the file-link cases above drive on POSIX.
describe("validateRealTargetFile follows a link at the path itself", () => {
  async function junction(relative: string, target: string): Promise<void> {
    await fs.symlink(target, join(repo, relative), "junction");
  }

  it("refuses a link that resolves outside, naming where it lands", async () => {
    await junction("CLAUDE.md", outside);

    expect(() => validateRealTargetFile(repo, "CLAUDE.md")).toThrow(linkedFileRefusal("CLAUDE.md"));
    expect(() => validateRealTargetFile(repo, "CLAUDE.md")).toThrow(LinkedDirectoryError);
    expect(findLinkedFileEscape(repo, "CLAUDE.md")).toMatchObject({ link: "CLAUDE.md" });
  });

  it("refuses a dangling link by where a write would create its target", async () => {
    await junction("AGENTS.md", join(outside, "not-created-yet"));

    expect(() => validateRealTargetFile(repo, "AGENTS.md")).toThrow(LinkedFileError);
  });

  it("refuses a loop of links", async () => {
    await junction("loop-a", join(repo, "loop-b"));
    await junction("loop-b", join(repo, "loop-a"));

    expect(findLinkedFileEscape(repo, "loop-a")).toEqual({ link: "loop-a", resolvesTo: "a loop of links" });
  });

  it("accepts a link that stays inside, a regular file and an absent path", async () => {
    await fs.mkdir(join(repo, "inside"));
    await junction("CLAUDE.md", join(repo, "inside"));
    await fs.writeFile(join(repo, "AGENTS.md"), "x");

    expect(findLinkedFileEscape(repo, "CLAUDE.md")).toBeNull();
    expect(findLinkedFileEscape(repo, "AGENTS.md")).toBeNull();
    expect(() => validateRealTargetFile(repo, "missing.md")).not.toThrow();
  });
});

describe("the roster refuses names, ids and an OpenClaw root that become paths elsewhere", () => {
  function issues(overrides: Record<string, unknown>, entry: Record<string, unknown> = {}): string {
    try {
      validateAgentRoster(
        {
          ...roster(),
          ...overrides,
          roster: [{ definition: "orchestrator", name: "Kellar", id: "main", ...entry }],
        },
        "agents.yaml",
      );
      return "";
    } catch (err) {
      return (err as Error).message;
    }
  }

  it("accepts the roster every naming strategy generates", () => {
    expect(issues({}, { name: "QA Lead", id: "qa-lead", epithet: "The Tester" })).toBe("");
    expect(issues({ openclaw: { enabled: true, workspace_root: "~/.openclaw/team-a" } })).toBe("");
  });

  it("refuses a name carrying a newline, the key-injection scenario", () => {
    expect(issues({}, { name: "Kellar\nssh-ed25519 AAAA attacker" })).toMatch(/roster\[0\]\.name must not contain a control character/);
  });

  it.each(["../../x", "a/b", "a\\b", "..", "."])("refuses the name %j", (name) => {
    expect(issues({}, { name })).toMatch(/roster\[0\]\.name must/);
  });

  it.each(["../../x", "a/b", "..", "x\ny"])("refuses the id %j", (id) => {
    expect(issues({}, { id })).toMatch(/roster\[0\]\.id must/);
  });

  it("refuses an epithet carrying a newline", () => {
    expect(issues({}, { epithet: "The\nOther" })).toMatch(/roster\[0\]\.epithet must not contain a control character/);
  });

  it.each(["/etc", "~/elsewhere", "~/.openclawx", "~/.openclaw/../.ssh", "~/.openclaw/a/../../x", "~\\.openclaw", "C:/x"])(
    "refuses the OpenClaw root %j",
    (workspace_root) => {
      expect(issues({ openclaw: { enabled: true, workspace_root } })).toMatch(/openclaw\.workspace_root must be "~\/\.openclaw"/);
    },
  );
});
