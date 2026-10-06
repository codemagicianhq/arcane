import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  CHUNK_SIZE,
  MAX_CHUNKS,
  ChunkedSecretStore,
  KeychainUnavailableError,
  splitSecret,
  type SecretBackend,
} from "../src/modules/credential-store.js";

/** The Windows limit measured on 2026-10-05 (UTF-16 against 2,560 bytes). */
const WINDOWS_LIMIT = 1280;

class FakeBackend implements SecretBackend {
  readonly entries = new Map<string, string>();
  operations = 0;
  /** Throw on the Nth operation (1-based) and every one after it. */
  failFrom: number | null = null;
  maxValueLength = WINDOWS_LIMIT;

  private tick(): void {
    this.operations += 1;
    if (this.failFrom !== null && this.operations >= this.failFrom) {
      throw new Error("simulated keychain failure");
    }
  }
  get(name: string): string | null {
    this.tick();
    return this.entries.get(name) ?? null;
  }
  set(name: string, value: string): void {
    this.tick();
    if (value.length > this.maxValueLength) {
      throw new Error(`value longer than the platform limit of ${this.maxValueLength}`);
    }
    this.entries.set(name, value);
  }
  delete(name: string): void {
    this.tick();
    this.entries.delete(name);
  }
  list(): string[] {
    this.tick();
    return [...this.entries.keys()];
  }
}

function token(length: number): string {
  return randomBytes(Math.ceil((length * 3) / 4)).toString("base64url").slice(0, length);
}

const REAL_TOKEN_SIZE = 1468; // measured from the development identity tenant, 2026-10-05

describe("splitSecret", () => {
  it("cuts at the chunk size and rejoins to the original", () => {
    const secret = token(2500);
    const parts = splitSecret(secret);
    expect(parts.map((p) => p.length)).toEqual([1000, 1000, 500]);
    expect(parts.join("")).toBe(secret);
  });

  it("makes one chunk for an exact multiple and for a short secret", () => {
    expect(splitSecret(token(1000))).toHaveLength(1);
    expect(splitSecret(token(1001))).toHaveLength(2);
    expect(splitSecret("x")).toEqual(["x"]);
  });

  it("never cuts inside a surrogate pair", () => {
    const secret = "a".repeat(999) + "😀" + "b".repeat(10);
    const parts = splitSecret(secret);
    expect(parts.join("")).toBe(secret);
    for (const part of parts) {
      const last = part.charCodeAt(part.length - 1);
      expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
    }
  });
});

