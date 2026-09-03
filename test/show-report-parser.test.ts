import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseEpics,
  parseParkedSection,
  computeCoverageOutcome,
} from "../src/modules/show-report/plan-parser.js";
import { parseOperatorQueue } from "../src/modules/show-report/queue-parser.js";
import { parseVerificationLedgerSection } from "../src/modules/show-report/ledger-parser.js";
import { parseAdrs, countAcceptedAdrsInWindow } from "../src/modules/show-report/decisions-parser.js";

describe("show-report plan-parser: parseFrontmatter", () => {
  it("reads title/status/created/baseline/owner/executor from a real-shaped frontmatter block", () => {
    const content = [
      "---",
      "title: Lessons Hardening — Mechanical Enforcement",
      "status: active",
      "created: 2026-09-02",
      "baseline: b0992c1 (main)",
      "owner: operator (payini)",
      "executor: Arcane autonomous loop (one epic per session)",
      "---",
      "",
      "# Body",
    ].join("\n");

    expect(parseFrontmatter(content)).toEqual({
      title: "Lessons Hardening — Mechanical Enforcement",
      status: "active",
      created: "2026-09-02",
      baseline: "b0992c1 (main)",
      owner: "operator (payini)",
      executor: "Arcane autonomous loop (one epic per session)",
    });
  });

  it("returns an empty object when no frontmatter block is present", () => {
    expect(parseFrontmatter("# Just a heading\n\nSome body text.\n")).toEqual({});
  });
});

describe("show-report plan-parser: parseEpics", () => {
  it("parses a single epic with a Report line, category, and glyph", () => {
    const content = [
      "## Wave Plan",
      "",
      "### Wave 1 — Setup",
      "",
      "- [x] **LH-00 — Commit this plan.** Route: direct. Size S.",
      "  **Done:** [PR #172](https://github.com/codemagicianhq/arcane/pull/172), merged 2026-09-02.",
      "",
      "  **Report:** Landed the plan itself, activating the standing autonomy grant. · category: process · glyph: 📜",
      "",
      "## Parked — Needs Operator",
    ].join("\n");

    const epics = parseEpics(content);
    expect(epics).toHaveLength(1);
    expect(epics[0]).toMatchObject({
      id: "LH-00",
      title: "Commit this plan",
      done: true,
      wave: "Wave 1 — Setup",
      prLinks: ["https://github.com/codemagicianhq/arcane/pull/172"],
    });
    expect(epics[0]!.report).toEqual({
      description: "Landed the plan itself, activating the standing autonomy grant.",
      category: "process",
      glyph: "📜",
      titleOverride: undefined,
    });
  });

  it("bounds each epic block at the next epic bullet, never bleeding into the next epic's text", () => {
    const content = [
      "- [x] **BC-01 — First epic.** Some detail.",
      "  More detail for BC-01.",
      "- [x] **BC-02 — Second epic.** Some detail.",
      "  More detail for BC-02.",
    ].join("\n");

    const epics = parseEpics(content);
    expect(epics).toHaveLength(2);
    expect(epics[0]!.block).toContain("More detail for BC-01");
    expect(epics[0]!.block).not.toContain("BC-02");
    expect(epics[1]!.block).toContain("More detail for BC-02");
    expect(epics[1]!.block).not.toContain("BC-01");
  });

  it("closes an open epic block at the next `## ` heading, not just at the next epic bullet", () => {
    const content = [
      "- [x] **BC-32 — Last epic.** Detail for BC-32.",
      "",
      "## BC-01 Detail — Appendix",
      "",
      "Some appendix text that must not be attributed to BC-32.",
    ].join("\n");

    const epics = parseEpics(content);
    expect(epics).toHaveLength(1);
    expect(epics[0]!.block).not.toContain("appendix");
  });

  it("attaches the nearest preceding `### Wave` heading to each epic, resetting on `## `", () => {
    const content = [
      "## Wave Plan",
      "### Wave 1 — Platform",
      "- [x] **BC-01 — A.** detail",
      "### Wave 2 — Docs",
      "- [x] **BC-02 — B.** detail",
      "## Parked — Needs Operator",
    ].join("\n");

    const epics = parseEpics(content);
    expect(epics[0]!.wave).toBe("Wave 1 — Platform");
    expect(epics[1]!.wave).toBe("Wave 2 — Docs");
  });

  it("dedupes repeated PR links and treats `[ ]` as not done", () => {
    const content = [
      "- [ ] **BC-05 — Open epic.** See [PR #10](https://github.com/codemagicianhq/arcane/pull/10)",
      "  again referencing [PR #10](https://github.com/codemagicianhq/arcane/pull/10) and",
      "  [PR #11](https://github.com/codemagicianhq/arcane/pull/11).",
    ].join("\n");

    const epics = parseEpics(content);
    expect(epics[0]!.done).toBe(false);
    expect(epics[0]!.prLinks).toEqual([
      "https://github.com/codemagicianhq/arcane/pull/10",
      "https://github.com/codemagicianhq/arcane/pull/11",
    ]);
  });

  it("captures an explicit title: override alongside the Report line", () => {
    const content = [
      "- [x] **BC-01 — ARC-035 review-round merge gate.** detail",
      "",
      "  title: Review-Round Merge Gate",
      "  **Report:** Auto-merge now waits for a clear review round. · category: governance · glyph: 🔀",
    ].join("\n");

    const epics = parseEpics(content);
    expect(epics[0]!.report?.titleOverride).toBe("Review-Round Merge Gate");
  });

  it("parses an epic whose bold title wraps onto a second line before the closing **, real LH-11 shape", () => {
    const content = [
      "- [x] **LH-11 — ADR ARC-041: a local supply channel for the ARC-031 privacy denylist (amends",
      "  decision 3).** Closes P7's mechanical half. Route: adr. Size M.",
      "- [x] **LH-12 — Next epic.** detail",
    ].join("\n");

    const epics = parseEpics(content);
    expect(epics).toHaveLength(2);
    expect(epics[0]!.id).toBe("LH-11");
    expect(epics[0]!.title).toBe(
      "ADR ARC-041: a local supply channel for the ARC-031 privacy denylist (amends decision 3)",
    );
    expect(epics[1]!.id).toBe("LH-12");
  });

  it("returns report: null for an epic with no Report line yet (unwritten)", () => {
    const content = "- [x] **BC-09 — No report yet.** Just detail, nothing else.";
    const epics = parseEpics(content);
    expect(epics[0]!.report).toBeNull();
  });
});

