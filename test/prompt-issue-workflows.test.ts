import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const spells = join(process.cwd(), "src/assets/.arcane/spells");
const read = (name: string) => readFileSync(join(spells, `${name}.md`), "utf8");

describe("issue workflow contracts", () => {
  it("checks applicable PR validation before describing testing (#453)", () => {
    const text = read("spell-create-pull-request");
    expect(text.indexOf("**Establish PR validation before writing Testing (#453).**")).toBeLessThan(text.indexOf("Standard template:"));
    expect(text).toContain("No CI runs on this pull request.");
    expect(text).toContain("If policy or workflow access fails or applicability is unknown");
    expect(text).not.toContain('else "See CI pipeline results."');
  });
  it("distinguishes Azure merge completion and policy-permitted REST rebase (#454)", () => {
    const text = read("spell-commit-work");
    expect(text).toContain("**no-fast-forward merge commit**, not a rebase");
    expect(text).toContain('"mergeStrategy": "rebase"');
    expect(text).toContain("confirm the target policy permits **rebase**");
    expect(text).toContain("confirm the expected merge shape and that the intended commits landed");
  });
  it("uses a declared attribution convention while preserving the default (#450)", () => {
    const text = read("spell-commit-work");
    expect(text).toContain("do not set `--author`");
    expect(text).toContain("add only those configured trailers");
    expect(text).toContain("When the field is absent, apply the existing default partition and trailers below unchanged");
  });
  it("blocks production on applicable open backlog gates unless explicitly waived (#449)", () => {
    const text = read("spell-ship");
    expect(text).toContain("Before a production deployment or production flag flip");
    expect(text).toContain("List each applicable open gate with file and line");
    expect(text).toContain("Record the operator's actual waiver words");
    expect(text).toContain("No open backlog gates found for <target>.");
    expect(text).toContain("If the backlog inventory or search cannot be completed");
  });
});
