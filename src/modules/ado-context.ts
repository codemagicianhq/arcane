import { runGit } from "./git.js";

/**
 * "ADO context" for the CLI (PRD D-03, #278): a configured remote hosted on
 * Azure DevOps. A remote host is the only ADO signal a CLI can read
 * deterministically before any PRD exists, so it is the whole definition.
 * It only pre-selects an answer; the operator is still asked.
 */

/** Host of a git remote URL, lower-cased, for both URL and scp-like (`user@host:path`) forms. */
export function remoteUrlHost(url: string): string | undefined {
  const trimmed = url.trim();
  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname.toLowerCase() || undefined;
    } catch {
      return undefined;
    }
  }
  // scp-like syntax; a Windows drive letter ("C:\repo") is a path, not a host.
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):/.exec(trimmed);
  if (!scp || /^[a-zA-Z]$/.test(scp[1]!)) return undefined;
  return scp[1]!.toLowerCase();
}

/**
 * dev.azure.com, including its `ssh.dev.azure.com` SSH endpoint, or any
 * `*.visualstudio.com` (the legacy `org.visualstudio.com` and
 * `vs-ssh.visualstudio.com` forms). Suffix-matched on a dot boundary so a
 * look-alike such as `dev.azure.com.example.net` does not count.
 */
export function isAdoRemoteUrl(url: string): boolean {
  const host = remoteUrlHost(url);
  if (host === undefined) return false;
  return host === "dev.azure.com" || host.endsWith(".dev.azure.com") || host.endsWith(".visualstudio.com");
}

/** True when any configured remote's URL is on Azure DevOps. */
export async function detectAdoContext(targetDir: string): Promise<boolean> {
  let stdout: string;
  try {
    ({ stdout } = await runGit(targetDir, ["config", "--get-regexp", "^remote\\..*\\.url$"]));
  } catch {
    // Exit 1 (no remote), or not a repository: no ADO context.
    return false;
  }
  return stdout
    .split("\n")
    .map((line) => line.slice(line.indexOf(" ") + 1))
    .some((url) => url.trim() !== "" && isAdoRemoteUrl(url));
}
