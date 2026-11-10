import { describe, it, expect } from "vitest";
import { generateVersionDriftDiagram } from "../src/modules/diagram-generator.js";

describe("generateVersionDriftDiagram", () => {
  it("returns null when all three readings match (applicability guard)", () => {
    expect(generateVersionDriftDiagram("0.22.1", "0.22.1", "0.22.1")).toBeNull();
  });

  it("returns null when npm is older than the installed CLI and files match", () => {
    expect(generateVersionDriftDiagram("1.17.3", "1.17.3", "1.17.2")).toBeNull();
  });

  it("draws only the repo-files branch when only axis A drifts", () => {
    const diagram = generateVersionDriftDiagram("0.14.0", "0.22.1", "0.22.1");
    expect(diagram).toBe(
      [
        "gitGraph",
        '   commit id: "0.14.0"',
        "   branch repo-files",
        "   checkout main",
        '   commit id: "0.22.1" tag: "latest"',
      ].join("\n"),
    );
  });

  it("draws only the installed-cli branch when only axis B drifts", () => {
    const diagram = generateVersionDriftDiagram("0.21.1", "0.21.1", "0.22.1");
    expect(diagram).toBe(
      [
        "gitGraph",
        '   commit id: "0.21.1"',
        "   branch installed-cli",
        "   checkout main",
        '   commit id: "0.22.1" tag: "latest"',
      ].join("\n"),
    );
  });

  it("does not draw installed-cli drift when npm is older than the CLI", () => {
    const diagram = generateVersionDriftDiagram("1.17.0", "1.17.3", "1.17.2");
    expect(diagram).toContain("branch repo-files");
    expect(diagram).not.toContain("branch installed-cli");
  });

  it("draws both branches when both axes drift", () => {
    const diagram = generateVersionDriftDiagram("0.14.0", "0.21.1", "0.22.1");
    expect(diagram).toBe(
      [
        "gitGraph",
        '   commit id: "0.14.0"',
        "   branch repo-files",
        "   checkout main",
        '   commit id: "0.21.1"',
        "   branch installed-cli",
        "   checkout main",
        '   commit id: "0.22.1" tag: "latest"',
      ].join("\n"),
    );
  });

  it("never invents an intermediate version between two known points", () => {
    const diagram = generateVersionDriftDiagram("0.14.0", "0.21.1", "0.22.1")!;
    const commitLines = diagram.split("\n").filter((l) => l.includes("commit id:"));
    expect(commitLines).toHaveLength(3);
    expect(diagram).not.toContain("…");
    expect(diagram).not.toContain("...");
  });

  it("does not fence the output — fencing is the caller's decision (R5)", () => {
    const diagram = generateVersionDriftDiagram("0.14.0", "0.21.1", "0.22.1")!;
    expect(diagram).not.toContain("```");
    expect(diagram).not.toContain(":::mermaid");
  });
});
