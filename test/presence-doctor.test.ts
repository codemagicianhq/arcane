import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { checkPresenceService, fixPresenceService } from "../src/commands/doctor.js";
import { presenceDir, serverInfoPath, tokenPath } from "../src/modules/presence/store.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { recordService, startPresence, type RunningPresence } from "./helpers/presence.js";

// PRD PC-20, architecture D27: the `spell doctor` row for the presence service.

/** A pid no process holds: the largest a pid can be on the platforms in CI, never handed out. */
const DEAD_PID = 2 ** 22 + 12_345;
const posix = process.platform !== "win32";

let home: string;
let svc: RunningPresence | undefined;
beforeEach(async () => {
  home = await createFixtureDir("presence-doctor");
});
afterEach(async () => {
  await svc?.close();
  svc = undefined;
  await removeFixtureDir(home);
});

describe("checkPresenceService (PC-20)", () => {
  it("is a silent, non-blocking pass when there is no presence directory", async () => {
    const row = await checkPresenceService({ home, env: {} });
    expect(row).toMatchObject({ name: "Presence service (ARC-060)", passed: true, blocking: false });
    expect(existsSync(presenceDir({ home }))).toBe(false);
  });

  it("passes with the URL when the recorded service answers the token", async () => {
    svc = await startPresence();
    recordService(home, svc.port);
    const row = await checkPresenceService({ home, env: {} });
    expect(row).toMatchObject({ passed: true, blocking: false });
    expect(row.message).toContain(`reachable at http://127.0.0.1:${svc.port}`);
    expect(row.message).toContain("v0.0.0-test, 0 session(s)");
  });

  it("warns about a server.json whose process no longer runs, and --fix removes only that file", async () => {
    recordService(home, 1, { pid: DEAD_PID });
    const token = readFileSync(tokenPath({ home }), "utf8");
    const row = await checkPresenceService({ home, env: {} });
    expect(row).toMatchObject({ passed: false, blocking: false });
    expect(row.message).toContain(`names pid ${DEAD_PID}, which is not running`);
    expect(row.message).toContain("spell doctor --fix");

    expect(fixPresenceService({ home })).toBe(serverInfoPath({ home }));
    expect(existsSync(serverInfoPath({ home }))).toBe(false);
    expect(readFileSync(tokenPath({ home }), "utf8")).toBe(token);
    expect((await checkPresenceService({ home, env: {} })).passed).toBe(true);
  });

  it("--fix leaves a live record and a file it cannot read", async () => {
    recordService(home, 1);
    expect(fixPresenceService({ home })).toBeNull();
    expect(existsSync(serverInfoPath({ home }))).toBe(true);

    writeFileSync(serverInfoPath({ home }), "{ not a record");
    expect(fixPresenceService({ home })).toBeNull();
    expect(existsSync(serverInfoPath({ home }))).toBe(true);
    const row = await checkPresenceService({ home, env: {} });
    expect(row).toMatchObject({ passed: false, blocking: false });
    expect(row.message).toContain("is not a record this CLI wrote");
  });

  it("warns when a live pid's port does not answer, or refuses the token", async () => {
    recordService(home, 1);
    const silent = await checkPresenceService({ home, env: {}, pidAlive: () => true });
    expect(silent).toMatchObject({ passed: false, blocking: false });
    expect(silent.message).toContain("not reachable");

    svc = await startPresence();
    recordService(home, svc.port, { token: "another-capability" });
    const refused = await checkPresenceService({ home, env: {} });
    expect(refused.message).toContain("refused this machine's token");
  });

  it("is a pass while the store exists but no service is recorded", async () => {
    mkdirSync(presenceDir({ home }), { recursive: true, mode: 0o700 });
    const row = await checkPresenceService({ home, env: {} });
    expect(row).toMatchObject({ passed: true, blocking: false });
    expect(row.message).toContain("not running");
  });

  it.skipIf(!posix)("warns, naming the mode, when the token file is readable by others (POSIX)", async () => {
    svc = await startPresence();
    recordService(home, svc.port);
    chmodSync(tokenPath({ home }), 0o644);
    const row = await checkPresenceService({ home, env: {} });
    expect(row).toMatchObject({ passed: false, blocking: false });
    expect(row.message).toContain("has mode 0644");
    expect(row.message).toContain("reachable at");

    const stopped = await createFixtureDir("presence-doctor-mode");
    try {
      mkdirSync(presenceDir({ home: stopped }), { recursive: true });
      writeFileSync(tokenPath({ home: stopped }), "t\n", { mode: 0o640 });
      chmodSync(tokenPath({ home: stopped }), 0o640);
      const quiet = await checkPresenceService({ home: stopped, env: {} });
      expect(quiet.passed).toBe(false);
      expect(quiet.message).toMatch(/^not running; the token file .* has mode 0640/);
    } finally {
      await removeFixtureDir(stopped);
    }
  });

  it("does not read the token's mode on Windows, where icacls restricts it", async () => {
    mkdirSync(presenceDir({ home }), { recursive: true });
    writeFileSync(tokenPath({ home }), "t\n");
    if (posix) chmodSync(tokenPath({ home }), 0o644);
    const row = await checkPresenceService({ home, env: {}, platform: "win32" });
    expect(row.passed).toBe(true);
  });
});
