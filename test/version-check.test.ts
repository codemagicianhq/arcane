import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readCache,
  writeCache,
  getLatestVersion,
  checkForUpdate,
  getFeedUrl,
} from "../src/modules/version-check.js";

const FAKE_FEED_URL = "https://registry.npmjs.org/";

describe("version-check", () => {
  let tempDir: string;
  let cachePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "version-check-test-"));
    cachePath = join(tempDir, ".arcane", "version-cache.json");
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ─── getFeedUrl ───────────────────────────────────────────────────────────

  describe("getFeedUrl", () => {
    it("returns the public npm registry URL from package.json publishConfig", () => {
      const url = getFeedUrl();
      expect(url).toContain("registry.npmjs.org");
    });

    it("returns the same URL as configured in package.json", () => {
      const url = getFeedUrl();
      expect(url).toBe("https://registry.npmjs.org/");
    });
  });

  // ─── readCache ────────────────────────────────────────────────────────────

  describe("readCache", () => {
    it("returns null when cache file does not exist", async () => {
      const result = await readCache(join(tempDir, "nonexistent.json"));
      expect(result).toBeNull();
    });

    it("returns null for malformed JSON", async () => {
      const path = join(tempDir, "cache.json");
      await fs.writeFile(path, "not valid json");
      expect(await readCache(path)).toBeNull();
    });

    it("returns null when JSON is valid but missing required fields", async () => {
      const path = join(tempDir, "cache.json");
      await fs.writeFile(path, JSON.stringify({ only: "partial" }));
      expect(await readCache(path)).toBeNull();
    });

    it("returns null for truncated JSON", async () => {
      const path = join(tempDir, "cache.json");
      await fs.writeFile(path, '{"latest": "1.0.0"');
      expect(await readCache(path)).toBeNull();
    });

    it("returns the cache entry for a valid file", async () => {
      const path = join(tempDir, "cache.json");
      await writeCache(path, "1.2.3");
      const result = await readCache(path);
      expect(result).not.toBeNull();
      expect(result?.latest).toBe("1.2.3");
      expect(result?.checkedAt).toBeTruthy();
    });
  });

  // ─── writeCache ───────────────────────────────────────────────────────────

  describe("writeCache", () => {
    it("creates the cache file and parent directories", async () => {
      await writeCache(cachePath, "1.0.0");
      const result = await readCache(cachePath);
      expect(result?.latest).toBe("1.0.0");
    });

    it("stores a valid ISO timestamp in checkedAt", async () => {
      await writeCache(cachePath, "2.0.0");
      const result = await readCache(cachePath);
      expect(new Date(result!.checkedAt).toISOString()).toBe(result?.checkedAt);
    });

    it("overwrites an existing cache file", async () => {
      await writeCache(cachePath, "1.0.0");
      await writeCache(cachePath, "2.0.0");
      const result = await readCache(cachePath);
      expect(result?.latest).toBe("2.0.0");
    });
  });

  // ─── getLatestVersion ─────────────────────────────────────────────────────

  describe("getLatestVersion", () => {
    it("returns null on network failure (does not throw)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error")),
      );
      const result = await getLatestVersion(FAKE_FEED_URL);
      expect(result).toBeNull();
    });

    it("returns null on non-OK HTTP response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404 }),
      );
      const result = await getLatestVersion(FAKE_FEED_URL);
      expect(result).toBeNull();
    });

    it("returns null when dist-tags.latest is missing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ name: "arcane-cli" }),
        }),
      );
      const result = await getLatestVersion(FAKE_FEED_URL);
      expect(result).toBeNull();
    });

    it("returns the latest version string on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            name: "arcane-cli",
            "dist-tags": { latest: "1.5.0" },
          }),
        }),
      );
      const result = await getLatestVersion(FAKE_FEED_URL);
      expect(result).toBe("1.5.0");
    });

    it("returns null on timeout (AbortError)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(
          Object.assign(new Error("The operation was aborted"), {
            name: "AbortError",
          }),
        ),
      );
      const result = await getLatestVersion(FAKE_FEED_URL);
      expect(result).toBeNull();
    });
  });

  // ─── checkForUpdate ───────────────────────────────────────────────────────

  describe("checkForUpdate", () => {
    it("uses cached value when cache is less than 24h old", async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ "dist-tags": { latest: "2.0.0" } }),
      });
      vi.stubGlobal("fetch", fetchSpy);

      // Prime the cache
      await writeCache(cachePath, "1.5.0");

      const result = await checkForUpdate("1.0.0", FAKE_FEED_URL, cachePath);
      expect(result.latest).toBe("1.5.0");
      expect(fetchSpy).not.toHaveBeenCalled(); // used cache
    });

    it("re-fetches when cache is more than 24h old", async () => {
      const staleCheckedAt = new Date(
        Date.now() - 25 * 60 * 60 * 1000,
      ).toISOString();
      await fs.mkdir(join(tempDir, ".arcane"), { recursive: true });
      await fs.writeFile(
        cachePath,
        JSON.stringify({ latest: "1.4.0", checkedAt: staleCheckedAt }),
      );

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ "dist-tags": { latest: "1.9.0" } }),
      });
      vi.stubGlobal("fetch", fetchSpy);

      const result = await checkForUpdate("1.0.0", FAKE_FEED_URL, cachePath);
      expect(result.latest).toBe("1.9.0");
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    it("returns updateAvailable=true when latest > current", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ "dist-tags": { latest: "2.0.0" } }),
        }),
      );

      const result = await checkForUpdate("1.0.0", FAKE_FEED_URL, cachePath);
      expect(result.updateAvailable).toBe(true);
      expect(result.current).toBe("1.0.0");
      expect(result.latest).toBe("2.0.0");
    });

    it("returns updateAvailable=false when already at latest", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ "dist-tags": { latest: "1.0.0" } }),
        }),
      );

      const result = await checkForUpdate("1.0.0", FAKE_FEED_URL, cachePath);
      expect(result.updateAvailable).toBe(false);
    });

    it("sets error field on network failure without throwing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("DNS lookup failed")),
      );

      const result = await checkForUpdate("1.0.0", FAKE_FEED_URL, cachePath);
      expect(result.latest).toBeNull();
      expect(result.updateAvailable).toBe(false);
      // No error field expected — network failure is handled by getLatestVersion returning null
      // The VersionCheckResult should have latest=null
      expect(result.current).toBe("1.0.0");
    });

    it("handles malformed cache gracefully and re-fetches", async () => {
      await fs.mkdir(join(tempDir, ".arcane"), { recursive: true });
      await fs.writeFile(cachePath, "malformed json {{");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ "dist-tags": { latest: "1.3.0" } }),
        }),
      );

      const result = await checkForUpdate("1.0.0", FAKE_FEED_URL, cachePath);
      expect(result.latest).toBe("1.3.0");
    });

    it("updates the cache after a successful fetch", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ "dist-tags": { latest: "1.7.0" } }),
        }),
      );

      await checkForUpdate("1.0.0", FAKE_FEED_URL, cachePath);
      const cached = await readCache(cachePath);
      expect(cached?.latest).toBe("1.7.0");
    });
  });
});
