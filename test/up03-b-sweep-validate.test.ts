import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP03-B-03 (#263, PRD D-08 / R-263): opt-in `spell-todo --sweep --validate`
// asks value / fit / duplicate-of per idea entry and writes the answers into
// the entry's status comment only after one batch confirmation. The
// status-comment grammar is extended backward-compatibly and spell-manifest
// Step 1's parser changes in the same story, so both forms parse (an
// unparseable comment sends an entry to Skipped). The sweep stays hub-local.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");

let todo: string;
let manifest: string;
let saveIdea: string;
let validate: string;
let step1: string;

function between(text: string, start: string, end: string): string {
  const s = text.indexOf(start);
  const e = text.indexOf(end, s + start.length);
  expect(s, `missing: ${start}`).toBeGreaterThan(-1);
  expect(e, `missing: ${end}`).toBeGreaterThan(s);
  return text.slice(s, e);
}

// A reference implementation of the rules spell-manifest Step 1 states, used
// to check that every status-comment sample the spells ship actually parses
// under them -- old and new forms alike.
type Parsed = { status: string; fields: Record<string, string> } | null;
function parseStatusComment(comment: string): Parsed {
  const m = /^<!--\s*(status:.*?)\s*-->$/.exec(comment.trim());
  if (!m) return null;
  const segments = m[1]!.split(/; (?=[a-z]+: )/);
  const [first, ...rest] = segments;
  const fields: Record<string, string> = {};
  for (const seg of rest) {
    const idx = seg.indexOf(": ");
    fields[seg.slice(0, idx)] = seg.slice(idx + 2);
  }
  return { status: first!.replace(/^status:\s*/, ""), fields };
}
function isNew(comment: string): boolean {
  return parseStatusComment(comment)?.status === "new";
}

beforeAll(async () => {
  [todo, manifest, saveIdea] = await Promise.all([
    readFile(join(SPELLS, "spell-todo.md"), "utf8"),
    readFile(join(SPELLS, "spell-manifest.md"), "utf8"),
    readFile(join(SPELLS, "spell-save-idea.md"), "utf8"),
  ]);
  validate = between(todo, "### Idea validation (`--sweep --validate`, opt-in)", "## Prune Mode (`--prune`)");
  step1 = between(manifest, "## Step 1 — Collect", "## Step 2 — List");
});

describe("UP03-B-03: --validate is opt-in and asks value / fit / dup (#263)", () => {
  it("the plain sweep still never edits", () => {
    expect(validate).toContain("Without `--validate`, the sweep never edits anything.");
    expect(todo).toContain("Report-only — no edits (the one exception is the opt-in `--validate` below).");
  });

  it("asks the three questions per entry", () => {
    expect(validate).toContain("`value` — Is this valuable");
    expect(validate).toContain("`fit` — Does it belong here");
    expect(validate).toContain("`dup` — Does it duplicate");
  });

  it("leaves capture untouched", () => {
    expect(validate).toContain("Capture itself (`spell-save-idea`) stays unchanged.");
    expect(saveIdea).toContain("This spell always writes the plain `<!-- status: new -->`.");
  });
});

describe("UP03-B-03: writes only after one batch confirmation", () => {
  it("holds answers in memory while asking", () => {
    expect(validate).toContain("**Nothing is written while the questions are being asked**");
  });

  it("asks once for the whole batch and needs the literal `write`", () => {
    expect(validate).toContain("**One batch confirmation.**");
    expect(validate).toContain("Then ask once: `Write N status comments? (write / cancel)`.");
    expect(validate).toContain("Only the operator's own literal `write` writes.");
    expect(validate).toContain("ordinary conversational assent is not confirmation, and nothing is written");
  });

  it("confirmation precedes writing, and the gate is ARC-023-annotated", () => {
    const confirmIdx = validate.indexOf("**One batch confirmation.**");
    const writeIdx = validate.indexOf("**Write only the status comment.**");
    expect(confirmIdx).toBeGreaterThan(-1);
    expect(confirmIdx).toBeLessThan(writeIdx);
    expect(validate).toContain("**Enforcement: structured spell gate (ARC-023)");
  });

  it("changes only the status comment", () => {
    expect(validate).toContain("The entry text, timestamp and tag stay untouched");
  });
});

describe("UP03-B-03: the sweep scope is hub-local (D-08)", () => {
  it("states the hub-local scope and names D-08", () => {
    expect(todo).toContain("**Sweep scope is hub-local (PRD D-08).**");
    expect(todo).toContain("the hub's TODO books, the hub's IDEAS books, and the hub's own `journal/`");
  });

  it("never reads consumer clones", () => {
    expect(todo).toContain("**It never reads a consumer repo's clone — not even a registered clone on this machine.**");
  });

  it("validation candidates stay inside that scope", () => {
    expect(validate).toContain("within the hub-local scope above");
  });
});

describe("UP03-B-03: spell-manifest Step 1 parses old and new grammar", () => {
  it("documents the grammar in Step 1, in the same story", () => {
    expect(step1).toContain("**Status-comment grammar.**");
    expect(step1).toContain("<!-- status: new -->\n<!-- status: new; value: y; fit: y; dup: none -->");
    expect(step1).toContain("Both forms parse");
  });

  it("only the first field decides `new`; unknown fields never Skip an entry", () => {
    expect(step1).toContain("An entry is collected when that field is exactly `status: new`, with or without fields after it.");
    expect(step1).toContain("It never moves the entry to `Skipped`.");
  });

  it("still sends a truly unparseable comment to Skipped", () => {
    expect(step1).toContain("Malformed entries (missing timestamp, unparseable status comment) are listed under a `Skipped` heading");
    expect(step1).toContain("when it does not open with `status:`, is not closed with `-->`, or its first field is not exactly `new`, `promoted …` or `dropped …`");
    expect(step1).toContain("never silently left out of both lists");
  });

  it("spell-todo points at the manifest grammar rather than defining another", () => {
    expect(validate).toContain("`spell-manifest`'s Step 1 \"Status-comment grammar\"");
  });

  it("carries validation fields over when an entry is marked", () => {
    const step6 = between(manifest, "## Step 6 — Execute", "## Step 7 — Leak Scan");
    expect(step6).toContain("Validation fields already in an entry's comment (Step 1's grammar) are kept after the new first field");
  });
});

describe("UP03-B-03: every shipped status-comment sample parses under the stated rules", () => {
  const OLD = "<!-- status: new -->";
  const NEW = "<!-- status: new; value: y; fit: y; dup: none -->";

  it("old form parses as new with no fields", () => {
    expect(parseStatusComment(OLD)).toEqual({ status: "new", fields: {} });
  });

  it("new form parses as new with value / fit / dup", () => {
    expect(parseStatusComment(NEW)).toEqual({ status: "new", fields: { value: "y", fit: "y", dup: "none" } });
    expect(isNew(NEW)).toBe(true);
  });

  it("a drop reason containing '; ' stays in the status field", () => {
    const parsed = parseStatusComment("<!-- status: dropped 2026-09-27 (too big; revisit) -->");
    expect(parsed?.status).toBe("dropped 2026-09-27 (too big; revisit)");
    expect(parsed?.fields).toEqual({});
  });

  it("a marked entry with carried-over fields is not new", () => {
    expect(isNew("<!-- status: dropped 2026-09-27; value: n; fit: y; dup: none -->")).toBe(false);
    expect(isNew("<!-- status: promoted → repo:ordovica/IDEAS.md 2026-09-27; value: y -->")).toBe(false);
  });

  it("a comment without a status field is unparseable", () => {
    expect(parseStatusComment("<!-- value: y -->")).toBeNull();
    expect(parseStatusComment("<!-- status: new")).toBeNull();
  });

  it("every concrete status comment in the three spells parses", () => {
    // Placeholder templates like `promoted → <dest>` contain `<`/`>` and are
    // excluded; every concrete sample (old form, new form, carried-over) is in.
    const samples = [todo, manifest, saveIdea].flatMap((text) => text.match(/<!-- status: [^<>]*?-->/g) ?? []);
    expect(samples).toContain("<!-- status: new -->");
    expect(samples).toContain("<!-- status: new; value: y; fit: y; dup: none -->");
    for (const sample of samples) {
      expect(parseStatusComment(sample), sample).not.toBeNull();
    }
  });
});
