/**
 * Push safety (EF-09 / features/push-safety/PRD.md).
 *
 * Two layered controls for a repository whose history must not reach a remote:
 * a `pre-push` hook, and a disabled push URL. Neither is tamper-proof, and the
 * PRD is explicit that they are not meant to be — the threat modelled is an
 * *accidental* push (wrong remote, muscle memory, an unsupervised agent), not a
 * determined operator. Overclaiming here would be its own hazard.
 *
 * The push URL matters because `git push --no-verify` skips hooks entirely;
 * only the transport-layer failure catches that path.
 */
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import { fileExists } from "./copier.js";
import { runGit } from "./git.js";

/** Sentinel push URL. Not a real scheme, so git fails to resolve a helper. */
export const DISABLED_PUSH_URL = "arcane-push-blocked://this-repository-is-push-blocked";

/** Directory Arcane points `core.hooksPath` at when it owns the hooks. */
export const ARCANE_HOOKS_DIR = ".arcane/hooks";

export type HookInstallOutcome =
  | { status: "installed"; path: string }
  | { status: "already-ours" }
  | { status: "refused-foreign-hooks-path"; existing: string };

/**
 * Reads `core.hooksPath` if set. Returns undefined when unset — the common case
 * and the only one where installing is unambiguous.
 */
export async function readHooksPath(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await runGit(cwd, ["config", "--local", "--get", "core.hooksPath"]);
    const value = stdout.trim();
    return value === "" ? undefined : value;
  } catch {
    // Exit 1 simply means "not set". Anything else (unreadable config) is
    // equally "we cannot claim it", and the caller refuses either way.
    return undefined;
  }
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
 * Installs the pre-push hook, refusing rather than clobbering someone else's
 * hook manager (R7).
 *
 * `core.hooksPath` is a single exclusive slot — Git reads one directory, never
 * several — so pointing it at Arcane's directory silently disables Husky,
 * Lefthook, pre-commit, or anything else already using it. This repository's
 * own `core.hooksPath` is `.husky/_`, running lint, typecheck and the full test
 * suite; a naive install here would have turned that off while appearing to add
 * protection.
 */
export async function installPrePushHook(cwd: string): Promise<HookInstallOutcome> {
  const existing = await readHooksPath(cwd);

  if (existing !== undefined && existing !== ARCANE_HOOKS_DIR) {
    return { status: "refused-foreign-hooks-path", existing };
  }

  const hookDir = join(cwd, ARCANE_HOOKS_DIR);
  const hookPath = join(hookDir, "pre-push");

  if (existing === ARCANE_HOOKS_DIR && (await fileExists(hookPath))) {
    const current = await readFile(hookPath, "utf-8");
    if (current === HOOK_BODY) return { status: "already-ours" };
  }

  await mkdir(hookDir, { recursive: true });
  await writeFile(hookPath, HOOK_BODY, "utf-8");
  // Git requires the hook be executable on POSIX. chmod is a no-op for the
  // owner on Windows, which is fine -- Git for Windows does not check the bit.
  await chmod(hookPath, 0o755);
  await runGit(cwd, ["config", "--local", "core.hooksPath", ARCANE_HOOKS_DIR]);

  return { status: "installed", path: hookPath };
}

/** Removes the hook wiring. Leaves a foreign `core.hooksPath` untouched. */
export async function removePrePushHook(cwd: string): Promise<void> {
  const existing = await readHooksPath(cwd);
  if (existing !== ARCANE_HOOKS_DIR) return;
  try {
    await runGit(cwd, ["config", "--local", "--unset", "core.hooksPath"]);
  } catch {
    // Already unset; nothing to undo.
  }
}

export type PushUrlOutcome =
  | { status: "disabled"; remote: string; original: string }
  | { status: "already-disabled"; remote: string }
  | { status: "no-remote" };

/**
 * Points the remote's PUSH url at a sentinel, so `git push` fails at the
 * transport layer. Fetch is unaffected: the fetch URL is left alone, so a
 * blocked repository can still pull.
 *
 * The original is recorded in `arcane.originalPushUrl` so `spell unblock-push`
 * can restore exactly what was there rather than guessing from the fetch URL —
 * they are legitimately allowed to differ.
 */
export async function disablePushUrl(cwd: string, remote = "origin"): Promise<PushUrlOutcome> {
  let current: string;
  try {
    const { stdout } = await runGit(cwd, ["remote", "get-url", "--push", remote]);
    current = stdout.trim();
  } catch {
    return { status: "no-remote" };
  }

  if (current === DISABLED_PUSH_URL) return { status: "already-disabled", remote };

  await runGit(cwd, ["config", "--local", `arcane.originalPushUrl.${remote}`, current]);
  await runGit(cwd, ["remote", "set-url", "--push", remote, DISABLED_PUSH_URL]);
  return { status: "disabled", remote, original: current };
}

export type RestoreUrlOutcome =
  | { status: "restored"; remote: string; url: string }
  | { status: "nothing-to-restore" };

/** Restores the recorded push URL. Used only by `spell unblock-push`. */
export async function restorePushUrl(cwd: string, remote = "origin"): Promise<RestoreUrlOutcome> {
  let original: string;
  try {
    const { stdout } = await runGit(cwd, [
      "config",
      "--local",
      "--get",
      `arcane.originalPushUrl.${remote}`,
    ]);
    original = stdout.trim();
  } catch {
    return { status: "nothing-to-restore" };
  }
  if (original === "") return { status: "nothing-to-restore" };

  await runGit(cwd, ["remote", "set-url", "--push", remote, original]);
  try {
    await runGit(cwd, ["config", "--local", "--unset", `arcane.originalPushUrl.${remote}`]);
  } catch {
    // Non-fatal: the URL is restored, which is what matters.
  }
  return { status: "restored", remote, url: original };
}
