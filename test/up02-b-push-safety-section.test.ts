import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP02-B-03 (ARC-049 decision 5, PRD D-01 / R-280b, #280): git-conventions.md
// gains the "Push safety" section that universal-agent-rules.md already
// pointed at, and that pointer now resolves to it.

const GOVERNANCE = join(process.cwd(), "src", "assets", ".arcane", "governance");

let gitConventions: string;
let universalRules: string;
let pushSafety: string;

/** The same slug rule scripts/check-citations.ts applies to `path#anchor` citations. */
function slugify(heading: string): string {
    return heading
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

beforeAll(async () => {
    [gitConventions, universalRules] = await Promise.all([
        readFile(join(GOVERNANCE, "git-conventions.md"), "utf8"),
        readFile(join(GOVERNANCE, "universal-agent-rules.md"), "utf8"),
    ]);
    const start = gitConventions.indexOf("\n## Push safety\n");
    expect(start).toBeGreaterThan(-1);
    const end = gitConventions.indexOf("\n## ", start + 1);
    pushSafety = gitConventions.slice(start, end);
});

describe("git-conventions.md: the Push safety section", () => {
    it("names all three push_policy values and the default", () => {
        for (const value of ["`open`", "`guarded`", "`blocked`"]) {
            expect(pushSafety).toContain(value);
        }
        expect(pushSafety).toContain("`push_policy`");
        expect(pushSafety).toMatch(/`open`[^|\n]*default/);
    });

    it("says how the policy is set, enforced, verified and lifted", () => {
        expect(pushSafety).toContain("`spell init`");
        expect(pushSafety).toContain("`spell update`");
        expect(pushSafety).toContain("--push-policy");
        expect(pushSafety).toContain("`spell block-push`");
        expect(pushSafety).toContain("`spell doctor`");
        expect(pushSafety).toContain("`spell unblock-push`");
        expect(pushSafety).toContain("interactive terminal");
    });

    it("lists every spell that reads the policy", () => {
        for (const spell of [
            "spell-commit-work",
            "spell-create-pull-request",
            "spell-ship",
            "spell-sync-pull-request",
            "spell-close-session",
        ]) {
            expect(pushSafety).toContain(`\`${spell}\``);
        }
        expect(pushSafety).toContain("_fragments/push-policy-check.md");
    });

    it("carries ARC-023 enforcement annotations", () => {
        expect(pushSafety).toContain("Enforcement: executable check (ARC-023)");
        expect(pushSafety).toContain("Enforcement: structured spell gate (ARC-023)");
    });
});

describe("universal-agent-rules.md: its push-safety reference resolves", () => {
    it("cites git-conventions.md#push-safety, and that anchor is a real heading", () => {
        const match = /`git-conventions\.md#([a-z0-9-]+)`/.exec(
            universalRules.slice(universalRules.indexOf("push-safety controls")),
        );
        expect(match).not.toBeNull();
        const anchor = match![1]!;
        expect(anchor).toBe("push-safety");
        const headings = [...gitConventions.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slugify(m[1]!.trim()));
        expect(headings).toContain(anchor);
    });
});
