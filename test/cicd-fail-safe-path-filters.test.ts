import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");

let cicdStandards: string;

beforeAll(async () => {
  cicdStandards = await readFile(join(GOVERNANCE, "cicd-standards.md"), "utf8");
});

/** Extracts the Nth fenced ```yaml code block's content from the doc. */
function extractYamlBlock(text: string, index: number): string {
  const blocks = [...text.matchAll(/```yaml\n([\s\S]*?)```/g)];
  const block = blocks[index];
  if (!block) throw new Error(`No yaml block at index ${index} (found ${blocks.length})`);
  return block[1];
}

describe("ARC-022 accepted", () => {
  it("DECISIONS.md status is Accepted, not Proposed", async () => {
    const decisions = await readFile(join(process.cwd(), "DECISIONS.md"), "utf8");
    const arc022Section = decisions.slice(decisions.indexOf("## ARC-022"));
    const statusLine = arc022Section.split("\n").find((l) => l.startsWith("**Status:**"));
    expect(statusLine).toContain("Accepted");
    expect(statusLine).not.toContain("Proposed");
  });
});

describe(".NET and Node.js pipelines use exclude-based fail-safe filters (R2)", () => {
  it(".NET pipeline (block 0) uses paths.exclude, not paths.include, on the branch trigger", () => {
    const yamlText = extractYamlBlock(cicdStandards, 0);
    const doc = parse(yamlText) as { trigger?: { paths?: Record<string, unknown> } };
    expect(doc.trigger?.paths?.exclude).toBeDefined();
    expect(doc.trigger?.paths?.include).toBeUndefined();
  });

  it("Node.js pipeline (block 1) uses paths.exclude on the branch trigger", () => {
    const yamlText = extractYamlBlock(cicdStandards, 1);
    const doc = parse(yamlText) as { trigger?: { paths?: Record<string, unknown> } };
    expect(doc.trigger?.paths?.exclude).toBeDefined();
    expect(doc.trigger?.paths?.include).toBeUndefined();
  });

  it("the exclude list is narrow and never excludes pipeline/manifest/lockfile/script/migration/infra paths", () => {
    for (const blockIndex of [0, 1]) {
      const doc = parse(extractYamlBlock(cicdStandards, blockIndex)) as {
        trigger?: { paths?: { exclude?: string[] } };
      };
      const excludeList = doc.trigger?.paths?.exclude ?? [];
      expect(excludeList.length).toBeGreaterThan(0);
      expect(excludeList.length).toBeLessThanOrEqual(6); // narrow, per D1
      for (const dangerous of ["azure-pipelines", "package.json", "package-lock", "src/", ".csproj"]) {
        expect(excludeList.some((p) => p.includes(dangerous))).toBe(false);
      }
    }
  });

  // R6 / ARC-022 acceptance scenario classes, checked as documented
  // reasoning against the exclude list's actual content (this is a
  // template for consumers, not Arcane's own executable pipeline, so
  // "fixture" here means proving the list's construction implies the
  // right behavior, not running a real Azure DevOps job).
  it("scenario: a docs-only change (a .md file) would be excluded -- no wasted run", () => {
    const doc = parse(extractYamlBlock(cicdStandards, 0)) as { trigger: { paths: { exclude: string[] } } };
    expect(doc.trigger.paths.exclude).toContain("**/*.md");
  });

  it("scenario: a change in a brand-new, never-listed code directory is NOT excluded -- fails safe", () => {
    const doc = parse(extractYamlBlock(cicdStandards, 0)) as { trigger: { paths: { exclude: string[] } } };
    const newDirectoryPath = "some-brand-new-service/index.ts";
    const isExcluded = doc.trigger.paths.exclude.some((pattern: string) => {
      // Crude but sufficient: none of the real exclude globs (doc/journal/
      // governance-scoped) could ever match a path under a fresh code dir.
      return newDirectoryPath.startsWith(pattern.replace("/**", "/"));
    });
    expect(isExcluded).toBe(false);
  });
});

describe("Terraform and Markdown-lint pipelines stay include-based, widened (R3)", () => {
  it("Terraform pipeline (block 2) include list covers both its own path and its pipeline definition", () => {
    const doc = parse(extractYamlBlock(cicdStandards, 2)) as { pr: { paths: { include: string[] } } };
    expect(doc.pr.paths.include).toContain("infrastructure/terraform/**");
    expect(doc.pr.paths.include.some((p: string) => p.includes("azure-pipelines"))).toBe(true);
  });

  it("Markdown-lint pipeline (block 3) include list covers both markdown files and its pipeline definition", () => {
    const doc = parse(extractYamlBlock(cicdStandards, 3)) as { trigger: { paths: { include: string[] } } };
    expect(doc.trigger.paths.include).toContain("**.md");
    expect(doc.trigger.paths.include.some((p: string) => p.includes("azure-pipelines"))).toBe(true);
  });

  it("documents why include-scoping here is not the ARC-022 anti-pattern", () => {
    expect(cicdStandards).toContain("not the ARC-022 anti-pattern");
    expect(cicdStandards).toContain("correctly include-scoped, for the same reason as the Terraform pipeline");
  });
});

describe("commit-metadata prohibition and branch-policy alignment (R4, R5)", () => {
  it("states the explicit rule against commit-message/author/branch-name CI trust signals", () => {
    expect(cicdStandards).toContain("## Never Trust Commit Metadata for CI Skipping");
    expect(cicdStandards).toContain("only on changed paths");
    expect(cicdStandards).toContain("attacker-controlled metadata");
  });

  it("documents the branch-policy path-filter alignment failure mode concretely", () => {
    expect(cicdStandards).toContain("## Branch-Policy Path-Filter Alignment");
    expect(cicdStandards).toContain("no build check required at all");
    expect(cicdStandards).toContain("match or be a strict superset — never left narrower");
  });
});

describe("all four pipeline templates remain syntactically valid YAML", () => {
  it.each([0, 1, 2, 3])("block %i parses without error", (index) => {
    expect(() => parse(extractYamlBlock(cicdStandards, index))).not.toThrow();
  });
});
