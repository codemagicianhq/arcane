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