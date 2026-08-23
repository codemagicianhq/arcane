import { basename, resolve } from "node:path";
import { input } from "@inquirer/prompts";
import { readManifest, writeManifest, ManifestNotFoundError } from "../modules/manifest.js";
import { removePrePushHook, restorePushUrl } from "../modules/push-safety.js";
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
  const restored = await restorePushUrl(targetDir);

  // No "just this once" mode: the manifest must never claim a protection the
  // repository no longer has.
  const updated: ArcaneManifest = {
    ...manifest,
    push_policy: "open",
    push_policy_unblocked_at: new Date().toISOString(),
  };
  await writeManifest(targetDir, updated);

  printSuccess(`Push unblocked for "${repoName}".`);
  if (restored.status === "restored") {
    printInfo(`Restored push URL for "${restored.remote}".`);
  }
  printInfo(
    "Recorded in .arcane.json as push_policy: open, with the time it was lifted. " +
      "Commit that change so the repository's actual posture stays visible to everyone.",
  );
}
