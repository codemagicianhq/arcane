/**
 * The versions section, computed once (ARC-044 consequence 1, architecture
 * D3). `spell status` and `spell state --json` both call `collectVersions`;
 * neither reads the manifest's version or calls the npm lookup on its own.
 *
 * The npm lookup runs only when `online` is true and goes through
 * `checkForUpdate`, whose 24-hour cache under `~/.arcane/` is reused
 * unchanged. Offline, `latest` and `drift.cli_behind_latest` are null and no
 * network request is made (PRD ST-13).
 */

import type { ArcaneManifest, VersionCheckResult } from "../../types.js";
import { checkForUpdate, getFeedUrl } from "../version-check.js";
import type { VersionsSection } from "./types.js";

export interface CollectVersionsOptions {
  /** Look up the latest published version. Off by default: a plain run makes no network request. */
  online: boolean;
  /** Overrides the package's publishConfig.registry; tests point it at a fake. */
  feedUrl?: string;
  /** Overrides `checkForUpdate`'s cache file; tests point it at a temp path. */
  cachePath?: string;
}

export interface CollectVersionsResult {
  versions: VersionsSection;
  /** One line when the lookup was attempted and gave no answer. */
  warnings: string[];
  /**
   * The raw lookup result, for callers that render it (`spell status`'s
   * footer distinguishes "unable to check" from a plain null). Null when the
   * lookup did not run.
   */
  lookup: VersionCheckResult | null;
}

/**
 * Semantic-version order on the `major.minor.patch` core: negative when `a`
 * is older than `b`, zero when equal, positive when newer. A pre-release
 * suffix ranks below the same core with no suffix, and two suffixes compare
 * as strings; nothing in this repository publishes pre-releases, so that is
 * enough. A string that is not a version compares as a plain string, so
 * the result is still deterministic.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(v);
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return a < b ? -1 : a > b ? 1 : 0;
  for (let i = 1; i <= 3; i++) {
    const diff = Number(pa[i]) - Number(pb[i]);
    if (diff !== 0) return diff;
  }
  const sa = pa[4];
  const sb = pb[4];
  if (sa === sb) return 0;
  if (sa === undefined) return 1;
  if (sb === undefined) return -1;
  return sa < sb ? -1 : 1;
}

export async function collectVersions(
  manifest: ArcaneManifest,
  packageVersion: string,
  options: CollectVersionsOptions,
): Promise<CollectVersionsResult> {
  const warnings: string[] = [];
  let lookup: VersionCheckResult | null = null;

  if (options.online) {
    let feedUrl = options.feedUrl ?? "";
    if (feedUrl === "") {
      try {
        feedUrl = getFeedUrl();
      } catch {
        feedUrl = "";
      }
    }
    lookup = feedUrl
      ? await checkForUpdate(packageVersion, feedUrl, options.cachePath)
      : { current: packageVersion, latest: null, updateAvailable: false, error: "Feed URL unavailable" };
    if (lookup.latest === null) {
      warnings.push(
        `versions.latest: the npm lookup gave no answer${lookup.error ? ` (${lookup.error})` : ""}; latest and drift.cli_behind_latest are null`,
      );
    }
  }

  const latest = lookup?.latest ?? null;
  const versions: VersionsSection = {
    files: manifest.version,
    cli: packageVersion,
    latest,
    drift: {
      files_behind_cli: compareVersions(manifest.version, packageVersion) < 0,
      cli_behind_latest: latest === null ? null : compareVersions(packageVersion, latest) < 0,
    },
    components: manifest.components
      .map((component) => ({ name: component.name, installedVersion: component.installedVersion }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
  };

  return { versions, warnings, lookup };
}
