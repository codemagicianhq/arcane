import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitRepositoryState =
  | { status: "ready"; uncommittedChanges: number }
  | { status: "not-repository" }
  | { status: "no-commits" };

/**
 * Returns the repository state required before a destructive managed update.
 */
export async function inspectGitRepository(cwd: string): Promise<GitRepositoryState> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      { cwd },
    );
    if (stdout.trim() !== "true") {
      return { status: "not-repository" };
    }
  } catch {
    return { status: "not-repository" };
  }

  try {
    await execFileAsync("git", ["rev-parse", "--verify", "HEAD"], { cwd });
  } catch {
    return { status: "no-commits" };
  }

  const { stdout } = await execFileAsync(
    "git",
    ["status", "--porcelain", "-uall"],
    { cwd },
  );
  const lines = stdout.trim();
  return {
    status: "ready",
    uncommittedChanges: lines.length === 0 ? 0 : lines.split("\n").length,
  };
}

/**
 * Returns the number of uncommitted changes in the working tree, or 0
 * if the directory is not a git repo or git is not installed.
 */
export async function countUncommittedChanges(cwd: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain", "-uall"], { cwd });
    const lines = stdout.trim();
    return lines.length === 0 ? 0 : lines.split("\n").length;
  } catch {
    return 0;
  }
}
