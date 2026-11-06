import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const root = join(process.cwd(), "src/assets/.arcane/spells");

describe("unattended-run preflight and authority accounting", () => {
  it("compiles the same preflight into all three orchestrating spells", async () => {
    const fragment = (await readFile(join(root, "_fragments/unattended-run-preflight.md"), "utf8")).trim();
    for (const name of ["spell-full-cycle", "spell-implement", "spell-parallel-workers"]) {
      const spell = await readFile(join(root, `${name}.md`), "utf8");
      expect(spell).toContain(fragment);
      expect(spell).toContain("every blocking question in one batch");
      expect(spell).toContain("PR authors\n     cannot approve their own PRs");
      expect(spell).toContain("creatorVoteCounts");
      expect(spell).toContain("build validation and allowed merge");
      expect(spell).toContain("what will run unattended and what will wait for the operator");
      expect(spell).toContain("approved local\n     checks against each exact completion head");
    }
  });
  it("accounts for the whole session, including final close actions and missing authority", async () => {
    const close = await readFile(join(root, "spell-close-session.md"), "utf8");
    expect(close).toContain("every commit range and every PR completed during this session");
    expect(close).toContain("**Authority used** table in the journal and final closure report");
    expect(close).toContain("fingerprint approval / PR-bound approval / grant ID / validated autonomous Magus+ / none");
    expect(close).toContain("Every **none** goes into the top-level Action required block");
    expect(close).toContain("carry it into the handoff too");
    expect(close).toContain("after steps 9–10 reconcile the final table");
    expect(close).toContain("A grant recorded later cannot authorize an earlier action");
  });
});
