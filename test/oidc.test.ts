import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  IdentityUnreachableError,
  LoginDeniedError,
  LoginTimeoutError,
  browserLogin,
  deviceLogin,
  loadIdentityConfiguration,
  refreshSession,
} from "../src/modules/oidc.js";
import type { IdentityEnvironmentConfig } from "../src/modules/identity-config.js";
import { MockIdentityProvider, actAsBrowser } from "./helpers/mock-identity-provider.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

const SCOPES = ["openid", "profile", "email", "offline_access"];
const provider = new MockIdentityProvider();
let environment: IdentityEnvironmentConfig;

beforeAll(async () => {
  await provider.start();
  environment = {
    environment: "development",
    tenantId: "tenant",
    signInHost: `127.0.0.1:${provider.port}`,
    clientId: provider.clientId,
    discoveryUrl: provider.discoveryUrl,
  };
});
afterAll(() => provider.stop());
beforeEach(() => {
  provider.failNextTokenWith = null;
});

const load = () => loadIdentityConfiguration(environment, { allowInsecureHttp: true });

describe("loadIdentityConfiguration", () => {
  it("builds the configuration from the discovery document even though the issuer host differs from the serving host", async () => {
    const config = await load();
    const metadata = config.serverMetadata();
    expect(metadata.issuer).toBe(provider.issuer);
    expect(new URL(metadata.issuer).host).not.toBe(new URL(provider.discoveryUrl).host);
    expect(metadata.token_endpoint).toBe(`${provider.base}/token`);
  });

  it("reports an unreachable identity service by host, with the cause attached", async () => {
    const unreachable = { ...environment, discoveryUrl: "http://127.0.0.1:1/.well-known/openid-configuration" };
    const error = await loadIdentityConfiguration(unreachable, { allowInsecureHttp: true }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(IdentityUnreachableError);
    expect((error as Error).message).toContain(environment.signInHost);
    expect((error as Error).cause).toBeDefined();
  });

  it("refuses an incomplete discovery document", async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ issuer: "x" }), { status: 200 });
    await expect(loadIdentityConfiguration(environment, { fetch: fetchImpl })).rejects.toBeInstanceOf(
      IdentityUnreachableError,
    );
  });
});

describe("browserLogin", () => {
  it(
    "completes the PKCE flow through the loopback redirect and returns the account and a refresh token",
    async () => {
      const config = await load();
      const result = await browserLogin(config, { scopes: SCOPES, openUrl: actAsBrowser, timeoutMs: HEAVY_TEST_TIMEOUT });
      expect(result.sub).toBe(provider.sub);
      expect(result.email).toBe(provider.email);
      expect(result.refreshToken.length).toBe(1468);
      // openid-client measures expires_in from when it received the response; obtainedAt is stamped a moment later.
      const lifetime = result.expiresAt.getTime() - result.obtainedAt.getTime();
      expect(lifetime).toBeGreaterThan(3590 * 1000);
      expect(lifetime).toBeLessThanOrEqual(3600 * 1000);
      expect(provider.tokenRequests.at(-1)?.grantType).toBe("authorization_code");
    },
    HEAVY_TEST_TIMEOUT,
  );

  it("sends the redirect to 127.0.0.1 on an ephemeral port, with PKCE S256, state and nonce", async () => {
    const config = await load();
    let seen = "";
    await browserLogin(config, {
      scopes: SCOPES,
      timeoutMs: HEAVY_TEST_TIMEOUT,
      openUrl: async (url) => {
        seen = url;
        return actAsBrowser(url);
      },
    });
    const url = new URL(seen);
    const redirect = new URL(url.searchParams.get("redirect_uri")!);
    expect(redirect.hostname).toBe("127.0.0.1");
    expect(Number(redirect.port)).toBeGreaterThan(0);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(url.searchParams.get("nonce")).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(url.searchParams.get("scope")).toBe(SCOPES.join(" "));
  });

  it("rejects a callback whose state does not match, and the loopback server is closed afterwards", async () => {
    const config = await load();
    let callbackPort = 0;
    const error = await browserLogin(config, {
      scopes: SCOPES,
      timeoutMs: HEAVY_TEST_TIMEOUT,
      openUrl: async (url) => {
        const authorize = new URL(url);
        const redirect = new URL(authorize.searchParams.get("redirect_uri")!);
        callbackPort = Number(redirect.port);
        authorize.searchParams.set("state", "forged-state-value-0000000000");
        return actAsBrowser(authorize.href);
      },
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).message)).not.toContain("forged-state-value");
    // the port is released: a connection attempt now fails
    await expect(fetch(`http://127.0.0.1:${callbackPort}/`)).rejects.toThrow();
  });

  it("maps a provider error on the callback to LoginDeniedError without echoing the query", async () => {
    const config = await load();
    const error = await browserLogin(config, {
      scopes: SCOPES,
      timeoutMs: HEAVY_TEST_TIMEOUT,
      openUrl: async (url) => {
        const redirect = new URL(new URL(url).searchParams.get("redirect_uri")!);
        redirect.searchParams.set("error", "access_denied");
        redirect.searchParams.set("state", "whatever");
        const res = await fetch(redirect.href);
        expect(await res.text()).not.toContain("whatever");
        return true;
      },
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LoginDeniedError);
    expect((error as Error).message).toContain("access_denied");
  });

  it("times out when no callback arrives, and reports when no browser could be opened", async () => {
    const config = await load();
    let told: string | null = null;
    const error = await browserLogin(config, {
      scopes: SCOPES,
      timeoutMs: 300,
      openUrl: async () => false,
      onCannotOpen: (url) => (told = url),
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LoginTimeoutError);
    expect(told).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/authorize\?/);
  });

  it("ignores stray requests such as a favicon and keeps waiting", async () => {
    const config = await load();
    const result = await browserLogin(config, {
      scopes: SCOPES,
      timeoutMs: HEAVY_TEST_TIMEOUT,
      openUrl: async (url) => {
        const redirect = new URL(new URL(url).searchParams.get("redirect_uri")!);
        const stray = await fetch(`${redirect.origin}/favicon.ico`);
        expect(stray.status).toBe(404);
        return actAsBrowser(url);
      },
    });
    expect(result.sub).toBe(provider.sub);
  });
});

describe("deviceLogin", () => {
  it(
    "shows the code, polls, and returns the account once the person approves",
    async () => {
      const config = await load();
      let shown: { uri: string; code: string } | null = null;
      const pending = deviceLogin(config, {
        scopes: SCOPES,
        prompt: (uri, code) => {
          shown = { uri, code };
          setTimeout(() => provider.approveDevice(), 50);
        },
      });
      const result = await pending;
      expect(shown).toEqual({ uri: `${provider.base}/device-page`, code: "ABCD-1234" });
      expect(result.sub).toBe(provider.sub);
      expect(result.refreshToken).toMatch(/^rt-/);
    },
    HEAVY_TEST_TIMEOUT,
  );
});

describe("refreshSession", () => {
  it("returns the rotated refresh token when the provider issues one", async () => {
    const config = await load();
    const first = await browserLogin(config, { scopes: SCOPES, openUrl: actAsBrowser, timeoutMs: HEAVY_TEST_TIMEOUT });
    const second = await refreshSession(config, first.refreshToken, SCOPES);
    expect(second.sub).toBe(provider.sub);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(provider.tokenRequests.at(-1)?.grantType).toBe("refresh_token");
  });

  it("fails for a refresh token the provider does not know", async () => {
    const config = await load();
    await expect(refreshSession(config, "rt-never-issued", SCOPES)).rejects.toThrow();
  });
});
