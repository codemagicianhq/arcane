import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mergeIntoFile,
  MARKER_START,
  MARKER_END,
  MalformedMarkersError,
} from "../src/modules/merger.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "arcane-merger-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function writeTarget(name: string, content: string): Promise<string> {
  const full = join(tmpDir, name);
  await writeFile(full, content, "utf8");
  return full;
}

async function readTarget(name: string): Promise<string> {
  return readFile(join(tmpDir, name), "utf8");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("mergeIntoFile — markers present", () => {
  it("replaces content between existing markers", async () => {
    await writeTarget(
      "AGENTS.md",
      `# Header\n${MARKER_START}\nold content\n${MARKER_END}\n## Footer\n`,
    );

    const modified = await mergeIntoFile(tmpDir, "AGENTS.md", "new content");

    expect(modified).toBe(true);
    const result = await readTarget("AGENTS.md");
    expect(result).toContain(MARKER_START);
    expect(result).toContain(MARKER_END);
    expect(result).toContain("new content");
    expect(result).not.toContain("old content");
    // Content outside markers is preserved
    expect(result).toContain("# Header");
    expect(result).toContain("## Footer");
  });

  it("replaces empty content between markers", async () => {
    await writeTarget(
      "AGENTS.md",
      `${MARKER_START}\n${MARKER_END}\n`,
    );

    await mergeIntoFile(tmpDir, "AGENTS.md", "injected");

    const result = await readTarget("AGENTS.md");
    expect(result).toContain("injected");
  });

  it("replaces multi-line content between markers", async () => {
    await writeTarget(
      "AGENTS.md",
      `${MARKER_START}\nline1\nline2\nline3\n${MARKER_END}\n`,
    );

    await mergeIntoFile(tmpDir, "AGENTS.md", "replacement line 1\nreplacement line 2");

    const result = await readTarget("AGENTS.md");
    expect(result).toContain("replacement line 1");
    expect(result).toContain("replacement line 2");
    expect(result).not.toContain("line1");
  });

  it("dry-run with markers does not write changes", async () => {
    const original = `${MARKER_START}\noriginal\n${MARKER_END}\n`;
    await writeTarget("AGENTS.md", original);

    const modified = await mergeIntoFile(tmpDir, "AGENTS.md", "changed", {
      dryRun: true,
    });

    expect(modified).toBe(true); // Reports would-modify
    const result = await readTarget("AGENTS.md");
    expect(result).toBe(original); // File untouched
  });

  it("markers without content between them work correctly", async () => {
    await writeTarget(
      "AGENTS.md",
      `before\n${MARKER_START}${MARKER_END}\nafter\n`,
    );

    await mergeIntoFile(tmpDir, "AGENTS.md", "content");

    const result = await readTarget("AGENTS.md");
    expect(result).toContain("content");
    expect(result).toContain("before");
    expect(result).toContain("after");
  });
});

describe("mergeIntoFile — no markers, force behaviour", () => {
  it("returns false and does not modify file when no markers and no force", async () => {
    const original = "# Existing content\nNo markers here.\n";
    await writeTarget("AGENTS.md", original);

    const modified = await mergeIntoFile(tmpDir, "AGENTS.md", "injected");

    expect(modified).toBe(false);
    expect(await readTarget("AGENTS.md")).toBe(original);
  });

  it("appends markers and content when no markers and force=true", async () => {
    await writeTarget("AGENTS.md", "# Existing content\n");

    const modified = await mergeIntoFile(
      tmpDir,
      "AGENTS.md",
      "appended content",
      { force: true },
    );

    expect(modified).toBe(true);
    const result = await readTarget("AGENTS.md");
    expect(result).toContain("# Existing content");
    expect(result).toContain(MARKER_START);
    expect(result).toContain("appended content");
    expect(result).toContain(MARKER_END);
    // Markers must appear after original content
    const markerPos = result.indexOf(MARKER_START);
    const headerPos = result.indexOf("# Existing content");
    expect(markerPos).toBeGreaterThan(headerPos);
  });

  it("adds a newline before markers when file doesn't end in newline", async () => {
    await writeTarget("AGENTS.md", "no trailing newline");

    await mergeIntoFile(tmpDir, "AGENTS.md", "content", { force: true });

    const result = await readTarget("AGENTS.md");
    // Marker start must be on its own line
    expect(result).toMatch(/\n<!-- arcane:start -->/);
  });

  it("dry-run with force does not write changes for no-marker file", async () => {
    const original = "# Existing\n";
    await writeTarget("AGENTS.md", original);

    const modified = await mergeIntoFile(
      tmpDir,
      "AGENTS.md",
      "content",
      { force: true, dryRun: true },
    );

    expect(modified).toBe(true);
    expect(await readTarget("AGENTS.md")).toBe(original);
  });
});

describe("mergeIntoFile — file does not exist", () => {
  it("returns false when file is missing and force is false", async () => {
    const modified = await mergeIntoFile(tmpDir, "missing.md", "content");
    expect(modified).toBe(false);
  });

  it("creates file with markers when missing and force=true", async () => {
    const modified = await mergeIntoFile(tmpDir, "missing.md", "created", {
      force: true,
    });

    expect(modified).toBe(true);
    const result = await readTarget("missing.md");
    expect(result).toContain(MARKER_START);
    expect(result).toContain("created");
    expect(result).toContain(MARKER_END);
  });

  it("dry-run with missing file and force does not create file", async () => {
    const modified = await mergeIntoFile(tmpDir, "missing.md", "content", {
      force: true,
      dryRun: true,
    });

    expect(modified).toBe(true);
    // File should still not exist
    await expect(readTarget("missing.md")).rejects.toThrow();
  });
});

describe("mergeIntoFile — malformed markers", () => {
  it("throws MalformedMarkersError when only start marker is present", async () => {
    await writeTarget("AGENTS.md", `before\n${MARKER_START}\nno end marker\n`);

    await expect(
      mergeIntoFile(tmpDir, "AGENTS.md", "content"),
    ).rejects.toThrow(MalformedMarkersError);
  });

  it("throws MalformedMarkersError when only end marker is present", async () => {
    await writeTarget("AGENTS.md", `before\n${MARKER_END}\nafter\n`);

    await expect(
      mergeIntoFile(tmpDir, "AGENTS.md", "content"),
    ).rejects.toThrow(MalformedMarkersError);
  });

  it("error message mentions which marker is missing", async () => {
    await writeTarget("AGENTS.md", `${MARKER_START}\nno end\n`);

    await expect(
      mergeIntoFile(tmpDir, "AGENTS.md", "content"),
    ).rejects.toThrow(/end missing/);
  });

  it("throws MalformedMarkersError when end appears before start", async () => {
    await writeTarget(
      "AGENTS.md",
      `${MARKER_END}\ncontent\n${MARKER_START}\n`,
    );

    await expect(
      mergeIntoFile(tmpDir, "AGENTS.md", "content"),
    ).rejects.toThrow(MalformedMarkersError);
  });

  it("error message mentions wrong order when end before start", async () => {
    await writeTarget(
      "AGENTS.md",
      `${MARKER_END}\ncontent\n${MARKER_START}\n`,
    );

    await expect(
      mergeIntoFile(tmpDir, "AGENTS.md", "content"),
    ).rejects.toThrow(/wrong order/);
  });
});

describe("mergeIntoFile — path traversal protection", () => {
  it("throws on path traversal attempt", async () => {
    await expect(
      mergeIntoFile(tmpDir, "../../../etc/passwd", "evil"),
    ).rejects.toThrow(/Path traversal/);
  });

  it("throws on nested traversal path", async () => {
    await expect(
      mergeIntoFile(tmpDir, "sub/../../outside", "evil"),
    ).rejects.toThrow(/Path traversal/);
  });

  it("accepts normal relative paths", async () => {
    await writeTarget("normal.md", "# Normal\n");
    const modified = await mergeIntoFile(
      tmpDir,
      "normal.md",
      "content",
      { force: true },
    );
    expect(modified).toBe(true);
  });
});

describe("mergeIntoFile — content integrity", () => {
  it("preserves content before and after markers exactly", async () => {
    const before = "# Title\n\nSome intro paragraph.\n\n";
    const after = "\n## Section After\n\nMore text here.\n";
    await writeTarget(
      "copilot-instructions.md",
      `${before}${MARKER_START}\nold\n${MARKER_END}${after}`,
    );

    await mergeIntoFile(
      tmpDir,
      "copilot-instructions.md",
      "new instructions",
    );

    const result = await readTarget("copilot-instructions.md");
    expect(result.startsWith(before)).toBe(true);
    expect(result).toContain("new instructions");
    expect(result.endsWith(after)).toBe(true);
  });

  it("handles content with special regex characters safely", async () => {
    await writeTarget(
      "AGENTS.md",
      `${MARKER_START}\nold\n${MARKER_END}\n`,
    );

    const specialContent =
      "content with $1 and $& and () and [] and special chars";
    await mergeIntoFile(tmpDir, "AGENTS.md", specialContent);

    const result = await readTarget("AGENTS.md");
    expect(result).toContain(specialContent);
  });

  it("propagates non-ENOENT filesystem errors", async () => {
    // Reading tmpDir itself (a directory) as a file throws EISDIR, not ENOENT
    // validateTargetPath allows "." (resolves equal to targetDir — not an escape)
    await expect(
      mergeIntoFile(tmpDir, ".", "content"),
    ).rejects.toThrow(/EISDIR|ENOTDIR|not a file/i);
  });
});
