import { afterEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectScannableFiles,
  createOrgTokenRules,
  dedupeFindings,
  resolveOrgTokens,
  resolvePrivateTokens,
  scanRepository,
} from "../scripts/org-token-lint.js";
import { resolveTsxCli, TSX_SKIP_REASON } from "./helpers/resolve-cli.js";
import { removeFixtureDir, createFixtureDir } from "./helpers/fixture-dir.js";
import { runGit } from "./helpers/git-fixture.js";

const tempDirs: string[] = [];
const TSX = resolveTsxCli();
if (!TSX) console.warn(`[org-token-lint.test.ts] ${TSX_SKIP_REASON}`);

async function createAssetsFixture(content: string) {
  const root = await fs.mkdtemp(join(tmpdir(), "org-token-gate-test-"));
  tempDirs.push(root);
  const assets = join(root, "assets");
  const prompts = join(assets, ".github", "prompts");
  await fs.mkdir(prompts, { recursive: true });
  await fs.writeFile(join(prompts, "fixture.prompt.md"), content, "utf8");
  return { assets, dist: join(root, "dist") };
}

async function createInstructionsFixture(content: string) {
  const root = await fs.mkdtemp(join(tmpdir(), "org-token-gate-test-"));
  tempDirs.push(root);
  const assets = join(root, "assets");
  const instructions = join(assets, ".github", "instructions");
  await fs.mkdir(instructions, { recursive: true });
  await fs.writeFile(join(instructions, "fixture.instructions.md"), content, "utf8");
  return { assets, dist: join(root, "dist") };
}

function runGate(
  assets: string,
  dist: string,
  configuredTokens = "Known Bad Organization,private-host.example",
) {
  return spawnSync(
    process.execPath,
    [TSX!, "scripts/copy-assets.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        ARCANE_SRC_ASSETS_DIR: assets,
        ARCANE_DIST_ASSETS_DIR: dist,
        ARCANE_ORG_TOKENS: configuredTokens,
        // Scan the fixture tree, not this repository.
        ARCANE_REPO_SCAN_DIR: assets,
      },
    },
  );
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => removeFixtureDir(dir)),
  );
});

describe.skipIf(!TSX)("org-token build gate", () => {
  it("derives a default organization rule from package metadata", async () => {
    const { assets, dist } = await createAssetsFixture(
      "Deploy Code Magician LLC configuration.\n",
    );

    const result = runGate(assets, dist, "");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".github/prompts/fixture.prompt.md:1");
    expect(result.stderr).not.toContain("Code Magician LLC");
  });

  it("fails the real asset gate and identifies a prompt containing a configured token", async () => {
    const { assets, dist } = await createAssetsFixture(
      "Deploy Known Bad Organization configuration.\n",
    );

    const result = runGate(assets, dist);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Org-token lint FAILED");
    expect(result.stderr).toContain(".github/prompts/fixture.prompt.md:1");
    expect(result.stderr).not.toContain("Known Bad Organization");
  });

  it("allows documented uppercase placeholders", async () => {
    const { assets, dist } = await createAssetsFixture(
      "Deploy {KNOWN_BAD_ORGANIZATION} to {PRIVATE_HOST}.\n",
    );

    const result = runGate(assets, dist);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("Org-token lint FAILED");
  });

  it("also scans .github/instructions/, not just .github/prompts/ (TODO.md gap, found 2026-08-31 BC-06, closed 2026-09-01)", async () => {
    const { assets, dist } = await createInstructionsFixture(
      "Deploy Known Bad Organization configuration.\n",
    );

    const result = runGate(assets, dist);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Org-token lint FAILED");
    expect(result.stderr).toContain(".github/instructions/fixture.instructions.md:1");
    expect(result.stderr).not.toContain("Known Bad Organization");
  });
});
// ─── Repository-wide privacy scan (ARC-031) ──────────────────────────────────
// The 0.16.0 leak reached npm because the gate only ever looked at
// src/assets/.github/prompts. Real venture names sitting in DECISIONS.md and a
// test fixture were never scanned. These tests pin the widened surface.

