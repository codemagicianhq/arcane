/**
 * Generates the canonical version-drift gitGraph diagram (ARC-036, R2) from
 * the three already-computed version readings. Pure — no I/O, no network
 * calls. Mirrors spell-open-session.prompt.md's "Arcane version check
 * (two-axis)" template exactly, so the CLI (`spell status`) and the prompt
 * produce the identical shape from the same three inputs.
 */

/**
 * Returns the gitGraph body (no ```mermaid fence — the caller chooses
 * fencing per R5) for the three-reading version-drift diagram, or `null`
 * when all three readings match (the applicability guard — nothing to
 * visualize for a single, matching reading).
 *
 * One commit per *distinct* value among the three readings, in
 * repo-files -> installed-CLI -> npm-latest order; a consecutive repeated
 * value collapses into its neighbor's commit rather than repeating it.
 * Branches off after the commit for each axis that drifts.
 */
export function generateVersionDriftDiagram(
  repoFilesVersion: string,
  installedCliVersion: string,
  npmLatestVersion: string,
): string | null {
  if (
    repoFilesVersion === installedCliVersion &&
    installedCliVersion === npmLatestVersion
  ) {
    return null;
  }

  const lines = ["gitGraph", `   commit id: "${repoFilesVersion}"`];
  let lastDistinctVersion = repoFilesVersion;

  if (installedCliVersion !== repoFilesVersion) {
    lines.push(
      "   branch repo-files",
      "   checkout main",
      `   commit id: "${installedCliVersion}"`,
    );
    lastDistinctVersion = installedCliVersion;
  }

  if (npmLatestVersion !== lastDistinctVersion) {
    lines.push(
      "   branch installed-cli",
      "   checkout main",
      `   commit id: "${npmLatestVersion}" tag: "latest"`,
    );
  } else {
    lines[lines.length - 1] += ' tag: "latest"';
  }

  return lines.join("\n");
}
