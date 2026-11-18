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
  it("verifies the approved Azure completion strategy and all options before completing (#454, #480)", () => {
    expect(read("spell-commit-work")).toContain("For completion, follow steps 7–8");
    const conventions = readFileSync(join(process.cwd(), "src/assets/.arcane/governance/git-conventions.md"), "utf8");
    const completion = conventions.slice(
      conventions.indexOf("7. **Gate and configure completion.**"),
      conventions.indexOf("# 9. Pull merge commit and clean up"),
    );
    expect(completion).toContain("`noFastForward` or `rebase`");
    expect(completion).toContain("Check the strategy against the effective branch policy");
    expect(completion).toContain("Check `completionOptions.mergeStrategy`, `deleteSourceBranch`, and `transitionWorkItems` against the approved values");
    expect(completion.indexOf("Stop on any mismatch")).toBeLessThan(completion.indexOf('PATCH with `status: "completed"`'));
    expect(completion).toContain("verify what landed before cleanup");
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