async function createRepoFixture(files: Record<string, string>) {
  const root = await fs.mkdtemp(join(tmpdir(), "org-token-repo-test-"));
  tempDirs.push(root);
  for (const [relPath, content] of Object.entries(files)) {
    const abs = join(root, relPath);
    await fs.mkdir(join(abs, ".."), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
  }
  return root;
}

describe("private-token repository scan", () => {
  it("separates private tokens from package-derived org tokens", async () => {
    const configured = "ordovica-real-name,another-venture";

    const privateOnly = await resolvePrivateTokens(configured);
    const combined = resolveOrgTokens(
      { author: "Code Magician LLC", repository: "https://github.com/codemagicianhq/arcane" },
      configured,
    );

    // The private list carries only what was configured — never the org's own
    // name, which legitimately appears throughout its own repository.
    expect(privateOnly).toEqual(["ordovica-real-name", "another-venture"]);
    expect(privateOnly).not.toContain("Code Magician LLC");
    expect(combined).toEqual(expect.arrayContaining(["Code Magician LLC", "codemagicianhq"]));
  });

  it("finds a private name in a decision record and a test file — the 0.16.0 blind spot", async () => {
    const root = await createRepoFixture({
      "DECISIONS.md": "Routes to ventures/realventure/IDEAS.md on first use.\n",
      "test/fixture.test.ts": 'await fs.mkdir(join(dir, "ventures", "realventure"));\n',
      "README.md": "Nothing sensitive here.\n",
    });

    const findings = await scanRepository(root, createOrgTokenRules(["realventure"]));

    expect(findings.map((f) => f.file).sort()).toEqual([
      "DECISIONS.md",
      "test/fixture.test.ts",
    ]);
    expect(findings.every((f) => f.line === 1)).toBe(true);
  });

  it("returns nothing when no private denylist is configured", async () => {
    const root = await createRepoFixture({ "DECISIONS.md": "realventure everywhere\n" });

    expect(await scanRepository(root, createOrgTokenRules(await resolvePrivateTokens("")))).toEqual([]);
  });

  it("skips generated and vendored directories", async () => {
    const root = await createRepoFixture({
      "src/real.ts": "// clean\n",
      "dist/bundled.js": "realventure\n",
      "node_modules/pkg/index.js": "realventure\n",
      "coverage/report.json": '{"x":"realventure"}\n',
    });

    const collected = await collectScannableFiles(root);
    const paths = collected.map(([, rel]) => rel);

    expect(paths).toContain("src/real.ts");
    expect(paths.some((p) => p.startsWith("dist/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("node_modules/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("coverage/"))).toBe(false);
  });

  it("still honours documented {UPPER_SNAKE} placeholders", async () => {
    const root = await createRepoFixture({
      "doc.md": "Use {REALVENTURE} as the placeholder.\n",
    });

    expect(await scanRepository(root, createOrgTokenRules(["realventure"]))).toEqual([]);
  });

  it("collapses duplicate findings reported at the same file and line", () => {
    const a = [{ file: "DECISIONS.md", line: 5, rule: "org-token-1" }];
    const b = [
      { file: "DECISIONS.md", line: 5, rule: "org-token-2" },
      { file: "README.md", line: 9, rule: "org-token-2" },
    ];

    expect(dedupeFindings(a, b)).toEqual([
      { file: "DECISIONS.md", line: 5, rule: "org-token-1" },
      { file: "README.md", line: 9, rule: "org-token-2" },
    ]);
  });
});

// ─── Local, out-of-repo denylist file (ARC-041, LH-12) ───────────────────────
// The CI secret is fine for CI, but nothing local could ever check content
// against it before a push -- confirmed live, twice, in this session's own
// history (RCA-001). These tests exercise the real function against a real
// file and a real git repo, the same "spawn/build the real thing" standard
// the rest of this file already holds itself to -- never mocking homedir()
// or git itself.

describe("resolvePrivateTokens: local out-of-repo file source (ARC-041)", () => {
  const savedEnv: Record<string, string | undefined> = {};

  function stashEnv(...keys: string[]) {
    for (const key of keys) savedEnv[key] = process.env[key];
  }

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("reads tokens from $ARCANE_ORG_TOKENS_FILE when ARCANE_ORG_TOKENS is unset", async () => {
    stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");
    delete process.env["ARCANE_ORG_TOKENS"];

    const dir = await fs.mkdtemp(join(tmpdir(), "org-token-local-file-"));
    tempDirs.push(dir);
    const filePath = join(dir, "org-tokens");
    await fs.writeFile(filePath, "ordovica-real-name,another-venture\n", "utf8");
    process.env["ARCANE_ORG_TOKENS_FILE"] = filePath;

    const tokens = await resolvePrivateTokens();
    expect(tokens).toEqual(["ordovica-real-name", "another-venture"]);
  });

  it("the env var wins over the file when both are set", async () => {
    stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");

    const dir = await fs.mkdtemp(join(tmpdir(), "org-token-local-file-"));
    tempDirs.push(dir);
    const filePath = join(dir, "org-tokens");
    await fs.writeFile(filePath, "from-the-file\n", "utf8");
    process.env["ARCANE_ORG_TOKENS_FILE"] = filePath;

    const tokens = await resolvePrivateTokens("from-the-env-var");
    expect(tokens).toEqual(["from-the-env-var"]);
  });

  it("returns an empty list, not a throw, when the file doesn't exist", async () => {
    stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");
    delete process.env["ARCANE_ORG_TOKENS"];
    process.env["ARCANE_ORG_TOKENS_FILE"] = join(tmpdir(), "definitely-does-not-exist-org-tokens");

    await expect(resolvePrivateTokens()).resolves.toEqual([]);
  });

  it("refuses a file that resolves inside a real repository, warns, and returns empty rather than reading it", async () => {
    stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");
    delete process.env["ARCANE_ORG_TOKENS"];

    const repoDir = await createFixtureDir("org-token-local-file-inside-repo");
    tempDirs.push(repoDir);
    runGit(repoDir, ["init", "-b", "main"]);
    const insidePath = join(repoDir, "org-tokens");
    await fs.writeFile(insidePath, "should-never-be-read\n", "utf8");
    process.env["ARCANE_ORG_TOKENS_FILE"] = insidePath;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      // Explicit cwd, pointed at the fixture repo -- resolvePrivateTokens()
      // resolves the "is this inside a repo" check relative to its cwd
      // argument (process.cwd() by default), not the target file's own
      // directory, so the fixture repo has to be named explicitly here.
      const tokens = await resolvePrivateTokens(undefined, repoDir);
      expect(tokens).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("resolves inside this repository"));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("does not refuse a file that merely resolves OUTSIDE any repository", async () => {
    stashEnv("ARCANE_ORG_TOKENS", "ARCANE_ORG_TOKENS_FILE");
    delete process.env["ARCANE_ORG_TOKENS"];

    // A plain mkdtemp directory (no `git init`) is not inside any repository
    // this process can see -- repoToplevel() itself resolves relative to
    // process.cwd(), so this proves the refusal is genuinely path-based, not
    // a blanket "always refuse a temp directory."
    const dir = await fs.mkdtemp(join(tmpdir(), "org-token-local-file-outside-"));
    tempDirs.push(dir);
    const filePath = join(dir, "org-tokens");
    await fs.writeFile(filePath, "a-real-outside-token\n", "utf8");
    process.env["ARCANE_ORG_TOKENS_FILE"] = filePath;

    const tokens = await resolvePrivateTokens();
    expect(tokens).toEqual(["a-real-outside-token"]);
  });
});
