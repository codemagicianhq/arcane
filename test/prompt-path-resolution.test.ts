import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const ASSETS = join(process.cwd(), "src", "assets");
const PROMPTS = join(ASSETS, ".github", "prompts");

describe("canonical prompt document paths", () => {
    it("uses only the installed governance layer", async () => {
        const promptNames = (await fs.readdir(PROMPTS)).filter((name) => name.endsWith(".md"));
        const violations: string[] = [];

        for (const name of promptNames) {
            const content = await fs.readFile(join(PROMPTS, name), "utf8");
            if (/\.\.\/\.\.\/(?:governance\/|agents\/agent-policies\.md|naming-conventions\.md)/.test(content)) {
                violations.push(name);
            }
            if (/\[\[(?:governance\/|agents\/agent-policies)/.test(content)) {
                violations.push(name);
            }
        }

        expect(violations).toEqual([]);
    });

    it("resolves every linked framework governance file offline", async () => {
        const promptNames = (await fs.readdir(PROMPTS)).filter((name) => name.endsWith(".md"));
        const missing = new Set<string>();

        for (const name of promptNames) {
            const content = await fs.readFile(join(PROMPTS, name), "utf8");
            for (const match of content.matchAll(/\.\.\/\.\.\/\.arcane\/governance\/([a-z0-9-]+\.md)/g)) {
                const relativePath = join(".arcane", "governance", match[1]!);
                try {
                    await fs.access(join(ASSETS, relativePath));
                } catch {
                    missing.add(relativePath.replace(/\\/g, "/"));
                }
            }
        }

        expect([...missing]).toEqual([]);
    });
});