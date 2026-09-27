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
  });
});

describe("UP03-B-02: report-first", () => {
  it("reports every candidate and proposed migration before any edit", () => {
    expect(prune).toContain("**Report first — no edits yet.**");
    const reportIdx = prune.indexOf("**Report first — no edits yet.**");
    const approvalIdx = prune.indexOf("**One batch approval, fingerprinted.**");
    const deleteIdx = prune.indexOf("**Migrate, then delete.**");
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
      "Compute an approval fingerprint from the exact deletion list (book path, line, full item text for every item to delete) plus the exact migration text.",
    );
  });

  it("uses one approval for the whole batch, never per item", () => {
    expect(prune).toContain("One approval covers the whole batch; there are no per-item prompts.");
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
    expect(prune).toContain("**Migrate, then delete.** Write every migration first and confirm each one landed.");
    expect(prune).toContain("An item whose migration failed stays in the book.");
  });

  it("never invents an outcome", () => {
    expect(prune).toContain("never invent an outcome");
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
