import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");

let agentPolicies: string;

beforeAll(async () => {
  agentPolicies = await readFile(join(GOVERNANCE, "agent-policies.md"), "utf8");
});

describe("Solo-Operator Delegation Records section (T13/BC-19)", () => {
  it("names itself as the no-roster counterpart to the power-level matrix", () => {
    expect(agentPolicies).toContain("## Solo-Operator Delegation Records (No Roster)");
    expect(agentPolicies).toContain(
      "The Per-Repo Power Level Matrix above assumes an installed agent roster",
    );
  });

  it("documents the .arcane/delegations.json schema with all required fields", () => {
    expect(agentPolicies).toContain(".arcane/delegations.json");
    for (const field of [
      '"grantedBy"',
      '"grantedAt"',
      '"scope"',
      '"permittedActions"',
      '"excludedActions"',
      '"status"',
      '"revocation"',
    ]) {
      expect(agentPolicies).toContain(field);
    }
  });

  it("states the four defining properties: explicit, listable, revocable, no new authority", () => {
    expect(agentPolicies).toContain("**Explicit:**");
    expect(agentPolicies).toContain("**Listable:**");
    expect(agentPolicies).toContain("**Revocable per repo:**");
    expect(agentPolicies).toContain("**Grants no new authority.**");
  });

  it("states no scaffold is shipped, and that it doesn't replace the roster-based matrix", () => {
    expect(agentPolicies).toContain("**No scaffold is shipped.**");
    expect(agentPolicies).toContain("**Does not replace the roster-based matrix.**");
  });

  it("a missing delegations file is documented as a silent pass, not a warning", () => {
    expect(agentPolicies).toContain("A missing file is a silent pass");
  });
});
