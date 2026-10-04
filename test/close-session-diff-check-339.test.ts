import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { blockContaining, expectNotNegated, expectProseToContain } from "./helpers/prose.js";

// #339: a closed issue is not evidence its change shipped. After a merge,
// close-session confirms each issue the PR closed or is linked to has its
// requested change in the merged diff, and reopens it when it does not.

const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");

let closeSession: string;
let createPr: string;

beforeAll(async () => {
    [closeSession, createPr] = await Promise.all([
        readFile(join(SPELLS, "spell-close-session.md"), "utf8"),
        readFile(join(SPELLS, "spell-create-pull-request.md"), "utf8"),
    ]);
});

describe("#339 close-session checks each closed issue's change is in the merged diff", () => {
    it("covers issues GitHub links to the PR, not only the ones its body names", () => {
        const step = blockContaining(closeSession, "Then confirm each issue the PR closed is closed");
        expectProseToContain(step, "`gh pr view <number> --json closingIssuesReferences`");
        expectProseToContain(step, "commit messages");
        expectProseToContain(step, "If GraphQL is unavailable, use REST");
        expectProseToContain(step, "\"does not close #N\" closes #N");
        expectNotNegated(step);
    });

    it("confirms the requested change is in the merged diff and reopens the issue when it is not", () => {
        const start = closeSession.indexOf("**A closed issue is not evidence its change shipped.**");
        expect(start).toBeGreaterThan(-1);
        const step = closeSession.slice(start, closeSession.indexOf("**Determine the isolation primitive first", start));
        expectProseToContain(step, "confirm the merged diff contains the change that issue asked for");
        expectProseToContain(step, "reopen the issue with a comment naming the merged PR");
        expectProseToContain(step, "under the closure report's `## ⚠ Needs you`");
        expectProseToContain(step, "`gh pr diff <number>`");
        expectProseToContain(step, "never counts as the change");
        expectProseToContain(step, "its state reason is `completed`");
        expectProseToContain(step, "Never report such an issue as done");
        expectNotNegated(step);
    });

    it("create-pull-request forbids a closing keyword before an issue the PR does not close", () => {
        const rule = blockContaining(createPr, "**Closing issues: one keyword per issue.**");
        expectProseToContain(rule, "Never put a closing keyword");
        expectProseToContain(rule, "\"does not close #N\" closes #N");
        expectProseToContain(rule, "Write `Refs #N` or `Part of #N` instead.");
    });

    it("create-pull-request's post-merge check points to the same rule", () => {
        const bullet = blockContaining(createPr, "**Issues the body closes:**");
        expectProseToContain(bullet, "and that the merged diff contains each issue's requested change");
    });
});
