import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import { runLogin, safeErrorText, type LoginDeps } from "../src/commands/login.js";
import { runLogout } from "../src/commands/logout.js";
import { runWhoami, type WhoamiDeps } from "../src/commands/whoami.js";
import { KeychainUnavailableError, type SecretBackend } from "../src/modules/credential-store.js";
import {
  IDENTITY_ENVIRONMENTS,
  UnknownEnvironmentError,
  resolveIdentityEnvironment,
} from "../src/modules/identity-config.js";
import { IdentityUnreachableError, LoginDeniedError, LoginTimeoutError, type TokenResult } from "../src/modules/oidc.js";
import { FileSecretBackend, createSessionStorage } from "../src/modules/session-store.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import type { Configuration } from "openid-client";

class MemoryBackend implements SecretBackend {
  readonly entries = new Map<string, string>();
  broken = false;
  private check(): void {
    if (this.broken) throw new Error("simulated: no keychain");
  }
  get(n: string) {
    this.check();
    return this.entries.get(n) ?? null;
  }
  set(n: string, v: string) {
    this.check();
    this.entries.set(n, v);
  }
  delete(n: string) {
    this.check();
    this.entries.delete(n);
  }
  list() {
    this.check();
    return [...this.entries.keys()];
  }
}

const SECRET = "rt-" + "s".repeat(1465);
const tokenResult = (): TokenResult => ({
  refreshToken: SECRET,
  sub: "00000000-0000-4000-8000-00000000abcd",
  email: "person@example.test",
  obtainedAt: new Date("2026-10-05T10:00:00.000Z"),
  expiresAt: new Date("2026-10-05T11:00:00.000Z"),
});
const fakeConfig = {} as Configuration;

let dir: string;
let backend: MemoryBackend;
let storage: ReturnType<typeof createSessionStorage>;
let exit: ReturnType<typeof vi.spyOn>;
let out: string[];
let err: string[];

beforeEach(async () => {
  dir = await createFixtureDir("login-commands-");
  backend = new MemoryBackend();
  storage = createSessionStorage({
    keychainBackend: backend,
    fileBackend: new FileSecretBackend(join(dir, "session-insecure.json"), () => {}),
  });
  exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
  out = [];
  err = [];
  vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.map(String).join(" ")));
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void err.push(a.map(String).join(" ")));
});
afterEach(async () => {
  vi.restoreAllMocks();
  await removeFixtureDir(dir);
});

function deps(overrides: Partial<LoginDeps> = {}): LoginDeps {
  return {
    storage,
    environment: () => IDENTITY_ENVIRONMENTS.development,
    loadConfiguration: async () => fakeConfig,
    browserLogin: async () => tokenResult(),
    deviceLogin: async () => tokenResult(),
    openUrl: async () => true,
    isInteractive: () => true,
    ...overrides,
  };
}
const allOutput = () => [...out, ...err].join("\n");

describe("identity environment", () => {
  it("defaults to production, accepts dev/development, and rejects anything else", () => {
    expect(resolveIdentityEnvironment({}).environment).toBe("production");
    expect(resolveIdentityEnvironment({ ARCANE_ENVIRONMENT: "" }).environment).toBe("production");
    expect(resolveIdentityEnvironment({ ARCANE_ENVIRONMENT: "prod" }).environment).toBe("production");
    expect(resolveIdentityEnvironment({ ARCANE_ENVIRONMENT: "dev" }).environment).toBe("development");
    expect(resolveIdentityEnvironment({ ARCANE_ENVIRONMENT: " Development " }).environment).toBe("development");
    expect(() => resolveIdentityEnvironment({ ARCANE_ENVIRONMENT: "staging" })).toThrow(UnknownEnvironmentError);
  });

  it("keeps the two tenants' discovery URLs on their own sign-in hosts", () => {
    for (const env of Object.values(IDENTITY_ENVIRONMENTS)) {
      expect(new URL(env.discoveryUrl).host).toBe(env.signInHost);
      expect(env.discoveryUrl).toContain(env.tenantId);
    }
  });
});

