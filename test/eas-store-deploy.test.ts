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
    readFile(join(GOVERNANCE, "mobile-release-standards.md"), "utf8"),
    readFile(join(PROMPTS, "spell-eas-store-deploy.prompt.md"), "utf8"),
    readFile(join(COMMANDS, "spell-eas-store-deploy.md"), "utf8"),
  ]);
});

describe("mobile-release-standards.md: rule-index/rule-body consistency (T8/BC-25)", () => {
  it("every ID in the rule index has a matching numbered heading and a Rule (MR-nn) line", () => {
    const indexIds = [...standards.matchAll(/\| (MR-\d\d) \|/g)].map((m) => m[1]);
    expect(indexIds.length).toBeGreaterThan(0);

    const uniqueIds = new Set(indexIds);
    expect(uniqueIds.size).toBe(indexIds.length);

    for (const id of indexIds) {
      expect(standards).toContain(`### ${id}:`);
      expect(standards).toContain(`**Rule (${id}):**`);
    }
  });

  it("has no MR-nn heading or Rule line that is absent from the rule index (no orphans)", () => {
    const indexIds = new Set([...standards.matchAll(/\| (MR-\d\d) \|/g)].map((m) => m[1]));
    const headingIds = [...standards.matchAll(/### (MR-\d\d):/g)].map((m) => m[1]);
    for (const id of headingIds) {
      expect(indexIds.has(id)).toBe(true);
    }
  });

  it("cross-references EV-01/EV-03 for the signing-certificate rule rather than restating them", () => {
    expect(standards).toContain("MR-09");
    expect(standards).toContain("`EV-01`");
  });
});

describe("spell-eas-store-deploy.prompt.md (T8/BC-25)", () => {
  it("has frontmatter naming both stores and the EAS tech stack", () => {
    expect(spell).toContain("Spell — EAS Store Deploy");
    expect(spell).toContain("App Store and Google Play");
  });

  it("covers both stores in the required order: initial setup, repeat deployments, known pitfalls", () => {
    const iosIdx = spell.indexOf("## Apple App Store");
    const androidIdx = spell.indexOf("## Google Play");
    expect(iosIdx).toBeGreaterThan(-1);
    expect(androidIdx).toBeGreaterThan(iosIdx);

    for (const section of ["Apple App Store", "Google Play"]) {
      const sectionStart = spell.indexOf(`## ${section}`);
      const nextSectionStart = spell.indexOf("\n## ", sectionStart + 1);
      const sectionText = spell.slice(sectionStart, nextSectionStart === -1 ? undefined : nextSectionStart);
      const setupIdx = sectionText.indexOf("Initial one-time setup");
      const repeatIdx = sectionText.indexOf("Repeat deployments");
      const pitfallsIdx = sectionText.indexOf("Known pitfalls");
      expect(setupIdx).toBeGreaterThan(-1);
      expect(repeatIdx).toBeGreaterThan(setupIdx);
      expect(pitfallsIdx).toBeGreaterThan(repeatIdx);
    }
  });

  it("cites governance rule IDs rather than restating their rationale inline", () => {
    expect(spell).toContain("(`MR-01`)");
    expect(spell).toContain("(`EV-02`)");
    expect(spell).toContain("(`EV-06`)");
  });

  it("declares graceful degradation when a governance doc isn't installed, matching spell-make-discoverable's pattern", () => {
    expect(spell).toContain("this spell still runs in full");
    expect(spell).toContain("rationale unavailable — install the standards doc");
  });

  it("resolves every placeholder via .arcane.json/frontmatter/project config, asking rather than assuming", () => {
    expect(spell).toContain("{IOS_BUNDLE_ID}");
    expect(spell).toContain("{ANDROID_PACKAGE}");
    expect(spell).toContain("never assume");
  });

  it("scopes explicitly to EAS Build + EAS Submit, excluding local Xcode/Fastlane", () => {
    expect(spell).toContain("no local Xcode, Xcode Cloud, or Fastlane coverage");
  });
});

describe("spell-eas-store-deploy.md: thin Claude Code shim (T8/BC-25)", () => {
  it("includes the prompt file rather than duplicating its content", () => {
    expect(commandStub).toContain("@.github/prompts/spell-eas-store-deploy.prompt.md");
  });
});

describe("registry wiring (T8/BC-25)", () => {
  it("registers mobile-release-standards as its own governance component", () => {
    const component = getComponent("mobile-release-standards");
    expect(component.files).toEqual([".arcane/governance/mobile-release-standards.md"]);
  });

  it("joins the new spell to the existing spells-build component (no new spell component)", () => {
    const component = getComponent("spells-build");
    expect(component.files).toContain(".github/prompts/spell-eas-store-deploy.prompt.md");
    expect(component.files).toContain(".claude/commands/spell-eas-store-deploy.md");
  });

  it("governance-only ships the new standards doc, alongside its two direct precedents", () => {
    const names = getProfile("governance-only").map((c) => c.name);
    expect(names).toContain("external-verification-standards");
    expect(names).toContain("web-discoverability-standards");
    expect(names).toContain("mobile-release-standards");
  });
});
