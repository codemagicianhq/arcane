import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatAge, renderSessionsTable, runPresenceSessions, runPresenceStatus, type PresenceIo } from "../src/commands/presence.js";
import { readServerInfo, serverInfoPath, tokenPath } from "../src/modules/presence/store.js";
import type { ReportBody, SnapshotDocument } from "../src/modules/presence/types.js";
import { BUILT_CLI_SKIP_REASON, resolveBuiltCli } from "./helpers/resolve-cli.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import {
  arcaneRepo,
  compilePresenceSchema,
  httpRequest,
  loadPresenceFixture,
  recordService,
  runSpell,
  spawnServe,
  startPresence,
  type RunningPresence,
  type ServeProcess,
} from "./helpers/presence.js";

// PRD PC-17, architecture D24: `spell presence sessions [--json]`.

const SNAPSHOT_DIR = join(process.cwd(), "test", "__snapshots__", "presence");
const T0 = Date.parse("2026-11-12T15:00:00.000Z");

function capture(): { io: PresenceIo; lines: string[] } {
  const lines: string[] = [];
  return { io: { out: (l) => lines.push(l), err: (l) => lines.push(`stderr: ${l}`) }, lines };
}

describe("spell presence sessions in process (PC-17)", () => {
  let ms = T0;
  let svc: RunningPresence;
  let home: string;

  beforeEach(async () => {
    ms = T0;
    svc = await startPresence({ now: () => ms });
    home = await createFixtureDir("presence-sessions-cmd");
    recordService(home, svc.port);
  });
  afterEach(async () => {
    await svc.close();
    await removeFixtureDir(home);
  });

  /** Two sessions through the real service: one stale with a Needs you line, one working. */
  async function twoSessions(): Promise<void> {
    const waiting = await loadPresenceFixture<ReportBody>("report.full.json");
    expect((await httpRequest(svc.port, { method: "POST", path: "/v0/sessions/report", token: svc.token, body: JSON.stringify(waiting) })).status).toBe(201);
    ms += 100_000;
    const working: ReportBody = {
      ...waiting,
      status: "working",
      harness: "codex",
      agent: { ...waiting.agent, ref: null, slug: "main", name: null, definition_revision: null },
      checkout: { path: `${waiting.repository.root}.worktrees/dashboard`, branch: "sessions/2026-11-12-dashboard", linked_worktree: true },
      spell: "spell-implement",
      task: "PS-17: the sessions table",
      required_actions: [],
    };
    expect((await httpRequest(svc.port, { method: "POST", path: "/v0/sessions/report", token: svc.token, body: JSON.stringify(working) })).status).toBe(201);
    svc.table.sweep();
    ms += 30_000;
  }

  it("renders the table for two sessions, a stale one reading unknown with its Needs you line", async () => {
    await twoSessions();
    const out = capture();
    expect(await runPresenceSessions({}, out.io, { home }, () => ms)).toBe(0);
    await expect(`${out.lines.join("\n")}\n`).toMatchFileSnapshot(join(SNAPSHOT_DIR, "sessions-table.txt"));
    expect(out.lines[1]).toMatch(/^unknown\s+merlin\s+claude-code/);
    expect(out.lines[2]).toBe("  action required: Approve the migration 0007_well_readings before the story commits — a schema change needs a human");
  });

  it("--json prints the snapshot document, valid against the schema's snapshot definition", async () => {
    await twoSessions();
    const validate = await compilePresenceSchema();
    const out = capture();
    expect(await runPresenceSessions({ json: true }, out.io, { home }, () => ms)).toBe(0);
    expect(out.lines).toHaveLength(1);
    const doc = JSON.parse(out.lines[0]) as SnapshotDocument;
    expect(validate("snapshot", doc)).toEqual([]);
    expect(doc.sessions.map((s) => s.stale)).toEqual([true, false]);
  });

  it("says so when no session is reporting, and exits 0", async () => {
    const out = capture();
    expect(await runPresenceSessions({}, out.io, { home })).toBe(0);
    expect(out.lines).toEqual(["No session is reporting."]);
  });

  it("exits 1 with status's own wording when the token is refused or the port does not answer", async () => {
    writeFileSync(tokenPath({ home }), "another-capability\n");
    const refused = capture();
    const statusRefused = capture();
    expect(await runPresenceSessions({}, refused.io, { home })).toBe(1);
    expect(await runPresenceStatus(statusRefused.io, { home })).toBe(1);
    expect(refused.lines).toEqual(statusRefused.lines);
    expect(refused.lines[0]).toContain("refused this machine's token");

    recordService(home, svc.port);
    const info = readServerInfo({ home })!;
    writeFileSync(serverInfoPath({ home }), JSON.stringify({ ...info, port: 1 }));
    const unreachable = capture();
    expect(await runPresenceSessions({ json: true }, unreachable.io, { home })).toBe(1);
    expect(unreachable.lines).toEqual([`The presence service recorded at ${info.url} is not reachable.`]);
  });
});

