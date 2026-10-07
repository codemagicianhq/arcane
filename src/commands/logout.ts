import { printInfo, printSuccess } from "../modules/banner.js";
import { KeychainUnavailableError } from "../modules/credential-store.js";
import { createSessionStorage, SessionClearError, type SessionStorage } from "../modules/session-store.js";

/**
 * Runs `spell logout` (features/spell-login/PRD.md, R3): removes the session
 * from every medium `spell login` can write to and says what it removed.
 * Succeeds when nothing was stored. Local only: the session at the identity
 * service stays valid until it expires (R21 is a later release), and the
 * output says so rather than implying otherwise.
 */
export function runLogout(storage: SessionStorage = createSessionStorage()): void {
  let removed: ("keychain" | "file")[];
  try {
    removed = storage.clear().removed;
  } catch (error) {
    if (error instanceof SessionClearError) {
      const fileResult = error.removed.includes("file") ? "The insecure session file was removed. " : "";
      console.error(
        `${fileResult}${error.keychainError.message} Any session in the OS keychain could not be verified or removed.`,
      );
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    if (error instanceof KeychainUnavailableError) {
      console.error(`${error.message} The session could not be removed from it.`);
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw error;
  }

  if (removed.length === 0) {
    printSuccess("Nothing was stored; you were already signed out.");
    return;
  }
  const where = removed.map((m) => (m === "keychain" ? "the OS keychain" : "the insecure session file")).join(" and ");
  printSuccess(`Signed out: removed the session from ${where}.`);
  printInfo("This signs out this machine only; the session at the identity service stays valid until it expires.");
}
