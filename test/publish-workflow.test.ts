import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";

describe("npm publish workflow", () => {
  it("pins an npm major compatible with the configured Node runtime", async () => {
    const workflow = await fs.readFile(
      join(process.cwd(), ".github", "workflows", "publish.yml"),
      "utf8",
    );

    expect(workflow).toContain("node-version: 20");
    expect(workflow).toContain("npm install -g npm@11");
    expect(workflow).not.toContain("npm install -g npm@latest");
  });

  it("supports manual recovery after a release-triggered publish failure", async () => {
    const workflow = await fs.readFile(
      join(process.cwd(), ".github", "workflows", "publish.yml"),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("npm publish --provenance --access public");
  });
});

describe("release drift workflow", () => {
  it("creates the release and starts publish.yml with the built-in token, holding no stored credential", async () => {
    const workflow = await fs.readFile(
      join(process.cwd(), ".github", "workflows", "release-drift.yml"),
      "utf8",
    );

    // A personal access token here expired silently and left 1.12.0 merged
    // but unpublished (2026-10-12). The built-in token cannot expire.
    expect([...new Set(workflow.match(/secrets\.\w+/g))]).toEqual(["secrets.GITHUB_TOKEN"]);
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("actions: write");
    expect(workflow).toContain('gh release create "${TAG}"');
    // A release created with GITHUB_TOKEN fires no `release` event, so the job
    // must start publish.yml itself, on the tag it just created.
    expect(workflow).toContain('gh workflow run publish.yml --repo "${{ github.repository }}" --ref "${TAG}"');
  });
});