import { describe, it, expect } from "vitest";
import { getProfile, listProfiles, SPELL_COMPONENT_NAMES } from "../src/modules/registry.js";

/**
 * What the retired monolith used to install, written out by hand.
 *
 * Deliberately NOT `SPELL_COMPONENT_NAMES`: asserting the migration equals the
 * live derived list would be self-referential -- adding a new `spells-*` group
 * later would change the migration's behaviour AND the expectation together,
 * so the test could never fail. Adversarial review caught exactly this.
 */
const MONOLITH_REPLACEMENTS = [
  "spells-session",
  "spells-capture",
  "spells-delivery",
  "spells-review",
  "spells-planning",
  "spells-build",
  "spells-venture",
  "spells-meta",
];
import { migrateLegacyComponents } from "../src/commands/update.js";
import type { InstalledComponent } from "../src/types.js";
import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Derived from disk, not hardcoded: adding a spell is a normal event and must
 * not require editing a count in an unrelated assertion. What matters is that
 * every spell on disk is registered exactly once, whatever the total is.
 */
const SPELLS_ON_DISK = readdirSync(join(process.cwd(), "src/assets/.github/prompts")).filter((f) =>
  f.endsWith(".prompt.md"),
).length;

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

    expect(promptFiles).toHaveLength(SPELLS_ON_DISK);
    expect(new Set(promptFiles).size).toBe(SPELLS_ON_DISK);
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
    expect(names).not.toContain("spells-review");
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
      // Not named in MH-01's list, but caught by its third criterion: this
      // spell's own workflow validates that "new code has corresponding
      // tests" against testing-standards.md -- source and tests a docs repo
      // has neither of.
      "spell-review",
      "spell-generate-bot-icons", // Teams bot asset tooling, not docs work
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
    expect(out.map((c) => c.name)).toEqual(MONOLITH_REPLACEMENTS);
  });

  it("dedupes when a manifest lists BOTH legacy names (the common case)", () => {
    // Every profile that shipped one shipped the other, so real manifests in
    // the wild contain both -- they must converge, not double up.
    const out = migrateLegacyComponents([legacy("spell-prompts"), legacy("claude-commands")]);
    expect(out.map((c) => c.name)).toEqual(MONOLITH_REPLACEMENTS);
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
    expect(names).toEqual(expect.arrayContaining(MONOLITH_REPLACEMENTS));
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

describe("legacy migration is frozen against future spell groups", () => {
  it("does not hand a legacy install any group added after the split", () => {
    // Today these coincide. When WP-C2 adds spells-docs, SPELL_COMPONENT_NAMES
    // grows and this assertion starts failing -- which is the point: adding a
    // group must be a deliberate decision about whether legacy installs get
    // it, not a silent consequence of the name prefix.
    const migrated = migrateLegacyComponents([
      { name: "spell-prompts", files: [], installedVersion: "0.16.0" },
    ]).map((c) => c.name);
    for (const name of migrated) {
      expect(SPELL_COMPONENT_NAMES).toContain(name);
    }
    expect(migrated).toEqual(MONOLITH_REPLACEMENTS);
  });
});

describe("backwards compatibility of the split", () => {
  // Regression: adding an eighth group (spells-review) without adding it to the
  // profiles that previously took the whole monolith silently dropped 2 of 34
  // spells from lite and methodology. Caught by an end-to-end install, not by
  // any unit test -- so here is the unit test.
  it("full ships every spell that exists on disk", () => {
    const files = getProfile("full").flatMap((c) => c.files);
    expect(files.filter((f) => f.startsWith(".github/prompts/"))).toHaveLength(SPELLS_ON_DISK);
    expect(files.filter((f) => f.startsWith(".claude/commands/"))).toHaveLength(SPELLS_ON_DISK);
  });

  // lite/methodology took the whole monolith before the split, so they must
  // still ship exactly what it held -- not everything that exists now.
  // spells-docs is new capability, not something these profiles ever had.
  // A member of an EXISTING group (spells-build) growing is intended to reach
  // both profiles automatically -- that's what putting a spell there means --
  // so this literal is bumped deliberately alongside the group, not derived.
  // 35: spell-make-discoverable joined spells-build (web discoverability).
  // 36: spell-sync-pull-request joined spells-delivery (BC-18, PR sync/conflict repair).
  // 37: spell-scry joined spells-build (BC-21, candidate-name clearance; ward is the CLI
  //     counterpart of the same concern but is not a registry component -- no spell count change from it).
  // 38: spell-eas-store-deploy joined spells-build (BC-25, EAS Build + EAS Submit deployment guide for
  //     the Apple App Store and Google Play).
  // 39: spell-compliance joined spells-build (BC-26, GDPR/CCPA/SOC 2/HIPAA self-assessment).
  // 40: spell-verification-ledger joined spells-capture (BC-27c, I7 -- extracts a structured
  //     checked-claim record separate from spell-close-session's narrative).
  it.each(["lite", "methodology"] as const)(
    "%s still ships the 40 spells the monolith + spells-build/spells-delivery/spells-capture growth hold, in both formats",
    (profileId) => {
      const files = getProfile(profileId).flatMap((c) => c.files);
      // LH-05: deliberately NOT derived from the registry -- see the comment
      // block above this test. A member of an EXISTING group growing should
      // reach these profiles automatically without a code change; a whole
      // NEW group being silently included should not. Only a literal, bumped
      // by hand alongside a dated comment explaining why, can tell those two
      // cases apart -- a registry-derived count cannot, since both look
      // identical from the registry's own point of view.
      // eslint-disable-next-line no-restricted-syntax
      expect(files.filter((f) => f.startsWith(".github/prompts/"))).toHaveLength(40);
      // eslint-disable-next-line no-restricted-syntax
      expect(files.filter((f) => f.startsWith(".claude/commands/"))).toHaveLength(40);
    },
  );

  it("governance-only still ships no spells at all", () => {
    const files = getProfile("governance-only").flatMap((c) => c.files);
    expect(files.filter((f) => f.startsWith(".github/prompts/"))).toHaveLength(0);
  });
});

describe("baseline files are never claimed from the operator", () => {
  // Regression: `update` recorded every skipExisting file into the manifest,
  // including ones it had merely declined to overwrite. Since `uninstall`
  // deletes everything the manifest lists, an operator's own .gitignore --
  // which Arcane never wrote -- would be destroyed by an uninstall.
  it("docs-baseline is skipExisting AND initOnly", () => {
    const comp = getProfile("docs").find((c) => c.name === "docs-baseline");
    expect(comp).toBeDefined();
    expect(comp!.skipExisting).toBe(true);
    // initOnly: `update` must never CREATE these, because their appearance
    // alone triggers a repository-wide renormalization (EF-17).
    expect(comp!.initOnly).toBe(true);
  });

  it("stores its sources as non-dotfiles, mapped to dotfile targets", () => {
    const comp = getProfile("docs").find((c) => c.name === "docs-baseline")!;
    // A nested .gitignore inside the published npm tarball can exclude its own
    // siblings from the package -- verified empirically during review -- so the
    // sources must not be dotfiles.
    for (const target of comp.files) {
      const source = comp.sourceOverrides?.[target];
      expect(source, `${target} needs a non-dotfile source`).toBeDefined();
      expect(source!.startsWith(".")).toBe(false);
    }
  });
});
