import { afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { ChunkedSecretStore } from "../src/modules/credential-store.js";
import { createKeychainBackend } from "../src/modules/keychain-backend.js";

/**
 * Runs against the REAL OS keychain of the machine it is on, so it is opt-in:
 *
 *   ARCANE_KEYCHAIN_TESTS=1 npx vitest run test/credential-store.keychain.test.ts
 *
 * It uses a throwaway service name and removes everything it wrote. CI runners
 * and headless machines have no keychain, so it is skipped unless asked for.
 */
const enabled = process.env["ARCANE_KEYCHAIN_TESTS"] === "1";
const service = `arcane-cli-test-${randomBytes(4).toString("hex")}`;
const backend = createKeychainBackend(service);
const store = new ChunkedSecretStore(backend);

function token(length: number): string {
  return randomBytes(Math.ceil((length * 3) / 4)).toString("base64url").slice(0, length);
}

describe.skipIf(!enabled)("the real OS keychain", () => {
  afterAll(() => {
    try {
      store.clear();
    } catch {
      // nothing left to clean, or the keychain is gone
    }
  });

  it("stores and reads back a refresh token longer than one Windows credential allows", () => {
    const secret = token(1468); // the measured size of a real refresh token
    store.save(secret);
    expect(store.load()).toEqual({ state: "ok", secret });
  });

  it("stores and reads back a secret several times that size", () => {
    const secret = token(9000);
    store.save(secret);
    expect(store.load()).toEqual({ state: "ok", secret });
  });

  it("replaces a session and leaves no stray entries", () => {
    store.save(token(4000));
    const next = token(1468);
    store.save(next);
    expect(store.load()).toEqual({ state: "ok", secret: next });
    // the index plus two chunks
    expect(backend.list()).toHaveLength(3);
  });

  it("clear leaves nothing behind", () => {
    store.save(token(3000));
    store.clear();
    expect(backend.list()).toEqual([]);
    expect(store.load()).toEqual({ state: "signed-out" });
  });
});
