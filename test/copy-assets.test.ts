import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";
import { copyAssets, copyDir } from "../scripts/copy-assets.js";
import { resolveTsxCli, TSX_SKIP_REASON } from "./helpers/resolve-cli.js";

const tempDirs: string[] = [];
const TSX = resolveTsxCli();
if (!TSX) console.warn(`[copy-assets.test.ts] ${TSX_SKIP_REASON}`);

async function fixtureDirs() {
  const src = await createFixtureDir("copy-assets-src-");
  const dest = await createFixtureDir("copy-assets-dest-");
  tempDirs.push(src, dest);
  return { src, dest };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => removeFixtureDir(dir)));
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
    await removeFixtureDir(join(src, "orphan.prompt.md"));

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

    await removeFixtureDir(join(src, "prompts"));

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

// ─── Repository-wide secrets backstop (ARC-037) ──────────────────────────────
// The copy-time scan above only ever protected src/assets/ -> dist/assets/.
// These tests pin the wider repo-scan added to main() as a CI backstop.

// The copy-time scan (ARCANE_SRC_ASSETS_DIR) and the repo-wide backstop
// (ARCANE_REPO_SCAN_DIR) run over two SEPARATE directories here on purpose:
// pointing both at the same tree would make the copy-time scan trip on the
// exact same fixture content first, so the build would always fail at the
// earlier gate and these tests could never observe the backstop specifically.
async function createBackstopFixture(repoFiles: Record<string, string>) {
  const root = await fs.mkdtemp(join(tmpdir(), "secrets-backstop-test-"));
  tempDirs.push(root);
  const assets = join(root, "assets");
  await fs.mkdir(assets, { recursive: true });
  await fs.writeFile(join(assets, "harmless.md"), "Nothing sensitive here.\n", "utf8");

  const repo = join(root, "repo");
  for (const [relPath, content] of Object.entries(repoFiles)) {
    const abs = join(repo, relPath);
    await fs.mkdir(join(abs, ".."), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
  }
  return { assets, dist: join(root, "dist"), repo };
}

function runBuild(assets: string, dist: string, repo: string) {
  return spawnSync(
    process.execPath,
    [TSX!, "scripts/copy-assets.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        ARCANE_SRC_ASSETS_DIR: assets,
        ARCANE_DIST_ASSETS_DIR: dist,
        ARCANE_ORG_TOKENS: "",
        ARCANE_REPO_SCAN_DIR: repo,
      },
    },
  );
}

describe.skipIf(!TSX)("repository-wide secrets backstop", () => {
  it("fails the build on a credential anywhere in the scanned tree, not just src/assets/", async () => {
    const { assets, dist, repo } = await createBackstopFixture({
      "docs/notes.md": "SECRET_KEY=thisisarealsecretvalue12345\n",
    });

    const result = runBuild(assets, dist, repo);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Repository-wide secrets scan FAILED");
    expect(result.stderr).toContain("docs/notes.md:1");
  });

  it("passes when the only credential-shaped line lives under a path excluded via .arcane.json", async () => {
    const { assets, dist, repo } = await createBackstopFixture({
      "test/copy-assets.test.ts": "API_KEY=abc123\n",
      "docs/notes.md": "Nothing sensitive here.\n",
      ".arcane.json": JSON.stringify({
        version: "1.0.0",
        profile: "full",
        installedAt: new Date(0).toISOString(),
        components: [],
        secretsScanExcludePrefixes: ["test/copy-assets.test.ts"],
      }),
    });

    const result = runBuild(assets, dist, repo);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("Repository-wide secrets scan FAILED");
  });

  it("passes a clean tree with exit code 0", async () => {
    const { assets, dist, repo } = await createBackstopFixture({
      "README.md": "Nothing sensitive here.\n",
    });

    const result = runBuild(assets, dist, repo);

    expect(result.status).toBe(0);
  });
});
