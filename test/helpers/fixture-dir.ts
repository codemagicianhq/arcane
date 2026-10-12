import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Create a fresh `mkdtemp`'d directory for a fixture and return its real
 * path. Pair with `removeFixtureDir`.
 *
 * Real, because git and Node's module resolution both hand back paths with
 * symlinks resolved, and the temp root is not always a real path: on macOS it
 * is /var/folders/..., and /var is a symlink to /private/var. A fixture path
 * spelled through the link never equals what `git rev-parse` or
 * `require.resolve` reports for the same directory.
 */
export async function createFixtureDir(prefix: string): Promise<string> {
    return fs.realpath(await fs.mkdtemp(join(tmpdir(), `${prefix}-`)));
}

/**
 * Remove a fixture directory tree. A closed file handle a virus scanner or
 * search indexer is still holding can make Windows report `EBUSY`/`ENOTEMPTY`
 * for a fixture that was, from the test's perspective, already done with --
 * `maxRetries`/`retryDelay` are `fs.rm`'s own built-in retry knobs for exactly
 * that transient window, not a workaround layered on top of it.
 */
export async function removeFixtureDir(dir: string): Promise<void> {
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
