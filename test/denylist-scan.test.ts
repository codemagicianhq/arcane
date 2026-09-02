import { describe, it, expect, afterEach } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createDenylistRules,
  scanFile,
  collectScannableFiles,
  scanRepository,
  dedupeFindings,
  escapeRegExp,
} from "../src/modules/denylist-scan.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await removeFixtureDir(dir);
  dir = undefined;
});

describe("escapeRegExp", () => {
  it("escapes every regex metacharacter literally", () => {
    expect(escapeRegExp("a.b+c*d?e^f$g{h}i(j)k|l[m]n\\o")).toBe(
      "a\\.b\\+c\\*d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o",
    );
  });

  it("createDenylistRules uses it, so a metacharacter-bearing token matches only literally", () => {
    const rules = createDenylistRules(["a.b+c"], "test");
    expect(rules[0]!.pattern.test("xa.b+cx")).toBe(false); // word-boundary excludes flanked-by-word-char
    expect(rules[0]!.pattern.test("x a.b+c x")).toBe(true);
  });
});

describe("createDenylistRules", () => {
  it("labels rules with the given prefix, 1-indexed", () => {
    const rules = createDenylistRules(["alpha", "beta"], "custom");
    expect(rules.map((r) => r.label)).toEqual(["custom-1", "custom-2"]);
  });

  it("matches on word boundaries only", () => {
    const [rule] = createDenylistRules(["cat"], "t");
    expect(rule!.pattern.test("the cat sat")).toBe(true);
    expect(rule!.pattern.test("category")).toBe(false);
    expect(rule!.pattern.test("concatenate")).toBe(false);
  });
});

describe("collectScannableFiles: extensions parameter", () => {
  it("defaults to text extensions", async () => {
    dir = await createFixtureDir("denylist-scan-default-ext");
    await writeFile(join(dir, "a.md"), "hello", "utf8");
    await writeFile(join(dir, "b.png"), "binary", "utf8");
    const files = await collectScannableFiles(dir);
    expect(files.map(([, rel]) => rel)).toEqual(["a.md"]);
  });

  it("accepts a custom extension list (ward's binary-asset use case)", async () => {
    dir = await createFixtureDir("denylist-scan-custom-ext");
    await writeFile(join(dir, "a.md"), "hello", "utf8");
    await writeFile(join(dir, "b.png"), "binary", "utf8");
    const files = await collectScannableFiles(dir, dir, [".png"]);
    expect(files.map(([, rel]) => rel)).toEqual(["b.png"]);
  });

  it("skips generated/VCS/dependency directories regardless of extension list", async () => {
    dir = await createFixtureDir("denylist-scan-skip-dirs");
    await mkdir(join(dir, "node_modules"), { recursive: true });
    await writeFile(join(dir, "node_modules", "a.md"), "hello", "utf8");
    await writeFile(join(dir, "top.md"), "hello", "utf8");
    const files = await collectScannableFiles(dir);
    expect(files.map(([, rel]) => rel)).toEqual(["top.md"]);
  });

  it("skips .claude (nested worktree checkouts would otherwise duplicate every finding)", async () => {
    dir = await createFixtureDir("denylist-scan-skip-claude");
    await mkdir(join(dir, ".claude", "worktrees", "some-branch"), { recursive: true });
    await writeFile(join(dir, ".claude", "worktrees", "some-branch", "a.md"), "hello", "utf8");
    await writeFile(join(dir, "top.md"), "hello", "utf8");
    const files = await collectScannableFiles(dir);
    expect(files.map(([, rel]) => rel)).toEqual(["top.md"]);
  });
});

describe("scanFile", () => {
  it("strips {UPPER_SNAKE} placeholders before matching", async () => {
    dir = await createFixtureDir("denylist-scan-placeholder");
    const file = join(dir, "a.md");
    await writeFile(file, "see {REPO_ORG} for details", "utf8");
    const rules = createDenylistRules(["REPO_ORG"], "t");
    const findings = await scanFile(file, "a.md", rules);
    expect(findings).toEqual([]);
  });

  it("reports 1-indexed line numbers", async () => {
    dir = await createFixtureDir("denylist-scan-lineno");
    const file = join(dir, "a.md");
    await writeFile(file, "line one\nline two has flaggedterm here\nline three", "utf8");
    const rules = createDenylistRules(["flaggedterm"], "t");
    const findings = await scanFile(file, "a.md", rules);
    expect(findings).toEqual([{ file: "a.md", line: 2, rule: "t-1" }]);
  });
});

describe("scanRepository", () => {
  it("returns nothing when no rules are configured, without walking the tree", async () => {
    dir = await createFixtureDir("denylist-scan-no-rules");
    await writeFile(join(dir, "a.md"), "anything", "utf8");
    expect(await scanRepository(dir, [])).toEqual([]);
  });

  it("drops a file whose display path contains an excluded prefix, without reading it", async () => {
    dir = await createFixtureDir("denylist-scan-exclude-prefixes");
    await mkdir(join(dir, "test"), { recursive: true });
    await writeFile(join(dir, "test", "fixture.md"), "flaggedterm", "utf8");
    await writeFile(join(dir, "real.md"), "flaggedterm", "utf8");
    const rules = createDenylistRules(["flaggedterm"], "t");

    const findings = await scanRepository(dir, rules, undefined, ["test/fixture.md"]);

    expect(findings).toEqual([{ file: "real.md", line: 1, rule: "t-1" }]);
  });
});

describe("dedupeFindings", () => {
  it("collapses duplicates at the same file:line, keeping the first", () => {
    const a = [{ file: "x.md", line: 1, rule: "r-1" }];
    const b = [{ file: "x.md", line: 1, rule: "r-2" }, { file: "y.md", line: 1, rule: "r-2" }];
    expect(dedupeFindings(a, b)).toEqual([
      { file: "x.md", line: 1, rule: "r-1" },
      { file: "y.md", line: 1, rule: "r-2" },
    ]);
  });
});
