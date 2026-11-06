import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { evaluateRunGrant, isRunGrant, parseRunGrants, readRunGrants, type RunGrant, type RunGrantRequest } from "../src/modules/run-grants.js";
import { checkRunGrants } from "../src/commands/doctor.js";
import { checkRunGrant, runGrantCheck } from "../src/commands/grant.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";

const grant: RunGrant = {
  id: "test-run", grantedBy: "operator", operatorWords: "Commit this task while I am away.",
  grantedAt: "2026-11-05T08:00:00.000Z", expiresAt: "2026-11-06T08:00:00.000Z",
  scope: { repository: "github.com/example/project", task: "task-1", branchPrefix: "sessions/test-run" },
  permittedActions: ["commit"], excludedActions: [], requiredChecks: [], status: "active",
  revocation: "Set status to revoked or remove the entry.",
};
const request: RunGrantRequest = {
  id: grant.id, ...grant.scope, branch: "sessions/test-run", action: "commit", now: new Date("2026-11-05T12:00:00Z"),
};
const dirs: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks(); process.exitCode = 0;
  await Promise.all(dirs.splice(0).map(removeFixtureDir));
});
async function fixture(value?: unknown) {
  const dir = await createFixtureDir("run-grants"); dirs.push(dir);
  if (value !== undefined) {
    await mkdir(join(dir, ".arcane"), { recursive: true });
    await writeFile(join(dir, ".arcane/delegations.json"), typeof value === "string" ? value : JSON.stringify(value));
  }
  return dir;
}

