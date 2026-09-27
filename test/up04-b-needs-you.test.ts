import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expandFragment, referencesFragment } from "../src/modules/spell-compiler.js";

// UP04-B-01 (PRD D-13 / R-266, #266): required operator actions get lost
// among optional next steps. One ARC-039 fragment defines a single,
// unmistakable `## ⚠ Needs you` block: fixed heading, top of the final
// report, one line per action, never only among optional steps, and omitted
// entirely when nothing needs the operator.

const FRAGMENT = "needs-you";
const HEADING = "## ⚠ Needs you";
const ASSETS = join(process.cwd(), "src", "assets");
const SPELLS = join(ASSETS, ".arcane", "spells");
const STANDARDS = join(ASSETS, ".arcane", "governance", "spell-authoring-standards.md");

let fragment: string;
let standards: string;

beforeAll(async () => {
    fragment = await readFile(join(SPELLS, "_fragments", `${FRAGMENT}.md`), "utf8");
    standards = await readFile(STANDARDS, "utf8");
});

describe("the needs-you fragment (UP04-B-01)", () => {
    it("defines one fixed heading inside the block template", () => {
        expect(fragment).toContain("```markdown\n## ⚠ Needs you\n");
        // Exactly one heading: the block is one block, not a pattern of several.
        expect(fragment.split(HEADING)).toHaveLength(2);
    });

    it("places the block at the top of the final report, before optional next steps", () => {
        expect(fragment).toContain(
            "report it in one block at the very top of the final report, before every other section and before any optional next step",
        );
    });

    it("asks for one line per action naming what to do and why the agent cannot", () => {
        expect(fragment).toContain("**One line per action.**");
        expect(fragment).toContain("why the agent cannot do it");
        expect(fragment).toContain(
            "- <exactly what to do: the command, the link, or the question> — <why the agent cannot do it itself>",
        );
    });

    it("never lets a required action appear only among optional steps", () => {
        expect(fragment).toContain(
            "An action required for correctness is never listed only under next steps, suggestions, `Carry Forward` or `What's Next?`.",
        );
        expect(fragment).toContain("it always appears in this block");
    });

    it("omits the block entirely when nothing needs the operator", () => {
        expect(fragment).toContain("**Omit it when empty.**");
        expect(fragment).toContain("leave the block out entirely: no heading and no \"None\" line");
    });

    it("names the operator-only action classes from #266, and excludes optional suggestions", () => {
        for (const action of [
            "approving or merging a pull request",
            "accepting a decision record",
            "answering a question the work is waiting on",
            "confirming a `guarded` push",
            "`spell unblock-push`",
            "a step on an external platform the agent cannot reach",
        ]) {
            expect(fragment).toContain(action);
        }
        expect(fragment).toContain("is not a required action and stays out of the block");
    });

    it("covers early-stop reports too", () => {
        expect(fragment).toContain("including a report written when the spell stops early");
    });

    it("carries an ARC-023 enforcement annotation that does not overclaim", () => {
        expect(fragment).toContain("Enforcement: explicitly advisory prose (ARC-023)");
    });

    it("introduces no {UPPER_SNAKE} token (the runtime-placeholder check counts them)", () => {
        expect(fragment).not.toMatch(/\{[A-Z][A-Z0-9_]*\}/);
    });

    it("expands into a marker pair verbatim and is idempotent, like every ARC-039 fragment", () => {
        const host = [
            "## Report",
            "",
            `<!-- fragment:${FRAGMENT}:start -->`,
            "stale text",
            `<!-- fragment:${FRAGMENT}:end -->`,
            "",
        ].join("\n");
        expect(referencesFragment(host, FRAGMENT)).toBe(true);
        const once = expandFragment(host, FRAGMENT, fragment);
        expect(once).toContain(fragment.trim());
        expect(once).not.toContain("stale text");
        expect(expandFragment(once, FRAGMENT, fragment)).toBe(once);
    });
});

describe("spell-authoring-standards documents the convention (UP04-B-01)", () => {
    const section = (): string => {
        const start = standards.indexOf("## Required operator actions: the `Needs you` block");
        const end = standards.indexOf("## How to audit a spell");
        expect(start).toBeGreaterThan(-1);
        expect(end).toBeGreaterThan(start);
        return standards.slice(start, end);
    };

    it("states the heading, placement, one-line, never-only-optional and omit-when-empty rules", () => {
        const text = section();
        expect(text).toContain("`## ⚠ Needs you`, at the very top of the final report");
        expect(text).toContain("before any optional next step");
        expect(text).toContain("**One line per action:**");
        expect(text).toContain("**Never only among optional steps:**");
        expect(text).toContain("**Omitted when empty:**");
    });

    it("names the fragment and its marker pair (ARC-039)", () => {
        const text = section();
        expect(text).toContain("`<!-- fragment:needs-you:start -->` / `<!-- fragment:needs-you:end -->`");
        expect(text).toContain("ARC-039");
    });

    it("carries an ARC-023 enforcement annotation", () => {
        const text = section();
        expect(text).toContain("**Enforcement: executable check (ARC-023) for the wording");
        expect(text).toContain("explicitly\nadvisory prose: no check reads a spell's output.**");
    });

    it("introduces no {UPPER_SNAKE} token", () => {
        expect(section()).not.toMatch(/\{[A-Z][A-Z0-9_]*\}/);
    });
});

