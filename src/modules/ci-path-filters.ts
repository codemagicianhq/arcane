/** ARC-022: conservative Azure Repos path-filter planning and verification. */
import { parseDocument } from "yaml";

const BUILD_POLICY_TYPE = "0609b952-1397-4640-95ec-e00a01b2c241";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Exact paths only: Azure metacharacters or control characters cannot become filters. */
export function safeLiteralPath(path: string): boolean {
  return /^[A-Za-z0-9._ /-]+$/.test(path)
    && !path.startsWith("/") && !path.endsWith("/")
    && path.split("/").every((part) => part !== "" && part !== "." && part !== ".." && part.trim() === part);
}

/** These are candidates for review, not an assertion that they are inert. */
export function isArcaneCandidate(path: string): boolean {
  if (!safeLiteralPath(path)) return false;
  const rootRecords = ["TODO.md", "DECISIONS.md", "FEEDBACK.md", ".arcane/delegations.json"];
  if (rootRecords.includes(path)) return true;
  const prefixes = ["journal/", "ai-context/", ".arcane/spells/", ".arcane/governance/",
    ".arcane/templates/", ".arcane/agents/", ".claude/commands/", ".github/prompts/",
    ".github/agents/", ".agents/skills/"];
  if (prefixes.some((prefix) => path.startsWith(prefix))) return /\.(md|txt)$/i.test(path);
  return path.startsWith("features/") &&
    (/(?:^|\/)stories\.json$/.test(path) || /\.(md|txt|png|jpe?g|gif|webp)$/i.test(path));
}

export interface FilterPlan { exclusions: string[]; policyFilter: string }

/** Only explicitly reviewed, already-tracked candidate paths are excluded. */
export function createFilterPlan(reviewed: readonly string[], tracked: readonly string[]): FilterPlan {
  const trackedSet = new Set(tracked);
  const seen = new Set<string>();
  const folded = new Map<string, string>();
  for (const path of tracked) {
    const key = path.toLowerCase();
    const other = folded.get(key);
    if (other && other !== path) throw new Error(`Case collision: ${other} and ${path}`);
    folded.set(key, path);
  }
  for (const path of reviewed) {
    if (!safeLiteralPath(path)) throw new Error("Invalid exclusion path; use safe literal tracked paths");
    if (!isArcaneCandidate(path)) throw new Error(`Unsafe exclusion ${path}; remove it from the list`);
    if (!trackedSet.has(path)) throw new Error(`Exclusion ${path} matches no tracked file; remove it from the list`);
    if (seen.has(path)) throw new Error(`Duplicate exclusion ${path}`);
    seen.add(path);
  }
  const exclusions = [...seen].sort();
  return { exclusions, policyFilter: exclusions.length ? ["/*", ...exclusions.map((path) => `!/${path}`)].join(";") : "" };
}

