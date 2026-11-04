/**
 * The pull-request lookup (PRD ST-04, ST-13; architecture D8): the open pull
 * request for the current branch, read through the provider's CLI -- `gh pr
 * list` for a GitHub remote, `az repos pr list` for an Azure DevOps remote,
 * launched through `resolveAzureCli` so no shell ever reads a remote URL.
 * Both run under `execFileWithTimeout` and its `EXTERNAL_CLI_TIMEOUT_MS`
 * budget, the same path `spell doctor`'s platform-policy checks use. A
 * network read, so it runs only under `--online`; a missing tool, no
 * authentication, a non-zero exit, unparseable output or a timeout all yield
 * null plus one warning and exit 0.
 */

import { EXTERNAL_CLI_TIMEOUT_MS, execFileWithTimeout, resolveAzureCli, type AzureCliLaunch, type ExecResult } from "../exec.js";
import type { GitSection, PullRequestRef } from "./types.js";

export type ExecFn = (file: string, args: string[], timeoutMs: number, options?: { env?: NodeJS.ProcessEnv }) => Promise<ExecResult>;

export interface CollectPullRequestOptions {
  /** The process runner; tests inject one. */
  exec?: ExecFn;
  /** How to start the Azure CLI; tests inject one. */
  azureLaunch?: AzureCliLaunch;
}

export interface CollectPullRequestResult {
  pull_request: PullRequestRef | null;
  warnings: string[];
}

export interface AdoCoordinates {
  org: string;
  project: string;
  repo: string;
}

/** `org`, `project` and `repo` from an Azure DevOps remote URL in any of its three forms, or null. */
export function parseAdoRemote(url: string): AdoCoordinates | null {
  const https = /^https?:\/\/(?:[^@/]*@)?dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/?#]+)/i.exec(url);
  if (https) return { org: https[1], project: decodeURIComponent(https[2]), repo: decodeURIComponent(https[3]) };
  const legacy = /^https?:\/\/(?:[^@/]*@)?([^./]+)\.visualstudio\.com\/(?:DefaultCollection\/)?([^/]+)\/_git\/([^/?#]+)/i.exec(url);
  if (legacy) return { org: legacy[1], project: decodeURIComponent(legacy[2]), repo: decodeURIComponent(legacy[3]) };
  const ssh = /^(?:ssh:\/\/)?git@(?:ssh\.|vs-ssh\.)?(?:dev\.azure\.com|visualstudio\.com)[:/]v3\/([^/]+)\/([^/]+)\/([^/?#]+)/i.exec(url);
  if (ssh) return { org: ssh[1], project: decodeURIComponent(ssh[2]), repo: decodeURIComponent(ssh[3]) };
  return null;
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return "the CLI is not installed";
    if ((error as { killed?: boolean }).killed) return `timed out after ${EXTERNAL_CLI_TIMEOUT_MS}ms`;
    return error.message.split("\n")[0];
  }
  return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function lookupGitHub(branch: string, exec: ExecFn): Promise<CollectPullRequestResult> {
  let stdout: string;
  try {
    ({ stdout } = await exec("gh", ["pr", "list", "--head", branch, "--state", "open", "--json", "number,url,state"], EXTERNAL_CLI_TIMEOUT_MS));
  } catch (error) {
    return { pull_request: null, warnings: [`git.pull_request: gh pr list failed (${describe(error)})`] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { pull_request: null, warnings: ["git.pull_request: gh pr list printed something other than JSON"] };
  }
  if (!Array.isArray(parsed)) return { pull_request: null, warnings: ["git.pull_request: gh pr list printed something other than a list"] };
  const first = parsed.find(isRecord);
  if (!first) return { pull_request: null, warnings: [] };
  if (typeof first["number"] !== "number" || typeof first["url"] !== "string" || typeof first["state"] !== "string") {
    return { pull_request: null, warnings: ["git.pull_request: gh pr list printed an entry without number, url and state"] };
  }
  return { pull_request: { id: first["number"], url: first["url"], state: first["state"] }, warnings: [] };
}

async function lookupAdo(branch: string, remoteUrl: string, exec: ExecFn, launch: AzureCliLaunch): Promise<CollectPullRequestResult> {
  const coordinates = parseAdoRemote(remoteUrl);
  if (!coordinates) {
    return { pull_request: null, warnings: ["git.pull_request: the Azure DevOps remote URL names no organization, project and repository"] };
  }
  const orgUrl = `https://dev.azure.com/${coordinates.org}`;
  let stdout: string;
  try {
    ({ stdout } = await exec(
      launch.file,
      [
        ...launch.prefixArgs,
        "repos",
        "pr",
        "list",
        "--source-branch",
        branch,
        "--status",
        "active",
        "--org",
        orgUrl,
        "--project",
        coordinates.project,
        "--repository",
        coordinates.repo,
        "--output",
        "json",
      ],
      EXTERNAL_CLI_TIMEOUT_MS,
      launch.env ? { env: launch.env } : {},
    ));
  } catch (error) {
    return { pull_request: null, warnings: [`git.pull_request: az repos pr list failed (${describe(error)})`] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { pull_request: null, warnings: ["git.pull_request: az repos pr list printed something other than JSON"] };
  }
  if (!Array.isArray(parsed)) return { pull_request: null, warnings: ["git.pull_request: az repos pr list printed something other than a list"] };
  const first = parsed.find(isRecord);
  if (!first) return { pull_request: null, warnings: [] };
  const id = first["pullRequestId"];
  const status = first["status"];
  if (typeof id !== "number" || typeof status !== "string") {
    return { pull_request: null, warnings: ["git.pull_request: az repos pr list printed an entry without pullRequestId and status"] };
  }
  return {
    pull_request: {
      id,
      url: `${orgUrl}/${encodeURIComponent(coordinates.project)}/_git/${encodeURIComponent(coordinates.repo)}/pullrequest/${id}`,
      state: status,
    },
    warnings: [],
  };
}

export async function collectPullRequest(git: GitSection, options: CollectPullRequestOptions = {}): Promise<CollectPullRequestResult> {
  const exec = options.exec ?? execFileWithTimeout;
  if (git.remote === null) return { pull_request: null, warnings: [] };
  if (git.branch === null || git.detached) {
    return { pull_request: null, warnings: ["git.pull_request: no branch is checked out, so there is nothing to look up"] };
  }
  switch (git.remote.provider) {
    case "github":
      return lookupGitHub(git.branch, exec);
    case "ado":
      return lookupAdo(git.branch, git.remote.url, exec, options.azureLaunch ?? resolveAzureCli());
    default:
      return { pull_request: null, warnings: [`git.pull_request: no pull-request lookup for a ${git.remote.provider} remote`] };
  }
}
