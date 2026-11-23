import { lstat, readFile, realpath } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { parse, stringify } from "yaml";
import { runGit } from "../modules/git.js";
import { execFileWithTimeout, EXTERNAL_CLI_TIMEOUT_MS, resolveAzureCli } from "../modules/exec.js";
import { parseAdoRemote } from "../modules/platform-policy.js";
import { checkBuildPolicy, checkPipeline, checkSafePolicyUpdate, createFilterPlan, findReferences, isArcaneCandidate, renderPipeline, unchangedPolicySettings, type PolicyTarget } from "../modules/ci-path-filters.js";

export interface CiFilterOptions {
  reviewed: string;
  pipeline: string;
  org?: string;
  project?: string;
  repositoryId?: string;
  branch?: string;
  buildPolicyId?: string;
  buildId?: string;
  guardPolicyId?: string;
  guardBuildId?: string;
  confirmPolicyUpdate?: boolean;
}

function positiveInteger(value: string | undefined, label: string): number {
  if (!value || !/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`${label} must be a positive integer`);
  return Number(value);
}

async function fetchPolicy(id: number, org: string, project: string): Promise<unknown> {
  const launch = resolveAzureCli();
  const { stdout } = await execFileWithTimeout(launch.file, [...launch.prefixArgs, "repos", "policy", "show", "--id", String(id), "--org", org, "--project", project, "--output", "json"], EXTERNAL_CLI_TIMEOUT_MS, { ...(launch.env ? { env: launch.env } : {}) });
  return JSON.parse(stdout) as unknown;
}

export interface CiFilterDependencies {
  policy: (id: number, org: string, project: string) => Promise<unknown>;
  update?: (id: number, org: string, project: string, filter: string) => Promise<void>;
  list?: (org: string, project: string, repositoryId: string, branch: string) => Promise<unknown>;
  create?: (org: string, project: string, repositoryId: string, branch: string, buildId: number, filter: string) => Promise<unknown>;
  repositoryId?: (org: string, project: string, name: string) => Promise<unknown>;
}
async function azure(args: string[]): Promise<string> {
  const launch = resolveAzureCli();
  const { stdout } = await execFileWithTimeout(launch.file, [...launch.prefixArgs, ...args], EXTERNAL_CLI_TIMEOUT_MS, { ...(launch.env ? { env: launch.env } : {}) });
  return stdout;
}
const defaultDependencies: CiFilterDependencies = {
  policy: fetchPolicy,
  update: async (id, org, project, filter) => {
    await azure(["repos", "policy", "build", "update", "--id", String(id), "--org", org, "--project", project, "--path-filter", filter, "--output", "none"]);
  },
  list: async (org, project, repositoryId, branch) => JSON.parse(await azure(["repos", "policy", "list", "--repository-id", repositoryId, "--branch", branch, "--org", org, "--project", project, "--output", "json"])) as unknown,
  repositoryId: async (org, project, name) => JSON.parse(await azure(["repos", "show", "--repository", name, "--org", org, "--project", project, "--output", "json"])) as unknown,
  create: async (org, project, repositoryId, branch, buildId, filter) => JSON.parse(await azure(["repos", "policy", "build", "create", "--org", org, "--project", project, "--repository-id", repositoryId, "--branch", branch, "--branch-match-type", "exact", "--build-definition-id", String(buildId), "--display-name", "Arcane build validation", "--blocking", "true", "--enabled", "true", "--manual-queue-only", "false", "--queue-on-source-update-only", "false", "--valid-duration", "0", "--path-filter", filter, "--output", "json"])) as unknown,
};

