import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { blockContaining, expectProseToContain, lineContaining } from "./helpers/prose.js";

// #333: the commit trailers for a runtime that withholds its model identifier.
// #332: spell-feedback's disclose prompt names the target repository, and
// --flush ends with a table of the issues it created.

const ARCANE = join(process.cwd(), "src", "assets", ".arcane");

let gitConventions: string;
let commitWork: string;
let feedback: string;

beforeAll(async () => {
    [gitConventions, commitWork, feedback] = await Promise.all([
        readFile(join(ARCANE, "governance", "git-conventions.md"), "utf8"),
        readFile(join(ARCANE, "spells", "spell-commit-work.md"), "utf8"),
        readFile(join(ARCANE, "spells", "spell-feedback.md"), "utf8"),
    ]);
});

describe("#333 trailers when the runtime withholds the model", () => {
    it("the trailer table defines Model: withheld and Model-Source: withheld-by-runtime", () => {
        const model = gitConventions.split("\n").find((l) => /^\|\s*`Model`\s*\|/.test(l)) ?? "";
        expect(model).toContain("`withheld`");
        const source = gitConventions.split("\n").find((l) => /^\|\s*`Model-Source`\s*\|/.test(l)) ?? "";
        expect(source).toContain("`withheld-by-runtime`");
        expect(source).not.toContain("currently the only defined value");
        expect(source).toContain("(`Agent` and `Provider` remain self-reported in that case)");
    });

    it("states that Agent and Provider stay required when the model is withheld", () => {
        const rule = blockContaining(gitConventions, "**When the runtime withholds the model.**");
        expectProseToContain(rule, "`Model: withheld` and `Model-Source: withheld-by-runtime`");
        expectProseToContain(rule, "`Agent` and `Provider` stay required");
        expectProseToContain(rule, "Never guess or infer a model name");
        // An agent that merely does not know its model must not fall back to `withheld`.
        expectProseToContain(rule, "Not knowing the model is not the same as being forbidden to say it");
        expectProseToContain(rule, "never writes `withheld` as a fallback");
    });

    it("spell-commit-work's trailer template offers the withheld pair by reference", () => {
        const model = lineContaining(commitWork, "   Model: [");
        expect(model).toContain("`withheld`");
        const source = lineContaining(commitWork, "   Model-Source: [");
        expect(source).toContain("withheld-by-runtime");
        expect(source).not.toContain("currently the only defined value");
    });
});

describe("#332 spell-feedback names the repository and reports what it filed", () => {
    it("the disclosure confirm names owner/repo and says a public issue will be created there", () => {
        const confirm = blockContaining(feedback, "3. **Disclosure confirm.**");
        expectProseToContain(confirm, "names the target repository in full (`owner/repo`, the resolved `{ARCANE_UPSTREAM_REPO}`)");
        expectProseToContain(confirm, "a public issue will be created there");
    });

    it("--flush ends with a table of every issue the run created", () => {
        const flush = feedback.slice(feedback.indexOf("## Flush Mode (`--flush`)"), feedback.indexOf("## Step 1"));
        expectProseToContain(flush, "end with a table of every issue the run created");
        expect(flush).toContain("| Issue | URL | `FEEDBACK.md` heading |");
        expectProseToContain(flush, "Write `No issues created` instead of the table when the run filed nothing.");
    });

    it("a filed item's queued marker becomes filed, so the next --flush cannot file it twice", () => {
        const file = blockContaining(feedback, "4. **File.**");
        expectProseToContain(file, "replace that item's `<!-- upstream: queued -->` marker");
        expectProseToContain(file, "`<!-- upstream: filed <issue URL> (<YYYY-MM-DD>) -->`");
        const fallback = blockContaining(feedback, "5. **Fallback.**");
        expectProseToContain(fallback, "unless the line already carries it");
    });
});
