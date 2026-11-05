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
