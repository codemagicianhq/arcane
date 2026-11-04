import { describe, it, expect, afterEach } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectDecisions, headingAnchor, parseDecisions } from "../src/modules/state/decisions.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const fixtures: string[] = [];
afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

describe("headingAnchor", () => {
  it("builds GitHub's anchor: lowercase, punctuation dropped, spaces to hyphens, an em dash leaving a double hyphen", () => {
    expect(headingAnchor("ARC-044 — Client Architecture: Files-First State Contract and a Local Presence Channel")).toBe(
      "arc-044--client-architecture-files-first-state-contract-and-a-local-presence-channel",
    );
    expect(headingAnchor("ARC-001 — Framework / Operations Separation")).toBe("arc-001--framework--operations-separation");
    expect(headingAnchor("ADR-007 — `spell` on Windows")).toBe("adr-007--spell-on-windows");
    expect(headingAnchor("ARC-032 — Persisted: `tracking_mode` in the Manifest")).toBe("arc-032--persisted-tracking_mode-in-the-manifest");
  });
});

describe("parseDecisions (ST-05, D5)", () => {
  const ops = [
    "# Decisions",
    "",
    "## ADR-001 — Geothermal survey cadence",
    "",
    "**Date:** 2026-10-01",
    "**Status:** Accepted (operator, 2026-10-02)",
    "",
    "## ADR-002: Tidal repair fleet sizing",
    "",
    "**Date:** 2026-10-05",
    "**Status:** Proposed",
    "",
    "## ADR-003 — A heading with nothing parseable under it",
    "",
    "Just prose, no Date or Status line.",
    "",
    "## ADR-010 — Orbital assembly tooling",
    "",
    "**Status:** Superseded by [ADR-011](#adr-011)",
  ].join("\r\n");

  it("parses ADR- entries with any id prefix, CRLF-safe, keeping the leading status word only", () => {
    const { entries, warnings } = parseDecisions(ops);
    expect(entries).toEqual([
      { id: "ADR-001", title: "Geothermal survey cadence", status: "Accepted", date: "2026-10-01", anchor: "adr-001--geothermal-survey-cadence" },
      { id: "ADR-002", title: "Tidal repair fleet sizing", status: "Proposed", date: "2026-10-05", anchor: "adr-002-tidal-repair-fleet-sizing" },
      { id: "ADR-010", title: "Orbital assembly tooling", status: "Superseded", date: null, anchor: "adr-010--orbital-assembly-tooling" },
    ]);
    expect(warnings).toEqual(["indexes.decisions: ADR-003 has no **Date:** or **Status:** line and was skipped"]);
  });

  it("parses DMC- entries too", () => {
    const { entries } = parseDecisions("## DMC-101 — Cockpit gateway\n\n**Date:** 2026-11-01\n**Status:** Accepted\n");
    expect(entries.map((e) => e.id)).toEqual(["DMC-101"]);
  });

  it("ignores headings that are not decision ids", () => {
    const { entries } = parseDecisions("## Table of Contents\n\n## ARC-001 — One\n\n**Date:** 2026-01-01\n**Status:** Accepted\n\n## Cross-Reference Index\n");
    expect(entries.map((e) => e.id)).toEqual(["ARC-001"]);
  });
});

describe("collectDecisions", () => {
  it("parses this repository's DECISIONS.md to the entry count and anchors its table of contents lists", async () => {
    const content = await readFile(join(ROOT, "DECISIONS.md"), "utf8");
    const tocRows = [...content.matchAll(/^\| \[([A-Z]+-\d{3,})\]\(#([^)]+)\)/gm)].map((m) => ({ id: m[1], anchor: m[2] }));
    expect(tocRows.length).toBeGreaterThan(0);
    const { decisions, warnings } = await collectDecisions(ROOT);
    expect(warnings).toEqual([]);
    expect(decisions).not.toBeNull();
    expect(decisions!.length).toBe(tocRows.length);
    const byId = new Map(decisions!.map((d) => [d.id, d]));
    for (const row of tocRows) {
      expect(byId.get(row.id)?.anchor, row.id).toBe(row.anchor);
    }
    // Sorted by id, every entry has a status and a date.
    expect(decisions!.map((d) => d.id)).toEqual([...decisions!.map((d) => d.id)].sort());
    expect(decisions!.every((d) => d.status !== null && d.date !== null)).toBe(true);
  });

  it("returns null, not an error, when DECISIONS.md is absent", async () => {
    const dir = await createFixtureDir("state-decisions-absent");
    fixtures.push(dir);
    expect(await collectDecisions(dir)).toEqual({ decisions: null, warnings: [] });
  });

  it("sorts entries by id and carries parse warnings", async () => {
    const dir = await createFixtureDir("state-decisions-sorted");
    fixtures.push(dir);
    await writeFile(
      join(dir, "DECISIONS.md"),
      "## ADR-002 — Two\n\n**Date:** 2026-01-02\n**Status:** Accepted\n\n## ADR-001 — One\n\n**Date:** 2026-01-01\n**Status:** Accepted\n\n## ADR-003 — Empty\n\nnothing\n",
      "utf8",
    );
    const { decisions, warnings } = await collectDecisions(dir);
    expect(decisions!.map((d) => d.id)).toEqual(["ADR-001", "ADR-002"]);
    expect(warnings).toHaveLength(1);
  });
});
