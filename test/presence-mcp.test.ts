import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { PassThrough } from "node:stream";
import { join } from "node:path";
import { LEGACY_VERSIONS, MODERN_VERSIONS, NOT_CONFIGURED_TEXT, SERVER_NAME, serveMcp } from "../src/modules/presence/mcp.js";
import type { SessionRecord } from "../src/modules/presence/types.js";
import { BUILT_CLI_SKIP_REASON, resolveBuiltCli } from "./helpers/resolve-cli.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { arcaneRepo, openFeed, presenceEnv, recordService, spawnServe, startPresence, type RunningPresence, type ServeProcess } from "./helpers/presence.js";

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[presence-mcp.test.ts] ${BUILT_CLI_SKIP_REASON}`);

interface Rpc {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

/** A line-oriented JSON-RPC client over any pair of streams. */
class Client {
  readonly lines: string[] = [];
  private buffer = "";
  private waiters = new Map<string | number | null, (m: Rpc) => void>();
  private next = 1;
  constructor(
    private readonly input: NodeJS.WritableStream,
    output: NodeJS.ReadableStream,
  ) {
    output.on("data", (chunk: Buffer | string) => {
      this.buffer += chunk.toString();
      let at: number;
      while ((at = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, at);
        this.buffer = this.buffer.slice(at + 1);
        this.lines.push(line);
        const message = JSON.parse(line) as Rpc;
        this.waiters.get(message.id)?.(message);
        this.waiters.delete(message.id);
      }
    });
  }
  raw(line: string, id: string | number | null): Promise<Rpc> {
    const reply = new Promise<Rpc>((resolve) => this.waiters.set(id, resolve));
    this.input.write(`${line}\n`);
    return reply;
  }
  call(method: string, params: Record<string, unknown> = {}, meta?: string): Promise<Rpc> {
    const id = this.next++;
    const body = meta === undefined ? params : { ...params, _meta: { "io.modelcontextprotocol/protocolVersion": meta } };
    return this.raw(JSON.stringify({ jsonrpc: "2.0", id, method, params: body }), id);
  }
  notify(method: string): void {
    this.input.write(`${JSON.stringify({ jsonrpc: "2.0", method })}\n`);
  }
}

function contentText(r: Rpc): string {
  return ((r.result?.["content"] as Array<{ text: string }>)[0]?.text) ?? "";
}

describe.skipIf(!BIN)("spell presence mcp over stdio, against the built CLI (PC-09)", () => {
  let home: string;
  let repo: string;
  let service: ServeProcess | undefined;
  let child: ChildProcessWithoutNullStreams;
  let client: Client;

  beforeAll(async () => {
    repo = await arcaneRepo("presence-mcp-repo");
  }, VERY_HEAVY_TEST_TIMEOUT);
  afterAll(async () => {
    await removeFixtureDir(repo);
  });
  beforeEach(async () => {
    home = await createFixtureDir("presence-mcp-home");
  });
  afterEach(async () => {
    child.stdin.end();
    await new Promise((r) => child.once("exit", r));
    if (service !== undefined) {
      service.child.kill("SIGKILL");
      await service.exited;
      service = undefined;
    }
    await removeFixtureDir(home);
  });

  function start(): void {
    child = spawn(process.execPath, [BIN!, "presence", "mcp"], { cwd: repo, env: presenceEnv(home), windowsHide: true });
    client = new Client(child.stdin, child.stdout);
  }

  it("drives initialize, both tools and both resources with a running service, and a subscriber sees the tools' events", async () => {
    service = await spawnServe(BIN!, home);
    const token = readFileSync(join(home, ".arcane", "presence", "token"), "utf8").trim();
    const feed = await openFeed(service.info.port, token);
    await feed.waitFor(1);
    start();

    const init = await client.call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } });
    expect(init.result).toEqual({ protocolVersion: "2025-06-18", capabilities: { tools: {}, resources: {} }, serverInfo: { name: SERVER_NAME, version: expect.any(String) as string } });
    client.notify("notifications/initialized");

    const tools = await client.call("tools/list");
    expect((tools.result?.["tools"] as Array<{ name: string }>).map((t) => t.name)).toEqual(["presence_report", "presence_end"]);

    const reported = await client.call("tools/call", { name: "presence_report", arguments: { status: "waiting", task: "WT-03", needs_you: ["Approve the migration — a schema change"] } });
    expect(reported.result?.["isError"]).toBe(false);
    const record = reported.result?.["structuredContent"] as SessionRecord;
    expect(record.needs_you).toEqual([{ action: "Approve the migration", reason: "a schema change" }]);

    const resources = await client.call("resources/list");
    expect((resources.result?.["resources"] as Array<{ uri: string }>).map((r) => r.uri)).toEqual(["arcane://presence/sessions", "arcane://presence/capabilities"]);
    const sessions = await client.call("resources/read", { uri: "arcane://presence/sessions" });
    const doc = JSON.parse((sessions.result?.["contents"] as Array<{ text: string }>)[0].text) as { sessions: SessionRecord[] };
    expect(doc.sessions.map((s) => s.session)).toEqual([record.session]);
    const caps = await client.call("resources/read", { uri: "arcane://presence/capabilities" });
    expect(JSON.parse((caps.result?.["contents"] as Array<{ text: string }>)[0].text)).toEqual({ observe: true, actions: [] });

    const ended = await client.call("tools/call", { name: "presence_end", arguments: {} });
    expect(contentText(ended)).toContain(record.session);
    const events = await feed.waitFor(3);
    expect(events.slice(1).map((e) => e.event)).toEqual(["session.started", "session.ended"]);
    feed.close();

    for (const line of client.lines) {
      const parsed = JSON.parse(line) as Rpc;
      expect(parsed.jsonrpc).toBe("2.0");
      expect("result" in parsed || "error" in parsed).toBe(true);
    }
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("answers 'not configured' as a plain result for both tools and both resources without a service, and writes no file", async () => {
    const before = readdirSync(home);
    start();
    await client.call("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "0" } });
    for (const [method, params] of [
      ["tools/call", { name: "presence_report", arguments: { status: "working" } }],
      ["tools/call", { name: "presence_end", arguments: {} }],
    ] as const) {
      const r = await client.call(method, params);
      expect(r.error).toBeUndefined();
      expect(contentText(r)).toBe(NOT_CONFIGURED_TEXT);
    }
    for (const uri of ["arcane://presence/sessions", "arcane://presence/capabilities"]) {
      const r = await client.call("resources/read", { uri });
      expect(r.error).toBeUndefined();
      expect((r.result?.["contents"] as Array<{ text: string }>)[0]?.text).toBe(NOT_CONFIGURED_TEXT);
    }
    expect(readdirSync(home)).toEqual(before);
    expect(statSync(repo).isDirectory()).toBe(true);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("answers -32601 to an unknown method and -32700 to a malformed line, and keeps serving", async () => {
    start();
    expect((await client.call("prompts/list")).error?.code).toBe(-32601);
    expect((await client.raw("{not json", null)).error?.code).toBe(-32700);
    expect((await client.call("ping")).result).toEqual({});
  }, VERY_HEAVY_TEST_TIMEOUT);
});

describe("the MCP server in process (protocol details, PC-09, PC-10)", () => {
  let svc: RunningPresence;
  let home: string;
  let repo: string;
  let input: PassThrough;
  let output: PassThrough;
  let done: Promise<void>;
  let client: Client;

  beforeAll(async () => {
    repo = await arcaneRepo("presence-mcp-inproc");
  }, VERY_HEAVY_TEST_TIMEOUT);
  afterAll(async () => {
    await removeFixtureDir(repo);
  });
  beforeEach(async () => {
    svc = await startPresence();
    home = await createFixtureDir("presence-mcp-inproc-home");
    recordService(home, svc.port);
    input = new PassThrough();
    output = new PassThrough();
    const logs: string[] = [];
    done = serveMcp({ input, output, version: "0.0.0-test", cwd: repo, deps: { home, env: {} }, log: (l) => logs.push(l) });
    client = new Client(input, output);
  });
  afterEach(async () => {
    input.end();
    await done;
    await svc.close();
    await removeFixtureDir(home);
  });

  it("answers an unsupported legacy version with its newest legacy version", async () => {
    const r = await client.call("initialize", { protocolVersion: "2023-01-01", capabilities: {} });
    expect(r.result?.["protocolVersion"]).toBe(LEGACY_VERSIONS[0]);
  });

  it("serves a modern request statelessly, with resultType complete, and refuses an unsupported version with -32022", async () => {
    const modern = MODERN_VERSIONS[0];
    const discover = await client.call("server/discover", {}, modern);
    expect(discover.result).toMatchObject({ resultType: "complete", supportedVersions: [...MODERN_VERSIONS, ...LEGACY_VERSIONS], capabilities: { tools: {}, resources: {} } });
    const tools = await client.call("tools/list", {}, modern);
    expect(tools.result?.["resultType"]).toBe("complete");
    const bad = await client.call("tools/list", {}, "1900-01-01");
    expect(bad.error).toEqual({ code: -32022, message: "Unsupported protocol version", data: { supported: [...MODERN_VERSIONS, ...LEGACY_VERSIONS], requested: "1900-01-01" } });
  });

  it("reports through the service, and reports a refusal as a tool error", async () => {
    const ok = await client.call("tools/call", { name: "presence_report", arguments: { status: "working", spell: "spell-implement", message: "" } });
    expect((ok.result?.["structuredContent"] as SessionRecord).spell).toBe("spell-implement");
    expect(svc.table.count()).toBe(1);
    const refused = await client.call("tools/call", { name: "presence_report", arguments: { status: "thinking" } });
    expect(refused.result?.["isError"]).toBe(true);
    expect(contentText(refused)).toContain("HTTP 400");
    const missing = await client.call("tools/call", { name: "presence_report", arguments: {} });
    expect(missing.result?.["isError"]).toBe(true);
    const badNeeds = await client.call("tools/call", { name: "presence_report", arguments: { status: "working", needs_you: [1] } });
    expect(badNeeds.result?.["isError"]).toBe(true);
    const badType = await client.call("tools/call", { name: "presence_report", arguments: { status: "working", task: 7 } });
    expect(badType.error).toBeUndefined();
    expect(badType.result?.["isError"]).toBe(true);
  });

  it("is silent-but-truthful outside a repository, and ending with no session says so", async () => {
    const outside = await client.call("tools/call", { name: "presence_report", arguments: { status: "working", cwd: home } });
    expect(contentText(outside)).toContain("Nothing was reported");
    const end = await client.call("tools/call", { name: "presence_end", arguments: {} });
    expect(contentText(end)).toContain("No session was open");
  });

  it("refuses an unknown tool and an unknown resource with -32602, and an invalid request with -32600", async () => {
    expect((await client.call("tools/call", { name: "steer_session", arguments: {} })).error?.code).toBe(-32602);
    expect((await client.call("resources/read", { uri: "arcane://presence/elsewhere" })).error).toMatchObject({ code: -32602, message: "Resource not found" });
    expect((await client.raw(JSON.stringify({ jsonrpc: "1.0", id: 9, method: "ping" }), 9)).error?.code).toBe(-32600);
    expect((await client.raw(JSON.stringify({ jsonrpc: "2.0", id: { a: 1 }, method: "ping" }), null)).error?.code).toBe(-32600);
  });

  it("serves a legacy version named in _meta as legacy, without resultType (review of PR #435)", async () => {
    const r = await client.call("tools/list", {}, LEGACY_VERSIONS[1]);
    expect(r.result?.["resultType"]).toBeUndefined();
    expect(r.result?.["tools"]).toBeDefined();
  });
});
