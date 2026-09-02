import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { INCIDENT_QUEUE, type IncidentRecord } from "../src/config/incidents.js";
import { checkIncidentReleaseGate } from "../src/commands/doctor.js";
import { evaluateIncidentGate } from "../src/modules/incident-gate.js";
import { resolveTsxCli, TSX_SKIP_REASON } from "./helpers/resolve-cli.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

const tempDirs: string[] = [];
const TSX = resolveTsxCli();
if (!TSX) console.warn(`[incident-gate.test.ts] ${TSX_SKIP_REASON}`);

function incident(overrides: Partial<IncidentRecord> = {}): IncidentRecord {
  return {
    id: "TEST-001",
    severity: "high",
    impact: "security",
    confidence: "confirmed",
    state: "open",
    detectedOn: "2026-08-01",
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => removeFixtureDir(dir)),
  );
});

describe("ARC-024 incident release gate", () => {
  it("passes the retroactively classified current queue", () => {
    const result = evaluateIncidentGate(INCIDENT_QUEUE);

    expect(result.blocked).toBe(false);
    expect(result.checked).toBe(12);
    expect(checkIncidentReleaseGate()).toMatchObject({ passed: true });
  });

  it("would have escalated EF-25 on 2026-07-14", () => {
    const result = evaluateIncidentGate([
      incident({
        id: "EF-25",
        impact: "data-integrity",
        detectedOn: "2026-07-14",
      }),
    ]);

    expect(result.blocked).toBe(true);
    expect(result.blockers).toContain(
      "EF-25: unresolved high data-integrity incident blocks release",
    );
  });

  it.skipIf(!TSX)("blocks the real asset build process for the historical EF-25 fixture", async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), "incident-build-gate-test-"));
    tempDirs.push(dir);
    const queuePath = join(dir, "incidents.json");
    await fs.writeFile(
      queuePath,
      JSON.stringify([
        incident({
          id: "EF-25",
          impact: "data-integrity",
          detectedOn: "2026-07-14",
        }),
      ]),
      "utf8",
    );

    const result = spawnSync(
      process.execPath,
      [TSX!, "scripts/copy-assets.ts"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          ARCANE_INCIDENT_QUEUE_PATH: queuePath,
          ARCANE_DIST_ASSETS_DIR: join(dir, "dist"),
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ARC-024 incident release gate FAILED");
    expect(result.stderr).toContain("EF-25");
  });

  it("blocks unresolved Critical or High protected incidents", () => {
    const result = evaluateIncidentGate([
      incident({ id: "SEC-001", severity: "critical" }),
      incident({ id: "DATA-001", impact: "data-integrity" }),
    ]);

    expect(result.blocked).toBe(true);
    expect(result.blockers).toHaveLength(2);
  });

  it("fails closed when a confirmed protected incident has no severity", () => {
    const result = evaluateIncidentGate([
      incident({ severity: undefined }),
    ]);

    expect(result.blockers[0]).toContain("missing severity");
  });

  it("accepts only the exact dated one-line risk deferral", () => {
    const accepted = evaluateIncidentGate([
      incident({
        state: "deferred",
        deferral: "Deferred 2026-08-01 — known open, accepting the risk.",
      }),
    ]);
    const rejected = evaluateIncidentGate([
      incident({
        state: "deferred",
        deferral: "Deferred because mitigation exists.",
      }),
    ]);

    expect(accepted.blocked).toBe(false);
    expect(accepted.acceptedRisks).toHaveLength(1);
    expect(rejected.blocked).toBe(true);
  });

  it("does not block research uncertainty or non-protected defects", () => {
    const result = evaluateIncidentGate([
      incident({ confidence: "research" }),
      incident({ id: "OTHER-001", impact: "other" }),
    ]);

    expect(result.blocked).toBe(false);
  });

  it("requires resolution evidence for resolved protected incidents", () => {
    const result = evaluateIncidentGate([
      incident({ state: "resolved" }),
    ]);

    expect(result.blockers[0]).toContain("missing resolution evidence");
  });
});