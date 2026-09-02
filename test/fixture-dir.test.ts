import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

describe("fixture-dir helpers (LH-03)", () => {
    it("createFixtureDir returns a real, existing directory", async () => {
        const dir = await createFixtureDir("fixture-dir-create");
        const stat = await fs.stat(dir);
        expect(stat.isDirectory()).toBe(true);
        await removeFixtureDir(dir);
    });

    it("removeFixtureDir removes a populated directory tree", async () => {
        const dir = await createFixtureDir("fixture-dir-remove");
        await fs.mkdir(join(dir, "nested"), { recursive: true });
        await fs.writeFile(join(dir, "nested", "file.txt"), "content");
        await removeFixtureDir(dir);
        await expect(fs.stat(dir)).rejects.toThrow();
    });

    it("removeFixtureDir is a no-op on an already-absent directory", async () => {
        const dir = await createFixtureDir("fixture-dir-absent");
        await removeFixtureDir(dir);
        await expect(removeFixtureDir(dir)).resolves.toBeUndefined();
    });

    // Empirical-first (per the epic): before wiring maxRetries/retryDelay in, tried to
    // stress-reproduce the Windows ENOTEMPTY/EBUSY race in-process -- a held-open
    // node:fs.createReadStream handle, and a raw write file descriptor via
    // fs.openSync(path, "r+"), both left open across the rm call. Neither blocked
    // directory deletion on this Node/Windows combination: both `fs.rm` calls
    // succeeded immediately even with the handle still open, contradicting the
    // assumption that an open handle is what causes the race. The real trigger is
    // almost certainly external (a virus scanner or search indexer briefly locking a
    // just-written file at the filesystem level), which isn't reproducible
    // deterministically in-process without one actually installed and scanning. This
    // suite verifies the plumbing instead: that the options are threaded through
    // correctly and that fs.rm's own documented retry behavior actually taking longer
    // than a single attempt does not change the outcome for the normal case.
    it("passes maxRetries/retryDelay through to fs.rm rather than a bare recursive/force call", async () => {
        const rmSpy = vi.spyOn(fs, "rm");
        const dir = await createFixtureDir("fixture-dir-options");
        await removeFixtureDir(dir);
        expect(rmSpy).toHaveBeenCalledWith(dir, {
            recursive: true,
            force: true,
            maxRetries: 5,
            retryDelay: 200,
        });
        rmSpy.mockRestore();
    });
});
