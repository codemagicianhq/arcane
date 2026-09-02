import { describe, it, expect, afterEach } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runWard, VENDOR_IDENTIFIER_PROTECTION_LIST } from "../src/modules/ward.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await removeFixtureDir(dir);
  dir = undefined;
});

describe("runWard: user-supplied terms (leak scanning)", () => {
  it("flags a user-supplied term found in content as a leak, not protected", async () => {
    dir = await createFixtureDir("ward-user-term");
    await writeFile(join(dir, "a.md"), "mentions realventure here", "utf8");
    const report = await runWard(dir, { terms: ["realventure"] });
    expect(report.findings).toEqual([
      expect.objectContaining({ file: "a.md", category: "leak" }),
    ]);
  });

  it("finds nothing when the term is absent", async () => {
    dir = await createFixtureDir("ward-no-hit");
    await writeFile(join(dir, "a.md"), "nothing to see here", "utf8");
    const report = await runWard(dir, { terms: ["realventure"] });
    expect(report.findings).toEqual([]);
  });
});

describe("runWard: mandatory vendor-identifier protection list", () => {
  it("is always active even with no user terms configured", async () => {
    dir = await createFixtureDir("ward-vendor-always-on");
    await writeFile(join(dir, "a.md"), "calls the claude API", "utf8");
    const report = await runWard(dir); // no terms option at all
    expect(report.findings).toEqual([
      expect.objectContaining({ file: "a.md", category: "protected-vendor-identifier" }),
    ]);
  });

  it("categorizes a vendor-identifier hit distinctly from a plain leak", async () => {
    dir = await createFixtureDir("ward-vendor-vs-leak");
    await writeFile(join(dir, "a.md"), "realventure uses claude", "utf8");
    const report = await runWard(dir, { terms: ["realventure"] });
    const categories = report.findings.map((f) => f.category).sort();
    expect(categories).toEqual(["leak", "protected-vendor-identifier"]);
  });

  it("the protection list is non-empty and includes well-known model identifiers", () => {
    expect(VENDOR_IDENTIFIER_PROTECTION_LIST.length).toBeGreaterThan(0);
    expect(VENDOR_IDENTIFIER_PROTECTION_LIST).toContain("claude");
  });
});

describe("runWard: filename scanning", () => {
  it("flags a denylisted term appearing in a filename, not just content", async () => {
    dir = await createFixtureDir("ward-filename");
    await writeFile(join(dir, "realventure-notes.md"), "unrelated content", "utf8");
    const report = await runWard(dir, { terms: ["realventure"] });
    expect(report.findings).toEqual([
      expect.objectContaining({ file: "realventure-notes.md", line: 0 }),
    ]);
  });
});

describe("runWard: grep-proof media flagging", () => {
  it("flags a binary media file for manual review rather than silently clearing it", async () => {
    dir = await createFixtureDir("ward-media-flag");
    await writeFile(join(dir, "logo.png"), "not real png bytes", "utf8");
    const report = await runWard(dir, { terms: ["realventure"] });
    expect(report.mediaFlags).toEqual([
      expect.objectContaining({ file: "logo.png" }),
    ]);
  });

  it("does not flag ordinary text files as grep-proof media", async () => {
    dir = await createFixtureDir("ward-media-no-false-flag");
    await writeFile(join(dir, "notes.md"), "hello", "utf8");
    const report = await runWard(dir);
    expect(report.mediaFlags).toEqual([]);
  });
});

describe("runWard: substring-hazard exclusions", () => {
  it("suppresses a specific false-positive context without weakening the general match", async () => {
    dir = await createFixtureDir("ward-exclusion");
    await writeFile(
      join(dir, "a.md"),
      "the acme provision clause applies here\nacme also appears unrelated elsewhere",
      "utf8",
    );
    const withoutExclusion = await runWard(dir, { terms: ["acme"] });
    expect(withoutExclusion.findings).toHaveLength(2);

    const withExclusion = await runWard(dir, {
      terms: ["acme"],
      exclusions: [{ rule: "ward-term-1", context: "provision clause", reason: "known legal boilerplate" }],
    });
    expect(withExclusion.findings).toHaveLength(1);
    expect(withExclusion.findings[0]!.line).toBe(2);
  });
});

describe("runWard: skips generated/VCS/dependency directories", () => {
  it("does not scan node_modules content or filenames", async () => {
    dir = await createFixtureDir("ward-skip-node-modules");
    await mkdir(join(dir, "node_modules"), { recursive: true });
    await writeFile(join(dir, "node_modules", "realventure.md"), "realventure", "utf8");
    const report = await runWard(dir, { terms: ["realventure"] });
    expect(report.findings).toEqual([]);
  });
});
