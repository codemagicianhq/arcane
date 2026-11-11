import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { oneLine, validateEnd, validateReport } from "../src/modules/presence/validate.js";
import { createSessionTable } from "../src/modules/presence/sessions.js";
import { mintSessionRef } from "../src/modules/agent-ref.js";
import { MAX_LINE_CHARS, MAX_REQUIRED_ACTIONS } from "../src/modules/presence/types.js";
import { REPO_ROOT } from "./helpers/state-schema.js";
import { compilePresenceSchema, loadPresenceFixture } from "./helpers/presence.js";

async function full(): Promise<Record<string, unknown>> {
  return loadPresenceFixture<Record<string, unknown>>("report.full.json");
}

function refusal(result: ReturnType<typeof validateReport>): { code: string; field?: string } {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("accepted");
  return { code: result.code, ...(result.field === undefined ? {} : { field: result.field }) };
}

describe("validateReport: status (PC-04)", () => {
  it("refuses an unknown status naming the field", async () => {
    expect(refusal(validateReport({ ...(await full()), status: "thinking" }))).toEqual({ code: "invalid_field", field: "status" });
  });

  it("refuses done and says to use end", async () => {
    const result = validateReport({ ...(await full()), status: "done" });
    expect(refusal(result)).toEqual({ code: "invalid_field", field: "status" });
    if (!result.ok) expect(result.message).toContain("/v0/sessions/end");
  });

  it("accepts each report status", async () => {
    for (const status of ["working", "waiting", "blocked", "idle"]) expect(validateReport({ ...(await full()), status }).ok).toBe(true);
  });
});

