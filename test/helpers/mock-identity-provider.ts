/**
 * An in-process OpenID provider for the `spell login` tests: discovery, JWKS,
 * authorization (redirects straight back with a code), token (code, refresh
 * and device grants) and device authorization. ID tokens are signed ES256 so
 * `openid-client` validates them for real.
 *
 * Its published `issuer` uses a different host (`localhost`) from the one that
 * serves it (`127.0.0.1`), on purpose: the real tenant does the same, and the
 * CLI's configuration loader must cope with it.
 */

import { createServer, type Server } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, exportJWK, generateKeyPair, type KeyLike } from "jose";

interface PendingCode {
  codeChallenge: string;
  redirectUri: string;
  nonce: string | undefined;
  scope: string;
}

export interface TokenRequestRecord {
  grantType: string;
  scope: string | undefined;
}

export class MockIdentityProvider {
  private server!: Server;
  private privateKey!: KeyLike;
  private jwk!: Record<string, unknown>;
  readonly kid = "test-key-1";
  port = 0;
  readonly clientId = "11111111-2222-4333-8444-555555555555";
  readonly sub = "00000000-0000-4000-8000-00000000abcd";
  readonly email = "person@example.test";

  private readonly codes = new Map<string, PendingCode>();
  private readonly deviceCodes = new Map<string, { approved: boolean; scope: string }>();
  refreshTokenCounter = 0;
  readonly issuedRefreshTokens: string[] = [];
  readonly tokenRequests: TokenRequestRecord[] = [];
  /** When set, the next token request fails with this OAuth error code. */
  failNextTokenWith: string | null = null;
  /** Characters in each issued refresh token; longer than one Windows credential by default. */
  refreshTokenLength = 1468;

  get base(): string {
    return `http://127.0.0.1:${this.port}`;
  }
  /** Deliberately not the serving host. */
  get issuer(): string {
    return `http://localhost:${this.port}/tenant/v2.0`;
  }
  get discoveryUrl(): string {
    return `${this.base}/.well-known/openid-configuration`;
  }

