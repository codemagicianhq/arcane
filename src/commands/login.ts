import { printInfo, printSuccess, printWarning } from "../modules/banner.js";
import { KeychainUnavailableError } from "../modules/credential-store.js";
import {
  SIGN_IN_SCOPES,
  UnknownEnvironmentError,
  resolveIdentityEnvironment,
  type IdentityEnvironmentConfig,
} from "../modules/identity-config.js";
import {
  IdentityUnreachableError,
  LoginDeniedError,
  LoginTimeoutError,
  browserLogin,
  deviceLogin,
  loadIdentityConfiguration,
  openInDefaultBrowser,
  type TokenResult,
} from "../modules/oidc.js";
import { createSessionStorage, type SessionRecord, type SessionStorage } from "../modules/session-store.js";
import type { Configuration } from "openid-client";

export interface LoginOptions {
  deviceCode?: boolean;
  insecureStorage?: boolean;
}

/** Everything `runLogin` reaches outside itself, replaceable in tests. */
export interface LoginDeps {
  storage: SessionStorage;
  environment: () => IdentityEnvironmentConfig;
  loadConfiguration: (environment: IdentityEnvironmentConfig) => Promise<Configuration>;
  browserLogin: typeof browserLogin;
  deviceLogin: typeof deviceLogin;
  openUrl: (url: string) => Promise<boolean>;
  isInteractive: () => boolean;
}

export function defaultLoginDeps(): LoginDeps {
  return {
    storage: createSessionStorage(),
    environment: () => resolveIdentityEnvironment(),
    loadConfiguration: (environment) => loadIdentityConfiguration(environment),
    browserLogin,
    deviceLogin,
    openUrl: openInDefaultBrowser,
    isInteractive: () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
  };
}

export const INSECURE_STORAGE_WARNING =
  "Insecure storage: the session is kept in a file protected only by your account's file permissions, " +
  "not in the OS keychain. Run `spell logout` to remove it.";

/**
 * Error text that is safe to show (R10): the first line only, with anything
 * shaped like a callback query value removed.
 */
export function safeErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0]!.replace(/([?&](?:code|state|id_token|access_token|refresh_token)=)[^&\s]+/gi, "$1[redacted]");
}

export function toSessionRecord(result: TokenResult, environment: IdentityEnvironmentConfig): SessionRecord {
  return {
    v: 1,
    environment: environment.environment,
    sub: result.sub,
    email: result.email,
    refreshToken: result.refreshToken,
    obtainedAt: result.obtainedAt.toISOString(),
    expiresAt: result.expiresAt.toISOString(),
  };
}

export function describeAccount(record: Pick<SessionRecord, "sub" | "email" | "environment">): string {
  const who = record.email ? `${record.email} (${record.sub})` : record.sub;
  return record.environment === "development" ? `${who} [development]` : who;
}

/**
 * Runs `spell login` (features/spell-login/PRD.md, R1, R2, R5, R6, R16):
 * browser flow by default, device code on request, the session stored only
 * after the sign-in succeeded so a failure leaves any previous session alone.
 */
export async function runLogin(options: LoginOptions, deps: LoginDeps = defaultLoginDeps()): Promise<void> {
  let environment: IdentityEnvironmentConfig;
  try {
    environment = deps.environment();
  } catch (error) {
    if (error instanceof UnknownEnvironmentError) {
      console.error(error.message);
      process.exit(1);
      return; // guard: process.exit is mocked in tests
    }
    throw error;
  }

  if (!options.deviceCode && !deps.isInteractive()) {
    console.error(
      "No interactive terminal, so a browser sign-in cannot be started here. " +
        "Run `spell login --device-code` and finish the sign-in on another device.",
    );
    process.exit(1);
    return;
  }

  let config: Configuration;
  try {
    config = await deps.loadConfiguration(environment);
  } catch (error) {
    console.error(
      error instanceof IdentityUnreachableError
        ? `${error.message} Check your network connection and try again.`
        : `Could not prepare the sign-in: ${safeErrorText(error)}`,
    );
    process.exit(1);
    return;
  }

  let result: TokenResult;
  try {
    if (options.deviceCode) {
      result = await deps.deviceLogin(config, {
        scopes: SIGN_IN_SCOPES,
        prompt: (uri, code, seconds) => {
          printInfo(`Open ${uri} on any device and enter the code ${code}.`);
          printInfo(`Waiting up to ${Math.round(seconds / 60)} minutes for you to finish signing in.`);
        },
      });
    } else {
      printInfo("Opening your browser to sign in to Arcane. Come back here when it says you are signed in.");
      result = await deps.browserLogin(config, {
        scopes: SIGN_IN_SCOPES,
        openUrl: deps.openUrl,
        onCannotOpen: (url) => {
          printWarning("No browser could be opened. Open this address yourself, or run `spell login --device-code`:");
          printInfo(url);
        },
      });
    }
  } catch (error) {
    if (error instanceof LoginTimeoutError || error instanceof LoginDeniedError) {
      console.error(`${error.message} Nothing was changed.`);
    } else {
      console.error(`The sign-in did not complete: ${safeErrorText(error)}. Nothing was changed.`);
    }
    process.exit(1);
    return;
  }

  const record = toSessionRecord(result, environment);
  try {
    deps.storage.save(record, { insecure: Boolean(options.insecureStorage) });
  } catch (error) {
    if (error instanceof KeychainUnavailableError) {
      console.error(
        `${error.message} Nothing was stored. If this machine has no keychain, ` +
          "run `spell login --insecure-storage` to keep the session in a file instead " +
          "(protected only by your account's file permissions).",
      );
      process.exit(1);
      return;
    }
    console.error(`The session could not be stored: ${safeErrorText(error)}`);
    process.exit(1);
    return;
  }

  printSuccess(`Signed in as ${describeAccount(record)}.`);
  if (options.insecureStorage) printWarning(INSECURE_STORAGE_WARNING);
}