/** Runs against a checkout of the merge candidate. All input errors fail closed. */
export async function runCiPathFilters(mode: "prepare" | "check" | "apply" | "create", cwd: string, opts: CiFilterOptions, deps: CiFilterDependencies = defaultDependencies): Promise<{ output: string; ok: boolean }> {
  try {
    const { stdout } = await runGit(cwd, ["ls-files", "-z"]);
    const tracked = stdout.split("\0").filter(Boolean);
    const relativeTracked = (path: string): string => relative(cwd, resolve(cwd, path)).split(sep).join("/");
    const reviewedPath = relativeTracked(opts.reviewed);
    const pipelinePath = relativeTracked(opts.pipeline);
    if (!tracked.includes(reviewedPath) || !tracked.includes(pipelinePath) || reviewedPath === pipelinePath) throw new Error("The reviewed list and pipeline must be distinct tracked files in the checkout");
    const root = await realpath(cwd);
    const safeFile = async (path: string): Promise<string> => {
      const expected = join(root, path);
      if (!(await lstat(expected)).isFile() || await realpath(expected) !== expected) throw new Error(`Cannot safely read tracked file ${path}`);
      return expected;
    };
    const reviewed: unknown = JSON.parse(await readFile(await safeFile(reviewedPath), "utf8"));
    if (!Array.isArray(reviewed) || !reviewed.every((path) => typeof path === "string")) throw new Error("Reviewed paths must be a JSON array of strings");
    const plan = createFilterPlan(reviewed, tracked);
    if (plan.exclusions.includes(pipelinePath) || plan.exclusions.includes(reviewedPath)) throw new Error("Pipeline and reviewed-list files must always trigger the build");
    for (const path of plan.exclusions) await safeFile(path);
    const yaml = await readFile(await safeFile(pipelinePath), "utf8");
    if (mode === "prepare") {
      const output = renderPipeline(yaml, plan);
      return { output: `${output}\n# Review this YAML and set the build-validation path filter to: ${plan.policyFilter || "(empty: all paths)"}\n`, ok: true };
    }
    const issues = checkPipeline(yaml, plan, opts.branch ?? "");
    const { stdout: status } = await runGit(cwd, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (status.trim()) issues.push("Guard requires a clean checkout of the PR merge candidate");
    const files = new Map<string, string>();
    const scannable = /\.(?:[cm]?[jt]sx?|json|ya?ml|sh|bash|ps1|py|cs|csproj|fs|rb|go|rs|java|kt|swift|dart|c|cc|cpp|h|hpp|sql|tf|tfvars|hcl|gradle|xml|toml|config)$/i;
    for (const path of tracked.filter((p) => (scannable.test(p) || !p.split("/").at(-1)?.includes(".")) && !plan.exclusions.includes(p) && p !== reviewedPath && p !== pipelinePath)) {
      const full = await safeFile(path);
      const info = await lstat(full);
      if (!info.isFile() || info.size > 10_000_000) throw new Error(`Cannot safely scan tracked input ${path}`);
      files.set(path, await readFile(full, "utf8"));
    }
    const parsed = parse(yaml) as { trigger?: { paths?: unknown } };
    if (parsed.trigger) delete parsed.trigger.paths;
    files.set(pipelinePath, stringify(parsed));
    issues.push(...findReferences(plan.exclusions, files));
    if (!opts.org || !/^https:\/\/dev\.azure\.com\/[A-Za-z0-9._-]+\/?$/.test(opts.org) || !opts.project || opts.project.startsWith("-") ||
      !opts.repositoryId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(opts.repositoryId) || !opts.branch || opts.branch.startsWith("-")) {
      throw new Error("Valid --org, --project, --repository-id and --branch are required");
    }
    const remoteUrl = (await runGit(cwd, ["remote", "get-url", "origin"])).stdout.trim();
    const remote = parseAdoRemote(remoteUrl);
    let parsedRemote: URL;
    try { parsedRemote = new URL(remoteUrl); } catch { throw new Error("The checkout origin is not an Azure HTTPS URL"); }
    const segments = parsedRemote.pathname.split("/").filter(Boolean);
    const modern = parsedRemote.hostname.toLowerCase() === "dev.azure.com" && segments.length === 4 && segments[2] === "_git";
    const legacy = remote && parsedRemote.hostname.toLowerCase() === `${remote.org.toLowerCase()}.visualstudio.com` && segments.length === 3 && segments[1] === "_git";
    if (parsedRemote.protocol !== "https:" || parsedRemote.search || parsedRemote.hash || (!modern && !legacy)) throw new Error("The checkout origin is not an Azure HTTPS repository URL");
    const orgName = new URL(opts.org).pathname.replace(/^\/+|\/+$/g, "");
    if (!remote || remote.org.toLowerCase() !== orgName.toLowerCase() || remote.project.toLowerCase() !== opts.project.toLowerCase() || !deps.repositoryId) throw new Error("The checkout origin must identify the requested Azure organization and project");
    let observedRepository: unknown;
    try { observedRepository = await deps.repositoryId(opts.org, opts.project, remote.repo); }
    catch { throw new Error("Unable to verify the checkout repository identity in Azure"); }
    if (typeof observedRepository !== "object" || observedRepository === null || !("id" in observedRepository) || typeof observedRepository.id !== "string" || observedRepository.id.toLowerCase() !== opts.repositoryId.toLowerCase()) throw new Error("The checkout origin does not match the requested Azure repository ID");
    const guardPolicyId = positiveInteger(opts.guardPolicyId, "--guard-policy-id");
    const buildId = positiveInteger(opts.buildId, "--build-id");
    const guardBuildId = positiveInteger(opts.guardBuildId, "--guard-build-id");
    if (mode === "create") {
      if (!opts.confirmPolicyUpdate) throw new Error("Policy creation requires --confirm-policy-update from the operator");
      if (opts.buildPolicyId !== undefined) throw new Error("Omit --build-policy-id when creating a policy");
      if (!plan.policyFilter) throw new Error("No exclusions to apply; leave the policy unfiltered");
      if (guardBuildId === buildId || !deps.list || !deps.create) throw new Error("An independent guard and policy creation access are required");
      let guard: unknown, existing: unknown;
      try { [guard, existing] = await Promise.all([deps.policy(guardPolicyId, opts.org, opts.project), deps.list(opts.org, opts.project, opts.repositoryId, opts.branch)]); }
      catch { throw new Error("Unable to read live Azure policies; check access and IDs"); }
      issues.push(...checkBuildPolicy(guard, { id: guardPolicyId, repositoryId: opts.repositoryId, branch: opts.branch, buildDefinitionId: guardBuildId }, "").map((s) => `Guard policy: ${s}`));
      const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
      if (!Array.isArray(existing) || existing.some((p: unknown) => !isRecord(p) || !isRecord(p.type) || typeof p.type.id !== "string" || !isRecord(p.settings) || (p.type.id.toLowerCase() === "0609b952-1397-4640-95ec-e00a01b2c241" && typeof p.settings.buildDefinitionId !== "number"))) issues.push("Policy list is invalid");
      else if (existing.some((p: unknown) => isRecord(p) && isRecord(p.settings) && p.settings.buildDefinitionId === buildId)) issues.push("A policy for this build already exists; inspect it before continuing");
      if (issues.length) return { ok: false, output: issues.join("\n") };
      try {
        const created = await deps.create(opts.org, opts.project, opts.repositoryId, opts.branch, buildId, plan.policyFilter);
        if (typeof created !== "object" || created === null || !("id" in created) || typeof created.id !== "number" || !Number.isSafeInteger(created.id) || created.id <= 0) throw new Error("Invalid policy ID");
        const target = { id: created.id, repositoryId: opts.repositoryId, branch: opts.branch, buildDefinitionId: buildId };
        const verification = checkBuildPolicy(await deps.policy(created.id, opts.org, opts.project), target, plan.policyFilter);
        if (verification.length) return { ok: false, output: `Policy creation was attempted; inspect policy ${created.id} before retrying.\n${verification.join("\n")}` };
        return { ok: true, output: `Created and verified policy ${created.id}. Independently protect the guard code and review all excluded files for dynamic inputs.` };
      } catch { return { ok: false, output: "Policy creation was attempted but could not be verified; inspect the live policies before retrying." }; }
    }
    const buildPolicyId = positiveInteger(opts.buildPolicyId, "--build-policy-id");
    if (guardPolicyId === buildPolicyId || guardBuildId === buildId) throw new Error("Guard and full build require separate policies and build definitions");
    const target: PolicyTarget = { id: buildPolicyId, repositoryId: opts.repositoryId, branch: opts.branch, buildDefinitionId: buildId };
    let build: unknown, guard: unknown;
    try { [build, guard] = await Promise.all([deps.policy(buildPolicyId, opts.org, opts.project), deps.policy(guardPolicyId, opts.org, opts.project)]); }
    catch { throw new Error("Unable to read live Azure policies; check access and IDs"); }
    const buildIssues = checkBuildPolicy(build, target, plan.policyFilter);
    issues.push(...buildIssues.filter((s) => mode !== "apply" || s !== "Live policy path filter differs from the reviewed list").map((s) => `Build policy: ${s}`));
    issues.push(...checkBuildPolicy(guard, { ...target, id: guardPolicyId, buildDefinitionId: guardBuildId }, "").map((s) => `Guard policy: ${s}`));
    if (mode === "apply") issues.push(...checkSafePolicyUpdate(build));
    if (mode === "apply" && issues.length === 0) {
      if (!opts.confirmPolicyUpdate) throw new Error("Policy updates require --confirm-policy-update from the operator");
      if (!plan.policyFilter) throw new Error("No exclusions to apply; leave the policy unfiltered");
      if (!deps.update) throw new Error("Policy update unavailable");
      try {
        await deps.update(buildPolicyId, opts.org, opts.project, plan.policyFilter);
        const updated = await deps.policy(buildPolicyId, opts.org, opts.project);
        issues.push(...checkBuildPolicy(updated, target, plan.policyFilter).map((s) => `After update: ${s}`));
        if (!unchangedPolicySettings(build, updated)) issues.push("After update: other policy settings changed; inspect the live policy");
      } catch { return { ok: false, output: "Policy update was attempted but could not be verified; inspect the live policy before retrying." }; }
      if (issues.length) return { ok: false, output: `Policy update was attempted; inspect the live policy before retrying.\n${issues.join("\n")}` };
    }
    return { ok: issues.length === 0, output: issues.length ? issues.join("\n") : "Filters and live policies match. Independently protect the guard code and review all excluded files for dynamic inputs." };
  } catch (error) {
    return { ok: false, output: `CI path filter check failed: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

export async function listCiPathCandidates(cwd: string): Promise<string[]> {
  const { stdout } = await runGit(cwd, ["ls-files", "-z"]);
  return stdout.split("\0").filter(isArcaneCandidate).sort();
}
