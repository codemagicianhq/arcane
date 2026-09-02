import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runWardCli } from "../src/commands/ward.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";

let dir: string | undefined;
let originalExitCode: number | string | undefined | null;

beforeEach(() => {
  originalExitCode = process.exitCode;
  process.exitCode = undefined;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
  if (dir) await removeFixtureDir(dir);
  dir = undefined;
  process.exitCode = originalExitCode ?? undefined;
  vi.restoreAllMocks();
});

describe("runWardCli: report-only default mode", () => {
  it("does not set a failing exit code even when leaks are found, without --gate", async () => {
    dir = await createFixtureDir("ward-cli-report-only");
    await writeFile(join(dir, "a.md"), "mentions realventure here", "utf8");
    await runWardCli(dir, { terms: "realventure" });
    expect(process.exitCode).toBeUndefined();
  });

  it("sets no failing exit code when nothing is found", async () => {
    dir = await createFixtureDir("ward-cli-clean");
    await writeFile(join(dir, "a.md"), "nothing here", "utf8");
    await runWardCli(dir, { terms: "realventure" });
    expect(process.exitCode).toBeUndefined();
  });
});

describe("runWardCli: --gate mode", () => {
  it("sets exit code 1 when a leak is found", async () => {
    dir = await createFixtureDir("ward-cli-gate-fail");
    await writeFile(join(dir, "a.md"), "mentions realventure here", "utf8");
    await runWardCli(dir, { terms: "realventure", gate: true });
    expect(process.exitCode).toBe(1);
  });

  it("does not set a failing exit code when only a protected-vendor-identifier hit exists, no leak", async () => {
    dir = await createFixtureDir("ward-cli-gate-vendor-only");
    await writeFile(join(dir, "a.md"), "calls the claude API", "utf8");
    await runWardCli(dir, { gate: true }); // no user terms -- only the vendor list is active
    expect(process.exitCode).toBeUndefined();
  });

  it("does not set a failing exit code when nothing is found", async () => {
    dir = await createFixtureDir("ward-cli-gate-clean");
    await writeFile(join(dir, "a.md"), "nothing here", "utf8");
    await runWardCli(dir, { terms: "realventure", gate: true });
    expect(process.exitCode).toBeUndefined();
  });
});

describe("runWardCli: --terms parsing", () => {
  it("splits comma-separated terms and trims whitespace", async () => {
    dir = await createFixtureDir("ward-cli-multi-terms");
    await writeFile(join(dir, "a.md"), "has secondterm here", "utf8");
    await runWardCli(dir, { terms: "firstterm, secondterm , thirdterm", gate: true });
    expect(process.exitCode).toBe(1);
  });

  it("treats an absent --terms as no user terms, not a crash", async () => {
    dir = await createFixtureDir("ward-cli-no-terms");
    await writeFile(join(dir, "a.md"), "plain content", "utf8");
    await expect(runWardCli(dir, {})).resolves.not.toThrow();
  });
});
