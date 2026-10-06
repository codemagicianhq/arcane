import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  FileSecretBackend,
  createSessionStorage,
  insecureSessionFilePath,
  parseSessionRecord,
  type SessionRecord,
} from "../src/modules/session-store.js";
import { ChunkedSecretStore, KeychainUnavailableError, type SecretBackend } from "../src/modules/credential-store.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

class MemoryBackend implements SecretBackend {
  readonly entries = new Map<string, string>();
  broken = false;
  private check(): void {
    if (this.broken) throw new Error("no keychain here");
  }
  get(name: string): string | null {
    this.check();
    return this.entries.get(name) ?? null;
  }
  set(name: string, value: string): void {
    this.check();
    this.entries.set(name, value);
  }
  delete(name: string): void {
    this.check();
    this.entries.delete(name);
  }
  list(): string[] {
    this.check();
    return [...this.entries.keys()];
  }
}

const record: SessionRecord = {
  v: 1,
  environment: "development",
  sub: "00000000-0000-4000-8000-00000000abcd",
  email: "person@example.test",
  refreshToken: "rt-" + "x".repeat(1465),
  obtainedAt: "2026-10-05T10:00:00.000Z",
  expiresAt: "2026-10-05T11:00:00.000Z",
};

let dir: string;
let filePath: string;
beforeEach(async () => {
  dir = await createFixtureDir("session-store-");
  filePath = join(dir, "session-insecure.json");
});
afterEach(async () => {
  await removeFixtureDir(dir);
});

describe("parseSessionRecord", () => {
  it("accepts a complete record and rejects every damaged one", () => {
    expect(parseSessionRecord(JSON.stringify(record))).toEqual(record);
    const damaged: unknown[] = [
      "nope",
      { ...record, v: 2 },
      { ...record, environment: "staging" },
      { ...record, sub: "" },
      { ...record, email: 5 },
      { ...record, refreshToken: "" },
      { ...record, obtainedAt: "yesterday" },
      (() => {
        const r: Partial<SessionRecord> = { ...record };
        delete r.expiresAt;
        return r;
      })(),
    ];
    for (const d of damaged) {
      expect(parseSessionRecord(typeof d === "string" ? d : JSON.stringify(d))).toBeNull();
    }
  });
});

describe("FileSecretBackend", () => {
  it("round-trips entries and removes the file when the last one is deleted", () => {
    const backend = new FileSecretBackend(filePath, () => {});
    expect(backend.exists()).toBe(false);
    backend.set("a", "1");
    backend.set("b", "2");
    expect(backend.list().sort()).toEqual(["a", "b"]);
    expect(backend.get("a")).toBe("1");
    backend.delete("a");
    backend.delete("b");
    expect(existsSync(filePath)).toBe(false);
  });

  it.skipIf(process.platform === "win32")("creates the file with mode 0600 on POSIX", () => {
    const backend = new FileSecretBackend(filePath, () => {});
    backend.set("a", "1");
    expect(statSync(filePath).mode & 0o777).toBe(0o600);
  });

  it("writes nothing when the file cannot be restricted to the current account", () => {
    const backend = new FileSecretBackend(filePath, () => {
      throw new Error("icacls failed");
    });
    expect(() => backend.set("a", "1")).toThrow(/not written/);
    expect(existsSync(filePath)).toBe(false);
    expect(existsSync(`${filePath}.${process.pid}.tmp`)).toBe(false);
  });

  it("lives under the user tier by default", () => {
    expect(insecureSessionFilePath("/home/someone")).toBe(join("/home/someone", ".arcane", "session-insecure.json"));
  });
});

describe("createSessionStorage", () => {
  function storage(backend = new MemoryBackend()) {
    const fileBackend = new FileSecretBackend(filePath, () => {});
    return { s: createSessionStorage({ keychainBackend: backend, fileBackend }), backend, fileBackend };
  }

  it("is signed out when nothing is stored", () => {
    expect(storage().s.load()).toEqual({ state: "signed-out" });
  });

  it("saves to the keychain by default and reads it back", () => {
    const { s, backend } = storage();
    s.save(record, { insecure: false });
    expect(s.load()).toEqual({ state: "ok", source: "keychain", record });
    for (const v of backend.entries.values()) expect(v.length).toBeLessThanOrEqual(1000);
    expect(existsSync(filePath)).toBe(false);
  });

  it("refuses the keychain path when the keychain is unusable, storing nothing", () => {
    const backend = new MemoryBackend();
    backend.broken = true;
    const { s } = storage(backend);
    expect(() => s.save(record, { insecure: false })).toThrow(KeychainUnavailableError);
    expect(existsSync(filePath)).toBe(false);
  });

  it("saves to the file only on explicit opt-in, and then reads it even when the keychain is unusable", () => {
    const backend = new MemoryBackend();
    const { s } = storage(backend);
    s.save(record, { insecure: true });
    expect(existsSync(filePath)).toBe(true);
    expect(backend.entries.size).toBe(0);
    expect(s.load()).toEqual({ state: "ok", source: "file", record });
    backend.broken = true;
    expect(s.load()).toEqual({ state: "ok", source: "file", record });
  });

  it("reports the keychain failure when signed out and the keychain is unusable", () => {
    const backend = new MemoryBackend();
    backend.broken = true;
    const loaded = storage(backend).s.load();
    expect(loaded.state).toBe("signed-out");
    expect(loaded.state === "signed-out" && loaded.keychainError).toBeInstanceOf(KeychainUnavailableError);
  });

  it("switching medium removes the session from the other one", () => {
    const { s, backend } = storage();
    s.save(record, { insecure: true });
    s.save({ ...record, sub: "second" }, { insecure: false });
    expect(existsSync(filePath)).toBe(false);
    expect(s.load()).toMatchObject({ source: "keychain", record: { sub: "second" } });
    s.save({ ...record, sub: "third" }, { insecure: true });
    expect(backend.entries.size).toBe(0);
    expect(s.load()).toMatchObject({ source: "file", record: { sub: "third" } });
  });

  it("a damaged keychain session reads as corrupt, not as the file and not as signed out", () => {
    const { s, backend } = storage();
    s.save(record, { insecure: false });
    const chunk = [...backend.entries.keys()].find((k) => k !== "session/index")!;
    backend.entries.set(chunk, "garbage".padEnd(1000, "x"));
    expect(s.load()).toMatchObject({ state: "corrupt", source: "keychain" });
  });

  it("a stored secret that is not a session record reads as corrupt", () => {
    const { s, backend } = storage();
    s.save(record, { insecure: false });
    // overwrite with a validly chunked but non-record secret
    backend.entries.clear();
    new ChunkedSecretStore(backend).save(JSON.stringify({ hello: "world" }));
    expect(s.load()).toMatchObject({ state: "corrupt", reason: "the stored session is not valid" });
  });

  it("clear removes both media and reports which, and succeeds when empty", () => {
    const { s } = storage();
    expect(s.clear()).toEqual({ removed: [] });
    s.save(record, { insecure: false });
    expect(s.clear()).toEqual({ removed: ["keychain"] });
    s.save(record, { insecure: true });
    expect(s.clear()).toEqual({ removed: ["file"] });
    expect(s.load()).toEqual({ state: "signed-out" });
  });

  it("clear still removes the file when the keychain is unusable, then reports the keychain failure", () => {
    const backend = new MemoryBackend();
    const { s } = storage(backend);
    s.save(record, { insecure: true });
    backend.broken = true;
    expect(() => s.clear()).toThrow(KeychainUnavailableError);
    expect(existsSync(filePath)).toBe(false);
  });
});
