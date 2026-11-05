import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { BUILT_CLI_SKIP_REASON, resolveBuiltCli } from "./helpers/resolve-cli.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { TIMING_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { arcaneRepo, openFeed, presenceEnv, spawnServe, type Feed, type ServeProcess } from "./helpers/presence.js";

/**
 * The first half of the 2-second budget (ARC-060 decision 11, PRD PC-14):
 * from the start of the `spell presence report` process to its event's
 * arrival at a loopback subscriber, p95 over 20 runs at or under 500 ms on a
 * developer machine and 1 s on each CI runner. The limits are literals on
 * purpose: they are not configurable from the environment.
 */

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[presence-timing.test.ts] ${BUILT_CLI_SKIP_REASON}`);

const RUNS = 20;
const LIMIT_MS = process.env["CI"] ? 1000 : 500;

let home: string;
let repo: string;
let service: ServeProcess;
let feed: Feed;

beforeAll(async () => {
  if (!BIN) return;
  home = await createFixtureDir("presence-timing-home");
  repo = await arcaneRepo("presence-timing-repo");
  service = await spawnServe(BIN, home);
  const token = readFileSync(join(home, ".arcane", "presence", "token"), "utf8").trim();
  feed = await openFeed(service.info.port, token);
  await feed.waitFor(1);
}, TIMING_TEST_TIMEOUT);

afterAll(async () => {
  if (!BIN) return;
  feed.close();
  service.child.kill("SIGKILL");
  await service.exited;
  await removeFixtureDir(home);
  await removeFixtureDir(repo);
});

function report(task: string): Promise<number | null> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN!, "presence", "report", "--status", "working", "--task", task], {
      cwd: repo,
      env: presenceEnv(home),
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("exit", (code) => resolve(code));
  });
}

/** Nearest-rank percentile: the ceil(p * n)-th smallest value. */
export function nearestRank(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1];
}

describe.skipIf(!BIN)("reporter-to-subscriber latency (PC-14, ARC-060 decision 11)", () => {
  it(`p95 over ${RUNS} runs is at or under ${LIMIT_MS} ms`, async () => {
    const samples: number[] = [];
    for (let i = 0; i < RUNS; i += 1) {
      const started = performance.now();
      const exited = report(`run ${i}`);
      const events = await feed.waitFor(i + 2, 10_000);
      samples.push(performance.now() - started);
      expect((events.at(-1)?.data as { task: string }).task).toBe(`run ${i}`);
      expect(await exited).toBe(0);
    }
    const median = nearestRank(samples, 0.5);
    const p95 = nearestRank(samples, 0.95);
    console.log(
      `[presence-timing] ${process.platform} ${process.env["CI"] ? "CI" : "local"}: ` +
        `runs=${samples.map((s) => s.toFixed(0)).join(",")} median=${median.toFixed(0)}ms p95=${p95.toFixed(0)}ms limit=${LIMIT_MS}ms`,
    );
    expect(p95).toBeLessThanOrEqual(LIMIT_MS);
  }, TIMING_TEST_TIMEOUT);
});

describe("nearestRank", () => {
  it("takes the 19th of 20 sorted values for p95 and the 10th for the median", () => {
    const values = Array.from({ length: 20 }, (_, i) => 20 - i);
    expect(nearestRank(values, 0.95)).toBe(19);
    expect(nearestRank(values, 0.5)).toBe(10);
  });
});
