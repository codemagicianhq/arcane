import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expandFragment, referencesFragment } from "../src/modules/spell-compiler.js";

// UP02-B-02 (ARC-049 decision 4, PRD D-01 / R-280b, #280): every spell that
// pushes reads `push_policy` before the push, through one shared ARC-039
// fragment. `guarded` asks the operator (and fails closed with no operator);
// `blocked` never attempts the push and names `spell unblock-push`.

const FRAGMENT = "push-policy-check";
const SPELLS = join(process.cwd(), "src", "assets", ".arcane", "spells");
const ROOT_SPELLS = join(process.cwd(), ".arcane", "spells");

/** Each pushing spell, and a string naming its push that the check must precede. */
const PUSHING_SPELLS: Record<string, string> = {
    "spell-commit-work": "run `git push origin <branch>`",
    "spell-create-pull-request": "run `git push -u origin <branch>`",
    "spell-ship": "Push the synced branch (e.g. `git push`)",
    "spell-sync-pull-request": "```bash\ngit push --force-with-lease\n```",
    "spell-close-session": "Commit approval is not merge approval.",
};

let fragment: string;
const spells: Record<string, string> = {};
const rootSpells: Record<string, string> = {};

beforeAll(async () => {
    fragment = await readFile(join(SPELLS, "_fragments", `${FRAGMENT}.md`), "utf8");
    for (const id of Object.keys(PUSHING_SPELLS)) {
        spells[id] = await readFile(join(SPELLS, `${id}.md`), "utf8");
        rootSpells[id] = await readFile(join(ROOT_SPELLS, `${id}.md`), "utf8");
    }
});

describe("the push-policy-check fragment", () => {
    it("reads push_policy from .arcane.json and treats absent as open", () => {
        expect(fragment).toContain("Read `push_policy` from the repository's `.arcane.json`");
        expect(fragment).toContain("An absent file or an absent field means `open`.");
        expect(fragment).toContain("**`open` or absent:** proceed with the push.");
    });

    it("guarded: states the policy, asks the operator, and fails closed with no operator", () => {
        expect(fragment).toContain("**`guarded`:** before the push, state the policy");
        expect(fragment).toContain("ask the operator for explicit confirmation");
        expect(fragment).toContain("**In an autonomous run with no operator to ask, do not push:**");
        expect(fragment).toContain("report the push as pending operator confirmation");
        expect(fragment).toContain("This fails closed.");
    });

    it("blocked: does not attempt the push, says why, and names spell unblock-push (interactive)", () => {
        expect(fragment).toContain("**`blocked`:** do not attempt the push. Say why");
        expect(fragment).toContain("`spell unblock-push`");
        expect(fragment).toContain("from an interactive terminal");
        expect(fragment).toContain("never work around the block");
    });

    it("covers force-with-lease pushes and remote branch deletions", () => {
        expect(fragment).toContain("a `--force-with-lease` push");
        expect(fragment).toContain("a remote branch deletion");
    });

    it("carries an ARC-023 enforcement annotation", () => {
        expect(fragment).toContain("Enforcement: structured spell gate (ARC-023)");
    });
});

describe.each(Object.keys(PUSHING_SPELLS))("%s embeds the push-policy check", (id) => {
    it("references the fragment with one marker pair", () => {
        const content = spells[id]!;
        expect(referencesFragment(content, FRAGMENT)).toBe(true);
        expect(content.split(`<!-- fragment:${FRAGMENT}:start -->`)).toHaveLength(2);
        expect(content.split(`<!-- fragment:${FRAGMENT}:end -->`)).toHaveLength(2);
    });

    it("carries the fragment fully expanded (re-expanding changes nothing)", () => {
        const content = spells[id]!;
        expect(expandFragment(content, FRAGMENT, fragment)).toBe(content);
    });

    it("names both behaviours inside the expanded span", () => {
        const content = spells[id]!;
        const start = content.indexOf(`<!-- fragment:${FRAGMENT}:start -->`);
        const end = content.indexOf(`<!-- fragment:${FRAGMENT}:end -->`);
        const span = content.slice(start, end);
        expect(span).toContain("`guarded`");
        expect(span).toContain("ask the operator for explicit confirmation");
        expect(span).toContain("`blocked`");
        expect(span).toContain("do not attempt the push");
        expect(span).toContain("`spell unblock-push`");
    });

    it("runs the check before the spell's push", () => {
        const content = spells[id]!;
        const checkIndex = content.indexOf(`<!-- fragment:${FRAGMENT}:start -->`);
        const pushIndex = content.indexOf(PUSHING_SPELLS[id]!);
        expect(checkIndex, `fragment marker not found in ${id}`).toBeGreaterThan(-1);
        expect(pushIndex, `push marker not found in ${id}`).toBeGreaterThan(-1);
        expect(checkIndex).toBeLessThan(pushIndex);
    });

    it("the regenerated root copy matches the canonical source", () => {
        expect(rootSpells[id]).toBe(spells[id]);
    });
});
