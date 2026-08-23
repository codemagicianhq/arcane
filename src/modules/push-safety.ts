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
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import { fileExists } from "./copier.js";
import { runGit } from "./git.js";

/** Sentinel push URL. Not a real scheme, so git fails to resolve a helper. */
export const DISABLED_PUSH_URL = "arcane-push-blocked://this-repository-is-push-blocked";

/** Directory Arcane points `core.hooksPath` at when it owns the hooks. */
export const ARCANE_HOOKS_DIR = ".arcane/hooks";

export interface HooksPathInfo {
  /** The effective value git would use, respecting local > global > system. */
  value: string;
  /** Where it is set. "local" is the only scope Arcane may take over. */
  scope: "local" | "inherited";
}

export type HookInstallOutcome =
  | { status: "installed"; path: string }
  | { status: "already-ours" }
  | { status: "refused-foreign-hooks-path"; existing: string; scope: "local" | "inherited" };

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
  let effective: string;
  try {
    const { stdout } = await runGit(cwd, ["config", "--get", "core.hooksPath"]);
    effective = stdout.trim();
  } catch {
    // Exit 1 means "not set anywhere". An unreadable config lands here too,
    // and callers treat both as "cannot claim it" only via the checks below.
    return undefined;
  }
  if (effective === "") return undefined;

  let local = "";
  try {
    const { stdout } = await runGit(cwd, ["config", "--local", "--get", "core.hooksPath"]);
    local = stdout.trim();
  } catch {
    // Not set locally — so the effective value is inherited.
  }

  return { value: effective, scope: local === effective && local !== "" ? "local" : "inherited" };
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

  if (existing !== undefined && existing.value !== ARCANE_HOOKS_DIR) {
    return {
      status: "refused-foreign-hooks-path",
      existing: existing.value,
      scope: existing.scope,
    };
  }

  const hookPath = hookFilePath(cwd);

  if (existing?.value === ARCANE_HOOKS_DIR && (await fileExists(hookPath))) {
    const current = await readFile(hookPath, "utf-8");
    if (current === HOOK_BODY) return { status: "already-ours" };
  }

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
  if (hooksPath?.value !== ARCANE_HOOKS_DIR) return false;
  return fileExists(hookFilePath(cwd));
}

/** Removes the hook wiring. Leaves a foreign `core.hooksPath` untouched. */
export async function removePrePushHook(cwd: string): Promise<void> {
  const existing = await readHooksPath(cwd);
  if (existing?.value !== ARCANE_HOOKS_DIR || existing.scope !== "local") return;
  try {
    await runGit(cwd, ["config", "--local", "--unset", "core.hooksPath"]);
  } catch {
    // Already unset; nothing to undo.
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

export interface PushUrlResult {
  remote: string;
  status: "disabled" | "already-disabled";
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
    let current: string;
    try {
      const { stdout } = await runGit(cwd, ["remote", "get-url", "--push", remote]);
      current = stdout.trim();
    } catch {
      continue;
    }
    if (current === DISABLED_PUSH_URL) {
      results.push({ remote, status: "already-disabled" });
      continue;
    }
    await runGit(cwd, ["config", "--local", `arcane.originalPushUrl.${remote}`, current]);
    await runGit(cwd, ["remote", "set-url", "--push", remote, DISABLED_PUSH_URL]);
    results.push({ remote, status: "disabled" });
  }
  return results;
}

/** Remotes whose push URL is NOT disabled. Empty when fully covered. */
export async function undisabledRemotes(cwd: string): Promise<string[]> {
  const open: string[] = [];
  for (const remote of await listRemotes(cwd)) {
    try {
      const { stdout } = await runGit(cwd, ["remote", "get-url", "--push", remote]);
      if (stdout.trim() !== DISABLED_PUSH_URL) open.push(remote);
    } catch {
      // Unreadable — cannot claim it is disabled.
      open.push(remote);
    }
  }
  return open;
}

/** Restores every recorded push URL. Used only by `spell unblock-push`. */
export async function restorePushUrls(cwd: string): Promise<string[]> {
  const restored: string[] = [];
  for (const remote of await listRemotes(cwd)) {
    let original = "";
    try {
      const { stdout } = await runGit(cwd, [
        "config",
        "--local",
        "--get",
        `arcane.originalPushUrl.${remote}`,
      ]);
      original = stdout.trim();
    } catch {
      continue;
    }
    if (original === "") continue;

    await runGit(cwd, ["remote", "set-url", "--push", remote, original]);
    try {
      await runGit(cwd, ["config", "--local", "--unset", `arcane.originalPushUrl.${remote}`]);
    } catch {
      // Non-fatal: the URL is restored, which is what matters.
    }
    restored.push(remote);
  }
  return restored;
}
