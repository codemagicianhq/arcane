import { describe, it, expect, vi } from "vitest";
import {
  applyGenericNames,
  applyRandomNames,
  applyArcanosNames,
  applyNamingStrategy,
  promptCustomNames,
} from "../src/modules/naming.js";

// Mock @inquirer/prompts so promptCustomNames can be tested without a TTY
vi.mock("@inquirer/prompts", () => ({
  input: vi.fn().mockResolvedValue("MockedName"),
}));

// ─── applyGenericNames ────────────────────────────────────────────────────────

describe("applyGenericNames", () => {
  it("maps orchestrator to Orchestrator", () => {
    const result = applyGenericNames(["orchestrator"]);
    expect(result).toEqual([{ definition: "orchestrator", name: "Orchestrator" }]);
  });

  it("maps all 12 standard roles without falling back to the raw id", () => {
    const roleIds = [
      "orchestrator",
      "architecture-lead",
      "fullstack-dev",
      "qa-lead",
      "devops",
      "frontend-dev",
      "mobile-dev",
      "research-analyst",
      "marketing-strategist",
      "operations-comms",
      "collaborator",
      "security-ops",
    ];

    const result = applyGenericNames(roleIds);

    // Every result should have a name that differs from the raw id
    // (i.e. the map entry was found)
    for (const { definition, name } of result) {
      expect(name).not.toBe(definition); // fallback would return the raw id
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("falls back to the raw id for an unknown role", () => {
    const result = applyGenericNames(["unknown-role-xyz"]);
    expect(result[0]?.name).toBe("unknown-role-xyz");
  });

  it("returns results in the same order as the input", () => {
    const roleIds = ["qa-lead", "devops", "orchestrator"];
    const result = applyGenericNames(roleIds);
    expect(result.map((r) => r.definition)).toEqual(roleIds);
  });

  it("returns an empty array for empty input", () => {
    expect(applyGenericNames([])).toEqual([]);
  });
});

// ─── applyRandomNames ─────────────────────────────────────────────────────────

describe("applyRandomNames", () => {
  it("returns the same number of entries as input role ids", () => {
    const roles = ["orchestrator", "fullstack-dev", "qa-lead"];
    const result = applyRandomNames(roles);
    expect(result).toHaveLength(3);
  });

  it("preserves definition ids in output", () => {
    const roles = ["orchestrator", "fullstack-dev"];
    const result = applyRandomNames(roles);
    expect(result.map((r) => r.definition)).toEqual(roles);
  });

  it("assigns non-empty name strings", () => {
    const roles = ["orchestrator", "fullstack-dev", "devops"];
    const result = applyRandomNames(roles);
    for (const { name } of result) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("wraps around the pool without throwing when more roles than pool entries", () => {
    // Generate more roles than the 30-entry pool to force wrap-around
    const roles = Array.from({ length: 35 }, (_, i) => `role-${i}`);
    expect(() => applyRandomNames(roles)).not.toThrow();
    const result = applyRandomNames(roles);
    expect(result).toHaveLength(35);
  });

  it("returns an empty array for empty input", () => {
    expect(applyRandomNames([])).toEqual([]);
  });

  it("assigns names that are non-empty strings on every call", () => {
    const roles = Array.from({ length: 10 }, (_, i) => `role-${i}`);
    const result = applyRandomNames(roles);
    for (const { name } of result) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

// ─── applyArcanosNames ───────────────────────────────────────────────────

describe("applyArcanosNames", () => {
  it("maps orchestrator to Kellar", () => {
    const result = applyArcanosNames(["orchestrator"]);
    expect(result).toEqual([{ definition: "orchestrator", name: "Kellar" }]);
  });

  it("maps all 12 standard roles to their persona names", () => {
    const roleIds = [
      "orchestrator",
      "architecture-lead",
      "fullstack-dev",
      "qa-lead",
      "devops",
      "frontend-dev",
      "mobile-dev",
      "research-analyst",
      "marketing-strategist",
      "operations-comms",
      "collaborator",
      "security-ops",
    ];

    const result = applyArcanosNames(roleIds);

    const expectedNames = [
      "Kellar", "Merlin", "Lafayette", "Lince", "Prospero", "Adelaide",
      "Mercurio", "Alexander", "Circe", "Bess", "Iris", "Custodio",
    ];

    for (let i = 0; i < roleIds.length; i++) {
      expect(result[i]?.name).toBe(expectedNames[i]);
    }
  });

  it("falls back to the raw id for an unknown role", () => {
    const result = applyArcanosNames(["unknown-role-xyz"]);
    expect(result[0]?.name).toBe("unknown-role-xyz");
  });

  it("returns results in the same order as the input", () => {
    const roleIds = ["qa-lead", "devops", "orchestrator"];
    const result = applyArcanosNames(roleIds);
    expect(result.map((r) => r.definition)).toEqual(roleIds);
  });

  it("returns an empty array for empty input", () => {
    expect(applyArcanosNames([])).toEqual([]);
  });
});

// ─── applyNamingStrategy ──────────────────────────────────────────────────────

describe("applyNamingStrategy", () => {
  it("delegates to applyGenericNames for 'generic' strategy", async () => {
    const result = await applyNamingStrategy("generic", ["orchestrator"]);
    expect(result).toEqual([{ definition: "orchestrator", name: "Orchestrator" }]);
  });

  it("delegates to applyRandomNames for 'random' strategy", async () => {
    const result = await applyNamingStrategy("random", ["orchestrator", "qa-lead"]);
    expect(result).toHaveLength(2);
    for (const { name } of result) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("delegates to applyArcanosNames for 'arcanos' strategy", async () => {
    const result = await applyNamingStrategy("arcanos", ["orchestrator"]);
    expect(result).toEqual([{ definition: "orchestrator", name: "Kellar" }]);
  });

  it("delegates to promptCustomNames for 'custom' strategy (uses mocked input)", async () => {
    const result = await applyNamingStrategy("custom", ["orchestrator"]);
    // The mock always returns "MockedName"
    expect(result).toEqual([{ definition: "orchestrator", name: "MockedName" }]);
  });

  it("returns empty array for any strategy when no roles are provided", async () => {
    expect(await applyNamingStrategy("generic", [])).toEqual([]);
    expect(await applyNamingStrategy("random", [])).toEqual([]);
    expect(await applyNamingStrategy("arcanos", [])).toEqual([]);
    expect(await applyNamingStrategy("custom", [])).toEqual([]);
  });
});

// ─── promptCustomNames ────────────────────────────────────────────────────────

describe("promptCustomNames", () => {
  it("returns one result per role id using the mocked input value", async () => {
    const result = await promptCustomNames(["orchestrator", "qa-lead"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ definition: "orchestrator", name: "MockedName" });
    expect(result[1]).toEqual({ definition: "qa-lead", name: "MockedName" });
  });

  it("returns empty array for empty input", async () => {
    const result = await promptCustomNames([]);
    expect(result).toEqual([]);
  });

  it("trims whitespace from the mocked input value", async () => {
    const { input } = await import("@inquirer/prompts");
    vi.mocked(input).mockResolvedValueOnce("  Alice  ");
    const result = await promptCustomNames(["orchestrator"]);
    expect(result[0]?.name).toBe("Alice");
  });
});
