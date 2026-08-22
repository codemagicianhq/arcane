import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");
const AI_CONTEXT = join(process.cwd(), "src", "assets", "ai-context");

let closeSession: string;
let openSession: string;
let aiContextTemplate: string;

beforeAll(async () => {
  [closeSession, openSession, aiContextTemplate] = await Promise.all([
    readFile(join(PROMPTS, "spell-close-session.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-open-session.prompt.md"), "utf8"),
    readFile(join(AI_CONTEXT, "system-prompt-context.md"), "utf8"),
  ]);
});

describe("close-session pending-verification vocabulary (EF-21)", () => {
  it("defines all five states", () => {
    for (const state of ["dispatched", "pending", "succeeded", "failed", "unverifiable"]) {
      expect(closeSession).toContain(`**${state}**`);
    }
  });

  it("requires unverifiable items to state a concrete verification action", () => {
    expect(closeSession).toContain("State the exact command, URL, or action");
    expect(closeSession).toContain('a bare "unverifiable" with no next step is barely better than silence');
  });

  it("distinguishes dispatched from succeeded explicitly", () => {
    expect(closeSession).toContain('"I started it" is not "it worked."');
    expect(closeSession).toContain("are all **dispatched**, not **succeeded**");
  });

  it("orders the verification step before the journal write", () => {
    const stepIndex = closeSession.indexOf("Verify in-flight async work before writing any output artifact");
    const journalIndex = closeSession.indexOf("Update today's journal file");
    expect(stepIndex).toBeGreaterThan(-1);
    expect(journalIndex).toBeGreaterThan(-1);
    expect(stepIndex).toBeLessThan(journalIndex);
  });
});

describe("handoff template Pending Verification field (EF-21)", () => {
  it("is present in the close-session handoff template, after Blockers", () => {
    const blockersIndex = closeSession.indexOf("**Blockers:**");
    const pendingIndex = closeSession.indexOf("**Pending Verification:**");
    const notesIndex = closeSession.lastIndexOf("**Notes:**");
    expect(blockersIndex).toBeGreaterThan(-1);
    expect(pendingIndex).toBeGreaterThan(blockersIndex);
    expect(pendingIndex).toBeLessThan(notesIndex);
  });

  it('documents "None" as the value when nothing is outstanding, and excludes succeeded items', () => {
    expect(closeSession).toContain('Write "None" only if step 1b found every dispatched item resolved');
    expect(closeSession).toContain("never list a `succeeded` item here");
  });

  it("is present in the fresh-install ai-context template stub", () => {
    expect(aiContextTemplate).toContain("**Pending Verification:**");
  });
});

describe("completion claims scoped to succeeded only (EF-21)", () => {
  it("journal What Got Done only lists succeeded outcomes", () => {
    expect(closeSession).toContain("Only list an outcome here if step 1b classified it `succeeded`");
  });

  it("journal Open Items Carried Forward absorbs non-succeeded work", () => {
    expect(closeSession).toContain("including every `pending`/`dispatched`/`failed`/`unverifiable` item from step 1b");
  });

  it("TODO.md completion marking requires succeeded classification", () => {
    expect(closeSession).toContain("Mark an item done with date only if step 1b classified its outcome `succeeded`");
  });

  it("the Rules section ties 'verifiable' to the five-state vocabulary, not the old ambiguous phrasing alone", () => {
    expect(closeSession).toContain("Do not invent completions");
    expect(closeSession).toContain('"Verifiable" means classified `succeeded` under step 1b\'s five-state vocabulary');
  });
});

describe("open-session re-verifies pending items rather than relaying them (EF-21)", () => {
  it("checks the Pending Verification field and re-verifies current status", () => {
    expect(openSession).toContain("Pending Verification");
    expect(openSession).toContain("actively re-check its current status");
    expect(openSession).toContain("rather than treating the state recorded at close-session time as still current");
  });

  it("still surfaces the original handoff fields alongside the new check", () => {
    expect(openSession).toContain("Picking Up From Last Session");
    expect(openSession).toContain("Next Session Plan");
  });
});
