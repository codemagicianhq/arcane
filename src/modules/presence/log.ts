/**
 * The service's only logger (ARC-060 decision 9; architecture D18).
 *
 * One function with three parameters: an event name, a session reference and
 * a status. There is no free-text parameter, so a task, a message, a
 * needs-you line, a path or a token cannot reach a log line through it. Each
 * value is checked against its own shape and replaced by "-" when it does not
 * match, so even a wrong caller cannot widen what is written.
 */

export type LogSink = (line: string) => void;

const EVENT = /^[a-z]+(\.[a-z_]+)*$/;
const SESSION = /^arcane:session:[0-9a-f-]{36}$/;
const STATUS = /^[a-z]+$/;

let sink: LogSink = (line) => {
  process.stderr.write(`${line}\n`);
};

/** Redirects the log (tests capture it). Returns the previous sink. */
export function setLogSink(next: LogSink): LogSink {
  const previous = sink;
  sink = next;
  return previous;
}

export function logEvent(event: string, session: string | null, status: string | null): void {
  const e = EVENT.test(event) ? event : "-";
  const s = session !== null && SESSION.test(session) ? session : "-";
  const st = status !== null && STATUS.test(status) ? status : "-";
  sink(`${new Date().toISOString()} presence ${e} ${s} ${st}`);
}
