import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createServer, type Server, type Socket } from "node:net";
import { join } from "node:path";
import { runPresenceEnd, runPresenceReport } from "../src/commands/presence.js";
import { parseRequiredAction, sendEnd, sendReport, type ReporterDeps } from "../src/modules/presence/reporter.js";
import { PRESENCE_ENV, type SessionRecord } from "../src/modules/presence/types.js";
import { runGit as fixtureGit } from "./helpers/git-fixture.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { addWorktree, repoWithOneCommit } from "./helpers/state-fixtures.js";
import { BUILT_CLI_SKIP_REASON, resolveBuiltCli } from "./helpers/resolve-cli.js";
import { HEAVY_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { arcaneRepo, compilePresenceSchema, recordService, runSpell, spawnServe, startPresence, testToken, type RunningPresence } from "./helpers/presence.js";

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[presence-reporter.test.ts] ${BUILT_CLI_SKIP_REASON}`);

let parent: string;
let repo: string;
beforeAll(async () => {
  parent = await createFixtureDir("presence-reporter");
  repo = await arcaneRepo("presence-reporter-repo");
  fixtureGit(repo, ["remote", "add", "origin", "https://reporter:secret-credential@github.com/ordovica/geothermal-api.git"]);
}, VERY_HEAVY_TEST_TIMEOUT);
afterAll(async () => {
  await removeFixtureDir(repo);
  await removeFixtureDir(parent);
});

let home: string;
let svc: RunningPresence;
beforeEach(async () => {
  home = await createFixtureDir("presence-reporter-home");
  svc = await startPresence();
});
afterEach(async () => {
  await svc.close();
  await removeFixtureDir(home);
});

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (l: string) => out.push(l), err: (l: string) => err.push(l) }, out, err };
}

const deps = (extra: Partial<ReporterDeps> = {}): ReporterDeps => ({ home, env: {}, ...extra });

describe("the silence rule without a channel (PC-01, PC-05, PC-11)", () => {
  it("reads no git, no manifest and no roster when no service is recorded", async () => {
    const calls: string[] = [];
    const tripwires: ReporterDeps = deps({
      runGit: () => {
        calls.push("git");
        return Promise.reject(new Error("must not run"));
      },
      readManifest: () => {
        calls.push("manifest");
        return Promise.reject(new Error("must not run"));
      },
      resolveAgent: () => {
        calls.push("roster");
        return Promise.reject(new Error("must not run"));
      },
    });
    const { io, out, err } = capture();
    expect((await runPresenceReport(repo, { status: "working" }, io, tripwires)).outcome).toEqual({ kind: "silent" });
    expect((await runPresenceEnd(repo, io, tripwires)).outcome).toEqual({ kind: "silent" });
    expect({ calls, out, err }).toEqual({ calls: [], out: [], err: [] });
  });

  it.skipIf(!BIN)("the built CLI's report and end print nothing and exit 0 in a fixture repository", async () => {
    for (const args of [["presence", "report", "--status", "working", "--task", "seed"], ["presence", "end"]]) {
      const run = await runSpell(BIN!, args, { cwd: repo, home });
      expect(run).toEqual({ code: 0, stdout: "", stderr: "" });
    }
  }, VERY_HEAVY_TEST_TIMEOUT);
});

describe("reporting to a running service (PC-04, PC-05)", () => {
  it("creates a record that validates, updates it, then ends it", async () => {
    recordService(home, svc.port);
    const validate = await compilePresenceSchema();
    const first = await sendReport(repo, { status: "working", spell: "spell-implement", task: "WT-03" }, deps());
    expect(first.kind).toBe("sent");
    const record = (first as { record: SessionRecord }).record;
    expect(validate("record", record)).toEqual([]);
    expect(record.checkout).toEqual({ path: repo, branch: "main", linked_worktree: false });
    expect(record.repository.root).toBe(repo);
    expect(record.repository.name).toBe(repo.split(/[\\/]/).at(-1));
    expect(record.harness).toBe("other");
    expect(record.agent).toEqual({ ref: null, slug: null, name: null, origin: null, definition_revision: null, aliases: [] });

    const second = await sendReport(repo, { status: "waiting", requiredActions: ["Approve the migration — a schema change needs a human"] }, deps());
    const updated = (second as { record: SessionRecord }).record;
    expect(updated.session).toBe(record.session);
    expect(updated.task).toBe("WT-03");
    expect(updated.required_actions).toEqual([{ action: "Approve the migration", reason: "a schema change needs a human" }]);

    const ended = await sendEnd(repo, deps());
    expect((ended as { record: SessionRecord }).record.status).toBe("done");
    expect(svc.table.count()).toBe(0);
    expect(await sendEnd(repo, deps())).toEqual({ kind: "silent" });
  });

  it("strips userinfo from the remote (PC-12)", async () => {
    recordService(home, svc.port);
    const sent = await sendReport(repo, { status: "working" }, deps());
    const remote = (sent as { record: SessionRecord }).record.repository.remote;
    expect(remote).toEqual({ provider: "github", url: "https://github.com/ordovica/geothermal-api.git" });
    expect(JSON.stringify(svc.table.snapshot())).not.toContain("secret-credential");
  });

  it("a second worktree of the same repository is a second session with linked_worktree true", async () => {
    recordService(home, svc.port);
    const tree = addWorktree(repo, parent, "telemetry");
    await sendReport(repo, { status: "working" }, deps());
    const linked = (await sendReport(tree, { status: "working" }, deps())) as { record: SessionRecord };
    expect(svc.table.count()).toBe(2);
    expect(linked.record.checkout.linked_worktree).toBe(true);
    expect(linked.record.checkout.branch).toBe("telemetry");
    expect(linked.record.repository.root).toBe(repo);
  }, HEAVY_TEST_TIMEOUT);

  it("is silent outside a git repository and in a repository without an Arcane manifest", async () => {
    recordService(home, svc.port);
    const plain = await repoWithOneCommit("presence-reporter-plain");
    try {
      expect(await sendReport(parent, { status: "working" }, deps())).toEqual({ kind: "silent" });
      expect(await sendReport(plain, { status: "working" }, deps())).toEqual({ kind: "silent" });
      expect(svc.table.count()).toBe(0);
    } finally {
      await removeFixtureDir(plain);
    }
  });

  it("sends spell, task and message only when given, and an empty message as null (architecture D4)", async () => {
    recordService(home, svc.port);
    await sendReport(repo, { status: "working", task: "kept", message: "note" }, deps());
    const after = (await sendReport(repo, { status: "working", message: "" }, deps())) as { record: SessionRecord };
    expect(after.record.task).toBe("kept");
    expect(after.record.message).toBeNull();
  });
});

describe("refusals: one stderr line, exit 0 (PC-05, PC-06)", () => {
  it("a wrong token file gives one line that carries neither token nor task", async () => {
    recordService(home, svc.port, { token: "a-wrong-capability-value" });
    const { io, out, err } = capture();
    const run = await runPresenceReport(repo, { status: "working", task: "PRIVATE-TASK-TEXT" }, io, deps());
    expect(run.outcome?.kind).toBe("refused");
    expect(out).toEqual([]);
    expect(err).toHaveLength(1);
    expect(err[0]).toContain("HTTP 401");
    expect(err[0]).not.toContain("a-wrong-capability-value");
    expect(err[0]).not.toContain(testToken);
    expect(err[0]).not.toContain("PRIVATE-TASK-TEXT");
  });

  it("the variable wins over a correct file and the file never rescues it", async () => {
    recordService(home, svc.port);
    const { io, err } = capture();
    await runPresenceReport(repo, { status: "working" }, io, deps({ env: { [PRESENCE_ENV.token]: "not-the-capability" } }));
    expect(err).toHaveLength(1);
    expect(svc.table.count()).toBe(0);
  });

  it("a status the service refuses names the field", async () => {
    recordService(home, svc.port);
    const { io, err } = capture();
    await runPresenceReport(repo, { status: "thinking" }, io, deps());
    expect(err).toEqual(["spell presence report: the presence service refused it (HTTP 400, invalid_field status)."]);
  });
});

describe("the client only ever dials loopback (architecture D15; threat-model control 15)", () => {
  it("ignores a server.json url that names another host", async () => {
    recordService(home, svc.port, { url: "http://203.0.113.9:443" });
    expect((await sendReport(repo, { status: "working" }, deps())).kind).toBe("sent");
    expect(svc.table.count()).toBe(1);
  });

  it("makes no connection at all when the recorded pid is not alive", async () => {
    const dead = spawnSync(process.execPath, ["-e", ""]).pid;
    recordService(home, svc.port, { pid: dead });
    let connections = 0;
    svc.presence.server.on("connection", () => (connections += 1));
    expect(await sendReport(repo, { status: "working" }, deps())).toEqual({ kind: "silent" });
    expect(connections).toBe(0);
  });
});

describe.skipIf(!BIN)("the built CLI never exits non-zero and never blocks (PC-05; architecture D15)", () => {
  let hang: Server;
  const sockets: Socket[] = [];
  beforeAll(async () => {
    hang = createServer((s) => sockets.push(s));
    await new Promise<void>((r) => hang.listen(0, "127.0.0.1", r));
  });
  afterAll(async () => {
    for (const s of sockets) s.destroy();
    await new Promise<void>((r) => hang.close(() => r()));
  });

  it("no --status, an unknown option, and a refused status each exit 0 with at most one stderr line", async () => {
    const service = await spawnServe(BIN!, home);
    try {
      for (const args of [["presence", "report"], ["presence", "report", "--status", "working", "--bogus"], ["presence", "report", "--status", "thinking"], ["presence", "end", "--bogus"]]) {
        const run = await runSpell(BIN!, args, { cwd: repo, home });
        expect({ args, code: run.code }).toEqual({ args, code: 0 });
        expect(run.stdout).toBe("");
        expect(run.stderr.trim().split(/\r?\n/).filter(Boolean).length).toBeLessThanOrEqual(1);
      }
    } finally {
      service.child.kill("SIGKILL");
      await service.exited;
    }
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("a service that accepts and never answers does not hold report past its 2 s deadline", async () => {
    recordService(home, (hang.address() as { port: number }).port);
    const started = Date.now();
    const run = await runSpell(BIN!, ["presence", "report", "--status", "working"], { cwd: repo, home });
    const elapsed = Date.now() - started;
    expect(run.code).toBe(0);
    expect(run.stderr).toBe("");
    expect(elapsed).toBeLessThan(4_000);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("report --help and end --help offer no option that takes a token (threat-model control 4)", async () => {
    for (const sub of ["report", "end"]) {
      const help = await runSpell(BIN!, ["presence", sub, "--help"], { cwd: repo, home });
      expect(help.code).toBe(0);
      expect(help.stdout).not.toMatch(/--[a-z-]*token/i);
    }
  }, VERY_HEAVY_TEST_TIMEOUT);
});

describe("needs-you lines", () => {
  it("split on the first ' — ' into action and reason", () => {
    expect(parseRequiredAction("Merge PR 12 — merges are the operator's — always")).toEqual({ action: "Merge PR 12", reason: "merges are the operator's — always" });
    expect(parseRequiredAction("Answer the question")).toEqual({ action: "Answer the question", reason: null });
  });
});

describe("the report reaches the deadline path in process", () => {
  it("returns timedOut when the work outlasts the deadline", async () => {
    recordService(home, svc.port);
    const slow: ReporterDeps = deps({ readManifest: () => new Promise((r) => setTimeout(() => r({}), 300)) });
    const { io } = capture();
    const run = await runPresenceReport(join(repo), { status: "working" }, io, slow, 50);
    expect(run.timedOut).toBe(true);
  });
});
