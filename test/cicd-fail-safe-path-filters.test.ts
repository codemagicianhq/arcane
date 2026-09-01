import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");

let cicdStandards: string;

beforeAll(async () => {
  cicdStandards = await readFile(join(GOVERNANCE, "cicd-standards.md"), "utf8");
});

/**
 * Extracts the fenced ```yaml block belonging to the section under `heading`
 * (a `### ...` line). Anchored by heading text, not ordinal position (R5,
 * adversarial review) -- reordering the doc's templates, or inserting a new
 * one, cannot silently make a test validate the wrong block: a missing
 * heading throws immediately instead of the wrong block parsing "clean" by
 * coincidence.
 */
function extractYamlBlockAfter(text: string, heading: string): string {
  const headingIndex = text.indexOf(heading);
  if (headingIndex === -1) throw new Error(`Heading "${heading}" not found`);
  const rest = text.slice(headingIndex);
  const match = rest.match(/```yaml\n([\s\S]*?)```/);
  if (!match) throw new Error(`No yaml block found after heading "${heading}"`);
  return match[1];
}

// R4 (adversarial review, second pass): ARC-022 unconditionally names SEVEN
// categories that must always remain triggering inputs -- containers was
// missing from the first fix pass's count of six (DECISIONS.md's ARC-022
// entry: "Pipeline definitions, manifests, lockfiles, scripts, migrations,
// containers, and infrastructure"). One representative example path per
// category, checked against every exclude list in this document -- not just
// a handful of ad-hoc substrings.
const ARC022_MUST_ALWAYS_TRIGGER: Record<string, string> = {
  "pipeline definition": "azure-pipelines.yml",
  manifest: "package.json",
  lockfile: "package-lock.json",
  script: "scripts/build.sh",
  migration: "migrations/0001_init.sql",
  container: "Dockerfile",
  infrastructure: "infrastructure/main.tf",
};

/**
 * Deliberately minimal glob check, scoped to exactly the pattern shapes this
 * document's path filters actually use: "**\/*.ext" / "**.ext" (match by
 * extension, at any depth, including multi-part extensions like
 * ".tf.json" -- both spellings appear across the four templates),
 * "**\/<exact filename>" (match one specific filename at any depth, e.g.
 * Terraform's ".terraform.lock.hcl" dependency lock file, which isn't an
 * extension pattern at all), and an exact literal path/filename (e.g. a
 * pipeline definition's own name). This is NOT a general glob matcher --
 * `minimatch` is present in node_modules only as an incidental transitive
 * dependency of other tooling (confirmed via package-lock.json, not
 * declared in package.json), so importing it directly here would be a
 * silent, undeclared dependency that could disappear on an unrelated
 * dependency bump. If a future pattern needs real glob semantics, add a
 * declared devDependency for it rather than extending this helper past what
 * it honestly covers.
 */
function matchesGlob(pattern: string, path: string): boolean {
  const extensionGlob = pattern.match(/^\*\*(?:\/\*)?(\.[a-zA-Z0-9.]+)$/);
  if (extensionGlob) {
    return path.endsWith(extensionGlob[1]);
  }
  const anyDepthFilename = pattern.match(/^\*\*\/([^*/]+)$/);
  if (anyDepthFilename) {
    const filename = anyDepthFilename[1];
    return path === filename || path.endsWith(`/${filename}`);
  }
  return pattern === path;
}

function matchesAnyPattern(excludeList: string[], path: string): boolean {
  return excludeList.some((pattern) => matchesGlob(pattern, path));
}

describe("ARC-022 accepted", () => {
  it("DECISIONS.md status is Accepted, not Proposed, in both the entry and the table of contents", async () => {
    const decisions = await readFile(join(process.cwd(), "DECISIONS.md"), "utf8");
    const arc022Section = decisions.slice(decisions.indexOf("## ARC-022"));
    const statusLine = arc022Section.split("\n").find((l) => l.startsWith("**Status:**"));
    expect(statusLine).toContain("Accepted");
    expect(statusLine).not.toContain("Proposed");

    const tocLine = decisions.split("\n").find((l) => l.includes("[ARC-022]"));
    expect(tocLine).toContain("Accepted");
  });
});

