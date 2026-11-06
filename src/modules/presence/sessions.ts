/**
 * The session table (ARC-060 decisions 4 and 7; architecture D4, D5, D6, D10).
 *
 * Pure: no filesystem, no network, no timers. The clock and the minter are
 * injected, the caller schedules `sweep()`, and every record handed out is a
 * copy. The service is the only caller.
 *
 * - The key is `checkout.path` as an exact string. The reporter sends a real
 *   path; this module never resolves one, because the service reads no file.
 * - A report is a patch (D4): `status`, `harness`, `agent`, `repository` and
 *   `checkout` are replaced; `spell`, `task` and `message` are replaced when
 *   present (null clears) and kept when absent; `required_actions` is replaced on
 *   every report (absent means []).
 * - Exactly one event per accepted report (D5), by the precedence
 *   started > resumed > action_required > updated.
 * - `end` sets `done`, emits `session.ended` and drops the record (D6);
 *   `sweep` marks `stale` at 90 s and expires at 24 h, both from `reported_at`.
 */

import {
  EXPIRE_AFTER_MS,
  STALE_AFTER_MS,
  type RequiredAction,
  type ReportBody,
  type SessionEvent,
  type SessionEventName,
  type SessionRecord,
} from "./types.js";

export interface SessionTableOptions {
  /** Milliseconds since the epoch. Defaults to `Date.now`. */
  now?: () => number;
  /** Mints `arcane:session:<uuidv7>`; the service passes `mintSessionRef`. */
  mint: () => string;
  staleAfterMs?: number;
  expireAfterMs?: number;
}

export interface ReportResult {
  record: SessionRecord;
  created: boolean;
  event: SessionEventName;
}

export type SessionListener = (event: SessionEvent) => void;

export interface SessionTable {
  report(body: ReportBody): ReportResult;
  end(checkoutPath: string): SessionRecord | null;
  get(session: string): SessionRecord | null;
  /** Active and stale sessions, by `started_at` then `session`, in code-unit order. */
  snapshot(): SessionRecord[];
  count(): number;
  /** Marks stale sessions and expires silent ones; returns the events it emitted. */
  sweep(): SessionEvent[];
  /** Adds a listener for every event, in emission order; returns its remover. */
  listen(listener: SessionListener): () => void;
}

interface Entry {
  record: SessionRecord;
  reportedMs: number;
}

function copy(record: SessionRecord): SessionRecord {
  return structuredClone(record);
}

function sameRequiredActions(a: RequiredAction[], b: RequiredAction[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item.action === b[i]?.action && item.reason === b[i]?.reason);
}

function byStart(a: SessionRecord, b: SessionRecord): number {
  if (a.started_at !== b.started_at) return a.started_at < b.started_at ? -1 : 1;
  if (a.session === b.session) return 0;
  return a.session < b.session ? -1 : 1;
}

export function createSessionTable(options: SessionTableOptions): SessionTable {
  const now = options.now ?? Date.now;
  const staleAfterMs = options.staleAfterMs ?? STALE_AFTER_MS;
  const expireAfterMs = options.expireAfterMs ?? EXPIRE_AFTER_MS;
  const entries = new Map<string, Entry>();
  const listeners = new Set<SessionListener>();

  const emit = (name: SessionEventName, record: SessionRecord): SessionEvent => {
    const event: SessionEvent = { event: name, data: copy(record) };
    for (const listener of listeners) listener({ event: name, data: copy(record) });
    return event;
  };

  return {
    report(body) {
      const ms = now();
      const at = new Date(ms).toISOString();
      const key = body.checkout.path;
      const requiredActions = (body.required_actions ?? []).map((n) => ({ action: n.action, reason: n.reason }));
      const existing = entries.get(key);

      if (existing === undefined) {
        const record: SessionRecord = {
          session: options.mint(),
          agent: structuredClone(body.agent),
          harness: body.harness,
          repository: structuredClone(body.repository),
          checkout: structuredClone(body.checkout),
          spell: body.spell ?? null,
          task: body.task ?? null,
          message: body.message ?? null,
          status: body.status,
          required_actions: requiredActions,
          started_at: at,
          reported_at: at,
          ended_at: null,
          stale: false,
        };
        entries.set(key, { record, reportedMs: ms });
        emit("session.started", record);
        return { record: copy(record), created: true, event: "session.started" };
      }

      const record = existing.record;
      const wasStale = record.stale;
      const needsChanged = !sameRequiredActions(record.required_actions, requiredActions);
      record.agent = structuredClone(body.agent);
      record.harness = body.harness;
      record.repository = structuredClone(body.repository);
      record.checkout = structuredClone(body.checkout);
      if (body.spell !== undefined) record.spell = body.spell;
      if (body.task !== undefined) record.task = body.task;
      if (body.message !== undefined) record.message = body.message;
      record.status = body.status;
      record.required_actions = requiredActions;
      record.reported_at = at;
      record.stale = false;
      existing.reportedMs = ms;

      const event: SessionEventName = wasStale ? "session.resumed" : needsChanged ? "session.action_required" : "session.updated";
      emit(event, record);
      return { record: copy(record), created: false, event };
    },

    end(checkoutPath) {
      const existing = entries.get(checkoutPath);
      if (existing === undefined) return null;
      entries.delete(checkoutPath);
      const record = existing.record;
      record.status = "done";
      record.ended_at = new Date(now()).toISOString();
      emit("session.ended", record);
      return copy(record);
    },

    get(session) {
      for (const { record } of entries.values()) if (record.session === session) return copy(record);
      return null;
    },

    snapshot() {
      return [...entries.values()].map((e) => copy(e.record)).sort(byStart);
    },

    count() {
      return entries.size;
    },

    sweep() {
      const ms = now();
      const emitted: SessionEvent[] = [];
      for (const [key, entry] of [...entries.entries()]) {
        const silent = ms - entry.reportedMs;
        if (silent >= expireAfterMs) {
          entries.delete(key);
          entry.record.stale = true;
          emitted.push(emit("session.expired", entry.record));
        } else if (silent >= staleAfterMs && !entry.record.stale) {
          entry.record.stale = true;
          emitted.push(emit("session.stale", entry.record));
        }
      }
      return emitted;
    },

    listen(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
