import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkVSCodeExtension } from "../src/commands/doctor.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

const EXTENSION_ID = "GitHub.copilot-chat";

let home: string;
const savedEnv: Record<string, string | undefined> = {};

/**
 * The check used to read `process.env.HOME` directly, which is routinely unset
 * on Windows. These tests point HOME somewhere useless on purpose: the home
 * directory now arrives as an argument, so a pass must come from the argument
 * and never from the environment.
 */
function poisonHomeEnv(dir: string) {
  for (const key of ["USERPROFILE", "HOME"]) {
    if (!(key in savedEnv)) savedEnv[key] = process.env[key];
    process.env[key] = dir;
  }
}

function restoreHomeEnv() {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete savedEnv[key];
  }
}

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "doctor-vscode-"));
});

afterEach(async () => {
  restoreHomeEnv();
  await removeFixtureDir(home);
});

describe("checkVSCodeExtension", () => {
  it("passes when the extension directory is present under the given home", async () => {
    await fs.mkdir(join(home, ".vscode", "extensions", `${EXTENSION_ID.toLowerCase()}-0.30.0`), {
      recursive: true,
    });

    const result = await checkVSCodeExtension(EXTENSION_ID, "GitHub Copilot (Chat)", home);

    expect(result.passed).toBe(true);
    expect(result.message).toContain(EXTENSION_ID);
  });

  it("finds an Insiders install too", async () => {
    await fs.mkdir(
      join(home, ".vscode-insiders", "extensions", `${EXTENSION_ID.toLowerCase()}-0.30.0`),
      { recursive: true },
    );

    const result = await checkVSCodeExtension(EXTENSION_ID, "GitHub Copilot (Chat)", home);

    expect(result.passed).toBe(true);
  });

  it("fails without blocking when nothing is installed", async () => {
    const result = await checkVSCodeExtension(EXTENSION_ID, "GitHub Copilot (Chat)", home);

    expect(result.passed).toBe(false);
    // A missing optional extension is a warning, never a doctor failure.
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("--install-extension");
  });

  // The remedy's binary used to come from spawning `code --version` and then
  // `code-insiders --version` -- 2.5s apiece on a machine where they answer,
  // unbounded where they don't, to pick one word. These three pin it to the
  // extension directories instead, which the check already reads.
  it("names code-insiders when only the Insiders directory exists", async () => {
    await fs.mkdir(join(home, ".vscode-insiders", "extensions"), { recursive: true });

    const result = await checkVSCodeExtension(EXTENSION_ID, "GitHub Copilot (Chat)", home);

    expect(result.message).toContain("code-insiders --install-extension");
  });

  it("prefers stable code when both directories exist", async () => {
    await fs.mkdir(join(home, ".vscode", "extensions"), { recursive: true });
    await fs.mkdir(join(home, ".vscode-insiders", "extensions"), { recursive: true });

    const result = await checkVSCodeExtension(EXTENSION_ID, "GitHub Copilot (Chat)", home);

    expect(result.message).toContain("code --install-extension");
    expect(result.message).not.toContain("code-insiders");
  });

  it("falls back to code when neither directory exists", async () => {
    const result = await checkVSCodeExtension(EXTENSION_ID, "GitHub Copilot (Chat)", home);

    expect(result.message).toContain("code --install-extension");
    expect(result.message).not.toContain("code-insiders");
  });

  it("reads the home directory from its argument, not from HOME/USERPROFILE", async () => {
    // The extension exists only under the argument's home.
    await fs.mkdir(join(home, ".vscode", "extensions", `${EXTENSION_ID.toLowerCase()}-0.30.0`), {
      recursive: true,
    });
    const decoy = await fs.mkdtemp(join(tmpdir(), "doctor-vscode-decoy-"));
    poisonHomeEnv(decoy);

    try {
      const result = await checkVSCodeExtension(EXTENSION_ID, "GitHub Copilot (Chat)", home);
      expect(result.passed).toBe(true);
    } finally {
      await removeFixtureDir(decoy);
    }
  });
});
