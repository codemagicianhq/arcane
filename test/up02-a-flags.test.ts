import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import type { ArcaneManifest, ManifestFlags } from "../src/types.js";

/**
 * PRD D-02 / UP02-A-04: every manifest question answerable by a flag on
 * `spell init` and `spell update`. Real git throughout (git.js is not
 * mocked); prompts are mocked only so a test can prove none was asked.
 */

const { selectMock, confirmMock, inputMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  confirmMock: vi.fn(),
  inputMock: vi.fn(),
}));
vi.mock("@inquirer/prompts", () => ({
  select: selectMock,
  confirm: confirmMock,
  input: inputMock,
  checkbox: vi.fn().mockResolvedValue([]),
}));
vi.mock("../src/modules/npm-registry.js", () => ({ fetchPublishedFile: vi.fn().mockResolvedValue(undefined) }));

const { runInit } = await import("../src/commands/init.js");
const { runUpdate } = await import("../src/commands/update.js");
const { resolveManifestFlags, manifestFlagLine, ManifestFlagError } = await import("../src/modules/hub.js");
const { isHookEnforced } = await import("../src/modules/push-safety.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[up02-a-flags.test.ts] ${BUILT_CLI_SKIP_REASON}`);

const savedEnv: Record<string, string | undefined> = {};
let home: string;

beforeAll(async () => {
  const dir = await createFixtureDir("up02-a-flags-scopes-");
  await fs.writeFile(join(dir, "global"), "");
  await fs.writeFile(join(dir, "system"), "");
  home = await createFixtureDir("up02-a-flags-home-");
  for (const key of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "HOME", "USERPROFILE"]) savedEnv[key] = process.env[key];
  process.env["GIT_CONFIG_GLOBAL"] = join(dir, "global");
  process.env["GIT_CONFIG_SYSTEM"] = join(dir, "system");
  process.env["HOME"] = home;
  process.env["USERPROFILE"] = home;
});

afterAll(async () => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await removeFixtureDir(home);
});

function noPromptsAllowed() {
  for (const mock of [selectMock, confirmMock, inputMock]) {
    mock.mockReset();
    mock.mockImplementation(async (opts: { message: string }) => {
      throw new Error(`unexpected prompt: ${opts.message}`);
    });
  }
}

async function freshRepo(): Promise<{ work: string; bare: string }> {
  const bare = await createFixtureDir("up02-a-flags-bare-");
  fixtureGit(bare, ["init", "--bare", "-b", "main"]);
  const work = await createFixtureDir("up02-a-flags-work-");
  fixtureGit(work, ["init", "-b", "main"]);
  fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
  await fs.writeFile(join(work, "a.txt"), "hello\n");
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: seed"]);
  fixtureGit(work, ["remote", "add", "origin", bare]);
  return { work, bare };
}

/** An installed repository at an older version, committed clean so update runs. */
async function installedRepo(partial: Partial<ArcaneManifest> = {}): Promise<{ work: string; bare: string }> {
  const { work, bare } = await freshRepo();
  const manifest: ArcaneManifest = {
    version: "0.0.9",
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [
      { name: "testing-standards", files: [".arcane/governance/testing-standards.md"], installedVersion: "0.0.9" },
    ],
    ...partial,
  };
  await fs.writeFile(join(work, ".arcane.json"), JSON.stringify(manifest, null, 2));
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: install"]);
  return { work, bare };
}

async function recorded(work: string): Promise<ArcaneManifest> {
  return JSON.parse(await fs.readFile(join(work, ".arcane.json"), "utf-8")) as ArcaneManifest;
}

function localConfig(dir: string): string {
  return spawnSync("git", ["config", "--local", "--list"], { cwd: dir, encoding: "utf-8" }).stdout;
}