describe("spell login", () => {
  it("signs in through the browser, stores the session in the keychain and names the account", async () => {
    await runLogin({}, deps());
    expect(exit).not.toHaveBeenCalled();
    expect(allOutput()).toContain("Signed in as person@example.test (00000000-0000-4000-8000-00000000abcd) [development]");
    expect(storage.load()).toMatchObject({ state: "ok", source: "keychain", record: { refreshToken: SECRET } });
    expect(allOutput()).not.toContain(SECRET.slice(0, 30));
  });

  it("uses the device-code flow on request, even without a terminal", async () => {
    const device = vi.fn(async () => tokenResult());
    await runLogin({ deviceCode: true }, deps({ deviceLogin: device, isInteractive: () => false }));
    expect(device).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();
  });

  it("refuses a browser sign-in with no interactive terminal and points at --device-code (R16)", async () => {
    const browser = vi.fn(async () => tokenResult());
    await runLogin({}, deps({ browserLogin: browser, isInteractive: () => false }));
    expect(browser).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
    expect(err.join("\n")).toContain("--device-code");
  });

  it("explains an unknown ARCANE_ENVIRONMENT and stops", async () => {
    await runLogin({}, deps({ environment: () => resolveIdentityEnvironment({ ARCANE_ENVIRONMENT: "qa" }) }));
    expect(exit).toHaveBeenCalledWith(1);
    expect(err.join("\n")).toContain("\"qa\" is not an environment");
  });

  it("explains an unreachable identity service and stores nothing", async () => {
    await runLogin(
      {},
      deps({
        loadConfiguration: async () => {
          throw new IdentityUnreachableError("example.test", new Error("ECONNREFUSED"));
        },
      }),
    );
    expect(exit).toHaveBeenCalledWith(1);
    expect(err.join("\n")).toContain("Could not reach the identity service at example.test");
    expect(storage.load()).toEqual({ state: "signed-out" });
  });

  it.each([
    ["a timeout", new LoginTimeoutError()],
    ["a denial", new LoginDeniedError("access_denied")],
    ["any other failure", new Error("boom ?code=abc123&state=zzz")],
  ])("leaves the previous session untouched when the sign-in fails with %s (R5)", async (_label, failure) => {
    await runLogin({}, deps());
    const before = storage.load();
    await runLogin(
      {},
      deps({
        browserLogin: async () => {
          throw failure;
        },
      }),
    );
    expect(exit).toHaveBeenCalledWith(1);
    expect(storage.load()).toEqual(before);
    expect(err.join("\n")).toContain("Nothing was changed");
    expect(err.join("\n")).not.toContain("abc123");
  });

  it("replaces an existing session after a new sign-in succeeds", async () => {
    await runLogin({}, deps());
    const second = { ...tokenResult(), sub: "second-account", refreshToken: "rt-second" + "y".repeat(1400) };
    await runLogin({}, deps({ browserLogin: async () => second }));
    expect(storage.load()).toMatchObject({ record: { sub: "second-account" } });
  });

  it("with no keychain, refuses, stores nothing and names the opt-in flag (R6)", async () => {
    backend.broken = true;
    await runLogin({}, deps());
    expect(exit).toHaveBeenCalledWith(1);
    const text = err.join("\n");
    expect(text).toContain("keychain is not available");
    expect(text).toContain("--insecure-storage");
    expect(text).toContain("Nothing was stored");
  });

  it("with --insecure-storage, stores the session in the file and warns every time", async () => {
    backend.broken = true;
    await runLogin({ insecureStorage: true }, deps());
    expect(exit).not.toHaveBeenCalled();
    expect(storage.load()).toMatchObject({ state: "ok", source: "file" });
    expect(allOutput()).toContain("Insecure storage");
    out.length = 0;
    await runWhoami({}, whoamiDeps());
    expect(allOutput()).toContain("Insecure storage");
  });

  it("tells the person what to do when no browser can be opened", async () => {
    await runLogin(
      {},
      deps({
        openUrl: async () => false,
        browserLogin: async (_c, o) => {
          o.onCannotOpen?.("http://127.0.0.1:1/authorize?x=1");
          return tokenResult();
        },
      }),
    );
    expect(allOutput()).toContain("No browser could be opened");
    expect(allOutput()).toContain("--device-code");
  });
});

