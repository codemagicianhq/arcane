/** Run-grant record checks (ARC-061). A matching record is not proof of consent. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const RUN_ACTIONS = [
  "commit", "push", "create-pr", "assign-pr", "approve-pr", "complete-pr",
  "delete-remote-branch", "run-dev-pipeline",
] as const;
export type RunAction = (typeof RUN_ACTIONS)[number];

export interface RunGrant {
  id: string;
  grantedBy: string;
  operatorWords: string;
  grantedAt: string;
  expiresAt: string;
  scope: { repository: string; task: string; branchPrefix: string };
  permittedActions: RunAction[];
  excludedActions: string[];
  requiredChecks: string[];
  status: "active" | "revoked";
  revocation: string;
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const actions = (v: unknown): v is RunAction[] =>
  strings(v) && v.every((a) => RUN_ACTIONS.some((known) => known === a));

/** Strict canonical UTC timestamps: Date.parse alone normalizes invalid calendar dates. */
function timestamp(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)) return false;
  const n = Date.parse(v);
  return Number.isFinite(n) && new Date(n).toISOString() === v;
}

export function isRunGrant(v: unknown): v is RunGrant {
  if (!record(v) || !record(v.scope)) return false;
  return [v.id, v.grantedBy, v.operatorWords, v.revocation].every(text)
    && timestamp(v.grantedAt) && timestamp(v.expiresAt)
    && Date.parse(v.expiresAt) > Date.parse(v.grantedAt)
    && (v.status === "active" || v.status === "revoked")
    && [v.scope.repository, v.scope.task, v.scope.branchPrefix].every(text)
    && actions(v.permittedActions) && v.permittedActions.length > 0
    && strings(v.excludedActions) && strings(v.requiredChecks)
    && (!v.permittedActions.includes("complete-pr") || v.requiredChecks.length > 0);
}

/** Legacy delegations are never interpreted as grants. Malformed run records fail as a unit. */
export function parseRunGrants(value: unknown): RunGrant[] {
  if (!record(value)) throw new Error("expected a delegations object");
  if (value.runGrants === undefined) return [];
  if (!Array.isArray(value.runGrants) || !value.runGrants.every(isRunGrant)) {
    throw new Error("runGrants must be an array of well-formed, expiring run grants");
  }
  const grants = value.runGrants;
  if (new Set(grants.map((g) => g.id)).size !== grants.length) {
    throw new Error("duplicate run grant ID");
  }
  return grants;
}

export async function readRunGrants(targetDir: string): Promise<RunGrant[]> {
  let raw: string;
  try {
    raw = await readFile(join(targetDir, ".arcane", "delegations.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return parseRunGrants(JSON.parse(raw) as unknown);
}

export interface RunGrantRequest {
  id: string;
  repository: string;
  task: string;
  branch: string;
  action: string;
  now: Date;
}

/** Scope/time/action evaluation only. Does not execute or authenticate anything. */
export function evaluateRunGrant(grants: readonly RunGrant[], request: RunGrantRequest): {
  matches: boolean; reason: string; grant?: RunGrant;
} {
  const deny = (reason: string) => ({ matches: false, reason });
  const candidates = grants.filter((g) => g.id === request.id);
  if (candidates.length !== 1) return deny("missing or duplicate grant");
  const grant = candidates[0];
  if (!isRunGrant(grant)) return deny("invalid grant");
  if (!Number.isFinite(request.now.getTime())) return deny("invalid clock");
  if (grant.status !== "active") return deny("revoked grant");
  if (request.now.getTime() < Date.parse(grant.grantedAt)) return deny("grant not yet active");
  if (request.now.getTime() >= Date.parse(grant.expiresAt)) return deny("expired grant");
  if (grant.scope.repository !== request.repository || grant.scope.task !== request.task) {
    return deny("repository or task outside scope");
  }
  const prefix = grant.scope.branchPrefix;
  const boundary = prefix.endsWith("/") || prefix.endsWith("-");
  if (!(request.branch === prefix || request.branch.startsWith(boundary ? prefix : `${prefix}-`)
      || (!boundary && request.branch.startsWith(`${prefix}/`)))) return deny("branch outside scope");
  if (grant.excludedActions.some((a) => a === request.action)) return deny("excluded action");
  if (!grant.permittedActions.some((a) => a === request.action)) return deny("action not permitted");
  return { matches: true, reason: "record matches; verify operator consent and execution/platform gates", grant };
}
