import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");
const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");

let universalRules: string;
let openSession: string;
let arcaneVersion: string;
let commitWork: string;
let createPullRequest: string;
let reviewBatch: string;
let manifest: string;
let fullCycle: string;
let closeSession: string;

beforeAll(async () => {
  [
    universalRules,
    openSession,
    arcaneVersion,
    commitWork,
    createPullRequest,
    reviewBatch,
    manifest,
    fullCycle,
    closeSession,
  ] = await Promise.all([
    readFile(join(GOVERNANCE, "universal-agent-rules.md"), "utf8"),
    readFile(join(PROMPTS, "spell-open-session.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-arcane-version.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-commit-work.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-create-pull-request.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-review-batch.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-manifest.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-full-cycle.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-close-session.prompt.md"), "utf8"),
  ]);
});

describe("rule 8 generated state diagrams extension (ARC-036)", () => {
  it("leaves rule 8's original sentence byte-unchanged", () => {
    expect(universalRules).toContain(
      "8. **Use Mermaid for diagrams** (` ```mermaid ` blocks) for all flow charts, architecture diagrams, and sequence diagrams. Directory trees stay as plain code blocks.",
    );
  });

  it("names the generated state diagrams convention and cites ARC-036 with a full canonical URL", () => {
    expect(universalRules).toContain("**generated state diagrams** convention");
    expect(universalRules).toContain(
      "https://github.com/codemagicianhq/arcane/blob/main/DECISIONS.md#arc-036--generated-state-diagrams-deterministic-mermaid-for-computed-spell-state",
    );
  });

  it("states the applicability guard: skip for one-line outputs, speed-rule spells, or a single reading", () => {
    expect(universalRules).toContain("Skip it for one-line outputs, speed-rule spells, or any state with only a single reading");
  });

  it("distinguishes computed state from authored explanatory content", () => {
    expect(universalRules).toContain("not authored, freehand explanatory content");
  });
});

describe("spell-open-session emits the canonical version-drift diagram (R2/R3)", () => {
  it("emits the diagram when either axis drifts, referencing rule 8 and ARC-036", () => {
    expect(openSession).toContain("If either axis shows drift, emit the canonical version-drift diagram");
    expect(openSession).toContain("generated state diagrams convention (rule 8, ARC-036)");
  });

  it("contains the canonical gitGraph template with all three readings", () => {
    expect(openSession).toContain("gitGraph");
    expect(openSession).toContain('commit id: "<repo-files version>"');
    expect(openSession).toContain("branch repo-files");
    expect(openSession).toContain('commit id: "<installed-CLI version>"');
    expect(openSession).toContain("branch installed-cli");
    expect(openSession).toContain('commit id: "<npm-latest version>" tag: "latest"');
  });

  it("specifies collapsing identical consecutive values rather than repeating them", () => {
    expect(openSession).toContain("collapse consecutive identical values into a single shared commit rather than repeating it");
  });

  it("specifies :::mermaid fencing for ADO wikis, resolved from external_provider rather than assumed", () => {
    expect(openSession).toContain(":::mermaid");
    expect(openSession).toContain("resolve `external_provider` from `.arcane.json` rather than assuming");
  });

  it("notes the fenced source degrades to readable text in bare terminals", () => {
    expect(openSession).toContain("the fenced source is still readable without a renderer");
  });

  it("applies the guard: no diagram when both axes are current", () => {
    expect(openSession).toContain("If both axes are current, report current and continue — no diagram");
    expect(openSession).toContain("a single, matching reading has nothing to visualize");
  });

  it("orders the diagram-emission step between the two warning bullets and the both-current guard", () => {
    const warningBIndex = openSession.indexOf("Installed CLI behind the latest published version");
    const diagramIndex = openSession.indexOf("If either axis shows drift, emit the canonical version-drift diagram");
    const guardIndex = openSession.indexOf("If both axes are current, report current and continue — no diagram");
    expect(warningBIndex).toBeGreaterThan(-1);
    expect(warningBIndex).toBeLessThan(diagramIndex);
    expect(diagramIndex).toBeLessThan(guardIndex);
  });
});

