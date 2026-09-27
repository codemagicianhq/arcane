import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// UP02-D-01 / ARC-051 decisions 1-3 and 5 (#277). Reads the shipped
// governance directory directly, with its own parsing, so it checks the
// assets independently of src/modules/placeholders.ts.

const GOVERNANCE_DIR = resolve(__dirname, "../src/assets/.arcane/governance");
const STANDARD = "spell-authoring-standards.md";
const START = "<!-- runtime-placeholders:start -->";
const END = "<!-- runtime-placeholders:end -->";

/** The convention's own name, written as an example in the standard itself. Not a placeholder. */
const CONVENTION_NAME = "{UPPER_SNAKE}";

function read(file: string): string {
  return readFileSync(join(GOVERNANCE_DIR, file), "utf8");
}

function status(content: string): string | null {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!frontmatter) return null;
  return /^status:\s*(\S+)/m.exec(frontmatter[1]!)?.[1] ?? null;
}

function listedTokens(): string[] {
  const content = read(STANDARD);
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  expect(start, "runtime-placeholders:start marker").toBeGreaterThan(-1);
  expect(end, "runtime-placeholders:end marker").toBeGreaterThan(start);
  const region = content.slice(start + START.length, end);
  return [...region.matchAll(/^- `(\{[A-Z0-9_]+\})` — \S/gm)].map((m) => m[1]!);
}

/** Every `{UPPER_SNAKE}` token in the whole file, code included: the strictest reading of the AC. */
function rawTokens(content: string): Set<string> {
  return new Set([...content.matchAll(/(?<!\$)\{[A-Z][A-Z0-9_]*\}/g)].map((m) => m[0]));
}

const docs = readdirSync(GOVERNANCE_DIR).filter((f) => f.endsWith(".md")).sort();

describe("runtime placeholder list (UP02-D-01, ARC-051)", () => {
  it("is present, non-empty, one well-formed item per token, sorted and without duplicates", () => {
    const tokens = listedTokens();
    expect(tokens.length).toBeGreaterThan(0);
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens).toEqual([...tokens].sort());
    // Every non-blank line between the markers is a list item the parser accepts.
    const content = read(STANDARD);
    const region = content.slice(content.indexOf(START) + START.length, content.indexOf(END));
    const lines = region.split(/\r?\n/).filter((l) => l.trim() !== "");
    expect(lines.length).toBe(tokens.length);
  });

  it("covers every token in every shipped status: active governance doc (code included)", () => {
    const listed = new Set(listedTokens());
    const uncovered: string[] = [];
    for (const doc of docs) {
      const content = read(doc);
      if (status(content) !== "active") continue;
      for (const token of rawTokens(content)) {
        if (doc === STANDARD && token === CONVENTION_NAME) continue;
        if (!listed.has(token)) uncovered.push(`${doc}: ${token}`);
      }
    }
    expect(uncovered).toEqual([]);
  });

  it("also covers the tokens in shipped draft docs, so promoting one to active stays clean", () => {
    const listed = new Set(listedTokens());
    const uncovered: string[] = [];
    for (const doc of docs) {
      const content = read(doc);
      if (status(content) !== "draft") continue;
      for (const token of rawTokens(content)) if (!listed.has(token)) uncovered.push(`${doc}: ${token}`);
    }
    expect(uncovered).toEqual([]);
  });

  it("lists no token that no shipped governance doc uses", () => {
    const used = new Set<string>();
    for (const doc of docs) for (const token of rawTokens(read(doc))) used.add(token);
    expect(listedTokens().filter((t) => !used.has(t))).toEqual([]);
  });

  it("re-statuses the self-described fill-in templates to status: template", () => {
    for (const doc of ["agent-approved-paths.md", "naming-conventions.md"]) {
      const content = read(doc);
      expect(status(content), doc).toBe("template");
      // The body still says why: it describes itself as a template to fill in.
      expect(content, doc).toMatch(/This is a \*\*template\*\*/);
    }
  });

  it("uses only the known status values across shipped governance docs", () => {
    const seen = new Set(docs.map((doc) => status(read(doc))));
    for (const value of seen) expect(["active", "draft", "template"]).toContain(value);
  });
});
