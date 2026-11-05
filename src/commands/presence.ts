/**
 * `spell presence` (ARC-060; features/presence-channel/architecture.md).
 *
 * serve | status | sessions | stop | report | end | mcp.
 * No subcommand starts the service as a side effect, and no option of any of
 * them takes a token, a host or a bind address.
 */

import type { AddressInfo } from "node:net";
import { mintSessionRef } from "../modules/agent-ref.js";
import { callPresence, pidAlive, type ClientResult } from "../modules/presence/client.js";
import { serveMcp } from "../modules/presence/mcp.js";
import { sendEnd, sendReport, type ReportFlags, type ReportOutcome, type ReporterDeps } from "../modules/presence/reporter.js";
import { logEvent } from "../modules/presence/log.js";
import { createPresenceServer } from "../modules/presence/server.js";
import { createSessionTable } from "../modules/presence/sessions.js";
import {
  PresenceStoreError,
  ensureToken,
  readServerInfo,
  removeServerInfo,
  writeServerInfo,
  type StoreOptions,
} from "../modules/presence/store.js";
import {
  DEFAULT_PORT,
  LOOPBACK_HOST,
  PRESENCE_ENV,
  SWEEP_MS,
  type HealthDocument,
  type SessionRecord,
  type SnapshotDocument,
} from "../modules/presence/types.js";
import { packageJson as pkg } from "../package-info.js";

export const NOT_CONFIGURED = "No presence channel is configured on this machine.";

export interface PresenceIo {
  out: (line: string) => void;
  err: (line: string) => void;
}

const consoleIo: PresenceIo = {
  out: (line) => console.log(line),
  err: (line) => console.error(line),
};

/** `--port`, else `ARCANE_PRESENCE_PORT`, else 27226; 0 asks the OS. Null when not an integer 0..65535. */
export function resolvePort(flag: string | undefined, env: NodeJS.ProcessEnv): number | null {
  const raw = flag ?? env[PRESENCE_ENV.port] ?? String(DEFAULT_PORT);
  if (!/^\d+$/.test(raw.trim())) return null;
  const port = Number(raw.trim());
  return port >= 0 && port <= 65_535 ? port : null;
}

export interface ServeOptions {
  port?: string;
  rotate?: boolean;
}

export interface RunningService {
  url: string;
  port: number;
  /** Closes the feeds and the listener and removes server.json; the token stays. */
  stop(): Promise<void>;
}

export class ServeError extends Error {}

/**
 * Binds 127.0.0.1 first; only once the port is ours does it touch the store
 * (architecture D13: a second `serve`, `--rotate` or not, never replaces the
 * token of a running one). Then the token, then server.json.
 */
export async function startPresenceService(
  options: ServeOptions,
  context: { env?: NodeJS.ProcessEnv; store?: StoreOptions; version?: string } = {},
): Promise<RunningService> {
  const env = context.env ?? process.env;
  const store = context.store ?? {};
  const port = resolvePort(options.port, env);
  if (port === null) throw new ServeError(`The port must be a whole number from 0 to 65535 (--port or ${PRESENCE_ENV.port}).`);

  let token = "";
  const table = createSessionTable({ mint: mintSessionRef });
  const startedAt = new Date().toISOString();
  const presence = createPresenceServer({
    token: () => token,
    table,
    generator: { name: "arcane-cli", version: context.version ?? pkg.version },
    startedAt,
  });
  const { server } = presence;

  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.off("listening", onListening);
      reject(
        error.code === "EADDRINUSE"
          ? new ServeError(`Port ${port} is already in use. Is a presence service already running? (spell presence status)`)
          : new ServeError(`Could not listen on ${LOOPBACK_HOST}:${port}: ${error.message}`),
      );
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, LOOPBACK_HOST);
  });

  const closeServer = () =>
    new Promise<void>((resolve) => {
      presence.closeFeeds();
      server.closeAllConnections();
      server.close(() => resolve());
    });

  const actualPort = (server.address() as AddressInfo).port;
  const url = `http://${LOOPBACK_HOST}:${actualPort}`;

  // Bind-before-write protects the same port only; a service already recorded on another port and
  // still answering keeps its token and its record (review of PR #435).
  const recorded = readServerInfo(store);
  if (recorded !== null && recorded.pid !== process.pid && pidAlive(recorded.pid)) {
    const health = await callPresence("GET", "/v0/health", undefined, { ...store, env });
    if (health.kind === "ok" || (health.kind === "refused" && health.status === 401)) {
      await closeServer();
      throw new ServeError(`A presence service is already running at ${recorded.url} (pid ${recorded.pid}). Stop it first: spell presence stop`);
    }
  }

  try {
    token = ensureToken({ ...store, rotate: options.rotate === true });
    writeServerInfo({ url, pid: process.pid, port: actualPort, started_at: startedAt, generator: { name: "arcane-cli", version: context.version ?? pkg.version } }, store);
  } catch (error) {
    await closeServer();
    throw new ServeError(error instanceof PresenceStoreError ? error.message : `Could not write the presence store: ${String(error)}`);
  }

  // A server error after listening (an accept failure such as EMFILE) is logged, never a crash.
  server.on("error", () => logEvent("server.error", null, null));

  const sweep = setInterval(() => table.sweep(), SWEEP_MS);
  sweep.unref();

  let stopped = false;
  return {
    url,
    port: actualPort,
    async stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(sweep);
      await closeServer();
      const recorded = readServerInfo(store);
      if (recorded !== null && recorded.pid === process.pid && recorded.started_at === startedAt) removeServerInfo(store);
    },
  };
}