describe("show-report plan-parser: parseParkedSection", () => {
  it("parses the bullet shape (Lessons Hardening style)", () => {
    const content = [
      "## Parked — Needs Operator",
      "",
      "- **Pattern 6** (reported-done vs. independent check, 9×) — already codified elsewhere.",
      "- **FEEDBACK.md** — not created, out of scope.",
      "",
      "## Coverage Map",
    ].join("\n");

    const parked = parseParkedSection(content);
    expect(parked).toEqual([
      { title: "Pattern 6", reason: "already codified elsewhere." },
      { title: "FEEDBACK.md", reason: "not created, out of scope." },
    ]);
  });

  it("parses the three-column table shape (Become Current style)", () => {
    const content = [
      "## Parked — Needs Operator",
      "",
      "| Item | Source | Exactly what's needed from you |",
      "|---|---|---|",
      "| EF-18 / spell-intake | TODO.md:36 | A genuine independent batch-002 submission. |",
      "| Naming reword | TODO.md:156 | Approve or veto in one word. |",
      "",
      "## Coverage Map",
    ].join("\n");

    const parked = parseParkedSection(content);
    expect(parked).toEqual([
      { title: "EF-18 / spell-intake", reason: "A genuine independent batch-002 submission." },
      { title: "Naming reword", reason: "Approve or veto in one word." },
    ]);
  });

  it("returns an empty array when there is no Parked section", () => {
    expect(parseParkedSection("# Nothing here\n")).toEqual([]);
  });
});

describe("show-report plan-parser: computeCoverageOutcome", () => {
  it("counts total rows and Parked-marked rows across a Coverage Map table", () => {
    const content = [
      "## Coverage Map (every pattern/gap ID → disposition)",
      "",
      "| ID | Item | → |",
      "|---|---|---|",
      "| P1 | Something | LH-05 |",
      "| P2 | Something else | **Park** — codified |",
      "| P3 | A third thing | LH-07 |",
    ].join("\n");

    expect(computeCoverageOutcome(content)).toBe(
      "3 of 3 items dispositioned — 2 routed to an epic, 1 parked",
    );
  });

  it("returns undefined when there is no Coverage Map section", () => {
    expect(computeCoverageOutcome("# Nothing here\n")).toBeUndefined();
  });
});

