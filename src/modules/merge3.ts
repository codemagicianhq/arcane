/**
 * Line-based three-way text merge (ARC-038 decision 1).
 *
 * `spell update` uses this to reconcile an operator's edited copy of a
 * shipped file against a new vendor version, without silently discarding the
 * edit: `base` is the OLD vendor content the operator's edit started from,
 * `ours` is the operator's current on-disk content, `theirs` is the NEW
 * vendor content about to be installed. Non-overlapping changes on each side
 * merge automatically; a region both sides changed differently becomes a
 * conflict, marked the same way `git merge` marks one.
 *
 * Deliberately line-granular, not character-granular -- the same mental
 * model a human resolving a merge conflict already has, and the one ARC-038
 * itself names ("the same shape copier's regenerate-old/diff/regenerate-new/
 * merge approach uses").
 */

export const CONFLICT_START = "<<<<<<< yours (edited)";
export const CONFLICT_MID = "=======";
export const CONFLICT_END = ">>>>>>> incoming (vendor update)";

interface DiffOp {
  type: "equal" | "replace";
  baseStart: number;
  baseEnd: number;
  otherStart: number;
  otherEnd: number;
}

/**
 * Line-based LCS diff of `base` against `other`. DP table is O(n*m) time and
 * space -- fine for governance-doc-sized files (hundreds to low thousands of
 * lines); `merge3` falls back to a whole-file conflict rather than running
 * this on pathologically large inputs (see MAX_LINES_FOR_LCS below).
 */
function computeLcsDiff(base: string[], other: string[]): DiffOp[] {
  const n = base.length;
  const m = other.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        base[i] === other[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  let pendingBaseStart = 0;
  let pendingOtherStart = 0;

  const flushReplace = (baseEnd: number, otherEnd: number) => {
    if (baseEnd > pendingBaseStart || otherEnd > pendingOtherStart) {
      ops.push({
        type: "replace",
        baseStart: pendingBaseStart,
        baseEnd,
        otherStart: pendingOtherStart,
        otherEnd,
      });
    }
  };

  while (i < n && j < m) {
    if (base[i] === other[j]) {
      flushReplace(i, j);
      const eqBaseStart = i;
      const eqOtherStart = j;
      while (i < n && j < m && base[i] === other[j]) {
        i++;
        j++;
      }
      ops.push({ type: "equal", baseStart: eqBaseStart, baseEnd: i, otherStart: eqOtherStart, otherEnd: j });
      pendingBaseStart = i;
      pendingOtherStart = j;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }
  flushReplace(n, m);
  return ops;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((line, idx) => line === b[idx]);
}

export interface Merge3Result {
  content: string;
  hasConflict: boolean;
}

/**
 * Files larger than this fall back to a single whole-file conflict rather
 * than running the O(n*m) LCS diff -- a correctness-preserving degradation
 * (the operator is never silently overwritten, they're just not offered an
 * auto-merge for a file this large), not a crash or a silent choice of one
 * side. No governance/prompt content shipped by Arcane comes close to this.
 */
const MAX_LINES_FOR_LCS = 4000;

/** Splits on \n, preserving trailing-newline presence as the final "" element does. */
function splitLines(text: string): string[] {
  return text.split("\n");
}

/**
 * Merges `theirs` (new vendor content) onto `ours` (the operator's edited
 * content), using `base` (old vendor content) as the common ancestor.
 *
 * Never throws and never silently prefers one side: a region changed
 * differently by both sides is always marked as a conflict in the returned
 * content, and `hasConflict` tells the caller whether any such region
 * existed, so update.ts can report it rather than commit it quietly.
 */
export function merge3(base: string, ours: string, theirs: string): Merge3Result {
  const baseLines = splitLines(base);
  const oursLines = splitLines(ours);
  const theirsLines = splitLines(theirs);

  if (
    baseLines.length > MAX_LINES_FOR_LCS ||
    oursLines.length > MAX_LINES_FOR_LCS ||
    theirsLines.length > MAX_LINES_FOR_LCS
  ) {
    return {
      content: [CONFLICT_START, ours, CONFLICT_MID, theirs, CONFLICT_END].join("\n"),
      hasConflict: true,
    };
  }

  const oursOps = computeLcsDiff(baseLines, oursLines).filter((op) => op.type === "replace");
  const theirsOps = computeLcsDiff(baseLines, theirsLines).filter((op) => op.type === "replace");

  if (oursOps.length === 0 && theirsOps.length === 0) {
    return { content: base, hasConflict: false };
  }

  interface ChangedInterval {
    baseStart: number;
    baseEnd: number;
    source: "ours" | "theirs";
    lines: string[];
  }
  const intervals: ChangedInterval[] = [
    ...oursOps.map((op) => ({
      baseStart: op.baseStart,
      baseEnd: op.baseEnd,
      source: "ours" as const,
      lines: oursLines.slice(op.otherStart, op.otherEnd),
    })),
    ...theirsOps.map((op) => ({
      baseStart: op.baseStart,
      baseEnd: op.baseEnd,
      source: "theirs" as const,
      lines: theirsLines.slice(op.otherStart, op.otherEnd),
    })),
  ].sort((a, b) => a.baseStart - b.baseStart || a.baseEnd - b.baseEnd);

  // Coalesce intervals that overlap in BASE-line space, from either side,
  // into groups -- two edits any distance apart in "ours" and "theirs" text
  // can still collide if they touch the same base lines, which is exactly
  // the case a merge must resolve as one unit, not two independent ones.
  const groups: ChangedInterval[][] = [];
  let groupMaxEnd = -1;
  for (const iv of intervals) {
    const current = groups[groups.length - 1];
    if (current && iv.baseStart < groupMaxEnd) {
      current.push(iv);
      groupMaxEnd = Math.max(groupMaxEnd, iv.baseEnd);
    } else {
      groups.push([iv]);
      groupMaxEnd = iv.baseEnd;
    }
  }

  const resultLines: string[] = [];
  let hasConflict = false;
  let basePos = 0;

  for (const group of groups) {
    const groupStart = Math.min(...group.map((g) => g.baseStart));
    const groupEnd = Math.max(...group.map((g) => g.baseEnd));

    resultLines.push(...baseLines.slice(basePos, groupStart));

    const oursInGroup = group.filter((g) => g.source === "ours");
    const theirsInGroup = group.filter((g) => g.source === "theirs");

    if (oursInGroup.length > 0 && theirsInGroup.length === 0) {
      for (const g of oursInGroup) resultLines.push(...g.lines);
    } else if (theirsInGroup.length > 0 && oursInGroup.length === 0) {
      for (const g of theirsInGroup) resultLines.push(...g.lines);
    } else {
      const oursGroupLines = oursInGroup.flatMap((g) => g.lines);
      const theirsGroupLines = theirsInGroup.flatMap((g) => g.lines);
      if (arraysEqual(oursGroupLines, theirsGroupLines)) {
        // Converged edit -- both sides changed this region to the same
        // result, so there is nothing to actually resolve.
        resultLines.push(...oursGroupLines);
      } else {
        hasConflict = true;
        resultLines.push(CONFLICT_START, ...oursGroupLines, CONFLICT_MID, ...theirsGroupLines, CONFLICT_END);
      }
    }

    basePos = groupEnd;
  }
  resultLines.push(...baseLines.slice(basePos));

  return { content: resultLines.join("\n"), hasConflict };
}
