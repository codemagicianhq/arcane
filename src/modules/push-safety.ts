/**
 * Push safety (EF-09 / features/push-safety/PRD.md).
 *
 * Two layered controls for a repository whose history must not reach a remote:
 * a `pre-push` hook, and disabled push URLs. Neither is tamper-proof, and the
 * PRD is explicit that they are not meant to be — the threat modelled is an
 * *accidental* push (wrong remote, muscle memory, an unsupervised agent), not a
 * determined operator. Overclaiming here would be its own hazard.
 *
 * The two layers cover different bypasses, which is why both exist:
 *   - `git push --no-verify` skips hooks entirely → the disabled URL catches it.
 *   - `git push <url> main`, or a second remote, never consults the first
 *     remote's URL → the hook catches it.
 * Only combining both bypasses in one command gets through, which is squarely
 * the determined-operator case this does not claim to stop.
 */
import { mkdir, readFile, writeFile, chmod, access, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { fileExists } from "./copier.js";
import { runGit } from "./git.js";

/**
 * Sentinel push URL. Not a real scheme, so git fails to resolve a helper.
 *
 * The scheme name carries the recovery instruction because it is the ONLY text
 * git shows the operator here. With both layers in place the URL fails first and
 * the hook never runs, so the hook's carefully worded message is never seen --
 * all git prints is `fatal: remote helper '<scheme>' aborted session`. Encoding
 * the fix in the scheme turns a dead end into an instruction.
 */
export const DISABLED_PUSH_URL = "arcane-push-blocked-run-spell-unblock-push://this-repository";

/**
 * Marks that a remote had NO `pushurl` key before the block. Restoring must then
 * *remove* the key rather than write the fetch URL into it -- otherwise a later
 * `git remote set-url` would change fetch only and pushes would silently keep
 * going to the old location.
 *
 * A separate boolean key rather than a magic value stored in the URL slot: a
 * remote whose genuine push URL happened to equal that magic string would
 * otherwise be recorded as "there was no key" and lose its original on restore.
 */
const NO_PUSH_URL_MARKER = (remote: string): string => `remote.${remote}.arcaneHadNoPushUrl`;

/** Directory Arcane points `core.hooksPath` at when it owns the hooks. */
export const ARCANE_HOOKS_DIR = ".arcane/hooks";

/**
 * Where a config value is set, as git itself reports it via `--show-scope`.
 * `worktree` matters here: a linked worktree can carry its own `config.worktree`
 * value that `--local` does not see, which an earlier local-vs-effective
 * heuristic misfiled as inherited-from-global.
 */
export type ConfigScope = "local" | "worktree" | "global" | "system" | "command" | "unknown";

export interface HooksPathInfo {
  /** The effective value git would use, respecting scope precedence. */
  value: string;
  /** Where it is set, as reported by git rather than inferred. */
  scope: ConfigScope;
  /** Git could not be asked. Callers must fail closed, never assume "unset". */
  unreadable?: boolean;
}

export type HookInstallOutcome =
  | { status: "installed"; path: string }
  | { status: "already-ours" }
  | { status: "refused-foreign-hooks-path"; existing: string; scope: ConfigScope }
  | { status: "refused-unreadable-config" };

/**
 * Reads the EFFECTIVE `core.hooksPath` — not just the repository-local one.
 *
 * Reading only `--local` was a real defect: a `core.hooksPath` set at *global*
 * scope (the standard way organisations deploy pre-commit and corporate hook
 * managers) was invisible, so installation reported success while silently
 * disabling it, since a local value overrides a global one. That is precisely
 * the harm R7 exists to prevent.
 */
export async function readHooksPath(cwd: string): Promise<HooksPathInfo | undefined> {
  let raw: string;
  try {
    // `--show-scope` makes git report the scope rather than us inferring it by
    // comparing --local against the effective value. That inference was wrong
    // for a per-worktree `config.worktree` value, which --local does not see:
    // a genuinely repository-scoped setting was reported as inherited.
    const { stdout } = await runGit(cwd, ["config", "--show-scope", "--get", "core.hooksPath"]);
    raw = stdout.trim();
  } catch (error) {
    // ONLY exit 1 means "not set anywhere". Anything else -- an unparseable
    // config file, a permission error, an older git that rejects --show-scope --
    // means we could not determine whether someone else owns core.hooksPath.
    // Treating that as "no claim" made the R7 collision guard fail OPEN, which
    // is the one direction it must never fail: it would install over an org hook
    // manager it simply failed to see.
    if ((error as { code?: unknown }).code !== 1) {
      return { value: "", scope: "unknown", unreadable: true };
    }
    return undefined;
  }
  if (raw === "") return undefined;

  // Format is `<scope>\t<value>`. The value may itself contain whitespace.
  const separator = raw.indexOf("\t");
  if (separator === -1) return { value: raw, scope: "unknown" };

  const scope = raw.slice(0, separator).trim();
  const value = raw.slice(separator + 1).trim();
  if (value === "") return undefined;

  const known: readonly ConfigScope[] = ["local", "worktree", "global", "system", "command"];
  const matched = known.find((candidate) => candidate === scope);
  return { value, scope: matched ?? "unknown" };
}

/**
 * True when two `core.hooksPath` values name the same directory.
 *
 * Exact string equality misreported every equivalent spelling git accepts --
 * `.arcane/hooks/`, `./.arcane/hooks`, `.arcane\hooks`, and an absolute path all
 * point where our hook actually lives and all fire on a real push, yet compared
 * unequal. That direction fails safe (we refuse rather than clobber, and report
 * "not enforced" for something that is), but it means doctor contradicts what
 * git does, which is the exact class of confusion this module exists to remove.
 */
function isArcaneHooksPath(cwd: string, value: string): boolean {
  // Case folding only where the filesystem actually folds case. On POSIX,
  // `.arcane/HOOKS` is a genuinely different directory, and treating it as ours
  // would make the R7 guard fail OPEN -- installing over someone else's hooks.
  // Backslash-to-slash folding is Windows-only for the same reason as case
  // folding: on POSIX a backslash is a legal filename character, so a directory
  // genuinely named `.arcane\hooks` would normalise onto ours and the R7 guard
  // would fail OPEN -- installing over someone else's hooks.
  const windows = process.platform === "win32";
  const normalize = (p: string): string => {
    const separated = windows ? p.replace(/\\/g, "/") : p;
    const absolute = resolve(cwd, separated).replace(/\\/g, "/").replace(/\/+$/, "");
    return windows ? absolute.toLowerCase() : absolute;
  };
  return normalize(value) === normalize(ARCANE_HOOKS_DIR);
}

const HOOK_BODY = `#!/bin/sh
# Installed by Arcane because this repository's .arcane.json sets
# push_policy: "blocked".
#
# This is deliberately not tamper-proof. It guards against an accidental push
# -- the wrong remote, muscle memory, an unsupervised agent -- not against a
# determined operator, who can always bypass it.
#
# To push legitimately, undo the policy first:
#
#     spell unblock-push
#
# That command is interactive-only and asks you to confirm the repository by
# name. Do not work around this hook by other means: the manifest would then
# claim a protection this repository no longer has.
echo "arcane: push blocked (push_policy: blocked). Run 'spell unblock-push' to undo." >&2
exit 1
`;

/**
 * Human phrasing for a config scope.
 *
 * Worth its own function because "globally" was previously printed for anything
 * not local — including a system-scope value and a per-worktree one, neither of
 * which the operator would find where that message sends them.
 */
export function describeConfigScope(scope: ConfigScope): string {
  switch (scope) {
    case "local":
      return "set for this repository";
    case "worktree":
      return "set for this worktree";
    case "global":
      return "set globally, for your user";
    case "system":
      return "set system-wide";
    case "command":
      return "set on the command line";
    default:
      return "scope unknown";
  }
}

/** Absolute path of the hook file Arcane installs. */
export function hookFilePath(cwd: string): string {
  return join(cwd, ARCANE_HOOKS_DIR, "pre-push");
}

/**
 * Installs the pre-push hook, refusing rather than clobbering someone else's
 * hook manager (R7).
 *
 * `core.hooksPath` is a single exclusive slot — Git reads one directory, never
 * several — so pointing it at Arcane's directory silently disables Husky,
 * Lefthook, pre-commit, or anything else already using it, at either local or
 * global scope. This repository's own `core.hooksPath` is `.husky/_`, running
 * lint, typecheck and the full test suite; a naive install would have turned
 * that off while appearing to add protection.
 */
export async function installPrePushHook(cwd: string): Promise<HookInstallOutcome> {
  const existing = await readHooksPath(cwd);

  if (existing?.unreadable === true) return { status: "refused-unreadable-config" };

  if (existing !== undefined && !isArcaneHooksPath(cwd, existing.value)) {
    return {
      status: "refused-foreign-hooks-path",
      existing: existing.value,
      scope: existing.scope,
    };
  }

  const hookPath = hookFilePath(cwd);

  if (existing !== undefined && (await hookBodyMatches(cwd))) return { status: "already-ours" };

  await mkdir(join(cwd, ARCANE_HOOKS_DIR), { recursive: true });
  await writeFile(hookPath, HOOK_BODY, "utf-8");
  // Git requires the hook be executable on POSIX. chmod is a no-op for the
  // owner on Windows, which is fine -- Git for Windows does not check the bit.
  await chmod(hookPath, 0o755);
  await runGit(cwd, ["config", "--local", "core.hooksPath", ARCANE_HOOKS_DIR]);

  return { status: "installed", path: hookPath };
}

/**
 * True only if the hook is genuinely in force: the config points at Arcane's
 * directory AND the hook file actually exists there.
 *
 * Checking the config alone is a declaration check, not an enforcement check —
 * deleting the hook file leaves the config intact and pushes succeed.
 */
export async function isHookEnforced(cwd: string): Promise<boolean> {
  const hooksPath = await readHooksPath(cwd);
  if (hooksPath === undefined || !isArcaneHooksPath(cwd, hooksPath.value)) return false;
  return hookBodyMatches(cwd);
}

/**
 * True when the hook file on disk is the one Arcane wrote, byte for byte.
 *
 * Existence alone is not enforcement: a zero-byte file, or one edited down to
 * `exit 0`, leaves the config pointing at a hook that blocks nothing while
 * `doctor` reports a pass. That is the same declaration-versus-enforcement
 * confusion review already found one level up, so the check compares content --
 * which `installPrePushHook` already needed for its `already-ours` decision.
 */
async function hookBodyMatches(cwd: string): Promise<boolean> {
  const hookPath = hookFilePath(cwd);
  if (!(await fileExists(hookPath))) return false;
  try {
    if ((await readFile(hookPath, "utf-8")) !== HOOK_BODY) return false;
  } catch {
    return false;
  }

  // On POSIX, git silently skips a hook that is not executable, so the right
  // body in a non-executable file is still not enforcement. Git for Windows
  // does not consult the bit, and chmod there is largely advisory, so checking
  // it would produce a false "not enforced" for a hook that demonstrably fires.
  if (process.platform === "win32") return true;
  try {
    await access(hookPath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Removes the hook wiring. Leaves a foreign `core.hooksPath` untouched. */
export async function removePrePushHook(cwd: string): Promise<void> {
  const existing = await readHooksPath(cwd);
  if (existing === undefined || existing.unreadable === true) return;
  if (!isArcaneHooksPath(cwd, existing.value)) return;
  if (existing.scope !== "local" && existing.scope !== "worktree") return;

  // Unset at the scope the value actually lives in. `--local` cannot touch a
  // per-worktree `config.worktree` value, so accepting worktree scope above and
  // then unsetting locally left the hook fully in force while `unblock-push`
  // printed "Push unblocked".
  const scopeFlag = existing.scope === "worktree" ? "--worktree" : "--local";
  try {
    await runGit(cwd, ["config", scopeFlag, "--unset", "core.hooksPath"]);
  } catch {
    // Already unset; nothing to undo.
  }

  // Remove the hook file too. Leaving it behind means a later `spell init` that
  // re-points core.hooksPath silently re-arms a block the operator lifted.
  try {
    await rm(hookFilePath(cwd), { force: true });
  } catch {
    // Non-fatal: with core.hooksPath unset, git no longer reads this directory.
  }
}

/** Every configured remote name, in git's own order. */
export async function listRemotes(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await runGit(cwd, ["remote"]);
    return stdout
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Each remote with the URL(s) a push would actually reach.
 *
 * The `guarded` reminder exists to catch a *wrong remote*, and a bare name like
 * `origin` says nothing about where it points — which is the entire question.
 */
export async function pushTargets(cwd: string): Promise<{ remote: string; urls: string[] }[]> {
  const targets: { remote: string; urls: string[] }[] = [];
  for (const remote of await listRemotes(cwd)) {
    try {
      const { stdout } = await runGit(cwd, ["remote", "get-url", "--push", "--all", remote]);
      targets.push({
        remote,
        urls: stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });
    } catch {
      targets.push({ remote, urls: [] });
    }
  }
  return targets;
}

export type PushUrlStatus =
  | "disabled"
  | "already-disabled"
  | "restored"
  | "nothing-recorded"
  | "failed";

export interface PushUrlResult {
  remote: string;
  status: PushUrlStatus;
  /** Present only on "failed". Why this remote could not be covered. */
  reason?: string;
}

/**
 * Where a remote's original push URL is recorded.
 *
 * Deliberately a key *inside the remote's own section* rather than a flat
 * `arcane.originalPushUrl.<remote>`, which review broke three ways:
 *
 *   - `my_remote` is a legal remote name but an illegal trailing config key
 *     (that segment must be alphanumeric or `-`), so `git config` errored and
 *     aborted the whole loop, leaving every later remote live while the operator
 *     had been told the repository was blocked.
 *   - Trailing key segments are case-INSENSITIVE, so remotes `origin` and
 *     `Origin` collided on one key: one original was lost and restore pointed a
 *     remote at the other's URL -- the wrong-remote push this feature exists to
 *     prevent.
 *   - `git remote rename` left the flat key orphaned, so restore silently found
 *     nothing while `unblock-push` still reported success.
 *
 * A `remote.<name>.*` subsection has none of those problems: git accepts any
 * legal remote name there, subsection names ARE case-sensitive, and `git remote
 * rename` moves the whole section including keys it has never heard of. All
 * three verified directly against git 2.53 before this was written.
 */
function originalPushUrlKey(remote: string): string {
  return `remote.${remote}.arcaneOriginalPushUrl`;
}

/** Reads every value of a possibly-multivalued local config key. */
async function readLocalAll(cwd: string, key: string): Promise<string[]> {
  try {
    const { stdout } = await runGit(cwd, ["config", "--local", "--get-all", key]);
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    // Exit 1 == key absent.
    return [];
  }
}

/**
 * Every value of a multivalued key, WITH the scope each came from.
 *
 * `remote.<name>.pushurl` is multivalued and git collects values across system,
 * global and local scope. Reading only `--local` was a silent hole: a pushurl
 * configured globally stayed invisible, a local `--replace-all` *appended* the
 * sentinel instead of replacing the live URL, and because the global value sorts
 * first git delivered the push to it and only then failed on the sentinel. The
 * exit code was 128 and the history was already gone -- with `doctor` reporting
 * the repository fully covered.
 */
async function readScopedAll(cwd: string, key: string): Promise<{ scope: string; value: string }[]> {
  let stdout: string;
  try {
    ({ stdout } = await runGit(cwd, ["config", "--show-scope", "--get-all", key]));
  } catch {
    return [];
  }
  return stdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      // `<scope>\t<value>`; the value may itself contain tabs, so split once.
      const separator = line.indexOf("\t");
      if (separator === -1) return { scope: "unknown", value: line.trim() };
      return { scope: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() };
    })
    .filter((entry) => entry.value !== "");
}

/** Push URLs git would actually use for a remote, across every config scope. */
async function effectivePushUrls(cwd: string, remote: string): Promise<string[]> {
  const scoped = await readScopedAll(cwd, `remote.${remote}.pushurl`);
  return scoped.map((entry) => entry.value);
}

/**
 * Points every remote's PUSH url at a sentinel, so `git push` fails at the
 * transport layer. Fetch is unaffected: fetch URLs are left alone, so a blocked
 * repository can still pull.
 *
 * Applies to ALL remotes, not just `origin` — a repository commonly has an
 * `upstream` or `backup` too, and protecting only one of them protects nothing
 * in particular.
 *
 * Each original is recorded in `arcane.originalPushUrl.<remote>` so
 * `spell unblock-push` restores exactly what was there rather than guessing
 * from the fetch URL, which is legitimately allowed to differ.
 */
export async function disablePushUrls(cwd: string): Promise<PushUrlResult[]> {
  const results: PushUrlResult[] = [];
  for (const remote of await listRemotes(cwd)) {
    // One remote must never take the others down with it. The previous loop let
    // a single `git config` error propagate, so an oddly-named remote left every
    // remote after it in git's ordering completely unprotected -- silently, in a
    // repository the operator had just been told was blocked. Failures are now
    // recorded per remote and reported, and the loop continues.
    try {
      results.push(await disableOneRemote(cwd, remote));
    } catch (error) {
      results.push({ remote, status: "failed", reason: describeError(error) });
    }
  }
  return results;
}

async function disableOneRemote(cwd: string, remote: string): Promise<PushUrlResult> {
  const scoped = await readScopedAll(cwd, `remote.${remote}.pushurl`);

  // A pushurl set outside this repository cannot be neutralised from inside it.
  // Config is additive for multivalued keys: a local write ADDS to git's list,
  // it cannot subtract the outside value, and the outside value sorts first --
  // so the push is delivered and only then fails on the sentinel. Refuse and say
  // so, rather than writing a sentinel that makes the repository look covered
  // while the history walks out the front door.
  const foreign = scoped.filter((entry) => entry.scope !== "local" && entry.value !== DISABLED_PUSH_URL);
  if (foreign.length > 0) {
    const where = [...new Set(foreign.map((entry) => entry.scope))].join(", ");
    return {
      remote,
      status: "failed",
      reason:
        `a push URL for this remote is configured at ${where} scope, which this repository cannot ` +
        `override — git would still deliver the push there. Remove it with ` +
        `\`git config --${where.split(", ")[0]} --unset-all remote.${remote}.pushurl\` and re-apply.`,
    };
  }

  const currentPushUrls = scoped.map((entry) => entry.value);
  if (currentPushUrls.length === 1 && currentPushUrls[0] === DISABLED_PUSH_URL) {
    return { remote, status: "already-disabled" };
  }

  const key = originalPushUrlKey(remote);
  // Record what was there BEFORE overwriting, and only if we have not already
  // recorded it -- otherwise a second disable would enshrine the sentinel as the
  // "original" and make restore impossible.
  if ((await readLocalAll(cwd, key)).length === 0 && !(await hadNoPushUrl(cwd, remote))) {
    if (currentPushUrls.length > 0) {
      await runGit(cwd, ["config", "--local", "--replace-all", key, currentPushUrls[0]!]);
      for (const extra of currentPushUrls.slice(1)) {
        await runGit(cwd, ["config", "--local", "--add", key, extra]);
      }
    } else {
      // A remote with no pushurl key pushes to its fetch URL. Record that as a
      // separate marker rather than a magic URL value, so restore removes the
      // key instead of pinning one that was never there -- and so a remote whose
      // genuine URL happened to equal the marker cannot be misread as "none".
      await runGit(cwd, ["config", "--local", NO_PUSH_URL_MARKER(remote), "true"]);
    }
  }

  // `--replace-all` rather than `git remote set-url --push`: a mirror remote
  // with two push URLs makes set-url refuse outright ("has multiple values"),
  // which used to abort the run and leave BOTH mirrors pushable.
  await runGit(cwd, [
    "config",
    "--local",
    "--replace-all",
    `remote.${remote}.pushurl`,
    DISABLED_PUSH_URL,
  ]);
  return { remote, status: "disabled" };
}

/**
 * Remotes whose push URL is NOT fully disabled. Empty when fully covered.
 *
 * A remote counts as open if ANY of its push URLs is live — a mirror with one
 * blocked and one live URL still delivers the push.
 */
export async function undisabledRemotes(cwd: string): Promise<string[]> {
  const open: string[] = [];
  for (const remote of await listRemotes(cwd)) {
    // Effective, not local: a pushurl inherited from global or system scope is
    // a live delivery path, and reading only local scope reported such a remote
    // as covered while `--no-verify` alone still delivered the history.
    const urls = await effectivePushUrls(cwd, remote);
    if (urls.length === 0 || urls.some((url) => url !== DISABLED_PUSH_URL)) open.push(remote);
  }
  return open;
}

/**
 * Remotes still carrying the sentinel push URL.
 *
 * The inverse of `undisabledRemotes`, and needed after an unblock: if a remote
 * was renamed while blocked, its recorded original moved with it but a different
 * remote can be left holding the sentinel with nothing to restore from. Checked
 * directly rather than inferred from what the restore believes it did.
 */
export async function blockedRemotes(cwd: string): Promise<string[]> {
  const blocked: string[] = [];
  for (const remote of await listRemotes(cwd)) {
    const urls = await effectivePushUrls(cwd, remote);
    if (urls.some((url) => url === DISABLED_PUSH_URL)) blocked.push(remote);
  }
  return blocked;
}

/** Restores every recorded push URL. Used only by `spell unblock-push`. */
export async function restorePushUrls(cwd: string): Promise<PushUrlResult[]> {
  const results: PushUrlResult[] = [];
  for (const remote of await listRemotes(cwd)) {
    try {
      results.push(await restoreOneRemote(cwd, remote));
    } catch (error) {
      results.push({ remote, status: "failed", reason: describeError(error) });
    }
  }
  return results;
}

async function restoreOneRemote(cwd: string, remote: string): Promise<PushUrlResult> {
  const key = originalPushUrlKey(remote);
  let recorded = await readLocalAll(cwd, key);
  let hadNone = await hadNoPushUrl(cwd, remote);

  if (recorded.length === 0 && !hadNone) {
    const legacy = await readLegacyRecord(cwd, remote);
    if (legacy.status !== "usable") return { remote, status: legacy.status, reason: legacy.reason };
    recorded = legacy.values;
    hadNone = false;
  }

  if (hadNone) {
    await runGit(cwd, ["config", "--local", "--unset-all", `remote.${remote}.pushurl`]);
  } else {
    await runGit(cwd, [
      "config",
      "--local",
      "--replace-all",
      `remote.${remote}.pushurl`,
      recorded[0]!,
    ]);
    for (const extra of recorded.slice(1)) {
      await runGit(cwd, ["config", "--local", "--add", `remote.${remote}.pushurl`, extra]);
    }
  }

  for (const staleKey of [key, NO_PUSH_URL_MARKER(remote), `arcane.originalPushUrl.${remote}`]) {
    try {
      await runGit(cwd, ["config", "--local", "--unset-all", staleKey]);
    } catch {
      // Non-fatal: the URL is restored, which is what matters.
    }
  }
  return { remote, status: "restored" };
}

async function hadNoPushUrl(cwd: string, remote: string): Promise<boolean> {
  return (await readLocalAll(cwd, NO_PUSH_URL_MARKER(remote)))[0] === "true";
}

/**
 * Reads a record left by the released `0.20.0`, which stored originals in a flat
 * `arcane.originalPushUrl.<remote>` key -- and only applies it when it can be
 * trusted.
 *
 * Applying it unconditionally reintroduced, for exactly the population told to
 * upgrade, the wrong-remote push this release fixes. Two ways, both reproduced:
 *
 *   - Trailing config-key segments are case-insensitive, so `0.20.0` wrote one
 *     key for both `origin` and `Origin` and only the last writer survived.
 *     Restoring it points one remote at the OTHER remote's URL, reported as a
 *     clean success.
 *   - Unlike a `remote.<name>.*` key, the flat key survives `git remote remove`.
 *     A remote deleted and re-added to a different URL gets silently restored to
 *     the old target.
 *
 * So the record is used only when the remote is still carrying OUR sentinel
 * (which a re-added remote is not) and no two remote names collide
 * case-insensitively. Otherwise the value is reported for the operator to apply
 * by hand: a restore that might pick the wrong remote is worse than none.
 */
async function readLegacyRecord(
  cwd: string,
  remote: string,
): Promise<
  | { status: "usable"; values: string[] }
  | { status: "nothing-recorded" | "failed"; reason?: string }
> {
  const values = await readLocalAll(cwd, `arcane.originalPushUrl.${remote}`);
  if (values.length === 0) return { status: "nothing-recorded" };

  const current = await effectivePushUrls(cwd, remote);
  if (!current.includes(DISABLED_PUSH_URL)) {
    return {
      status: "failed",
      reason:
        `found a push URL recorded by 0.20.0 ("${values.join(", ")}") but this remote is not ` +
        "currently blocked by Arcane, so the record may belong to a different remote of the same " +
        "name. Not applying it — set the URL yourself if it is correct.",
    };
  }

  const names = await listRemotes(cwd);
  const collides = names.some(
    (other) => other !== remote && other.toLowerCase() === remote.toLowerCase(),
  );
  if (collides) {
    return {
      status: "failed",
      reason:
        `this repository has remotes whose names differ only by case, and 0.20.0 stored their ` +
        `original push URLs under one shared key, so the recorded value ("${values.join(", ")}") ` +
        "cannot be attributed to a specific remote. Not applying it — set the URLs yourself.",
    };
  }

  return { status: "usable", values };
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0]!.trim();
}
