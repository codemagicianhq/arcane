import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");

async function read(name: string): Promise<string> {
  return readFile(join(PROMPTS, name), "utf8");
}

let openSession: string;
let plan: string;
let checkDrift: string;
let commitWork: string;
let todo: string;
let summonVenture: string;
let saveIdea: string;

beforeAll(async () => {
  [openSession, plan, checkDrift, commitWork, todo, summonVenture, saveIdea] = await Promise.all([
    read("spell-open-session.prompt.md"),
    read("spell-plan.prompt.md"),
    read("spell-check-drift.prompt.md"),
    read("spell-commit-work.prompt.md"),
    read("spell-todo.prompt.md"),
    read("spell-summon-venture.prompt.md"),
    read("spell-save-idea.prompt.md"),
  ]);
});

describe("EF-14: tracking-mode resolution chain (MTC-4)", () => {
  it("spell-open-session resolves root .arcane.json before the self-hosted source manifest", () => {
    const idx = openSession.indexOf("Tracker configuration check");
    expect(idx).toBeGreaterThan(-1);
    const section = openSession.slice(idx, idx + 600);
    const rootIdx = section.indexOf(".arcane.json` (if present)");
    const selfHostedIdx = section.indexOf("src/assets/.arcane.json");
    expect(rootIdx).toBeGreaterThan(-1);
    expect(selfHostedIdx).toBeGreaterThan(-1);
    expect(rootIdx).toBeLessThan(selfHostedIdx);
  });

  it("spell-open-session gates the self-hosted source manifest fallback on selfHosted: true", () => {
    expect(openSession).toContain('declares `selfHosted: true`');
  });

  it("spell-open-session states concrete question wording, not just raw enum tokens", () => {
    expect(openSession).toContain("Track work in this repo (TODO.md / PRDs)");
    expect(openSession).toContain("Track work in an external tracker (Azure DevOps / Jira / other)");
  });

  it("spell-plan reads .arcane.json before falling through to asking (previously absent entirely)", () => {
    expect(plan).toContain(".arcane.json");
    const idx = plan.indexOf("Configure tracking mode first");
    expect(idx).toBeGreaterThan(-1);
    const section = plan.slice(idx, idx + 800);
    expect(section).toContain(".arcane.json");
    expect(section).toContain("src/assets/.arcane.json");
  });

  it("spell-plan states the same concrete question wording as spell-open-session", () => {
    expect(plan).toContain("Track work in this repo (TODO.md / PRDs)");
    expect(plan).toContain("Track work in an external tracker (Azure DevOps / Jira / other)");
  });
});

