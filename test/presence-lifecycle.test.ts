import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { BUILT_CLI_SKIP_REASON, resolveBuiltCli } from "./helpers/resolve-cli.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { httpRequest, loadPresenceFixture, presenceEnv, runSpell, spawnServe, type ServeProcess } from "./helpers/presence.js";
import { createServer } from "node:net";
import { PRESENCE_ENV } from "../src/modules/presence/types.js";

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[presence-lifecycle.test.ts] ${BUILT_CLI_SKIP_REASON}`);
const POSIX = process.platform !== "win32";

let home: string;
const running: ServeProcess[] = [];
beforeEach(async () => {
  home = await createFixtureDir("presence-lifecycle");
});
afterEach(async () => {
  for (const s of running.splice(0)) {
    if (s.child.exitCode === null) s.child.kill("SIGKILL");
    await s.exited;
  }
  await removeFixtureDir(home);
});

const store = () => join(home, ".arcane", "presence");
const mode = (p: string) => statSync(p).mode & 0o777;

async function serve(args?: string[]): Promise<ServeProcess> {
  const s = await spawnServe(BIN!, home, args);
  running.push(s);
  return s;
}

/** SIGTERM where signals exist; on Windows a signal kills outright, so `stop` cleans up instead. */
async function terminate(s: ServeProcess): Promise<void> {
  if (POSIX) {
    s.child.kill("SIGTERM");
    expect(await s.exited).toBe(0);
  } else {
    await runSpell(BIN!, ["presence", "stop"], { cwd: home, home });
    await s.exited;
  }
}

function nonLoopbackIPv4(): string | null {
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === "IPv4" && !a.internal) return a.address;
  }
  return null;
}

function connects(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const finish = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(2_000, () => finish(false));
  });
}

describe.skipIf(!BIN)("spell presence serve (PC-02, ARC-060 decision 2)", () => {
  it("writes exactly token and server.json, prints the URL once, and removes server.json on shutdown while keeping the token", async () => {
    const s = await serve();
    expect(readdirSync(store()).sort()).toEqual(["server.json", "token"]);
    if (POSIX) {
      expect(mode(store())).toBe(0o700);
      expect(mode(join(store(), "token"))).toBe(0o600);
      expect(mode(join(store(), "server.json"))).toBe(0o600);
    }
    expect(s.info.url).toBe(`http://127.0.0.1:${s.info.port}`);
    expect(s.stdout().split(s.info.url).length - 1).toBe(1);
    const token = readFileSync(join(store(), "token"), "utf8");
    expect(readFileSync(join(store(), "server.json"), "utf8")).not.toContain(token.trim());
    await terminate(s);
    expect(readdirSync(store())).toEqual(["token"]);
    expect(readFileSync(join(store(), "token"), "utf8")).toBe(token);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it.skipIf(!POSIX)("a SIGTERM that arrives as soon as server.json exists still shuts down cleanly", async () => {
    const child = spawn(process.execPath, [BIN!, "presence", "serve", "--port", "0"], { cwd: home, env: presenceEnv(home), windowsHide: true });
    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((r) => child.once("exit", (code, signal) => r({ code, signal })));
    const file = join(store(), "server.json");
    for (let i = 0; i < 3_000 && !existsSync(file); i += 1) await new Promise((r) => setTimeout(r, 2));
    expect(existsSync(file)).toBe(true);
    child.kill("SIGTERM");
    expect(await exited).toEqual({ code: 0, signal: null });
    expect(existsSync(file)).toBe(false);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("binds 127.0.0.1 only: a non-loopback address of this machine does not connect (threat-model controls 1 and 13)", async () => {
    const s = await serve();
    expect(await connects("127.0.0.1", s.info.port)).toBe(true);
    const other = nonLoopbackIPv4();
    if (other === null) {
      console.warn("[presence-lifecycle] no non-loopback IPv4 address on this machine; the refusal half is skipped");
      return;
    }
    expect(await connects(other, s.info.port)).toBe(false);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("lists no host, bind or token option", async () => {
    const help = await runSpell(BIN!, ["presence", "serve", "--help"], { cwd: home, home });
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("--port");
    expect(help.stdout).not.toMatch(/--(host|bind|address|token)/i);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("a second serve on the same port exits 1 naming it, and --rotate there leaves the token untouched (architecture D13)", async () => {
    const s = await serve();
    const before = readFileSync(join(store(), "token"), "utf8");
    for (const extra of [[], ["--rotate"]]) {
      const second = await runSpell(BIN!, ["presence", "serve", "--port", String(s.info.port), ...extra], { cwd: home, home });
      expect(second.code).toBe(1);
      expect(second.stderr).toContain(String(s.info.port));
      expect(readFileSync(join(store(), "token"), "utf8")).toBe(before);
    }
    expect(JSON.parse(readFileSync(join(store(), "server.json"), "utf8"))).toMatchObject({ pid: s.info.pid });
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("uses ARCANE_PRESENCE_PORT when --port is absent, lets --port win, and refuses a non-numeric port", async () => {
    const bad = await runSpell(BIN!, ["presence", "serve", "--port", "abc"], { cwd: home, home });
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain("whole number");
    const badEnv = await runSpell(BIN!, ["presence", "serve"], { cwd: home, home, env: { [PRESENCE_ENV.port]: "99999" } });
    expect(badEnv.code).toBe(1);

    const free = await new Promise<number>((resolve) => {
      const probe = createServer();
      probe.listen(0, "127.0.0.1", () => {
        const port = (probe.address() as { port: number }).port;
        probe.close(() => resolve(port));
      });
    });
    const fromEnv = await spawnServe(BIN!, home, [], { env: { [PRESENCE_ENV.port]: String(free) } });
    running.push(fromEnv);
    expect(fromEnv.info.port).toBe(free);
    await terminate(fromEnv);

    const flagWins = await spawnServe(BIN!, home, ["--port", "0"], { env: { [PRESENCE_ENV.port]: "99999" } });
    running.push(flagWins);
    expect(flagWins.info.port).toBeGreaterThan(0);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("--rotate replaces the token and the previous one is refused", async () => {
    const first = await serve();
    const old = readFileSync(join(store(), "token"), "utf8").trim();
    await terminate(first);
    const second = await serve(["--port", "0", "--rotate"]);
    const fresh = readFileSync(join(store(), "token"), "utf8").trim();
    expect(fresh).not.toBe(old);
    expect((await httpRequest(second.info.port, { path: "/v0/health", token: old })).status).toBe(401);
    expect((await httpRequest(second.info.port, { path: "/v0/health", token: fresh })).status).toBe(200);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("a restarted service starts empty (PC-07; threat-model control 7)", async () => {
    const first = await serve();
    const token = readFileSync(join(store(), "token"), "utf8").trim();
    const report = await loadPresenceFixture<unknown>("report.full.json");
    expect((await httpRequest(first.info.port, { method: "POST", path: "/v0/sessions/report", token, body: JSON.stringify(report) })).status).toBe(201);
    await runSpell(BIN!, ["presence", "stop"], { cwd: home, home });
    await first.exited;
    const second = await serve();
    const res = await httpRequest(second.info.port, { path: "/v0/sessions", token });
    expect((JSON.parse(res.body) as { sessions: unknown[] }).sessions).toEqual([]);
  }, VERY_HEAVY_TEST_TIMEOUT);
});

describe.skipIf(!BIN)("spell presence status and stop (PC-02, architecture D14)", () => {
  it("status exits 1 before serve and 0 while it runs, with URL, pid, version and session count", async () => {
    const before = await runSpell(BIN!, ["presence", "status"], { cwd: home, home });
    expect(before.code).toBe(1);
    expect(before.stdout).toContain("No presence channel is configured");
    const s = await serve();
    const during = await runSpell(BIN!, ["presence", "status"], { cwd: home, home });
    expect(during.code).toBe(0);
    expect(during.stdout).toContain(s.info.url);
    expect(during.stdout).toContain(String(s.info.pid));
    expect(during.stdout).toMatch(/version: +\d+\.\d+\.\d+/);
    expect(during.stdout).toMatch(/sessions: +0/);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("status exits 1 with the token refused when ARCANE_PRESENCE_TOKEN is wrong", async () => {
    await serve();
    const wrong = await runSpell(BIN!, ["presence", "status"], { cwd: home, home, env: { [PRESENCE_ENV.token]: "not-the-capability" } });
    expect(wrong.code).toBe(1);
    expect(wrong.stdout).toContain("refused");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("stop ends a running service and exits 0; stop with nothing recorded exits 0", async () => {
    const s = await serve();
    const stopped = await runSpell(BIN!, ["presence", "stop"], { cwd: home, home });
    expect(stopped.code).toBe(0);
    expect(stopped.stdout).toContain(`pid ${s.info.pid}`);
    await s.exited;
    expect(existsSync(join(store(), "server.json"))).toBe(false);
    const again = await runSpell(BIN!, ["presence", "stop"], { cwd: home, home });
    expect(again.code).toBe(0);
    expect(again.stdout).toContain("No presence service is running");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("stop signals nothing when the recorded pid is alive but its port answers nothing, and removes the stale record", async () => {
    const s = await serve();
    // A separate, live bystander process: if stop signalled the recorded pid, this would die.
    const bystander = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { windowsHide: true });
    const bystanderExit = new Promise<void>((r) => bystander.once("exit", () => r()));
    try {
      writeFileSync(join(store(), "server.json"), JSON.stringify({ ...s.info, pid: bystander.pid, port: 1 }));
      const res = await runSpell(BIN!, ["presence", "stop"], { cwd: home, home });
      expect(res.code).toBe(0);
      expect(res.stdout).toContain("stale record");
      expect(existsSync(join(store(), "server.json"))).toBe(false);
      expect(bystander.exitCode).toBeNull();
      expect(bystander.signalCode).toBeNull();
      expect(s.child.exitCode).toBeNull();
    } finally {
      bystander.kill("SIGKILL");
      await bystanderExit;
    }
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("a second serve on another port is refused while the recorded service answers, and leaves its token and record alone (review of PR #435)", async () => {
    const s = await serve();
    const token = readFileSync(join(store(), "token"), "utf8");
    const record = readFileSync(join(store(), "server.json"), "utf8");
    const second = await runSpell(BIN!, ["presence", "serve", "--port", "0", "--rotate"], { cwd: home, home });
    expect(second.code).toBe(1);
    expect(second.stderr).toContain(`pid ${s.info.pid}`);
    expect(readFileSync(join(store(), "token"), "utf8")).toBe(token);
    expect(readFileSync(join(store(), "server.json"), "utf8")).toBe(record);
  }, VERY_HEAVY_TEST_TIMEOUT);
});
