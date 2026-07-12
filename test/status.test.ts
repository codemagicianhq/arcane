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

// ─── Mock version-check so tests never hit the network ───────────────────────
vi.mock("../src/modules/version-check.js", () => ({
  getFeedUrl: vi.fn().mockReturnValue("https://fake.artifacts.feed/"),
  checkForUpdate: vi.fn().mockResolvedValue({
    current: "0.1.0",
    latest: "0.1.0",
    updateAvailable: false,
  }),
}));

const { runStatus } = await import("../src/commands/status.js");
const versionCheck = await import("../src/modules/version-check.js");

const BIN = join(process.cwd(), "dist/index.js");
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

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe("spell status — handler", () => {
  let tmpDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "status-test-"));
    logSpy = vi.spyOn(console, "log").mockImplementation(() => { });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    // Reset mocks to defaults before each test
    vi.mocked(versionCheck.getFeedUrl).mockReturnValue("https://fake.artifacts.feed/");
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: PACKAGE_VERSION,
      latest: PACKAGE_VERSION,
      updateAvailable: false,
    });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  // ─── Not initialized ───────────────────────────────────────────────────────

  it("prints helpful error and exits 1 when not initialized", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);

    await runStatus(tmpDir, PACKAGE_VERSION);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("spell init"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // ─── No components ─────────────────────────────────────────────────────────

  it("prints 'No components installed.' when manifest is empty", async () => {
    await writeManifest(tmpDir, { components: [] });

    await runStatus(tmpDir, PACKAGE_VERSION);

    expect(logSpy).toHaveBeenCalledWith("No components installed.");
  });

  // ─── Component table ───────────────────────────────────────────────────────

  it("shows each installed component with name, file count, and version", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
        {
          name: "git-conventions",
          files: [".arcane/governance/git-conventions.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).toContain("testing-standards");
    expect(allOutput).toContain("git-conventions");
    expect(allOutput).toContain("1");
    expect(allOutput).toContain(PACKAGE_VERSION);
  });

  it("shows column headers: Component, Files, Version", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).toContain("Component");
    expect(allOutput).toContain("Files");
    expect(allOutput).toContain("Version");
  });

  // ─── Version footer ────────────────────────────────────────────────────────

  it("shows installed and latest version in footer", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: PACKAGE_VERSION,
      latest: "0.2.0",
      updateAvailable: false,
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const footerLine = logSpy.mock.calls
      .map((c) => c[0] as string)
      .find((l) => l.includes("Installed:"));

    expect(footerLine).toBeDefined();
    expect(footerLine).toContain(`Installed: ${PACKAGE_VERSION}`);
    expect(footerLine).toContain("Latest: 0.2.0");
  });

  it("shows 'spell update available' when updateAvailable is true", async () => {
    await writeManifest(tmpDir, {
      version: "0.0.9",
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: "0.0.9",
        },
      ],
    });
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: "0.0.9",
      latest: PACKAGE_VERSION,
      updateAvailable: true,
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).toContain("spell update available");
  });

  it("shows 'unable to check' when version check returns an error", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: PACKAGE_VERSION,
      latest: null,
      updateAvailable: false,
      error: "Network timeout",
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).toContain("unable to check");
  });

  it("does NOT show 'spell update available' when already at latest", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: PACKAGE_VERSION,
      latest: PACKAGE_VERSION,
      updateAvailable: false,
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).not.toContain("spell update available");
  });
});

// ─── Built binary integration tests ──────────────────────────────────────────

describe("spell status — built CLI integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "status-bin-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("exits 1 with helpful message when not initialized", () => {
    const result = spawnSync("node", [BIN, "status"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spell init");
  });

  it("exits 0 and shows component table when initialized", async () => {
    const manifest: ArcaneManifest = {
      version: PACKAGE_VERSION,
      profile: "lite",
      installedAt: "2026-01-01T00:00:00.000Z",
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    };
    await fs.writeFile(join(tmpDir, ".arcane.json"), JSON.stringify(manifest, null, 2));

    const result = spawnSync("node", [BIN, "status"], {
      cwd: tmpDir,
      encoding: "utf8",
      // Network calls will fail but that's fine — error is caught gracefully
      env: { ...process.env },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("testing-standards");
    expect(result.stdout).toContain("Installed:");
  });
});