/** `spell presence serve`: runs in the foreground until SIGINT or SIGTERM. */
export async function runPresenceServe(options: ServeOptions, io: PresenceIo = consoleIo): Promise<void> {
  // The signal handlers go in first: server.json is written, and the URL printed, before this
  // function returns from startPresenceService, and a `stop` or a supervisor may signal from that
  // moment. A signal that arrives before the service is ready stops it as soon as it is.
  let signalled = false;
  let onSignal: () => void = () => {
    signalled = true;
  };
  const handler = () => onSignal();
  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
  const detach = () => {
    process.off("SIGINT", handler);
    process.off("SIGTERM", handler);
  };

  let service: RunningService;
  try {
    service = await startPresenceService(options);
  } catch (error) {
    detach();
    io.err(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }
  io.out(`Presence service listening on ${service.url} (loopback only). Stop it with Ctrl+C or \`spell presence stop\`.`);
  await new Promise<void>((resolve) => {
    onSignal = () => {
      detach();
      void service.stop().then(() => {
        io.out("Presence service stopped.");
        resolve();
      });
    };
    if (signalled) onSignal();
  });
  process.exitCode = 0;
}

function isHealth(body: unknown): body is HealthDocument {
  const b = body as Partial<HealthDocument> | null;
  return b !== null && typeof b === "object" && b.ok === true && b.contract === "v0" && typeof b.started_at === "string";
}

/**
 * The line `status` and `sessions` print when the service cannot answer: one
 * wording per failure, shared so the two commands cannot drift (architecture D24).
 */
export function unavailableLine(info: { url: string }, result: ClientResult): string {
  if (result.kind === "refused" && result.status === 401) {
    return `The presence service at ${info.url} refused this machine's token (rotated, or ${PRESENCE_ENV.token} is set to another value).`;
  }
  return `The presence service recorded at ${info.url} is not reachable.`;
}

/** `spell presence status`: exit 0 when the service answers with the token, 1 otherwise. */
export async function runPresenceStatus(io: PresenceIo = consoleIo, store: StoreOptions = {}): Promise<number> {
  const info = readServerInfo(store);
  if (info === null) {
    io.out(NOT_CONFIGURED);
    return 1;
  }
  const result = await callPresence("GET", "/v0/health", undefined, store);
  if (result.kind === "ok" && isHealth(result.body)) {
    io.out(`Presence service: ${info.url}`);
    io.out(`  pid:      ${info.pid}`);
    io.out(`  version:  ${result.body.generator.version}`);
    io.out(`  sessions: ${result.body.sessions}`);
    return 0;
  }
  io.out(unavailableLine(info, result));
  return 1;
}

function isSnapshot(body: unknown): body is SnapshotDocument {
  const b = body as Partial<SnapshotDocument> | null;
  return b !== null && typeof b === "object" && Array.isArray(b.sessions) && typeof b.generated_at === "string";
}

/** "42s", "5m", "3h", "2d": how long ago, for a human. */
export function formatAge(fromIso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000));
  if (!Number.isFinite(seconds)) return "-";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

/**
 * The snapshot as a table (architecture D24). A stale record reads `unknown`,
 * the reporting fragment's word for a session that stopped reporting.
 */
export function renderSessionsTable(sessions: readonly SessionRecord[], now: number): string[] {
  if (sessions.length === 0) return ["No session is reporting."];
  const header = ["STATUS", "AGENT", "HARNESS", "REPOSITORY", "BRANCH", "AGE", "TASK"];
  const rows = sessions.map((s) => [
    s.stale ? "unknown" : s.status,
    s.agent.slug ?? "-",
    s.harness,
    s.repository.name,
    s.checkout.branch ?? "-",
    formatAge(s.reported_at, now),
    s.task ?? "-",
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) =>
    cells
      .map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i])))
      .join("  ")
      .trimEnd();
  const out = [line(header)];
  sessions.forEach((s, i) => {
    out.push(line(rows[i]));
    for (const n of s.needs_you) out.push(`  needs you: ${n.reason === null ? n.action : `${n.action} — ${n.reason}`}`);
  });
  return out;
}