describe("run grant authority records", () => {
  it("allows a scoped commit, but never infers completion permission", () => {
    expect(evaluateRunGrant([grant], request).matches).toBe(true);
    expect(evaluateRunGrant([grant], { ...request, action: "complete-pr" }).reason).toBe("action not permitted");
    const complete: RunGrant = { ...grant, permittedActions: ["complete-pr"], requiredChecks: ["test"] };
    expect(evaluateRunGrant([complete], { ...request, action: "complete-pr" }).matches).toBe(true);
    expect(isRunGrant({ ...complete, requiredChecks: [] })).toBe(false);
  });
  it.each([
    [{ id: "missing" }, "missing or duplicate grant"],
    [{ now: new Date("invalid") }, "invalid clock"],
    [{ now: new Date("2026-11-05T07:59:59Z") }, "grant not yet active"],
    [{ now: new Date(grant.expiresAt) }, "expired grant"],
    [{ repository: "github.com/other/project" }, "repository or task outside scope"],
    [{ task: "task-2" }, "repository or task outside scope"],
    [{ branch: "sessions/test-runaway" }, "branch outside scope"],
    [{ action: "unknown" }, "action not permitted"],
  ])("refuses a mismatched request %j", (change, reason) => {
    expect(evaluateRunGrant([grant], { ...request, ...change }).reason).toBe(reason);
  });
  it("handles revoked, invalid and duplicate grants and explicit exclusions", () => {
    expect(evaluateRunGrant([{ ...grant, status: "revoked" }], request).reason).toBe("revoked grant");
    expect(evaluateRunGrant([{ ...grant, expiresAt: "bad" }], request).reason).toBe("invalid grant");
    expect(evaluateRunGrant([grant, grant], request).matches).toBe(false);
    expect(evaluateRunGrant([{ ...grant, excludedActions: ["commit"] }], request).reason).toBe("excluded action");
  });
  it("can explicitly exclude never-permitted operations without making them grantable", () => {
    const restricted = { ...grant, excludedActions: ["force-push", "production-deploy", "settings-change"] };
    expect(isRunGrant(restricted)).toBe(true);
    expect(evaluateRunGrant([restricted], { ...request, action: "force-push" }).reason).toBe("excluded action");
    expect(isRunGrant({ ...grant, permittedActions: ["force-push"] })).toBe(false);
  });
  it("matches deliberate branch boundaries, including trailing delimiters", () => {
    for (const branch of ["sessions/test-run", "sessions/test-run-fix", "sessions/test-run/worker"]) {
      expect(evaluateRunGrant([grant], { ...request, branch }).matches).toBe(true);
    }
    for (const branchPrefix of ["sessions/", "sessions/test-"]) {
      expect(evaluateRunGrant([{ ...grant, scope: { ...grant.scope, branchPrefix } }], request).matches).toBe(true);
    }
    expect(evaluateRunGrant([grant], { ...request, now: new Date(grant.grantedAt) }).matches).toBe(true);
  });
  it.each([
    null, [], {}, { ...grant, scope: null }, { ...grant, grantedBy: " " },
    { ...grant, grantedAt: "2026-02-30T08:00:00.000Z" }, { ...grant, expiresAt: 3 },
    { ...grant, expiresAt: "2026-11-05" }, { ...grant, expiresAt: "9999-99-99T08:00:00.000Z" },
    { ...grant, expiresAt: grant.grantedAt }, { ...grant, status: "unknown" },
    { ...grant, scope: { ...grant.scope, task: "" } }, { ...grant, permittedActions: [] },
    { ...grant, permittedActions: ["admin"] }, { ...grant, excludedActions: [1] },
    { ...grant, requiredChecks: "test" },
  ])("rejects malformed records %j", (value) => expect(isRunGrant(value)).toBe(false));
  it("preserves legacy documents but rejects malformed grant collections", () => {
    expect(parseRunGrants({ delegations: [{ scope: "legacy prose" }] })).toEqual([]);
    expect(parseRunGrants({ runGrants: [grant] })).toEqual([grant]);
    for (const value of [null, [], { runGrants: {} }, { runGrants: [null] }, { runGrants: [grant, grant] }]) {
      expect(() => parseRunGrants(value)).toThrow();
    }
  });
  it("reads records without a roster; missing is silent and other IO failures throw", async () => {
    expect(await readRunGrants(await fixture())).toEqual([]);
    expect(await readRunGrants(await fixture({ runGrants: [grant] }))).toEqual([grant]);
    const dir = await fixture();
    await mkdir(join(dir, ".arcane/delegations.json"), { recursive: true });
    await expect(readRunGrants(dir)).rejects.toThrow();
  });
  it("doctor lists expiry and distinguishes active from expired/future/revoked", async () => {
    const dir = await fixture({ runGrants: [grant, { ...grant, id: "revoked", status: "revoked" }] });
    const active = await checkRunGrants(dir, request.now);
    expect(active.message).toContain(`1 active run grant(s): test-run (expires ${grant.expiresAt}`);
    expect(active.message).toContain("1 expired, future or revoked");
    expect((await checkRunGrants(dir, new Date(grant.expiresAt))).message).toContain("0 active");
    expect((await checkRunGrants(dir, new Date("2026-01-01"))).message).toContain("0 active");
    expect((await checkRunGrants(await fixture())).message).toBe("no run grants recorded");
    expect((await checkRunGrants(await fixture("bad JSON"))).passed).toBe(false);
  });
  it("the command fails closed and never logs the grant's operator words", async () => {
    expect((await checkRunGrant(await fixture("bad JSON"), request)).matches).toBe(false);
    expect((await checkRunGrant(await fixture({ runGrants: [grant] }), request)).matches).toBe(true);
    const dir = await fixture();
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await runGrantCheck(request);
    expect(process.exitCode).toBe(1);
    const liveGrant = { ...grant, grantedAt: "2020-01-01T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z" };
    await mkdir(join(dir, ".arcane"));
    await writeFile(join(dir, ".arcane/delegations.json"), JSON.stringify({ runGrants: [liveGrant] }));
    process.exitCode = 0;
    await runGrantCheck(request);
    expect(process.exitCode).toBe(0);
    expect(log.mock.calls.map(String).join()).not.toContain(grant.operatorWords);
  });
});
