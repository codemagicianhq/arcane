import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkGovernancePlaceholders, checkPushPolicy, runDoctor } from "../src/commands/doctor.js";
import {
  PLACEHOLDER_STANDARD_FILE,
  RUNTIME_PLACEHOLDERS_END,
  RUNTIME_PLACEHOLDERS_START,
} from "../src/modules/placeholders.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// UP02-D-03: ARC-051 decision 4 (#277) and ARC-049 decision 3 (#280).

let dir: string | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  if (dir) await removeFixtureDir(dir);
  dir = undefined;
});

const STANDARD = [
  "---",
  "status: active",
  "---",
  "",
  RUNTIME_PLACEHOLDERS_START,
  "- `{OPERATOR_NAME}` — `git config user.name`.",
  RUNTIME_PLACEHOLDERS_END,
  "",
].join("\n");

function doc(status: string, body: string): string {
  return `---\ntitle: T\nstatus: ${status}\n---\n\n${body}\n`;
}

async function fixture(prefix: string, files: Record<string, string>): Promise<string> {
  dir = await createFixtureDir(prefix);
  const gov = join(dir, ".arcane", "governance");
  await mkdir(gov, { recursive: true });
  for (const [name, content] of Object.entries(files)) await writeFile(join(gov, name), content, "utf8");
  return dir;
}

describe("checkGovernancePlaceholders (ARC-051)", () => {
  it("warns, non-blocking, naming each unknown token with its file", async () => {
    const target = await fixture("doctor-placeholders-unknown", {
      [PLACEHOLDER_STANDARD_FILE]: STANDARD,
      "alpha.md": doc("active", "Owner {OPERATOR_NAME}, venue {VENUE_NAME}."),
      "beta.md": doc("active", "Slot {ROSTER_SLOT}."),
    });
    const result = await checkGovernancePlaceholders(target);
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain(".arcane/governance/alpha.md: {VENUE_NAME}");
    expect(result.message).toContain(".arcane/governance/beta.md: {ROSTER_SLOT}");
    expect(result.message).not.toContain("{OPERATOR_NAME}");
    expect(result.message).toContain("status: template");
  });

  it("is silent for a listed runtime token and for a status: template doc", async () => {
    const target = await fixture("doctor-placeholders-clean", {
      [PLACEHOLDER_STANDARD_FILE]: STANDARD,
      "alpha.md": doc("active", "Owner {OPERATOR_NAME}."),
      "fill-in.md": doc("template", "Fill in {YOUR_ROSTER} and {YOUR_DOMAIN}."),
    });
    const result = await checkGovernancePlaceholders(target);
    expect(result.passed).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(result.message).toBe("2 active doc(s) scanned, no unknown placeholders");
  });

  it("is skipped, not failed, when spell-authoring-standards.md is not installed", async () => {
    const target = await fixture("doctor-placeholders-no-standard", {
      "alpha.md": doc("active", "Venue {VENUE_NAME}."),
    });
    const result = await checkGovernancePlaceholders(target);
    expect(result).toMatchObject({ passed: true, blocking: false, skipped: true });
    expect(result.message).toBe(`skipped — ${PLACEHOLDER_STANDARD_FILE} is not installed`);
  });

  it("is skipped in a repository with no .arcane/governance at all", async () => {
    dir = await createFixtureDir("doctor-placeholders-bare");
    const result = await checkGovernancePlaceholders(dir);
    expect(result).toMatchObject({ passed: true, skipped: true });
  });
});

describe("spell doctor output and exit code with an unknown placeholder", () => {
  async function doctorRun(target: string): Promise<{ output: string; exitCode: number | undefined }> {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
    const saved = process.exitCode;
    process.exitCode = undefined;
    try {
      await runDoctor(target);
      return { output: lines.join("\n"), exitCode: process.exitCode as number | undefined };
    } finally {
      process.exitCode = saved;
      vi.restoreAllMocks();
    }
  }

  it(
    "prints a [warn] row naming the token and leaves the exit code as it was without it",
    async () => {
      const target = await fixture("doctor-placeholders-run", {
        [PLACEHOLDER_STANDARD_FILE]: STANDARD,
        "alpha.md": doc("active", "Owner {OPERATOR_NAME}."),
      });
      const clean = await doctorRun(target);
      expect(clean.output).toMatch(/\[pass\] Governance placeholders \(ARC-051\)/);

      await writeFile(join(target, ".arcane", "governance", "beta.md"), doc("active", "Venue {VENUE_NAME}."), "utf8");
      const warned = await doctorRun(target);
      expect(warned.output).toMatch(/⚠ \[warn\] Governance placeholders \(ARC-051\)/);
      expect(warned.output).toContain(".arcane/governance/beta.md: {VENUE_NAME}");
      expect(warned.exitCode).toBe(clean.exitCode);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "prints a [skip] row with its reason when the standard is not installed",
    async () => {
      const target = await fixture("doctor-placeholders-run-skip", {
        "alpha.md": doc("active", "Venue {VENUE_NAME}."),
      });
      const run = await doctorRun(target);
      expect(run.output).toMatch(/\[skip\] Governance placeholders \(ARC-051\)/);
      expect(run.output).toContain(`skipped — ${PLACEHOLDER_STANDARD_FILE} is not installed`);
      expect(run.output).not.toContain("{VENUE_NAME}");
    },
    HEAVY_TEST_TIMEOUT,
  );
});

describe("checkPushPolicy remedy (ARC-049 decision 3)", () => {
  it(
    "names `spell block-push` when blocked is declared but not enforced",
    async () => {
      dir = await createFixtureDir("doctor-push-policy-remedy");
      runGit(dir, ["init", "-q"]);
      await writeFile(
        join(dir, ".arcane.json"),
        JSON.stringify({ version: "1.5.1", profile: "full", installedAt: "2026-09-27", components: [], push_policy: "blocked" }),
        "utf8",
      );
      const result = await checkPushPolicy(dir);
      expect(result.passed).toBe(false);
      expect(result.blocking).toBe(false);
      expect(result.message).toMatch(/^declared "blocked" but not enforced/);
      expect(result.message).toContain("Run `spell block-push` to install the controls.");
    },
    HEAVY_TEST_TIMEOUT,
  );
});