/**
 * `spell presence sessions [--json]` (PC-17): the GET /v0/sessions document,
 * as a table or as JSON. Exit 0 with a document; 1 with status's wording.
 */
export async function runPresenceSessions(
  options: { json?: boolean },
  io: PresenceIo = consoleIo,
  store: StoreOptions = {},
  now: () => number = Date.now,
): Promise<number> {
  const info = readServerInfo(store);
  if (info === null) {
    io.out(NOT_CONFIGURED);
    return 1;
  }
  const result = await callPresence("GET", "/v0/sessions", undefined, store);
  if (result.kind !== "ok" || !isSnapshot(result.body)) {
    io.out(unavailableLine(info, result));
    return 1;
  }
  if (options.json === true) {
    io.out(JSON.stringify(result.body, null, 2));
    return 0;
  }
  for (const line of renderSessionsTable(result.body.sessions, now())) io.out(line);
  return 0;
}

async function waitForExit(pid: number, ms: number): Promise<boolean> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (!pidAlive(pid)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return !pidAlive(pid);
}

/**
 * `spell presence stop`: signals the recorded pid only when the service at the
 * recorded port answers with the token and the same start time (architecture
 * D14), so a pid reused by another process is never signalled. Always exit 0.
 */
export async function runPresenceStop(io: PresenceIo = consoleIo, store: StoreOptions = {}): Promise<number> {
  const info = readServerInfo(store);
  if (info === null) {
    io.out("No presence service is running.");
    return 0;
  }
  const result = await callPresence("GET", "/v0/health", undefined, store);
  if (result.kind === "ok" && isHealth(result.body) && result.body.started_at === info.started_at) {
    try {
      process.kill(info.pid, "SIGTERM");
    } catch {
      // Gone between the health check and the signal.
    }
    if (!(await waitForExit(info.pid, 3_000))) {
      io.out(`Asked the presence service (pid ${info.pid}) to stop; it is still running after 3 s.`);
      return 0;
    }
    // On Windows a signalled process cannot run its handler, so the record may outlive it.
    const after = readServerInfo(store);
    if (after !== null && after.started_at === info.started_at) removeServerInfo(store);
    io.out(`Stopped the presence service (pid ${info.pid}).`);
    return 0;
  }
  if (result.kind === "refused" && result.status === 401) {
    io.out(`The presence service at ${info.url} refused this machine's token, so it was not stopped.`);
    return 0;
  }
  if (result.kind === "not-configured" && pidAlive(info.pid)) {
    io.out(`The presence service recorded at ${info.url} (pid ${info.pid}) is running, but there is no token here to confirm it, so it was not stopped.`);
    return 0;
  }
  removeServerInfo(store);
  io.out("No presence service was answering; removed its stale record.");
  return 0;
}

/** The whole `report` or `end` command is cut off here and exits 0 (architecture D15). */
export const REPORT_DEADLINE_MS = 2_000;

export interface ReportRun {
  outcome: ReportOutcome | null;
  timedOut: boolean;
}

async function withDeadline(work: Promise<ReportOutcome>, ms: number): Promise<ReportRun> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<ReportRun>((resolve) => {
    timer = setTimeout(() => resolve({ outcome: null, timedOut: true }), ms);
  });
  const run = await Promise.race([work.then((outcome) => ({ outcome, timedOut: false })).catch(() => ({ outcome: null, timedOut: false })), deadline]);
  clearTimeout(timer);
  return run;
}

function finish(run: ReportRun, io: PresenceIo): ReportRun {
  if (run.outcome?.kind === "refused") io.err(run.outcome.line);
  return run;
}

/**
 * `spell presence report`: silent with no channel, one stderr line when the
 * service refuses, never a non-zero exit (the caller sets none).
 */
export async function runPresenceReport(cwd: string, flags: ReportFlags, io: PresenceIo = consoleIo, deps: ReporterDeps = {}, deadlineMs = REPORT_DEADLINE_MS): Promise<ReportRun> {
  return finish(await withDeadline(sendReport(cwd, flags, deps), deadlineMs), io);
}

/** `spell presence end`: the same silence rule. */
export async function runPresenceEnd(cwd: string, io: PresenceIo = consoleIo, deps: ReporterDeps = {}, deadlineMs = REPORT_DEADLINE_MS): Promise<ReportRun> {
  return finish(await withDeadline(sendEnd(cwd, deps), deadlineMs), io);
}

/**
 * `spell presence mcp`: an MCP server over stdio (ARC-060 decision 5). stdout
 * carries protocol messages only; it exits when stdin closes.
 */
export async function runPresenceMcp(): Promise<void> {
  await serveMcp({ input: process.stdin, output: process.stdout, version: pkg.version });
}