describe("show-report queue-parser: parseOperatorQueue", () => {
  const content = [
    "# Operator Queue",
    "",
    "## Q-001 — Merge SR-00",
    "",
    "- **What:** Merge the activation PR.",
    "- **Why:** This merge is the grant.",
    "- **Status:** [ ] open",
    "",
    "## Q-002 — Accept ARC-042",
    "",
    "- **What:** Decide on the ADR.",
    "- **Why:** Accepting an ADR is never delegated.",
    "- **Status:** [x] done 2026-09-03 — [ARC-042](https://example.invalid/DECISIONS.md#arc-042) accepted.",
  ].join("\n");

  it("parses both open and done entries with their Why field", () => {
    const entries = parseOperatorQueue(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ id: "Q-001", title: "Merge SR-00", done: false, why: "This merge is the grant." });
    expect(entries[1]).toMatchObject({ id: "Q-002", title: "Accept ARC-042", done: true });
  });

  it("extracts an href from the first link found in a done entry's status line", () => {
    const entries = parseOperatorQueue(content);
    expect(entries[1]!.href).toBe("https://example.invalid/DECISIONS.md#arc-042");
  });

  it("defaults to not-done and no Why/href when a section is missing those fields entirely", () => {
    const bareContent = ["## Q-003 — Bare entry", "", "- **What:** Something, no Status/Why line at all."].join(
      "\n",
    );
    const entries = parseOperatorQueue(bareContent);
    expect(entries).toEqual([{ id: "Q-003", title: "Bare entry", done: false, why: null, href: undefined }]);
  });
});

describe("show-report ledger-parser: parseVerificationLedgerSection", () => {
  const content = [
    "# Verification Ledger",
    "",
    "## 2026-09-02 — Become Current corrections (2026-08-31 → 2026-09-02)",
    "",
    "| Claim | Verification method | Result | Correction |",
    "| --- | --- | --- | --- |",
    "| README counts | ls counts | corrected | 41 spells, not 38. |",
    "| PRs all merged | gh pr list | confirmed | — |",
    "",
    "## 2026-09-02 — Lessons Hardening corrections (LH-02 → LH-12)",
    "",
    "| Claim | Verification method | Result | Correction |",
    "| --- | --- | --- | --- |",
    "| Ledger row count | manual recount | unverifiable | Could not settle definitively. |",
  ].join("\n");

  it("only matches sections whose heading contains the given program name (case-insensitive)", () => {
    const rows = parseVerificationLedgerSection(content, "become current");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.result).sort()).toEqual(["confirmed", "corrected"]);
  });

  it("parses each program's section independently", () => {
    const rows = parseVerificationLedgerSection(content, "Lessons Hardening");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ result: "unverifiable", claim: "Ledger row count" });
  });

  it("strips markdown formatting from claim/correction text", () => {
    const rows = parseVerificationLedgerSection(content, "Become Current");
    const corrected = rows.find((r) => r.result === "corrected");
    expect(corrected!.correction).toBe("41 spells, not 38.");
  });

  it("returns an empty array when no section matches the program name", () => {
    expect(parseVerificationLedgerSection(content, "Show Report")).toEqual([]);
  });
});

describe("show-report decisions-parser", () => {
  const decisions = [
    "## ARC-029 — Best-Practice-First Standard",
    "",
    "**Date:** 2026-08-31",
    "**Status:** Accepted",
    "",
    "## ARC-030 — Something Else",
    "",
    "**Date:** 2026-08-15",
    "**Status:** Accepted",
    "",
    "## ARC-031 — A Proposed One",
    "",
    "**Date:** 2026-09-01",
    "**Status:** Proposed",
    "",
    "## ARC-032 — Accepted With Parenthetical Detail",
    "",
    "**Date:** 2026-09-01",
    "**Status:** Accepted (2026-09-02, operator accept call -- see OPERATOR-QUEUE.md Q-006)",
  ].join("\n");

  it("parses every ADR's id, date, and leading status word (ignoring a parenthetical after it)", () => {
    const adrs = parseAdrs(decisions);
    expect(adrs).toEqual([
      { id: "ARC-029", date: "2026-08-31", status: "Accepted" },
      { id: "ARC-030", date: "2026-08-15", status: "Accepted" },
      { id: "ARC-031", date: "2026-09-01", status: "Proposed" },
      { id: "ARC-032", date: "2026-09-01", status: "Accepted" },
    ]);
  });

  it("counts only Accepted ADRs whose Date falls within the given inclusive window", () => {
    const adrs = parseAdrs(decisions);
    // Window covers ARC-029 and ARC-031/032's dates but not ARC-030's (2026-08-15, before the window).
    // ARC-031 is Proposed, not Accepted, so only ARC-029 and ARC-032 count.
    expect(countAcceptedAdrsInWindow(adrs, "2026-08-30", "2026-09-01")).toBe(2);
  });

  it("treats the window bounds as inclusive on both ends", () => {
    const adrs = parseAdrs(decisions);
    expect(countAcceptedAdrsInWindow(adrs, "2026-08-31", "2026-08-31")).toBe(1); // ARC-029 exactly on the start bound
  });

  it("returns 0 for an empty ADR list", () => {
    expect(countAcceptedAdrsInWindow([], "2026-01-01", "2026-12-31")).toBe(0);
  });
});
