import { printInfo, printSuccess, printWarning } from "../modules/banner.js";
import { KeychainUnavailableError } from "../modules/credential-store.js";
import {
  IDENTITY_ENVIRONMENTS,
  SIGN_IN_SCOPES,
  type IdentityEnvironmentConfig,
} from "../modules/identity-config.js";
import { loadIdentityConfiguration, refreshSession } from "../modules/oidc.js";
import { createSessionStorage, type SessionStorage } from "../modules/session-store.js";
import { INSECURE_STORAGE_WARNING, describeAccount, safeErrorText, toSessionRecord } from "./login.js";
import type { Configuration } from "openid-client";

export interface WhoamiOptions {
  verify?: boolean;
}

export interface WhoamiDeps {
  storage: SessionStorage;
  loadConfiguration: (environment: IdentityEnvironmentConfig) => Promise<Configuration>;
  refreshSession: typeof refreshSession;
  now: () => Date;
}

export function defaultWhoamiDeps(): WhoamiDeps {
  return {
    storage: createSessionStorage(),
    loadConfiguration: (environment) => loadIdentityConfiguration(environment),
    refreshSession,
    now: () => new Date(),
  };
}

/**
 * Runs `spell whoami` (features/spell-login/PRD.md, R11): who is signed in,
 * from the stored session alone; `--verify` asks the identity service and
 * keeps the rotated refresh token it may return. Signed out is exit 1, so a
 * script can test for a session.
 */
export async function runWhoami(options: WhoamiOptions, deps: WhoamiDeps = defaultWhoamiDeps()): Promise<void> {
  let loaded;
  try {
    loaded = deps.storage.load();
  } catch (error) {
    if (error instanceof KeychainUnavailableError) {
      console.error(`${error.message} Cannot tell whether you are signed in.`);
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw error;
  }

  if (loaded.state === "signed-out") {
    console.error("Not signed in. Run `spell login`.");
    if (loaded.keychainError) console.error(loaded.keychainError.message);
    process.exit(1);
    return;
  }
  if (loaded.state === "corrupt") {
    console.error(
      `The stored session is damaged (${loaded.reason}), so you are treated as signed out. ` +
        "Run `spell logout` to clear it, then `spell login`.",
    );
    process.exit(1);
    return;
  }

  const { record, source } = loaded;
  printSuccess(`Signed in as ${describeAccount(record)}.`);
  const expires = new Date(record.expiresAt);
  const expired = expires.getTime() <= deps.now().getTime();
  printInfo(`Signed in on ${new Date(record.obtainedAt).toLocaleString()}.`);
  printInfo(
    expired
      ? `The last token expired on ${expires.toLocaleString()}; the session refreshes on next use.`
      : `The current token is valid until ${expires.toLocaleString()}.`,
  );
  printInfo(`Stored in ${source === "keychain" ? "the OS keychain" : "the insecure session file"}.`);
  if (source === "file") printWarning(INSECURE_STORAGE_WARNING);

  if (!options.verify) return;

  const environment = IDENTITY_ENVIRONMENTS[record.environment];
  try {
    const config = await deps.loadConfiguration(environment);
    const fresh = await deps.refreshSession(config, record.refreshToken, SIGN_IN_SCOPES);
    deps.storage.save(toSessionRecord(fresh, environment), { insecure: source === "file" });
    printSuccess(`Verified with the identity service at ${environment.signInHost}; the session is active.`);
  } catch (error) {
    console.error(
      `The identity service did not accept the session (${safeErrorText(error)}). Run \`spell login\` again.`,
    );
    process.exit(1);
  }
}
