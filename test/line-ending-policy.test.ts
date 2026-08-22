import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runGit } from "./helpers/git-fixture.js";

const tempDirs: string[] = [];
const POLICY_PATH = join(process.cwd(), ".gitattributes");

async function writeFixtureFile(root: string, path: string, content: string | Uint8Array) {
    const target = join(root, path);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.writeFile(target, content);
}

async function createFixture(autoCrlf: boolean) {
    const root = await fs.mkdtemp(join(tmpdir(), "line-ending-policy-test-"));
    tempDirs.push(root);
    await fs.copyFile(POLICY_PATH, join(root, ".gitattributes"));
    await writeFixtureFile(root, "docs/sample.md", "first line\nsecond line\n");
    await writeFixtureFile(
        root,
        "assets/sample.png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    await writeFixtureFile(
        root,
        "assets/sample.gif",
        new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0xff]),
    );

    runGit(root, ["init", "-b", "main"]);
    runGit(root, ["config", "user.name", "Arcane Tests"]);
    runGit(root, ["config", "user.email", "arcane-tests@example.invalid"]);
    runGit(root, ["config", "core.autocrlf", String(autoCrlf)]);
    runGit(root, ["add", "-A"]);
    runGit(root, ["commit", "-m", "test: seed line ending fixture"]);
    return root;
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
    );
});

describe.each([true, false])("repository line-ending policy (core.autocrlf=%s)", (autoCrlf) => {
    it("keeps text LF, binary assets opaque, and review output signal-only", async () => {
        const root = await createFixture(autoCrlf);
        const pngBefore = await fs.readFile(join(root, "assets", "sample.png"));
        const gifBefore = await fs.readFile(join(root, "assets", "sample.gif"));

        await fs.rm(join(root, "docs"), { recursive: true });
        await fs.rm(join(root, "assets"), { recursive: true });
        runGit(root, ["checkout", "--", "docs/sample.md", "assets/sample.png", "assets/sample.gif"]);

        const text = await fs.readFile(join(root, "docs", "sample.md"));
        expect(text.includes(0x0d)).toBe(false);
        expect(runGit(root, ["check-attr", "text", "eol", "--", "docs/sample.md"]))
            .toContain("docs/sample.md: eol: lf");
        expect(runGit(root, ["check-attr", "text", "--", "assets/sample.png"]))
            .toBe("assets/sample.png: text: unset");
        expect(runGit(root, ["check-attr", "text", "--", "assets/sample.gif"]))
            .toBe("assets/sample.gif: text: unset");
        await expect(fs.readFile(join(root, "assets", "sample.png"))).resolves.toEqual(pngBefore);
        await expect(fs.readFile(join(root, "assets", "sample.gif"))).resolves.toEqual(gifBefore);
        expect(runGit(root, ["status", "--porcelain"])).toBe("");

        await fs.appendFile(join(root, "docs", "sample.md"), "real content change\n", "utf8");
        expect(runGit(root, ["diff", "--name-only"])).toBe("docs/sample.md");
    });
});