describe("spell-arcane-version gains the third reading and references the canonical template (R4)", () => {
  it("restructures the update check as two-axis, matching spell-open-session's own two readings", () => {
    expect(arcaneVersion).toContain("Update Check (two-axis)");
    expect(arcaneVersion).toContain("Repo-files version");
    expect(arcaneVersion).toContain("Installed CLI version");
    expect(arcaneVersion).toContain("Npm-latest version");
  });

  it("adds the installed-CLI reading it did not have before", () => {
    expect(arcaneVersion).toContain("determine the version of the installed `arcane-cli` CLI");
  });

  it("references spell-open-session's canonical diagram rather than duplicating the template", () => {
    expect(arcaneVersion).toContain("emit the canonical version-drift diagram");
    expect(arcaneVersion).toContain("spell-open-session.prompt.md");
    expect(arcaneVersion).not.toContain("gitGraph");
  });

  it("still reports current when both axes match", () => {
    expect(arcaneVersion).toContain("You are on the latest version");
  });

  it("still reports when the npm registry is unreachable", () => {
    expect(arcaneVersion).toContain("Could not reach npm registry");
  });
});

describe("spell-commit-work and spell-create-pull-request emit branch/PR topology (R9)", () => {
  it("both reference the generated state diagrams convention", () => {
    expect(commitWork).toContain("generated state diagrams convention (rule 8, ARC-036)");
    expect(createPullRequest).toContain("generated state diagrams convention (rule 8, ARC-036)");
  });

  it("both contain the gitGraph topology template with a fork point and per-commit entries", () => {
    for (const text of [commitWork, createPullRequest]) {
      expect(text).toContain("gitGraph");
      expect(text).toContain('commit id: "<target HEAD short-sha>"');
      expect(text).toContain("branch <branch-name>");
      expect(text).toContain('commit id: "<short-sha 1>"');
      expect(text).toContain('commit id: "<short-sha 2>"');
    }
  });

  it("spell-commit-work states the applicability guard: no separate branch or no usable remote", () => {
    expect(commitWork).toContain("no separate topic branch");
    expect(commitWork).toContain("no usable remote");
  });

  it("spell-create-pull-request references spell-commit-work's shape rather than re-deriving it (D8)", () => {
    expect(createPullRequest).toContain("Same shape `spell-commit-work` uses for the identical concept");
  });

  it("both derive the diagram only from already-gathered data, not a new git command", () => {
    expect(commitWork).toContain("data Step 1/9 already gathered");
    expect(createPullRequest).toContain("Step 1's already-gathered branch name and commit list");
  });
});

describe("R10 adopters each reference the convention and derive only from already-gathered data", () => {
  it("spell-review-batch emits a GO/NO-GO gate flowchart from already-computed verdicts", () => {
    expect(reviewBatch).toContain("per the generated state diagrams convention (rule 8, ARC-036), built only from");
    expect(reviewBatch).toContain("flowchart LR");
    expect(reviewBatch).toContain("Gate{Gate}");
    expect(reviewBatch).toContain("skip entirely (the applicability guard) for a batch of one");
  });

  it("spell-review-batch warns against the lowercase 'end' flowchart footgun", () => {
    expect(reviewBatch).toContain("the bare lowercase word `end` as a node label");
  });

  it("spell-manifest emits a 7-way routing flowchart from already-decided destinations", () => {
    expect(manifest).toContain("diagrams convention (rule 8, ARC-036), built only from the routing already decided");
    expect(manifest).toContain("flowchart LR");
    expect(manifest).toContain("repo IDEAS.md");
    expect(manifest).toContain("entirely (the applicability guard) for a single selected entry");
  });

  it("spell-full-cycle emits a pipeline stateDiagram-v2 from already-tracked phase status", () => {
    expect(fullCycle).toContain("per the generated state diagrams convention (rule 8, ARC-036), built only");
    expect(fullCycle).toContain("stateDiagram-v2");
    expect(fullCycle).toContain("[*] --> Plan");
    expect(fullCycle).toContain("Ship --> [*]");
    expect(fullCycle).toContain("skip entirely (the applicability guard) after Phase");
  });

  it("spell-full-cycle marks exactly one phase as current and handles optional Enchant", () => {
    expect(fullCycle).toContain("(current)");
    expect(fullCycle).toContain("`Enchant` from the diagram entirely when Phase 1.5 was skipped");
  });

  it("spell-close-session reuses gitGraph for its commit record, not the experimental timeline type", () => {
    expect(closeSession).toContain("generated state diagrams convention (rule 8, ARC-036)");
    expect(closeSession).toContain("gitGraph");
    expect(closeSession).not.toContain("mermaid\ntimeline");
    expect(closeSession).toContain("Mermaid's `timeline` diagram");
    expect(closeSession).toContain("marked experimental in Mermaid's own docs");
  });

  it("spell-close-session ties each commit's diagram label to step 1b's real classification, never an assumed success", () => {
    expect(closeSession).toContain("step 1b's succeeded/pending/failed classification");
    expect(closeSession).toContain("never claim `succeeded` for anything step 1b did not confirm");
  });
});
