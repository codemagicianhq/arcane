/**
 * `spell presence` (ARC-060; features/presence-channel/architecture.md).
 *
 * serve | status | stop here; report | end | mcp join them in later stories.
 * No subcommand starts the service as a side effect, and no option of any of
 * them takes a token, a host or a bind address.
 */

import type { AddressInfo } from "node:net";
import { mintSessionRef } from "../modules/agent-ref.js";
import { callPresence, pidAlive } from "../modules/presence/client.js";
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
import { DEFAULT_PORT, LOOPBACK_HOST, PRESENCE_ENV, SWEEP_MS, type HealthDocument } from "../modules/presence/types.js";
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
  try {
    token = ensureToken({ ...store, rotate: options.rotate === true });
    writeServerInfo({ url, pid: process.pid, port: actualPort, started_at: startedAt, generator: { name: "arcane-cli", version: context.version ?? pkg.version } }, store);
  } catch (error) {
    await closeServer();
    throw new ServeError(error instanceof PresenceStoreError ? error.message : `Could not write the presence store: ${String(error)}`);
  }

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
  let service: RunningService;
  try {
    service = await startPresenceService(options);
  } catch (error) {
    io.err(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }
  io.out(`Presence service listening on ${service.url} (loopback only). Stop it with Ctrl+C or \`spell presence stop\`.`);
  await new Promise<void>((resolve) => {
    const shutdown = () => {
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      void service.stop().then(() => {
        io.out("Presence service stopped.");
        resolve();
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });
  process.exitCode = 0;
}

function isHealth(body: unknown): body is HealthDocument {
  const b = body as Partial<HealthDocument> | null;
  return b !== null && typeof b === "object" && b.ok === true && b.contract === "v0" && typeof b.started_at === "string";
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
  if (result.kind === "refused" && result.status === 401) {
    io.out(`The presence service at ${info.url} refused this machine's token (rotated, or ${PRESENCE_ENV.token} is set to another value).`);
    return 1;
  }
  io.out(`The presence service recorded at ${info.url} is not reachable.`);
  return 1;
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
  removeServerInfo(store);
  io.out("No presence service was answering; removed its stale record.");
  return 0;
}
