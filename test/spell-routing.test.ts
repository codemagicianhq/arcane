import { beforeAll, describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");
const COMMANDS = join(process.cwd(), "src", "assets", ".claude", "commands");

let universalRules: string;

beforeAll(async () => {
  universalRules = await readFile(
    join(GOVERNANCE, "universal-agent-rules.md"),
    "utf8",
  );
});

describe("rule 22: spell lifecycle (T24/BC-16 R3)", () => {
  it("states lifecycle operations run through their spell when one is installed", () => {
    expect(universalRules).toContain(
      "**Lifecycle operations run through their spell when one is installed.**",
    );
  });

  it("names all five lifecycle spells", () => {
    for (const spell of [
      "`spell-commit-work`",
      "`spell-create-pull-request`",
      "`spell-open-session`",
      "`spell-close-session`",
      "`spell-review`",
      "`spell-ship`",
    ]) {
      expect(universalRules).toContain(spell);
    }
  });

  it("declares the L1 routing table normative, not illustrative", () => {
    expect(universalRules).toContain(
      "is normative for this mapping, not illustrative",
    );
  });

  it("does not renumber any existing rule — rule 8 (ARC-036) stays rule 8", () => {
    expect(universalRules).toContain(
      "8. **Use Mermaid for diagrams**",
    );
  });
});

describe("every .claude/commands/spell-*.md ships a proactive-trigger description (T24/BC-16 R2)", () => {
  it("every spell command stub has frontmatter with a 'Use PROACTIVELY' description", async () => {
    const files = (await readdir(COMMANDS)).filter(
      (f) => f.startsWith("spell-") && f.endsWith(".md"),
    );
    expect(files.length).toBeGreaterThan(30);

    const missing: string[] = [];
    for (const file of files) {
      const content = await readFile(join(COMMANDS, file), "utf8");
      if (!content.startsWith("---\n")) {
        missing.push(`${file} (no frontmatter)`);
        continue;
      }
      const frontmatterEnd = content.indexOf("\n---", 4);
      const frontmatter = content.slice(0, frontmatterEnd);
      if (!/description:\s*Use PROACTIVELY/.test(frontmatter)) {
        missing.push(`${file} (frontmatter present but no proactive-trigger description)`);
      }
    }
    expect(missing).toEqual([]);
  });
});
