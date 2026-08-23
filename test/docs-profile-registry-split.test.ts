import { describe, it, expect } from "vitest";
import { getProfile, listProfiles, SPELL_COMPONENT_NAMES } from "../src/modules/registry.js";
import { migrateLegacyComponents } from "../src/commands/update.js";
import type { InstalledComponent } from "../src/types.js";

/**
 * WP-C1: the monolithic `spell-prompts` + `claude-commands` pair was split into
 * capability-scoped components so a profile can select spells by capability.
 * Grouping lives in the registry only -- no spell file was renamed or moved.
 */
describe("spell component split (registry integrity)", () => {
  const spellComponents = SPELL_COMPONENT_NAMES.map((n) => ({
    name: n,
    files: getComponentFiles(n),
  }));

  function getComponentFiles(name: string): string[] {
    // getProfile("full") is "*" -- every component -- so this resolves any name.
    const all = getProfile("full");
    const found = all.find((c) => c.name === name);
    if (!found) throw new Error(`component ${name} not found`);
    return found.files;
  }

  it("every spell appears exactly once across all capability groups", () => {
    const promptFiles = spellComponents
      .flatMap((c) => c.files)
      .filter((f) => f.startsWith(".github/prompts/"));

    expect(promptFiles).toHaveLength(34);
    expect(new Set(promptFiles).size).toBe(34);
  });

  it("every spell ships both client formats, paired in the same component", () => {
    for (const component of spellComponents) {
      const prompts = component.files
        .filter((f) => f.startsWith(".github/prompts/"))
        .map((f) => f.replace(".github/prompts/", "").replace(".prompt.md", ""));
      const commands = component.files
        .filter((f) => f.startsWith(".claude/commands/"))
        .map((f) => f.replace(".claude/commands/", "").replace(".md", ""));

      // Pairing them in one component is what makes it structurally impossible
      // for a profile to ship the Copilot prompt without the Claude wrapper.
      expect(commands.sort()).toEqual(prompts.sort());
    }
  });

  it("no component still uses the retired monolithic names", () => {
    const allNames = getProfile("full").map((c) => c.name);
    expect(allNames).not.toContain("spell-prompts");
    expect(allNames).not.toContain("claude-commands");
  });
});

describe("docs profile (EF-04 / MH-01)", () => {
  it("is listed and selectable", () => {
    const ids = listProfiles().map((p) => p.id);
    expect(ids).toContain("docs");
  });

  it("installs session, capture, delivery, planning and meta spells", () => {
    const names = getProfile("docs").map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "spells-session",
        "spells-capture",
        "spells-delivery",
        "spells-planning",
        "spells-meta",
      ]),
    );
  });

  // MH-01 requires the exclusions themselves be asserted, not just the inclusions.
  it("excludes build and venture spells", () => {
    const names = getProfile("docs").map((c) => c.name);
    expect(names).not.toContain("spells-build");
    expect(names).not.toContain("spells-venture");
  });

  it("ships none of the spells MH-01 names as excluded", () => {
    const files = getProfile("docs").flatMap((c) => c.files);
    for (const excluded of [
      "spell-implement", // code implementation
      "spell-full-cycle", // code implementation
      "spell-dotnet-expert", // stack expert
      "spell-test", // test coverage
      "spell-ship", // deployment
      "spell-enchant", // PRD enchantment
    ]) {
      expect(files.some((f) => f.includes(excluded))).toBe(false);
    }
  });

  it("still ships the session spells a docs repo needs to function", () => {
    const files = getProfile("docs").flatMap((c) => c.files);
    for (const kept of ["spell-open-session", "spell-close-session", "spell-todo", "spell-plan"]) {
      expect(files.some((f) => f.includes(kept))).toBe(true);
    }
  });

  it("installs no agent or venture templates", () => {
    const names = getProfile("docs").map((c) => c.name);
    expect(names).not.toContain("venture-template");
    expect(names).not.toContain("agent-definitions");
  });
});

describe("legacy manifest migration", () => {
  const legacy = (name: string): InstalledComponent => ({
    name,
    files: [".github/prompts/spell-open-session.prompt.md"],
    installedVersion: "0.16.0",
  });

  it("expands a legacy spell-prompts entry into the capability components", () => {
    const out = migrateLegacyComponents([legacy("spell-prompts")]);
    expect(out.map((c) => c.name)).toEqual(SPELL_COMPONENT_NAMES);
  });

  it("dedupes when a manifest lists BOTH legacy names (the common case)", () => {
    // Every profile that shipped one shipped the other, so real manifests in
    // the wild contain both -- they must converge, not double up.
    const out = migrateLegacyComponents([legacy("spell-prompts"), legacy("claude-commands")]);
    expect(out.map((c) => c.name)).toEqual(SPELL_COMPONENT_NAMES);
  });

  it("preserves non-legacy entries and their order", () => {
    const out = migrateLegacyComponents([
      { name: "git-conventions", files: ["a"], installedVersion: "0.16.0" },
      legacy("spell-prompts"),
      { name: "testing-standards", files: ["b"], installedVersion: "0.16.0" },
    ]);
    const names = out.map((c) => c.name);
    expect(names[0]).toBe("git-conventions");
    expect(names[names.length - 1]).toBe("testing-standards");
    expect(names).toEqual(expect.arrayContaining(SPELL_COMPONENT_NAMES));
  });

  it("is idempotent — an already-migrated manifest passes through unchanged", () => {
    const once = migrateLegacyComponents([legacy("spell-prompts")]);
    const twice = migrateLegacyComponents(once);
    expect(twice).toEqual(once);
  });

  it("leaves a manifest with no legacy entries completely untouched", () => {
    const input: InstalledComponent[] = [
      { name: "git-conventions", files: ["a"], installedVersion: "0.17.0" },
    ];
    expect(migrateLegacyComponents(input)).toEqual(input);
  });

  it("carries the legacy entry's installedVersion onto its replacements", () => {
    const out = migrateLegacyComponents([legacy("spell-prompts")]);
    for (const c of out) {
      expect(c.installedVersion).toBe("0.16.0");
    }
  });
});
