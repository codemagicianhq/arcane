import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashFile } from "../src/modules/copier.js";
import { getComponent, SPELL_COMPONENT_NAMES } from "../src/modules/registry.js";
import { canonicalSpellPath } from "../src/modules/spell-compiler.js";
import {
  USER_FANOUT_PATHS,
  USER_TIER_COMPONENTS,
  absoluteStoreSpellPath,
  clientOfFanoutPath,
  componentForScope,
  describeFanoutOutcomes,
  inspectUserTierFanout,
  renderUserFanout,
  spellIdFromCanonicalPath,
  spellIdFromStorePath,
  spellIdsInStore,
  storeSpellPath,
  summarizeFanout,
  syncUserTierFanout,
  userTierRoot,
} from "../src/modules/user-tier.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

// ─── The home directory is an ENVIRONMENT input, never a mocked function ─────
// Node's os.homedir() follows USERPROFILE (Windows) / HOME (POSIX) at call
// time; the tier resolves it on every call (never at module load), so a test
// points the whole thing at a temp directory by setting both variables. Same
// standard test/org-token-lint.test.ts holds itself to.

const ASSETS_DIR = join(process.cwd(), "src/assets");

let home: string;
let storeRoot: string;
const savedEnv: Record<string, string | undefined> = {};

function stubHome(dir: string) {
  for (const key of ["USERPROFILE", "HOME"]) {
    if (!(key in savedEnv)) savedEnv[key] = process.env[key];
    process.env[key] = dir;
  }
}

function restoreHome() {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete savedEnv[key];
  }
}

/** Copies the real canonical spell into the store, as `spell init --user` would. */
async function seedStoreSpell(id: string): Promise<string> {
  const src = join(ASSETS_DIR, canonicalSpellPath(id));
  const dest = join(storeRoot, storeSpellPath(id));
  await fs.mkdir(join(dest, ".."), { recursive: true });
  await fs.copyFile(src, dest);
  return dest;
}

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "user-tier-home-"));
  stubHome(home);
  storeRoot = userTierRoot();
});

afterEach(async () => {
  restoreHome();
  await removeFixtureDir(home);
});

// ─── Locations and the scope view ─────────────────────────────────────────────

describe("user tier — locations", () => {
  it("userTierRoot() is ~/.arcane and follows the environment between calls", async () => {
    expect(storeRoot).toBe(join(home, ".arcane"));
    const other = await fs.mkdtemp(join(tmpdir(), "user-tier-other-home-"));
    try {
      stubHome(other);
      expect(userTierRoot()).toBe(join(other, ".arcane"));
    } finally {
      stubHome(home);
      await removeFixtureDir(other);
    }
  });

  it("store paths, canonical paths and ids round-trip, in either slash style", () => {
    expect(storeSpellPath("spell-plan")).toBe("spells/spell-plan.md");
    expect(spellIdFromCanonicalPath(".arcane/spells/spell-plan.md")).toBe("spell-plan");
    expect(spellIdFromCanonicalPath(".arcane\\spells\\spell-plan.md")).toBe("spell-plan");
    expect(spellIdFromCanonicalPath(".github/prompts/spell-plan.prompt.md")).toBeUndefined();
    expect(spellIdFromCanonicalPath(".arcane/spells/_fragments/x.md")).toBeUndefined();
    expect(spellIdFromStorePath("spells/spell-plan.md")).toBe("spell-plan");
    expect(spellIdFromStorePath(".arcane/spells/spell-plan.md")).toBeUndefined();
  });

  it("absoluteStoreSpellPath uses forward slashes on every platform", () => {
    const abs = absoluteStoreSpellPath("C:\\Users\\someone\\.arcane", "spell-plan");
    expect(abs).not.toContain("\\");
    expect(abs.endsWith("/.arcane/spells/spell-plan.md")).toBe(true);
  });

  it("USER_TIER_COMPONENTS is every spells-* component and nothing else", () => {
    expect([...USER_TIER_COMPONENTS]).toEqual(SPELL_COMPONENT_NAMES);
    expect(USER_TIER_COMPONENTS.every((n) => n.startsWith("spells-"))).toBe(true);
  });

  it("clientOfFanoutPath classifies the two shapes and rejects others", () => {
    expect(clientOfFanoutPath(USER_FANOUT_PATHS.codex("spell-plan"))).toBe("codex");
    expect(clientOfFanoutPath(USER_FANOUT_PATHS.claude("spell-plan"))).toBe("claude");
    expect(clientOfFanoutPath(".claude/skills/spell-plan/SKILL.md")).toBeUndefined();
  });
});

