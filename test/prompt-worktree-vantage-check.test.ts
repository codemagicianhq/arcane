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

/** The single line containing `needle`, so callers can assert attachment/proximity rather than mere presence anywhere in the file. Throws if not found or if ambiguous, so a test failure is loud rather than silently matching the wrong occurrence. */
function lineContaining(text: string, needle: string): string {
  const matches = text.split("\n").filter((l) => l.includes(needle));
  if (matches.length === 0) throw new Error(`No line contains "${needle}"`);
  if (matches.length > 1) {
    throw new Error(`"${needle}" appears on ${matches.length} lines; test needs a unique anchor`);
  }
  return matches[0];
}

/**
 * Guards against a `lineContaining` proximity assertion being satisfied by
 * an INVERTED sentence -- physical adjacency on one line proves attachment,
 * not polarity. A future edit could keep every required phrase on the same
 * line while flipping its meaning ("...is NOT required for...", "...does
 * not apply here..."). Call after every positive lineContaining assertion
 * in this file, not just the one this pattern was first built for.
 */
function expectNotNegated(line: string): void {
  expect(line.toLowerCase()).not.toMatch(
    /does not apply|is exempt|no check (is )?(required|needed)|not required|n\/a here|does not carry/,
  );
}

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

  // R1 (adversarial review, HIGH): the original mechanism let an agent
  // "confirm" a path from its OWN process without ever establishing that
  // process is in the right vantage point to begin with -- checking from
  // the same bridged process that produced the false read just reproduces
  // the failure. Assert the fix's actual content, not just its presence.
  it("requires establishing the agent's OWN vantage point before trusting an existence check against it", () => {
    expect(gitConventions).toContain("First confirm your OWN vantage point, before trusting anything else");
    expect(gitConventions).toContain(
      "running the \"independent\" check from the *same* bridged/mounted process that produced the `git worktree list` read reproduces the exact failure",
    );
  });

  it("gives a concrete, mechanical trigger (path-syntax mismatch), not just 'use your judgment'", () => {
    expect(gitConventions).toContain(
      "does the registered path's own syntax match the current process's native OS conventions",
    );
    expect(gitConventions).toContain("is itself proof you are not viewing this repository from the environment that registered it");
  });

  it("makes 'stop and ask' the default outcome when vantage-point confidence isn't established, not a rare escape hatch", () => {
    expect(gitConventions).toContain(
      "This is the default outcome whenever step 2's confidence isn't genuinely established — not a rare escape hatch",
    );
  });

  // R2 (adversarial review, MEDIUM): the original scope-gate wrapped the
  // WHOLE procedure in "when reached through more than one filesystem
  // view," including the branch-ancestry reminder -- but that hazard is
  // unconditional (fires on one machine, no bridge). A same-machine agent
  // could correctly skip the cross-filesystem gate and lose the
  // ancestry reminder along with it. Assert the two are now separated.
  it("states the branch-ancestry hazard as unconditional, not gated behind the cross-filesystem trigger", () => {
    const unconditionalNote = lineContaining(
      gitConventions,
      "Unconditional, vantage-point-independent note on branch deletion",
    );
    expect(unconditionalNote).toContain("nothing to do with filesystem bridges");
    expect(unconditionalNote).toContain("fires identically on a single machine with no mount involved");
  });

  it("scopes the destructive-operation list to the correct sentence, not inverted or scattered", () => {
    const scopeLine = lineContaining(
      gitConventions,
      "Before running any Git command with irreversible effects on worktree, branch, or ref state",
    );
    for (const op of ["git worktree prune", "git worktree remove", "git gc --prune=now", "git branch -d`/`-D"]) {
      expect(scopeLine).toContain(op);
    }
    // Directional guard: the scope statement must require the check, not
    // exempt these commands from it.
    expectNotNegated(scopeLine);
  });

  it("documents itself as a standing operational caution, not a CI-testable gate", () => {
    expect(gitConventions).toContain("no single CI runner can reproduce");
  });
});

describe("branch-deletion sites reference the check, attached to the actual command (EF-33)", () => {
  // R4 (adversarial review, MEDIUM): the original tests only checked that
  // the rail phrase appeared SOMEWHERE in each file -- a disconnected
  // comment anywhere would have passed while the real `git branch -d` line
  // shipped unguarded. Anchor each assertion to the line containing the
  // actual command.
  it("spell-commit-work's git branch -d line is directly annotated with the check", () => {
    const line = lineContaining(commitWork, "git branch -d <branch>`");
    expect(line).toContain("EF-33 / ARC-028 R7");
    expect(line).toContain("Same-Vantage-Point Check");
    expectNotNegated(line);
  });

  it("spell-close-session's git branch -d line is directly annotated with the check", () => {
    const line = lineContaining(closeSession, "git branch -d <branch>`");
    expect(line).toContain("EF-33 / ARC-028 R7");
    expectNotNegated(line);
  });

  it("spell-ship's git branch -d line is directly annotated with the check", () => {
    const line = lineContaining(ship, "git branch -d <branch>`)");
    expect(line).toContain("EF-33 / ARC-028 R7");
    expectNotNegated(line);
  });
});

describe("spell-open-session caveats the reads that can produce false-prunable state (EF-33)", () => {
  it("the worktree-list line itself carries the cross-mount caveat", () => {
    const line = lineContaining(openSession, "git worktree list`.");
    expect(line).toContain("can truthfully report a live, healthy worktree as `prunable`");
    expectNotNegated(line);
  });

  it("the stale-branch line itself points at content-verification, not ancestry alone", () => {
    const line = lineContaining(openSession, "git branch --merged main`");
    expect(line).toContain("rebase-and-fast-forward merges are invisible to `--merged`");
    expectNotNegated(line);
  });
});

describe("agent-policies.md gains the working-tree dimension (ARC-028 item 11a)", () => {
  it("rule 8 is present alongside the existing 7 Multi-Agent Concurrency Rules", () => {
    expect(agentPolicies).toContain("7. **Merge window.**");
    expect(agentPolicies).toContain("8. **Working-tree vantage point (EF-33 / ARC-028 R7)");
  });

  it("names the fleet-wide shared .git/config hazard", () => {
    expect(agentPolicies).toContain("share one physical `.git` and `.git/config`");
    expect(agentPolicies).toContain("fleet-wide");
  });

  // R3 (adversarial review, MEDIUM): rule 8 lives under "Multi-Agent
  // Concurrency Rules," whose header scopes the whole list to "When more
  // than one agent may work in the same repository simultaneously" -- but
  // the vantage-point hazard applies to a lone agent too. Assert the rule
  // itself flags that mismatch rather than silently inheriting it.
  it("flags that the hazard applies even to a solo agent, despite the section header's multi-agent framing", () => {
    const rule8 = lineContaining(
      agentPolicies,
      "8. **Working-tree vantage point (EF-33 / ARC-028 R7)",
    );
    expect(rule8).toContain("applies even to a solo agent");
    expectNotNegated(rule8);
  });
});
