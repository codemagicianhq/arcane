/**
 * Fetches one file's content from a specific PUBLISHED version of this
 * package (ARC-038 decision 1) -- the merge base for `spell update`'s
 * content-preserving update, without vendoring a second copy of every past
 * release: npm's own registry already permanently retains every published
 * tarball.
 *
 * npm's registry API has no "browse one file from one version" endpoint, and
 * hand-rolling tarball extraction for a read-one-file use case is a
 * correctness risk this project has no existing dependency to cover safely.
 * unpkg.com serves directly from that same registry tarball, so this reaches
 * the identical permanent history the ADR describes, through a widely-used,
 * purpose-built CDN rather than new vendoring infrastructure. Resolved
 * in-implementation (ARC-038 left the exact fetch mechanism open); no local
 * caching, also resolved in-implementation -- within one `spell update` run
 * each (version, file) pair is fetched at most once already, and this
 * command runs rarely enough that cross-run caching is not worth the extra
 * invalidation surface.
 */
const NPM_PACKAGE_NAME = "arcane-cli";

/**
 * Returns the file's text content, or `undefined` if it could not be
 * fetched (network failure, non-2xx response, or any other error) --
 * callers must treat `undefined` as "cannot verify what changed," never as
 * "no prior content," since silently treating a fetch failure as an empty
 * base would make the merge invent a huge fake diff instead of correctly
 * refusing to guess.
 */
export async function fetchPublishedFile(
  version: string,
  relativeAssetPath: string,
): Promise<string | undefined> {
  const normalized = relativeAssetPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const url = `https://unpkg.com/${NPM_PACKAGE_NAME}@${version}/dist/assets/${normalized}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return await response.text();
  } catch {
    return undefined;
  }
}
