import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    CANONICAL_SPELLS_DIR,
    CLIENT_SHIM_PATHS,
    canonicalSpellPath,
    deriveStubTitle,
    expandFragment,
    extractFrontmatterBlock,
    InvalidSkillNameError,
    isClientShimPath,
    MalformedFragmentMarkersError,
    MissingFrontmatterError,
    parsePromptFrontmatter,
    referencesFragment,
    renderClaudeCommandStub,
    renderCodexSkill,
    renderCopilotPromptShim,
} from "../src/modules/spell-compiler.js";
import { runFragmentParity, runShimParity, SHIM_TARGETS } from "../scripts/self-host-parity.js";
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

const EXAMPLE_CANONICAL = `---
name: Spell — Example
description: Plain description
claude_description: Use PROACTIVELY for examples.
argument-hint: something
agent: agent
---

# Example

body`;

describe("parsePromptFrontmatter", () => {
    it("parses name, description, and claude_description", () => {
        const fm = parsePromptFrontmatter(EXAMPLE_CANONICAL);
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

describe("the path contract (ARC-045 / CS-03)", () => {
    it("canonicalSpellPath places a spell under .arcane/spells/<id>.md", () => {
        expect(CANONICAL_SPELLS_DIR).toBe(".arcane/spells");
        expect(canonicalSpellPath("spell-plan")).toBe(".arcane/spells/spell-plan.md");
    });

    it("isClientShimPath recognizes exactly the three generated shim shapes", () => {
        expect(isClientShimPath(".github/prompts/spell-plan.prompt.md")).toBe(true);
        expect(isClientShimPath(".claude/commands/spell-plan.md")).toBe(true);
        expect(isClientShimPath(".agents/skills/spell-plan/SKILL.md")).toBe(true);
        // Either slash style, with or without a leading ./ -- registry paths
        // and manifest paths both reach it.
        expect(isClientShimPath(".github\\prompts\\spell-plan.prompt.md")).toBe(true);
        expect(isClientShimPath("./.claude/commands/spell-a1-b2.md")).toBe(true);
    });

    it("the shim path generators and the shim matcher agree, one pair per client -- and the parity targets use the generators", () => {
        // A renamed shim shape that updates the generator but not the matcher
        // (or vice versa) would silently send customized files of that shape
        // back into update's merge path; this binds the two.
        for (const [client, path] of Object.entries(CLIENT_SHIM_PATHS)) {
            expect(isClientShimPath(path("spell-plan")), client).toBe(true);
        }
        expect(SHIM_TARGETS.map((target) => target.relativePath("spell-x"))).toEqual([
            CLIENT_SHIM_PATHS.copilot("spell-x"),
            CLIENT_SHIM_PATHS.claude("spell-x"),
            CLIENT_SHIM_PATHS.codex("spell-x"),
        ]);
    });

    it("isClientShimPath is false for the canonical source and every near miss", () => {
        expect(isClientShimPath(".arcane/spells/spell-plan.md")).toBe(false);
        expect(isClientShimPath(".arcane/governance/git-conventions.md")).toBe(false);
        expect(isClientShimPath(".github/prompts/README.prompt.md")).toBe(false);
        expect(isClientShimPath(".github/prompts/spell-plan.md")).toBe(false);
        expect(isClientShimPath(".claude/commands/spell-Plan.md")).toBe(false);
        expect(isClientShimPath(".agents/skills/spell-plan/README.md")).toBe(false);
        expect(isClientShimPath(".github/instructions/agent-output.instructions.md")).toBe(false);
    });
});

describe("extractFrontmatterBlock", () => {
    it("returns the block verbatim, closing fence and newline included", () => {
        expect(extractFrontmatterBlock(EXAMPLE_CANONICAL)).toBe(`---
name: Spell — Example
description: Plain description
claude_description: Use PROACTIVELY for examples.
argument-hint: something
agent: agent
---
`);
    });

    it("normalizes CRLF to LF and supplies a trailing newline when the fence ends the file", () => {
        const crlf = "---\r\nname: Spell — X\r\ndescription: d\r\n---";
        expect(extractFrontmatterBlock(crlf)).toBe("---\nname: Spell — X\ndescription: d\n---\n");
    });

    it("throws MissingFrontmatterError when there is no block", () => {
        expect(() => extractFrontmatterBlock("no block here")).toThrow(MissingFrontmatterError);
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

describe("renderCopilotPromptShim", () => {
    it("copies the canonical frontmatter verbatim and adds the link-plus-instruction body", () => {
        expect(renderCopilotPromptShim("spell-example", EXAMPLE_CANONICAL)).toBe(`---
name: Spell — Example
description: Plain description
claude_description: Use PROACTIVELY for examples.
argument-hint: something
agent: agent
---

This prompt is the Arcane \`spell-example\` spell. Read [\`.arcane/spells/spell-example.md\`](../../.arcane/spells/spell-example.md) and follow it as the complete workflow.
`);
    });

    it("carries none of the canonical body -- a shim has no authored prose (ARC-045 decision 2)", () => {
        const rendered = renderCopilotPromptShim("spell-example", EXAMPLE_CANONICAL);
        expect(rendered).not.toContain("# Example");
        expect(rendered).not.toContain("\nbody");
    });

    it("renders LF output from a CRLF canonical file", () => {
        const crlf = EXAMPLE_CANONICAL.replace(/\n/g, "\r\n");
        expect(renderCopilotPromptShim("spell-example", crlf)).toBe(
            renderCopilotPromptShim("spell-example", EXAMPLE_CANONICAL),
        );
    });

    it("refuses a canonical file the frontmatter parser rejects, so a bad source cannot ship as a shim", () => {
        expect(() => renderCopilotPromptShim("spell-example", "---\ndescription: d\n---\n\nbody")).toThrow(
            MissingFrontmatterError,
        );
    });
});

describe("renderClaudeCommandStub", () => {
    it("renders the exact thin-shim template over the canonical path, preferring claudeDescription", () => {
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

See the full prompt at \`.arcane/spells/spell-example.md\` for the complete workflow definition.

---

@.arcane/spells/spell-example.md
`);
    });

    it("never references the pre-CS-03 Copilot location", () => {
        const rendered = renderClaudeCommandStub("spell-example", {
            name: "Spell — Example",
            description: "Plain description",
        });
        expect(rendered).not.toContain(".github/prompts");
        expect(rendered).not.toContain(".prompt.md");
    });

    it("falls back to description when claudeDescription is absent", () => {
        const rendered = renderClaudeCommandStub("spell-example", {
            name: "Spell — Example",
            description: "Plain description",
        });
        expect(rendered).toContain("description: Plain description\n");
    });

    it("renders over an explicit canonical reference (the user tier's absolute store path) when one is given", () => {
        const abs = "C:/Users/someone/.arcane/spells/spell-example.md";
        const rendered = renderClaudeCommandStub(
            "spell-example",
            { name: "Spell — Example", description: "Plain description" },
            abs,
        );
        expect(rendered).toContain(`See the full prompt at \`${abs}\` for the complete workflow definition.`);
        expect(rendered).toContain(`\n@${abs}\n`);
        expect(rendered).not.toContain("@.arcane/spells/");
    });

    it("quotes the @ include when the reference contains whitespace (Claude Code's documented form for such paths)", () => {
        const spaced = "C:/Users/Jane Doe/.arcane/spells/spell-example.md";
        const rendered = renderClaudeCommandStub(
            "spell-example",
            { name: "Spell — Example", description: "Plain description" },
            spaced,
        );
        expect(rendered).toContain(`\n@"${spaced}"\n`);
        expect(rendered).toContain(`See the full prompt at \`${spaced}\``);
        // The common, whitespace-free case is unchanged.
        const plain = renderClaudeCommandStub("spell-example", { name: "Spell — Example", description: "d" });
        expect(plain).toContain("\n@.arcane/spells/spell-example.md\n");
        expect(plain).not.toContain('@"');
    });
});

describe("renderCodexSkill", () => {
    it("renders the exact SKILL.md template over the canonical path, preferring claudeDescription", () => {
        const rendered = renderCodexSkill(
            "spell-example",
            {
                name: "Spell — Example",
                description: "Plain description",
                claudeDescription: "Use PROACTIVELY for examples.",
            },
            canonicalSpellPath("spell-example"),
        );
        expect(rendered).toBe(`---
name: spell-example
description: Use PROACTIVELY for examples.
---

This skill is the Arcane \`spell-example\` spell. Read \`.arcane/spells/spell-example.md\` and follow it as the complete workflow.
`);
    });

    it("falls back to description when claudeDescription is absent", () => {
        const rendered = renderCodexSkill(
            "spell-example",
            { name: "Spell — Example", description: "Plain description" },
            canonicalSpellPath("spell-example"),
        );
        expect(rendered).toContain("description: Plain description\n");
    });

    it("throws InvalidSkillNameError for an id with uppercase or invalid characters", () => {
        expect(() =>
            renderCodexSkill(
                "Spell_Example",
                { name: "n", description: "d" },
                canonicalSpellPath("Spell_Example"),
            ),
        ).toThrow(InvalidSkillNameError);
    });

    it("accepts a lowercase-hyphenated id", () => {
        expect(() =>
            renderCodexSkill(
                "spell-a1-b2",
                { name: "n", description: "d" },
                canonicalSpellPath("spell-a1-b2"),
            ),
        ).not.toThrow();
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

describe("runShimParity (ARC-039 / ARC-045: three generated shims over one canonical source)", () => {
    const DEMO_CANONICAL = `---
name: Spell — Demo
description: A demo spell
claude_description: Use PROACTIVELY for demos.
---

body`;

    async function fixture() {
        const dir = await mkTempDir("shim-parity-test-");
        const spellsDir = join(dir, ".arcane", "spells");
        await fs.mkdir(spellsDir, { recursive: true });
        await fs.writeFile(join(spellsDir, "spell-demo.md"), DEMO_CANONICAL, "utf8");
        return { dir, spellsDir };
    }

    const EXPECTED_SHIMS = [
        ".github/prompts/spell-demo.prompt.md",
        ".claude/commands/spell-demo.md",
        ".agents/skills/spell-demo/SKILL.md",
    ];

    it("checks one canonical id against all three targets, in the declared target order", async () => {
        const { dir } = await fixture();
        const result = await runShimParity("check", dir);
        expect(SHIM_TARGETS.map((t) => t.label)).toEqual(["copilot", "claude", "codex"]);
        expect(result.checked).toBe(3);
        expect(result.drifted).toEqual(EXPECTED_SHIMS);
    });

    it("reports only the shim that exists but does not match the rendered form", async () => {
        const { dir } = await fixture();
        await runShimParity("fix", dir);
        await fs.writeFile(join(dir, ".claude", "commands", "spell-demo.md"), "stale hand-authored content\n", "utf8");
        const result = await runShimParity("check", dir);
        expect(result.drifted).toEqual([".claude/commands/spell-demo.md"]);
    });

    it("--fix writes all three generated shims, and a following --check passes", async () => {
        const { dir } = await fixture();
        const fixResult = await runShimParity("fix", dir);
        expect(fixResult.repaired).toEqual(EXPECTED_SHIMS);

        const copilot = await fs.readFile(join(dir, ".github", "prompts", "spell-demo.prompt.md"), "utf8");
        expect(copilot).toBe(renderCopilotPromptShim("spell-demo", DEMO_CANONICAL));
        const skill = await fs.readFile(join(dir, ".agents", "skills", "spell-demo", "SKILL.md"), "utf8");
        expect(skill).toContain("Read `.arcane/spells/spell-demo.md`");

        const checkResult = await runShimParity("check", dir);
        expect(checkResult.drifted).toEqual([]);
    });

    it("enumerates ids from the canonical folder only -- fragments, stray files and orphan shims are not spells", async () => {
        const { dir, spellsDir } = await fixture();
        await fs.mkdir(join(spellsDir, "_fragments"), { recursive: true });
        await fs.writeFile(join(spellsDir, "_fragments", "demo-fragment.md"), "fragment\n", "utf8");
        await fs.writeFile(join(spellsDir, "README.md"), "not a spell\n", "utf8");
        // A stray pre-move filename in the canonical folder must not become the
        // malformed id `spell-stray.prompt` and crash the run in renderCodexSkill.
        await fs.writeFile(join(spellsDir, "spell-stray.prompt.md"), "---\nname: n\ndescription: d\n---\n", "utf8");
        await fs.mkdir(join(dir, ".claude", "commands"), { recursive: true });
        await fs.writeFile(join(dir, ".claude", "commands", "spell-orphan.md"), "no canonical source\n", "utf8");

        const result = await runShimParity("check", dir);
        expect(result.checked).toBe(3);
        expect(result.drifted).toEqual(EXPECTED_SHIMS);
    });
});

describe("runFragmentParity (ARC-039 fragment parity axis, on the canonical folder)", () => {
    async function fixture() {
        const dir = await mkTempDir("fragment-parity-test-");
        const spellsDir = join(dir, ".arcane", "spells");
        const fragmentsDir = join(spellsDir, "_fragments");
        await fs.mkdir(fragmentsDir, { recursive: true });
        await fs.writeFile(join(fragmentsDir, "demo-fragment.md"), "canonical fragment body\n", "utf8");
        return { dir, spellsDir, fragmentsDir };
    }

    it("skips a spell that does not reference any fragment", async () => {
        const { dir, spellsDir } = await fixture();
        await fs.writeFile(join(spellsDir, "spell-plain.md"), "---\nname: Spell — Plain\ndescription: d\n---\n\nno fragments here", "utf8");
        const result = await runFragmentParity("check", dir);
        expect(result.checked).toBe(0);
        expect(result.drifted).toEqual([]);
    });

    it("reports drift when a referenced fragment's span is stale", async () => {
        const { dir, spellsDir } = await fixture();
        await fs.writeFile(
            join(spellsDir, "spell-uses-fragment.md"),
            "---\nname: Spell — Uses Fragment\ndescription: d\n---\n\n<!-- fragment:demo-fragment:start -->\nstale\n<!-- fragment:demo-fragment:end -->\n",
            "utf8",
        );
        const result = await runFragmentParity("check", dir);
        expect(result.checked).toBe(1);
        expect(result.drifted).toEqual([
            ".arcane/spells/spell-uses-fragment.md (fragment: demo-fragment)",
        ]);
    });

    it("--fix expands the fragment in place, and a following --check passes", async () => {
        const { dir, spellsDir } = await fixture();
        const spellPath = join(spellsDir, "spell-uses-fragment.md");
        await fs.writeFile(
            spellPath,
            "---\nname: Spell — Uses Fragment\ndescription: d\n---\n\n<!-- fragment:demo-fragment:start -->\nstale\n<!-- fragment:demo-fragment:end -->\n",
            "utf8",
        );

        const fixResult = await runFragmentParity("fix", dir);
        expect(fixResult.repaired).toEqual([".arcane/spells/spell-uses-fragment.md"]);

        const written = await fs.readFile(spellPath, "utf8");
        expect(written).toContain("canonical fragment body");
        expect(written).not.toContain("stale");

        const checkResult = await runFragmentParity("check", dir);
        expect(checkResult.drifted).toEqual([]);
    });
});

describe("all real spells are shim-parity consistent (regression guard)", () => {
    it("every Copilot prompt, Claude command and Codex skill matches its canonical source's rendered form", async () => {
        const result = await runShimParity("check", ASSETS_DIR);
        expect(result.checked).toBeGreaterThan(0);
        expect(result.checked % SHIM_TARGETS.length).toBe(0);
        expect(result.drifted).toEqual([]);
    });

    it("no shipped Copilot prompt carries a body of its own any more (ARC-045 decision 2)", async () => {
        const promptsDir = join(ASSETS_DIR, ".github", "prompts");
        const names = (await fs.readdir(promptsDir)).filter((n) => n.startsWith("spell-") && n.endsWith(".prompt.md"));
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) {
            const content = await fs.readFile(join(promptsDir, name), "utf8");
            const body = content.slice(extractFrontmatterBlock(content).length).trim().split("\n");
            expect(body, name).toHaveLength(1);
            expect(body[0]).toContain("and follow it as the complete workflow.");
        }
    });

    it("every referenced fragment span is expanded and in sync", async () => {
        const result = await runFragmentParity("check", ASSETS_DIR);
        expect(result.drifted).toEqual([]);
    });

    it("the tracking-mode-declaration fragment is actually referenced by at least one real spell", async () => {
        // Guards against the fragment library silently becoming dead weight --
        // a fragment file with zero referencing spells would pass every other
        // check here while doing nothing.
        const result = await runFragmentParity("check", ASSETS_DIR);
        expect(result.checked).toBeGreaterThanOrEqual(5);
    });
});