function whoamiDeps(overrides: Partial<WhoamiDeps> = {}): WhoamiDeps {
  return {
    storage,
    loadConfiguration: async () => fakeConfig,
    refreshSession: async () => ({ ...tokenResult(), refreshToken: "rt-rotated" + "z".repeat(1400) }),
    now: () => new Date("2026-10-05T10:30:00.000Z"),
    ...overrides,
  };
}

describe("spell whoami", () => {
  it("exits 1 when signed out", async () => {
    await runWhoami({}, whoamiDeps());
    expect(exit).toHaveBeenCalledWith(1);
    expect(err.join("\n")).toContain("Not signed in");
  });

  it("prints the account, environment, times and medium from the stored session alone", async () => {
    await runLogin({}, deps());
    out.length = 0;
    const refresh = vi.fn();
    await runWhoami({}, whoamiDeps({ refreshSession: refresh as never }));
    expect(exit).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    const text = out.join("\n");
    expect(text).toContain("person@example.test");
    expect(text).toContain("[development]");
    expect(text).toContain("valid until");
    expect(text).toContain("OS keychain");
    expect(text).not.toContain(SECRET.slice(0, 30));
  });

  it("says when the last token has expired", async () => {
    await runLogin({}, deps());
    out.length = 0;
    await runWhoami({}, whoamiDeps({ now: () => new Date("2026-10-05T12:00:00.000Z") }));
    expect(out.join("\n")).toContain("expired");
  });

  it("--verify refreshes against the identity service and keeps the rotated refresh token", async () => {
    await runLogin({}, deps());
    await runWhoami({ verify: true }, whoamiDeps());
    expect(exit).not.toHaveBeenCalled();
    expect(out.join("\n")).toContain("Verified with the identity service");
    expect(storage.load()).toMatchObject({ record: { refreshToken: expect.stringMatching(/^rt-rotated/) } });
  });

  it("--verify reports a rejected session and exits 1", async () => {
    await runLogin({}, deps());
    await runWhoami(
      { verify: true },
      whoamiDeps({
        refreshSession: async () => {
          throw new Error("invalid_grant");
        },
      }),
    );
    expect(exit).toHaveBeenCalledWith(1);
    expect(err.join("\n")).toContain("did not accept the session");
  });

  it("treats a damaged session as signed out and says how to clear it", async () => {
    await runLogin({}, deps());
    const chunk = [...backend.entries.keys()].find((k) => k !== "session/index")!;
    backend.entries.set(chunk, "x".repeat(1000));
    await runWhoami({}, whoamiDeps());
    expect(exit).toHaveBeenCalledWith(1);
    expect(err.join("\n")).toContain("spell logout");
  });
});

describe("spell logout", () => {
  it("succeeds when nothing is stored", () => {
    runLogout(storage);
    expect(exit).not.toHaveBeenCalled();
    expect(out.join("\n")).toContain("already signed out");
  });

  it("removes the session and says it is local only (R3, R21)", async () => {
    await runLogin({}, deps());
    runLogout(storage);
    expect(backend.entries.size).toBe(0);
    expect(storage.load()).toEqual({ state: "signed-out" });
    const text = out.join("\n");
    expect(text).toContain("removed the session from the OS keychain");
    expect(text).toContain("this machine only");
  });

  it("reports an unusable keychain", () => {
    backend.broken = true;
    runLogout(storage);
    expect(exit).toHaveBeenCalledWith(1);
    expect(err.join("\n")).toContain("keychain is not available");
  });
});

describe("safeErrorText", () => {
  it("keeps the first line and redacts callback query values", () => {
    expect(safeErrorText(new Error("bad\nsecond line"))).toBe("bad");
    expect(safeErrorText(new Error("callback http://x/?code=SECRETCODE&state=STATEVAL failed"))).toBe(
      "callback http://x/?code=[redacted]&state=[redacted] failed",
    );
    expect(safeErrorText("plain")).toBe("plain");
  });

  it("KeychainUnavailableError carries no backend text in its message", () => {
    const e = new KeychainUnavailableError("read", new Error("value rt-leak"));
    expect(e.message).not.toContain("rt-leak");
  });
});
