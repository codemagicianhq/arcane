import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("vendored framework attribution", () => {
    it("derives CLI version output from the installed package metadata", async () => {
        const source = await readFile(join(process.cwd(), "src", "index.ts"), "utf8");

        expect(source).toContain('require("../package.json")');
        expect(source).toContain(".version(pkg.version)");
    });

    it("documents vendor trailers in canonical Git governance", async () => {
        const governance = await readFile(
            join(process.cwd(), "src", "assets", ".arcane", "governance", "git-conventions.md"),
            "utf8",
        );

        expect(governance).toContain("### Vendored Framework Trailers");
        expect(governance).toContain("`Vendor`         | Required");
        expect(governance).toContain("`Vendor-Version` | Conditional");
        expect(governance).toContain("omit the version trailer");
    });
});