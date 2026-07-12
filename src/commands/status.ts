import {
  readManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import {
  checkForUpdate,
  getFeedUrl,
} from "../modules/version-check.js";

/**
 * Runs the `spell status` command.
 *
 * Reads .arcane.json, checks for an available update, then prints
 * a formatted table of installed components + a version footer.
 *
 * @param targetDir  Directory containing the Arcane installation
 * @param packageVersion  Current package version string
 */
export async function runStatus(
  targetDir: string,
  packageVersion: string,
): Promise<void> {
  // Read existing manifest
  let manifest;
  try {
    manifest = await readManifest(targetDir);
  } catch (err) {
    if (err instanceof ManifestNotFoundError) {
      console.error(
        'Not initialized. Run "spell init" first.',
      );
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw err;
  }

  if (manifest.components.length === 0) {
    console.log("No components installed.");
    return;
  }

  // Check for update (never throws)
  let feedUrl: string;
  try {
    feedUrl = getFeedUrl();
  } catch {
    feedUrl = "";
  }

  const versionResult = feedUrl
    ? await checkForUpdate(packageVersion, feedUrl)
    : { current: packageVersion, latest: null, updateAvailable: false, error: "Feed URL unavailable" };

  // ─── Print component table ─────────────────────────────────────────────────

  // Compute column widths
  const nameWidth = Math.max(
    "Component".length,
    ...manifest.components.map((c) => c.name.length),
  );
  const filesWidth = "Files".length;
  const versionWidth = Math.max(
    "Version".length,
    ...manifest.components.map((c) => c.installedVersion.length),
  );

  const pad = (s: string, n: number) => s.padEnd(n);
  const rpad = (s: string, n: number) => s.padStart(n);

  console.log(
    `  ${pad("Component", nameWidth)}  ${rpad("Files", filesWidth)}  ${pad("Version", versionWidth)}`,
  );
  console.log(
    `  ${"-".repeat(nameWidth)}  ${"-".repeat(filesWidth)}  ${"-".repeat(versionWidth)}`,
  );

  for (const component of manifest.components) {
    const label = component.name;
    const fileCount = component.files.length.toString();
    const displayVersion = component.installedVersion;
    console.log(
      `  ${pad(label, nameWidth)}  ${rpad(fileCount, filesWidth)}  ${displayVersion}`,
    );
  }

  // ─── Version footer ────────────────────────────────────────────────────────

  console.log("");

  const latestStr = versionResult.error
    ? "unable to check"
    : (versionResult.latest ?? manifest.version);

  let footer = `  Installed: ${packageVersion}  Latest: ${latestStr}`;

  if (versionResult.updateAvailable) {
    footer += "  (spell update available)";
  }

  console.log(footer);
}
