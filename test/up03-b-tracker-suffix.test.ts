import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP03-B-01 (#265, PRD R-265): in tracking_mode external, spell-todo,
// spell-save-idea and spell-manifest append the provider-format tracker-id
// suffix. The syntax is defined ONCE, in development-methodology.md (where
// spell-bug already looks for commit-link syntax); the three spells point at
// it. Internal mode is unchanged.

const ASSETS = join(process.cwd(), "src", "assets", ".arcane");
const HEADING = "### Tracker-ID Suffix on Captured Items";
const HEADING_NAME = "Tracker-ID Suffix on Captured Items";
const METHODOLOGY_LINK = "(../../.arcane/governance/development-methodology.md)";

let methodology: string;
let todo: string;
let saveIdea: string;
let manifest: string;

function sectionFrom(text: string, heading: string): string {
  const start = text.indexOf(heading);
  expect(start, `missing heading: ${heading}`).toBeGreaterThan(-1);
  const next = text.indexOf("\n### ", start + heading.length);
  return text.slice(start, next === -1 ? undefined : next);
}

beforeAll(async () => {
  [methodology, todo, saveIdea, manifest] = await Promise.all([
    readFile(join(ASSETS, "governance", "development-methodology.md"), "utf8"),
    readFile(join(ASSETS, "spells", "spell-todo.md"), "utf8"),
    readFile(join(ASSETS, "spells", "spell-save-idea.md"), "utf8"),
    readFile(join(ASSETS, "spells", "spell-manifest.md"), "utf8"),
  ]);
});

describe("UP03-B-01: development-methodology.md defines the suffix once (#265)", () => {
  it("has exactly one suffix section", () => {
    expect(methodology.split(HEADING).length - 1).toBe(1);
  });

  it("defines the per-provider formats: GitHub, Azure DevOps, Jira", () => {
    const section = sectionFrom(methodology, HEADING);
    expect(section).toContain("| `github` | `[#<number>]` |");
    expect(section).toContain("| `ado` | `[AB#<id>]` |");
    expect(section).toContain("| `jira` | `[<issue key>]` — the key exactly as Jira prints it |");
  });

  it("applies only in external mode, only for a real id, and leaves internal mode alone", () => {
    const section = sectionFrom(methodology, HEADING);
    expect(section).toContain("When `tracking_mode=external`");
    expect(section).toContain("Never guess an id, and never file a work item just to have a suffix.");
    expect(section).toContain("**`tracking_mode=internal`:** no suffix.");
  });

  it("carries an ARC-023 enforcement annotation", () => {
    const section = sectionFrom(methodology, HEADING);
    expect(section).toContain("**Enforcement: explicitly advisory prose (ARC-023)");
  });
});

describe("UP03-B-01: the three spells reference the definition instead of restating it", () => {
  for (const [name, getText] of [
    ["spell-todo", () => todo],
    ["spell-save-idea", () => saveIdea],
    ["spell-manifest", () => manifest],
  ] as const) {
    it(`${name} points at development-methodology.md's suffix section`, () => {
      const text = getText();
      expect(text).toContain(METHODOLOGY_LINK);
      expect(text).toContain(`"${HEADING_NAME}"`);
      expect(text).toMatch(/define[sd] once/);
    });

    it(`${name} does not copy the provider table`, () => {
      const text = getText();
      expect(text).not.toContain("| `github` | `[#<number>]` |");
      expect(text).not.toContain("| `ado` | `[AB#<id>]` |");
    });
  }

  it("spell-todo and spell-save-idea gate the suffix on tracking_mode external", () => {
    expect(todo).toContain("**Tracker-id suffix (`tracking_mode: external` only):**");
    expect(saveIdea).toContain("**Tracker-id suffix (`tracking_mode: external` only):**");
  });

  it("spell-manifest writes the suffix when it files a tracker item (route c)", () => {
    const step6 = manifest.slice(manifest.indexOf("## Step 6 — Execute"), manifest.indexOf("## Step 7 — Leak Scan"));
    expect(step6).toContain("When route (c) files a tracker item, append the new work item's id");
    expect(step6).toContain("Use only the id the create command returned.");
    expect(step6).toContain("No tracker item filed means no suffix");
  });
});

describe("UP03-B-01: internal-mode text is unchanged", () => {
  it("spell-save-idea's entry format line is untouched", () => {
    expect(saveIdea).toContain(
      "- **[YYYY-MM-DD HH:MM]** [#tag] <the idea, lightly cleaned> <!-- status: new -->",
    );
    expect(saveIdea).toContain("In `tracking_mode: internal`, the entry format above is unchanged.");
  });

  it("spell-todo's proposal and apply formats are untouched", () => {
    expect(todo).toContain("- [ ] [First item — phrased as imperative, with file ref if applicable]");
    expect(todo).toContain("1. Insert the item(s) at the bottom of the correct section in the target file(s).");
    expect(todo).toContain("In `tracking_mode: internal`, items are written without a suffix, exactly as before.");
  });

  it("spell-manifest's promoted-marker grammar is untouched", () => {
    expect(manifest).toContain("<!-- status: promoted → <dest> YYYY-MM-DD -->");
    expect(manifest).toContain("ado:<slug>#<id>");
  });
});
