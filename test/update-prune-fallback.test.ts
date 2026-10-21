import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { resolveOrphan } from "../src/commands/update.js";
import { isUneditedTrackedFile } from "../src/modules/git.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// #358: an orphan with no recorded hash (a component installed before
// ARC-038 recorded hashes) could never be pruned, and the message named no
// next step. With --prune, git evidence stands in for the hash: the file is
// tracked, clean, and exactly one commit ever touched it. Anything less is
// reported with the manual route.

const FILE = ".github/skills/bmad-example/SKILL.md";
const IDENTITY = ["-c", "user.name=Arcane Test", "-c", "user.email=test@example.invalid"];

let repo: string;

function commit(message: string): void {
  runGit(repo, [...IDENTITY, "commit", "-q", "--no-gpg-sign", "-m", message]);
}

async function writeTracked(content: string, message: string): Promise<void> {
  await fs.mkdir(join(repo, ".github/skills/bmad-example"), { recursive: true });
  await fs.writeFile(join(repo, FILE), content);
  runGit(repo, ["add", "--", FILE]);
  commit(message);
}

beforeEach(async () => {
  repo = await createFixtureDir("prune-fallback-repo");
  runGit(repo, ["init", "-q"]);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await removeFixtureDir(repo);
});

// Every test here spawns three to six git processes against a real fixture, so
// they carry the suite's heavy budget rather than the 5 s default.
describe("isUneditedTrackedFile — git evidence for a hash-less orphan", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("is unedited when the file is tracked, clean, and one commit touched it", async () => {
    await writeTracked("installed content\n", "install component");
    expect((await isUneditedTrackedFile(repo, FILE)).verdict).toBe("unedited");
  });

  it("is edited when a second commit touched it", async () => {
    await writeTracked("installed content\n", "install component");
    await writeTracked("installed content\nOPERATOR EDIT\n", "edit it");
    const result = await isUneditedTrackedFile(repo, FILE);
    expect(result.verdict).toBe("edited");
    expect(result.detail).toContain("2 commits");
  });

  it("is edited when the working tree differs from the commit", async () => {
    await writeTracked("installed content\n", "install component");
    await fs.appendFile(join(repo, FILE), "uncommitted\n");
    expect((await isUneditedTrackedFile(repo, FILE)).verdict).toBe("edited");
  });

  it("is untracked when git does not know the file", async () => {
    await fs.mkdir(join(repo, ".github/skills/bmad-example"), { recursive: true });
    await fs.writeFile(join(repo, FILE), "never added\n");
    expect((await isUneditedTrackedFile(repo, FILE)).verdict).toBe("untracked");
  });

  // Review F3: a shallow clone shows every file with one reachable commit, so
  // the count alone would call an edited file unedited.
  it("is unknown in a shallow clone, whose history is truncated", async () => {
    await writeTracked("installed content\n", "install component");
    await writeTracked("installed content\nOPERATOR EDIT\n", "edit it");
    const parent = await createFixtureDir("prune-fallback-shallow");
    try {
      const url = "file:///" + repo.replace(/\\/g, "/").replace(/^\//, "");
      runGit(parent, ["clone", "-q", "--depth", "1", url, join(parent, "clone")]);
      const result = await isUneditedTrackedFile(join(parent, "clone"), FILE);
      expect(result.verdict).toBe("unknown");
      expect(result.detail).toContain("shallow");
    } finally {
      await removeFixtureDir(parent);
    }
  });

  it("is unknown outside a git repository", async () => {
    const plain = await createFixtureDir("prune-fallback-plain");
    try {
      await fs.writeFile(join(plain, "file.md"), "x");
      expect((await isUneditedTrackedFile(plain, "file.md")).verdict).toBe("unknown");
    } finally {
      await removeFixtureDir(plain);
    }
  });
});

describe("resolveOrphan with no recorded hash (#358)", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("prunes a tracked, clean orphan whose history has one commit (AC-358-1)", async () => {
    await writeTracked("installed content\n", "install component");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(await resolveOrphan(repo, FILE, undefined, true)).toBe("pruned");

    await expect(fs.access(join(repo, FILE))).rejects.toThrow();
    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toContain("Pruned orphaned file");
  });

  it("keeps an orphan edited in a later commit, naming the manual route (AC-358-2)", async () => {
    await writeTracked("installed content\n", "install component");
    await writeTracked("installed content\nOPERATOR EDIT\n", "edit it");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(await resolveOrphan(repo, FILE, undefined, true)).toBe("reported");

    await expect(fs.access(join(repo, FILE))).resolves.toBeUndefined();
    const output = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("no recorded hash");
    expect(output).toContain("git rm");
    expect(output).toContain(".arcane.json");
    expect(output).toContain(FILE);
  });

  it("keeps an orphan with uncommitted changes (AC-358-2)", async () => {
    await writeTracked("installed content\n", "install component");
    await fs.appendFile(join(repo, FILE), "uncommitted\n");
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(await resolveOrphan(repo, FILE, undefined, true)).toBe("reported");
    await expect(fs.access(join(repo, FILE))).resolves.toBeUndefined();
  });

  it("keeps an untracked orphan (AC-358-2)", async () => {
    await fs.mkdir(join(repo, ".github/skills/bmad-example"), { recursive: true });
    await fs.writeFile(join(repo, FILE), "never added\n");
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(await resolveOrphan(repo, FILE, undefined, true)).toBe("reported");
    await expect(fs.access(join(repo, FILE))).resolves.toBeUndefined();
  });

  it("keeps the file and names the manual route outside a git repository (AC-358-3)", async () => {
    const plain = await createFixtureDir("prune-fallback-plain-orphan");
    try {
      await fs.writeFile(join(plain, "orphan.md"), "content\n");
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      expect(await resolveOrphan(plain, "orphan.md", undefined, true)).toBe("reported");

      await expect(fs.access(join(plain, "orphan.md"))).resolves.toBeUndefined();
      expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toContain("git rm");
    } finally {
      await removeFixtureDir(plain);
    }
  });

  it("still reports without deleting when prune is false", async () => {
    await writeTracked("installed content\n", "install component");
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(await resolveOrphan(repo, FILE, undefined, false)).toBe("reported");
    await expect(fs.access(join(repo, FILE))).resolves.toBeUndefined();
  });
});