describe("resolveManifestFlags", () => {
  const path = "/repo/.arcane.json";
  const resolve = (flags: ManifestFlags, current: Partial<ArcaneManifest> = {}) =>
    resolveManifestFlags(flags, current, path);

  it("sets unset fields, pairing --tracking-mode internal with external_provider null", () => {
    expect(resolve({ role: "hub", trackingMode: "internal", contentSensitivity: "sensitive", subjectRoot: "docs" })).toEqual({
      role: "hub",
      tracking_mode: "internal",
      external_provider: null,
      content_sensitivity: "sensitive",
      subject_root: "docs",
    });
    expect(resolve({ trackingMode: "external", externalProvider: "ado" })).toEqual({
      tracking_mode: "external",
      external_provider: "ado",
    });
  });

  it("rejects an invalid value with the manifest validator's own message", () => {
    expect(() => resolve({ pushPolicy: "sideways" })).toThrow(ManifestFlagError);
    expect(() => resolve({ pushPolicy: "sideways" })).toThrow(
      'Invalid --push-policy: Manifest at "/repo/.arcane.json" has an unsupported value for "push_policy": "sideways". Valid values: open, guarded, blocked.',
    );
    expect(() => resolve({ role: "boss" })).toThrow('unsupported value for "role": "boss"');
    expect(() => resolve({ subjectRoot: "../outside" })).toThrow('unsupported value for "subject_root"');
    expect(() => resolve({ trackingMode: "external", externalProvider: "gitlab" })).toThrow(
      'unsupported value for "external_provider": "gitlab"',
    );
  });

  it("--external-provider without --tracking-mode external is an error, and external needs a provider", () => {
    expect(() => resolve({ externalProvider: "ado" })).toThrow("--external-provider applies only together with --tracking-mode external");
    expect(() => resolve({ trackingMode: "internal", externalProvider: "ado" })).toThrow("--external-provider applies only");
    expect(() => resolve({ trackingMode: "external" })).toThrow("needs --external-provider");
  });

  it("tightens push_policy, is a no-op at the same value, and refuses every loosening naming spell unblock-push", () => {
    expect(resolve({ pushPolicy: "blocked" }, { push_policy: "open" })).toEqual({ push_policy: "blocked" });
    expect(resolve({ pushPolicy: "guarded" }, { push_policy: "open" })).toEqual({ push_policy: "guarded" });
    expect(resolve({ pushPolicy: "blocked" }, { push_policy: "guarded" })).toEqual({ push_policy: "blocked" });
    expect(resolve({ pushPolicy: "blocked" }, { push_policy: "blocked" })).toEqual({});
    for (const [from, to] of [["blocked", "open"], ["blocked", "guarded"], ["guarded", "open"]] as const) {
      expect(() => resolve({ pushPolicy: to }, { push_policy: from })).toThrow("spell unblock-push");
    }
  });

  it("refuses to change any other recorded answer, naming the current value; the same value is a no-op", () => {
    expect(() => resolve({ role: "hub" }, { role: "consumer" })).toThrow('recorded role: "consumer"');
    expect(() => resolve({ trackingMode: "external", externalProvider: "ado" }, { tracking_mode: "internal" })).toThrow(
      '--tracking-mode conflicts with the recorded tracking_mode: "internal"',
    );
    expect(() =>
      resolve({ trackingMode: "external", externalProvider: "jira" }, { tracking_mode: "external", external_provider: "ado" }),
    ).toThrow('--external-provider conflicts with the recorded external_provider: "ado"');
    expect(() => resolve({ subjectRoot: "docs" }, { subject_root: null })).toThrow("recorded subject_root: null");
    expect(resolve({ role: "consumer", contentSensitivity: "standard" }, { role: "consumer", content_sensitivity: "standard" })).toEqual({});
  });

  it("manifestFlagLine lists one flag per pending question", () => {
    const line = manifestFlagLine({ version: "1", profile: "docs", installedAt: "x", components: [] });
    expect(line?.[0]).toBe(
      "spell update --role <hub|consumer> --tracking-mode <internal|external> --content-sensitivity <standard|sensitive> --subject-root <path> --push-policy <open|guarded|blocked>",
    );
    expect(line?.[1]).toContain("--external-provider");
    expect(
      manifestFlagLine({
        version: "1",
        profile: "lite",
        installedAt: "x",
        components: [],
        role: "consumer",
        tracking_mode: "internal",
        content_sensitivity: "standard",
        push_policy: "open",
      }),
    ).toBeUndefined();
  });
});

