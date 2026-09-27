/**
 * ARC-051 — placeholder taxonomy for governance documents (#277).
 *
 * Governance documents use `{UPPER_SNAKE}` tokens in two ways:
 *   - runtime-resolved tokens, which an agent resolves when it uses the
 *     document (legal in a `status: active` document), enumerated once in
 *     `spell-authoring-standards.md` between the runtime-placeholders markers;
 *   - fill-in slots, which the operator replaces by hand. A document built
 *     around them carries `status: template` and is not scanned.
 *
 * This module finds tokens in `status: active` documents that are in neither
 * category ("unknown"). It only reads files; `spell doctor` turns its result
 * into a non-blocking warning (ARC-051 decision 4).
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/** The installed standard that holds the runtime-token list. */
export const PLACEHOLDER_STANDARD_FILE = "spell-authoring-standards.md";
export const RUNTIME_PLACEHOLDERS_START = "<!-- runtime-placeholders:start -->";
export const RUNTIME_PLACEHOLDERS_END = "<!-- runtime-placeholders:end -->";

/** `{UPPER_SNAKE}`: an uppercase letter, then uppercase letters/digits in `_`-separated words. */
const PLACEHOLDER_PATTERN = /(?<!\$)\{([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*)\}/g;

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** The document's frontmatter `status:` value, or null when there is none. */
export function parseFrontmatterStatus(content: string): string | null {
  const block = FRONTMATTER_PATTERN.exec(content);
  if (!block) return null;
  const status = /^status:[ \t]*["']?([^"'\s#]+)/m.exec(block[1]!);
  return status ? status[1]! : null;
}

function stripFrontmatter(content: string): string {
  const block = FRONTMATTER_PATTERN.exec(content);
  return block ? content.slice(block[0].length) : content;
}

/**
 * Drops fenced code blocks (``` or ~~~, opening fence indented at most three
 * spaces; an unclosed fence runs to the end of the document, as in
 * CommonMark). Indented code blocks are not recognized: in these documents a
 * four-space indent is almost always list continuation, not code.
 */
function stripFencedCode(text: string): string {
  const kept: string[] = [];
  let fence: { char: string; length: number } | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (fence) {
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (close && close[1]![0] === fence.char && close[1]!.length >= fence.length) fence = null;
      kept.push("");
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    // A backtick fence's info string may not itself contain a backtick.
    if (open && !(open[1]![0] === "`" && line.slice(open[0].length).includes("`"))) {
      fence = { char: open[1]![0]!, length: open[1]!.length };
      kept.push("");
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

/**
 * Drops inline code spans. A run of N backticks opens a span that closes at
 * the next run of exactly N backticks in the same paragraph; a run with no
 * match is literal text.
 */
function stripInlineCode(text: string): string {
  return text
    .split(/\n[ \t]*\n/)
    .map((paragraph) => {
      let out = "";
      let i = 0;
      while (i < paragraph.length) {
        if (paragraph[i] !== "`") {
          out += paragraph[i];
          i += 1;
          continue;
        }
        let runEnd = i;
        while (paragraph[runEnd] === "`") runEnd += 1;
        const run = runEnd - i;
        let close = -1;
        let j = runEnd;
        while (j < paragraph.length) {
          if (paragraph[j] !== "`") {
            j += 1;
            continue;
          }
          let k = j;
          while (paragraph[k] === "`") k += 1;
          if (k - j === run) {
            close = j;
            break;
          }
          j = k;
        }
        if (close === -1) {
          out += paragraph.slice(i, runEnd);
          i = runEnd;
        } else {
          out += " ";
          i = close + run;
        }
      }
      return out;
    })
    .join("\n\n");
}

/**
 * The distinct `{UPPER_SNAKE}` tokens in a document's prose, in first-seen
 * order. Frontmatter, fenced code and inline code are ignored: a token there
 * is an example or a literal, not a slot the reader is asked to fill.
 * `${NAME}` is shell/template syntax and is not a placeholder.
 */
export function findPlaceholderTokens(content: string): string[] {
  const prose = stripInlineCode(stripFencedCode(stripFrontmatter(content)));
  const seen = new Set<string>();
  for (const match of prose.matchAll(PLACEHOLDER_PATTERN)) seen.add(`{${match[1]!}}`);
  return [...seen];
}

/**
 * The runtime-resolved tokens listed between the runtime-placeholders markers:
 * each list item whose first element is a code span holding one token, e.g.
 * "- `{ADO_ORG}` — …". Returns null when the markers are absent or out of
 * order, so a caller can tell "no list installed" from "an empty list".
 */
export function parseRuntimePlaceholders(standardContent: string): Set<string> | null {
  const start = standardContent.indexOf(RUNTIME_PLACEHOLDERS_START);
  const end = standardContent.indexOf(RUNTIME_PLACEHOLDERS_END);
  if (start === -1 || end === -1 || end < start) return null;
  const region = standardContent.slice(start + RUNTIME_PLACEHOLDERS_START.length, end);
  const tokens = new Set<string>();
  for (const match of region.matchAll(/^[ \t]*[-*][ \t]+`(\{[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*\})`/gm)) {
    tokens.add(match[1]!);
  }
  return tokens;
}

export interface PlaceholderFinding {
  /** File name relative to the scanned governance directory. */
  file: string;
  /** Unknown tokens, in first-seen order, braces included. */
  tokens: string[];
}

export type PlaceholderScan =
  | { status: "skipped"; reason: string }
  | {
      status: "scanned";
      runtimeTokens: Set<string>;
      /** `status: active` documents scanned. */
      activeDocs: string[];
      /** `status: template` documents skipped (ARC-051 decision 3). */
      templateDocs: string[];
      /** One entry per active document with at least one unknown token. */
      findings: PlaceholderFinding[];
    };

/**
 * Scans every `*.md` directly inside `governanceDir`. Only `status: active`
 * documents are checked; template, draft, deprecated and status-less documents
 * are not. Skipped (never failed) when the runtime-token list is not installed:
 * without it every token would read as unknown.
 */
export async function scanGovernancePlaceholders(governanceDir: string): Promise<PlaceholderScan> {
  let standard: string;
  try {
    standard = await readFile(join(governanceDir, PLACEHOLDER_STANDARD_FILE), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { status: "skipped", reason: `${PLACEHOLDER_STANDARD_FILE} is not installed` };
    }
    throw err;
  }
  const runtimeTokens = parseRuntimePlaceholders(standard);
  if (!runtimeTokens) {
    return {
      status: "skipped",
      reason: `${PLACEHOLDER_STANDARD_FILE} has no runtime-placeholders list (an older version?)`,
    };
  }

  const files = (await readdir(governanceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  const activeDocs: string[] = [];
  const templateDocs: string[] = [];
  const findings: PlaceholderFinding[] = [];
  for (const file of files) {
    const content = await readFile(join(governanceDir, file), "utf8");
    const status = parseFrontmatterStatus(content);
    if (status === "template") templateDocs.push(file);
    if (status !== "active") continue;
    activeDocs.push(file);
    const unknown = findPlaceholderTokens(content).filter((token) => !runtimeTokens.has(token));
    if (unknown.length > 0) findings.push({ file, tokens: unknown });
  }
  return { status: "scanned", runtimeTokens, activeDocs, templateDocs, findings };
}
