import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  validateTargetPath,
  copyFile,
  copyDirectory,
  fileMatchesHash,
  hashContent,
  hashFile,
  ensureDir,
  removeWithin,
} from "../src/modules/copier.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

describe("copier", () => {
  let tempDir: string;
  let srcFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "copier-test-"));
    srcFile = join(tempDir, "source.txt");
    await fs.writeFile(srcFile, "hello world");
  });

  afterEach(async () => {
    await removeFixtureDir(tempDir);
  });

  // ─── validateTargetPath ───────────────────────────────────────────────────

  describe("validateTargetPath", () => {
    it("throws for ../../../etc/passwd", () => {
      expect(() =>
        validateTargetPath(tempDir, "../../../etc/passwd"),
      ).toThrow();
    });

    it("throws for foo/../../bar (escapes one level above target)", () => {
      expect(() => validateTargetPath(tempDir, "foo/../../bar")).toThrow();
    });

    it("throws for ../../secret", () => {
      expect(() => validateTargetPath(tempDir, "../../secret")).toThrow();
    });

    it("throws for ../sibling (single-level escape)", () => {
      expect(() => validateTargetPath(tempDir, "../sibling")).toThrow();
    });

    it("accepts docs/file.md", () => {
      expect(() => validateTargetPath(tempDir, "docs/file.md")).not.toThrow();
    });

    it("accepts sub/dir/file.md", () => {
      expect(() =>
        validateTargetPath(tempDir, "sub/dir/file.md"),
      ).not.toThrow();
    });

    it("accepts a top-level filename", () => {
      expect(() => validateTargetPath(tempDir, "file.md")).not.toThrow();
    });
  });

  // ─── Line endings and the recorded hash (TODO.md, "a recorded file hash is byte-exact") ──

  describe("hashContent / fileMatchesHash", () => {
    const lf = "# Title\n\nline one\nline two\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    const cr = lf.replace(/\n/g, "\r");

    it("hashes CRLF, lone-CR and LF versions of the same text identically", () => {
      expect(hashContent(crlf)).toBe(hashContent(lf));
      expect(hashContent(cr)).toBe(hashContent(lf));
      expect(hashContent(Buffer.from(crlf, "utf-8"))).toBe(hashContent(lf));
    });

    it("is the plain SHA-256 for content that already uses LF", () => {
      expect(hashContent(lf)).toBe(createHash("sha256").update(lf).digest("hex"));
    });

    it("still tells genuinely different content apart", () => {
      expect(hashContent(lf)).not.toBe(hashContent(`${lf}extra\n`));
      expect(hashContent(lf)).not.toBe(hashContent(lf.replace("one", "1")));
    });

    it("hashFile normalizes too, and copyFile records the normalized digest", async () => {
      const crlfFile = join(tempDir, "crlf.md");
      await fs.writeFile(crlfFile, crlf);
      expect(await hashFile(crlfFile)).toBe(hashContent(lf));
      expect(await copyFile(crlfFile, tempDir, "copied.md")).toBe(hashContent(lf));
    });

    it("fileMatchesHash accepts the normalized digest and, for records written before normalization, the raw-bytes digest", async () => {
      const crlfFile = join(tempDir, "legacy.md");
      await fs.writeFile(crlfFile, crlf);
      const rawCrlfDigest = createHash("sha256").update(crlf).digest("hex");
      expect(await fileMatchesHash(crlfFile, hashContent(lf))).toBe(true); // current rule
      expect(await fileMatchesHash(crlfFile, rawCrlfDigest)).toBe(true); // pre-normalization record
      expect(await fileMatchesHash(crlfFile, hashContent(`${lf}edit\n`))).toBe(false);
    });

    it("a file git rewrote from CRLF to LF still matches the hash recorded at install", async () => {
      const file = join(tempDir, "rewritten.md");
      await fs.writeFile(file, crlf);
      const recorded = await hashFile(file);
      await fs.writeFile(file, lf); // what `text=auto eol=lf` does on the next checkout
      expect(await fileMatchesHash(file, recorded)).toBe(true);
    });
  });

  // ─── removeWithin (TODO.md, "two delete paths apply manifest-controlled paths without the traversal guard") ──

  describe("removeWithin", () => {
    it("deletes a file inside the target directory and tolerates a missing one", async () => {
      await fs.writeFile(join(tempDir, "victim.md"), "x");
      await removeWithin(tempDir, "victim.md");
      await expect(fs.access(join(tempDir, "victim.md"))).rejects.toThrow();
      await expect(removeWithin(tempDir, "victim.md")).resolves.toBeUndefined();
    });

    it("refuses a path that resolves outside the target directory and deletes nothing", async () => {
      const outside = await fs.mkdtemp(join(tmpdir(), "copier-outside-"));
      try {
        const victim = join(outside, "keep-me.md");
        await fs.writeFile(victim, "precious");
        const escaping = `../${outside.split(/[\\/]/).pop()}/keep-me.md`;
        await expect(removeWithin(tempDir, escaping)).rejects.toThrow(/Path traversal detected/);
        await expect(fs.readFile(victim, "utf-8")).resolves.toBe("precious");
      } finally {
        await removeFixtureDir(outside);
      }
    });
  });

  // ─── ensureDir ────────────────────────────────────────────────────────────

  describe("ensureDir", () => {
    it("creates a directory", async () => {
      const dir = join(tempDir, "new-dir");
      await ensureDir(dir);
      const stat = await fs.stat(dir);
      expect(stat.isDirectory()).toBe(true);
    });

    it("creates nested directories recursively", async () => {
      const dir = join(tempDir, "a", "b", "c");
      await ensureDir(dir);
      const stat = await fs.stat(dir);
      expect(stat.isDirectory()).toBe(true);
    });

    it("does not throw if directory already exists", async () => {
      await expect(ensureDir(tempDir)).resolves.not.toThrow();
    });
  });

  // ─── copyFile ─────────────────────────────────────────────────────────────

  describe("copyFile", () => {
    it("copies a file to the target", async () => {
      await copyFile(srcFile, tempDir, "dest.txt");
      const content = await fs.readFile(join(tempDir, "dest.txt"), "utf-8");
      expect(content).toBe("hello world");
    });

    it("creates parent directories as needed", async () => {
      await copyFile(srcFile, tempDir, "subdir/nested/dest.txt");
      const content = await fs.readFile(
        join(tempDir, "subdir/nested/dest.txt"),
        "utf-8",
      );
      expect(content).toBe("hello world");
    });

    it("throws if destination exists and force is not set", async () => {
      await fs.writeFile(join(tempDir, "exists.txt"), "existing");
      await expect(copyFile(srcFile, tempDir, "exists.txt")).rejects.toThrow();
    });

    it("overwrites if force is true", async () => {
      await fs.writeFile(join(tempDir, "exists.txt"), "existing");
      await copyFile(srcFile, tempDir, "exists.txt", { force: true });
      const content = await fs.readFile(join(tempDir, "exists.txt"), "utf-8");
      expect(content).toBe("hello world");
    });

    it("does not throw for non-existent destination with default opts", async () => {
      await expect(
        copyFile(srcFile, tempDir, "newfile.txt"),
      ).resolves.not.toThrow();
    });

    it("returns the copied content's SHA-256 hex digest (ARC-038)", async () => {
      const hash = await copyFile(srcFile, tempDir, "dest.txt");
      expect(hash).toBe(createHash("sha256").update("hello world").digest("hex"));
    });

    it("rejects path traversal", async () => {
      await expect(
        copyFile(srcFile, tempDir, "../escape.txt"),
      ).rejects.toThrow();
    });

    it("rejects path traversal in nested form", async () => {
      await expect(
        copyFile(srcFile, tempDir, "foo/../../escape.txt"),
      ).rejects.toThrow();
    });
  });

  // ─── copyDirectory ──────────────────────────────────────────────────────────

  describe("copyDirectory", () => {
    let srcDir: string;

    beforeEach(async () => {
      srcDir = join(tempDir, "src");
      await fs.mkdir(srcDir, { recursive: true });
    });

    it("copies flat directory contents", async () => {
      await fs.writeFile(join(srcDir, "a.txt"), "aaa");
      await fs.writeFile(join(srcDir, "b.txt"), "bbb");
      const destDir = join(tempDir, "dest");
      await fs.mkdir(destDir);

      const copied = await copyDirectory(srcDir, destDir, "subdir");
      const paths = copied.map((f) => f.path);
      expect(paths).toContain("subdir/a.txt");
      expect(paths).toContain("subdir/b.txt");
      const aContent = await fs.readFile(join(destDir, "subdir", "a.txt"), "utf-8");
      expect(aContent).toBe("aaa");
    });

    it("returns each copied file's SHA-256 content hash (ARC-038)", async () => {
      await fs.writeFile(join(srcDir, "a.txt"), "aaa");
      const destDir = join(tempDir, "dest");
      await fs.mkdir(destDir);

      const copied = await copyDirectory(srcDir, destDir, "subdir");

      const expectedHash = createHash("sha256").update("aaa").digest("hex");
      expect(copied).toEqual([{ path: "subdir/a.txt", hash: expectedHash }]);
      expect(expectedHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("recursively copies nested directories", async () => {
      await fs.mkdir(join(srcDir, "nested"), { recursive: true });
      await fs.writeFile(join(srcDir, "nested", "deep.txt"), "deep");
      const destDir = join(tempDir, "dest");
      await fs.mkdir(destDir);

      const copied = await copyDirectory(srcDir, destDir, "subdir");
      expect(copied.map((f) => f.path)).toContain("subdir/nested/deep.txt");
      const deepContent = await fs.readFile(
        join(destDir, "subdir", "nested", "deep.txt"),
        "utf-8",
      );
      expect(deepContent).toBe("deep");
    });

    it("returns empty array for empty source directory", async () => {
      const destDir = join(tempDir, "dest");
      await fs.mkdir(destDir);

      const copied = await copyDirectory(srcDir, destDir, "subdir");
      expect(copied).toEqual([]);
    });

    it("overwrites existing files with force", async () => {
      await fs.writeFile(join(srcDir, "file.txt"), "new content");
      const destDir = join(tempDir, "dest");
      await fs.mkdir(join(destDir, "subdir"), { recursive: true });
      await fs.writeFile(join(destDir, "subdir", "file.txt"), "old content");

      const copied = await copyDirectory(srcDir, destDir, "subdir", { force: true });
      expect(copied.map((f) => f.path)).toContain("subdir/file.txt");
      const content = await fs.readFile(join(destDir, "subdir", "file.txt"), "utf-8");
      expect(content).toBe("new content");
    });

    it("rejects path traversal in relativeDir", async () => {
      const destDir = join(tempDir, "dest");
      await fs.mkdir(destDir);

      await expect(
        copyDirectory(srcDir, destDir, "../../escape"),
      ).rejects.toThrow();
    });
  });

  // ─── hashFile ───────────────────────────────────────────────────────────────

  describe("hashFile", () => {
    it("returns the SHA-256 hex digest of a file's content (ARC-038)", async () => {
      const hash = await hashFile(srcFile);
      expect(hash).toBe(createHash("sha256").update("hello world").digest("hex"));
    });

    it("returns different hashes for different content", async () => {
      const other = join(tempDir, "other.txt");
      await fs.writeFile(other, "different content");
      expect(await hashFile(srcFile)).not.toBe(await hashFile(other));
    });

    it("returns the same hash for identical content", async () => {
      const copy = join(tempDir, "copy.txt");
      await fs.writeFile(copy, "hello world");
      expect(await hashFile(srcFile)).toBe(await hashFile(copy));
    });
  });
});
