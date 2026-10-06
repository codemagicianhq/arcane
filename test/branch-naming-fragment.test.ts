import { beforeAll, describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { expandFragment, referencesFragment } from "../src/modules/spell-compiler.js";

// TODO.md "Claude Code worktree branches bypass Arcane's branch-naming
// standard": the branch formats live in ONE editable file, the ARC-039
// fragment `branch-naming`. Governance, the spells and the generated client
// instruction files carry machine-synced copies; nothing restates a format by
// hand. A second fragment, `branch-rename-gate`, carries the rename-on-sight
// procedure and deliberately holds no format of its own.

const ROOT = process.cwd();
const ASSETS = join(ROOT, "src", "assets");
const FRAGMENTS = join(ASSETS, ".arcane", "spells", "_fragments");

const RULE_CONSUMERS = [
  ".arcane/governance/git-conventions.md",
  ".github/instructions/agent-output.instructions.md",
  ".arcane/spells/spell-open-session.md",
  ".arcane/spells/spell-create-pull-request.md",
];
const GATE_CONSUMERS = [
  ".arcane/governance/git-conventions.md",
  ".arcane/spells/spell-open-session.md",
  ".arcane/spells/spell-create-pull-request.md",
];

// The formats as the rule writes them. Outside the rule fragment and the
// machine-synced spans, no source file may contain either.
const FORMAT_LITERALS = ["sessions/YYYY-MM-DD", "{agent-slug}/type/short-description"];

let rule: string;
let gate: string;

beforeAll(async () => {
  rule = await readFile(join(FRAGMENTS, "branch-naming.md"), "utf8");
  gate = await readFile(join(FRAGMENTS, "branch-rename-gate.md"), "utf8");
});

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      out.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      out.push(path);
    }
  }
  return out;
}

/** Drops every fragment span and every Arcane-owned instruction block: those are generated copies. */
function withoutGeneratedCopies(text: string): string {
  return text
    .replace(/<!-- fragment:([a-z0-9-]+):start -->[\s\S]*?<!-- fragment:\1:end -->/g, "")
    .replace(/<!-- arcane:start -->[\s\S]*?<!-- arcane:end -->/g, "");
}

describe("the branch-naming fragment: one rule for every actor", () => {
  it("names the three actors and gives each exactly one format", () => {
    expect(rule).toContain("| A human | `type/short-description` |");
    expect(rule).toContain("`sessions/YYYY-MM-DD-<topic-slug>`; a parallel subagent appends `-<agent>`");
    expect(rule).toContain("| An autonomous roster agent on a dispatched job");
    expect(rule).toContain("`{agent-slug}/type/short-description`");
    for (const literal of FORMAT_LITERALS) {
      expect(rule.split(literal), literal).toHaveLength(2);
    }
  });

  it("covers worktrees and parallel subagents, and tells the client to supply the name", () => {
    expect(rule).toContain("including every worktree it opens and every parallel subagent it spawns");
    expect(rule).toContain("Claude Code's `EnterWorktree` takes a `name`");
    expect(rule).toContain("`git worktree add <path> -b <branch>` pre-creates the branch");
    expect(rule).toContain("never accept a generated name");
  });

  it("declares tool-generated names noncompliant wherever they appear", () => {
    expect(rule).toContain("`claude/<adjective>-<surname>-<hash>`");
    expect(rule).toContain("noncompliant wherever it appears and is renamed on sight");
  });

  it("carries its enforcement label and names the gates that apply it", () => {
    expect(rule).toContain("**Enforcement: structured spell gate (ARC-023)");
    expect(rule).toContain("`spell-open-session`'s Mutation Guard");
    expect(rule).toContain("`spell-create-pull-request`'s Step 0");
    expect(rule).toContain("no CI check reads a pull request's head-branch name");
  });
});

describe("the branch-rename-gate fragment: the procedure, without a format of its own", () => {
  it("acts only on this worktree's branch and never on a branch an open pull request depends on", () => {
    expect(gate).toContain("`git worktree list`");
    expect(gate).toContain("never rename, switch or delete a branch attached to another worktree");
    expect(gate).toContain("renamed only when no open pull request depends on it");
    expect(gate).toContain("`gh pr list --head <branch> --state open`");
  });

  it("derives the name from the work, migrates a pushed branch under the push-policy check, and reports", () => {
    expect(gate).toContain("in the session form of the rule");
    expect(gate).toContain("`git branch -m <old> <new>`");
    expect(gate).toContain("push-policy check (ARC-049)");
    expect(gate).toContain("Report `Renamed <old> → <new>`");
    expect(gate).toContain("stop without renaming and ask the operator");
  });

  it("holds no format literal: the rule fragment is the only source", () => {
    for (const literal of FORMAT_LITERALS) {
      expect(gate, literal).not.toContain(literal);
    }
  });
});

describe("consumers reference the fragments and carry current copies", () => {
  it.each(RULE_CONSUMERS)("%s hosts the branch-naming span, expanded and current", async (path) => {
    const content = await readFile(join(ASSETS, path), "utf8");
    expect(referencesFragment(content, "branch-naming")).toBe(true);
    expect(expandFragment(content, "branch-naming", rule)).toBe(content);
  });

  it.each(GATE_CONSUMERS)("%s hosts the branch-rename-gate span, expanded and current", async (path) => {
    const content = await readFile(join(ASSETS, path), "utf8");
    expect(referencesFragment(content, "branch-rename-gate")).toBe(true);
    expect(expandFragment(content, "branch-rename-gate", gate)).toBe(content);
  });

  it("the governance rule says the fragment is the one source", async () => {
    const conventions = await readFile(join(ASSETS, ".arcane/governance/git-conventions.md"), "utf8");
    expect(conventions).toContain("The rule below is the one source for every branch format Arcane names.");
  });
});

describe("single source: no format literal outside the rule fragment and its generated copies", () => {
  it("scans every shipped Markdown asset, every TypeScript source, and this repository's own instruction files", async () => {
    const candidates = [
      ...(await listFiles(ASSETS)).filter((p) => p.endsWith(".md")),
      ...(await listFiles(join(ROOT, "src"))).filter((p) => p.endsWith(".ts")),
      ...(await listFiles(join(ROOT, "scripts"))).filter((p) => p.endsWith(".ts")),
      join(ROOT, "README.md"),
      join(ROOT, "CLAUDE.md"),
      join(ROOT, "AGENTS.md"),
      join(ROOT, ".github", "copilot-instructions.md"),
    ];
    const source = join(FRAGMENTS, "branch-naming.md");
    const offenders: string[] = [];
    for (const path of candidates) {
      if (path === source) continue;
      const text = withoutGeneratedCopies(await readFile(path, "utf8"));
      for (const literal of FORMAT_LITERALS) {
        if (text.includes(literal)) offenders.push(`${relative(ROOT, path)} (${literal})`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
