/**
 * The OS keychain as a `SecretBackend` for the chunked credential store
 * (features/spell-login/PRD.md, R4a and R6): macOS Keychain, Windows
 * Credential Manager, or the Linux Secret Service, through @napi-rs/keyring.
 *
 * The native package is loaded on first use, not at import, so a platform
 * with no prebuilt binary or no keychain only fails the commands that need
 * one (those map the failure to `KeychainUnavailableError`, which is R6's
 * refusal), and every signed-out command keeps working (R7).
 */

import { createRequire } from "node:module";
import type { SecretBackend } from "./credential-store.js";

/** The keychain "service" half of every entry Arcane writes. */
export const KEYCHAIN_SERVICE = "arcane-cli";

interface KeyringEntry {
  getPassword(): string | null;
  setPassword(password: string): void;
  deletePassword(): boolean | void;
}

interface KeyringModule {
  Entry: new (service: string, username: string) => KeyringEntry;
  findCredentials(service: string): Array<{ account: string; password: string }>;
}

export function createKeychainBackend(service: string = KEYCHAIN_SERVICE): SecretBackend {
  let loaded: KeyringModule | null = null;
  const keyring = (): KeyringModule => {
    loaded ??= createRequire(import.meta.url)("@napi-rs/keyring") as KeyringModule;
    return loaded;
  };
  const entry = (name: string): KeyringEntry => new (keyring().Entry)(service, name);

  return {
    get: (name) => entry(name).getPassword() ?? null,
    set: (name, value) => {
      entry(name).setPassword(value);
    },
    delete: (name) => {
      entry(name).deletePassword();
    },
    list: () => keyring().findCredentials(service).map((credential) => credential.account),
  };
}
