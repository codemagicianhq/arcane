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

/** The most recent commit (reachable from `untilRef`) that touched `relPath`, or null if none. */
export async function getLastCommitTouching(
  cwd: string,
  relPath: string,
  untilRef = "HEAD",
): Promise<string | null> {
  const sha = await runGitTextOrNull(cwd, ["log", "-1", "--format=%H", untilRef, "--", relPath]);
  return sha === null || sha === "" ? null : sha;
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
