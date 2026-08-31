/**
 * Platform branch/merge policy verification (T11/BC-17).
 *
 * Report-only: nothing here mutates a repository or organization setting.
 * Rule-interpretation logic is split into pure functions taking
 * already-fetched JSON (evaluate*) so it is unit-testable with fixture
 * data, separate from the thin CLI-invocation wrappers (fetch*) that are
 * not exercised in CI (no live GitHub/ADO credentials to test against).
 *
 * GitHub Rulesets path is live-verified against this repo's own real
 * ruleset. The Azure DevOps path is implemented from documented API
 * shape only -- this repo has no ADO remote to test against -- and that
 * limitation is disclosed here rather than presented as verified.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ─── Declared ladder (git-conventions.md § Merge Strategy by Repo Risk) ──────

export type MergeMethod = "merge" | "squash" | "rebase";
export const SANCTIONED_MERGE_METHODS: readonly MergeMethod[] = ["merge", "rebase"];

export interface PolicyEvaluation {
  passed: boolean;
  /** null when no policy/ruleset was found to evaluate at all. */
  effectiveMergeMethods: MergeMethod[] | null;
  /** Methods the raw config nominally allows but a separate rule silently blocks. */
  declaredButBlocked: MergeMethod[];
  /** Methods effectively permitted despite never being sanctioned. */
  disallowedButPermitted: MergeMethod[];
  message: string;
}

function compareToLadder(
  effective: MergeMethod[],
  declaredButBlocked: MergeMethod[],
  interactionNote?: string,
): PolicyEvaluation {
  const disallowedButPermitted = effective.filter(
    (m) => !SANCTIONED_MERGE_METHODS.includes(m),
  );
  const missingSanctioned = SANCTIONED_MERGE_METHODS.filter(
    (m) => !effective.includes(m),
  );
  const passed = disallowedButPermitted.length === 0 && missingSanctioned.length === 0;

  const messages: string[] = [];
  if (interactionNote) messages.push(interactionNote);
  if (disallowedButPermitted.length > 0) {
    messages.push(
      `disallowed method(s) effectively permitted: ${disallowedButPermitted.join(", ")} (never sanctioned per git-conventions.md)`,
    );
  }
  if (missingSanctioned.length > 0) {
    messages.push(
      `sanctioned method(s) not effectively available: ${missingSanctioned.join(", ")}`,
    );
  }

  return {
    passed,
    effectiveMergeMethods: effective,
    declaredButBlocked,
    disallowedButPermitted,
    message: passed
      ? `effective merge methods [${effective.join(", ")}] match the declared ladder`
      : messages.join("; "),
  };
}

// ─── GitHub Rulesets ──────────────────────────────────────────────────────────

export interface GitHubRulesetRule {
  type: string;
  parameters?: Record<string, unknown>;
}

export interface GitHubRuleset {
  id: number;
  target: string;
  enforcement: string;
  rules: GitHubRulesetRule[];
}

/**
 * Pure evaluation: given already-fetched ruleset detail JSON for the rulesets
 * covering the target branch, determines the EFFECTIVE merge-method policy.
 *
 * Detects the interaction this repo's own 2026-08-24/25 incident found:
 * a `required_linear_history` rule silently blocks merge-commit PRs
 * regardless of what a `pull_request` rule's `allowed_merge_methods`
 * parameter declares.
 */
export function evaluateGitHubMergePolicy(
  rulesets: GitHubRuleset[],
): PolicyEvaluation {
  const active = rulesets.filter(
    (r) => r.enforcement === "active" && r.target === "branch",
  );

  if (active.length === 0) {
    return {
      passed: false,
      effectiveMergeMethods: null,
      declaredButBlocked: [],
      disallowedButPermitted: [],
      message:
        "No active branch ruleset covers the target branch (checked via Rulesets, not the classic protection endpoint, which false-negatives on Rulesets-only repos).",
    };
  }

  // GitHub applies the most restrictive union when multiple rulesets target
  // the same ref -- intersect allowed_merge_methods across all of them.
  let allowedMergeMethods: MergeMethod[] | null = null;
  let hasRequiredLinearHistory = false;

  for (const ruleset of active) {
    for (const rule of ruleset.rules) {
      if (rule.type === "required_linear_history") {
        hasRequiredLinearHistory = true;
      }
      if (rule.type === "pull_request") {
        const methods = rule.parameters?.["allowed_merge_methods"];
        if (Array.isArray(methods)) {
          const typed = methods as MergeMethod[];
          allowedMergeMethods =
            allowedMergeMethods === null
              ? typed
              : allowedMergeMethods.filter((m) => typed.includes(m));
        }
      }
    }
  }

  // No pull_request rule set allowed_merge_methods at all -- GitHub's
  // platform default (all three methods) applies, which is never compliant.
  const nominal = allowedMergeMethods ?? ["merge", "squash", "rebase"];
  const effective = hasRequiredLinearHistory
    ? nominal.filter((m) => m !== "merge")
    : nominal;
  const declaredButBlocked: MergeMethod[] =
    hasRequiredLinearHistory && nominal.includes("merge") ? ["merge"] : [];

  const interactionNote =
    declaredButBlocked.length > 0
      ? `allowed_merge_methods declares [${nominal.join(", ")}] but a required_linear_history rule silently blocks merge commits regardless -- effective methods are [${effective.join(", ")}]`
      : undefined;

  return compareToLadder(effective, declaredButBlocked, interactionNote);
}