describe(".NET and Node.js pipelines use exclude-based fail-safe filters, filetype-scoped not directory-scoped (R2/R3)", () => {
  it(".NET pipeline uses paths.exclude, not paths.include, on the branch trigger", () => {
    const doc = parse(extractYamlBlockAfter(cicdStandards, "### .NET Backend Pipeline")) as {
      trigger?: { paths?: Record<string, unknown> };
    };
    expect(doc.trigger?.paths?.exclude).toBeDefined();
    expect(doc.trigger?.paths?.include).toBeUndefined();
  });

  it("Node.js pipeline uses paths.exclude on the branch trigger", () => {
    const doc = parse(extractYamlBlockAfter(cicdStandards, "### Node.js Pipeline")) as {
      trigger?: { paths?: Record<string, unknown> };
    };
    expect(doc.trigger?.paths?.exclude).toBeDefined();
    expect(doc.trigger?.paths?.include).toBeUndefined();
  });

  // R3: a prior version excluded whole directories (docs/**, journal/**,
  // .arcane/governance/**), which would ALSO exclude any non-Markdown file
  // (a script, a manifest) a consumer happened to place there -- silently
  // violating ARC-022's unconditional list. Assert the fix: exclude is
  // filetype-scoped (**/*.md), so nothing in the seven always-trigger
  // categories can ever match it, regardless of what directory it's in.
  for (const heading of ["### .NET Backend Pipeline", "### Node.js Pipeline"]) {
    it(`${heading}: none of ARC-022's seven always-trigger categories can match the exclude list, even nested under a docs-like path`, () => {
      const doc = parse(extractYamlBlockAfter(cicdStandards, heading)) as {
        trigger: { paths: { exclude: string[] } };
      };
      const excludeList = doc.trigger.paths.exclude;

      for (const [category, examplePath] of Object.entries(ARC022_MUST_ALWAYS_TRIGGER)) {
        expect(matchesAnyPattern(excludeList, examplePath), `${category} (${examplePath}) must not be excluded`).toBe(
          false,
        );
        // The same category nested under a docs-like directory must ALSO
        // still trigger -- this is exactly the gap a directory-wide
        // exclude (docs/**) would have silently reintroduced.
        const nestedPath = `docs/${examplePath}`;
        expect(
          matchesAnyPattern(excludeList, nestedPath),
          `${category} nested under docs/ (${nestedPath}) must not be excluded`,
        ).toBe(false);
      }
    });
  }

  it("scenario: a docs-only change (a .md file, anywhere in the tree) would be excluded -- no wasted run", () => {
    const doc = parse(extractYamlBlockAfter(cicdStandards, "### .NET Backend Pipeline")) as {
      trigger: { paths: { exclude: string[] } };
    };
    expect(matchesAnyPattern(doc.trigger.paths.exclude, "README.md")).toBe(true);
    expect(matchesAnyPattern(doc.trigger.paths.exclude, "docs/deeply/nested/guide.md")).toBe(true);
  });

  it("scenario: a change in a brand-new, never-listed code directory is NOT excluded -- fails safe", () => {
    const doc = parse(extractYamlBlockAfter(cicdStandards, "### .NET Backend Pipeline")) as {
      trigger: { paths: { exclude: string[] } };
    };
    expect(matchesAnyPattern(doc.trigger.paths.exclude, "some-brand-new-service/index.ts")).toBe(false);
  });
});

