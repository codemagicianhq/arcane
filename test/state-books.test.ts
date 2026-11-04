import { describe, it, expect, afterEach } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { collectBook, itemLocator, parseBook } from "../src/modules/state/books.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

const fixtures: string[] = [];
afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

const TODO = [
  "---",
  "last_updated: 2026-11-04",
  "---",
  "",
  "# TODO",
  "",
  "## Open Items",
  "",
  "- [ ] **Survey the Ordovica site.** Type: `todo`.",
  "- [x] **Order the Tidewright repair drones.** Done 2026-11-01. <!-- status: done -->",
  "- [ ] Draft the Overshore orbit plan",
  "  - [ ] a nested item under the plan",
  "",
  "### Operator follow-ups",
  "",
  "- [X] Upper-case x counts as checked",
  "- not an item",
  "* [ ] a star bullet is not an item either",
].join("\n");

describe("parseBook (ST-05, D6)", () => {
  it("counts 3 open and 2 checked items, in file order, each under its nearest heading", () => {
    const book = parseBook(TODO);
    expect(book.open).toBe(3);
    expect(book.done).toBe(2);
    expect(book.items.map((i) => [i.text, i.section, i.checked])).toEqual([
      ["**Survey the Ordovica site.** Type: `todo`.", "Open Items", false],
      ["**Order the Tidewright repair drones.** Done 2026-11-01. <!-- status: done -->", "Open Items", true],
      ["Draft the Overshore orbit plan", "Open Items", false],
      ["a nested item under the plan", "Open Items", false],
      ["Upper-case x counts as checked", "Operator follow-ups", true],
    ]);
    expect(book.items.every((i) => /^[a-z0-9-]+\/[0-9a-f]{12}$/.test(i.locator))).toBe(true);
    expect(book.items[0].locator.startsWith("open-items/")).toBe(true);
    expect(book.items[4].locator.startsWith("operator-follow-ups/")).toBe(true);
  });

  it("parses a CRLF file identically to its LF twin", () => {
    expect(parseBook(TODO.replace(/\n/g, "\r\n"))).toEqual(parseBook(TODO));
  });

  it("truncates text to 200 characters but hashes the full text", () => {
    const long = "x".repeat(300);
    const book = parseBook(`- [ ] ${long}\n`);
    expect(book.items[0].text).toBe("x".repeat(200));
    expect(book.items[0].locator).toBe(itemLocator(null, long));
    expect(book.items[0].locator.startsWith("root/")).toBe(true);
  });
});

describe("itemLocator", () => {
  it("keeps the hash when an item moves and changes it when the text changes", () => {
    const text = "Survey the Ordovica site";
    const before = itemLocator("Open Items", text);
    const moved = itemLocator("Open Items", `  ${text}  `);
    expect(moved).toBe(before);
    expect(itemLocator("Done", text).split("/")[1]).toBe(before.split("/")[1]);
    expect(itemLocator("Open Items", "Survey the Ordovica site again")).not.toBe(before);
  });

  it("is stable across runs (sha256 of the normalized text)", () => {
    expect(itemLocator("Open Items", "a  b\tc")).toBe(itemLocator("Open Items", "a b c"));
  });
});

describe("collectBook", () => {
  it("reads TODO.md, IDEAS.md and DONE.md by name and yields null for an absent one", async () => {
    const dir = await createFixtureDir("state-books");
    fixtures.push(dir);
    await writeFile(join(dir, "TODO.md"), TODO, "utf8");
    await writeFile(join(dir, "DONE.md"), "# Done\n\n- [x] shipped\n", "utf8");
    const todos = await collectBook(dir, "TODO.md");
    expect(todos.warnings).toEqual([]);
    expect(todos.book?.open).toBe(3);
    const done = await collectBook(dir, "DONE.md");
    expect(done.book).toEqual({
      open: 0,
      done: 1,
      items: [{ text: "shipped", section: "Done", locator: itemLocator("Done", "shipped"), checked: true }],
    });
    expect(await collectBook(dir, "IDEAS.md")).toEqual({ book: null, warnings: [] });
  });
});
