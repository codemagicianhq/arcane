import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  REF_TYPES,
  createUuidV7Generator,
  mintAgentRef,
  mintRef,
  mintSessionRef,
  mintTemplateRef,
  parseRef,
  uuidv7,
  uuidV7Millis,
} from "../src/modules/agent-ref.js";
import { REPO_ROOT } from "./helpers/state-schema.js";

const V7 = "[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const MINTS = 10_000;

describe("agent-ref: minting (AI-01, ARC-059 decision 1, ARC-060 decision 4)", () => {
  it("mints agent, template and session references in the agreed grammar", () => {
    expect(mintAgentRef()).toMatch(new RegExp(`^arcane:agent:${V7}$`));
    expect(mintTemplateRef()).toMatch(new RegExp(`^arcane:template:${V7}$`));
    expect(mintSessionRef()).toMatch(new RegExp(`^arcane:session:${V7}$`));
    expect(uuidv7()).toMatch(new RegExp(`^${V7}$`));
  });

  it("registers exactly agent, template and session", () => {
    expect([...REF_TYPES]).toEqual(["agent", "template", "session"]);
    expect(() => mintRef("persona" as never)).toThrow("not a registered reference type");
  });

  it(`mints ${MINTS} unique, strictly increasing values with a non-decreasing time prefix`, () => {
    const generate = createUuidV7Generator();
    const values = Array.from({ length: MINTS }, () => generate());
    expect(new Set(values).size).toBe(MINTS);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i] > values[i - 1]).toBe(true);
      expect(uuidV7Millis(values[i])).toBeGreaterThanOrEqual(uuidV7Millis(values[i - 1]));
    }
  });

  it("stays unique and ordered when every mint lands in one millisecond, carrying the clock past a counter overflow", () => {
    const fixed = 1_762_300_800_000;
    const generate = createUuidV7Generator({ now: () => fixed });
    const values = Array.from({ length: MINTS }, () => generate());
    expect(new Set(values).size).toBe(MINTS);
    for (let i = 1; i < values.length; i += 1) expect(values[i] > values[i - 1]).toBe(true);
    expect(uuidV7Millis(values[0])).toBe(fixed);
    // 10,000 values cannot fit one millisecond's 12-bit counter, so the prefix moved forward.
    expect(uuidV7Millis(values.at(-1)!)).toBeGreaterThan(fixed);
  });

  it("never lets the time prefix go backwards when the clock does", () => {
    const times = [2_000, 1_000, 1_500, 2_001];
    let i = 0;
    const generate = createUuidV7Generator({ now: () => times[i++] });
    const millis = times.map(() => uuidV7Millis(generate()));
    expect(millis).toEqual([2_000, 2_000, 2_000, 2_001]);
  });

  it("encodes the millisecond timestamp in the first 48 bits", () => {
    const generate = createUuidV7Generator({ now: () => 0x0123_4567_89ab, random: (n) => new Uint8Array(n) });
    const value = generate();
    expect(value.startsWith("01234567-89ab-7")).toBe(true);
    expect(value[19]).toBe("8");
  });

  it("parses what it mints", () => {
    for (const ref of [mintAgentRef(), mintTemplateRef(), mintSessionRef()]) {
      const parsed = parseRef(ref);
      expect(parsed.ok).toBe(true);
    }
    const session = mintSessionRef();
    expect(parseRef(session, "session")).toEqual({ ok: true, type: "session", uuid: session.slice("arcane:session:".length) });
  });
});

describe("agent-ref: parseRef refusals carry one-line reasons (AI-01)", () => {
  const good = mintAgentRef();
  const uuid = good.slice("arcane:agent:".length);
  const cases: Array<[string, unknown, string]> = [
    ["not a string", 42, "must be a string"],
    ["empty", "", "must not be empty"],
    ["surrounding whitespace", ` ${good}`, "whitespace"],
    ["uppercase", good.toUpperCase(), "lowercase"],
    ["braced", `arcane:agent:{${uuid}}`, "braced"],
    ["no prefix", uuid, 'form "arcane:<type>:<uuid>"'],
    ["another prefix", `urn:agent:${uuid}`, 'form "arcane:<type>:<uuid>"'],
    ["an extra segment", `arcane:agent:x:${uuid}`, 'form "arcane:<type>:<uuid>"'],
    ["an unregistered type", `arcane:persona:${uuid}`, "not a registered reference type"],
    ["not hex", `arcane:agent:${uuid.slice(0, -1)}g`, "canonical hex"],
    ["not version 7", `arcane:agent:${uuid.slice(0, 14)}4${uuid.slice(15)}`, "version 7"],
    ["a bad variant", `arcane:agent:${uuid.slice(0, 19)}c${uuid.slice(20)}`, "version 7"],
  ];
  it.each(cases)("refuses %s", (_label, input, reason) => {
    const parsed = parseRef(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toContain(reason);
      expect(parsed.reason).not.toContain("\n");
    }
  });

  it("refuses a well-formed reference of the wrong type when a type is expected", () => {
    const parsed = parseRef(good, "session");
    expect(parsed).toEqual({ ok: false, reason: "expected a session reference, got one of type agent" });
  });
});

describe("agent-ref: zero new dependencies (PC-01, ARC-037 decision 8)", () => {
  it("imports node:crypto and nothing else", async () => {
    const source = await readFile(join(REPO_ROOT, "src/modules/agent-ref.ts"), "utf8");
    const imports = [...source.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
    expect(imports).toEqual(["node:crypto"]);
  });
});
