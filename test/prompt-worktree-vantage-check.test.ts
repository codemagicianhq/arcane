import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");
const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");

let gitConventions: string;
let agentPolicies: string;
let commitWork: string;
let closeSession: string;
let ship: string;
let openSession: string;

beforeAll(async () => {
  [gitConventions, agentPolicies, commitWork, closeSession, ship, openSession] = await Promise.all([
    readFile(join(GOVERNANCE, "git-conventions.md"), "utf8"),
    readFile(join(GOVERNANCE, "agent-policies.md"), "utf8"),
    readFile(join(PROMPTS, "spell-commit-work.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-close-session.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-ship.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-open-session.prompt.md"), "utf8"),
  ]);
});

describe("git-conventions.md defines the same-vantage-point check (EF-33 / ARC-028 R7)", () => {
  it("is present as a named section, after Post-Merge Cleanup", () => {
    const postMergeIndex = gitConventions.indexOf("### Post-Merge Cleanup");
    const vantageIndex = gitConventions.indexOf("### Same-Vantage-Point Check");
    expect(postMergeIndex).toBeGreaterThan(-1);
    expect(vantageIndex).toBeGreaterThan(postMergeIndex);
  });

  it("names the exact mechanism: independent existence check, never Git's own report alone", () => {
    expect(gitConventions).toContain("git worktree list --porcelain");
    expect(gitConventions).toContain("Test-Path");
    expect(gitConventions).toContain("Never treat Git's own");
  });

  it("scopes to destructive operations specifically", () => {
    for (const op of ["git worktree prune", "git worktree remove", "git gc --prune=now", "git branch -d"]) {
      expect(gitConventions).toContain(op);
    }
  });

  it("documents itself as a standing operational caution, not a CI-testable gate", () => {
    expect(gitConventions).toContain("no single CI runner can reproduce");
  });
});

describe("branch-deletion sites reference the check (EF-33)", () => {
  it("spell-commit-work's post-merge cleanup step references it", () => {
    expect(commitWork).toContain("EF-33 / ARC-028 R7");
    expect(commitWork).toContain("Same-Vantage-Point Check");
  });

  it("spell-close-session's integration-branch sync step references it", () => {
    expect(closeSession).toContain("EF-33 / ARC-028 R7");
  });

  it("spell-ship's post-merge branch cleanup step references it", () => {
    expect(ship).toContain("EF-33 / ARC-028 R7");
  });
});

describe("spell-open-session caveats the reads that can produce false-prunable state (EF-33)", () => {
  it("the worktree-list read carries the cross-mount caveat", () => {
    expect(openSession).toContain("git worktree list");
    expect(openSession).toContain("can truthfully report a live, healthy worktree as `prunable`");
  });

  it("the stale-branch read points at content-verification, not ancestry alone", () => {
    expect(openSession).toContain("git branch --merged main");
    expect(openSession).toContain("rebase-and-fast-forward merges are invisible to `--merged`");
  });
});

describe("agent-policies.md gains the working-tree dimension (ARC-028 item 11a)", () => {
  it("rule 8 is present alongside the existing 7 Multi-Agent Concurrency Rules", () => {
    expect(agentPolicies).toContain("7. **Merge window.**");
    expect(agentPolicies).toContain("8. **Working-tree vantage point (EF-33 / ARC-028 R7).**");
  });

  it("names the fleet-wide shared .git/config hazard", () => {
    expect(agentPolicies).toContain("share one physical `.git` and `.git/config`");
    expect(agentPolicies).toContain("fleet-wide");
  });
});