describe("componentForScope", () => {
  it("returns the component itself for the repo scope", () => {
    const component = getComponent("spells-docs");
    expect(componentForScope(component, "repo")).toBe(component);
  });

  it("keeps exactly one file per spell for the user scope, at spells/<id>.md, mapped back to the canonical asset", () => {
    const component = getComponent("spells-docs");
    const view = componentForScope(component, "user");
    const canonicalCount = component.files.filter((f) => f.startsWith(".arcane/spells/")).length;
    expect(view.files).toHaveLength(canonicalCount);
    expect(view.files.every((f) => /^spells\/spell-[a-z0-9-]+\.md$/.test(f))).toBe(true);
    for (const file of view.files) {
      const id = spellIdFromStorePath(file)!;
      expect(view.sourceOverrides?.[file]).toBe(canonicalSpellPath(id));
    }
    // Nothing repository-relative survives: no shim of any client.
    expect(view.files.some((f) => f.includes(".github") || f.includes(".claude") || f.includes(".agents"))).toBe(false);
    expect(view.name).toBe(component.name);
  });

  it("every user-tier component maps to real assets", async () => {
    for (const name of USER_TIER_COMPONENTS) {
      const view = componentForScope(getComponent(name), "user");
      for (const file of view.files) {
        await expect(fs.access(join(ASSETS_DIR, view.sourceOverrides![file]!))).resolves.toBeUndefined();
      }
    }
  });

  it("spellIdsInStore reads ids back from a store manifest's components, deduplicated and sorted", () => {
    const ids = spellIdsInStore([
      { name: "a", files: ["spells/spell-zeta.md", "spells/spell-alpha.md"], installedVersion: "1.1.0" },
      { name: "b", files: ["spells/spell-alpha.md", "not-a-spell.md"], installedVersion: "1.1.0" },
    ]);
    expect(ids).toEqual(["spell-alpha", "spell-zeta"]);
  });
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("renderUserFanout", () => {
  it("renders two files per spell, both carrying the ABSOLUTE forward-slash store path and never a repo-relative one", async () => {
    await seedStoreSpell("spell-status");
    const files = await renderUserFanout(storeRoot, ["spell-status"]);
    expect(files.map((f) => f.relativePath)).toEqual([
      ".agents/skills/spell-status/SKILL.md",
      ".claude/commands/spell-status.md",
    ]);
    const abs = absoluteStoreSpellPath(storeRoot, "spell-status");
    for (const file of files) {
      expect(file.content).toContain(abs);
      expect(file.content).not.toMatch(/(^|[^/])\.arcane\/spells\/spell-status\.md/);
      expect(file.content).not.toContain("\\");
    }
    const claude = files.find((f) => f.client === "claude")!;
    expect(claude.content).toContain(`@${abs}\n`);
    const codex = files.find((f) => f.client === "codex")!;
    expect(codex.content).toContain("name: spell-status\n");
    expect(codex.content).toContain(`Read \`${abs}\` and follow it as the complete workflow.`);
  });
});

// ─── The reconciliation rules ─────────────────────────────────────────────────

describe("syncUserTierFanout", () => {
  const ids = ["spell-status", "spell-plan"];

  beforeEach(async () => {
    for (const id of ids) await seedStoreSpell(id);
  });

  it("first run writes every file and records one hash per file; a second run changes nothing", async () => {
    const first = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids });
    expect(summarizeFanout(first.outcomes).written).toBe(4);
    expect(Object.keys(first.record).sort()).toEqual(
      ids.flatMap((id) => [USER_FANOUT_PATHS.codex(id), USER_FANOUT_PATHS.claude(id)]).sort(),
    );
    for (const [rel, hash] of Object.entries(first.record)) {
      expect(await hashFile(join(home, rel))).toBe(hash);
    }

    const second = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids, previous: first.record });
    const counts = summarizeFanout(second.outcomes);
    expect(counts.unchanged).toBe(4);
    expect(counts.written).toBe(0);
    expect(second.record).toEqual(first.record);
  });

  it("a missing recorded file is written again (restore), not reported as anything else", async () => {
    const first = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids });
    const victim = USER_FANOUT_PATHS.claude("spell-plan");
    await removeFixtureDir(join(home, victim));

    const again = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids, previous: first.record });
    expect(again.outcomes.find((o) => o.relativePath === victim)?.status).toBe("written");
    expect(await hashFile(join(home, victim))).toBe(first.record[victim]);
  });

  it("an edited recorded file is kept byte-untouched, reported customized, and its recorded hash carried forward", async () => {
    const first = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids });
    const edited = USER_FANOUT_PATHS.codex("spell-status");
    const editedContent = `${await fs.readFile(join(home, edited), "utf8")}\nOPERATOR EDIT\n`;
    await fs.writeFile(join(home, edited), editedContent, "utf8");

    const again = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids, previous: first.record });
    expect(again.outcomes.find((o) => o.relativePath === edited)?.status).toBe("customized");
    await expect(fs.readFile(join(home, edited), "utf8")).resolves.toBe(editedContent);
    expect(again.record[edited]).toBe(first.record[edited]);
    // And it stays customized on the run after that -- the warning is idempotent.
    const third = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids, previous: again.record });
    expect(third.outcomes.find((o) => o.relativePath === edited)?.status).toBe("customized");
  });

  it("a same-named file Arcane never recorded is a collision: kept, reported, never recorded", async () => {
    const foreign = USER_FANOUT_PATHS.codex("spell-plan");
    await fs.mkdir(join(home, foreign, ".."), { recursive: true });
    await fs.writeFile(join(home, foreign), "---\nname: spell-plan\ndescription: the operator's own\n---\nmine\n", "utf8");

    const result = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids });
    expect(result.outcomes.find((o) => o.relativePath === foreign)?.status).toBe("collision");
    await expect(fs.readFile(join(home, foreign), "utf8")).resolves.toContain("mine");
    expect(result.record[foreign]).toBeUndefined();
    expect(Object.keys(result.record)).toHaveLength(3);
    // A later uninstall (empty desired set) must not touch it either: it was never recorded.
    const gone = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: [], previous: result.record });
    await expect(fs.access(join(home, foreign))).resolves.toBeUndefined();
    expect(summarizeFanout(gone.outcomes).pruned).toBe(3);
  });

  it("a rendered-content change rewrites a hash-matched file and re-records it", async () => {
    const first = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids });
    // Change the field both renderers read (`claude_description`, preferred
    // over `description` by the Claude stub and the Codex skill alike): both
    // rendered shims change, so both are rewritten.
    const storeFile = join(storeRoot, storeSpellPath("spell-plan"));
    const content = await fs.readFile(storeFile, "utf8");
    const changed = content.replace(/^claude_description: .*$/m, "claude_description: A new hint for the test");
    expect(changed).not.toBe(content);
    await fs.writeFile(storeFile, changed, "utf8");

    const again = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids, previous: first.record });
    for (const rel of [USER_FANOUT_PATHS.claude("spell-plan"), USER_FANOUT_PATHS.codex("spell-plan")]) {
      expect(again.outcomes.find((o) => o.relativePath === rel)?.status).toBe("written");
      expect(again.record[rel]).not.toBe(first.record[rel]);
      expect(await hashFile(join(home, rel))).toBe(again.record[rel]);
      expect(await fs.readFile(join(home, rel), "utf8")).toContain("A new hint for the test");
    }
    // The other spell's files were not touched.
    expect(again.outcomes.find((o) => o.relativePath === USER_FANOUT_PATHS.claude("spell-status"))?.status).toBe("unchanged");
  });

  it("a spell dropped from the desired set has its hash-matched files pruned and its emptied directory removed; an edited one is kept", async () => {
    const first = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids });
    const editedClaude = USER_FANOUT_PATHS.claude("spell-plan");
    await fs.appendFile(join(home, editedClaude), "\nOPERATOR EDIT\n");

    const pruned = await syncUserTierFanout({
      homeDir: home,
      storeRoot,
      spellIds: ["spell-status"],
      previous: first.record,
    });
    expect(pruned.outcomes.find((o) => o.relativePath === USER_FANOUT_PATHS.codex("spell-plan"))?.status).toBe("pruned");
    expect(pruned.outcomes.find((o) => o.relativePath === editedClaude)?.status).toBe("kept-edited");
    await expect(fs.access(join(home, ".agents/skills/spell-plan"))).rejects.toThrow();
    await expect(fs.access(join(home, ".agents/skills/spell-status/SKILL.md"))).resolves.toBeUndefined();
    await expect(fs.access(join(home, editedClaude))).resolves.toBeUndefined();
    // The kept-edited file stays recorded so a later run still recognizes it as edited.
    expect(pruned.record[editedClaude]).toBe(first.record[editedClaude]);
    // The client's own directory is never removed, even when Arcane's file was the last one in it.
    await removeFixtureDir(join(home, editedClaude));
    const again = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ["spell-status"], previous: pruned.record });
    expect(again.outcomes.find((o) => o.relativePath === editedClaude)?.status).toBe("gone");
    expect(again.record[editedClaude]).toBeUndefined();
    await expect(fs.access(join(home, ".claude/commands"))).resolves.toBeUndefined();
  });

  it("dry-run reads and decides but writes nothing", async () => {
    const dry = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids, dryRun: true });
    expect(summarizeFanout(dry.outcomes).written).toBe(4);
    await expect(fs.access(join(home, ".agents"))).rejects.toThrow();
    await expect(fs.access(join(home, ".claude"))).rejects.toThrow();

    const real = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids });
    const dryPrune = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: [], previous: real.record, dryRun: true });
    expect(summarizeFanout(dryPrune.outcomes).pruned).toBe(4);
    for (const rel of Object.keys(real.record)) {
      await expect(fs.access(join(home, rel))).resolves.toBeUndefined();
    }
  });

  it("describeFanoutOutcomes names what the operator must know and stays silent about the rest", async () => {
    const first = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids });
    const lines = describeFanoutOutcomes(first.outcomes);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Wrote 4 client file(s): 2 Codex/Copilot skills, 2 Claude Code commands.");

    const quiet = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids, previous: first.record });
    expect(describeFanoutOutcomes(quiet.outcomes)).toEqual([]);

    const edited = USER_FANOUT_PATHS.codex("spell-status");
    await fs.appendFile(join(home, edited), "\nEDIT\n");
    const withEdit = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ids, previous: first.record });
    const warning = describeFanoutOutcomes(withEdit.outcomes).find((l) => l.startsWith("!"))!;
    expect(warning).toContain("Kept 1 customized client file(s) untouched");
    expect(warning).toContain(`~/${edited}`);
    expect(describeFanoutOutcomes(withEdit.outcomes, true).find((l) => l.startsWith("!"))).toContain("Would keep");
  });
});

// ─── The read-only view for status and doctor ────────────────────────────────

describe("inspectUserTierFanout", () => {
  it("counts per client and finds missing and customized files without writing", async () => {
    await seedStoreSpell("spell-status");
    await seedStoreSpell("spell-plan");
    const { record } = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ["spell-status", "spell-plan"] });
    const missing = USER_FANOUT_PATHS.claude("spell-plan");
    const edited = USER_FANOUT_PATHS.codex("spell-status");
    await removeFixtureDir(join(home, missing));
    await fs.appendFile(join(home, edited), "\nEDIT\n");

    const health = await inspectUserTierFanout(home, record);
    expect(health.total).toBe(4);
    expect(health.byClient).toEqual({ codex: 2, claude: 2 });
    expect(health.missing).toEqual([missing]);
    expect(health.customized).toEqual([edited]);
    await expect(fs.access(join(home, missing))).rejects.toThrow();
  });

  it("an absent record is an empty, healthy fan-out", async () => {
    const health = await inspectUserTierFanout(home, undefined);
    expect(health).toEqual({ total: 0, byClient: { codex: 0, claude: 0 }, missing: [], customized: [] });
  });
});
