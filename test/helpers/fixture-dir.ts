import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterAll } from "vitest";

/**
 * Every directory `createFixtureDir` made that `removeFixtureDir` has not yet
 * removed. Vitest isolates test files, so one instance of this module -- and
 * one set -- exists per file; the leak guard at the bottom sweeps it once the
 * file is done.
 */
const liveFixtureDirs = new Set<string>();

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
    const dir = await fs.realpath(await fs.mkdtemp(join(tmpdir(), `${prefix}-`)));
    liveFixtureDirs.add(dir);
    return dir;
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
    liveFixtureDirs.delete(dir);
}

async function exists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Remove every fixture directory this file created and never removed, and
 * return their paths. The leak guard below runs it once per test file; it is
 * exported so its own tests can drive it directly.
 */
export async function sweepLeakedFixtureDirs(): Promise<string[]> {
    const leaked: string[] = [];
    for (const dir of [...liveFixtureDirs]) {
        if (await exists(dir)) leaked.push(dir);
        await removeFixtureDir(dir);
    }
    return leaked;
}

// Leak guard. Registered here, at import time, so every file that creates a
// fixture directory has it without opting in, and so it runs after the file's
// own hooks: vitest runs after-hooks in reverse registration order
// (`sequence.hooks`, default "stack"). A directory still present when the
// file is done was never paired with removeFixtureDir. It is removed, so the
// temp folder stops growing, and the file fails, so the missing pairing gets
// fixed instead of quietly tolerated. Before this guard eight files left about
// 250 fixture repositories behind per full run (TODO.md, Test Infrastructure).
afterAll(async () => {
    const leaked = await sweepLeakedFixtureDirs();
    if (leaked.length === 0) return;
    const noun = leaked.length === 1 ? "directory was" : "directories were";
    throw new Error(
        `${leaked.length} fixture ${noun} created with createFixtureDir and never removed ` +
            `(removed now): ${leaked.map((dir) => basename(dir)).join(", ")}. ` +
            `Pair every createFixtureDir with removeFixtureDir in afterEach or afterAll.`,
    );
});
