import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP02-C-02 (#261 spell half, PRD D-10 / R-261): an idea entry's tag is a
// declared, scanned field. spell-manifest's Step 7 leak scan names the tag
// as outbound text; spell-save-idea draws the tag from the optional
// `.arcane.json` `idea_tags` vocabulary ({ mode: "extend" | "replace",
// tags }) when one is declared, and a tag never carries a venture, client
// or person name.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");

let manifest: string;
let saveIdea: string;

function section(text: string, startHeading: string, endHeading: string): string {
  const start = text.indexOf(startHeading);
  const end = text.indexOf(endHeading, start + startHeading.length);
  expect(start, `missing heading: ${startHeading}`).toBeGreaterThan(-1);
  expect(end, `missing heading: ${endHeading}`).toBeGreaterThan(start);
  return text.slice(start, end);
}

beforeAll(async () => {
  [manifest, saveIdea] = await Promise.all([
    readFile(join(SPELLS, "spell-manifest.md"), "utf8"),
    readFile(join(SPELLS, "spell-save-idea.md"), "utf8"),
  ]);
});

describe("UP02-C-02: spell-manifest Step 7 scans an entry's tag (#261)", () => {
  it("Step 7 names the entry's tag as scanned outbound text", () => {
    const step7 = section(manifest, "## Step 7 — Leak Scan", "## Step 8 — Report");
    expect(step7).toContain("the idea text **and the entry's tag** (`[#tag]`)");
    expect(step7).toContain("a tag is outbound text like any other");
  });

  it("the tag goes through the same four checks as the idea text", () => {
    const step7 = section(manifest, "## Step 7 — Leak Scan", "## Step 8 — Report");
    const tagIdx = step7.indexOf("and the entry's tag");
    const checks = [
      "Every other venture's slug and aliases from the registry",
      "Hub path fragments",
      "Machine names (the `clones` keys across the registry)",
      "This repo's org-token denylist",
    ];
    for (const check of checks) {
      const idx = step7.indexOf(check);
      expect(idx, `Step 7 lost check: ${check}`).toBeGreaterThan(-1);
      // The tag clause introduces the check list, so it precedes every check.
      expect(tagIdx).toBeLessThan(idx);
    }
    expect(step7).toContain("A hit blocks the write and reports exactly what matched");
  });
});

describe("UP02-C-02: spell-save-idea draws tags from a declared vocabulary (#261, D-10)", () => {
  it("reads the optional `idea_tags` field from `.arcane.json`", () => {
    const step1 = section(saveIdea, "## Step 1 — Normalize the Idea", "## Step 2 — Append to IDEAS.md");
    expect(step1).toContain("`.arcane.json`'s optional `idea_tags` field");
    expect(step1).toContain('`{ "mode": "extend" | "replace", "tags": [...] }`');
  });

  it("defines both modes: extend adds to today's inference, replace is the declared list only", () => {
    const step1 = section(saveIdea, "## Step 1 — Normalize the Idea", "## Step 2 — Append to IDEAS.md");
    expect(step1).toMatch(/`mode: "extend"`[^\n]*declared `tags` plus today's free-form default tags/);
    expect(step1).toMatch(/`mode: "replace"`[^\n]*declared `tags` are the whole vocabulary/);
    expect(step1).toContain("never invent a tag outside it");
  });

  it("keeps today's free-form inference when `idea_tags` is absent", () => {
    const step1 = section(saveIdea, "## Step 1 — Normalize the Idea", "## Step 2 — Append to IDEAS.md");
    expect(step1).toMatch(/\*\*No `idea_tags`:\*\* infer a free-form tag/);
    expect(step1).toContain("`ui`, `infra`, `marketing`, `dx`");
    expect(step1).toContain("If nothing fits cleanly, omit the tag.");
  });

  it("forbids a venture, client or person name in a tag, in Step 1 and in Rules", () => {
    const step1 = section(saveIdea, "## Step 1 — Normalize the Idea", "## Step 2 — Append to IDEAS.md");
    expect(step1).toContain("A tag must never carry a venture, client, or person name");
    expect(step1).toContain("Enforcement: explicitly advisory prose (ARC-023)");
    const rules = saveIdea.slice(saveIdea.indexOf("## Rules"));
    expect(rules).toContain("Never put a venture, client, or person name in a tag");
  });
});
