import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
