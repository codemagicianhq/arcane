import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP04-B-03 (PRD D-13 / R-266, #266): required operator actions survive the
// session handoff. close-session's handoff template gains a `Needs you`
// field; open-session surfaces it first, above `Picking Up From Last
// Session`, and does not consume the handoff without surfacing it. The
// existing field names and the Pending Verification behaviour stay intact.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");
const ROOT_SPELLS = join(process.cwd(), ".arcane", "spells");
const STANDARDS = join(process.cwd(), "src", "assets", ".arcane", "governance", "spell-authoring-standards.md");

let closeSession: string;
let openSession: string;
let standards: string;

beforeAll(async () => {
    [closeSession, openSession, standards] = await Promise.all([
        readFile(join(SPELLS, "spell-close-session.md"), "utf8"),
        readFile(join(SPELLS, "spell-open-session.md"), "utf8"),
        readFile(STANDARDS, "utf8"),
    ]);
});

function handoffTemplate(): string {
    const start = closeSession.indexOf("```markdown\n## Next Session Handoff");
    const end = closeSession.indexOf("```", start + 3);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return closeSession.slice(start, end);
}

describe("close-session handoff template carries a Needs you field (UP04-B-03)", () => {
    it("adds the field, fed by the closure report's Needs you block, with None when empty", () => {
        const template = handoffTemplate();
        expect(template).toContain("- **Needs you:** One line per action only the operator can take");
        expect(template).toContain("The closure report's `## ⚠ Needs you` block (step 11) lists the same items");
        // Written before steps 9-10, so it must anticipate the merge and a held push (UP-04 review R1).
        expect(template).toContain("This block is committed before steps 9–10 run");
        expect(template).toMatch(/`push_policy`[^\n]*`blocked`, or `guarded` in an autonomous run/);
        expect(template).toContain('Write "None" when nothing needs the operator.');
        expect(template).toContain("Never leave such an action only in `Blockers`, `Notes` or `Carry Forward`");
    });

    it("keeps every existing field name, in the existing order, and adds rather than renames", () => {
        const template = handoffTemplate();
        const fields = [...template.matchAll(/^- \*\*([^*]+):\*\*/gm)].map((m) => m[1]);
        expect(fields).toEqual([
            "Active task",
            "Last completed step",
            "Next concrete action",
            "Active files",
            "Branch",
            "Blockers",
            "Pending Verification",
            "Needs you",
            "Notes",
        ]);
    });
});

describe("open-session surfaces Needs you first (UP04-B-03)", () => {
    it("surfaces the field above Picking Up From Last Session", () => {
        expect(openSession).toContain("**The handoff's `Needs you` field comes first.**");
        expect(openSession).toContain(
            "surface every item in the `## ⚠ Needs you` block (see the output structure below) **above** `## Picking Up From Last Session`",
        );
    });

    it("places the Needs you rule inside Handoff Detection, before the consumed-marker write", () => {
        const detection = openSession.indexOf("**Handoff Detection (run before anything else):**");
        const rule = openSession.indexOf("**The handoff's `Needs you` field comes first.**");
        const marker = openSession.indexOf("Only then append `> ✓ Consumed: YYYY-MM-DD`");
        expect(detection).toBeGreaterThan(-1);
        expect(rule).toBeGreaterThan(detection);
        expect(rule).toBeLessThan(marker);
    });

    it("does not consume the handoff without surfacing it", () => {
        expect(openSession).toContain("Do not mark the handoff consumed until every listed item has been surfaced");
        expect(openSession).toContain("stays unconsumed, so the next open-session surfaces them again");
    });

    it("treats a handoff written before the field existed as None", () => {
        expect(openSession).toContain('A handoff written before this field existed has no `Needs you` line; treat it as "None".');
    });

    it("the output structure puts the Needs you block before Workspace Health Check", () => {
        const structure = openSession.indexOf("Then produce output in this exact structure:");
        const block = openSession.indexOf("## ⚠ Needs you", structure);
        const health = openSession.indexOf("## Workspace Health Check");
        expect(block).toBeGreaterThan(structure);
        expect(block).toBeLessThan(health);
    });

    it("keeps the existing handoff surfacing and Pending Verification text", () => {
        expect(openSession).toContain("surface it immediately as `## Picking Up From Last Session`");
        expect(openSession).toContain("include `Last completed step`, `Blockers`, and `Notes` verbatim alongside the rest");
        expect(openSession).toContain("actively re-check its current status");
    });
});

describe("root copies and the authoring standard (UP04-B-03)", () => {
    it("root copies match the canonical sources", async () => {
        expect(await readFile(join(ROOT_SPELLS, "spell-close-session.md"), "utf8")).toBe(closeSession);
        expect(await readFile(join(ROOT_SPELLS, "spell-open-session.md"), "utf8")).toBe(openSession);
    });

    it("the standard records that required actions survive the handoff", () => {
        expect(standards).toContain("writes\nthe open items into the handoff's `Needs you` field");
        expect(standards).toContain("does not mark the handoff consumed until it has.");
    });

    it("introduces no {UPPER_SNAKE} token in the new handoff text", () => {
        const newText = [
            closeSession.slice(closeSession.indexOf("- **Needs you:**"), closeSession.indexOf("- **Notes:**")),
            openSession.slice(
                openSession.indexOf("**The handoff's `Needs you` field comes first.**"),
                openSession.indexOf("**If the handoff's `Pending Verification` field"),
            ),
        ].join("\n");
        expect(newText).not.toMatch(/\{[A-Z][A-Z0-9_]*\}/);
    });
});

describe("the fresh-install handoff scaffold (UP-04 review R8)", () => {
    it("lists the Needs you field between Pending Verification and Notes", async () => {
        const scaffold = await readFile(
            join(process.cwd(), "src", "assets", "ai-context", "system-prompt-context.md"),
            "utf8",
        );
        const pending = scaffold.indexOf("- **Pending Verification:**");
        const needsYou = scaffold.indexOf("- **Needs you:** None.");
        const notes = scaffold.indexOf("- **Notes:**");
        expect(pending).toBeGreaterThan(-1);
        expect(needsYou).toBeGreaterThan(pending);
        expect(notes).toBeGreaterThan(needsYou);
    });
});
