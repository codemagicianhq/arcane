/**
 * Control evidence for the presence service (features/presence-channel
 * architecture, "Control Traceability"; the threat-model section of PS-14).
 * One describe block per control this file proves, named by its number and
 * surface. The others are proved where their code is tested:
 *
 * - 2 Authentication: presence-server.test.ts ("authentication runs first").
 * - 3 Token storage: presence-store.test.ts (modes, the Windows ACL, refusal on a failed restriction).
 * - 5 Browser and DNS-rebinding reach: presence-server.test.ts and presence-events.test.ts.
 * - 7 State persistence: presence-sessions.test.ts (clocks) and presence-lifecycle.test.ts (restart).
 * - 9 Disclosure to token holders: every read route needs the token (2, above); an accepted risk.
 * - 10 Request limits: presence-validate.test.ts, presence-server.test.ts, presence-events.test.ts.
 * - 13 Remote access: control 1 below, and the README's remote-access paragraph.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { readdirSync, readFileSync, statSync, type Stats } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { PRESENCE_ROUTES } from "../src/modules/presence/server.js";
import { PRESENCE_TOOLS } from "../src/modules/presence/mcp.js";
import { runGit as fixtureGit } from "./helpers/git-fixture.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { addWorktree } from "./helpers/state-fixtures.js";
import { BUILT_CLI_SKIP_REASON, resolveBuiltCli } from "./helpers/resolve-cli.js";
import { TIMING_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { arcaneRepo, presenceEnv, runSpell } from "./helpers/presence.js";

const ROOT = process.cwd();
const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[presence-controls.test.ts] ${BUILT_CLI_SKIP_REASON}`);

const SERVICE_SIDE = ["server.ts", "sessions.ts", "validate.ts", "auth.ts", "log.ts"];
const FORBIDDEN_IMPORTS = ["node:child_process", "node:https", "node:net", "../git.js", "../manifest.js", "../agents.js", "../state/agents.js", "./client.js", "./reporter.js", "./agent.js"];

function importsOf(source: string): string[] {
  return [...source.matchAll(/from "([^"]+)";/g)].map((m) => m[1] ?? "");
}

describe("controls 11 and 15 — execution, reads and data leaving the machine", () => {
  // Manual check: code review of the release; `lsof -p <pid> -i` shows the listener only.
  it("the service-side modules import nothing that runs a process, reads a repository or dials out", async () => {
    for (const file of SERVICE_SIDE) {
      const imports = importsOf(await readFile(join(ROOT, "src/modules/presence", file), "utf8"));
      const forbidden = imports.filter((i) => FORBIDDEN_IMPORTS.includes(i));
      expect({ file, forbidden }).toEqual({ file, forbidden: [] });
    }
  });

  it("only the sign-in redirect and the presence server create a listener anywhere in src/", async () => {
    const sites: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "assets") walk(path);
        } else if (entry.name.endsWith(".ts") && readFileSync(path, "utf8").includes("createServer(")) {
          sites.push(relative(ROOT, path).replace(/\\/g, "/"));
        }
      }
    };
    walk(join(ROOT, "src"));
    expect(sites.sort()).toEqual(["src/modules/oidc.ts", "src/modules/presence/server.ts"]);
  });
});

describe("control 8 — forged or poisoned presence (accepted risk; its bound)", () => {
  // Manual check: `tools/list` in a client answers only presence_report and presence_end.
  it("six routes and two tools, none of which acts", () => {
    expect(PRESENCE_ROUTES.map(([m, p]) => `${m} ${p}`)).toEqual([
      "GET /v0/health",
      "POST /v0/sessions/report",
      "POST /v0/sessions/end",
      "GET /v0/sessions",
      "GET /v0/sessions/{session}",
      "GET /v0/events",
    ]);
    expect(PRESENCE_TOOLS.map((t) => t.name)).toEqual(["presence_report", "presence_end"]);
  });
});

describe("control 14 — git hooks", () => {
  // Manual check: grep -rn presence .husky .arcane/hooks in each repository after the update that ships it.
  it("no hook directory, hook file or hook installer mentions presence", async () => {
    const files: string[] = [];
    const collect = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) collect(path);
        else files.push(path);
      }
    };
    collect(join(ROOT, ".husky"));
    const findHooks = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (!entry.isDirectory()) continue;
        if (entry.name === "hooks") collect(path);
        else findHooks(path);
      }
    };
    findHooks(join(ROOT, "src", "assets"));
    files.push(join(ROOT, "src/modules/push-safety.ts"), join(ROOT, "src/modules/secrets-scan.ts"));
    for (const file of files) {
      const text = await readFile(file, "utf8");
      expect({ file: relative(ROOT, file), mentions: /presence/i.test(text) }).toEqual({ file: relative(ROOT, file), mentions: false });
    }
  });
});

describe.skipIf(!BIN)("controls 1, 4, 6 and 12 — against the built CLI", () => {
  let home: string;
  let parent: string;
  let repo: string;
  let tree: string;

  beforeAll(async () => {
    home = await createFixtureDir("presence-controls-home");
    parent = await createFixtureDir("presence-controls-parent");
    repo = await arcaneRepo("presence-controls-repo");
    tree = addWorktree(repo, parent, "second");
  }, VERY_HEAVY_TEST_TIMEOUT);
  afterAll(async () => {
    await removeFixtureDir(repo);
    await removeFixtureDir(parent);
    await removeFixtureDir(home);
  });

  // Manual check: `spell presence --help` and each subcommand's help list no token option.
  it("controls 1 and 4: no help text offers a token, host or bind option", async () => {
    for (const args of [["presence"], ...["serve", "status", "stop", "report", "end", "mcp"].map((s) => ["presence", s])]) {
      const help = await runSpell(BIN!, [...args, "--help"], { cwd: home, home });
      expect(help.code).toBe(0);
      const options = [...help.stdout.matchAll(/--([a-z][a-z-]*)/g)].map((m) => m[1] ?? "");
      expect({ args, bad: options.filter((o) => /token|host|bind/.test(o)) }).toEqual({ args, bad: [] });
    }
  }, VERY_HEAVY_TEST_TIMEOUT);

  // Manual check: a filesystem watch during a session; `git status` clean afterwards.
  // Manual check (12): read `serve`'s output after a run; no task, message, path or token.
  it("controls 6 and 12: a full cycle writes only the store, and the service's output carries no payload, path or token", async () => {
    type Listing = Map<string, string>;
    const list = (base: string): Listing => {
      const out: Listing = new Map();
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name);
          const st: Stats = statSync(path);
          out.set(relative(base, path).replace(/\\/g, "/"), entry.isDirectory() ? "dir" : `${st.size}:${st.mtimeMs}`);
          if (entry.isDirectory()) walk(path);
        }
      };
      walk(base);
      return out;
    };
    const diff = (a: Listing, b: Listing) => [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k)).sort();

    const before = { home: list(home), repo: list(repo), tree: list(tree) };
    const marker = "PRIVATE-MARKER-tidewright-build-02";

    const serve = spawn(process.execPath, [BIN!, "presence", "serve", "--port", "0"], { cwd: home, env: presenceEnv(home), windowsHide: true });
    let output = "";
    serve.stdout.on("data", (c: Buffer) => (output += c.toString("utf8")));
    serve.stderr.on("data", (c: Buffer) => (output += c.toString("utf8")));
    const exited = new Promise<number | null>((r) => serve.on("exit", (code) => r(code)));
    for (let i = 0; i < 200 && !output.includes("listening"); i += 1) await new Promise((r) => setTimeout(r, 25));
    expect(output).toContain("listening");

    for (const cwd of [repo, tree]) {
      await runSpell(BIN!, ["presence", "report", "--status", "working", "--spell", "spell-implement", "--task", `${marker} task`], { cwd, home });
      await runSpell(BIN!, ["presence", "report", "--status", "waiting", "--required-action", `${marker} action — ${marker} reason`], { cwd, home });
      await runSpell(BIN!, ["presence", "report", "--status", "working", "--message", `${marker} message`], { cwd, home });
    }
    const during = { home: list(home) };
    expect(diff(before.home, during.home)).toEqual([".arcane", ".arcane/presence", ".arcane/presence/server.json", ".arcane/presence/token"]);

    for (const cwd of [repo, tree]) await runSpell(BIN!, ["presence", "end"], { cwd, home });
    const stop = await runSpell(BIN!, ["presence", "stop"], { cwd: home, home });
    expect(stop.code).toBe(0);
    await exited;
    const token = readFileSync(join(home, ".arcane", "presence", "token"), "utf8").trim();

    expect(diff(before.home, list(home))).toEqual([".arcane", ".arcane/presence", ".arcane/presence/token"]);
    expect(diff(before.repo, list(repo))).toEqual([]);
    expect(diff(before.tree, list(tree))).toEqual([]);
    for (const cwd of [repo, tree]) expect(fixtureGit(cwd, ["status", "--porcelain"]).trim()).toBe("");

    expect(output).not.toContain(marker);
    expect(output).not.toContain(token);
    expect(output).not.toContain(repo);
    expect(output).not.toContain(tree);
    expect(output).toMatch(/presence session\.started arcane:session:[0-9a-f-]{36} working/);
    expect(output).toContain("session.action_required");
    expect(output).toContain("session.ended");
  }, TIMING_TEST_TIMEOUT);
});
