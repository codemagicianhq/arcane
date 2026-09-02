import { describe, it, expect, afterEach } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkDelegations } from "../src/commands/doctor.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";
import type { DelegationsFile } from "../src/types.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await removeFixtureDir(dir);
  dir = undefined;
});

async function writeDelegations(targetDir: string, content: DelegationsFile | string) {
  const arcaneDir = join(targetDir, ".arcane");
  await mkdir(arcaneDir, { recursive: true });
  const body = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  await writeFile(join(arcaneDir, "delegations.json"), body, "utf8");
}

describe("checkDelegations (T13/BC-19)", () => {
  it("passes silently when no delegations file exists", async () => {
    dir = await createFixtureDir("doctor-delegations-none");
    const result = await checkDelegations(dir);
    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toBe("no delegations recorded");
  });

  it("passes and lists an active delegation's scope and exclusion count", async () => {
    dir = await createFixtureDir("doctor-delegations-active");
    await writeDelegations(dir, {
      delegations: [
        {
          id: "test-delegation",
          grantedBy: "operator (test)",
          grantedAt: "2026-08-31",
          scope: "Test scope",
          permittedActions: ["commit"],
          excludedActions: ["platform-settings-mutations", "adr-acceptance"],
          status: "active",
          revocation: "Edit or remove this entry and commit.",
        },
      ],
    });

    const result = await checkDelegations(dir);
    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("1 active");
    expect(result.message).toContain("test-delegation");
    expect(result.message).toContain("Test scope");
    expect(result.message).toContain("2 action(s)");
  });

  it("excludes a revoked delegation from the active count and summary", async () => {
    dir = await createFixtureDir("doctor-delegations-revoked");
    await writeDelegations(dir, {
      delegations: [
        {
          id: "revoked-one",
          grantedBy: "operator (test)",
          grantedAt: "2026-08-01",
          scope: "Old scope",
          permittedActions: ["commit"],
          excludedActions: [],
          status: "revoked",
          revocation: "Edit or remove this entry and commit.",
        },
      ],
    });

    const result = await checkDelegations(dir);
    expect(result.passed).toBe(true);
    expect(result.message).toBe("no active delegations");
    expect(result.message).not.toContain("revoked-one");
  });

  it("reports a mix of active and revoked delegations correctly", async () => {
    dir = await createFixtureDir("doctor-delegations-mixed");
    await writeDelegations(dir, {
      delegations: [
        {
          id: "active-one",
          grantedBy: "operator (test)",
          grantedAt: "2026-08-31",
          scope: "Active scope",
          permittedActions: ["commit"],
          excludedActions: ["adr-acceptance"],
          status: "active",
          revocation: "Edit or remove this entry and commit.",
        },
        {
          id: "revoked-one",
          grantedBy: "operator (test)",
          grantedAt: "2026-08-01",
          scope: "Old scope",
          permittedActions: ["commit"],
          excludedActions: [],
          status: "revoked",
          revocation: "Edit or remove this entry and commit.",
        },
      ],
    });

    const result = await checkDelegations(dir);
    expect(result.message).toContain("1 active");
    expect(result.message).toContain("active-one");
    expect(result.message).not.toContain("revoked-one");
  });

  it("degrades to a non-blocking warning on invalid JSON, never throws", async () => {
    dir = await createFixtureDir("doctor-delegations-invalid");
    await writeDelegations(dir, "{ this is not valid json");

    const result = await checkDelegations(dir);
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("invalid JSON");
  });

  it("degrades to a non-blocking warning when the file is valid JSON but not an object, never throws", async () => {
    dir = await createFixtureDir("doctor-delegations-null");
    await writeDelegations(dir, "null");

    const result = await checkDelegations(dir);
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("not a valid delegations file");
  });

  it("degrades to a non-blocking warning when delegations is not an array, never throws", async () => {
    dir = await createFixtureDir("doctor-delegations-not-array");
    await writeDelegations(dir, '{ "delegations": "oops" }');

    const result = await checkDelegations(dir);
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("not a valid delegations file");
  });

  it("degrades to a non-blocking warning when an entry is missing required fields, never throws", async () => {
    dir = await createFixtureDir("doctor-delegations-malformed-entry");
    await writeDelegations(dir, '{ "delegations": [ { "id": "incomplete" } ] }');

    const result = await checkDelegations(dir);
    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("not a valid delegations file");
  });
});

describe("this repo's own real delegations.json (BC-19 migration)", () => {
  it("is valid, contains the become-current-plan record, and matches PLAN.md's exclusion list", async () => {
    const result = await checkDelegations(process.cwd());
    expect(result.passed).toBe(true);
    expect(result.message).toContain("become-current-plan");
    expect(result.message).toContain("6 action(s)");
  });
});
