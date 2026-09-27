import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP03-B-04 (#275, PRD D-08 / R-275): `spell-todo --sweep` lists Lessons
// Learned headings from the hub's own journal since the last sweep (or
// --since) that nothing references. AC: report-only; reads headings, not
// bold sentences; hub-local scope stated.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");

let todo: string;
let closeSession: string;
let lessons: string;

beforeAll(async () => {
  [todo, closeSession] = await Promise.all([
    readFile(join(SPELLS, "spell-todo.md"), "utf8"),
    readFile(join(SPELLS, "spell-close-session.md"), "utf8"),
  ]);
  const start = todo.indexOf("### Unrouted lessons (part of every `--sweep`)");
  const end = todo.indexOf("### Idea validation (`--sweep --validate`, opt-in)");
  expect(start, "missing Unrouted lessons section").toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  lessons = todo.slice(start, end);
});

describe("UP03-B-04: the lessons pass is part of Sweep Mode (#275)", () => {
  it("sits inside Sweep Mode, before Prune Mode", () => {
    const sweepIdx = todo.indexOf("## Sweep Mode (`--sweep`)");
    const lessonsIdx = todo.indexOf("### Unrouted lessons");
    const pruneIdx = todo.indexOf("## Prune Mode (`--prune`)");
    expect(sweepIdx).toBeLessThan(lessonsIdx);
    expect(lessonsIdx).toBeLessThan(pruneIdx);
  });

  it("supports --since and states the window it used", () => {
    expect(lessons).toContain("journal entries dated on or after `--since YYYY-MM-DD`");
    expect(lessons).toContain("to cover \"since the last sweep\", pass that sweep's date as `--since`");
    expect(lessons).toContain("The output header states the window used.");
  });
});

describe("UP03-B-04: report-only", () => {
  it("states report-only with no writes and no network", () => {
    expect(lessons).toContain("This pass is report-only, like the rest of the sweep: no writes, no moves, no filing, and no network calls.");
  });

  it("points at the promoting spells instead of promoting", () => {
    expect(lessons).toContain("Promote with spell-feedback (framework), spell-save-idea (product idea), or spell-todo (task).");
  });
});

describe("UP03-B-04: reads headings, not bold sentences", () => {
  it("the close-session template really writes one heading per lesson", () => {
    expect(closeSession).toContain("`### Lessons Learned` — one heading per lesson");
  });

  it("harvests the headings under ### Lessons Learned", () => {
    expect(lessons).toContain("each heading directly under a `### Lessons Learned` section");
    expect(lessons).toContain("The pass reads headings only.");
  });

  it("does not read bold sentences or bullets as lessons", () => {
    expect(lessons).toContain("**Bold sentences and bullet items are not read as lessons.**");
  });

  it("reports a heading-less Lessons Learned section instead of skipping it silently", () => {
    expect(lessons).toContain("Lessons Learned has no per-lesson headings — not harvested");
  });
});

describe("UP03-B-04: unrouted means nothing references it", () => {
  it("names every kind of reference that routes a lesson", () => {
    expect(lessons).toContain("a `FEEDBACK.md` item");
    expect(lessons).toContain("an idea-book entry or a TODO item");
    expect(lessons).toContain("an issue link in the lesson's own body");
  });

  it("references lane C's close-session routing step by name only", () => {
    expect(lessons).toContain("`spell-close-session`'s Lessons Learned routing step (#274)");
  });
});

describe("UP03-B-04: hub-local scope", () => {
  it("reads only this repository's own journal, never a consumer clone's", () => {
    expect(lessons).toContain("the hub's own `journal/` only");
    expect(lessons).toContain("Never a consumer clone's journal.");
    expect(lessons).toContain("within the hub-local scope above");
  });

  it("the Sweep Mode scope statement covers the hub's own journal (D-08)", () => {
    expect(todo).toContain("**Sweep scope is hub-local (PRD D-08).**");
    expect(todo).toContain("and the hub's own `journal/`");
  });

  it("adds no {BUSINESS_ROOT} occurrence (the shared test pins the count at 6)", () => {
    expect(lessons).not.toContain("{BUSINESS_ROOT}");
    expect((todo.match(/\{BUSINESS_ROOT\}/g) ?? []).length).toBe(6);
  });
});
