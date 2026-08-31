import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");

let fullCycle: string;

beforeAll(async () => {
  fullCycle = await readFile(join(PROMPTS, "spell-full-cycle.prompt.md"), "utf8");
});

describe("spell-full-cycle: delegation-is-roleplay disclosed honestly (BC-20)", () => {
  it("discloses single-agent role-switching when no subagent registry ships", () => {
    expect(fullCycle).toContain("**in practice, a single agent switches hats per phase**");
    expect(fullCycle).toContain("this framework ships no such registry by default");
  });
});

describe("spell-full-cycle: pre-diagnosed root causes can be stale (BC-20)", () => {
  it("Phase 1 re-verifies a handed-in root cause against current source", () => {
    expect(fullCycle).toContain("**If the feature description hands in a pre-diagnosed root cause**");
    expect(fullCycle).toContain("re-verify it against current source before accepting it");
  });
});

describe("spell-full-cycle: DB migration guard and sequence re-derivation (BC-20, fix idea 1)", () => {
  it("halts and flags an unexpected migration rather than writing it silently", () => {
    expect(fullCycle).toContain("**DB migration guard.**");
    expect(fullCycle).toContain("**halt and flag it**");
  });

  it("re-derives the migration sequence number at write time, not just at branch creation", () => {
    expect(fullCycle).toContain(
      "**re-derive its sequence number from a fresh `git pull --ff-only` of the target branch immediately before writing the file**",
    );
    expect(fullCycle).toContain("not once at branch-creation time in step 0");
  });
});

describe("spell-full-cycle: real-data migration gate guidance (BC-20, fix idea 2)", () => {
  it("states a fresh/empty test DB is not sufficient evidence for a migration", () => {
    expect(fullCycle).toContain(
      "a fresh/empty test database is not sufficient evidence by itself",
    );
  });

  it("discloses the gap explicitly when a real-data replay isn't available, rather than silently proceeding", () => {
    expect(fullCycle).toContain(
      "do not silently proceed as if this were validated",
    );
    expect(fullCycle).toContain("name the gap explicitly in the ship report's disclosure");
  });
});

describe("spell-full-cycle: multi-item PR strategy (BC-20)", () => {
  it("states one-branch-one-PR-per-invocation as the default, not operator-imposed", () => {
    expect(fullCycle).toContain("**PR strategy: one branch, one PR, per invocation.**");
    expect(fullCycle).toContain("is not optional to");
  });

  it("states how to sequence against an earlier invocation's still-open PR", () => {
    expect(fullCycle).toContain("do not open a second, conflicting PR");
    expect(fullCycle).toContain("rebase this branch onto the earlier PR's branch");
  });
});

describe("spell-full-cycle: mandatory ship-report disclosure (BC-20)", () => {
  it("requires listing what could not be verified in the execution sandbox", () => {
    expect(fullCycle).toContain("**Mandatory disclosure section:**");
    expect(fullCycle).toContain('state "Nothing withheld" in that case');
  });

  it("folds the disclosure into the consumer repo's QA checklist", () => {
    expect(fullCycle).toContain("Fold it into the consumer repo's own QA checklist");
  });
});

describe("spell-full-cycle: serialization default (fix idea 3) was already shipped before this epic", () => {
  it("still states the ARC-028 R4 multi-epic serialization default, unchanged by this epic's edits", () => {
    expect(fullCycle).toContain("**Multi-epic runs serialize by default (ARC-028 R4).**");
    expect(fullCycle).toContain("Serialization stays the default until re-derivation tooling exists");
  });
});
