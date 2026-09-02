import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");

/**
 * I4/BC-27a. "Deduplication must diff before deleting" -- a near-identical
 * pair found during housekeeping is usually a drifted copy, not a byte-
 * identical one, so merge unique content before removing either side.
 */
describe("universal-agent-rules.md: rule 23 (diff before deleting a duplicate, I4/BC-27a)", () => {
  it("states the rule under a uniquely-numbered heading (LH-05: no longer pinned to max===24, since LH-10 adds rules 25-27 after this)", async () => {
    const rules = await readFile(join(GOVERNANCE, "universal-agent-rules.md"), "utf8");
    const numbers = [...rules.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toContain(23);
    expect(rules).toContain('23. **Diff before deleting a "duplicate."');
  });

  it("frames a near-identical pair as usually drifted, not byte-identical", () => {
    return readFile(join(GOVERNANCE, "universal-agent-rules.md"), "utf8").then((rules) => {
      expect(rules).toContain("drifted copy carrying unique content in one and not the");
      expect(rules).toContain("not byte-identical redundancy");
    });
  });

  it("cites git-conventions.md's Content-Verified Branch Deletion section with an anchor that resolves to a real heading", async () => {
    const [rules, conventions] = await Promise.all([
      readFile(join(GOVERNANCE, "universal-agent-rules.md"), "utf8"),
      readFile(join(GOVERNANCE, "git-conventions.md"), "utf8"),
    ]);

    const anchorMatch = /git-conventions#([a-z0-9-]+)\|Content-Verified/.exec(rules);
    expect(anchorMatch).not.toBeNull();
    const anchor = anchorMatch![1];

    const slugify = (heading: string) =>
      heading
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

    const headingMatch = /^### (.+)$/m.exec(conventions.split("\n").find((line) => line.startsWith("### Content-Verified")) ?? "");
    expect(headingMatch).not.toBeNull();
    expect(slugify(headingMatch![1])).toBe(anchor);
  });
});