describe("the sessions table's pieces", () => {
  it("formats an age in seconds, minutes, hours and days", () => {
    const at = "2026-11-12T15:00:00.000Z";
    expect([0, 59, 60, 3_599, 3_600, 86_399, 86_400, -5].map((s) => formatAge(at, T0 + s * 1000))).toEqual(["0s", "59s", "1m", "59m", "1h", "23h", "1d", "0s"]);
    expect(formatAge("not a time", T0)).toBe("-");
  });

  it("prints a dash for a missing agent, branch and task, and a Needs you line without a reason", async () => {
    const full = await loadPresenceFixture<ReportBody>("report.full.json");
    const lines = renderSessionsTable(
      [
        {
          session: "arcane:session:x",
          agent: { ref: null, slug: null, name: null, origin: null, definition_revision: null, aliases: [] },
          harness: "other",
          repository: full.repository,
          checkout: { ...full.checkout, branch: null },
          spell: null,
          task: null,
          message: null,
          status: "blocked",
          required_actions: [{ action: "Merge the pull request", reason: null }],
          started_at: "2026-11-12T15:00:00.000Z",
          reported_at: "2026-11-12T15:00:00.000Z",
          ended_at: null,
          stale: false,
        },
      ],
      T0 + 5_000,
    );
    expect(lines[1]).toMatch(/^blocked\s+-\s+other\s+geothermal-api\s+-\s+5s\s+-$/);
    expect(lines[2]).toBe("  action required: Merge the pull request");
  });
});

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[presence-sessions-command.test.ts] ${BUILT_CLI_SKIP_REASON}`);

describe.skipIf(!BIN)("spell presence sessions against the built CLI (PC-17)", () => {
  let home: string;
  let repo: string;
  let service: ServeProcess | undefined;

  beforeAll(async () => {
    repo = await arcaneRepo("presence-sessions-cli-repo");
  }, VERY_HEAVY_TEST_TIMEOUT);
  afterAll(async () => {
    await removeFixtureDir(repo);
  });
  beforeEach(async () => {
    home = await createFixtureDir("presence-sessions-cli-home");
  });
  afterEach(async () => {
    if (service !== undefined) {
      service.child.kill("SIGKILL");
      await service.exited;
      service = undefined;
    }
    await removeFixtureDir(home);
  });

  it("exits 1 with the status wording when no channel is configured", async () => {
    const run = await runSpell(BIN!, ["presence", "sessions"], { cwd: repo, home });
    expect(run.code).toBe(1);
    expect(run.stdout.trim()).toBe("No presence channel is configured on this machine.");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("--json lists the session a report opened", async () => {
    service = await spawnServe(BIN!, home);
    const report = await runSpell(BIN!, ["presence", "report", "--status", "working", "--task", "PS-17"], { cwd: repo, home });
    expect(report.code).toBe(0);
    const run = await runSpell(BIN!, ["presence", "sessions", "--json"], { cwd: repo, home });
    expect(run.code).toBe(0);
    const doc = JSON.parse(run.stdout) as SnapshotDocument;
    expect(doc.sessions.map((s) => s.task)).toEqual(["PS-17"]);
    const table = await runSpell(BIN!, ["presence", "sessions"], { cwd: repo, home });
    expect(table.stdout.split("\n")[0]).toMatch(/^STATUS\s+AGENT\s+HARNESS\s+REPOSITORY\s+BRANCH\s+AGE\s+TASK$/);
    expect(table.stdout).toContain("PS-17");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("--required-action reports Now lines", async () => {
    service = await spawnServe(BIN!, home);
    const report = await runSpell(BIN!, ["presence", "report", "--status", "waiting", "--required-action", "Merge the pull request — merges are yours", "--required-action", "Accept the amendment — decisions are yours"], { cwd: repo, home });
    expect(report.code).toBe(0);
    const run = await runSpell(BIN!, ["presence", "sessions", "--json"], { cwd: repo, home });
    const doc = JSON.parse(run.stdout) as SnapshotDocument;
    expect(doc.sessions[0]?.required_actions).toEqual([
      { action: "Merge the pull request", reason: "merges are yours" },
      { action: "Accept the amendment", reason: "decisions are yours" },
    ]);
    const help = await runSpell(BIN!, ["presence", "report", "--help"], { cwd: repo, home });
    expect(help.stdout).toContain("--required-action <line>");
    expect(help.stdout).not.toContain("--needs-you");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("the retired pre-1.20 --needs-you is an unknown option: no report, exit 0 (ARC-060 decision 14)", async () => {
    service = await spawnServe(BIN!, home);
    const report = await runSpell(BIN!, ["presence", "report", "--status", "waiting", "--needs-you", "Accept the amendment — decisions are yours"], { cwd: repo, home });
    expect(report.code).toBe(0);
    expect(report.stderr).toContain("unknown option '--needs-you'");
    const run = await runSpell(BIN!, ["presence", "sessions", "--json"], { cwd: repo, home });
    const doc = JSON.parse(run.stdout) as SnapshotDocument;
    expect(doc.sessions).toEqual([]);
  }, VERY_HEAVY_TEST_TIMEOUT);
});