export async function fetchGitHubRulesets(
  owner: string,
  repo: string,
): Promise<GitHubRuleset[] | null> {
  try {
    const { stdout: listOut } = await execFileAsync("gh", [
      "api",
      `repos/${owner}/${repo}/rulesets`,
    ]);
    const summaries = JSON.parse(listOut) as Array<{ id: number }>;
    const detailed = await Promise.all(
      summaries.map(async (s) => {
        const { stdout } = await execFileAsync("gh", [
          "api",
          `repos/${owner}/${repo}/rulesets/${s.id}`,
        ]);
        return JSON.parse(stdout) as GitHubRuleset;
      }),
    );
    return detailed;
  } catch {
    return null;
  }
}

// ─── Azure DevOps branch policy ───────────────────────────────────────────────
// NOT live-verified (see module doc comment and the PRD's Open Questions).

export interface AdoMergeTypePolicy {
  isEnabled: boolean;
  isBlocking: boolean;
  settings?: {
    useSquashMerge?: boolean;
    allowNoFastForward?: boolean;
    allowRebase?: boolean;
    allowRebaseMerge?: boolean;
  };
}

export function evaluateAdoMergePolicy(
  policies: AdoMergeTypePolicy[],
): PolicyEvaluation {
  const enabled = policies.filter((p) => p.isEnabled);
  if (enabled.length === 0) {
    return {
      passed: false,
      effectiveMergeMethods: null,
      declaredButBlocked: [],
      disallowedButPermitted: [],
      message: "No enabled \"Limit merge types\" branch policy found for the target branch.",
    };
  }

  const effective = new Set<MergeMethod>();
  for (const policy of enabled) {
    const s = policy.settings ?? {};
    if (s.allowNoFastForward) effective.add("merge");
    if (s.allowRebase || s.allowRebaseMerge) effective.add("rebase");
    if (s.useSquashMerge) effective.add("squash");
  }

  return compareToLadder([...effective], []);
}

export async function fetchAdoMergeTypePolicies(
  org: string,
  project: string,
  repoName: string,
  branch: string,
): Promise<AdoMergeTypePolicy[] | null> {
  try {
    const orgUrl = `https://dev.azure.com/${org}`;
    // az repos policy list needs the repository's GUID, not its name.
    const { stdout: repoOut } = await execFileAsync("az", [
      "repos",
      "show",
      "--repository",
      repoName,
      "--org",
      orgUrl,
      "--project",
      project,
      "--query",
      "id",
      "--output",
      "tsv",
    ]);
    const repositoryId = repoOut.trim();
    if (!repositoryId) return null;

    const { stdout } = await execFileAsync("az", [
      "repos",
      "policy",
      "list",
      "--repository-id",
      repositoryId,
      "--branch",
      branch,
      "--org",
      orgUrl,
      "--project",
      project,
      "--output",
      "json",
    ]);
    return JSON.parse(stdout) as AdoMergeTypePolicy[];
  } catch {
    return null;
  }
}

// ─── Remote URL parsing ───────────────────────────────────────────────────────

export function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  const match = /github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/.exec(url);
  if (!match) return null;
  const [, owner, repo] = match;
  if (!owner || !repo) return null;
  return { owner, repo };
}

export function parseAdoRemote(
  url: string,
): { org: string; project: string; repo: string } | null {
  // Modern: https://dev.azure.com/{org}/{project}/_git/{repo}
  const modern = /dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/?]+)/.exec(url);
  if (modern) {
    const [, org, project, repo] = modern;
    if (org && project && repo) return { org, project, repo };
  }
  // Legacy: https://{org}.visualstudio.com/{project}/_git/{repo}
  const legacy = /([^./]+)\.visualstudio\.com\/([^/]+)\/_git\/([^/?]+)/.exec(url);
  if (legacy) {
    const [, org, project, repo] = legacy;
    if (org && project && repo) return { org, project, repo };
  }
  return null;
}
