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

  it("orders the verification step before the journal write, the TODO.md update, and the handoff write", () => {
    const stepIndex = closeSession.indexOf("Verify in-flight async work before writing any output artifact");
    const journalIndex = closeSession.indexOf("Update today's journal file");
    const todoIndex = closeSession.indexOf("**Update [TODO.md]");
    const handoffIndex = closeSession.indexOf("Write the Next Session Handoff block");
    expect(stepIndex).toBeGreaterThan(-1);
    expect(stepIndex).toBeLessThan(journalIndex);
    expect(stepIndex).toBeLessThan(todoIndex);
    expect(stepIndex).toBeLessThan(handoffIndex);
  });

  // R2 (adversarial review): the state names and downstream gating sentences
  // could all stay byte-identical while the one clause that makes this a
  // real verification requirement -- rather than just a labeling taxonomy
  // -- gets quietly weakened. Assert that operative clause directly, not
  // just its outputs.
  it("requires actively checking status, not just labeling from assumption", () => {
    expect(closeSession).toContain("**actively check** its current status");
  });

  it("requires attempting the check before reaching for unverifiable, not using it as a shortcut", () => {
    expect(closeSession).toContain("attempt the check before reaching for `unverifiable`");
    expect(closeSession).toContain(
      "reaching for this state without attempting the check first defeats the purpose of this step",
    );
  });

  it("cross-references step 10's existing PR-merge check as the same requirement, not a separate mechanism", () => {
    expect(closeSession).toContain("this same requirement applied to one specific, already-shipped case");
    expect(closeSession).toContain("both apply");
  });

  it("self-declares its enforcement mode per ARC-023", () => {
    expect(closeSession).toContain("Enforcement:");
    expect(closeSession).toContain("ARC-023");
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

  // R6 (adversarial review): the original field spec let ANY non-succeeded
  // state cite "N/A" for its verification action, including dispatched/
  // pending/unverifiable -- exactly the states open-session most needs a
  // concrete action to re-check. Only "failed" (already resolved) should
  // ever be allowed to skip stating an action.
  it('restricts "N/A" verification actions to the failed state only', () => {
    expect(closeSession).toContain(
      'The verification action is required for `dispatched`, `pending`, and `unverifiable` — "N/A" is only valid for `failed`',
    );
  });
});

describe("completion claims scoped to succeeded only (EF-21)", () => {
  it("journal What Got Done only lists succeeded outcomes", () => {
    expect(closeSession).toContain("Only list an outcome here if step 1b classified it `succeeded`");
  });

  it("journal Open Items Carried Forward absorbs non-succeeded work", () => {
    expect(closeSession).toContain("including every `pending`/`dispatched`/`failed`/`unverifiable` item from step 1b");
  });

  it("TODO.md completion marking requires succeeded classification, and its non-succeeded example list includes failed", () => {
    expect(closeSession).toContain("Mark an item done with date only if step 1b classified its outcome `succeeded`");
    // R5 (adversarial review): the illustrative list previously omitted
    // "failed" even though the positive gate already excluded it by
    // construction -- an agent skimming examples rather than re-deriving
    // from the gate could momentarily wonder if failed items are covered.
    expect(closeSession).toContain("A `pending`, `dispatched`, `failed`, or `unverifiable` item stays open");
  });

  // R1 (adversarial review, HIGH): the new Pending Verification field's own
  // text names "Last completed step" as a legitimate home for a completion
  // claim, in the same breath as What Got Done and TODO.md -- both of which
  // ARE gated to step 1b's succeeded classification. Left ungated, this
  // field reproduces EF-21's exact incident shape one field away from the
  // fix, and it's the field spell-open-session surfaces first and most
  // prominently.
  it("Last completed step is gated the same way as What Got Done and TODO.md, not left as a silent third home for completion claims", () => {
    expect(closeSession).toContain(
      "If that action was async work step 1b classified as anything other than `succeeded`, do not describe it as done here",
    );
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
