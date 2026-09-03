import { spawnSync } from "node:child_process";

export { createFixtureDir, removeFixtureDir } from "./fixture-dir.js";

// Deliberately the literal POSIX path, not `node:os`'s `devNull` -- Git for
// Windows' MSYS path-translation layer has special-cased handling for
// "/dev/null" specifically and maps it to the real Windows NUL device
// correctly. `os.devNull` on win32 returns the raw NT device path
// (`\\.\nul`), which MSYS's automatic backslash-to-forward-slash conversion
// mangles into the invalid `//./nul` once it round-trips through an env var
// into git.exe -- confirmed by this fix's own test run before this comment
// was written. "/dev/null" is the portable choice across every platform git
// itself runs on, including Windows.
const GIT_NULL_CONFIG = "/dev/null";

/**
 * EF-34: git exports repository-context environment variables (GIT_DIR, and
 * situationally GIT_INDEX_FILE, GIT_WORK_TREE, GIT_PREFIX) to hook subprocesses.
 * A fixture `git` call spawned with only `cwd` set inherits these from the
 * parent process, so `cwd` resolution gets overridden and the fixture's git
 * commands operate on the REAL repository instead of its own temp directory --
 * confirmed to fire from inside a pre-commit hook, landing stray "test: seed …"
 * commits on real branches and flipping shared `.git/config` (core.bare,
 * identity) fleet-wide across every linked worktree. See
 * docs/intake/batch-001/EF-34.md.
 *
 * This module is the ONLY place fixture tests should spawn `git`. It builds a
 * hermetic environment (every GIT_* var stripped, global/system config pointed
 * at the null device) and, for `init`, verifies the resulting repository
 * actually lives inside the fixture directory before returning -- converting
 * any future leak into an immediate, loud test failure instead of silent
 * corruption of whatever repository invoked the test run.
 */

/**
 * The only GIT_* variables a fixture may set. They pin a commit's timestamps
 * for date-sensitive tests (show-report's "version at close" resolves by
 * committer date) and cannot redirect repository context -- the EF-34 leak
 * class this module exists to shut out -- so admitting exactly these two
 * after the blanket strip keeps the tripwire's guarantee intact.
 */
export interface FixtureGitDates {
    /** ISO 8601, e.g. "2026-09-01T12:00:00". Sets GIT_AUTHOR_DATE. */
    authorDate?: string;
    /** ISO 8601. Sets GIT_COMMITTER_DATE -- the landing date `git log %cs` reports. */
    committerDate?: string;
}

function fixtureGitEnv(dates: FixtureGitDates = {}): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const key of Object.keys(env)) {
        if (key.startsWith("GIT_")) delete env[key];
    }
    // Absence of a global/system config is a normal, silent no-op for git --
    // pointing at the null device (not just a nonexistent path) is git's own
    // documented way to disable a config tier, and is what the EF-34 proposed
    // fix specifies.
    env.GIT_CONFIG_GLOBAL = GIT_NULL_CONFIG;
    env.GIT_CONFIG_SYSTEM = GIT_NULL_CONFIG;
    if (dates.authorDate) env.GIT_AUTHOR_DATE = dates.authorDate;
    if (dates.committerDate) env.GIT_COMMITTER_DATE = dates.committerDate;
    return env;
}

function rawGit(dir: string, args: string[], dates: FixtureGitDates = {}): string {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8", env: fixtureGitEnv(dates) });
    if (result.status !== 0) {
        throw new Error(result.stderr || `git ${args.join(" ")} failed`);
    }
    return result.stdout.trim();
}

function normalizePath(p: string): string {
    return p.replace(/\\/g, "/").toLowerCase().replace(/\/$/, "");
}

/**
 * Run `git` against a fixture directory only. Hermetic against the invoking
 * process's own repository context regardless of what GIT_* vars it has set.
 *
 * When `args` is an `init` command, immediately verifies (via
 * `--absolute-git-dir`) that the resulting repository resolves inside `dir` --
 * the EF-34 tripwire. Throws loudly if it does not.
 */
export function runGit(dir: string, args: string[], dates: FixtureGitDates = {}): string {
    const output = rawGit(dir, args, dates);
    if (args[0] === "init") {
        const absoluteGitDir = rawGit(dir, ["rev-parse", "--absolute-git-dir"]);
        if (!normalizePath(absoluteGitDir).startsWith(normalizePath(dir))) {
            throw new Error(
                `EF-34 tripwire: \`git init\` in fixture directory "${dir}" resolved ` +
                    `--absolute-git-dir to "${absoluteGitDir}", which is OUTSIDE the fixture. ` +
                    `A repository-context environment variable (GIT_DIR or similar) leaked ` +
                    `from the parent process -- this fixture would otherwise silently operate ` +
                    `on that repository instead of its own temp directory. Aborting before any ` +
                    `further fixture git command runs.`,
            );
        }
    }
    return output;
}
