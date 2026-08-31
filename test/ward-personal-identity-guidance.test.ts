import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * I1/BC-27b. "The org-token gate should catch the operator's own personal
 * identifiers, not just org names." ward's --terms is a generic denylist --
 * the fix is guidance at the point of use, not new detection logic, since
 * code cannot infer an operator's username/machine name/personal handle on
 * its own.
 */
describe("spell ward: seeds personal identifiers, not just org names (I1/BC-27b)", () => {
  it("the --terms CLI help text names personal identifiers explicitly", async () => {
    const indexTs = await readFile(join(process.cwd(), "src", "index.ts"), "utf8");
    expect(indexTs).toContain("Seed this from your OWN identity too, not just org/venture names");
    expect(indexTs).toContain("usernames, machine names, and personal handles");
  });

  it("ward.ts's module doc comment states the same guidance and cites the motivating incident", async () => {
    const wardModule = await readFile(join(process.cwd(), "src", "modules", "ward.ts"), "utf8");
    expect(wardModule).toContain("seed it from the operator's OWN identity too, not just");
    expect(wardModule).toContain("a branch name containing a username");
  });
});
