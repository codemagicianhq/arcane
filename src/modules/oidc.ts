/**
 * The sign-in flows behind `spell login` (features/spell-login/PRD.md, R1,
 * R2, R8), on `openid-client`: the authorization-code flow with PKCE through a
 * loopback redirect, and the device-code flow for machines with no browser.
 *
 * Two things here are deliberate and tested:
 *
 * - The configuration is built from the fetched discovery document rather
 *   than through `client.discovery()`, because the identity tenant publishes
 *   its issuer under a different host from the one that serves the document,
 *   and the standard "issuer must match the URL" check would refuse it.
 * - Nothing in this module prints or throws a token, an authorization code or
 *   a `state` value (R10). The loopback server answers the browser with a
 *   fixed page and never echoes the request.
 */

import { createServer, type Server } from "node:http";
import { execFile } from "node:child_process";
import * as client from "openid-client";
import type { IdentityEnvironmentConfig } from "./identity-config.js";

export interface TokenResult {
  refreshToken: string;
  sub: string;
  email: string | null;
  obtainedAt: Date;
  expiresAt: Date;
}

export interface LoadConfigurationOptions {
  /** A replacement `fetch`, for proxies (R12) and for tests. */
  fetch?: typeof fetch;
  /** Tests only: let the flows talk to an `http://` provider. */
  allowInsecureHttp?: boolean;
}

export class IdentityUnreachableError extends Error {
  constructor(host: string, cause: unknown) {
    super(`Could not reach the identity service at ${host}.`);
    this.name = "IdentityUnreachableError";
    this.cause = cause;
  }
}

export class LoginTimeoutError extends Error {
  constructor() {
    super("Timed out waiting for the sign-in to finish in the browser.");
    this.name = "LoginTimeoutError";
  }
}

export class LoginBrowserUnavailableError extends Error {
  constructor() {
    super("No browser could be opened. Run `spell login --device-code` and finish signing in on another device.");
    this.name = "LoginBrowserUnavailableError";
  }
}

export class LoginDeniedError extends Error {
  constructor(code: string) {
    // `code` is the provider's error code (e.g. access_denied), never a secret.
    super(`The identity service refused the sign-in (${code}).`);
    this.name = "LoginDeniedError";
  }
}

export async function loadIdentityConfiguration(
  environment: IdentityEnvironmentConfig,
  options: LoadConfigurationOptions = {},
): Promise<client.Configuration> {
  const fetchImpl = options.fetch ?? fetch;
  let metadata: client.ServerMetadata;
  try {
    const response = await fetchImpl(environment.discoveryUrl, { redirect: "manual" });
    if (!response.ok) throw new Error(`discovery returned HTTP ${response.status}`);
    metadata = (await response.json()) as client.ServerMetadata;
  } catch (error) {
    throw new IdentityUnreachableError(environment.signInHost, error);
  }
  if (typeof metadata.issuer !== "string" || !metadata.token_endpoint || !metadata.authorization_endpoint) {
    throw new IdentityUnreachableError(environment.signInHost, new Error("discovery document incomplete"));
  }

  const config = new client.Configuration(metadata, environment.clientId, undefined, client.None());
  if (options.fetch) config[client.customFetch] = options.fetch as client.CustomFetch;
  if (options.allowInsecureHttp) client.allowInsecureRequests(config);
  return config;
}

function toTokenResult(
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
  /** Used when the service did not rotate the refresh token. */
  previousRefreshToken?: string,
): TokenResult {
  const claims = tokens.claims();
  if (!claims?.sub) throw new Error("The identity service returned no account identifier.");
  const refreshToken = tokens.refresh_token ?? previousRefreshToken;
  if (!refreshToken) {
    throw new Error("The identity service returned no refresh token; nothing can be stored.");
  }
  const now = new Date();
  const seconds = tokens.expiresIn() ?? 0;
  const email =
    typeof claims["email"] === "string"
      ? claims["email"]
      : typeof claims["preferred_username"] === "string"
        ? claims["preferred_username"]
        : null;
  return {
    refreshToken,
    sub: claims.sub,
    email,
    obtainedAt: now,
    expiresAt: new Date(now.getTime() + seconds * 1000),
  };
}

const CLOSE_PAGE = [
  "<!doctype html><meta charset=\"utf-8\"><title>Arcane</title>",
  "<body style=\"font-family:system-ui;margin:3rem\"><h1>Signed in to Arcane</h1>",
  "<p>You can close this window and go back to the terminal.</p></body>",
].join("");

const FAILED_PAGE = [
  "<!doctype html><meta charset=\"utf-8\"><title>Arcane</title>",
  "<body style=\"font-family:system-ui;margin:3rem\"><h1>Sign-in not completed</h1>",
  "<p>Go back to the terminal for what to do next.</p></body>",
].join("");

const RESULT_HEADERS = {
  "cache-control": "no-store",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "content-type": "text/html; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
} as const;

type BrowserResult =
  | { kind: "success"; page: string; result: TokenResult }
  | { kind: "failure"; page: string; error: unknown };

export interface BrowserLoginOptions {
  scopes: readonly string[];
  /** Opens the URL in the person's browser; resolves false when no browser could be opened. */
  openUrl: (url: string) => Promise<boolean>;
  /** Completes local persistence before the browser can claim sign-in succeeded. */
  onValidated?: (result: TokenResult) => void | Promise<void>;
  /** Called when the browser could not be opened. The authorization URL stays private. */
  onCannotOpen?: () => void;
  timeoutMs?: number;
}

