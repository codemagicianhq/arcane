import { dirname } from "node:path";
import {
  readManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import {
  checkForUpdate,
  getFeedUrl,
} from "../modules/version-check.js";
import { generateVersionDriftDiagram } from "../modules/diagram-generator.js";
import {
  CLAUDE_PRECEDENCE_NOTE,
  FANOUT_CLIENT_LABELS,
  VSCODE_USER_TIER_NOTE,
  inspectUserTierFanout,
  misplacedUserManifestMessage,
  resolveInstallScope,
  userTierRoot,
} from "../modules/user-tier.js";
import type { InstallScope } from "../types.js";

/**
 * Runs the `spell status` command.
 *
 * Reads .arcane.json, checks for an available update, then prints
 * a formatted table of installed components + a version footer.
 *
 * @param targetDir  Directory containing the Arcane installation (the
 *   `~/.arcane` store when `options.user` is set)
 * @param packageVersion  Current package version string
 * @param options.user  Report on the per-user tier instead of a repository (CS-04)
 */
export async function runStatus(
  targetDir: string,
  packageVersion: string,
  options: { user?: boolean } = {},
): Promise<void> {
  // Read existing manifest
  let manifest;
  try {
    manifest = await readManifest(targetDir);
  } catch (err) {
    if (err instanceof ManifestNotFoundError) {
      console.error(
        `Not initialized. Run "spell init${options.user ? " --user" : ""}" first.`,
      );
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw err;
  }

  const resolvedScope = resolveInstallScope(targetDir, manifest.scope, options.user);
  if (resolvedScope.misplacedUserManifest) {
    console.error(misplacedUserManifestMessage(targetDir));
    process.exit(1);
    return;
  }
  const scope: InstallScope = resolvedScope.scope;

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

  // ─── Scope (ARC-045 decision 3 / CS-04) ────────────────────────────────────
  // Which tier this manifest is, and -- for the user tier -- the state of the
  // client files it fanned out beyond the store; for a repository, whether a
  // user tier exists on this machine at all, since Claude Code will prefer
  // its copy of a same-named command (D7 in the CS-04 architecture).

  console.log("");
  if (scope === "user") {
    console.log(`  Scope: user — ${targetDir}`);
    const health = await inspectUserTierFanout(dirname(targetDir), manifest.fanout);
    console.log(
      `  Client files: ${health.total} (${health.byClient.codex} ${FANOUT_CLIENT_LABELS.codex}, ${health.byClient.claude} ${FANOUT_CLIENT_LABELS.claude})`,
    );
    if (health.missing.length > 0 || health.customized.length > 0) {
      const parts: string[] = [];
      if (health.missing.length > 0) parts.push(`${health.missing.length} missing`);
      if (health.customized.length > 0) parts.push(`${health.customized.length} customized`);
      console.log(
        `  ! ${parts.join(", ")} — \`spell update --user\` regenerates missing files; customized files are never overwritten.`,
      );
    }
  } else {
    console.log("  Scope: repo");
    try {
      const store = userTierRoot();
      const userManifest = await readManifest(store);
      console.log(`  User tier: v${userManifest.version} at ${store} (spell status --user)`);
    } catch {
      // No user tier on this machine (or an unreadable one -- `spell doctor`
      // reports that); nothing to add here.
    }
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

  // ─── Version-drift diagram (ARC-036 R8) ────────────────────────────────────
  // Axis A (repo-files vs installed CLI) needs no network call and is always
  // checkable. Axis B (installed CLI vs npm-latest) needs versionResult.latest,
  // which is null when the npm check failed — skip the diagram entirely in
  // that case rather than showing a partial, potentially misleading picture;
  // the "Latest: unable to check" footer above already covers that failure.
  if (versionResult.latest !== null) {
    const diagram = generateVersionDriftDiagram(
      manifest.version,
      packageVersion,
      versionResult.latest,
    );

    if (diagram !== null) {
      console.log("");
      if (process.stdout.isTTY) {
        // Interactive terminal: a fenced Mermaid block doesn't render here —
        // print the same three readings as plain aligned text instead.
        console.log("  Version drift:");
        console.log(`    repo-files:    ${manifest.version}`);
        console.log(`    installed-cli: ${packageVersion}`);
        console.log(`    latest (npm):  ${versionResult.latest}`);
      } else {
        // Piped (file, another tool, a captured PR body): emit the real
        // diagram so the redirected output is directly usable.
        console.log("```mermaid");
        console.log(diagram);
        console.log("```");
      }
    }
  }

  if (scope === "user") {
    console.log("");
    for (const line of VSCODE_USER_TIER_NOTE) console.log(`  ${line}`);
    console.log(`  ${CLAUDE_PRECEDENCE_NOTE}`);
  }
}