// UP04-B-02: the fragment is expanded into every spell whose output can carry
// an action only the operator can take. Each entry names the output/report
// text the span must follow (it sits where the spell describes its final
// report) -- see the story's testEvidence for why each spell is in or out.
const CHOSEN: Record<string, string> = {
    "spell-open-session": "Then produce output in this exact structure:",
    "spell-close-session": "Output format:\n",
    "spell-commit-work": "Output format after execution:",
    "spell-create-pull-request": "## Step 6 — Report",
    "spell-sync-pull-request": "## Step 6 — Report",
    "spell-address-review": "4. Print a summary table of actions taken",
    "spell-ship": "6. **Generate ship report**:",
    "spell-full-cycle": "3. Generate the ship report",
    "spell-review": "8. **Present findings**",
    "spell-review-batch": "## Step 4 — Output",
    "spell-architect": "8. **Present for review**",
    "spell-plan": "7. **Present for review**",
    "spell-scope": "### 9. Present and Confirm",
    "spell-adopt-docs": "## Phase 4 — Report",
    "spell-make-discoverable": "## Phase 6 — Report",
};

/** Evaluated and left out on purpose (reasons recorded in UP04-B-02's testEvidence). */
const EXCLUDED = [
    "spell-arcane-version",
    "spell-bump",
    "spell-eas-store-deploy",
    "spell-implement",
    "spell-product-review",
];

const START = `<!-- fragment:${FRAGMENT}:start -->`;
const END = `<!-- fragment:${FRAGMENT}:end -->`;
const ROOT_SPELLS = join(process.cwd(), ".arcane", "spells");
const OTHER_FRAGMENTS = ["push-policy-check", "tracking-mode-declaration"];

describe.each(Object.keys(CHOSEN))("%s carries the needs-you block (UP04-B-02)", (id) => {
    let content: string;
    let root: string;

    beforeAll(async () => {
        content = await readFile(join(SPELLS, `${id}.md`), "utf8");
        root = await readFile(join(ROOT_SPELLS, `${id}.md`), "utf8");
    });

    it("has exactly one marker pair", () => {
        expect(referencesFragment(content, FRAGMENT)).toBe(true);
        expect(content.split(START)).toHaveLength(2);
        expect(content.split(END)).toHaveLength(2);
    });

    it("is fully expanded (re-expanding changes nothing)", () => {
        expect(expandFragment(content, FRAGMENT, fragment)).toBe(content);
        expect(content).toContain("## ⚠ Needs you");
    });

    it("places the span where the spell describes its final output", () => {
        const anchor = content.indexOf(CHOSEN[id]!);
        expect(anchor).toBeGreaterThan(-1);
        expect(content.indexOf(START)).toBeGreaterThan(anchor);
    });

    it("never nests the span inside another fragment's span", () => {
        const start = content.indexOf(START);
        const end = content.indexOf(END);
        for (const other of OTHER_FRAGMENTS) {
            const oStart = content.indexOf(`<!-- fragment:${other}:start -->`);
            const oEnd = content.indexOf(`<!-- fragment:${other}:end -->`);
            if (oStart === -1) continue;
            const inside = start > oStart && start < oEnd;
            const contains = oStart > start && oStart < end;
            expect(inside || contains).toBe(false);
        }
    });

    it("root copy matches the canonical source", () => {
        expect(root).toBe(content);
    });
});

describe("the chosen set is deliberate (UP04-B-02)", () => {
    it("every canonical spell carrying the span is in the chosen set, and no excluded spell carries it", async () => {
        const { readdir } = await import("node:fs/promises");
        const ids = (await readdir(SPELLS)).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
        const carrying: string[] = [];
        for (const id of ids) {
            const content = await readFile(join(SPELLS, `${id}.md`), "utf8");
            if (referencesFragment(content, FRAGMENT)) carrying.push(id);
        }
        expect(carrying.sort()).toEqual(Object.keys(CHOSEN).sort());
        for (const id of EXCLUDED) expect(ids).toContain(id);
        for (const id of EXCLUDED) expect(carrying).not.toContain(id);
    });
});
