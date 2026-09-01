import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");
const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");

let gitConventions: string;
let universalRules: string;
let commitWork: string;

beforeAll(async () => {
  [gitConventions, universalRules, commitWork] = await Promise.all([
    readFile(join(GOVERNANCE, "git-conventions.md"), "utf8"),
    readFile(join(GOVERNANCE, "universal-agent-rules.md"), "utf8"),
    readFile(join(PROMPTS, "spell-commit-work.prompt.md"), "utf8"),
  ]);
});

describe("git-conventions.md: Agent/Persona/Role/Model-Source split (I3/BC-27d)", () => {
  it("declares Agent as runtime-only, never a persona name", () => {
    expect(gitConventions).toContain("**`Agent` is the runtime/tool only — never a persona name.**");
    expect(gitConventions).toContain("`Agent`        | Yes         | `claude`, `copilot`, `codex`");
  });

  it("makes Persona and Role conditional on a roster existing, never guessed", () => {
    expect(gitConventions).toContain("`Persona`      | Conditional");
    expect(gitConventions).toContain("`Role`         | Conditional");
    expect(gitConventions).toContain("omit both, do not guess, when no roster");
  });

  it("derives Role from the real AgentDefinition.role field, not an invented name", () => {
    expect(gitConventions).toContain("`AgentDefinition.role`, reached via the roster entry's `definition` pointer");
  });

  it("requires Model-Source and explains the incident it exists to prevent", () => {
    expect(gitConventions).toContain("`Model-Source` | Yes         | `self-reported`");
    expect(gitConventions).toContain("a fabricated `Model`/author trailer once survived eight PRs and human review");
  });

  it("includes the grading probe naming the exact prior ambiguity", () => {
    expect(gitConventions).toContain("Grading probe for whether a session actually inherited this rule");
    expect(gitConventions).toContain('"What does `Role: developer` in a commit trailer resolve from?"');
  });

  it("cross-references the existing no-roster degradation pattern rather than restating it", () => {
    expect(gitConventions).toContain(
      "[[agent-policies#solo-operator-delegation-records-no-roster|agent-policies.md]]",
    );
  });

  it("the complete examples show both the with-roster and no-roster cases", () => {
    expect(gitConventions).toContain("Agent-authored commit, with an assigned roster persona");
    expect(gitConventions).toContain("Agent-authored commit, no roster installed (this repo's own current state)");
    expect(gitConventions).toContain('--trailer="Persona=kellar"');
  });

  it("the querying-attribution examples distinguish per-runtime from per-persona counts", () => {
    expect(gitConventions).toContain("Count commits per runtime/tool (Agent)");
    expect(gitConventions).toContain("Count commits per persona");
  });
});

describe("universal-agent-rules.md: rule 12 lists the full required trailer set (I3/BC-27d)", () => {
  it("names Model-Source as required and Persona/Role as conditional", () => {
    expect(universalRules).toContain(
      "12. **Agent attribution trailers** are required on agent-authored commits (`Agent`, `Model`, `Model-Source`, `Provider`).",
    );
    expect(universalRules).toContain("`Persona`/`Role` are conditional");
  });
});

describe("spell-commit-work.prompt.md: trailer template matches the split (I3/BC-27d)", () => {
  it("Agent is runtime-only in the template, with Persona/Role as separate conditional lines", () => {
    expect(commitWork).toContain("Agent: [runtime/tool name only -- claude, copilot, codex -- never a persona name]");
    expect(commitWork).toContain("Persona: [roster identity operated as, ONLY if a roster exists");
    expect(commitWork).toContain("Role: [Persona's own AgentDefinition.role value, resolved from the roster");
  });

  it("lists Model-Source as a required trailer alongside Agent/Model/Provider", () => {
    expect(commitWork).toContain("Required trailers for agent commits: `Agent`, `Model`, `Model-Source`, `Provider`");
  });
});