describe("Terraform and Markdown-lint pipelines stay include-based, filetype-scoped for closure (R2)", () => {
  it("Terraform pipeline's include list is a filetype glob (**/*.tf), not a directory-prefix glob", () => {
    const doc = parse(extractYamlBlockAfter(cicdStandards, "### Terraform Pipeline")) as {
      pr: { paths: { include: string[] } };
    };
    expect(doc.pr.paths.include).toContain("**/*.tf");
    // The old directory-prefix pattern must be gone -- it's exactly the gap
    // this fix closes, not a redundant-but-harmless leftover.
    expect(doc.pr.paths.include).not.toContain("infrastructure/terraform/**");
  });

  it("scenario: a new Terraform file OUTSIDE the conventional infrastructure/terraform/ directory still triggers -- fails safe", () => {
    const doc = parse(extractYamlBlockAfter(cicdStandards, "### Terraform Pipeline")) as {
      pr: { paths: { include: string[] } };
    };
    expect(matchesAnyPattern(doc.pr.paths.include, "modules/networking/main.tf")).toBe(true);
  });

  // R2 (adversarial review, second pass): **/*.tf and **/*.tfvars alone
  // still miss Terraform's dependency lock file and JSON-syntax variants --
  // none of them end in .tf/.tfvars, so they need their own named entries.
  // The lock file specifically is ARC-022's "lockfile" category applied to
  // Terraform, which the fail-safe filter must never miss regardless of
  // location.
  it("Terraform include list also covers the dependency lock file and JSON-syntax file variants, at any depth", () => {
    const doc = parse(extractYamlBlockAfter(cicdStandards, "### Terraform Pipeline")) as {
      pr: { paths: { include: string[] } };
    };
    expect(matchesAnyPattern(doc.pr.paths.include, "infrastructure/terraform/.terraform.lock.hcl")).toBe(true);
    expect(matchesAnyPattern(doc.pr.paths.include, ".terraform.lock.hcl")).toBe(true);
    expect(matchesAnyPattern(doc.pr.paths.include, "modules/networking/variables.tf.json")).toBe(true);
    expect(matchesAnyPattern(doc.pr.paths.include, "modules/networking/terraform.tfvars.json")).toBe(true);
  });

  it("Terraform and Markdown-lint include lists each cover their own pipeline definition file", () => {
    const terraform = parse(extractYamlBlockAfter(cicdStandards, "### Terraform Pipeline")) as {
      pr: { paths: { include: string[] } };
    };
    const markdown = parse(extractYamlBlockAfter(cicdStandards, "### Markdown Lint Pipeline")) as {
      trigger: { paths: { include: string[] } };
    };
    expect(terraform.pr.paths.include.some((p) => p.includes("azure-pipelines"))).toBe(true);
    expect(markdown.trigger.paths.include.some((p) => p.includes("azure-pipelines"))).toBe(true);
  });

  it("documents why include-scoping here is not the ARC-022 anti-pattern, and why it required a filetype (not directory) glob", () => {
    expect(cicdStandards).toContain("not the ARC-022 anti-pattern");
    expect(cicdStandards).toContain("silently misses any `.tf` file");
    expect(cicdStandards).toContain("directory-prefix pattern");
  });
});

describe("commit-metadata prohibition and branch-policy alignment (R1, R4/R5 in the PRD's own numbering)", () => {
  it("states the explicit rule against commit-message/author/branch-name CI trust signals", () => {
    // Heading renamed under ARC-038's core/profile split (BC-31 batch b) --
    // same rule, now filed under the vendor-neutral Core section rather than
    // a top-level heading, since the principle applies to any CI platform.
    expect(cicdStandards).toContain("Never Trust Commit Metadata (ARC-022)");
    expect(cicdStandards).toContain("only on changed paths");
    expect(cicdStandards).toContain("attacker-controlled metadata");
  });

  // R1 (adversarial review): the original text implied [skip ci] was
  // something a consumer chooses to add, when Azure Pipelines honors it by
  // default. Assert the corrected text states the platform default
  // accurately, including which gate remains immune and which doesn't.
  it("accurately states Azure Pipelines' default [skip ci] behavior, not implying it's opt-in", () => {
    expect(cicdStandards).toContain("Azure Pipelines honors");
    expect(cicdStandards).toContain("by default");
    expect(cicdStandards).toContain("regardless*");
    expect(cicdStandards).toContain("[skip ci]` and its variants");
    expect(cicdStandards).toContain("residual, platform-level exposure");
  });

  it("documents the branch-policy path-filter alignment failure mode concretely", () => {
    expect(cicdStandards).toContain("## Branch-Policy Path-Filter Alignment");
    expect(cicdStandards).toContain("no build check required at all");
    expect(cicdStandards).toContain("match or be a strict superset — never left narrower");
  });
});