/** Return a new YAML document; reject unsupported triggers rather than guessing. */
export function renderPipeline(yaml: string, plan: FilterPlan): string {
  if (/##(?:vso\[|\[)/i.test(yaml) || /\r(?!\n)/.test(yaml)) throw new Error("Pipeline contains logging commands or standalone carriage returns; add the reviewed filter manually");
  const doc = parseDocument(yaml);
  if (doc.errors.length || doc.warnings.length) throw new Error("Pipeline YAML uses invalid or unsupported syntax");
  const root: unknown = doc.toJS();
  if (!record(root) || !record(root.trigger)) throw new Error("Pipeline must have a mapping trigger");
  if (root.trigger.paths !== undefined) throw new Error("Existing trigger paths require manual review");
  if (yaml.split(/\r?\n/).some((line) => line.startsWith("# Arcane branch-policy path filter: "))) throw new Error("Existing Arcane policy comment requires manual review");
  if (plan.exclusions.length) doc.setIn(["trigger", "paths"], { exclude: plan.exclusions });
  return `# Arcane branch-policy path filter: ${plan.policyFilter || "(all paths)"}\n${doc.toString()}`;
}

/** Compare parsed YAML and a recorded filter to the reviewed list. */
export function checkPipeline(yaml: string, plan: FilterPlan, branch?: string): string[] {
  const issues: string[] = [];
  let root: unknown;
  try {
    const doc = parseDocument(yaml);
    if (doc.errors.length || doc.warnings.length) return ["Pipeline YAML uses invalid or unsupported syntax"];
    root = doc.toJS();
  } catch { return ["Pipeline YAML is invalid"]; }
  if (!record(root) || !record(root.trigger)) return ["Pipeline must have a mapping trigger"];
  if (branch !== undefined) {
    const branches = root.trigger.branches;
    if (!record(branches) || !Array.isArray(branches.include) || !branches.include.includes(branch) ||
      branches.exclude !== undefined) issues.push("Pipeline must explicitly include the target branch without branch exclusions");
  }
  const paths = root.trigger.paths;
  if (plan.exclusions.length === 0) {
    if (paths !== undefined) issues.push("Expected an unfiltered trigger");
  } else if (!record(paths) || Object.keys(paths).some((k) => k !== "exclude") ||
    !Array.isArray(paths.exclude) || paths.exclude.some((p) => typeof p !== "string") ||
    JSON.stringify([...paths.exclude].sort()) !== JSON.stringify(plan.exclusions)) {
    issues.push("YAML exclusions differ from the reviewed list");
  }
  const comments = yaml.split(/\r?\n/).filter((line) => line.startsWith("# Arcane branch-policy path filter: "));
  const expected = `# Arcane branch-policy path filter: ${plan.policyFilter || "(all paths)"}`;
  if (comments.length !== 1 || comments[0] !== expected) issues.push("Recorded policy filter differs from the reviewed list");
  return issues;
}

export interface PolicyTarget { id: number; repositoryId: string; branch: string; buildDefinitionId: number }

/** Azure CLI build update reconstructs only the first scope and known settings. */
export function checkSafePolicyUpdate(value: unknown): string[] {
  if (!record(value) || !record(value.settings)) return ["Policy settings are unavailable"];
  const settings = value.settings;
  const allowed = new Set(["scope", "buildDefinitionId", "queueOnSourceUpdateOnly", "manualQueueOnly", "displayName", "validDuration", "filenamePatterns"]);
  if (!Array.isArray(settings.scope) || settings.scope.length !== 1) return ["Refusing update: Azure CLI would discard additional or missing scopes"];
  if (Object.keys(settings).some((key) => !allowed.has(key))) return ["Refusing update: Azure CLI might discard unrecognized settings"];
  if ([...allowed].some((key) => key !== "filenamePatterns" && !(key in settings)) || typeof settings.queueOnSourceUpdateOnly !== "boolean" || typeof settings.displayName !== "string" || typeof settings.validDuration !== "number") return ["Refusing update: Azure CLI cannot safely preserve incomplete settings"];
  if (settings.filenamePatterns != null && (!Array.isArray(settings.filenamePatterns) || settings.filenamePatterns.some((path: unknown) => typeof path !== "string"))) return ["Refusing update: Azure CLI cannot safely preserve malformed path filters"];
  const scope = settings.scope[0];
  if (!record(scope) || Object.keys(scope).some((key) => !["repositoryId", "refName", "matchKind"].includes(key))) return ["Refusing update: Azure CLI might discard scope settings"];
  return [];
}

export function unchangedPolicySettings(before: unknown, after: unknown): boolean {
  if (checkSafePolicyUpdate(before).length || checkSafePolicyUpdate(after).length || !record(before) || !record(before.settings) || !record(after) || !record(after.settings)) return false;
  const a = before.settings, b = after.settings;
  for (const key of ["buildDefinitionId", "queueOnSourceUpdateOnly", "manualQueueOnly", "displayName", "validDuration"]) if (a[key] !== b[key]) return false;
  const aScope = (a.scope as Record<string, unknown>[])[0], bScope = (b.scope as Record<string, unknown>[])[0];
  return ["repositoryId", "refName", "matchKind"].every((key) => aScope[key] === bScope[key]);
}

/** Reject missing or ambiguous platform data; this does not create or update a policy. */
export function checkBuildPolicy(value: unknown, target: PolicyTarget, filter: string): string[] {
  const issues: string[] = [];
  if (!record(value) || !record(value.type) || !record(value.settings)) return ["Policy response is missing required fields"];
  const settings = value.settings;
  if (value.id !== target.id || String(value.type.id).toLowerCase() !== BUILD_POLICY_TYPE) issues.push("Wrong policy identity or type");
  if (value.isEnabled !== true || value.isBlocking !== true || value.isDeleted === true || settings.manualQueueOnly !== false) issues.push("Policy must be enabled, blocking and automatically queued");
  if (settings.buildDefinitionId !== target.buildDefinitionId) issues.push("Wrong build definition");
  const scopes = settings.scope;
  if (!Array.isArray(scopes) || !scopes.some((scope: unknown) => record(scope) &&
    typeof scope.repositoryId === "string" && scope.repositoryId.toLowerCase() === target.repositoryId.toLowerCase() &&
    scope.refName === `refs/heads/${target.branch}` && typeof scope.matchKind === "string" &&
    scope.matchKind.toLowerCase() === "exact")) issues.push("Policy does not cover the exact repository and branch");
  const actual = settings.filenamePatterns;
  const actualFilter = Array.isArray(actual) && actual.every((p) => typeof p === "string") ? actual.join(";") :
    actual == null ? "" : null;
  if (actualFilter !== filter) issues.push("Live policy path filter differs from the reviewed list");
  return issues;
}

/** Conservative literal-reference alarm. Absence of a hit is not proof of non-use. */
export function findReferences(exclusions: readonly string[], files: ReadonlyMap<string, string>): string[] {
  const issues: string[] = [];
  for (const excluded of exclusions) {
    for (const [source, content] of files) {
      if (source === excluded || exclusions.includes(source)) continue;
      const name = excluded.split("/").at(-1) ?? excluded;
      if (content.includes(excluded) || content.includes(name)) issues.push(`${source} references ${excluded}; remove ${excluded} from the list`);
    }
  }
  return issues;
}
