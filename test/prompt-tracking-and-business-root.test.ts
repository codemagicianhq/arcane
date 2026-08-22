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

beforeAll(async () => {
  [openSession, plan, checkDrift, commitWork, todo] = await Promise.all([
    read("spell-open-session.prompt.md"),
    read("spell-plan.prompt.md"),
    read("spell-check-drift.prompt.md"),
    read("spell-commit-work.prompt.md"),
    read("spell-todo.prompt.md"),
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
    expect(todo).not.toContain("ventures/ordovica/TODO.md");
    expect(todo).not.toContain("`ventures/registry.json`'s aliases");
    expect(todo).not.toContain('under ventures/ (closest:');
    expect(todo).not.toContain("business under `ventures/`");
    expect(todo).not.toContain("`ventures/<name>/overview.md`");
    // 7 total: the Step 0 resolution sentence itself, plus 6 fixed call sites.
    expect((todo.match(/\{BUSINESS_ROOT\}/g) ?? []).length).toBe(7);
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
});
