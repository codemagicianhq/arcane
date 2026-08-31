import { beforeAll, describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
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
 * The paragraph containing `needle` — the anchored line plus the wrapped
 * continuation lines that belong to it, up to the next blank line.
 *
 * Markdown prose in these documents is hard-wrapped, so a single bullet's
 * meaning is routinely split across several lines. `lineContaining` is still
 * the right tool when the assertion is about one command and its annotation
 * sitting together; this one is for assertions about a whole statement.
 * Proximity is still what is being proved — just at paragraph granularity
 * rather than line granularity, so it cannot be satisfied by a match in an
 * unrelated section.
 */
function blockContaining(text: string, needle: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.includes(needle));
  if (start === -1) throw new Error(`No line contains "${needle}"`);
  if (lines.filter((l) => l.includes(needle)).length > 1) {
    throw new Error(`"${needle}" appears more than once; test needs a unique anchor`);
  }
  const block = [lines[start]!];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.trim() === "") break;
    // Stop at the next sibling bullet, so a block cannot absorb its neighbour.
    // Table rows, headings and code fences terminate it too: without them a
    // block could silently swallow the NEXT table row, and an assertion would
    // then pass on a match belonging to a different row entirely.
    if (/^\s*[-*]\s|^\s*\d+\.\s|^\s*\||^\s*#|^\s*```/.test(line)) break;
    block.push(line);
  }
  return block.join(" ");
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
    // Anchored on the primary-checkout instruction specifically. ARC-028 R8
    // added a SECOND mention of the same command on the linked-worktree path,
    // which is a prohibition -- so the bare command string is no longer a
    // unique anchor, and matching the wrong one would assert the EF-33
    // annotation against a "do not run this" line.
    const line = lineContaining(closeSession, "Delete the local topic branch: `git branch -d <branch>`");
    expect(line).toContain("EF-33 / ARC-028 R7");
    expectNotNegated(line);
  });

  it("spell-close-session forbids the same command on the linked-worktree path (ARC-028 R8)", () => {
    // The counterpart assertion, so the split cannot silently lose either half:
    // from a worktree the command FAILS, and the prompt must say so rather than
    // leaving an agent to discover it and reach for `-D`.
    const line = lineContaining(
      closeSession,
      "**Do not run `git branch -d <branch>` while this worktree is attached to it.**",
    );
    expect(line).toContain("cannot delete branch");
    expect(line).toContain("never reach for `-D`");
    // -D does not bypass an attachment refusal; implying it would is worse
    // than silence, because it invites the destructive attempt.
    expect(line).toContain("`-D` does not bypass this either");
  });

  it("spell-close-session forbids checking out trunk from a linked worktree (ARC-028 R8)", () => {
    const line = lineContaining(
      closeSession,
      "**If a working tree holds `<trunk>`, do not run `git switch <trunk>`.**",
    );
    expect(line).toContain("already used by worktree");
  });

  it("spell-close-session conditions the refusal on a working tree actually holding trunk", () => {
    // A bare repository with worktrees attached — a common agent-fleet layout —
    // usually has NO checkout holding trunk, and there both commands succeed.
    // Stating the failure unconditionally sent the agent down a path whose
    // stated reason was false and whose cleanup was assigned to a "primary
    // checkout" that does not exist.
    const line = lineContaining(closeSession, "First establish whether any working tree currently holds");
    expect(line).toContain("bare");
    expect(line).toContain("both succeed normally");
  });

  it("spell-close-session detects the primitive rather than assuming it", () => {
    // The fork is only safe if it is derived from real repository state; a
    // handoff claim is not evidence, and the session may have moved.
    expect(closeSession).toContain("git rev-parse --path-format=absolute --git-common-dir");
    expect(closeSession).toContain("git rev-parse --path-format=absolute --git-dir");
    // --path-format=absolute is load-bearing: without it --git-dir is absolute
    // and --git-common-dir is relative from any subdirectory, so every primary
    // checkout reads as a linked worktree.
    expect(closeSession).toContain("is required, not decorative");
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
    expect(line).toContain("misses every branch landed via this repo's sanctioned rebase-and-fast-forward");
    expect(line).toContain("Content-Verified Branch Deletion");
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

/**
 * ARC-028 item 11(a)/(b) — the primitive-scoping pass.
 *
 * These assert the SCOPING, not merely that worktrees are mentioned. The
 * defect being guarded is governance that instructs every session to
 * `git checkout main` and `git branch -d` after merge: from a linked worktree
 * both commands fail, and an agent told to do them unconditionally either
 * gets stuck or escalates to `-D`, which is how attached branches get
 * destroyed. Each site therefore has to name which primitive it applies to.
 */
describe("git-conventions scopes merge/cleanup to the primary checkout (ARC-028 R1/R8)", () => {
  it("the session-branch close names the primary checkout and the worktree alternative", () => {
    const line = lineContaining(gitConventions, "At close, push and open a PR.");
    expect(line).toContain("primary checkout only");
    expect(line).toContain("ARC-028 R8");
    expect(line).toContain("worktree removal");
    expectNotNegated(line);
  });

  it("the local fast-forward merge is marked primary-checkout work", () => {
    const line = lineContaining(gitConventions, "**Merge to main via fast-forward**");
    expect(line).toContain("primary-checkout work");
    expect(line).toContain("ARC-028 R1");
  });

  it("Magus+ self-merge distinguishes authority from mechanism", () => {
    // The scoping must not read as a power-level demotion: a Magus+ agent in a
    // worktree still self-merges, just through the PR rather than locally.
    // Block-scoped, not line-scoped -- this bullet wraps across four lines.
    const block = blockContaining(
      gitConventions,
      "**Magus+ agents, working in a linked worktree or a clone:**",
    );
    expect(block).toContain("ARC-028 R1");
    expect(block).toContain("The authority is the same");
    expect(block).toContain("the isolation primitive decides *how*");
  });

  it("Post-Merge Cleanup gives the worktree its own procedure, not a prohibition alone", () => {
    expect(gitConventions).toContain("**From a linked worktree, do not run the block above**");
    expect(gitConventions).toContain("git worktree remove <path>");
    // Both git refusals named, so neither reads as a tool malfunction.
    expect(gitConventions).toContain("cannot delete branch");
    expect(gitConventions).toContain("are the enforcement ARC-028 R3/R7 rely on");
  });
});

describe("spell-open-session selects an isolation primitive (ARC-028 R1-R5)", () => {
  it("names all three primitives and the selection order", () => {
    const line = lineContaining(openSession, "- **Isolation primitive (ARC-028 R1–R5):**");
    expect(line).toContain("primary checkout");
    expect(line).toContain("linked worktree");
    expect(line).toContain("full clone");
    expectNotNegated(line);
  });

  it("requires the choice before the Mutation Guard writes anything", () => {
    const line = lineContaining(openSession, "- **Isolation primitive (ARC-028 R1–R5):**");
    expect(line).toContain("before* the Mutation Guard");
  });

  it("makes footprint overlap override the choice rather than a note beside it", () => {
    const line = lineContaining(openSession, "**Footprint overlap overrides the choice (R4).**");
    expect(line).toContain("serialize");
    expect(line).toContain("hides them until merge review");
  });
});

describe("spell-full-cycle serializes overlapping epics (ARC-028 R4)", () => {
  let fullCycle: string;
  beforeAll(async () => {
    fullCycle = await readFile(join(PROMPTS, "spell-full-cycle.prompt.md"), "utf8");
  });

  it("requires a footprint comparison, including shared sequences", () => {
    const line = lineContaining(fullCycle, "**Multi-epic runs serialize by default (ARC-028 R4).**");
    expect(line).toContain("shared sequence");
    expect(line).toContain("migration");
    expect(line).toContain("lockfiles");
    expectNotNegated(line);
  });

  it("rejects an unstated comparison rather than accepting good intentions", () => {
    const line = lineContaining(fullCycle, "**Multi-epic runs serialize by default (ARC-028 R4).**");
    expect(line).toContain('"they seemed unrelated" is not a footprint comparison');
  });

  it("keeps parallelism available for genuinely disjoint work", () => {
    // A default that reads as a ban gets ignored; R4 serializes overlap, not
    // everything.
    expect(fullCycle).toContain("parallelism is available for genuinely disjoint footprints");
  });
});

describe("threat-model stops claiming credential exposure is mitigated (EF-35)", () => {
  let threatModel: string;
  beforeAll(async () => {
    threatModel = await readFile(join(GOVERNANCE, "threat-model.md"), "utf8");
  });

  it("records committed credentials as NOT mitigated, with the reason", () => {
    const line = lineContaining(threatModel, "| Credential committed to version control |");
    expect(line).toContain("**Not mitigated**");
    expect(line).toContain("no detection exists");
  });

  it("does not let the security-review spell stand in for a control", () => {
    const line = lineContaining(threatModel, "| Credential committed to version control |");
    expect(line).toContain("on-demand agent read, not a control");
  });

  it("still records at-rest token storage as mitigated, which is unchanged", () => {
    // Guards against the correction over-reaching into a claim that was true.
    const line = lineContaining(threatModel, "| Token/credential exposure (at rest) |");
    expect(line).toContain("**Mitigated**");
  });
});

/**
 * The EXHAUSTIVE guard (ARC-028 R8).
 *
 * Every other test in this file is a positive assertion about a file the
 * scoping pass touched — which is precisely why the pass shipped green while
 * three spells still carried an unconditional `git checkout main`. Review found
 * them by searching; the suite could not, because nothing here asked "is there
 * anywhere else?".
 *
 * This test asks. It scans every distributed prompt and governance document for
 * a trunk checkout and fails unless each one is scoped — so the next pass that
 * misses a site fails here rather than in a consuming repository.
 */
describe("no distributed instruction checks out trunk unconditionally (ARC-028 R8)", () => {
  const TRUNK_CHECKOUT = /git (checkout|switch) (main|master|<trunk>|\$\{?trunk)/;

  /**
   * Phrases that scope a trunk checkout to a primitive. Deliberately about
   * PRIMITIVE, not merely mentioning worktrees: "run this in a worktree too"
   * would contain the word and still be wrong.
   */
  const SCOPING = [
    "primary checkout",
    "primary-checkout",
    "PRIMARY CHECKOUT ONLY",
    "linked worktree, do not",
    "in a linked worktree, do not",
    "ARC-028 R1",
    "ARC-028 R8",
    "already used by worktree",
  ];

  async function distributedDocs(): Promise<{ file: string; text: string }[]> {
    const dirs = [PROMPTS, GOVERNANCE];
    const out: { file: string; text: string }[] = [];
    for (const dir of dirs) {
      for (const name of await readdir(dir)) {
        if (!name.endsWith(".md")) continue;
        out.push({ file: `${dir}/${name}`, text: await readFile(join(dir, name), "utf8") });
      }
    }
    return out;
  }

  it("every trunk checkout sits within scoping context", async () => {
    const unscoped: string[] = [];

    for (const { file, text } of await distributedDocs()) {
      const lines = text.split("\n");
      lines.forEach((line, index) => {
        if (!TRUNK_CHECKOUT.test(line)) return;
        // A window rather than the bare line: these are code blocks, so the
        // scoping sentence necessarily sits in the surrounding prose.
        const window = lines.slice(Math.max(0, index - 12), index + 12).join("\n");
        if (!SCOPING.some((phrase) => window.includes(phrase))) {
          unscoped.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(unscoped, `Unscoped trunk checkout(s):\n${unscoped.join("\n")}`).toEqual([]);
  });

  it("the guard is capable of failing", async () => {
    // A negative test that cannot fail is worse than none — it reports safety
    // it never checked. Prove the matcher fires on the exact shape it hunts.
    const bait = "0. Sync workspace:\n   git checkout main && git pull --ff-only\n";
    const line = bait.split("\n")[1]!;
    expect(TRUNK_CHECKOUT.test(line)).toBe(true);
    expect(SCOPING.some((phrase) => bait.includes(phrase))).toBe(false);
  });
});
