import { describe, it, expect } from "vitest";
import { merge3, CONFLICT_START, CONFLICT_MID, CONFLICT_END } from "../src/modules/merge3.js";

function lines(...ls: string[]): string {
  return ls.join("\n");
}

describe("merge3", () => {
  it("returns base content unchanged when neither side changed anything", () => {
    const base = lines("a", "b", "c");
    const result = merge3(base, base, base);
    expect(result).toEqual({ content: base, hasConflict: false });
  });

  it("takes theirs when only theirs changed", () => {
    const base = lines("a", "b", "c");
    const theirs = lines("a", "B", "c");
    const result = merge3(base, base, theirs);
    expect(result).toEqual({ content: theirs, hasConflict: false });
  });

  it("takes ours when only ours changed", () => {
    const base = lines("a", "b", "c");
    const ours = lines("a", "B", "c");
    const result = merge3(base, ours, base);
    expect(result).toEqual({ content: ours, hasConflict: false });
  });

  it("auto-merges non-overlapping edits from both sides", () => {
    const base = lines("a", "b", "c", "d", "e");
    const ours = lines("A", "b", "c", "d", "e"); // edited first line
    const theirs = lines("a", "b", "c", "d", "E"); // edited last line
    const result = merge3(base, ours, theirs);
    expect(result.hasConflict).toBe(false);
    expect(result.content).toBe(lines("A", "b", "c", "d", "E"));
  });

  it("does not conflict when both sides make the identical edit (converged)", () => {
    const base = lines("a", "b", "c");
    const ours = lines("a", "CHANGED", "c");
    const theirs = lines("a", "CHANGED", "c");
    const result = merge3(base, ours, theirs);
    expect(result).toEqual({ content: theirs, hasConflict: false });
  });

  it("conflicts when both sides edit the same line differently", () => {
    const base = lines("a", "b", "c");
    const ours = lines("a", "OURS", "c");
    const theirs = lines("a", "THEIRS", "c");
    const result = merge3(base, ours, theirs);
    expect(result.hasConflict).toBe(true);
    expect(result.content).toBe(
      lines("a", CONFLICT_START, "OURS", CONFLICT_MID, "THEIRS", CONFLICT_END, "c"),
    );
  });

  it("handles an insertion on one side and an unrelated edit on the other", () => {
    const base = lines("a", "b", "c");
    const ours = lines("a", "b", "INSERTED", "c"); // inserted before c
    const theirs = lines("A", "b", "c"); // edited first line
    const result = merge3(base, ours, theirs);
    expect(result.hasConflict).toBe(false);
    expect(result.content).toBe(lines("A", "b", "INSERTED", "c"));
  });

  it("handles a deletion on one side and an unrelated edit on the other", () => {
    const base = lines("a", "b", "c", "d");
    const ours = lines("a", "c", "d"); // deleted "b"
    const theirs = lines("a", "b", "c", "D"); // edited last line
    const result = merge3(base, ours, theirs);
    expect(result.hasConflict).toBe(false);
    expect(result.content).toBe(lines("a", "c", "D"));
  });

  it("conflicts when one side deletes a region the other side edited", () => {
    const base = lines("a", "b", "c");
    const ours = lines("a", "c"); // deleted "b"
    const theirs = lines("a", "B", "c"); // edited "b"
    const result = merge3(base, ours, theirs);
    expect(result.hasConflict).toBe(true);
    expect(result.content).toContain(CONFLICT_START);
    expect(result.content).toContain(CONFLICT_END);
  });

  it("preserves an unchanged prefix and suffix around a single-line conflict", () => {
    const base = lines("head", "a", "b", "c", "tail");
    const ours = lines("head", "a", "OURS", "c", "tail");
    const theirs = lines("head", "a", "THEIRS", "c", "tail");
    const result = merge3(base, ours, theirs);
    expect(result.content.startsWith("head\na\n")).toBe(true);
    expect(result.content.endsWith("\nc\ntail")).toBe(true);
  });

  it("handles multiple separate non-overlapping conflicts in one file", () => {
    const base = lines("a", "b", "c", "d", "e");
    const ours = lines("OURS-A", "b", "c", "d", "OURS-E");
    const theirs = lines("THEIRS-A", "b", "c", "d", "THEIRS-E");
    const result = merge3(base, ours, theirs);
    expect(result.hasConflict).toBe(true);
    const conflictCount = result.content.split(CONFLICT_START).length - 1;
    expect(conflictCount).toBe(2);
  });

  it("treats a whole-file rewrite by ours as a single non-conflicting change when theirs is untouched", () => {
    const base = lines("a", "b", "c");
    const ours = lines("completely", "different", "content", "entirely");
    const result = merge3(base, ours, base);
    expect(result).toEqual({ content: ours, hasConflict: false });
  });

  it("is order-independent for which side is 'ours' vs 'theirs' when only one side changed", () => {
    const base = lines("a", "b", "c");
    const changed = lines("a", "X", "c");
    expect(merge3(base, changed, base).content).toBe(changed);
    expect(merge3(base, base, changed).content).toBe(changed);
  });

  it("falls back to a whole-file conflict for pathologically large inputs rather than running an expensive diff", () => {
    const bigBase = Array.from({ length: 5000 }, (_, i) => `line-${i}`).join("\n");
    const ours = bigBase + "\nours-addition";
    const theirs = bigBase + "\ntheirs-addition";
    const result = merge3(bigBase, ours, theirs);
    expect(result.hasConflict).toBe(true);
    expect(result.content).toContain(CONFLICT_START);
    expect(result.content).toContain("ours-addition");
    expect(result.content).toContain("theirs-addition");
  });
});
