import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { userInfo } from "node:os";
import {
  PresenceStoreError,
  ensureStore,
  ensureToken,
  presenceDir,
  readServerInfo,
  readToken,
  removeServerInfo,
  serverInfoPath,
  storeExists,
  tokenPath,
  writeServerInfo,
} from "../src/modules/presence/store.js";
import { PRESENCE_ENV, type ServerInfo } from "../src/modules/presence/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

const POSIX = process.platform !== "win32";
let home: string;

beforeEach(async () => {
  home = await createFixtureDir("presence-store");
});
afterEach(async () => {
  await removeFixtureDir(home);
});

function mode(path: string): number {
  return statSync(path).mode & 0o777;
}

const info: ServerInfo = {
  url: "http://127.0.0.1:27226",
  pid: 4242,
  port: 27226,
  started_at: "2026-11-12T14:58:00.000Z",
  generator: { name: "arcane-cli", version: "1.18.0" },
};

describe("presence store: the token (PC-06, ARC-060 decision 6; threat-model control 3)", () => {
  it.skipIf(!POSIX)("writes the directory 0700 and the token 0600, and re-sets loosened modes", () => {
    ensureToken({ home });
    expect(mode(presenceDir({ home }))).toBe(0o700);
    expect(mode(tokenPath({ home }))).toBe(0o600);
    chmodSync(presenceDir({ home }), 0o755);
    chmodSync(tokenPath({ home }), 0o644);
    ensureToken({ home });
    expect(mode(presenceDir({ home }))).toBe(0o700);
    expect(mode(tokenPath({ home }))).toBe(0o600);
  });

  it("leaves neither a token nor a temporary file when restricting fails", () => {
    const failing = () => {
      throw new Error("icacls refused");
    };
    expect(() => ensureToken({ home, restrict: failing })).toThrow(PresenceStoreError);
    expect(existsSync(tokenPath({ home }))).toBe(false);
    expect(readdirSync(presenceDir({ home }))).toEqual([]);
  });

  // Windows: restrictToCurrentUser (ARC-054 decision 3) removes inherited entries and grants the
  // current account. A new file in a directory without inheritable entries takes the process's
  // default DACL as explicit entries, so on the CI runner SYSTEM and BUILTIN\Administrators stay
  // too (observed on windows-latest, 2026-11-05). Both can override any ACL on the machine, so the
  // assertion is: nothing inherited, the current account granted, and no other principal at all.
  it.runIf(process.platform === "win32")("on Windows grants the current account and no unprivileged principal, nothing inherited", () => {
    ensureToken({ home });
    const acl = execFileSync("icacls", [tokenPath({ home })], { encoding: "utf8" });
    const entries = acl
      .split(/\r?\n/)
      .map((l) => l.replace(tokenPath({ home }), "").trim())
      .filter((l) => l.includes(":("));
    const report = `icacls said:\n${acl}`;
    expect(acl, report).not.toContain("(I)");
    expect(entries.some((e) => e.toLowerCase().includes(userInfo().username.toLowerCase())), report).toBe(true);
    const others = entries.filter((e) => !e.toLowerCase().includes(userInfo().username.toLowerCase()));
    for (const entry of others) expect(entry, report).toMatch(/^(NT AUTHORITY\\SYSTEM|BUILTIN\\Administrators):/);
    expect(acl, report).not.toMatch(/Everyone|BUILTIN\\Users|Authenticated Users|CREATOR OWNER/);
  });

  it("reuses the token without rotate and replaces it with rotate", () => {
    const first = ensureToken({ home });
    expect(ensureToken({ home })).toBe(first);
    const rotated = ensureToken({ home, rotate: true });
    expect(rotated).not.toBe(first);
    expect(rotated).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(readFileSync(tokenPath({ home }), "utf8")).toBe(`${rotated}\n`);
  });

  it("replaces an empty token file", () => {
    ensureStore({ home });
    writeFileSync(tokenPath({ home }), "\n");
    expect(ensureToken({ home })).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("presence store: reading the token (PC-06)", () => {
  it("prefers the variable, even when it is wrong and the file is right", () => {
    const right = ensureToken({ home });
    expect(readToken({ home, env: {} })).toBe(right);
    expect(readToken({ home, env: { [PRESENCE_ENV.token]: "a-wrong-value" } })).toBe("a-wrong-value");
  });

  it("falls back to the file when the variable is empty", () => {
    const right = ensureToken({ home });
    expect(readToken({ home, env: { [PRESENCE_ENV.token]: "" } })).toBe(right);
  });

  it("reads a token file saved with CRLF, and treats an empty file as no token", () => {
    ensureStore({ home });
    writeFileSync(tokenPath({ home }), "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG\r\n");
    expect(readToken({ home, env: {} })).toBe("abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG");
    writeFileSync(tokenPath({ home }), "\r\n");
    expect(readToken({ home, env: {} })).toBeNull();
  });

  it("returns null with no store at all", () => {
    expect(storeExists({ home })).toBe(false);
    expect(readToken({ home, env: {} })).toBeNull();
  });
});

describe("presence store: a linked directory is refused (ARC-057)", () => {
  it("refuses a presence directory that links outside the home's .arcane", async () => {
    const outside = await createFixtureDir("presence-store-outside");
    try {
      mkdirSync(join(home, ".arcane"), { recursive: true });
      symlinkSync(outside, presenceDir({ home }), "junction");
      expect(() => ensureStore({ home })).toThrow(/resolves outside/);
      expect(() => ensureToken({ home })).toThrow(PresenceStoreError);
      expect(readdirSync(outside)).toEqual([]);
    } finally {
      await removeFixtureDir(outside);
    }
  });

  it.skipIf(!POSIX)("refuses a token file that links outside the store", async () => {
    const outside = await createFixtureDir("presence-store-outside-file");
    try {
      ensureStore({ home });
      symlinkSync(join(outside, "token"), tokenPath({ home }));
      writeFileSync(join(outside, "token"), "x\n");
      expect(() => ensureToken({ home })).toThrow(/resolves outside/);
    } finally {
      await removeFixtureDir(outside);
    }
  });
});

describe("presence store: server.json (PC-02; threat-model control 4)", () => {
  it("round-trips its five fields and holds no token", () => {
    const token = ensureToken({ home });
    writeServerInfo(info, { home });
    expect(readServerInfo({ home })).toEqual(info);
    const raw = readFileSync(serverInfoPath({ home }), "utf8");
    expect(raw).not.toContain(token);
    if (POSIX) expect(mode(serverInfoPath({ home }))).toBe(0o600);
  });

  it("returns null for a missing file, invalid JSON, and fields out of range", () => {
    expect(readServerInfo({ home })).toBeNull();
    ensureStore({ home });
    const bad: unknown[] = [
      "not json",
      "null",
      JSON.stringify({ ...info, port: 0 }),
      JSON.stringify({ ...info, port: 70_000 }),
      JSON.stringify({ ...info, port: "27226" }),
      JSON.stringify({ ...info, pid: -1 }),
      JSON.stringify({ ...info, url: 3 }),
      JSON.stringify({ ...info, started_at: null }),
      JSON.stringify({ ...info, generator: null }),
      JSON.stringify({ ...info, generator: { name: "other", version: "1" } }),
    ];
    for (const content of bad) {
      writeFileSync(serverInfoPath({ home }), content as string);
      expect(readServerInfo({ home })).toBeNull();
    }
  });

  it("removes the file and tolerates its absence", () => {
    writeServerInfo(info, { home });
    removeServerInfo({ home });
    expect(existsSync(serverInfoPath({ home }))).toBe(false);
    expect(() => removeServerInfo({ home })).not.toThrow();
  });

  it("resolves the home on every call when none is passed", () => {
    const saved = { HOME: process.env["HOME"], USERPROFILE: process.env["USERPROFILE"] };
    process.env["HOME"] = home;
    process.env["USERPROFILE"] = home;
    try {
      expect(presenceDir()).toBe(join(home, ".arcane", "presence"));
      expect(tokenPath()).toBe(join(home, ".arcane", "presence", "token"));
    } finally {
      if (saved.HOME === undefined) delete process.env["HOME"];
      else process.env["HOME"] = saved.HOME;
      if (saved.USERPROFILE === undefined) delete process.env["USERPROFILE"];
      else process.env["USERPROFILE"] = saved.USERPROFILE;
    }
  });
});
