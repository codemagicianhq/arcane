/**
 * Git-derived data for show-report (SR-01): package.json version at a given
 * ref, and commit-trailer-based cast attribution. Deliberately network-free
 * -- everything here reads from the local git history already on disk, so
 * `--check` (SR-02) never needs a network call. An optional `--refresh` path
 * that snapshots `gh pr list` data is out of SR-01's scope; `refs`/`href` are
 * populated instead from PR links already present in each epic's own
 * `**Report:**`-adjacent text (see plan-parser.ts), which needs no network
 * either.
 */

import { runGit } from "../git.js";

async function runGitTextOrNull(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await runGit(cwd, args, { commandClass: "read" });
    return stdout.trim();
  } catch {
    return null;
  }
}

/** Reads `package.json`'s `version` field as it existed at `ref`, without touching the working tree. */
export async function getVersionAtRef(cwd: string, ref: string): Promise<string | null> {
  const content = await runGitTextOrNull(cwd, ["show", `${ref}:package.json`]);
  if (content === null) return null;
  try {
    const parsed: unknown = JSON.parse(content);
    const version = (parsed as { version?: unknown }).version;
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  }
}

/**
 * The commit `main` stood at when a program's `completed` day ended: the most
 * recent commit whose COMMITTER date falls on or before that day, regardless
 * of which files it touched. Without a `completed` date (a program still in
 * progress) the close is simply HEAD -- "as of now".
 *
 * Measured, not assumed, against both finished programs: Become Current's last
 * PLAN.md-touching commit on its completed day sat at 0.33.0, while two
 * version bumps landed later that same day without touching the plan -- the
 * human record and the hand ledger both say 0.33.2, and only this definition
 * reproduces it (and Lessons Hardening's 0.34.1). Anchoring to PLAN.md at all
 * was the wrong idea: a finished plan gets edited again (SR-01's own backfill
 * did it), and a program's version moves on commits that never touch it.
 *
 * Committer date, not author date, because it is the LANDING date: this repo
 * rebase-merges every PR, so it is the merge time and monotonic along the log,
 * while author dates are not (a PR authored at 03:19 can land above one
 * authored at 06:46). `%cs` renders it in the commit's own recorded offset,
 * so the calendar-day comparison gives the same answer on the operator's
 * machine and on a UTC runner, where a `--until=<instant>` filter would not.
 */
export async function getCloseCommit(cwd: string, completedDate?: string): Promise<string | null> {
  if (!completedDate) {
    const head = await runGitTextOrNull(cwd, ["rev-parse", "HEAD"]);
    return head === null || head === "" ? null : head;
  }
  const log = await runGitTextOrNull(cwd, ["log", "--format=%H%x09%cs", "HEAD"]);
  if (log === null || log === "") return null;
  for (const line of log.split("\n")) {
    const [sha, landed] = line.split("\t");
    if (sha && landed && landed <= completedDate) return sha;
  }
  return null;
}

/**
 * Cast list for the `fromRef..toRef` commit range: one entry per distinct
 * contributor name, counted by commits. Name resolution prefers a commit's
 * `Persona:` trailer (a roster identity) and falls back to its `Agent:`
 * trailer (a runtime/tool name) when no persona was assigned that commit;
 * a commit with neither trailer (ordinary human commits) is not counted --
 * this list is specifically the self-reported AI cast, per the schema's
 * `source: "commit-trailer"` / "self-reported" note, not full authorship.
 */
export async function getCast(cwd: string, fromRef: string, toRef: string): Promise<Map<string, number>> {
  const ETX = "\x03";
  const log = await runGitTextOrNull(cwd, [
    "log",
    "--no-merges",
    `--format=%B${ETX}`,
    `${fromRef}..${toRef}`,
  ]);
  const cast = new Map<string, number>();
  if (log === null || log === "") return cast;

  for (const body of log.split(ETX)) {
    const personaMatch = /^Persona:\s*(.+)$/m.exec(body);
    const agentMatch = /^Agent:\s*(.+)$/m.exec(body);
    const name = personaMatch?.[1]?.trim() || agentMatch?.[1]?.trim();
    if (!name) continue;
    cast.set(name, (cast.get(name) ?? 0) + 1);
  }
  return cast;
}
