import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// UP03-D-01 (PRD D-02 / R-282, #282): spell-arcane-version and
// spell-open-session tell an agent in an AI harness (no interactive terminal)
// to collect skipped manifest answers through the harness and re-run
// `spell update` with the flags the CLI printed — never an unanswered flag,
// never a push_policy loosening (ARC-034 decision 6, ARC-049 decision 6).
//
// The flag names are read from src/index.ts, not restated here, so a renamed
// or removed CLI flag fails this test instead of leaving the spells stale.

const ROOT = process.cwd();
const SPELL_DIRS = [
    join(ROOT, "src", "assets", ".arcane", "spells"),
    join(ROOT, ".arcane", "spells"),
];
const SPELL_IDS = ["spell-open-session", "spell-arcane-version"] as const;

/** Where each spell's harness guidance starts and ends. */
const GUIDANCE_BOUNDS: Record<(typeof SPELL_IDS)[number], [string, string]> = {
    "spell-open-session": [
        "**Setup questions from an AI harness (no interactive terminal",
        "**If either axis shows drift",
    ],
    "spell-arcane-version": [
        "### Setup questions from an AI harness (no interactive terminal",
        "## Step 3",
    ],
};

const OPTION = /\.option\(\s*"--([a-z][a-z-]*)/g;
const FLAG = /--[a-z][a-z-]*/g;

function optionsIn(source: string): Set<string> {
    return new Set([...source.matchAll(OPTION)].map((m) => `--${m[1]}`));
}

/** The text between the first `start` at or after `from` and the next `end`. */
function sliceBetween(text: string, start: string, end: string, from = 0): string {
    const i = text.indexOf(start, from);
    if (i < 0) throw new Error(`marker not found: ${start}`);
    const j = text.indexOf(end, i + start.length);
    if (j < 0) throw new Error(`end marker not found after ${start}: ${end}`);
    return text.slice(i, j);
}

let manifestFlags: Set<string>;
const commandFlags: Record<"init" | "update", Set<string>> = {
    init: new Set(),
    update: new Set(),
};
let updateSource: string;
const spells: { label: string; id: (typeof SPELL_IDS)[number]; text: string }[] = [];

beforeAll(async () => {
    const index = await readFile(join(ROOT, "src", "index.ts"), "utf8");
    manifestFlags = optionsIn(sliceBetween(index, "function withManifestFlags(", "\n}\n"));
    for (const name of ["init", "update"] as const) {
        // The top-level `spell init` / `spell update` (the first declaration;
        // `spell agents init` is declared later in the file).
        const own = optionsIn(sliceBetween(index, `.command("${name}")`, ".action("));
        commandFlags[name] = new Set([...own, ...manifestFlags]);
    }
    updateSource = (await readFile(join(ROOT, "src", "commands", "update.ts"), "utf8")).replace(/\\`/g, "`");
    for (const dir of SPELL_DIRS) {
        for (const id of SPELL_IDS) {
            spells.push({ label: `${dir.slice(ROOT.length + 1)}/${id}.md`, id, text: await readFile(join(dir, `${id}.md`), "utf8") });
        }
    }
});

describe("the CLI flag surface read from src/index.ts", () => {
    it("finds the manifest-question flags on both init and update", () => {
        // Sanity check on the parse itself, so an empty set cannot pass vacuously.
        expect(manifestFlags.size).toBeGreaterThanOrEqual(4);
        expect(manifestFlags.has("--push-policy")).toBe(true);
        for (const flag of manifestFlags) {
            expect(commandFlags.init.has(flag)).toBe(true);
            expect(commandFlags.update.has(flag)).toBe(true);
        }
    });
});

describe.each(SPELL_IDS)("%s harness setup guidance", (id) => {
    const copies = () => spells.filter((s) => s.id === id);

    it("is present in the source and the root copy", () => {
        expect(copies()).toHaveLength(SPELL_DIRS.length);
        for (const { text } of copies()) {
            const [start] = GUIDANCE_BOUNDS[id];
            expect(text).toContain(start);
        }
    });

    it("names every manifest-question flag the CLI defines, and no flag init/update lack", () => {
        const known = new Set([...commandFlags.init, ...commandFlags.update]);
        for (const { label, text } of copies()) {
            const [start, end] = GUIDANCE_BOUNDS[id];
            const guidance = sliceBetween(text, start, end);
            const quoted = new Set(guidance.match(FLAG) ?? []);
            for (const flag of quoted) {
                expect(known.has(flag), `${label} quotes ${flag}, not defined on init or update in src/index.ts`).toBe(true);
            }
            for (const flag of manifestFlags) {
                expect(quoted.has(flag), `${label} omits ${flag}`).toBe(true);
            }
        }
    });

    it("quotes only flags that exist on the `spell init` / `spell update` command it names", () => {
        for (const { label, text } of copies()) {
            for (const m of text.matchAll(/spell (init|update)\b([^`\n]*)/g)) {
                const command = m[1] as "init" | "update";
                for (const flag of m[2].match(FLAG) ?? []) {
                    expect(
                        commandFlags[command].has(flag),
                        `${label}: "spell ${command}${m[2]}" uses ${flag}, not defined on \`spell ${command}\` in src/index.ts`,
                    ).toBe(true);
                }
            }
        }
    });

    it("quotes the skip message the CLI actually prints", () => {
        const printed = "— no interactive terminal. Run `spell update` from a terminal, or answer by flags:";
        expect(updateSource).toContain(printed);
        for (const { text } of copies()) expect(text).toContain(printed);
    });

    it("sends answers through the harness, never guesses, and never loosens push_policy by flag", () => {
        for (const { text } of copies()) {
            const [start, end] = GUIDANCE_BOUNDS[id];
            const guidance = sliceBetween(text, start, end);
            expect(guidance).toContain("through the harness's own question UI");
            expect(guidance).toContain("Re-run `spell update` with the flags the CLI printed");
            expect(guidance).toContain("Never pass a flag the operator did not answer.");
            expect(guidance).toContain("Never loosen `push_policy` by flag.");
            expect(guidance).toContain("only ever `spell unblock-push`, which the operator runs from an interactive");
            expect(guidance).toMatch(/ARC-034 decision 6, ARC-049 decision 6/);
        }
    });
});
