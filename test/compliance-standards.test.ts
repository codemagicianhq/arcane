import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getComponent, getProfile } from "../src/modules/registry.js";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");
const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");
const COMMANDS = join(process.cwd(), "src", "assets", ".claude", "commands");

let standards: string;
let spell: string;
let commandStub: string;

beforeAll(async () => {
  [standards, spell, commandStub] = await Promise.all([
    readFile(join(GOVERNANCE, "compliance-standards.md"), "utf8"),
    readFile(join(PROMPTS, "spell-compliance.prompt.md"), "utf8"),
    readFile(join(COMMANDS, "spell-compliance.md"), "utf8"),
  ]);
});

describe("compliance-standards.md: rule-index/rule-body consistency (T26/BC-26)", () => {
  it("every ID in the rule index has a matching numbered heading and a Rule (CS-nn) line", () => {
    const indexIds = [...standards.matchAll(/\| (CS-\d\d) \|/g)].map((m) => m[1]);
    expect(indexIds.length).toBeGreaterThan(0);

    const uniqueIds = new Set(indexIds);
    expect(uniqueIds.size).toBe(indexIds.length);

    for (const id of indexIds) {
      expect(standards).toContain(`### ${id}:`);
      expect(standards).toContain(`**Rule (${id}):**`);
    }
  });

  it("has no CS-nn heading that is absent from the rule index (no orphans)", () => {
    const indexIds = new Set([...standards.matchAll(/\| (CS-\d\d) \|/g)].map((m) => m[1]));
    const headingIds = [...standards.matchAll(/### (CS-\d\d):/g)].map((m) => m[1]);
    for (const id of headingIds) {
      expect(indexIds.has(id)).toBe(true);
    }
  });

  it("states explicitly that this is not legal advice", () => {
    expect(standards).toContain("This is not legal advice.");
  });

  it("covers all four named frameworks", () => {
    expect(standards).toContain("## GDPR");
    expect(standards).toContain("## CCPA / CPRA");
    expect(standards).toContain("## SOC 2");
    expect(standards).toContain("## HIPAA");
  });

  it("includes the tiered applicability guide", () => {
    expect(standards).toContain("## Tiered applicability guide");
    expect(standards).toContain("Early MVP");
    expect(standards).toContain("Enterprise sales stage");
  });
});

describe("spell-compliance.prompt.md (T26/BC-26)", () => {
  it("is explicitly read-only, with no apply/fix phase", () => {
    expect(spell).toContain("It is read-only.");
    expect(spell).toContain("never drafts a privacy policy, invents a retention period");
  });

  it("states its own not-legal-advice framing", () => {
    expect(spell).toContain("This is not legal advice");
  });

  it("determines applicability by asking rather than assuming", () => {
    expect(spell).toContain("Phase 1 — Determine applicability");
    expect(spell).toContain("ask the operator directly");
  });

  it("cites compliance-standards.md rule IDs rather than restating them", () => {
    expect(spell).toContain("(`CS-01`)");
    expect(spell).toContain("`CS-nn` rule IDs");
  });

  it("declares graceful degradation when the governance doc isn't installed", () => {
    expect(spell).toContain("this spell still runs in full");
    expect(spell).toContain("rationale unavailable — install the standards doc");
  });

  it("orders the remediation report mandatory-baseline before optional-tier findings", () => {
    expect(spell).toContain("Mandatory baseline (GDPR / CCPA)");
    expect(spell).toContain("Optional tier (SOC 2 / HIPAA)");
  });
});

describe("spell-compliance.md: thin Claude Code shim (T26/BC-26)", () => {
  it("includes the prompt file rather than duplicating its content", () => {
    expect(commandStub).toContain("@.github/prompts/spell-compliance.prompt.md");
  });
});

describe("registry wiring (T26/BC-26)", () => {
  it("registers compliance-standards as its own governance component", () => {
    const component = getComponent("compliance-standards");
    expect(component.files).toEqual([".arcane/governance/compliance-standards.md"]);
  });

  it("joins the new spell to the existing spells-build component (no new spell component)", () => {
    const component = getComponent("spells-build");
    expect(component.files).toContain(".github/prompts/spell-compliance.prompt.md");
    expect(component.files).toContain(".claude/commands/spell-compliance.md");
  });

  it("governance-only ships the new standards doc, alongside its verification/discoverability/mobile siblings", () => {
    const names = getProfile("governance-only").map((c) => c.name);
    expect(names).toContain("external-verification-standards");
    expect(names).toContain("web-discoverability-standards");
    expect(names).toContain("mobile-release-standards");
    expect(names).toContain("compliance-standards");
  });
});
