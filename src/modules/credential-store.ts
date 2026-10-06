/**
 * Chunked credential store for `spell login` (features/spell-login/PRD.md, R4a).
 *
 * Windows Credential Manager refuses a secret longer than 1,280 characters
 * (measured through @napi-rs/keyring, 2026-10-05), and a real refresh token is
 * about 1,470, so one secret is split across several entries on every
 * platform -- one code path, not a Windows special case.
 *
 * Layout, inside one backend (an OS keychain in production, a fake in tests):
 *
 *   session/index           {"v":1,"gen":"<hex>","count":N,"sha256":"<hex>"}
 *   session/<gen>/<n>       chunk n of the secret, at most CHUNK_SIZE chars
 *
 * Saving writes every chunk of a NEW generation first and the index LAST. The
 * index is the switch: until it is written the previous session is still the
 * one a read returns, so a crash at any point leaves the old session or the
 * new one, never a mixture. A read verifies the SHA-256 of the reassembled
 * secret; a missing chunk, a bad index or a mismatch reads as `corrupt`,
 * never as a partial secret.
 *
 * Nothing here ever puts a secret value, or a piece of one, in an error
 * message or a return value other than `load()`'s `secret` (R10).
 */

import { createHash, randomBytes } from "node:crypto";

/** Characters per chunk. Well under the 1,280-character Windows limit. */
export const CHUNK_SIZE = 1000;

/**
 * Most chunks one secret may use (64,000 characters). A corrupt index naming a
 * billion chunks must not turn a read into a billion keychain calls.
 */
export const MAX_CHUNKS = 64;

const INDEX_NAME = "session/index";
const CHUNK_PREFIX = "session/";
const INDEX_VERSION = 1;

/**
 * A key-value secret store addressed by name. Names are the keychain's
 * "account" half; the service half belongs to the backend.
 */
export interface SecretBackend {
  get(name: string): string | null;
  set(name: string, value: string): void;
  delete(name: string): void;
  /** Every name currently stored, so stray chunks from a crashed save can be swept. */
  list(): string[];
}

/** The keychain could not be used (missing, locked, denied, or erroring). Maps to R6. */
export class KeychainUnavailableError extends Error {
  constructor(operation: string, cause: unknown) {
    // The cause's own message is kept out of ours: a backend error could echo a value.
    super(`The OS keychain is not available (${operation} failed).`);
    this.name = "KeychainUnavailableError";
    this.cause = cause;
  }
}

export type LoadResult =
  | { state: "signed-out" }
  | { state: "ok"; secret: string }
  | { state: "corrupt"; reason: string };

interface Index {
  v: number;
  gen: string;
  count: number;
  sha256: string;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function chunkName(gen: string, n: number): string {
  return `${CHUNK_PREFIX}${gen}/${n}`;
}

/** Cuts `secret` into pieces of at most `size` UTF-16 units, never inside a surrogate pair. */
export function splitSecret(secret: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < secret.length) {
    let end = Math.min(start + size, secret.length);
    if (end < secret.length) {
      const last = secret.charCodeAt(end - 1);
      if (last >= 0xd800 && last <= 0xdbff) end -= 1;
    }
    chunks.push(secret.slice(start, end));
    start = end;
  }
  return chunks;
}

function parseIndex(raw: string): Index | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  if (
    o["v"] !== INDEX_VERSION ||
    typeof o["gen"] !== "string" ||
    !/^[0-9a-f]{16}$/.test(o["gen"]) ||
    typeof o["count"] !== "number" ||
    !Number.isInteger(o["count"]) ||
    o["count"] < 1 ||
    o["count"] > MAX_CHUNKS ||
    typeof o["sha256"] !== "string" ||
    !/^[0-9a-f]{64}$/.test(o["sha256"])
  ) {
    return null;
  }
  return { v: o["v"], gen: o["gen"], count: o["count"], sha256: o["sha256"] };
}

export class ChunkedSecretStore {
  constructor(private readonly backend: SecretBackend) {}

  private guard<T>(operation: string, fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      throw new KeychainUnavailableError(operation, error);
    }
  }

  /** Reads the stored secret. Never throws for bad data; throws only when the keychain itself fails. */
  load(): LoadResult {
    const raw = this.guard("read", () => this.backend.get(INDEX_NAME));
    if (raw === null) return { state: "signed-out" };

    const index = parseIndex(raw);
    if (index === null) return { state: "corrupt", reason: "the index entry is not valid" };

    const parts: string[] = [];
    for (let n = 0; n < index.count; n += 1) {
      const part = this.guard("read", () => this.backend.get(chunkName(index.gen, n)));
      if (part === null) return { state: "corrupt", reason: `chunk ${n} of ${index.count} is missing` };
      parts.push(part);
    }
    const secret = parts.join("");
    if (sha256Hex(secret) !== index.sha256) {
      return { state: "corrupt", reason: "the stored pieces do not match their checksum" };
    }
    return { state: "ok", secret };
  }

  /**
   * Replaces the stored secret. The previous session stays readable until the
   * new index is written; a failure before that leaves it untouched.
   */
  save(secret: string): void {
    if (secret.length === 0) throw new Error("Refusing to store an empty secret.");

    const gen = randomBytes(8).toString("hex");
    const chunks = splitSecret(secret);
    if (chunks.length > MAX_CHUNKS) {
      throw new Error(`Refusing to store a secret longer than ${MAX_CHUNKS * CHUNK_SIZE} characters.`);
    }

    chunks.forEach((chunk, n) => {
      this.guard("write", () => this.backend.set(chunkName(gen, n), chunk));
    });

    const index: Index = { v: INDEX_VERSION, gen, count: chunks.length, sha256: sha256Hex(secret) };
    this.guard("write", () => this.backend.set(INDEX_NAME, JSON.stringify(index)));

    // The switch has happened. Everything from older generations is now garbage;
    // failing to delete it must not fail a save that already succeeded.
    try {
      this.sweep(gen);
    } catch {
      // The next save or `spell logout` sweeps again.
    }
  }

  /** Deletes everything this store wrote, strays included. Succeeds when nothing is stored. */
  clear(): void {
    this.guard("delete", () => this.backend.delete(INDEX_NAME));
    this.sweep(null);
  }

  /** Removes every chunk that does not belong to `keepGen` (all chunks when it is null). */
  private sweep(keepGen: string | null): void {
    const names = this.guard("list", () => this.backend.list());
    for (const name of names) {
      if (name === INDEX_NAME || !name.startsWith(CHUNK_PREFIX)) continue;
      if (keepGen !== null && name.startsWith(`${CHUNK_PREFIX}${keepGen}/`)) continue;
      this.guard("delete", () => this.backend.delete(name));
    }
  }
}