describe("all four pipeline templates remain syntactically valid YAML", () => {
  it.each([
    "#### .NET Backend Pipeline",
    "#### Node.js Pipeline",
    "#### Terraform Pipeline",
    "#### Markdown Lint Pipeline",
  ])("the block under %s parses without error", (heading) => {
    expect(() => parse(extractYamlBlockAfter(cicdStandards, heading))).not.toThrow();
  });
});

// ARC-038 decision 2: cicd-standards.md split into a vendor-neutral core and
// an Azure DevOps profile, reusing development-methodology.md's own
// per-provider shape rather than a new architecture.
describe("vendor-neutral core / Azure DevOps profile split (ARC-038 decision 2)", () => {
  it("has a Core Principles section stated in platform-agnostic terms", () => {
    expect(cicdStandards).toContain("## Core Principles (vendor-neutral)");
    // The branch-policy table's rationale column must not itself assume
    // Azure DevOps -- that's exactly the coupling this split removes.
    const coreStart = cicdStandards.indexOf("## Core Principles (vendor-neutral)");
    const profileStart = cicdStandards.indexOf("## Azure DevOps Profile");
    expect(profileStart).toBeGreaterThan(coreStart);
    const core = cicdStandards.slice(coreStart, profileStart);
    expect(core).toContain("any platform's branch-protection mechanism");
    expect(core).not.toContain("azure-pipelines.yml");
  });

  it("has an Azure DevOps Profile section holding every pipeline YAML template", () => {
    expect(cicdStandards).toContain("## Azure DevOps Profile");
    const profile = cicdStandards.slice(cicdStandards.indexOf("## Azure DevOps Profile"));
    for (const heading of [
      "#### .NET Backend Pipeline",
      "#### Node.js Pipeline",
      "#### Terraform Pipeline",
      "#### Markdown Lint Pipeline",
    ]) {
      expect(profile).toContain(heading);
    }
  });

  it("states this reuses development-methodology.md's own per-provider shape, not a new architecture", () => {
    expect(cicdStandards).toContain("ARC-038 decision 2");
    expect(cicdStandards).toContain("development-methodology");
  });
});

describe("spell-authoring-standards.md D2 gate extended to vendor coupling (ARC-038 decision 3)", () => {
  let spellAuthoringStandards: string;
  beforeAll(async () => {
    spellAuthoringStandards = await readFile(
      join(GOVERNANCE, "spell-authoring-standards.md"),
      "utf8",
    );
  });

  it("D2's Gold bar names CI/CD platform and deployment vendor alongside tracker", () => {
    expect(spellAuthoringStandards).toContain(
      "no hard assumption of a specific tracker, CI/CD platform, cloud/deployment vendor",
    );
  });

  it("documents the vendor-coupling convention, citing cicd-standards.md as the found (not assumed) example", () => {
    expect(spellAuthoringStandards).toContain("ARC-038 decision 3");
    expect(spellAuthoringStandards).toContain("[[cicd-standards]]");
    expect(spellAuthoringStandards).toContain("Azure-DevOps-specific end to end until ARC-038");
  });
});
