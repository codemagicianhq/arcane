import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDirs: string[] = [];

async function createAssetsFixture(content: string) {
  const root = await fs.mkdtemp(join(tmpdir(), "org-token-gate-test-"));
  tempDirs.push(root);
  const assets = join(root, "assets");
  const prompts = join(assets, ".github", "prompts");
  await fs.mkdir(prompts, { recursive: true });
  await fs.writeFile(join(prompts, "fixture.prompt.md"), content, "utf8");
  return { assets, dist: join(root, "dist") };
}

function runGate(
  assets: string,
  dist: string,
  configuredTokens = "Known Bad Organization,private-host.example",
) {
  return spawnSync(
    process.execPath,
    [join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/copy-assets.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        ARCANE_SRC_ASSETS_DIR: assets,
        ARCANE_DIST_ASSETS_DIR: dist,
        ARCANE_ORG_TOKENS: configuredTokens,
      },
    },
  );
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("org-token build gate", () => {
  it("derives a default organization rule from package metadata", async () => {
    const { assets, dist } = await createAssetsFixture(
      "Deploy Code Magician LLC configuration.\n",
    );

    const result = runGate(assets, dist, "");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".github/prompts/fixture.prompt.md:1");
    expect(result.stderr).not.toContain("Code Magician LLC");
  });

  it("fails the real asset gate and identifies a prompt containing a configured token", async () => {
    const { assets, dist } = await createAssetsFixture(
      "Deploy Known Bad Organization configuration.\n",
    );

    const result = runGate(assets, dist);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Org-token lint FAILED");
    expect(result.stderr).toContain(".github/prompts/fixture.prompt.md:1");
    expect(result.stderr).not.toContain("Known Bad Organization");
  });

  it("allows documented uppercase placeholders", async () => {
    const { assets, dist } = await createAssetsFixture(
      "Deploy {KNOWN_BAD_ORGANIZATION} to {PRIVATE_HOST}.\n",
    );

    const result = runGate(assets, dist);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("Org-token lint FAILED");
  });
});