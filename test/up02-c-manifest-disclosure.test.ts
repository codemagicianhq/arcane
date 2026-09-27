import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP02-C-01 (#262, PRD R-262): spell-manifest's disclosure gate is keyed on
// the destination repository's visibility, not on an enumerated list of
// destination letters. The enumerated list named (a), (c) and (d) and left
// out (b) — the PRD scaffold, which writes the idea text into the public
// repo's tree — so private idea text could reach a public repo without the
// per-entry `disclose` consent.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");

let manifest: string;

function section(text: string, startHeading: string, endHeading: string): string {
  const start = text.indexOf(startHeading);
  const end = text.indexOf(endHeading, start + startHeading.length);
  expect(start, `missing heading: ${startHeading}`).toBeGreaterThan(-1);
  expect(end, `missing heading: ${endHeading}`).toBeGreaterThan(start);
  return text.slice(start, end);
}

beforeAll(async () => {
  manifest = await readFile(join(SPELLS, "spell-manifest.md"), "utf8");
});

describe("UP02-C-01: spell-manifest disclosure gate keyed on destination visibility (#262)", () => {
  it("Step 5 enumerates no destination list — no (a), (c) or (d) letters", () => {
    const step5 = section(manifest, "## Step 5 — Disclosure Gate", "## Step 6 — Execute");
    expect(step5).not.toMatch(/\((a|c|d)\)/);
    // The old enumerated sentence is gone.
    expect(step5).not.toContain("(a) or (d) landing in a public repo");
  });

  it("Step 5 keys the gate on the destination repository's visibility for every destination", () => {
    const step5 = section(manifest, "## Step 5 — Disclosure Gate", "## Step 6 — Execute");
    expect(step5).toContain("keyed on the destination repository's visibility, never on the destination letter");
    expect(step5).toContain('`visibility: "public"`');
    expect(step5).toContain("whatever route puts it there");
    expect(step5).toContain("There is deliberately no list of covered destinations");
  });

  it("Step 5 covers destination (b), the PRD scaffold, when it lands in a public repo", () => {
    const step5 = section(manifest, "## Step 5 — Disclosure Gate", "## Step 6 — Execute");
    // The (b) route: PRD scaffold writing into a public repo's tree is a disclosure.
    expect(step5).toMatch(/A PRD scaffold \(b\)[^.]*public repo's tree[^.]*, so it is a disclosure/);
    // And the Step 4 table still describes (b) as a write into the consumer repo's tree,
    // which is what makes the visibility key reach it.
    expect(manifest).toMatch(/\| b \| PRD scaffold in consumer `features\/<slug>\/PRD\.md` \|/);
  });

  it("Step 5 keeps the per-entry literal `disclose` consent and fails closed", () => {
    const step5 = section(manifest, "## Step 5 — Disclosure Gate", "## Step 6 — Execute");
    expect(step5).toContain("never covered by `all`, `go`, or any other batch confirmation");
    expect(step5).toContain("print the **exact text** that will become public and ask for the literal word `disclose`");
    expect(step5).toContain("Enforcement: structured spell gate (ARC-023)");
    expect(step5).toMatch(/visibility is missing from the registry, treat it as public/);
    expect(step5).toMatch(/timeout, cancellation, or host-generated fallback is not consent/);
  });

  it("the Rules bullet defines a disclosure by destination visibility, not by destination letter", () => {
    const rules = manifest.slice(manifest.indexOf("## Rules"));
    expect(rules).toContain(
      "A disclosure is any entry whose destination repository is public, whatever the destination",
    );
    expect(rules).toContain("always per-entry, always the literal word `disclose`");
  });

  it("Step 6 marks every public destination as disclosed, not only public: and github:", () => {
    const step6 = section(manifest, "## Step 6 — Execute", "## Step 7 — Leak Scan");
    expect(step6).toContain("Any marker whose destination repository is public ends in ` (disclosed)`");
  });

  it("leaves the Step 7 leak scan and Step 8 stage-never-commit behaviour in place", () => {
    const step7 = section(manifest, "## Step 7 — Leak Scan", "## Step 8 — Report");
    expect(step7).toContain("Every other venture's slug and aliases from the registry");
    expect(step7).toContain("A hit blocks the write and reports exactly what matched");
    const step8 = section(manifest, "## Step 8 — Report", "## Rules");
    expect(step8).toContain("Stage (never commit) the touched files");
  });
});
