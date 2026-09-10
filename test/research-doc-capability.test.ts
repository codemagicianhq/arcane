import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");
const PROMPTS = join(process.cwd(), "src", "assets", ".arcane", "spells");

let portableBootstrap: string;
let spellDocument: string;
let spellTodo: string;
let spellCloseSession: string;

beforeAll(async () => {
  [portableBootstrap, spellDocument, spellTodo, spellCloseSession] = await Promise.all([
    readFile(join(GOVERNANCE, "portable-bootstrap.md"), "utf8"),
    readFile(join(PROMPTS, "spell-document.md"), "utf8"),
    readFile(join(PROMPTS, "spell-todo.md"), "utf8"),
    readFile(join(PROMPTS, "spell-close-session.md"), "utf8"),
  ]);
});

describe("portable-bootstrap.md: Research Reports convention (T25/BC-24)", () => {
  it("declares the canonical location", () => {
    expect(portableBootstrap).toContain("## Research Reports");
    expect(portableBootstrap).toContain("`docs/research/<topic-slug>.md`");
  });

  it("names spell-document as the producing mechanism, not a new spell", () => {
    expect(portableBootstrap).toContain("No dedicated spell produces these");
    expect(portableBootstrap).toContain("`spell-document` already proposes a target path");
  });

  it("requires a sources field and the verified/inferred/speculative distinction", () => {
    expect(portableBootstrap).toContain("`sources` — a list of what was consulted");
    expect(portableBootstrap).toContain("**verified facts**, **reasonable inferences**, and **speculation**");
  });

  it("directs report follow-ups through spell-todo", () => {
    expect(portableBootstrap).toContain("route those via `spell-todo`, which cross-references the report path");
  });
});

describe("spell-document.md: research report as a named document type (T25/BC-24)", () => {
  it("lists research report among document types", () => {
    expect(spellDocument).toContain("analysis report, research report, inventory, or guide");
  });

  it("defaults a research report's target path to docs/research/", () => {
    expect(spellDocument).toContain("default to `docs/research/<topic-slug>.md`");
  });
});

describe("spell-todo.md: routes research-report findings (T25/BC-24)", () => {
  it("has a routing-table row for a finding sourced from a research report", () => {
    expect(spellTodo).toContain("Finding sourced from a research report");
    expect(spellTodo).toContain("see docs/research/<slug>.md");
  });
});

describe("spell-close-session.md: capture tie-in names research findings (T25/BC-24)", () => {
  it("extends the existing tie-in tip rather than adding a competing one", () => {
    expect(spellCloseSession).toContain("a design, an investigation, a research finding, a reusable explanation");
    expect(spellCloseSession).toContain("Research Reports convention");
  });
});
