import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP03-C-03 (PRD R-274, #274): spell-close-session routes each Lessons
// Learned entry — framework-shaped -> FEEDBACK.md queued for upstream,
// product idea -> spell-save-idea, repo-local -> journal only — with one
// batch confirmation, no public write, append-only books, and a --no-route
// opt-out. spell-feedback documents the entry point.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");
const ROOT_SPELLS = join(process.cwd(), ".arcane", "spells");

let closeSession: string;
let feedback: string;
let step2b: string;

beforeAll(async () => {
    closeSession = await readFile(join(SPELLS, "spell-close-session.md"), "utf8");
    feedback = await readFile(join(SPELLS, "spell-feedback.md"), "utf8");
    const start = closeSession.indexOf("\n2b. **Lesson routing");
    const end = closeSession.indexOf("\n3. **", start + 1);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    step2b = closeSession.slice(start, end);
});

describe("spell-close-session step 2b: lesson routing", () => {
    it("comes right after step 2's journal (which writes Lessons Learned) and before step 3", () => {
        const s2 = closeSession.indexOf("\n2. **Update today's journal file**");
        const s2b = closeSession.indexOf("\n2b. **Lesson routing");
        const s3 = closeSession.indexOf("\n3. **Update [DECISIONS.md]");
        expect(s2).toBeGreaterThan(-1);
        expect(s2).toBeLessThan(s2b);
        expect(s2b).toBeLessThan(s3);
        expect(closeSession.slice(s2, s2b)).toContain("`### Lessons Learned`");
    });

    it("classifies each lesson into the three classes and their destinations", () => {
        expect(step2b).toContain("**Framework-shaped:**");
        expect(step2b).toContain("Destination: `FEEDBACK.md`, queued for upstream.");
        expect(step2b).toContain("**Product idea:**");
        expect(step2b).toContain("Destination: `spell-save-idea`.");
        expect(step2b).toContain("**Repo-local:**");
        expect(step2b).toContain("Destination: the journal only.");
        // The framework-shaped definition is spell-feedback's, cited rather than re-invented.
        expect(step2b).toContain("This is `spell-feedback` Step 3's definition.");
    });

    it("asks one batch confirmation and fails closed without an explicit yes", () => {
        expect(step2b).toContain("**Show one batch proposal and ask once.**");
        expect(step2b).toContain("`Route these lessons? (yes / edit / skip)`");
        expect(step2b).toContain("Route nothing before an explicit `yes`.");
        expect(step2b).toContain(
            "A timeout, a cancellation, a delegated or host-generated response, or assent given to something else is not approval.",
        );
        expect(step2b).toContain("Neither is an autonomous run with no operator to ask.");
    });

    it("appends framework-shaped lessons in spell-feedback's block format, queued", () => {
        expect(step2b).toContain("in `spell-feedback`'s Step 5 block format");
        expect(step2b).toContain("`## Feedback — <the spell or doc the lessons concern");
        expect(step2b).toContain("each line ending with `<!-- upstream: queued -->`");
        expect(step2b).toContain("Create the file with a `# Feedback Log` header first if it is missing.");
    });

    it("hands product ideas to spell-save-idea by name", () => {
        expect(step2b).toContain("hand each one to `spell-save-idea`");
    });

    it("never writes publicly", () => {
        expect(step2b).toContain("**No public write from this step.**");
        expect(step2b).toContain("never runs `gh issue create`");
        expect(step2b).toContain("never runs `spell-feedback`'s Step 6 filing flow");
        expect(step2b).toContain("The `yes` above approves local appends only.");
    });

    it("keeps the books append-only", () => {
        expect(step2b).toContain("**Append-only.**");
        expect(step2b).toContain("Never edit, reorder, or remove an existing entry in either.");
    });

    it("offers a --no-route opt-out that leaves lessons in the journal only", () => {
        expect(step2b).toContain("when the invocation includes `--no-route`");
        expect(step2b).toContain("`Lesson routing skipped (--no-route)`");
    });

    it("carries an ARC-023 enforcement annotation for the gate and for each advisory rule", () => {
        expect(step2b).toContain(
            "Enforcement: structured spell gate (ARC-023) — nothing is routed without the one explicit batch `yes`",
        );
        expect(step2b).toContain("The no-public-write and append-only rules are explicitly advisory prose");
    });

    it("reports the routing in the closure output", () => {
        const out = closeSession.slice(closeSession.indexOf("## Lesson Routing"));
        expect(out).toContain("Each lesson from step 2b with its class and where it went");
        expect(out).toContain("`Lesson routing skipped (--no-route)`");
    });

    it("keeps the push-policy fragment span intact", () => {
        expect(closeSession).toContain("<!-- fragment:push-policy-check:start -->");
        expect(closeSession).toContain("<!-- fragment:push-policy-check:end -->");
    });

    it("root copy matches the canonical source", async () => {
        expect(await readFile(join(ROOT_SPELLS, "spell-close-session.md"), "utf8")).toBe(closeSession);
    });
});

describe("spell-feedback documents the close-session entry point", () => {
    const section = () => {
        const start = feedback.indexOf("## Entry Point — Lessons Routed by `spell-close-session`");
        const end = feedback.indexOf("\n## ", start + 1);
        expect(start).toBeGreaterThan(-1);
        return feedback.slice(start, end);
    };

    it("names close-session's lesson-routing step and the queued block it writes", () => {
        const s = section();
        expect(s).toContain("`spell-close-session`'s lesson-routing step (step 2b)");
        expect(s).toContain("as a single block in Step 5's format");
        expect(s).toContain("`<!-- upstream: queued -->`");
    });

    it("routes those entries through --flush and Step 6's disclose gate, with no shortcut", () => {
        const s = section();
        expect(s).toContain("That step never files anything publicly.");
        expect(s).toContain("`spell-feedback --flush` picks them up with every other queued item");
        expect(s).toContain("A routed entry gets no shortcut");
    });

    it("carries an ARC-023 enforcement annotation", () => {
        expect(section()).toMatch(/\*\*Enforcement: structured spell gate \(ARC-023\) — Step 6's literal `disclose` confirmation/);
    });

    it("flush mode still scans for the same queued marker close-session writes", () => {
        expect(feedback).toContain("Scan `FEEDBACK.md` for improvement items marked `<!-- upstream: queued -->`");
    });

    it("root copy matches the canonical source", async () => {
        expect(await readFile(join(ROOT_SPELLS, "spell-feedback.md"), "utf8")).toBe(feedback);
    });
});
