import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expandFragment, referencesFragment } from "../src/modules/spell-compiler.js";

// PRD PC-11, architecture D19. The no-channel half of "a spell run without a
// channel is byte-identical to 1.17.1" is executable only through the CLI the
// fragment tells a spell to run: presence-reporter.test.ts, "the silence rule
// without a channel", shows report and end print nothing and exit 0 and read
// nothing beyond the user store. The prose half is this file.

const ROOT = process.cwd();
const ASSETS = join(ROOT, "src", "assets");
const SPELLS = join(ASSETS, ".arcane", "spells");
const FRAGMENT = join(SPELLS, "_fragments", "presence-report.md");
const HOSTS = ["spell-close-session.md", "spell-commit-work.md", "spell-implement.md", "spell-open-session.md"];

describe("the presence-report fragment (PC-11, ARC-060 decision 5)", () => {
  it("is hosted by exactly four spells", async () => {
    const hosts: string[] = [];
    for (const file of (await readdir(SPELLS)).filter((f) => f.endsWith(".md")).sort()) {
      if (referencesFragment(await readFile(join(SPELLS, file), "utf8"), "presence-report")) hosts.push(file);
    }
    expect(hosts).toEqual(HOSTS);
  });

  it("is expanded verbatim in each host and in each host's root copy", async () => {
    const fragment = await readFile(FRAGMENT, "utf8");
    for (const file of HOSTS) {
      for (const base of [SPELLS, join(ROOT, ".arcane", "spells")]) {
        const content = await readFile(join(base, file), "utf8");
        expect({ file, base, inSync: expandFragment(content, "presence-report", fragment) === content }).toEqual({ file, base, inSync: true });
        expect(content).toContain(fragment);
      }
    }
  });

  it("reaches every client through shims that point at the spell itself", async () => {
    for (const file of HOSTS) {
      const id = file.replace(/\.md$/, "");
      for (const shim of [join(ASSETS, ".claude", "commands", file), join(ASSETS, ".agents", "skills", id, "SKILL.md")]) {
        expect(existsSync(shim)).toBe(true);
        expect(await readFile(shim, "utf8")).toContain(`.arcane/spells/${file}`);
      }
    }
  });

  it("says CLI only, never a token on the command line, never a repository write, and carries its enforcement line", async () => {
    const fragment = (await readFile(FRAGMENT, "utf8")).replace(/\s+/g, " ");
    expect(fragment).toContain("Report with the CLI only");
    expect(fragment).toContain("never pass a token on the command line");
    expect(fragment).toContain("never write a repository file to report");
    expect(fragment).toContain("Enforcement: explicitly advisory prose (ARC-023)");
  });

  it("is the PRD's example text, unchanged", async () => {
    const prd = await readFile(join(ROOT, "features", "presence-channel", "PRD.md"), "utf8");
    const example = /<!-- fragment:presence-report:start -->\n([\s\S]*?)\n<!-- fragment:presence-report:end -->/.exec(prd)?.[1];
    expect(await readFile(FRAGMENT, "utf8")).toBe(example);
  });
});

// PRD PC-18, architecture D25: every Action required block reports `waiting`
// (renamed from Needs you; features/action-required/PRD.md AR-01, ARC-060 decision 14).
describe("the action-required fragment reports to the presence channel (PC-18)", () => {
  const NEEDS_YOU = join(SPELLS, "_fragments", "action-required.md");
  const LINE = 'spell presence report --status waiting --required-action "<line 1>" --required-action "<line 2>"';

  it("carries one report line in the reporter's own flag syntax, and says it is silent without a channel", async () => {
    const fragment = await readFile(NEEDS_YOU, "utf8");
    expect(fragment.split(LINE)).toHaveLength(2);
    expect(fragment.replace(/\s+/g, " ")).toContain("no presence channel configured on this machine the command prints nothing and exits 0");
    const cli = await readFile(join(ROOT, "src", "index.ts"), "utf8");
    expect(cli).toContain('.option("--required-action <line>"');
    expect(cli).toContain('.requiredOption("--status <status>", "working | waiting | blocked | idle")');
  });

  it("reaches every spell that renders the block, in its source and its root copy", async () => {
    const fragment = await readFile(NEEDS_YOU, "utf8");
    const hosts: string[] = [];
    for (const file of (await readdir(SPELLS)).filter((f) => f.endsWith(".md")).sort()) {
      if (referencesFragment(await readFile(join(SPELLS, file), "utf8"), "action-required")) hosts.push(file);
    }
    expect(hosts.length).toBeGreaterThanOrEqual(18);
    for (const file of hosts) {
      for (const base of [SPELLS, join(ROOT, ".arcane", "spells")]) {
        const content = await readFile(join(base, file), "utf8");
        expect({ file, base, inSync: expandFragment(content, "action-required", fragment) === content }).toEqual({ file, base, inSync: true });
        expect(content).toContain(LINE);
      }
    }
  });
});

// PRD PC-21, architecture D28: open-session lists the sessions in this repository's other checkouts.
describe("spell-open-session reads presence (PC-21)", () => {
  it("names the command, the two fields it filters on, and the footprint rule, in the source and the root copy", async () => {
    for (const base of [SPELLS, join(ROOT, ".arcane", "spells")]) {
      const spell = await readFile(join(base, "spell-open-session.md"), "utf8");
      const health = spell.slice(spell.indexOf("## Workspace Health Check"), spell.indexOf("## State Snapshot"));
      const bullet = health.split("\n").find((l) => l.includes("spell presence sessions --json"));
      expect(bullet).toBeDefined();
      for (const needle of ["`repository.root`", "`checkout.path`", "R4", "exits 1"]) expect({ needle, present: bullet!.includes(needle) }).toEqual({ needle, present: true });
    }
    for (const shim of [join(ASSETS, ".claude", "commands", "spell-open-session.md"), join(ASSETS, ".agents", "skills", "spell-open-session", "SKILL.md")]) {
      expect(await readFile(shim, "utf8")).toContain(".arcane/spells/spell-open-session.md");
    }
  });
});