  async start(): Promise<void> {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    this.privateKey = privateKey;
    this.jwk = { ...(await exportJWK(publicKey)), kid: this.kid, alg: "ES256", use: "sig" };
    this.server = createServer((req, res) => {
      this.handle(req.method ?? "GET", new URL(req.url ?? "/", this.base), req)
        .then(({ status, body, headers }) => {
          res.writeHead(status, { "content-type": "application/json", ...headers }).end(body);
        })
        .catch((error: unknown) => {
          res.writeHead(500).end(String(error));
        });
    });
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", () => resolve()));
    const address = this.server.address();
    if (address && typeof address === "object") this.port = address.port;
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections?.();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  approveDevice(): void {
    for (const entry of this.deviceCodes.values()) entry.approved = true;
  }

  private newRefreshToken(): string {
    this.refreshTokenCounter += 1;
    const prefix = `rt-${this.refreshTokenCounter}-`;
    const token = prefix + randomBytes(this.refreshTokenLength).toString("base64url").slice(0, this.refreshTokenLength - prefix.length);
    this.issuedRefreshTokens.push(token);
    return token;
  }

  private async idToken(nonce: string | undefined): Promise<string> {
    const jwt = new SignJWT({ email: this.email, ...(nonce ? { nonce } : {}) })
      .setProtectedHeader({ alg: "ES256", kid: this.kid })
      .setIssuer(this.issuer)
      .setAudience(this.clientId)
      .setSubject(this.sub)
      .setIssuedAt()
      .setExpirationTime("1h");
    return jwt.sign(this.privateKey);
  }

  private async tokenResponse(scope: string, nonce: string | undefined): Promise<string> {
    return JSON.stringify({
      token_type: "Bearer",
      access_token: randomBytes(600).toString("base64url"),
      id_token: await this.idToken(nonce),
      refresh_token: this.newRefreshToken(),
      expires_in: 3600,
      scope,
    });
  }

  private async handle(
    method: string,
    url: URL,
    req: import("node:http").IncomingMessage,
  ): Promise<{ status: number; body: string; headers?: Record<string, string> }> {
    const json = (status: number, value: unknown) => ({ status, body: JSON.stringify(value) });

    if (url.pathname === "/.well-known/openid-configuration") {
      return json(200, {
        issuer: this.issuer,
        authorization_endpoint: `${this.base}/authorize`,
        token_endpoint: `${this.base}/token`,
        device_authorization_endpoint: `${this.base}/device`,
        jwks_uri: `${this.base}/jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["ES256"],
        code_challenge_methods_supported: ["S256"],
        grant_types_supported: ["authorization_code", "refresh_token", "urn:ietf:params:oauth:grant-type:device_code"],
      });
    }
    if (url.pathname === "/jwks") return json(200, { keys: [this.jwk] });

    if (url.pathname === "/authorize") {
      const p = url.searchParams;
      if (p.get("response_type") !== "code" || p.get("client_id") !== this.clientId || p.get("code_challenge_method") !== "S256") {
        return json(400, { error: "invalid_request" });
      }
      const redirectUri = p.get("redirect_uri")!;
      const code = randomBytes(24).toString("base64url");
      this.codes.set(code, {
        codeChallenge: p.get("code_challenge")!,
        redirectUri,
        nonce: p.get("nonce") ?? undefined,
        scope: p.get("scope") ?? "",
      });
      const back = new URL(redirectUri);
      back.searchParams.set("code", code);
      back.searchParams.set("state", p.get("state") ?? "");
      return { status: 302, body: "", headers: { location: back.href } };
    }

    if (url.pathname === "/device" && method === "POST") {
      const form = new URLSearchParams(await readBody(req));
      const deviceCode = randomBytes(16).toString("base64url");
      this.deviceCodes.set(deviceCode, { approved: false, scope: form.get("scope") ?? "" });
      return json(200, {
        device_code: deviceCode,
        user_code: "ABCD-1234",
        verification_uri: `${this.base}/device-page`,
        expires_in: 600,
        interval: 1,
      });
    }

    if (url.pathname === "/token" && method === "POST") {
      const form = new URLSearchParams(await readBody(req));
      const grantType = form.get("grant_type") ?? "";
      this.tokenRequests.push({ grantType, scope: form.get("scope") ?? undefined });
      if (this.failNextTokenWith) {
        const code = this.failNextTokenWith;
        this.failNextTokenWith = null;
        return json(400, { error: code, error_description: "simulated failure" });
      }
      if (grantType === "authorization_code") {
        const pending = this.codes.get(form.get("code") ?? "");
        if (!pending) return json(400, { error: "invalid_grant" });
        this.codes.delete(form.get("code")!);
        const verifier = form.get("code_verifier") ?? "";
        const challenge = createHash("sha256").update(verifier).digest("base64url");
        if (challenge !== pending.codeChallenge || form.get("redirect_uri") !== pending.redirectUri) {
          return json(400, { error: "invalid_grant" });
        }
        return { status: 200, body: await this.tokenResponse(pending.scope, pending.nonce) };
      }
      if (grantType === "refresh_token") {
        const presented = form.get("refresh_token") ?? "";
        if (!this.issuedRefreshTokens.includes(presented)) return json(400, { error: "invalid_grant" });
        return { status: 200, body: await this.tokenResponse(form.get("scope") ?? "", undefined) };
      }
      if (grantType === "urn:ietf:params:oauth:grant-type:device_code") {
        const entry = this.deviceCodes.get(form.get("device_code") ?? "");
        if (!entry) return json(400, { error: "invalid_grant" });
        if (!entry.approved) return json(400, { error: "authorization_pending" });
        return { status: 200, body: await this.tokenResponse(entry.scope, undefined) };
      }
      return json(400, { error: "unsupported_grant_type" });
    }

    return json(404, { error: "not_found" });
  }
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/** Acts as the person's browser: follows the authorize redirect back to the CLI's loopback server. */
export async function actAsBrowser(authorizationUrl: string): Promise<boolean> {
  const first = await fetch(authorizationUrl, { redirect: "manual" });
  const location = first.headers.get("location");
  if (first.status !== 302 || !location) return false;
  const second = await fetch(location);
  return second.ok;
}
