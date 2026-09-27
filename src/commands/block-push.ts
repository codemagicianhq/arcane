import { readManifest, writeManifest, ManifestNotFoundError } from "../modules/manifest.js";
import { inspectGitRepository } from "../modules/git.js";
import {
  applyBlockedPushControls,
  hookInForce,
  isHookEnforced,
  listRemotes,
  undisabledRemotes,
} from "../modules/push-safety.js";
import { printInfo, printSuccess, printWarning } from "../modules/banner.js";
import type { ArcaneManifest } from "../types.js";

/**
 * Runs `spell block-push` (ARC-049 decision 1): enforces `push_policy:
 * "blocked"` on an already-initialized repository by installing exactly what
 * `spell init` installs for it, through the same helper and with the same
 * refusals.
 *
 * No TTY gate, unlike `spell unblock-push`: this can only tighten. The
 * manifest is changed to `blocked` only once both controls are in force, so
 * a refusal never leaves it claiming a protection the repository lacks.
 */
export async function runBlockPush(targetDir: string): Promise<void> {
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

  if (manifest.scope === "user") {
    console.error(
      "spell block-push applies to a repository, not the user tier: push_policy describes a repository.",
    );
    process.exit(1);
    return;
  }

  if ((await inspectGitRepository(targetDir)).status === "not-repository") {
    console.error("spell block-push needs a Git repository: there is nothing here to block.");
    process.exit(1);
    return;
  }

  const recorded = manifest.push_policy ?? "open";
  const alreadyEnforced =
    recorded === "blocked" &&
    (await isHookEnforced(targetDir)) &&
    (await undisabledRemotes(targetDir)).length === 0;
  if (alreadyEnforced) {
    printSuccess("Push is already blocked and enforced here. Nothing changed.");
    if ((await listRemotes(targetDir)).length === 0) {
      printWarning(
        "No remote is configured, so only the pre-push hook is active. Re-run `spell block-push` " +
          "after adding a remote to disable its push URL too.",
      );
    }
    printInfo("Run `spell unblock-push` from a terminal to undo this.");
    return;
  }

  const outcome = await applyBlockedPushControls(targetDir, {
    stopOnHookRefusal: true,
    emit: (m) => (m.level === "warning" ? printWarning(m.text) : printInfo(m.text)),
  });

  const failedRemotes = outcome.urls.filter((u) => u.status === "failed");
  if (!hookInForce(outcome.hook) || failedRemotes.length > 0) {
    printWarning(
      outcome.stoppedAtHook
        ? "Nothing was changed. Resolve the refusal above and re-run `spell block-push`."
        : "Push is NOT fully blocked: the remotes named above can still be pushed to. Fix them and " +
            "re-run `spell block-push`.",
    );
    if (recorded !== "blocked") {
      printInfo(
        `The manifest still records push_policy: "${recorded}" — it is not changed to "blocked" ` +
          "until both controls are in force.",
      );
    }
    process.exit(1);
    return;
  }

  if (recorded !== "blocked") {
    await writeManifest(targetDir, { ...manifest, push_policy: "blocked" });
    printSuccess(`Push blocked. Recorded push_policy: "blocked" (was "${recorded}") in .arcane.json.`);
    printInfo("Commit that change so the repository's posture stays visible to everyone.");
  } else {
    printSuccess('Push blocked. The manifest already recorded push_policy: "blocked"; it is now enforced.');
  }
}
