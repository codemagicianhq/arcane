import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import type { VersionCheckResult } from "../types.js";

const require = createRequire(import.meta.url);

interface PackageJson {
  publishConfig?: { registry?: string };
}

/** Read the feed URL from the package's own publishConfig.registry — never hardcoded. */
export function getFeedUrl(): string {
  const pkg = require("../../package.json") as PackageJson;
  const url = pkg.publishConfig?.registry;
  if (!url) {
    throw new Error(
      "publishConfig.registry is not set in package.json. Cannot resolve npm feed URL.",
    );
  }
  return url;
}

const DEFAULT_CACHE_PATH = join(homedir(), ".arcane", "version-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  latest: string;
  checkedAt: string;
}

/**
 * Reads the version cache file. Returns null if missing or malformed.
 */
export async function readCache(
  cachePath: string,
): Promise<CacheEntry | null> {
  try {
    const content = await readFile(cachePath, "utf-8");
    const parsed = JSON.parse(content) as CacheEntry;
    if (typeof parsed.latest !== "string" || typeof parsed.checkedAt !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Writes the version cache file, creating parent directories as needed.
 */
export async function writeCache(
  cachePath: string,
  latest: string,
): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  const entry: CacheEntry = { latest, checkedAt: new Date().toISOString() };
  await writeFile(cachePath, JSON.stringify(entry, null, 2), "utf-8");
}

/**
 * Fetches the latest published version of arcane-cli from the public npm
 * registry. Returns null (does not throw) on any network failure.
 */
export async function getLatestVersion(feedUrl: string): Promise<string | null> {
  const normalizedBase = feedUrl.endsWith("/") ? feedUrl : feedUrl + "/";
  const url = `${normalizedBase}arcane-cli`;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body = await response.json() as { "dist-tags"?: { latest?: string } };
    return body["dist-tags"]?.latest ?? null;
  } catch {
    return null;
  }
}

/**
 * Checks for a newer version of the package, using a 24h file cache.
 * Never throws — errors are captured in VersionCheckResult.error.
 */
export async function checkForUpdate(
  currentVersion: string,
  feedUrl: string,
  cachePath: string = DEFAULT_CACHE_PATH,
): Promise<VersionCheckResult> {
  try {
    let latest: string | null = null;

    const cached = await readCache(cachePath);
    if (cached) {
      const age = Date.now() - new Date(cached.checkedAt).getTime();
      if (age < CACHE_TTL_MS) {
        latest = cached.latest;
      }
    }

    if (latest === null) {
      latest = await getLatestVersion(feedUrl);
      if (latest !== null) {
        try {
          await writeCache(cachePath, latest);
        } catch {
          // Cache write failure is non-fatal
        }
      }
    }

    return {
      current: currentVersion,
      latest,
      updateAvailable: latest !== null && latest !== currentVersion,
    };
  } catch (err) {
    return {
      current: currentVersion,
      latest: null,
      updateAvailable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