describe("validateReport: one-line strings (PC-03 truncation; threat-model control 10)", () => {
  it("cuts a 257-code-point task to 256", async () => {
    const result = validateReport({ ...(await full()), task: "x".repeat(257) });
    expect(result.ok && result.value.task).toBe("x".repeat(256));
  });

  it("flattens CR, LF, tab and other controls into spaces", async () => {
    const result = validateReport({ ...(await full()), task: "line one\r\nline two\tend\u0007\u2028" });
    expect(result.ok && result.value.task).toBe("line one  line two end  ");
  });

  it("never splits a surrogate pair", () => {
    const out = oneLine("🛰".repeat(300));
    expect(Array.from(out)).toHaveLength(MAX_LINE_CHARS);
    expect(out).toBe("🛰".repeat(256));
  });

  it("normalizes every one-line field, needs-you lines and the branch included", async () => {
    const long = "y\n".repeat(200);
    const body = await full();
    const result = validateReport({
      ...body,
      spell: long,
      message: long,
      required_actions: [{ action: long, reason: long }],
      checkout: { ...(body["checkout"] as object), branch: long },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const value of [result.value.spell, result.value.message, result.value.required_actions?.[0]?.action, result.value.required_actions?.[0]?.reason, result.value.checkout.branch]) {
      expect(value).not.toMatch(/[\r\n]/);
      expect(Array.from(value ?? "").length).toBeLessThanOrEqual(256);
    }
  });
});

describe("validateReport: the required-action cap is refused, never cut (PC-03; threat-model control 10; architecture D11)", () => {
  const line = { action: "Approve the plan", reason: null };
  it("accepts 20 lines", async () => {
    const result = validateReport({ ...(await full()), required_actions: Array.from({ length: 20 }, () => line) });
    expect(result.ok && result.value.required_actions).toHaveLength(MAX_REQUIRED_ACTIONS);
  });

  it("refuses 21 lines with field required_actions", async () => {
    expect(refusal(validateReport({ ...(await full()), required_actions: Array.from({ length: 21 }, () => line) }))).toEqual({ code: "too_many_lines", field: "required_actions" });
  });

  it("refuses an agent block with more than 32 aliases (review of PR #435)", async () => {
    const body = await full();
    const aliases = Array.from({ length: 33 }, (_, i) => ({ value: `a${i}`, context: "slug" }));
    expect(refusal(validateReport({ ...body, agent: { ...(body["agent"] as object), aliases } }))).toEqual({ code: "invalid_field", field: "agent.aliases" });
  });

  it("refuses an empty action", async () => {
    expect(refusal(validateReport({ ...(await full()), required_actions: [{ action: " ", reason: null }] }))).toEqual({ code: "invalid_field", field: "required_actions.0.action" });
  });
});

describe("validateReport: closed shape (PC-03)", () => {
  it("refuses an unknown top-level key, naming it", async () => {
    expect(refusal(validateReport({ ...(await full()), extra: 1 }))).toEqual({ code: "unknown_field", field: "extra" });
  });

  it("refuses an agent block missing a key", async () => {
    const body = await full();
    const agent = { ...(body["agent"] as Record<string, unknown>) };
    delete agent["aliases"];
    expect(refusal(validateReport({ ...body, agent }))).toEqual({ code: "missing_field", field: "agent.aliases" });
  });

  it("refuses a non-string checkout path and a missing checkout", async () => {
    const body = await full();
    expect(refusal(validateReport({ ...body, checkout: { path: 7, branch: null, linked_worktree: false } }))).toEqual({ code: "invalid_field", field: "checkout.path" });
    const without = { ...body };
    delete without["checkout"];
    expect(refusal(validateReport(without))).toEqual({ code: "missing_field", field: "checkout" });
  });

  it("refuses a body that is not an object", () => {
    for (const value of [null, [], "text", 3]) expect(refusal(validateReport(value)).code).toBe("invalid_field");
  });

  it.each([
    ["agent.ref", { ref: "arcane:session:019a4b10-2c3d-7e4f-8a9b-0c1d2e3f4a5b" }],
    ["agent.origin", { origin: "elsewhere" }],
    ["agent.definition_revision", { definition_revision: "md5:abc" }],
    ["agent.aliases", { aliases: "main" }],
    ["agent.aliases.0.context", { aliases: [{ value: "main", context: "global" }] }],
    ["agent.slug", { slug: 3 }],
  ])("refuses a bad %s", async (field, patch) => {
    const body = await full();
    expect(refusal(validateReport({ ...body, agent: { ...(body["agent"] as object), ...patch } })).field).toBe(field);
  });

  it.each([
    ["harness", { harness: "vim" }],
    ["repository.remote.provider", { repository: { root: "/r", name: "r", remote: { provider: "gitea", url: "x" } } }],
    ["repository.remote.url", { repository: { root: "/r", name: "r", remote: { provider: "other", url: 1 } } }],
    ["repository.name", { repository: { root: "/r", name: "", remote: null } }],
    ["repository.root", { repository: { root: "", name: "r", remote: null } }],
    ["checkout.linked_worktree", { checkout: { path: "/r", branch: null, linked_worktree: "no" } }],
    ["required_actions", { required_actions: "approve" }],
    ["task", { task: 5 }],
  ])("refuses a bad %s", async (field, patch) => {
    expect(refusal(validateReport({ ...(await full()), ...patch })).field).toBe(field);
  });

  it("keeps absent optional keys absent and null ones null (architecture D4)", async () => {
    const minimal = await loadPresenceFixture<Record<string, unknown>>("report.minimal.json");
    const result = validateReport(minimal);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect("task" in result.value).toBe(false);
    expect("required_actions" in result.value).toBe(false);
    const cleared = validateReport({ ...minimal, task: null });
    expect(cleared.ok && cleared.value.task).toBeNull();
  });
});

describe("validateEnd", () => {
  it("accepts { checkout: { path } } and refuses anything else", () => {
    expect(validateEnd({ checkout: { path: "/r" } })).toEqual({ ok: true, value: { checkout: { path: "/r" } } });
    expect(validateEnd({ checkout: { path: "" } }).ok).toBe(false);
    expect(validateEnd({ checkout: { path: "/r", branch: "main" } }).ok).toBe(false);
    expect(validateEnd({}).ok).toBe(false);
  });
});

describe("validated reports produce schema-valid bodies and records (PC-04)", () => {
  it("every accepted sample validates as a report, and the record the table builds validates", async () => {
    const validate = await compilePresenceSchema();
    const table = createSessionTable({ mint: mintSessionRef });
    const samples: unknown[] = [
      await full(),
      await loadPresenceFixture("report.minimal.json"),
      await loadPresenceFixture("report.clearing.json"),
      { ...(await full()), task: "z\n".repeat(400), required_actions: Array.from({ length: 20 }, (_, i) => ({ action: `line ${i}\r`, reason: null })) },
    ];
    for (const sample of samples) {
      const result = validateReport(sample);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(validate("report", result.value)).toEqual([]);
      const { record } = table.report(result.value);
      expect(validate("record", record)).toEqual([]);
    }
  });
});

describe("validate.ts does no I/O (architecture D1; threat-model control 11)", () => {
  it("imports only ./types.js", async () => {
    const source = await readFile(join(REPO_ROOT, "src/modules/presence/validate.ts"), "utf8");
    expect([...source.matchAll(/from "([^"]+)";/g)].map((m) => m[1])).toEqual(["./types.js"]);
  });
});

// ARC-060 decision 14 (features/action-required/PRD.md AR-05): `needs_you`,
// the field's name before 1.20, was accepted for the 1.20 series only. Since
// 1.23.0 it is an unknown field like any other.
describe("validateReport: the retired pre-1.20 name needs_you (ARC-060 decision 14)", () => {
  it("refuses needs_you alone as an unknown field", async () => {
    const body = await full();
    const { required_actions: lines, ...rest } = body;
    expect(refusal(validateReport({ ...rest, needs_you: lines }))).toEqual({ code: "unknown_field", field: "needs_you" });
  });

  it("refuses needs_you beside required_actions as an unknown field", async () => {
    const body = await full();
    expect(refusal(validateReport({ ...body, needs_you: body["required_actions"] }))).toEqual({ code: "unknown_field", field: "needs_you" });
  });

  it("the schema no longer declares needs_you and refuses a body that sends it", async () => {
    const schema = JSON.parse(await readFile(join(REPO_ROOT, "src/assets/schemas/presence.schema.json"), "utf8")) as {
      $defs: { report: { properties: Record<string, unknown> } };
    };
    expect(Object.keys(schema.$defs.report.properties)).not.toContain("needs_you");
    const validate = await compilePresenceSchema();
    const body = await full();
    const { required_actions: lines, ...rest } = body;
    expect(validate("report", { ...rest, needs_you: lines })).not.toEqual([]);
    expect(validate("report", body)).toEqual([]);
  });
});