describe("ChunkedSecretStore", () => {
  it("reads as signed out when nothing is stored", () => {
    expect(new ChunkedSecretStore(new FakeBackend()).load()).toEqual({ state: "signed-out" });
  });

  it.each([1, 999, 1000, 1001, REAL_TOKEN_SIZE, 2000, 6000, 50_000])(
    "round-trips a %i-character secret without ever exceeding the Windows limit",
    (length) => {
      const backend = new FakeBackend();
      const store = new ChunkedSecretStore(backend);
      const secret = token(length);
      store.save(secret);
      expect(store.load()).toEqual({ state: "ok", secret });
      for (const value of backend.entries.values()) {
        expect(value.length).toBeLessThanOrEqual(CHUNK_SIZE);
      }
    },
  );

  it("round-trips a secret with non-ASCII characters", () => {
    const store = new ChunkedSecretStore(new FakeBackend());
    const secret = "é".repeat(1500) + "😀".repeat(400);
    store.save(secret);
    expect(store.load()).toEqual({ state: "ok", secret });
  });

  it("refuses a secret that would need more than the maximum number of chunks", () => {
    const store = new ChunkedSecretStore(new FakeBackend());
    expect(() => store.save(token(MAX_CHUNKS * CHUNK_SIZE + 1))).toThrow(/longer than/);
    expect(() => store.save(token(MAX_CHUNKS * CHUNK_SIZE))).not.toThrow();
  });

  it("refuses an empty secret", () => {
    expect(() => new ChunkedSecretStore(new FakeBackend()).save("")).toThrow(/empty/);
  });

  it("replaces a session and leaves only the new generation behind", () => {
    const backend = new FakeBackend();
    const store = new ChunkedSecretStore(backend);
    store.save(token(3500));
    const next = token(1468);
    store.save(next);
    expect(store.load()).toEqual({ state: "ok", secret: next });
    // the index plus two chunks, nothing from the first session
    expect(backend.entries.size).toBe(3);
  });

  it("clear removes everything, and succeeds when nothing is stored", () => {
    const backend = new FakeBackend();
    const store = new ChunkedSecretStore(backend);
    store.clear();
    store.save(token(2500));
    store.clear();
    expect(backend.entries.size).toBe(0);
    expect(store.load()).toEqual({ state: "signed-out" });
  });

  it("clear also removes stray chunks left by a crashed save", () => {
    const backend = new FakeBackend();
    const store = new ChunkedSecretStore(backend);
    backend.entries.set("session/00aa00aa00aa00aa/0", "stray");
    backend.entries.set("session/00aa00aa00aa00aa/1", "stray");
    store.clear();
    expect(backend.entries.size).toBe(0);
  });

  describe("a crash during a replacement", () => {
    it("always leaves the old session or the new one, never a mixture", () => {
      const oldSecret = token(REAL_TOKEN_SIZE);
      const newSecret = token(2600);

      // Count the operations a clean replacement takes, so every step is covered.
      const probe = new FakeBackend();
      new ChunkedSecretStore(probe).save(oldSecret);
      const before = probe.operations;
      new ChunkedSecretStore(probe).save(newSecret);
      const total = probe.operations - before;
      expect(total).toBeGreaterThan(5);

      for (let k = 1; k <= total + 1; k += 1) {
        const backend = new FakeBackend();
        const store = new ChunkedSecretStore(backend);
        store.save(oldSecret);
        backend.failFrom = backend.operations + k;
        try {
          store.save(newSecret);
        } catch {
          // expected for most k
        }
        backend.failFrom = null;

        const result = store.load();
        expect(result.state).toBe("ok");
        if (result.state === "ok") {
          expect([oldSecret, newSecret]).toContain(result.secret);
        }

        // A later healthy save cleans up whatever the crash left.
        store.save(newSecret);
        expect(store.load()).toEqual({ state: "ok", secret: newSecret });
        expect(backend.entries.size).toBe(1 + splitSecret(newSecret).length);
      }
    });

    it("keeps the old session when the first chunk of the new one cannot be written", () => {
      const backend = new FakeBackend();
      const store = new ChunkedSecretStore(backend);
      const oldSecret = token(1500);
      store.save(oldSecret);
      backend.maxValueLength = 5; // every chunk write now fails
      expect(() => store.save(token(1500))).toThrow(KeychainUnavailableError);
      backend.maxValueLength = WINDOWS_LIMIT;
      expect(store.load()).toEqual({ state: "ok", secret: oldSecret });
    });
  });

  describe("damaged data reads as corrupt, never as a partial secret", () => {
    function saved() {
      const backend = new FakeBackend();
      const store = new ChunkedSecretStore(backend);
      store.save(token(2500));
      const names = [...backend.entries.keys()];
      return { backend, store, chunkNames: names.filter((n) => n !== "session/index") };
    }

    it("a missing chunk", () => {
      const { backend, store, chunkNames } = saved();
      backend.entries.delete(chunkNames[1]!);
      expect(store.load()).toMatchObject({ state: "corrupt" });
    });

    it("a tampered chunk", () => {
      const { backend, store, chunkNames } = saved();
      backend.entries.set(chunkNames[0]!, "x".repeat(1000));
      expect(store.load()).toMatchObject({ state: "corrupt" });
    });

    it.each([
      ["not JSON", "not json"],
      ["unknown version", JSON.stringify({ v: 2, gen: "0123456789abcdef", count: 1, sha256: "a".repeat(64) })],
      ["a bad generation id", JSON.stringify({ v: 1, gen: "../../x", count: 1, sha256: "a".repeat(64) })],
      ["a zero chunk count", JSON.stringify({ v: 1, gen: "0123456789abcdef", count: 0, sha256: "a".repeat(64) })],
      ["a huge chunk count", JSON.stringify({ v: 1, gen: "0123456789abcdef", count: 1e9, sha256: "a".repeat(64) })],
      ["a bad checksum", JSON.stringify({ v: 1, gen: "0123456789abcdef", count: 1, sha256: "short" })],
    ])("an index with %s", (_label, raw) => {
      const backend = new FakeBackend();
      backend.entries.set("session/index", raw);
      expect(new ChunkedSecretStore(backend).load()).toMatchObject({ state: "corrupt" });
    });
  });

  describe("an unusable keychain", () => {
    it("maps backend failures to KeychainUnavailableError on every operation", () => {
      const backend = new FakeBackend();
      backend.failFrom = 1;
      const store = new ChunkedSecretStore(backend);
      expect(() => store.load()).toThrow(KeychainUnavailableError);
      expect(() => store.save(token(100))).toThrow(KeychainUnavailableError);
      expect(() => store.clear()).toThrow(KeychainUnavailableError);
    });

    it("never puts the secret, or any part of it, in an error message", () => {
      const secret = token(2500);
      const backend = new FakeBackend();
      backend.set = (): void => {
        throw new Error(`could not store ${secret}`);
      };
      const store = new ChunkedSecretStore(backend);
      try {
        store.save(secret);
        expect.unreachable("save should have thrown");
      } catch (error) {
        const text = `${(error as Error).name} ${(error as Error).message} ${String((error as Error).stack)}`;
        // the wrapper's own text carries no secret; the cause is kept separately
        expect((error as Error).message).not.toContain(secret.slice(0, 20));
        expect(text.includes(secret)).toBe(false);
      }
    });
  });
});
