import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "arcane-cli";
const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Climbs from `startDir` toward the filesystem root looking for a directory
 * that is both an arcane-cli checkout (package.json "name" matches) and has
 * a built dist/index.js. A git worktree of this repo has no dist/ of its own
 * -- gitignored, not duplicated per-worktree -- but the primary checkout it
 * is nested under does. This reproduces, for a hand-spawned `node <bin>`,
 * the same ancestor walk `npm run <script>` gets for free via its
 * node_modules/.bin PATH injection.
 *
 * Exported (rather than kept private) so tests can drive it against a
 * fabricated worktree-like tree without needing a real second `npm install`.
 */
export function findBuiltCli(startDir: string): string | null {
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, "dist", "index.js");
    const pkgPath = join(dir, "package.json");
    if (existsSync(candidate) && existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === PACKAGE_NAME) return candidate;
      } catch {
        // Unreadable/invalid package.json at this level -- not the repo root, keep climbing.
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Resolves the built CLI entrypoint (dist/index.js). Returns null -- never
 * throws -- when no build is found anywhere in the ancestor chain, so
 * callers can skip the tests that need it instead of failing on a confusing
 * spawn error.
 *
 * `startDir` defaults to this module's own location (every real call site
 * calls this with no arguments); tests pass a fabricated directory instead.
 */
export function resolveBuiltCli(startDir: string = HERE): string | null {
  return findBuiltCli(startDir);
}

/**
 * Resolves tsx's CLI entrypoint via real Node module resolution -- the same
 * node_modules walk `npm run <script>` gets from PATH injection, so a worktree
 * with no local node_modules/tsx still finds the primary checkout's hoisted
 * copy. Returns null -- never throws -- instead of letting MODULE_NOT_FOUND
 * surface as a confusing spawn/assertion failure.
 *
 * `startDir` defaults to this module's own location (every real call site
 * calls this with no arguments); tests pass a fabricated directory instead.
 */
export function resolveTsxCli(startDir: string = HERE): string | null {
  const require = createRequire(import.meta.url);
  try {
    return require.resolve("tsx/cli", { paths: [startDir] });
  } catch {
    return null;
  }
}

export const BUILT_CLI_SKIP_REASON =
  "dist/index.js not found in this checkout or any ancestor directory -- run `npm run build` from the repository root (a worktree has no dist/ of its own until built there).";

export const TSX_SKIP_REASON =
  "tsx not resolvable via node_modules from this checkout or any ancestor directory -- run `npm install` from the repository root.";