/**
 * Authorization code + PKCE through a loopback redirect: a server on
 * 127.0.0.1 and a random free port, one request accepted, closed on success,
 * failure, timeout or interrupt (R8).
 */
export async function browserLogin(
  config: client.Configuration,
  options: BrowserLoginOptions,
): Promise<TokenResult> {
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  const server: Server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Could not open a loopback port for the sign-in.");
  }
  // Serialized through URL so it is byte-identical to what openid-client later
  // derives from the callback URL (a trailing slash): the token endpoint compares them.
  const redirectUri = new URL(`http://127.0.0.1:${address.port}`).href;

  const authorizationUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: options.scopes.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  let timer: NodeJS.Timeout | undefined;
  let callbackConsumed = false;
  let browserResult: BrowserResult | undefined;
  const close = (): void => {
    if (timer) clearTimeout(timer);
    server.closeAllConnections?.();
    server.close();
  };

  const tokens = new Promise<TokenResult>((resolve, reject) => {
    server.on("request", (req, res) => {
      const url = new URL(req.url ?? "/", redirectUri);

      if (url.pathname === "/result/success" || url.pathname === "/result/failure") {
        const expectedPath = browserResult?.kind === "success" ? "/result/success" : "/result/failure";
        if (!browserResult || url.pathname !== expectedPath || url.search !== "") {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, RESULT_HEADERS).end(browserResult.page);
        if ("result" in browserResult) resolve(browserResult.result);
        else reject(browserResult.error);
        return;
      }

      if (url.pathname !== "/" || (!url.searchParams.has("code") && !url.searchParams.has("error"))) {
        res.writeHead(404).end();
        return;
      }
      if (callbackConsumed) {
        res.writeHead(409, { "cache-control": "no-store" }).end();
        return;
      }
      if (url.searchParams.get("state") !== state) {
        res.writeHead(400, RESULT_HEADERS).end(FAILED_PAGE);
        return;
      }
      callbackConsumed = true;

      const redirectToResult = (result: BrowserResult): void => {
        browserResult = result;
        const location = result.kind === "success" ? "/result/success" : "/result/failure";
        res.writeHead(303, {
          "cache-control": "no-store",
          location,
          "referrer-policy": "no-referrer",
        }).end();
        if (result.kind === "success") {
          // The session is already saved. A browser that never follows the
          // redirect must not turn that success into a reported failure.
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => resolve(result.result), Math.min(timeoutMs, 5_000));
        }
      };

      const errorCode = url.searchParams.get("error");
      if (errorCode) {
        redirectToResult({
          kind: "failure",
          page: FAILED_PAGE,
          error: new LoginDeniedError(errorCode.replace(/[^a-z_]/gi, "")),
        });
        return;
      }
      client
        .authorizationCodeGrant(config, url, {
          pkceCodeVerifier: codeVerifier,
          expectedState: state,
          expectedNonce: nonce,
          idTokenExpected: true,
        })
        .then(async (response) => {
          const result = toTokenResult(response);
          await options.onValidated?.(result);
          redirectToResult({ kind: "success", page: CLOSE_PAGE, result });
        })
        .catch((error: unknown) => {
          redirectToResult({ kind: "failure", page: FAILED_PAGE, error });
        });
    });
    timer = setTimeout(() => reject(new LoginTimeoutError()), timeoutMs);
  });
  // The callback can fail before `await tokens` below attaches, while the
  // browser opener is still running; mark the rejection handled so Node does
  // not report it. `await tokens` still throws the same error.
  tokens.catch(() => {});

  try {
    const opened = await options.openUrl(authorizationUrl.href);
    if (!opened) {
      options.onCannotOpen?.();
      throw new LoginBrowserUnavailableError();
    }
    return await tokens;
  } finally {
    close();
  }
}

export interface DeviceLoginOptions {
  scopes: readonly string[];
  /** Shows the person where to go and which code to type. */
  prompt: (verificationUri: string, userCode: string, expiresInSeconds: number) => void;
}

export async function deviceLogin(
  config: client.Configuration,
  options: DeviceLoginOptions,
): Promise<TokenResult> {
  const handle = await client.initiateDeviceAuthorization(config, { scope: options.scopes.join(" ") });
  options.prompt(handle.verification_uri, handle.user_code, handle.expires_in);
  const response = await client.pollDeviceAuthorizationGrant(config, handle);
  return toTokenResult(response);
}

/** Exchanges the stored refresh token for fresh tokens; the identity service may rotate it. */
export async function refreshSession(
  config: client.Configuration,
  refreshToken: string,
  scopes: readonly string[],
): Promise<TokenResult> {
  const response = await client.refreshTokenGrant(config, refreshToken, { scope: scopes.join(" ") });
  return toTokenResult(response, refreshToken);
}

/**
 * Opens a URL in the default browser without a shell, so nothing in the URL
 * is ever interpreted. Resolves false when the platform's opener is missing
 * or fails, which is the "no browser" case `spell login` answers with a
 * `--device-code` suggestion.
 */
export function openInDefaultBrowser(url: string): Promise<boolean> {
  const [command, args] =
    process.platform === "win32"
      ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  return new Promise((resolve) => {
    try {
      const child = execFile(command, args, { windowsHide: true }, (error) => resolve(!error));
      child.on("error", () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}
