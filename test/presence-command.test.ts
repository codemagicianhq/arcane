import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ServeError, resolvePort, runPresenceStatus, runPresenceStop, startPresenceService, type RunningService } from "../src/commands/presence.js";
import { readServerInfo, serverInfoPath, tokenPath } from "../src/modules/presence/store.js";
import { PRESENCE_ENV } from "../src/modules/presence/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { httpRequest } from "./helpers/presence.js";

// In-process coverage of the command layer; the built-CLI suite
// (presence-lifecycle.test.ts) covers the same paths through real processes.

let home: string;
let service: RunningService | undefined;
beforeEach(async () => {
  home = await createFixtureDir("presence-command");
});
afterEach(async () => {
  await service?.stop();
  service = undefined;
  await removeFixtureDir(home);
});

function capture() {
  const lines: string[] = [];
  return { io: { out: (l: string) => lines.push(l), err: (l: string) => lines.push(l) }, lines };
}

describe("resolvePort", () => {
  it("takes the flag, then the variable, then 27226, and refuses what is not a port", () => {
    expect(resolvePort("8080", { [PRESENCE_ENV.port]: "9090" })).toBe(8080);
    expect(resolvePort(undefined, { [PRESENCE_ENV.port]: "9090" })).toBe(9090);
    expect(resolvePort(undefined, {})).toBe(27226);
    expect(resolvePort("0", {})).toBe(0);
    for (const bad of ["-1", "65536", "abc", "80.5", ""]) expect(resolvePort(bad, {})).toBeNull();
  });
});

describe("startPresenceService (architecture D13, D14)", () => {
  it("binds, then writes the token and server.json, and stop removes only server.json", async () => {
    service = await startPresenceService({ port: "0" }, { env: {}, store: { home } });
    const info = readServerInfo({ home });
    expect(info?.port).toBe(service.port);
    expect(info?.url).toBe(service.url);
    const token = readFileSync(tokenPath({ home }), "utf8").trim();
    expect((await httpRequest(service.port, { path: "/v0/health", token })).status).toBe(200);
    await service.stop();
    expect(existsSync(serverInfoPath({ home }))).toBe(false);
    expect(existsSync(tokenPath({ home }))).toBe(true);
    await service.stop();
  });

  it("refuses a busy port without touching the token, and a bad port", async () => {
    service = await startPresenceService({ port: "0" }, { env: {}, store: { home } });
    const before = readFileSync(tokenPath({ home }), "utf8");
    await expect(startPresenceService({ port: String(service.port), rotate: true }, { env: {}, store: { home } })).rejects.toThrow(String(service.port));
    expect(readFileSync(tokenPath({ home }), "utf8")).toBe(before);
    await expect(startPresenceService({ port: "x" }, { env: {}, store: { home } })).rejects.toBeInstanceOf(ServeError);
  });

  it("closes the listener when the store cannot be written", async () => {
    writeFileSync(join(home, ".arcane"), "a file where the store directory should be");
    await expect(startPresenceService({ port: "0" }, { env: {}, store: { home } })).rejects.toBeInstanceOf(ServeError);
  });
});

describe("runPresenceStatus and runPresenceStop in process", () => {
  it("status: 1 with nothing recorded, 0 with a live service, 1 with a refused token", async () => {
    const none = capture();
    expect(await runPresenceStatus(none.io, { home })).toBe(1);
    expect(none.lines).toEqual(["No presence channel is configured on this machine."]);

    service = await startPresenceService({ port: "0" }, { env: {}, store: { home } });
    const live = capture();
    expect(await runPresenceStatus(live.io, { home })).toBe(0);
    expect(live.lines[0]).toContain(service.url);

    writeFileSync(tokenPath({ home }), "another-capability\n");
    const refused = capture();
    expect(await runPresenceStatus(refused.io, { home })).toBe(1);
    expect(refused.lines[0]).toContain("refused");
  });

  it("status says not reachable when the recorded port answers nothing", async () => {
    service = await startPresenceService({ port: "0" }, { env: {}, store: { home } });
    const info = readServerInfo({ home })!;
    writeFileSync(serverInfoPath({ home }), JSON.stringify({ ...info, port: 1 }));
    const out = capture();
    expect(await runPresenceStatus(out.io, { home })).toBe(1);
    expect(out.lines[0]).toContain("not reachable");
  });

  it("stop: nothing recorded, a refused token keeps the record, an unreachable one is removed", async () => {
    const none = capture();
    expect(await runPresenceStop(none.io, { home })).toBe(0);
    expect(none.lines[0]).toContain("No presence service is running");

    service = await startPresenceService({ port: "0" }, { env: {}, store: { home } });
    writeFileSync(tokenPath({ home }), "another-capability\n");
    const refused = capture();
    expect(await runPresenceStop(refused.io, { home })).toBe(0);
    expect(refused.lines[0]).toContain("not stopped");
    expect(existsSync(serverInfoPath({ home }))).toBe(true);

    const info = readServerInfo({ home })!;
    writeFileSync(serverInfoPath({ home }), JSON.stringify({ ...info, port: 1 }));
    const stale = capture();
    expect(await runPresenceStop(stale.io, { home })).toBe(0);
    expect(stale.lines[0]).toContain("stale record");
    expect(existsSync(serverInfoPath({ home }))).toBe(false);
  });
});
