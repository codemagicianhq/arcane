/**
 * The signed-in session for `spell login` (features/spell-login/PRD.md, R3 to
 * R6): what is stored, where, and the explicit opt-in to a file.
 *
 * Stored (R4): the refresh token, the account's `sub` and email, the
 * environment, and when the last token was obtained and expires. Never the
 * access token, never the ID token.
 *
 * Where: the OS keychain through the chunked store (R4a) by default. With
 * `--insecure-storage` only, a JSON file under `~/.arcane/` instead -- mode
 * 0600 on POSIX; on Windows, access restricted to the current account with
 * `icacls`, and the file is refused when that fails (PRD, decision 3).
 * Saving to one medium removes the other, so a stale token never lingers in
 * the medium that stopped being used.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { userInfo } from "node:os";
import { dirname, join } from "node:path";
import {
  ChunkedSecretStore,
  KeychainUnavailableError,
  type LoadResult,
  type SecretBackend,
} from "./credential-store.js";
import { createKeychainBackend } from "./keychain-backend.js";
import type { IdentityEnvironment } from "./identity-config.js";
import { userTierRoot } from "./user-tier.js";

export const INSECURE_SESSION_FILE_NAME = "session-insecure.json";

export interface SessionRecord {
  v: 1;
  environment: IdentityEnvironment;
  sub: string;
  email: string | null;
  refreshToken: string;
  /** ISO 8601. When the tokens were obtained. */
  obtainedAt: string;
  /** ISO 8601. When the last access token expired or expires; a hint, not proof the session is alive. */
  expiresAt: string;
}

export type SessionMedium = "keychain" | "file";

/** Cleanup removed the listed media, but the OS keychain could not be verified or cleared. */
export class SessionClearError extends Error {
  constructor(
    readonly keychainError: KeychainUnavailableError,
    readonly removed: SessionMedium[],
  ) {
    super(keychainError.message);
    this.name = "SessionClearError";
    this.cause = keychainError;
  }
}

export type SessionLoad =
  | { state: "signed-out"; keychainError?: KeychainUnavailableError }
  | { state: "ok"; source: SessionMedium; record: SessionRecord }
  | { state: "corrupt"; source: SessionMedium; reason: string };

export interface SessionStorage {
  load(): SessionLoad;
  /** Throws `KeychainUnavailableError` when `insecure` is false and the keychain cannot be used (R6). */
  save(record: SessionRecord, options: { insecure: boolean }): void;
  /** Removes the session from every medium. A partial cleanup error lists media actually removed (R3). */
  clear(): { removed: SessionMedium[] };
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function parseSessionRecord(raw: string): SessionRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  if (
    o["v"] !== 1 ||
    (o["environment"] !== "production" && o["environment"] !== "development") ||
    typeof o["sub"] !== "string" ||
    o["sub"] === "" ||
    !(typeof o["email"] === "string" || o["email"] === null) ||
    typeof o["refreshToken"] !== "string" ||
    o["refreshToken"] === "" ||
    !isIsoDate(o["obtainedAt"]) ||
    !isIsoDate(o["expiresAt"])
  ) {
    return null;
  }
  return {
    v: 1,
    environment: o["environment"],
    sub: o["sub"],
    email: o["email"],
    refreshToken: o["refreshToken"],
    obtainedAt: o["obtainedAt"],
    expiresAt: o["expiresAt"],
  };
}

/**
 * A `SecretBackend` over one JSON file: the opt-in insecure medium. Writes are
 * atomic (temp file, then rename) and the file is created restricted to the
 * current account; when restricting fails the file is removed and the write
 * fails, so a world-readable session file never exists.
 */
export class FileSecretBackend implements SecretBackend {
  constructor(
    readonly filePath: string,
    private readonly restrict: (filePath: string) => void = restrictToCurrentUser,
  ) {}

  exists(): boolean {
    return existsSync(this.filePath);
  }

