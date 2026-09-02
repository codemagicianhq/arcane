import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findBuiltCli, resolveBuiltCli, resolveTsxCli } from "./helpers/resolve-cli.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

// These tests fabricate the exact directory shape a git worktree of this
// repo has: a nested directory with its own package.json but no dist/ or
// node_modules/tsx, sitting under an ancestor that has both -- reproducing
// the scenario from the bug report (`npx vitest run` inside a worktree that
// never had its own `npm install`/`npm run build`) without needing a real
// second build or install.

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => removeFixtureDir(dir)),
  );
});

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function writePackageJson(dir: string, name: string) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(join(dir, "package.json"), JSON.stringify({ name }), "utf8");
}

async function writeBuiltCli(dir: string) {
  await fs.mkdir(join(dir, "dist"), { recursive: true });
  await fs.writeFile(join(dir, "dist", "index.js"), "// dummy built CLI\n", "utf8");
}

async function writeFakeTsx(nodeModulesParent: string) {
  const tsxDir = join(nodeModulesParent, "node_modules", "tsx");
  await fs.mkdir(join(tsxDir, "dist"), { recursive: true });
  await fs.writeFile(
    join(tsxDir, "package.json"),
    JSON.stringify({ name: "tsx", exports: { "./cli": "./dist/cli.mjs" } }),
    "utf8",
  );
  await fs.writeFile(join(tsxDir, "dist", "cli.mjs"), "// dummy tsx cli\n", "utf8");
}

describe("findBuiltCli / resolveBuiltCli", () => {
  it("finds the primary checkout's build from a nested worktree-like directory", async () => {
    const root = await makeTempDir("resolve-cli-worktree-");
    await writePackageJson(root, "arcane-cli");
    await writeBuiltCli(root);

    // The "worktree": its own package.json (real worktrees share source, so
    // the name matches too), but no dist/ of its own -- gitignored.
    const worktree = join(root, ".claude", "worktrees", "fake-session");
    await writePackageJson(worktree, "arcane-cli");

    const found = findBuiltCli(worktree);

    expect(found).toBe(join(root, "dist", "index.js"));
    // The public wrapper's default-parameter wiring resolves the same way.
    expect(resolveBuiltCli(worktree)).toBe(found);
  });

  it("returns null when no ancestor has a build", async () => {
    const isolated = await makeTempDir("resolve-cli-no-build-");

    expect(findBuiltCli(isolated)).toBeNull();
  });

  it("does not match a dist/index.js sitting next to an unrelated package.json", async () => {
    const root = await makeTempDir("resolve-cli-wrong-name-");
    await writePackageJson(root, "arcane-cli");
    await writeBuiltCli(root);

    // A decoy one level down: has its own dist/index.js, but its
    // package.json name doesn't match -- must be skipped, not matched.
    const decoy = join(root, "unrelated-nested-package");
    await writePackageJson(decoy, "totally-different-package");
    await writeBuiltCli(decoy);

    const worktree = join(decoy, "worktree");
    await writePackageJson(worktree, "arcane-cli");

    expect(findBuiltCli(worktree)).toBe(join(root, "dist", "index.js"));
  });

  it("keeps climbing past an unreadable package.json instead of crashing", async () => {
    const root = await makeTempDir("resolve-cli-malformed-");
    await writePackageJson(root, "arcane-cli");
    await writeBuiltCli(root);

    // A decoy one level down: has a dist/index.js, but its package.json is
    // not valid JSON -- must not throw, must keep climbing past it.
    const decoy = join(root, "malformed-nested-package");
    await fs.mkdir(decoy, { recursive: true });
    await fs.writeFile(join(decoy, "package.json"), "{ not valid json", "utf8");
    await writeBuiltCli(decoy);

    const worktree = join(decoy, "worktree");
    await writePackageJson(worktree, "arcane-cli");

    expect(findBuiltCli(worktree)).toBe(join(root, "dist", "index.js"));
  });
});

describe("resolveTsxCli", () => {
  it("finds the primary checkout's tsx from a nested worktree-like directory", async () => {
    const root = await makeTempDir("resolve-tsx-worktree-");
    await writeFakeTsx(root);

    const worktree = join(root, ".claude", "worktrees", "fake-session");
    await fs.mkdir(worktree, { recursive: true });

    const found = resolveTsxCli(worktree);

    expect(found).toBe(join(root, "node_modules", "tsx", "dist", "cli.mjs"));
  });

  it("returns null when tsx is not installed anywhere in the ancestor chain", async () => {
    const isolated = await makeTempDir("resolve-tsx-not-installed-");

    expect(resolveTsxCli(isolated)).toBeNull();
  });
});
