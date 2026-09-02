import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    deriveStubTitle,
    expandFragment,
    MalformedFragmentMarkersError,
    MissingFrontmatterError,
    parsePromptFrontmatter,
    referencesFragment,
    renderClaudeCommandStub,
} from "../src/modules/spell-compiler.js";
import { runFragmentParity, runStubParity } from "../scripts/self-host-parity.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

const ASSETS_DIR = join(process.cwd(), "src", "assets");
const tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => removeFixtureDir(dir)),
    );
});

async function mkTempDir(prefix: string): Promise<string> {
    const dir = await fs.mkdtemp(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

describe("parsePromptFrontmatter", () => {
    it("parses name, description, and claude_description", () => {
        const content = `---
name: Spell — Example
description: Plain description
claude_description: Use PROACTIVELY for examples.
argument-hint: something
agent: agent
---

body`;
        const fm = parsePromptFrontmatter(content);
        expect(fm).toEqual({
            name: "Spell — Example",
            description: "Plain description",
            claudeDescription: "Use PROACTIVELY for examples.",
        });
    });

    it("leaves claudeDescription undefined when the field is absent", () => {
        const content = `---
name: Spell — Example
description: Plain description
---

body`;
        const fm = parsePromptFrontmatter(content);
        expect(fm.claudeDescription).toBeUndefined();
    });

    it("throws MissingFrontmatterError when there is no frontmatter block", () => {
        expect(() => parsePromptFrontmatter("just a body, no frontmatter")).toThrow(
            MissingFrontmatterError,
        );
    });

    it("throws MissingFrontmatterError when name is missing", () => {
        const content = `---
description: Plain description
---

body`;
        expect(() => parsePromptFrontmatter(content)).toThrow(MissingFrontmatterError);
    });

    it("throws MissingFrontmatterError when description is missing", () => {
        const content = `---
name: Spell — Example
---

body`;
        expect(() => parsePromptFrontmatter(content)).toThrow(MissingFrontmatterError);
    });
});

describe("deriveStubTitle", () => {
    it("strips the 'Spell — ' prefix", () => {
        expect(deriveStubTitle("Spell — Commit Work")).toBe("Commit Work");
    });

    it("leaves a name with no 'Spell — ' prefix unchanged (trimmed)", () => {
        expect(deriveStubTitle("Untitled Thing")).toBe("Untitled Thing");
    });
});

describe("renderClaudeCommandStub", () => {
    it("renders the exact thin-shim template, preferring claudeDescription", () => {
        const rendered = renderClaudeCommandStub("spell-example", {
            name: "Spell — Example",
            description: "Plain description",
            claudeDescription: "Use PROACTIVELY for examples.",
        });
        expect(rendered).toBe(`---
description: Use PROACTIVELY for examples.
---

# Example

Invoke the Arcane \`spell-example\` spell workflow.

See the full prompt at \`.github/prompts/spell-example.prompt.md\` for the complete workflow definition.

---

@.github/prompts/spell-example.prompt.md
`);
    });

    it("falls back to description when claudeDescription is absent", () => {
        const rendered = renderClaudeCommandStub("spell-example", {
            name: "Spell — Example",
            description: "Plain description",
        });
        expect(rendered).toContain("description: Plain description\n");
    });
});

describe("expandFragment / referencesFragment", () => {
    const FRAGMENT = "demo-fragment";

    it("replaces the marked span with the fragment content", () => {
        const content = [
            "before",
            `<!-- fragment:${FRAGMENT}:start -->`,
            "stale line",
            `<!-- fragment:${FRAGMENT}:end -->`,
            "after",
        ].join("\n");
        const expanded = expandFragment(content, FRAGMENT, "fresh line 1\nfresh line 2");
        expect(expanded).toBe(
            [
                "before",
                `<!-- fragment:${FRAGMENT}:start -->`,
                "fresh line 1",
                "fresh line 2",
                `<!-- fragment:${FRAGMENT}:end -->`,
                "after",
            ].join("\n"),
        );
    });

    it("preserves the indentation of BOTH the start and end markers", () => {
        // Regression: an earlier version sliced `after` from the end marker's
        // own text rather than its line start, silently dedenting the closing
        // marker to column 0 -- found live in 4 of 5 real consuming prompts.
        const content = [
            "1. Tracking configuration:",
            "   <!-- fragment:tracking-mode-declaration:start -->",
            "   stale",
            "   <!-- fragment:tracking-mode-declaration:end -->",
            "   - next bullet",
        ].join("\n");
        const expanded = expandFragment(
            content,
            "tracking-mode-declaration",
            "- `tracking_mode: internal | external`\n- `external_provider: ado | github | jira | other`",
        );
        expect(expanded).toBe(
            [
                "1. Tracking configuration:",
                "   <!-- fragment:tracking-mode-declaration:start -->",
                "   - `tracking_mode: internal | external`",
                "   - `external_provider: ado | github | jira | other`",
                "   <!-- fragment:tracking-mode-declaration:end -->",
                "   - next bullet",
            ].join("\n"),
        );
    });

    it("is idempotent -- expanding an already-expanded span twice yields the same result", () => {
        const content = [
            "  <!-- fragment:demo:start -->",
            "  old",
            "  <!-- fragment:demo:end -->",
        ].join("\n");
        const once = expandFragment(content, "demo", "new content");
        const twice = expandFragment(once, "demo", "new content");
        expect(twice).toBe(once);
    });

    it("returns content unchanged when the fragment is not referenced", () => {
        const content = "no markers here at all";
        expect(expandFragment(content, FRAGMENT, "irrelevant")).toBe(content);
        expect(referencesFragment(content, FRAGMENT)).toBe(false);
    });

    it("throws MalformedFragmentMarkersError when only the start marker exists", () => {
        const content = `<!-- fragment:${FRAGMENT}:start -->\nbody`;
        expect(() => expandFragment(content, FRAGMENT, "x")).toThrow(
            MalformedFragmentMarkersError,
        );
    });

    it("throws MalformedFragmentMarkersError when only the end marker exists", () => {
        const content = `body\n<!-- fragment:${FRAGMENT}:end -->`;
        expect(() => expandFragment(content, FRAGMENT, "x")).toThrow(
            MalformedFragmentMarkersError,
        );
    });

    it("throws MalformedFragmentMarkersError when markers are reversed", () => {
        const content = `<!-- fragment:${FRAGMENT}:end -->\nbody\n<!-- fragment:${FRAGMENT}:start -->`;
        expect(() => expandFragment(content, FRAGMENT, "x")).toThrow(
            MalformedFragmentMarkersError,
        );
    });

    it("throws MalformedFragmentMarkersError when the end marker's indentation differs from the start's (LH-06b)", () => {
        // A silent mis-indent here previously re-indented the fragment body to
        // the START's column while leaving a differently-indented END marker
        // sitting in the output -- a malformed span this function already
        // refuses to paper over for missing/reversed markers, just not yet
        // for this one. Verified against all 5 real tracking-mode-declaration
        // consumers (spell-full-cycle/open-session/plan/scope/suggest-feature)
        // before shipping this guard: none of them actually have this defect.
        const content = [
            "1. Tracking configuration:",
            "   <!-- fragment:tracking-mode-declaration:start -->",
            "   stale",
            "  <!-- fragment:tracking-mode-declaration:end -->",
            "   - next bullet",
        ].join("\n");
        expect(() =>
            expandFragment(content, "tracking-mode-declaration", "new content"),
        ).toThrow(MalformedFragmentMarkersError);
    });

    it("referencesFragment is true only for a file that has the start marker", () => {
        expect(referencesFragment(`<!-- fragment:${FRAGMENT}:start -->`, FRAGMENT)).toBe(true);
        expect(referencesFragment("nothing", FRAGMENT)).toBe(false);
    });
});

describe("runStubParity (ARC-039 third parity axis)", () => {
    async function fixture() {
        const dir = await mkTempDir("stub-parity-test-");
        const promptsDir = join(dir, ".github", "prompts");
        const commandsDir = join(dir, ".claude", "commands");
        await fs.mkdir(promptsDir, { recursive: true });
        await fs.mkdir(commandsDir, { recursive: true });
        await fs.writeFile(
            join(promptsDir, "spell-demo.prompt.md"),
            `---
name: Spell — Demo
description: A demo spell
claude_description: Use PROACTIVELY for demos.
---

body`,
            "utf8",
        );
        return { dir, promptsDir, commandsDir };
    }

    it("reports drift when the stub is missing entirely", async () => {
        const { dir } = await fixture();
        const result = await runStubParity("check", dir);
        expect(result.checked).toBe(1);
        expect(result.drifted).toEqual([".claude/commands/spell-demo.md"]);
    });

    it("reports drift when the stub exists but does not match the rendered form", async () => {
        const { dir, commandsDir } = await fixture();
        await fs.writeFile(join(commandsDir, "spell-demo.md"), "stale hand-authored content\n", "utf8");
        const result = await runStubParity("check", dir);
        expect(result.drifted).toEqual([".claude/commands/spell-demo.md"]);
    });

    it("--fix writes the generated stub, and a following --check passes", async () => {
        const { dir } = await fixture();
        const fixResult = await runStubParity("fix", dir);
        expect(fixResult.repaired).toEqual([".claude/commands/spell-demo.md"]);

        const checkResult = await runStubParity("check", dir);
        expect(checkResult.drifted).toEqual([]);
    });
});

describe("runFragmentParity (ARC-039 fourth parity axis)", () => {
    async function fixture() {
        const dir = await mkTempDir("fragment-parity-test-");
        const promptsDir = join(dir, ".github", "prompts");
        const fragmentsDir = join(promptsDir, "_fragments");
        await fs.mkdir(fragmentsDir, { recursive: true });
        await fs.writeFile(join(fragmentsDir, "demo-fragment.md"), "canonical fragment body\n", "utf8");
        return { dir, promptsDir, fragmentsDir };
    }

    it("skips a prompt that does not reference any fragment", async () => {
        const { dir, promptsDir } = await fixture();
        await fs.writeFile(join(promptsDir, "spell-plain.prompt.md"), "---\nname: Spell — Plain\ndescription: d\n---\n\nno fragments here", "utf8");
        const result = await runFragmentParity("check", dir);
        expect(result.checked).toBe(0);
        expect(result.drifted).toEqual([]);
    });

    it("reports drift when a referenced fragment's span is stale", async () => {
        const { dir, promptsDir } = await fixture();
        await fs.writeFile(
            join(promptsDir, "spell-uses-fragment.prompt.md"),
            "---\nname: Spell — Uses Fragment\ndescription: d\n---\n\n<!-- fragment:demo-fragment:start -->\nstale\n<!-- fragment:demo-fragment:end -->\n",
            "utf8",
        );
        const result = await runFragmentParity("check", dir);
        expect(result.checked).toBe(1);
        expect(result.drifted).toEqual([
            ".github/prompts/spell-uses-fragment.prompt.md (fragment: demo-fragment)",
        ]);
    });

    it("--fix expands the fragment in place, and a following --check passes", async () => {
        const { dir, promptsDir } = await fixture();
        const promptPath = join(promptsDir, "spell-uses-fragment.prompt.md");
        await fs.writeFile(
            promptPath,
            "---\nname: Spell — Uses Fragment\ndescription: d\n---\n\n<!-- fragment:demo-fragment:start -->\nstale\n<!-- fragment:demo-fragment:end -->\n",
            "utf8",
        );

        const fixResult = await runFragmentParity("fix", dir);
        expect(fixResult.repaired).toEqual([".github/prompts/spell-uses-fragment.prompt.md"]);

        const written = await fs.readFile(promptPath, "utf8");
        expect(written).toContain("canonical fragment body");
        expect(written).not.toContain("stale");

        const checkResult = await runFragmentParity("check", dir);
        expect(checkResult.drifted).toEqual([]);
    });
});

describe("all real spells are stub-parity consistent (regression guard)", () => {
    it("every .claude/commands/spell-*.md stub matches its prompt's rendered form", async () => {
        const result = await runStubParity("check", ASSETS_DIR);
        expect(result.checked).toBeGreaterThan(0);
        expect(result.drifted).toEqual([]);
    });

    it("every referenced fragment span is expanded and in sync", async () => {
        const result = await runFragmentParity("check", ASSETS_DIR);
        expect(result.drifted).toEqual([]);
    });

    it("the tracking-mode-declaration fragment is actually referenced by at least one real spell", async () => {
        // Guards against the fragment library silently becoming dead weight --
        // a fragment file with zero referencing prompts would pass every other
        // check here while doing nothing.
        const result = await runFragmentParity("check", ASSETS_DIR);
        expect(result.checked).toBeGreaterThanOrEqual(5);
    });
});
