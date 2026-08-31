import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");
const INSTRUCTIONS = join(process.cwd(), "src", "assets", ".github", "instructions");
const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");

let gitConventions: string;
let agentOutput: string;
let commitWork: string;

beforeAll(async () => {
  [gitConventions, agentOutput, commitWork] = await Promise.all([
    readFile(join(GOVERNANCE, "git-conventions.md"), "utf8"),
    readFile(join(INSTRUCTIONS, "agent-output.instructions.md"), "utf8"),
    readFile(join(PROMPTS, "spell-commit-work.prompt.md"), "utf8"),
  ]);
});

describe("git-conventions.md: canonical MCP fail-fast / fallback rule (I8/BC-22)", () => {
  it("states the rule and names all four abnormal-failure triggers", () => {
    expect(gitConventions).toContain("**MCP fail-fast / fallback rule:**");
    expect(gitConventions).toContain("a hang, an idle-timeout abort, a");
    expect(gitConventions).toContain("transport error, or an empty response where data is clearly expected");
  });

  it("marks the server down for the rest of the session, not just the one call", () => {
    expect(gitConventions).toContain("marks that MCP server **down");
    expect(gitConventions).toContain("for the rest of the session**");
  });

  it("requires the downgrade to be reported in output", () => {
    expect(gitConventions).toContain("the downgrade is");
    expect(gitConventions).toContain("reported in output so a human sees it happened");
  });

  it("names the two existing Known-issues rows as instances, not special cases", () => {
    expect(gitConventions).toContain(
      "are concrete instances of this general rule, not special cases of their own",
    );
  });

  it("includes consumer hardening advice for the per-server timeout", () => {
    expect(gitConventions).toContain('set a per-server `"timeout"` (milliseconds) in `.mcp.json`');
  });

  it("cites the real origin incident, not a hypothetical", () => {
    expect(gitConventions).toContain(
      "a real ops session lost roughly an hour to two consecutive 30-minute MCP hangs",
    );
  });
});

describe("agent-output.instructions.md: references the canonical rule, does not restate it (D8)", () => {
  it("has an MCP Fail-Fast / Fallback section pointing at git-conventions.md", () => {
    expect(agentOutput).toContain("## MCP Fail-Fast / Fallback");
    expect(agentOutput).toContain(".arcane/governance/git-conventions.md");
  });
});

describe("spell-commit-work.prompt.md step 9: MCP fail-fast embed (BC-22)", () => {
  it("adds the embed as step 9's own sub-step, before the mandatory pre-PR rebase", () => {
    const mcpIndex = commitWork.indexOf("**MCP fail-fast / fallback.**");
    const rebaseIndex = commitWork.indexOf("Mandatory pre-PR rebase");
    expect(mcpIndex).toBeGreaterThan(-1);
    expect(mcpIndex).toBeLessThan(rebaseIndex);
  });

  it("tells the agent to fall back to the raw CLI paths without retrying blindly", () => {
    expect(commitWork).toContain("Do not retry it blindly; fall back to the raw CLI paths below");
  });
});