  private read(): Record<string, string> {
    if (!existsSync(this.filePath)) return {};
    const parsed: unknown = JSON.parse(readFileSync(this.filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("the session file is not an object");
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }

  private write(entries: Record<string, string>): void {
    if (Object.keys(entries).length === 0) {
      rmSync(this.filePath, { force: true });
      return;
    }
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(entries), { encoding: "utf8", mode: 0o600 });
    try {
      this.restrict(tmp);
    } catch (error) {
      rmSync(tmp, { force: true });
      throw new Error(
        "Could not restrict the session file to your account, so it was not written.",
        { cause: error },
      );
    }
    renameSync(tmp, this.filePath);
  }

  get(name: string): string | null {
    return this.read()[name] ?? null;
  }
  set(name: string, value: string): void {
    const entries = this.read();
    entries[name] = value;
    this.write(entries);
  }
  delete(name: string): void {
    const entries = this.read();
    if (!(name in entries)) return;
    delete entries[name];
    this.write(entries);
  }
  list(): string[] {
    return Object.keys(this.read());
  }
  /** Removes the file itself, strays and all. */
  remove(): void {
    rmSync(this.filePath, { force: true });
  }
}

/**
 * POSIX: the 0600 mode at creation already restricts the file. Windows has
 * no mode bits, so inherited access is removed and only the current account
 * is granted, through the OS's own `icacls`.
 */
export function restrictToCurrentUser(filePath: string): void {
  if (process.platform !== "win32") return;
  const account = userInfo().username;
  execFileSync("icacls", [filePath, "/inheritance:r", "/grant:r", `${account}:F`], {
    stdio: "ignore",
    windowsHide: true,
  });
}

export function insecureSessionFilePath(homeDir?: string): string {
  return join(userTierRoot(homeDir), INSECURE_SESSION_FILE_NAME);
}

export interface SessionStorageOptions {
  keychainBackend?: SecretBackend;
  fileBackend?: FileSecretBackend;
}

export function createSessionStorage(options: SessionStorageOptions = {}): SessionStorage {
  const keychain = new ChunkedSecretStore(options.keychainBackend ?? createKeychainBackend());
  const fileBackend = options.fileBackend ?? new FileSecretBackend(insecureSessionFilePath());
  const file = new ChunkedSecretStore(fileBackend);

  const interpret = (result: LoadResult, source: SessionMedium): SessionLoad | null => {
    if (result.state === "signed-out") return null;
    if (result.state === "corrupt") return { state: "corrupt", source, reason: result.reason };
    const record = parseSessionRecord(result.secret);
    if (record === null) return { state: "corrupt", source, reason: "the stored session is not valid" };
    return { state: "ok", source, record };
  };

  return {
    load() {
      let keychainError: KeychainUnavailableError | undefined;
      try {
        const fromKeychain = interpret(keychain.load(), "keychain");
        if (fromKeychain) return fromKeychain;
      } catch (error) {
        if (!(error instanceof KeychainUnavailableError)) throw error;
        keychainError = error;
      }
      if (fileBackend.exists()) {
        const fromFile = interpret(file.load(), "file");
        if (fromFile) return fromFile;
      }
      return keychainError ? { state: "signed-out", keychainError } : { state: "signed-out" };
    },

    save(record, { insecure }) {
      const serialized = JSON.stringify(record);
      if (insecure) {
        file.save(serialized);
        try {
          keychain.clear();
        } catch {
          // The keychain is unusable, which is why the file was chosen.
        }
        return;
      }
      keychain.save(serialized);
      fileBackend.remove();
    },

    clear() {
      const removed: SessionMedium[] = [];
      let keychainError: unknown;
      try {
        const hadKeychainSession = keychain.load().state !== "signed-out";
        keychain.clear();
        if (hadKeychainSession) removed.push("keychain");
      } catch (error) {
        keychainError = error;
      }
      if (fileBackend.exists()) {
        fileBackend.remove();
        removed.push("file");
      }
      if (keychainError instanceof KeychainUnavailableError) {
        throw new SessionClearError(keychainError, removed);
      }
      if (keychainError) throw keychainError;
      return { removed };
    },
  };
}
