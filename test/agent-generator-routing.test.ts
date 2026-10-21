import { describe, it, expect } from "vitest";
import { renderSpellRoutingSection } from "../src/modules/agent-generator.js";

// #359: a repository with spell_scope "user" carries no spells of its own. When
// the machine has no user tier, its CLAUDE.md and AGENTS.md still route to
// spells that resolve to nothing, and an agent improvises the workflow. The
// routing block for such a repository must tell the agent to stop instead.

describe("renderSpellRoutingSection — the stop rule for user-scoped repositories (#359)", () => {
  it("tells the agent to stop and name `spell init --user` when the repository takes its spells from the user tier", () => {
    const section = renderSpellRoutingSection("user");
    expect(section).toContain("## Spell Routing");
    expect(section).toContain("user tier");
    expect(section).toContain("spell init --user");
    expect(section).toMatch(/stop/i);
    expect(section).toMatch(/do not improvise|never improvise/i);
  });

  it("renders the plain routing block for a repository that carries its own spells", () => {
    for (const scope of ["repo", undefined] as const) {
      const section = renderSpellRoutingSection(scope);
      expect(section).toContain("## Spell Routing");
      expect(section).toContain("| Commit work | `spell-commit-work` |");
      expect(section).not.toContain("spell init --user");
    }
  });
});
