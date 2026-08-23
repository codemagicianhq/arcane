import { basename, resolve } from "node:path";
import { input } from "@inquirer/prompts";
import { readManifest, writeManifest, ManifestNotFoundError } from "../modules/manifest.js";
import {
  removePrePushHook,
  restorePushUrls,
  blockedRemotes,
  isHookEnforced,
} from "../modules/push-safety.js";
import { printInfo, printSuccess, printWarning } from "../modules/banner.js";
import type { ArcaneManifest } from "../types.js";

/**
 * Runs `spell unblock-push` (EF-09 R5).
 *
 * Deliberately its own command and never a side effect of `init`/`update`:
 * a protection that can be lifted by a routine command is not a protection.
 *
 * Two gates, and the PRD is honest about what each one is worth:
 *
 * - **Interactive TTY only.** This is the real bar against a scripted agent —
 *   the threat actor the PRD ranks second, since a push is irreversible. It is
 *   not absolute (a pseudo-TTY defeats it), and the PRD says so rather than
 *   claiming otherwise.
 * - **Typed repository name.** This guards a human against unblocking the wrong
 *   repository. It is explicitly NOT agent-resistance: anything that can read
 *   `.arcane.json` can read the name back.
 */
export async function runUnblockPush(targetDir: string): Promise<void> {
  let manifest: ArcaneManifest;
  try {
    manifest = await readManifest(targetDir);
  } catch (err) {
    if (err instanceof ManifestNotFoundError) {
      console.error('Not initialized. Run "spell init" first.');
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw err;
  }

  const policy = manifest.push_policy ?? "open";
  if (policy === "open") {
    printInfo("This repository is not push-blocked — nothing to undo.");
    return;
  }

  if (!process.stdin.isTTY) {
    console.error(
      "spell unblock-push must be run from an interactive terminal.\n" +
        "Lifting a push block is a deliberate decision, so it cannot be scripted, piped, or run in CI.",
    );
    process.exit(1);
    return;
  }

  const repoName = basename(resolve(targetDir));
  if (repoName === "") {
    // A repository at a filesystem root has no basename, which would turn the
    // confirmation into "press Enter". A gate that can silently become vacuous
    // must fail closed instead.
    console.error(
      "Could not determine a repository name to confirm against (is this repository at a filesystem root?). Refusing to unblock.",
    );
    process.exit(1);
    return;
  }

  printWarning(`This repository's push_policy is "${policy}".`);
  printInfo(
    "Unblocking restores the ability to push this repository's full history to its remote. " +
      "Deleting a file later does not undo a push: the content stays in history, in any clone " +
      "already made, and in the remote's own backups.",
  );
  console.log();

  const typed = await input({
    message: `Type the repository name to confirm (${repoName}):`,
  });

  if (typed.trim() !== repoName) {
    console.error(`\nName did not match ("${typed.trim()}" ≠ "${repoName}"). Nothing changed.`);
    process.exit(1);
    return;
  }

  await removePrePushHook(targetDir);
  const results = await restorePushUrls(targetDir);
  const restored = results.filter((r) => r.status === "restored").map((r) => r.remote);
  const failed = results.filter((r) => r.status === "failed");
  // A remote still carrying the sentinel after we claimed to have unblocked it
  // is the manifest-lies-about-posture failure in the opposite direction, so it
  // is checked directly rather than inferred from what we think we did.
  const stillBlocked = await blockedRemotes(targetDir);

  // No "just this once" mode: the manifest must never claim a protection the
  // repository no longer has.
  const updated: ArcaneManifest = {
    ...manifest,
    push_policy: "open",
    push_policy_unblocked_at: new Date().toISOString(),
  };
  await writeManifest(targetDir, updated);

  // Check the hook too, not just the URLs: `removePrePushHook` declines to touch
  // a foreign or unreadable core.hooksPath, so it can legitimately do nothing.
  const hookStillOn = await isHookEnforced(targetDir);
  const fullyLifted = failed.length === 0 && stillBlocked.length === 0 && !hookStillOn;

  // Never let a partial result read as a clean one. Reporting success first and
  // appending warnings underneath is exactly the shape this feature refuses to
  // accept elsewhere.
  if (fullyLifted) {
    printSuccess(`Push unblocked for "${repoName}".`);
  } else {
    printWarning(
      `Push only PARTIALLY unblocked for "${repoName}". The manifest now says open; the ` +
        "repository is not fully open yet. Details below.",
    );
  }
  if (restored.length > 0) {
    printInfo(`Restored push URL for: ${restored.join(", ")}.`);
  }
  if (hookStillOn) {
    printWarning(
      "The pre-push hook is still in force. Arcane did not remove it because `core.hooksPath` is " +
        "not one it owns, or could not be read. Check `git config --show-scope --get core.hooksPath`.",
    );
  }
  if (failed.length > 0) {
    printWarning(
      `Could not restore the push URL for: ${failed
        .map((r) => `${r.remote} (${r.reason ?? "unknown error"})`)
        .join("; ")}.`,
    );
  }
  if (stillBlocked.length > 0) {
    // Most likely cause: the remote was renamed while blocked, so the recorded
    // original moved with it but a *different* remote now carries the sentinel.
    printWarning(
      `These remotes still have a blocked push URL and no recorded original: ${stillBlocked.join(", ")}. ` +
        "Set them yourself with `git remote set-url --push <name> <url>` — until then, pushing to " +
        "them will fail even though the manifest now says open.",
    );
  }
  printInfo(
    "Recorded in .arcane.json as push_policy: open, with the time it was lifted. " +
      "Commit that change so the repository's actual posture stays visible to everyone.",
  );
}
