/**
 * The reporter behind `spell presence report` and `end`, and behind the MCP
 * tools (ARC-060 decisions 4 and 5; architecture D15, D16).
 *
 * The silence rule: with no live, openable service it reads nothing else and
 * returns silently; outside a git repository or an Arcane repository it is
 * silent; when the service refuses a report it yields one line for stderr.
 * It never writes a file and never fails a spell.
 *
 * What it reads, in order (D16): server.json and the token; the checkout
 * through `git rev-parse`; then the manifest, the branch, the remote, the
 * agent and the harness; then it sends one request.
 */

import { basename, dirname } from "node:path";
import { runGit as defaultRunGit, type GitResult } from "../git.js";
import { readManifest as defaultReadManifest } from "../manifest.js";
import { resolveRealPath } from "../real-path.js";
import { remoteProvider, stripUserinfo } from "../state/git.js";
import { resolveEndpoint, send, type ClientOptions, type ClientResult } from "./client.js";
import { nullAgentBlock, type AgentBlock, type CheckoutInfo, type Harness, type NeedsYou, type ReportBody, type RepositoryInfo, type SessionRecord } from "./types.js";

export interface ReportFlags {
  status?: string;
  task?: string;
  spell?: string;
  message?: string;
  needsYou?: string[];
  agent?: string;
  harness?: string;
}

export interface ReporterDeps extends ClientOptions {
  runGit?: (cwd: string, args: string[]) => Promise<GitResult>;
  readManifest?: (dir: string) => Promise<unknown>;
  resolveAgent?: (checkoutPath: string, agentFlag: string | undefined) => Promise<AgentBlock>;
  detectHarness?: (env: NodeJS.ProcessEnv) => Harness;
}

export type ReportOutcome = { kind: "silent" } | { kind: "refused"; line: string } | { kind: "sent"; record: SessionRecord };

export interface Located {
  repository: RepositoryInfo;
  checkout: CheckoutInfo;
}

/** The separator a `## ⚠ Needs you` line uses between the action and the reason. */
const NEEDS_YOU_SEPARATOR = " — ";

export function parseNeedsYou(line: string): NeedsYou {
  const at = line.indexOf(NEEDS_YOU_SEPARATOR);
  if (at < 0) return { action: line, reason: null };
  return { action: line.slice(0, at), reason: line.slice(at + NEEDS_YOU_SEPARATOR.length) };
}

async function quiet<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/** The checkout this directory belongs to, or null outside a git working tree. */
export async function locateCheckout(cwd: string, deps: ReporterDeps = {}): Promise<{ checkout: string; commonDir: string; gitDir: string } | null> {
  const git = deps.runGit ?? defaultRunGit;
  const out = await quiet(() => git(cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-dir", "--git-common-dir"]));
  const lines = out?.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) ?? [];
  if (lines.length !== 3) return null;
  const [top, gitDir, commonDir] = lines as [string, string, string];
  return { checkout: resolveRealPath(top), gitDir: resolveRealPath(gitDir), commonDir: resolveRealPath(commonDir) };
}

async function locate(cwd: string, deps: ReporterDeps): Promise<Located | null> {
  const found = await locateCheckout(cwd, deps);
  if (found === null) return null;
  const git = deps.runGit ?? defaultRunGit;
  const readManifest = deps.readManifest ?? defaultReadManifest;
  const [manifest, symbolic, remote] = await Promise.all([
    quiet(() => readManifest(found.checkout)),
    quiet(() => git(found.checkout, ["symbolic-ref", "--short", "-q", "HEAD"])),
    quiet(() => git(found.checkout, ["remote", "get-url", "origin"])),
  ]);
  if (manifest === null) return null;
  let branch = symbolic?.stdout.trim() || null;
  if (branch === null) branch = (await quiet(() => git(found.checkout, ["rev-parse", "--short", "HEAD"])))?.stdout.trim() || null;
  const root = basename(found.commonDir) === ".git" ? dirname(found.commonDir) : found.checkout;
  const url = remote?.stdout.trim() ?? "";
  return {
    repository: { root, name: basename(root), remote: url === "" ? null : { provider: remoteProvider(url), url: stripUserinfo(url) } },
    checkout: { path: found.checkout, branch, linked_worktree: found.gitDir !== found.commonDir },
  };
}

function refusedLine(verb: string, result: Extract<ClientResult, { kind: "refused" }>): string {
  const detail = [result.code, result.field].filter((v): v is string => v !== null).join(" ");
  return `spell presence ${verb}: the presence service refused it (HTTP ${result.status}${detail === "" ? "" : `, ${detail}`}).`;
}

/** Builds and sends one report. */
export async function sendReport(cwd: string, flags: ReportFlags, deps: ReporterDeps = {}): Promise<ReportOutcome> {
  const endpoint = resolveEndpoint(deps);
  if (endpoint === null) return { kind: "silent" };
  const located = await locate(cwd, deps);
  if (located === null) return { kind: "silent" };

  const env = deps.env ?? process.env;
  const [agent, harness] = await Promise.all([
    deps.resolveAgent === undefined ? Promise.resolve(nullAgentBlock()) : quiet(() => deps.resolveAgent!(located.checkout.path, flags.agent)).then((a) => a ?? nullAgentBlock()),
    Promise.resolve(flags.harness ?? deps.detectHarness?.(env) ?? "other"),
  ]);

  const body: Record<string, unknown> = {
    status: flags.status,
    harness,
    agent,
    repository: located.repository,
    checkout: located.checkout,
    needs_you: (flags.needsYou ?? []).map(parseNeedsYou),
  };
  if (flags.spell !== undefined) body["spell"] = flags.spell;
  if (flags.task !== undefined) body["task"] = flags.task;
  if (flags.message !== undefined) body["message"] = flags.message === "" ? null : flags.message;

  const result = await send(endpoint.info.port, endpoint.token, "POST", "/v0/sessions/report", body as unknown as ReportBody, deps);
  if (result.kind === "ok") return { kind: "sent", record: result.body as SessionRecord };
  if (result.kind === "refused") return { kind: "refused", line: refusedLine("report", result) };
  return { kind: "silent" };
}

/** Ends this checkout's session. A checkout with no session is silent. */
export async function sendEnd(cwd: string, deps: ReporterDeps = {}): Promise<ReportOutcome> {
  const endpoint = resolveEndpoint(deps);
  if (endpoint === null) return { kind: "silent" };
  const found = await locateCheckout(cwd, deps);
  if (found === null) return { kind: "silent" };
  const result = await send(endpoint.info.port, endpoint.token, "POST", "/v0/sessions/end", { checkout: { path: found.checkout } }, deps);
  if (result.kind === "ok") return { kind: "sent", record: result.body as SessionRecord };
  if (result.kind === "refused" && result.status !== 404) return { kind: "refused", line: refusedLine("end", result) };
  return { kind: "silent" };
}
