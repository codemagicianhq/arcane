import { describe, it, expect, afterEach } from "vitest";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { collectFeatures, featureTracking, parsePrd } from "../src/modules/state/features.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { REPO_ROOT, compileStateSchema, minimalDocument } from "./helpers/state-schema.js";

const fixtures: string[] = [];
afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

describe("parsePrd / featureTracking (ST-08, D7)", () => {
  it("reads title, status, implementation_status and a nested tracking block", () => {
    const { fields, warning } = parsePrd(
      '---\ntitle: "PRD: Site survey"\nstatus: accepted\nimplementation_status: in-progress\ntracking:\n  tracking_mode: external\n  external_provider: github\n  adoWorkItemId: null\n  githubIssueId: 415\n---\n\n# PRD\n',
      "features/survey/PRD.md",
    );
    expect(warning).toBeNull();
    expect(fields).toEqual({
      title: "PRD: Site survey",
      status: "accepted",
      implementation_status: "in-progress",
      tracking: { tracking_mode: "external", external_provider: "github", adoWorkItemId: null, githubIssueId: 415 },
    });
  });

  it("maps the older flat tracking_mode key, CRLF-safe, and leaves tracking null when neither shape is present", () => {
    const flat = parsePrd("---\r\nstatus: accepted\r\ntracking_mode: internal\r\n---\r\n", "p");
    expect(flat.fields.tracking).toEqual({ tracking_mode: "internal", external_provider: null, adoWorkItemId: null, githubIssueId: null });
    expect(flat.fields.title).toBeNull();
    expect(featureTracking({ title: "x" })).toBeNull();
  });

  it("exports null fields with a warning for a PRD without frontmatter, with malformed YAML, or with a non-map", () => {
    const none = parsePrd("no heading, no frontmatter\n", "features/a/PRD.md");
    expect(none.fields).toEqual({ title: null, status: null, implementation_status: null, tracking: null });
    expect(none.warning).toBe("features: features/a/PRD.md has no frontmatter");
    const malformed = parsePrd("---\ntitle: [unclosed\n---\n", "p");
    expect(malformed.warning).toContain("malformed frontmatter");
    expect(malformed.warning).not.toContain("\n");
    expect(parsePrd("---\njust a scalar\n---\n", "p").warning).toContain("not a map");
  });

  it("accepts a block that follows one # Title line, and uses that heading as the title fallback", () => {
    const led = parsePrd("# PRD: Show Report\n\n---\nstatus: accepted\n---\n\nbody\n", "p");
    expect(led.warning).toBeNull();
    expect(led.fields.title).toBe("PRD: Show Report");
    expect(led.fields.status).toBe("accepted");
    const titled = parsePrd("# Heading\n\n---\ntitle: From frontmatter\n---\n", "p");
    expect(titled.fields.title).toBe("From frontmatter");
    const bare = parsePrd("# Only a heading\n\nprose\n", "p");
    expect(bare.fields.title).toBe("Only a heading");
    expect(bare.warning).toContain("no frontmatter");
    // Two lines before the block is not a leading title: no frontmatter.
    expect(parsePrd("# A\nintro\n---\nstatus: x\n---\n", "p").warning).toContain("no frontmatter");
  });
});

describe("collectFeatures", () => {
  it("lists every folder in this repository's features/ that has a PRD.md, sorted by slug, and validates", async () => {
    const entries = await readdir(join(REPO_ROOT, "features"), { withFileTypes: true });
    const expected = entries
      .filter((e) => e.isDirectory() && existsSync(join(REPO_ROOT, "features", e.name, "PRD.md")))
      .map((e) => e.name)
      .sort();
    const { features, warnings } = await collectFeatures(REPO_ROOT);
    expect(features!.map((f) => f.slug)).toEqual(expected);
    expect(features!.every((f) => f.path === `features/${f.slug}/PRD.md`)).toBe(true);
    expect(features!.find((f) => f.slug === "state-export")?.status).toBe("accepted");
    // Some of this repository's PRDs carry genuinely malformed YAML; every warning must name a real PRD.
    for (const warning of warnings) {
      const named = /^features: (features\/[^/]+\/PRD\.md) /.exec(warning);
      expect(named, warning).not.toBeNull();
      expect(existsSync(join(REPO_ROOT, named![1]))).toBe(true);
    }
    expect(features!.every((f) => f.title !== null)).toBe(true);
    const validate = await compileStateSchema();
    expect(validate({ ...minimalDocument(), features })).toEqual([]);
  });

  it("warns once for a PRD without frontmatter, skips a folder without a PRD, and sorts by slug", async () => {
    const dir = await createFixtureDir("state-features");
    fixtures.push(dir);
    await mkdir(join(dir, "features", "zeta"), { recursive: true });
    await mkdir(join(dir, "features", "alpha"), { recursive: true });
    await mkdir(join(dir, "features", "no-prd"), { recursive: true });
    await writeFile(join(dir, "features", "zeta", "PRD.md"), "---\ntitle: Zeta\nstatus: draft\n---\n", "utf8");
    await writeFile(join(dir, "features", "alpha", "PRD.md"), "# Alpha\n", "utf8");
    await writeFile(join(dir, "features", "README.md"), "not a feature\n", "utf8");
    const { features, warnings } = await collectFeatures(dir);
    expect(features).toEqual([
      { slug: "alpha", title: "Alpha", status: null, implementation_status: null, tracking: null, path: "features/alpha/PRD.md" },
      { slug: "zeta", title: "Zeta", status: "draft", implementation_status: null, tracking: null, path: "features/zeta/PRD.md" },
    ]);
    expect(warnings).toEqual(["features: features/alpha/PRD.md has no frontmatter"]);
  });

  it("yields null when features/ is absent", async () => {
    const dir = await createFixtureDir("state-features-absent");
    fixtures.push(dir);
    expect(await collectFeatures(dir)).toEqual({ features: null, warnings: [] });
  });
});