describe("EF-08: {BUSINESS_ROOT} resolution replaces hardcoded ventures/ (MTC-5)", () => {
  it("spell-check-drift: no bare ventures/ remains as a resolution path (only the documented default value)", () => {
    expect(checkDrift).not.toContain("[ventures/](../../ventures/)");
    expect(checkDrift).not.toContain("`ventures/*/IDEAS.md`");
    expect(checkDrift).not.toContain("existing `ventures/<slug>/` folder");
    expect(checkDrift).toContain("{BUSINESS_ROOT}");
    expect(checkDrift).toContain("{BUSINESS_ROOT}/*/IDEAS.md");
  });

  it("spell-open-session: no bare ventures/ link remains", () => {
    expect(openSession).not.toContain("[ventures/](../../ventures/)");
    expect(openSession).toContain("{BUSINESS_ROOT}/");
  });

  it("spell-plan: research-context step resolves {BUSINESS_ROOT} instead of hardcoding ventures/", () => {
    expect(plan).not.toContain("business docs in `ventures/`");
    expect(plan).toContain("business docs under `{BUSINESS_ROOT}/`");
  });

  it("spell-commit-work: business scope label resolves {BUSINESS_ROOT}", () => {
    expect(commitWork).not.toContain("`business` — ventures/ directory");
    expect(commitWork).toContain("`business` — `{BUSINESS_ROOT}` directory");
  });

  it("spell-todo: none of its six ventures/ references remain hardcoded", () => {
    expect(todo).not.toContain("ventures/<slug>/TODO.md");
    expect(todo).not.toContain("`ventures/registry.json`'s aliases");
    expect(todo).not.toContain('under ventures/ (closest:');
    expect(todo).not.toContain("business under `ventures/`");
    expect(todo).not.toContain("`ventures/<name>/overview.md`");
    // 6 total: the resolution sentence itself, plus 5 fixed call sites -- the
    // Sweep Mode sample-output block deliberately kept a concrete illustrative
    // example (ventures/ordovica/TODO.md) rather than the literal placeholder,
    // matching the codebase's established convention for worked-example output.
    expect((todo.match(/\{BUSINESS_ROOT\}/g) ?? []).length).toBe(6);
  });

  it("spell-todo defines how {BUSINESS_ROOT} resolves before using it", () => {
    const definitionIdx = todo.indexOf("Resolve `{BUSINESS_ROOT}` from `.arcane.json`");
    const firstUseIdx = todo.indexOf("{BUSINESS_ROOT}");
    expect(definitionIdx).toBeGreaterThan(-1);
    // The definition sentence itself contains the token, so its own {
    // position IS the first raw occurrence -- assert the sentence starts
    // at or before it, not exact equality (the sentence's leading text
    // like "Resolve `" precedes the token within the same string).
    expect(definitionIdx).toBeLessThanOrEqual(firstUseIdx);
  });

  // [Review round] spell-summon-venture already resolved {BUSINESS_ROOT} for
  // folder creation but still hardcoded ventures/registry.json for the write
  // path -- a real EF-08 instance the first pass missed because this file
  // was (wrongly) cited in the PRD as an "already correct" reference example,
  // so it was never checked. Covered directly now.
  it("spell-summon-venture: registry write path resolves {BUSINESS_ROOT}, not a hardcoded ventures/registry.json", () => {
    expect(summonVenture).not.toContain("`ventures/registry.json` and append");
    // Round-2 review found this exact assertion was decorative: the real
    // pre-fix markdown link escaped the underscore (_template, standard
    // markdown syntax to prevent _..._ italics), so a search string without
    // the backslash never matched before OR after the fix. Corrected.
    expect(summonVenture).not.toContain("[ventures/\\_template/overview.md]");
    expect(summonVenture).not.toContain("including the `ventures/registry.json` entry");
    // [Round 2] the Executive Summary (line 10) had the same hardcode as the
    // Step 3 write path -- missed by the first fix pass entirely, caught by
    // a second independent review's completeness sweep. Fixed by dropping
    // the resolved-path detail from the summary (not by placing
    // {BUSINESS_ROOT} there, which would itself use the token before its
    // own Step 0 definition -- an overview doesn't need the exact path,
    // and this sidesteps a second definition-ordering bug entirely).
    expect(summonVenture).not.toContain("its `ventures/registry.json` entry");
    expect(summonVenture).toContain("`{BUSINESS_ROOT}/registry.json` and append");
    expect(summonVenture).toContain("{BUSINESS_ROOT}/_template/overview.md");
    expect(summonVenture).toContain("its registry entry");
  });

  it("spell-summon-venture defines {BUSINESS_ROOT} before its first use", () => {
    const definitionIdx = summonVenture.indexOf("resolve `{BUSINESS_ROOT}` from `.arcane.json`");
    const firstUseIdx = summonVenture.indexOf("{BUSINESS_ROOT}");
    expect(definitionIdx).toBeGreaterThan(-1);
    expect(definitionIdx).toBeLessThanOrEqual(firstUseIdx);
  });

  // [Review round] spell-save-idea and spell-todo were built as siblings in
  // the same ARC-030 commit with near-identical Step 0 venture-targeting
  // logic; only spell-todo was fixed in the first pass. Covered directly now.
  it("spell-save-idea: Step 0 venture targeting resolves {BUSINESS_ROOT}, not hardcoded ventures/", () => {
    expect(saveIdea).not.toContain("`ventures/registry.json`'s aliases");
    expect(saveIdea).not.toContain('under ventures/ (closest:');
    expect(saveIdea).toContain("`{BUSINESS_ROOT}/registry.json`'s aliases");
    expect(saveIdea).toContain("under {BUSINESS_ROOT}/ (closest:");
    const definitionIdx = saveIdea.indexOf("Resolve `{BUSINESS_ROOT}` from `.arcane.json`");
    const firstUseIdx = saveIdea.indexOf("{BUSINESS_ROOT}");
    expect(definitionIdx).toBeGreaterThan(-1);
    expect(definitionIdx).toBeLessThanOrEqual(firstUseIdx);
  });
});
