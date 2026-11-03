import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import {
  readManifest,
  writeManifest,
  isValidTodoDoneBook,
  ManifestInvalidFieldError,
} from "../src/modules/manifest.js";

/** #415: the optional, validated `todo_done_book` manifest field. */

const BASE = { version: "1.16.0", profile: "lite", installedAt: "2026-11-03T00:00:00.000Z", components: [] };

describe("todo_done_book", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await createFixtureDir("todo-done-book-");
  });
  afterEach(async () => {
    await removeFixtureDir(dir);
  });

  async function writeRaw(value: Record<string, unknown>): Promise<void> {
    await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(value, null, 2));
  }

  it.each([["DONE.md"], ["docs/DONE.md"], ["./done/archive.MD"], [false]])(
    "valid value %j round-trips through readManifest/writeManifest",
    async (todo_done_book) => {
      await writeRaw({ ...BASE, todo_done_book });

      const read = await readManifest(dir);
      expect(read.todo_done_book).toBe(todo_done_book);
      await writeManifest(dir, read);
      expect((await readManifest(dir)).todo_done_book).toBe(todo_done_book);
    },
  );

  it("absent is fine and means the default done book", async () => {
    await writeRaw(BASE);
    expect((await readManifest(dir)).todo_done_book).toBeUndefined();
  });

  it.each([
    ["true", true],
    ["null", null],
    ["a number", 3],
    ["an empty string", ""],
    ["an absolute path", "/tmp/DONE.md"],
    ["a Windows drive path", "C:\\DONE.md"],
    ["a path that escapes the repository", "../DONE.md"],
    ["a directory", "done/"],
    ["the current directory", "."],
    ["a non-Markdown file", "DONE.txt"],
    ["the TODO book itself", "TODO.md"],
    ["the TODO book by another spelling", "./todo.md"],
    ["a multi-line value", "DONE.md\nrm -rf"],
  ])("%s -> ManifestInvalidFieldError naming todo_done_book", async (_label, todo_done_book) => {
    await writeRaw({ ...BASE, todo_done_book });

    const error = await readManifest(dir).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ManifestInvalidFieldError);
    expect((error as ManifestInvalidFieldError).field).toBe("todo_done_book");
  });

  it("isValidTodoDoneBook is the predicate the validator uses", () => {
    expect(isValidTodoDoneBook("DONE.md")).toBe(true);
    expect(isValidTodoDoneBook(false)).toBe(true);
    expect(isValidTodoDoneBook(true)).toBe(false);
  });
});