describe("spell init — manifest flags", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const out = (): string => [...logSpy.mock.calls, ...errorSpy.mock.calls].map((c) => String(c[0])).join("\n");

  beforeEach(() => {
    noPromptsAllowed();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("--profile lite with flags records every flagged answer and asks nothing", async () => {
    const { work } = await freshRepo();

    await runInit(
      { profile: "lite", manifestFlags: { role: "hub", trackingMode: "internal", contentSensitivity: "sensitive", pushPolicy: "guarded" } },
      work,
      ASSETS_DIR,
      "0.1.0",
    );

    expect(exitSpy).not.toHaveBeenCalled();
    const manifest = await recorded(work);
    expect(manifest).toMatchObject({
      role: "hub",
      tracking_mode: "internal",
      external_provider: null,
      content_sensitivity: "sensitive",
      push_policy: "guarded",
    });
    expect(selectMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(out()).not.toContain("Some setup questions were left unanswered");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("--profile with only some flags names the exact line for the rest", async () => {
    const { work } = await freshRepo();

    await runInit({ profile: "lite", manifestFlags: { trackingMode: "internal", pushPolicy: "guarded" } }, work, ASSETS_DIR, "0.1.0");

    expect(out()).toContain("spell update --role <hub|consumer> --content-sensitivity <standard|sensitive>");
    const manifest = await recorded(work);
    expect(manifest.role).toBeUndefined();
    expect(manifest.content_sensitivity).toBeUndefined();
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("an invalid flag exits 1 before anything is written", async () => {
    const { work } = await freshRepo();

    await runInit({ profile: "lite", manifestFlags: { contentSensitivity: "secret" } }, work, ASSETS_DIR, "0.1.0");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(out()).toContain('unsupported value for "content_sensitivity": "secret"');
    await expect(fs.access(join(work, ".arcane.json"))).rejects.toThrow();
  });

  it("--subject-root answers the docs question", async () => {
    const { work } = await freshRepo();

    await runInit({ profile: "docs", manifestFlags: { subjectRoot: "records" } }, work, ASSETS_DIR, "0.1.0");

    expect((await recorded(work)).subject_root).toBe("records");
  }, VERY_HEAVY_TEST_TIMEOUT);
});

describe("spell update — manifest flags", () => {
  let realIsTTY: boolean | undefined;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const out = (): string => [...logSpy.mock.calls, ...errorSpy.mock.calls].map((c) => String(c[0])).join("\n");

  beforeEach(() => {
    noPromptsAllowed();
    realIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = undefined as unknown as boolean;
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
  });
  afterEach(() => {
    process.stdin.isTTY = realIsTTY as boolean;
    vi.restoreAllMocks();
  });

  it("without a TTY or flags, prints the exact flag line and records nothing", async () => {
    const { work } = await installedRepo();

    await runUpdate({}, work, ASSETS_DIR, "0.1.0");

    expect(out()).toContain(
      "spell update --role <hub|consumer> --tracking-mode <internal|external> --content-sensitivity <standard|sensitive> --push-policy <open|guarded|blocked>",
    );
    expect((await recorded(work)).role).toBeUndefined();
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("without a TTY, flags answer their questions and only the rest are listed", async () => {
    const { work } = await installedRepo();

    await runUpdate(
      { manifestFlags: { role: "consumer", trackingMode: "external", externalProvider: "github" } },
      work,
      ASSETS_DIR,
      "0.1.0",
    );

    const manifest = await recorded(work);
    expect(manifest).toMatchObject({ role: "consumer", tracking_mode: "external", external_provider: "github", version: "0.1.0" });
    expect(out()).toContain("spell update --content-sensitivity <standard|sensitive> --push-policy <open|guarded|blocked>");
    expect(out()).toContain('role: "consumer"');
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("--push-policy open on a blocked repository exits 1 naming spell unblock-push, and changes nothing", async () => {
    const { work } = await installedRepo({ push_policy: "blocked" });
    const before = await fs.readFile(join(work, ".arcane.json"), "utf-8");

    await runUpdate({ manifestFlags: { pushPolicy: "open" } }, work, ASSETS_DIR, "0.1.0");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(out()).toContain("spell unblock-push");
    expect(await fs.readFile(join(work, ".arcane.json"), "utf-8")).toBe(before);
  });

  it("a flag contradicting a recorded answer exits 1 naming the current value", async () => {
    const { work } = await installedRepo({ tracking_mode: "internal", external_provider: null });

    await runUpdate({ manifestFlags: { trackingMode: "external", externalProvider: "ado" } }, work, ASSETS_DIR, "0.1.0");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(out()).toContain('recorded tracking_mode: "internal"');
  });

  it("an invalid value exits 1 with the validator's message", async () => {
    const { work } = await installedRepo();

    await runUpdate({ manifestFlags: { pushPolicy: "sideways" } }, work, ASSETS_DIR, "0.1.0");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(out()).toContain('unsupported value for "push_policy": "sideways"');
  });

  it("tightening to blocked records it, prints the ARC-049 notice, and installs nothing", async () => {
    const { work } = await installedRepo({ push_policy: "guarded" });
    const configBefore = localConfig(work);

    await runUpdate({ manifestFlags: { pushPolicy: "blocked" } }, work, ASSETS_DIR, "0.1.0");

    expect(exitSpy).not.toHaveBeenCalled();
    expect((await recorded(work)).push_policy).toBe("blocked");
    expect(out()).toContain("spell block-push");
    expect(out()).toContain("NOT enforced");
    expect(localConfig(work)).toBe(configBefore);
    expect(await isHookEnforced(work)).toBe(false);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("on an already-current install, a flag is still recorded", async () => {
    const { work } = await installedRepo({ version: "0.1.0" });
    const tracked = ".arcane/governance/testing-standards.md";
    await fs.mkdir(join(work, ".arcane", "governance"), { recursive: true });
    await fs.copyFile(join(ASSETS_DIR, tracked), join(work, tracked));
    fixtureGit(work, ["add", "-A"]);
    fixtureGit(work, ["commit", "-m", "test: tracked file present"]);

    await runUpdate({ manifestFlags: { pushPolicy: "guarded" } }, work, ASSETS_DIR, "0.1.0");

    expect(out()).toContain("Already up to date.");
    expect((await recorded(work)).push_policy).toBe("guarded");
    expect(out()).toContain('recorded as "guarded"');
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("--dry-run validates and reports, but writes nothing", async () => {
    const { work } = await installedRepo();
    const before = await fs.readFile(join(work, ".arcane.json"), "utf-8");

    await runUpdate({ dryRun: true, manifestFlags: { role: "hub" } }, work, ASSETS_DIR, "0.1.0");

    expect(out()).toContain("[dry-run] Would record from flags:");
    expect(await fs.readFile(join(work, ".arcane.json"), "utf-8")).toBe(before);
  }, VERY_HEAVY_TEST_TIMEOUT);
});

describe.skipIf(!BIN)("manifest flags — built CLI, no TTY", () => {
  const run = (cwd: string, args: string[]) =>
    spawnSync("node", [BIN!, ...args], { cwd, encoding: "utf-8", input: "", env: { ...process.env } });

  it("`spell init --profile lite --tracking-mode internal --push-policy guarded` records both and asks nothing", async () => {
    const { work } = await freshRepo();

    const result = run(work, ["init", "--profile", "lite", "--tracking-mode", "internal", "--push-policy", "guarded"]);

    expect(result.status).toBe(0);
    const manifest = await recorded(work);
    expect(manifest.tracking_mode).toBe("internal");
    expect(manifest.external_provider).toBeNull();
    expect(manifest.push_policy).toBe("guarded");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("`spell update --push-policy open` on a blocked repository exits 1 naming spell unblock-push", async () => {
    const { work } = await installedRepo({ push_policy: "blocked" });

    const result = run(work, ["update", "--push-policy", "open"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spell unblock-push");
    expect((await recorded(work)).push_policy).toBe("blocked");
  }, HEAVY_TEST_TIMEOUT);

  it("an invalid value exits 1 with the validator's message", async () => {
    const { work } = await freshRepo();

    const result = run(work, ["init", "--profile", "lite", "--push-policy", "sideways"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('has an unsupported value for "push_policy": "sideways"');
    await expect(fs.access(join(work, ".arcane.json"))).rejects.toThrow();
  }, HEAVY_TEST_TIMEOUT);
});
