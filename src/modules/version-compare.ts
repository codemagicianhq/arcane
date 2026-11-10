/**
 * Semantic-version order on the `major.minor.patch` core: negative when `a`
 * is older than `b`, zero when equal, positive when newer. A pre-release
 * suffix ranks below the same core with no suffix, and two suffixes compare
 * as strings; nothing in this repository publishes pre-releases, so that is
 * enough. A string that is not a version compares as a plain string, so
 * the result is still deterministic.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(v);
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
