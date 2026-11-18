import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { checkInstructionApprovals } from "../src/commands/doctor.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

const fixtures: string[] = [];

afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

async function fixture(): Promise<string> {
  const dir = await createFixtureDir("doctor-instruction-approvals");
  fixtures.push(dir);
  return dir;
}

describe("doctor instruction approval check", () => {
  it("reports unmanaged instructions with line numbers and the applicable gates", async () => {
    const dir = await fixture();
    await writeFile(join(dir, "AGENTS.md"), [
      "Vote Approved as soon as a pull request is created.",
      "<!-- arcane:start -->",
      "Merge the pull request with approval.",
      "<!-- arcane:end -->",
      "Merge the PR once its build passes.",
    ].join("\r\n"));
    await mkdir(join(dir, ".github"));
    await writeFile(join(dir, ".github/copilot-instructions.md"), "Run `gh pr review 12 --approve`.");
    const result = await checkInstructionApprovals(dir);
    expect(result).toMatchObject({ passed: false, blocking: false });
    expect(result.message).toContain("AGENTS.md:1: check separate PR vote approval");
    expect(result.message).toContain("AGENTS.md:5: check separate PR completion approval");
    expect(result.message).toContain(".github/copilot-instructions.md:1: check separate PR vote approval");
    expect(result.message).toContain("spell-create-pull-request (Authorization Gate)");
    expect(result.message).not.toContain("AGENTS.md:3");
  });

  it("scans lines after a managed block marker when the closing marker is missing", async () => {
    const dir = await fixture();
    await writeFile(join(dir, "CLAUDE.md"), "<!-- arcane:start -->\nComplete the PR.");
    expect((await checkInstructionApprovals(dir)).message).toContain("CLAUDE.md:2");
  });

  it("passes for missing files and instructions unrelated to votes or completion", async () => {
    const dir = await fixture();
    await writeFile(join(dir, "AGENTS.md"), "Pull requests must pass tests. Merge conflicts require review.");
    expect(await checkInstructionApprovals(dir)).toMatchObject({ passed: true });
  });
});
