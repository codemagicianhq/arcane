import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP03-B-02 (#268, PRD R-268): `spell-todo --prune` deletes resolved items
// only after verifying each outcome is recorded durably. AC: report-first,
// one batch approval (fingerprinted like spell-commit-work step 8), an
// unrecorded outcome is migrated before deletion, and an unchecked item is
// never deleted.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");

let todo: string;
let prune: string;
let commitWork: string;

beforeAll(async () => {
  [todo, commitWork] = await Promise.all([
    readFile(join(SPELLS, "spell-todo.md"), "utf8"),
    readFile(join(SPELLS, "spell-commit-work.md"), "utf8"),
  ]);
  const start = todo.indexOf("## Prune Mode (`--prune`)");
  const end = todo.indexOf("## Step 0 — Venture Targeting (Hub Only)");
  expect(start, "missing Prune Mode section").toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  prune = todo.slice(start, end);
});

describe("UP03-B-02: --prune is a documented mode of spell-todo (#268)", () => {
  it("is a separate mode that skips elaboration, like --sweep", () => {
    expect(prune).toContain("If the argument is (or starts with) `--prune`, skip every other step");
  });

  it("is distinguished from `spell update --prune`", () => {
    expect(prune).toContain("Not to be confused with `spell update --prune`");
  });

  it("is named in the Executive Summary", () => {
    const summary = todo.slice(todo.indexOf("## Executive Summary"), todo.indexOf("## Sweep Mode"));
    expect(summary).toContain("`--prune` removes checked items");
    expect(summary).toContain("append-only done book (`DONE.md` by default; `todo_done_book: false`");
  });
});

describe("UP03-B-02: report-first", () => {
  it("reports every candidate and proposed migration before any edit", () => {
    expect(prune).toContain("**Report first — no edits yet.**");
    const reportIdx = prune.indexOf("**Report first — no edits yet.**");
    const approvalIdx = prune.indexOf("**One batch approval, fingerprinted.**");
    const deleteIdx = prune.indexOf("**Migrate, move, then delete.**");
    expect(reportIdx).toBeGreaterThan(-1);
    expect(reportIdx).toBeLessThan(approvalIdx);
    expect(approvalIdx).toBeLessThan(deleteIdx);
  });
});

describe("UP03-B-02: one batch approval, fingerprinted like spell-commit-work", () => {
  it("names spell-commit-work step 8's gate as the model", () => {
    expect(prune).toContain("the same gate `spell-commit-work` step 8 uses");
    // The reused gate really is fingerprinted in spell-commit-work step 8.
    expect(commitWork).toContain("compute an approval fingerprint from the exact staged diff");
  });

  it("fingerprints the exact deletion list plus migration text", () => {
    expect(prune).toContain(
      "Compute an approval fingerprint from the exact deletion list (book path, line, full item text for every item to delete) plus the exact migration text, plus the done-book path when items move.",
    );
  });

  it("uses one approval for the whole batch, never per item", () => {
    expect(prune).toContain("there are no per-item prompts.");
  });

  it("treats timeout, cancellation, fallback and conversational assent as not approval", () => {
    expect(prune).toContain(
      "A timeout, a cancellation, a host-generated fallback, a delegated response, or ordinary conversational assent is not approval",
    );
  });

  it("recomputes the fingerprint and voids approval on change", () => {
    expect(prune).toContain("Recompute the fingerprint immediately before writing.");
    expect(prune).toContain("the approval is void; ask again");
  });

  it("carries an ARC-023 structured-gate annotation", () => {
    expect(prune).toContain("**Enforcement: structured spell gate (ARC-023)");
  });
});

describe("UP03-B-02: outcome migration before deletion", () => {
  it("checks each candidate for a durable record of its outcome", () => {
    expect(prune).toContain("**Check each outcome is recorded durably.**");
    for (const place of ["`journal/`", "`DECISIONS.md`", "`CHANGELOG.md`", "PR or issue link"]) {
      expect(prune).toContain(place);
    }
  });

  it("migrates an unrecorded outcome and deletes only afterwards", () => {
    expect(prune).toContain("**Migrate, move, then delete.** Write every migration first and confirm each one landed.");
    expect(prune).toContain("An item whose migration or copy failed stays in the TODO book.");
  });

  it("never invents an outcome", () => {
    expect(prune).toContain("never invent an outcome");
  });

  it("fingerprints the done-book path too, inside the one batch approval", () => {
    expect(prune).toContain("plus the done-book path when items move");
    expect(prune).toContain("One approval covers the whole batch, the move to the done book included");
  });

  it("records the deletion per records-conventions and does not commit", () => {
    expect(prune).toContain("(\"Retention and deletion\") requires an approved deletion to be recorded");
    expect(prune).toContain("hand off to `spell-commit-work`");
  });
});

describe("UP03-B-02: an unchecked item is never deleted", () => {
  it("only checked items are candidates", () => {
    expect(prune).toContain("A candidate is a checked item — `- [x]` or `- [X]`");
    expect(prune).toContain(
      "**An unchecked item (`- [ ]`) is never a candidate: it is never deleted, moved or edited by this mode.**",
    );
  });

  it("keeps a checked parent that still has an open sub-item", () => {
    expect(prune).toContain("A checked item with any unchecked sub-item is kept whole");
  });
});

describe("UP03-B-02: existing spell-todo contracts are intact", () => {
  it("adds no {BUSINESS_ROOT} occurrence (the shared test pins the count at 6)", () => {
    expect(prune).not.toContain("{BUSINESS_ROOT}");
  });
});

// #415: --prune moves checked items to a done book by default instead of
// deleting them; `todo_done_book: false` keeps deletion.
describe("#415: the done book", () => {
  let records: string;
  beforeAll(async () => {
    records = await readFile(
      join(process.cwd(), "src", "assets", ".arcane", "governance", "records-conventions.md"),
      "utf8",
    );
  });

  it("defaults to DONE.md beside the TODO book", () => {
    expect(prune).toContain("**Absent:** the done book is `DONE.md`, in the same directory as the target book.");
  });

  it("takes a path from todo_done_book, relative to the TODO book's directory", () => {
    expect(prune).toContain("relative to the target book's directory");
  });

  it("todo_done_book: false keeps deleting", () => {
    expect(prune).toContain("**`false`:** there is no done book. Approved items are deleted, not moved");
    expect(prune).toContain("Delete 3 items (1 after migration).");
  });

  it("reports the move before acting", () => {
    expect(prune).toContain("Move 3 items to DONE.md (1 after migration).");
  });

  it("moves word for word, with continuation lines, under the same heading", () => {
    expect(prune).toContain("**Word for word.** The item line and its continuation lines exactly as they stand");
    expect(prune).toContain("**Under the same heading.**");
    expect(prune).toContain("If the heading is missing, add it, word for word, at the end of the file");
    expect(prune).toContain("**Creating the file when missing.**");
  });

  it("copies before deleting, and confirms the copy", () => {
    const step5 = prune.slice(prune.indexOf("**Migrate, move, then delete.**"), prune.indexOf("6. **Record the move"));
    const copy = step5.indexOf("copy each approved item into the done book");
    const confirm = step5.indexOf("Confirm every copied item is in the done book word for word.");
    const del = step5.indexOf("Then delete exactly the approved lines from the TODO book");
    expect(copy).toBeGreaterThan(-1);
    expect(copy).toBeLessThan(confirm);
    expect(confirm).toBeLessThan(del);
  });

  it("the done book is append-only", () => {
    expect(prune).toContain(
      "**It is append-only: this mode adds lines to it and never edits, reorders or removes a line already in it.**",
    );
  });

  it("the done book does not stand in for the outcome record", () => {
    expect(prune).toContain("The done book does not count as the outcome record");
  });

  it("records-conventions names the done book as the home for completed TODO items", () => {
    const section = records.slice(records.indexOf("## Completed TODO items"), records.indexOf("## Retention and deletion"));
    expect(section).toContain("the **done\nbook**, `DONE.md` beside the TODO book by default");
    expect(section).toContain("**The done book is append-only.");
    expect(section).toContain("`todo_done_book`");
    expect(prune).toContain('`governance/records-conventions.md` ("Completed TODO items")');
  });
});
