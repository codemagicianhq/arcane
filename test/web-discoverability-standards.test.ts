import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");
const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");

let standards: string;
let spell: string;

beforeAll(async () => {
  [standards, spell] = await Promise.all([
    readFile(join(GOVERNANCE, "web-discoverability-standards.md"), "utf8"),
    readFile(join(PROMPTS, "spell-make-discoverable.prompt.md"), "utf8"),
  ]);
});

function phase2Table(source: string): string {
  const start = source.indexOf("## Phase 2 — Audit");
  const end = source.indexOf("## Phase 3 — Propose");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function lineCiting(table: string, id: string): string | undefined {
  return table.split("\n").find((line) => line.includes(`\`${id}\``));
}

describe("spell-make-discoverable Phase 2 vs web-discoverability-standards.md: row-to-rule correctness (bug fix)", () => {
  it("WD-03's Phase 2 row tests dead/non-public routes returning a real 404/410, not canonical-tag uniqueness", () => {
    const wd03Line = lineCiting(phase2Table(spell), "WD-03");
    expect(wd03Line, "no Phase 2 row cites WD-03").toBeDefined();
    expect(wd03Line).toMatch(/404/);
    expect(wd03Line).toMatch(/410/);
    expect(wd03Line).not.toMatch(/rel="canonical"/);
  });

  it("WD-08's Phase 2 row tests robots.txt allow/disallow specificity, not a non-prod noindex signal", () => {
    const wd08Line = lineCiting(phase2Table(spell), "WD-08");
    expect(wd08Line, "no Phase 2 row cites WD-08").toBeDefined();
    expect(wd08Line).toMatch(/Allow:/);
    expect(wd08Line).toMatch(/Disallow:/);
    expect(wd08Line).not.toMatch(/suppression signal present/);
  });

  it("WD-03 and WD-08 are declared structured spell gate (ARC-023) in the governance doc, now that Phase 2 really tests them", () => {
    for (const id of ["WD-03", "WD-08"]) {
      const idIndex = standards.indexOf(`### ${id}`);
      expect(idIndex, `${id} heading not found`).toBeGreaterThan(-1);
      const ruleBlock = standards.slice(idIndex, idIndex + 700);
      expect(ruleBlock, `${id}'s rule block`).toContain("Enforcement: structured spell gate (ARC-023)");
    }
  });

  it("the 6 rules with no achievable Phase 2 check are no longer cited on a row that tests something else", () => {
    const table = phase2Table(spell);
    const mismatches = [
      { id: "WD-02", keyword: "og:title" },
      { id: "WD-04", keyword: "ld+json" },
      { id: "WD-05", keyword: "robots.txt` directly" },
      { id: "WD-06", keyword: "Sitemap:` directive" },
      { id: "WD-14", keyword: "{RESTRICTED_PREFIX}" },
      { id: "WD-15", keyword: "share-image URL" },
    ];
    for (const { id, keyword } of mismatches) {
      const offendingLine = table
        .split("\n")
        .find((line) => line.includes(`\`${id}\``) && line.includes(keyword));
      expect(offendingLine, `${id} is still mislabeled onto the "${keyword}" row`).toBeUndefined();
    }
  });

  it("every WD-nn ID cited in the Phase 2 table exists in the governance doc's rule index (no dangling citation)", () => {
    const citedIds = [...phase2Table(spell).matchAll(/`(WD-\d\d)`/g)].map((m) => m[1]);
    expect(citedIds.length).toBeGreaterThan(0);
    for (const id of citedIds) {
      expect(standards).toContain(`| ${id} |`);
    }
  });

  it("the governance doc's Enforcement sentence for each still-advisory mismatched rule discloses that Phase 2 no longer cites it", () => {
    for (const id of ["WD-02", "WD-04", "WD-05", "WD-06", "WD-14", "WD-15"]) {
      const idIndex = standards.indexOf(`### ${id}`);
      expect(idIndex, `${id} heading not found`).toBeGreaterThan(-1);
      const ruleBlock = standards.slice(idIndex, idIndex + 1200);
      expect(ruleBlock).toContain("explicitly advisory (ARC-023)");
      expect(ruleBlock).toContain("no longer cites");
    }
  });
});
