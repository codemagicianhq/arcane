import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// UP02-D-04 (#277, ARC-051): spell-check-drift reports `spell doctor`'s
// placeholder findings instead of re-implementing the scan.

const ROOT = resolve(__dirname, "..");
const CANONICAL = resolve(ROOT, "src/assets/.arcane/spells/spell-check-drift.md");
const ROOT_COPY = resolve(ROOT, ".arcane/spells/spell-check-drift.md");

function detectorLine(content: string): string | undefined {
  return content.split(/\r?\n/).find((line) => line.startsWith("- **Unfilled governance placeholders** (ARC-051)"));
}

describe("spell-check-drift placeholder detector (UP02-D-04)", () => {
  it("lists the detector among the concrete detectors, pointing at spell doctor", () => {
    const content = readFileSync(CANONICAL, "utf8");
    const line = detectorLine(content);
    expect(line).toBeDefined();
    expect(line).toContain("`spell doctor` owns this check");
    expect(line).toContain('"Governance placeholders (ARC-051)"');
    expect(line).toContain("do not re-implement the scan here");
    expect(line).toContain("`status: template`");
    // It sits inside the "Concrete detectors to run" list, before the per-finding fields.
    const detectors = content.indexOf("Concrete detectors to run");
    const perFinding = content.indexOf("For each drift finding include:");
    const at = content.indexOf(line!);
    expect(at).toBeGreaterThan(detectors);
    expect(at).toBeLessThan(perFinding);
  });

  it("names the check exactly as spell doctor prints it", () => {
    const doctor = readFileSync(resolve(ROOT, "src/commands/doctor.ts"), "utf8");
    expect(doctor).toContain('const name = "Governance placeholders (ARC-051)";');
  });

  it("ships the same text in the self-hosted root copy", () => {
    expect(detectorLine(readFileSync(ROOT_COPY, "utf8"))).toBe(detectorLine(readFileSync(CANONICAL, "utf8")));
  });
});
