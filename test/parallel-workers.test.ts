import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getComponent, getProfile } from "../src/modules/registry.js";

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");
const COMMANDS = join(process.cwd(), "src", "assets", ".claude", "commands");
const SKILLS = join(process.cwd(), "src", "assets", ".agents", "skills");

let spell: string;
let commandStub: string;
let codexSkill: string;

beforeAll(async () => {
  [spell, commandStub, codexSkill] = await Promise.all([
    readFile(join(SPELLS, "spell-parallel-workers.md"), "utf8"),
    readFile(join(COMMANDS, "spell-parallel-workers.md"), "utf8"),
    readFile(join(SKILLS, "spell-parallel-workers", "SKILL.md"), "utf8"),
  ]);
});

/**
 * Text of the section that starts at `heading` and runs to the next heading of the same or higher
 * level. Headings inside code fences (the brief and note templates carry their own) do not end it.
 */
function section(heading: string): string {
  const level = heading.match(/^#+/)![0].length;
  const lines = spell.split("\n");
  const start = lines.indexOf(heading);
  expect(start, `missing heading: ${heading}`).toBeGreaterThan(-1);
  let inFence = false;
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("```")) inFence = !inFence;
    const hashes = !inFence && line.match(/^(#+) /);
    if (hashes && hashes[1].length <= level) break;
    body.push(line);
  }
  return body.join("\n");
}

describe("spell-parallel-workers.md", () => {
  it("has the front matter a catalog consumer needs", () => {
    expect(spell).toContain("name: Spell — Parallel Workers");
    expect(spell).toMatch(/^tagline: .{1,60}$/m);
    expect(spell).not.toMatch(/^tagline: .*\.$/m);
    expect(spell).toContain("claude_description: Use PROACTIVELY when");
  });

  it("states when to use it and when not to, including the disjoint-files and listable-edits preconditions", () => {
    const text = section("## When to use it, and when not to");
    expect(text).toContain("**Disjoint footprints.**");
    expect(text).toContain("**Shared-file edits are listable up front.**");
    expect(text).toContain("Do **not** use it for sequential work, tightly coupled work");
  });

  it("orders the orchestrator workflow from qualifying the work to closing out", () => {
    const headings = [
      "### Step 0 — Qualify the work",
      "### Step 1 — Write the plan",
      "### Step 2 — Ask the operator",
      "### Step 3 — Start the workers",
      "### Step 4 — While the workers run",
      "### Step 5 — Receive and verify each report",
      "### Step 6 — Integrate when the stack reaches the slice",
      "### Step 7 — Close out",
    ];
    const positions = headings.map((h) => spell.indexOf(h));
    positions.forEach((p, i) => expect(p, headings[i]).toBeGreaterThan(-1));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("keeps every shared-file and protocol step with the orchestrator, and forbids workers from them", () => {
    const rules = section("### Worker rules");
    for (const forbidden of ["shared file", "stack branch", "push", "open a pull request", "queue a pipeline", "write docs"]) {
      expect(rules.toLowerCase()).toContain(forbidden);
    }
    expect(rules).toContain("Do not run the session, commit, review or pull-request spells");
    const integrate = section("### Step 6 — Integrate when the stack reaches the slice");
    for (const owned of ["**Rebase**", "**Apply the shared-file edits**", "**Run the full checks**", "`spell-security-review`", "**Fix every finding.**", "The operator approves and merges."]) {
      expect(integrate).toContain(owned);
    }
  });

  it("runs the reviews before the pull request exists, and stops spell-commit-work before its push", () => {
    const integrate = section("### Step 6 — Integrate when the stack reaches the slice");
    expect(integrate).toContain("`spell-commit-work` steps 1–8 only");
    expect(integrate.indexOf("`spell-security-review`")).toBeLessThan(integrate.indexOf("**Open the pull request**"));
  });

  it("never passes commit authority along in a brief, and never lets the orchestrator merge", () => {
    const step2 = section("### Step 2 — Ask the operator");
    expect(step2).toContain("Commit authority is not passed along in a brief");
    expect(step2).toContain("leaves its changes uncommitted");
    expect(section("### Step 6 — Integrate when the stack reaches the slice")).toContain("You never merge.");
    expect(spell).not.toContain("separate merge authority");
  });

  it("makes a worker check its brief and report through the note", () => {
    expect(section("### Worker rules")).toContain("`BLOCKED <slice> brief-incomplete`");
    expect(section("### Step 4 — While the workers run")).toContain("`Status:` line is the report");
  });

  it("carries a self-contained worker brief template and a note template", () => {
    const brief = section("### Worker brief template");
    for (const field of ["## Where", "## Your slice", "## Off limits", "## Authority", "## Checks to run", "## Done means"]) {
      expect(brief).toContain(field);
    }
    const note = section("### Note template");
    for (const field of ["## Files changed", "## Shared-file edits the orchestrator needs", "## Checks and results", "## Gate differences from the plan"]) {
      expect(note).toContain(field);
    }
  });

  it("covers the four named failure cases", () => {
    const text = section("## Failure cases");
    expect(text).toContain("**A worker needs a shared file**");
    expect(text).toContain("**Two workers collide**");
    expect(text).toContain("**A prep branch goes stale**");
    expect(text).toContain("**A slice's gates differ from the plan**");
  });

  it("has the orchestrator name prep branches by the branch-naming rule, without restating its format", () => {
    expect(spell).toContain("in the session form of the branch-naming rule with the slice id in the suffix position");
    expect(spell).not.toContain("sessions/YYYY");
  });

  it("includes a Mermaid flow diagram whose labels avoid the reserved word `end`", () => {
    const block = spell.match(/```mermaid\n([\s\S]*?)```/);
    expect(block).not.toBeNull();
    expect(block![1]).toContain("flowchart TD");
    expect(block![1]).not.toMatch(/\[\s*"?end"?\s*\]/i);
    for (const node of ["Orchestrator", "Workers A, B", "Prep branch", "shared notes folder", "Operator"]) {
      expect(block![1]).toContain(node);
    }
  });

  it("disambiguates itself from the serial and single-session spells", () => {
    for (const sibling of ["`spell-full-cycle`", "`spell-implement`", "`spell-review-batch`"]) {
      expect(spell).toContain(sibling);
    }
  });

  it("ships generically: no email addresses, @-handles or URLs in the body", () => {
    expect(spell).not.toMatch(/@/);
    expect(spell).not.toMatch(/https?:\/\//);
  });
});

describe("spell-parallel-workers: thin client shims", () => {
  it("the Claude Code command includes the canonical file rather than duplicating it", () => {
    expect(commandStub).toContain("@.arcane/spells/spell-parallel-workers.md");
  });

  it("the Codex skill points at the canonical file", () => {
    expect(codexSkill).toContain("name: spell-parallel-workers");
    expect(codexSkill).toContain(".arcane/spells/spell-parallel-workers.md");
  });
});

describe("spell-parallel-workers: registry wiring", () => {
  it("joins the existing spells-build component (no new spell component)", () => {
    const component = getComponent("spells-build");
    expect(component.files).toContain(".arcane/spells/spell-parallel-workers.md");
    expect(component.files).toContain(".github/prompts/spell-parallel-workers.prompt.md");
    expect(component.files).toContain(".claude/commands/spell-parallel-workers.md");
    expect(component.files).toContain(".agents/skills/spell-parallel-workers/SKILL.md");
  });

  it("reaches the full profile through spells-build", () => {
    const files = getProfile("full").flatMap((c) => c.files);
    expect(files).toContain(".arcane/spells/spell-parallel-workers.md");
  });
});
