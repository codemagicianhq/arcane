import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP02-B-01 (PRD D-11, R-269, #269): a PR body must survive a pre-PR rebase
// that halts (conflict stop, dirty tree, hand-off). The body file is written
// before any step that can halt, the rebase carries uncommitted work with
// --autostash, and both PR-creation paths refuse an empty body.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");
const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");

let commitWork: string;
let createPr: string;
let gitConventions: string;

/** Text from `start` up to (not including) the first `end` after it. */
function section(content: string, start: string, end: string): string {
    const from = content.indexOf(start);
    expect(from, `missing section start: ${start}`).toBeGreaterThan(-1);
    const to = content.indexOf(end, from + start.length);
    expect(to, `missing section end: ${end}`).toBeGreaterThan(-1);
    return content.slice(from, to);
}

beforeAll(async () => {
    [commitWork, createPr, gitConventions] = await Promise.all([
        readFile(join(SPELLS, "spell-commit-work.md"), "utf8"),
        readFile(join(SPELLS, "spell-create-pull-request.md"), "utf8"),
        readFile(join(GOVERNANCE, "git-conventions.md"), "utf8"),
    ]);
});

describe("spell-commit-work step 9: body first, autostash rebase, empty-body refusal", () => {
    it("writes the PR body file before step 9b's rebase", () => {
        const bodyIndex = commitWork.indexOf("**Write the PR body file first.**");
        const rebaseIndex = commitWork.indexOf("Mandatory pre-PR rebase");
        expect(bodyIndex).toBeGreaterThan(-1);
        expect(bodyIndex).toBeLessThan(rebaseIndex);
        const bodyStep = section(commitWork, "**Write the PR body file first.**", "Mandatory pre-PR rebase");
        expect(bodyStep).toContain("<git-dir>/arcane-pr-body.md");
        expect(bodyStep).toContain("git rev-parse --git-dir");
    });

    it("step 9b rebases with --autostash", () => {
        const step9b = section(commitWork, "Mandatory pre-PR rebase", "c. Detect remote platform");
        expect(step9b).toContain("git rebase --autostash origin/<target-branch>");
        expect(step9b).not.toMatch(/git rebase origin\//);
    });

    it("the raw GitHub and ADO paths (9d/9e) read that file and refuse an empty body", () => {
        const step9d = section(commitWork, "d. **GitHub flow", "e. **Azure DevOps flow");
        const step9e = section(commitWork, "e. **Azure DevOps flow", "f. **PR description quality rules");
        for (const step of [step9d, step9e]) {
            expect(step).toContain("<git-dir>/arcane-pr-body.md");
            expect(step).toContain("Refuse to create the PR if the body file is missing, empty, or written for another branch");
            expect(step).toContain("its first line names the current branch");
        }
    });
});

describe("spell-create-pull-request: autostash rebase and empty-body refusal", () => {
    it("Step 0.6 and the pre-PR checklist rebase with --autostash", () => {
        const step0 = section(createPr, "## Step 0 — Guard checks", "## Step 1 — Gather context");
        expect(step0).toContain("`git rebase --autostash origin/<target-branch>`");
        expect(step0).toContain("`git rebase --autostash origin/<target>`");
        expect(step0).not.toMatch(/git rebase origin\//);
    });

    it("Step 5 refuses a missing or empty body file and points back at Step 4", () => {
        const step5 = section(createPr, "## Step 5 — Create the PR", "## Step 6 — Report");
        expect(step5).toContain("Refuse to create the PR if the body file is missing, empty, or written for another branch");
        expect(step5).toContain("its first line names the current branch");
        expect(step5).toContain("run Step 4 first");
        // The refusal comes before either provider's create command.
        expect(step5.indexOf("missing or empty")).toBeLessThan(step5.indexOf("gh pr create"));
    });
});

describe("git-conventions.md: the pre-PR guard snippet matches the spells", () => {
    it("the guard's rule and snippet use --autostash, with no bare rebase left in it", () => {
        const guard = section(gitConventions, "### 🛑 Agent-mandatory pre-PR guard", "### PR Requirements");
        expect(guard).toContain("git fetch origin && git rebase --autostash origin/<target-branch>");
        expect(guard).toContain("git rebase --autostash origin/<target-branch>     #");
        expect(guard).not.toMatch(/git rebase origin\//);
    });

    it("the guard requires the body file before the rebase and refuses an empty body, with an enforcement annotation", () => {
        const guard = section(gitConventions, "### 🛑 Agent-mandatory pre-PR guard", "### PR Requirements");
        expect(guard).toContain("write the PR body file before the rebase");
        expect(guard).toContain("never create a PR whose body is empty");
        const bodyRule = section(guard, "write the PR body file before the rebase", "\n\n");
        expect(bodyRule).toContain("Enforcement: structured spell gate (ARC-023)");
    });

    it("the Agent Workflow sync step rebases with --autostash too", () => {
        const workflow = section(gitConventions, "### Agent Workflow", "### Multi-Machine Workflow");
        expect(workflow).toContain("git rebase --autostash origin/main");
        expect(workflow).not.toMatch(/git rebase origin\//);
    });
});
