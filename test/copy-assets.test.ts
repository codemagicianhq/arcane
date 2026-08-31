import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir } from "./helpers/git-fixture.js";
import { copyAssets, copyDir } from "../scripts/copy-assets.js";

const tempDirs: string[] = [];

async function fixtureDirs() {
  const src = await createFixtureDir("copy-assets-src-");
  const dest = await createFixtureDir("copy-assets-dest-");
  tempDirs.push(src, dest);
  return { src, dest };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("copyAssets pruning", () => {
  it("removes a dist file whose source was deleted before the next build", async () => {
    const { src, dest } = await fixtureDirs();

    await fs.writeFile(join(src, "keep.md"), "keep\n", "utf8");
    await fs.writeFile(join(src, "orphan.prompt.md"), "stale spell\n", "utf8");

    const first = await copyAssets(src, dest);
    expect(first.violations).toHaveLength(0);
    expect(first.count).toBe(2);
    await expect(fs.readFile(join(dest, "orphan.prompt.md"), "utf8")).resolves.toBe(
      "stale spell\n",
    );

    // orphan.prompt.md's source is removed -- exactly the spell-eas-ios-deploy
    // scenario: no counterpart under src/assets/, so it must not survive.
    await fs.rm(join(src, "orphan.prompt.md"));

    const second = await copyAssets(src, dest);
    expect(second.violations).toHaveLength(0);
    expect(second.count).toBe(1);
    await expect(fs.readFile(join(dest, "keep.md"), "utf8")).resolves.toBe("keep\n");
    await expect(fs.access(join(dest, "orphan.prompt.md"))).rejects.toThrow();
  });

  it("removes an entire dist subdirectory whose source directory was deleted", async () => {
    const { src, dest } = await fixtureDirs();

    await fs.mkdir(join(src, "prompts"), { recursive: true });
    await fs.writeFile(join(src, "prompts", "spell-a.md"), "a\n", "utf8");

    await copyAssets(src, dest);
    await expect(fs.access(join(dest, "prompts", "spell-a.md"))).resolves.toBeUndefined();

    await fs.rm(join(src, "prompts"), { recursive: true, force: true });

    await copyAssets(src, dest);
    await expect(fs.access(join(dest, "prompts"))).rejects.toThrow();
  });

  it("is idempotent when nothing changed between builds", async () => {
    const { src, dest } = await fixtureDirs();
    await fs.writeFile(join(src, "stable.md"), "stable\n", "utf8");

    await copyAssets(src, dest);
    const second = await copyAssets(src, dest);

    expect(second.count).toBe(1);
    await expect(fs.readFile(join(dest, "stable.md"), "utf8")).resolves.toBe("stable\n");
  });

  it("still blocks on a secrets-pattern violation via the underlying copyDir", async () => {
    const { src, dest } = await fixtureDirs();
    await fs.mkdir(dest, { recursive: true });
    await fs.writeFile(join(src, "leaky.md"), "API_KEY=abc123\n", "utf8");

    const violations: Array<{ file: string }> = [];
    await copyDir(src, dest, violations);

    expect(violations.length).toBeGreaterThan(0);
    await expect(fs.access(join(dest, "leaky.md"))).rejects.toThrow();
  });
});
