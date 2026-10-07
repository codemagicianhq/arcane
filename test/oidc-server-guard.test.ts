import { describe, expect, it, vi } from "vitest";
import { browserLogin, LoginTimeoutError } from "../src/modules/oidc.js";
import * as client from "openid-client";

const serverState = vi.hoisted(() => ({
  address: null as null | string | { port: number },
  close: vi.fn(),
  request: undefined as undefined | ((req: unknown, res: unknown) => void),
}));

vi.mock("node:http", () => ({
  createServer: () => ({
    once: vi.fn(),
    on: (_event: string, listener: (req: unknown, res: unknown) => void) => { serverState.request = listener; },
    listen: (_port: number, _host: string, ready: () => void) => ready(),
    address: () => serverState.address,
    closeAllConnections: vi.fn(),
    close: serverState.close,
  }),
}));

describe("loopback listener guard", () => {
  it.each([null, "unexpected-pipe"])("closes an unusable listener address (%s)", async (address) => {
    serverState.address = address;
    serverState.close.mockClear();
    await expect(browserLogin({} as client.Configuration, { scopes: [], openUrl: async () => true }))
      .rejects.toThrow("Could not open a loopback port");
    expect(serverState.close).toHaveBeenCalledOnce();
  });

  it("treats a request without a URL as stray and keeps waiting for the callback", async () => {
    serverState.address = { port: 12345 };
    serverState.request = undefined;
    const config = new client.Configuration({
      issuer: "https://issuer.example.test",
      authorization_endpoint: "https://issuer.example.test/authorize",
      token_endpoint: "https://issuer.example.test/token",
    }, "cli-test", undefined, client.None());
    const pending = browserLogin(config, {
      scopes: ["openid"],
      timeoutMs: 10,
      openUrl: async () => {
        const response = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };
        serverState.request?.({ url: undefined }, response);
        expect(response.writeHead).toHaveBeenCalledWith(404);
        return true;
      },
    });
    await expect(pending).rejects.toBeInstanceOf(LoginTimeoutError);
  });
});
