/**
 * The books (PRD ST-05, architecture D6): TODO.md, IDEAS.md and the done
 * book, each read as a list of checkbox items. An item is a line matching
 * `- [ ]` or `- [x]`; its `text` is the line without the checkbox, first
 * 200 characters; `section` is the nearest preceding heading; `locator` is
 * `<section-slug>/<first 12 hex of sha256(normalized text)>`, which
 * survives moves and renumbering and changes only when the text does --
 * what ARC-040 asks of a durable pointer. Items keep file order: order is
 * meaning in a book. Bodies are never exported (ST-11).
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { headingAnchor } from "./decisions.js";
import type { BookItem, BookSection } from "./types.js";

const ITEM = /^\s*- \[( |x|X)\] (.*)$/;
const HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/;
const TEXT_LIMIT = 200;

/** Whitespace-collapsed, trimmed text: the input to the locator hash. */
export function normalizeItemText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function itemLocator(section: string | null, text: string): string {
  const slug = section === null ? "" : headingAnchor(section);
  const hash = createHash("sha256").update(normalizeItemText(text), "utf8").digest("hex").slice(0, 12);
  return `${slug === "" ? "root" : slug}/${hash}`;
}

export function parseBook(content: string): BookSection {
  const items: BookItem[] = [];
  let section: string | null = null;
  let open = 0;
  let done = 0;
  for (const line of content.split(/\r?\n/)) {
    const heading = HEADING.exec(line);
    if (heading) {
      section = heading[1];
      continue;
    }
    const item = ITEM.exec(line);
    if (!item) continue;
    const checked = item[1] !== " ";
    const text = item[2].trim();
    if (checked) done++;
    else open++;
    items.push({
      text: text.length > TEXT_LIMIT ? text.slice(0, TEXT_LIMIT) : text,
      section,
      locator: itemLocator(section, text),
      checked,
    });
  }
  return { open, done, items };
}

export interface CollectBookResult {
  /** Null when the file is absent. */
  book: BookSection | null;
  warnings: string[];
}

export async function collectBook(root: string, fileName: string): Promise<CollectBookResult> {
  let content: string;
  try {
    content = await readFile(join(root, fileName), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { book: null, warnings: [] };
    return {
      book: null,
      warnings: [`indexes: ${fileName} could not be read (${error instanceof Error ? error.message : String(error)})`],
    };
  }
  return { book: parseBook(content), warnings: [] };
}
