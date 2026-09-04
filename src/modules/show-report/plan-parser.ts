/**
 * Parses a program PLAN.md (Become Current / Lessons Hardening shape, and any
 * future program that follows the same conventions) into structured data for
 * show-report's model builder (SR-01).
 *
 * Deliberately does NOT attempt to extract a description from an epic's free
 * -form "Done:" prose -- that prose is written for an engineer re-verifying
 * the work, not for a report reader. The data contract (PLAN.md's own
 * "Authored, once, at the source" section) instead requires one short,
 * reader-facing `**Report:**` line per epic, authored directly in PLAN.md.
 * This parser only reads that line, plus the mechanically reliable bits
 * (epic ID/title/done-state, PR links already present in the epic's text).
 */

export interface PlanFrontmatter {
  title?: string;
  status?: string;
  created?: string;
  completed?: string;
  baseline?: string;
  owner?: string;
  executor?: string;
}

export interface ParsedEpicReport {
  description: string;
  category: string;
  titleOverride?: string;
}

export interface ParsedEpic {
  id: string;
  title: string;
  done: boolean;
  wave: string | null;
  report: ParsedEpicReport | null;
  prLinks: string[];
  block: string;
}

export interface ParsedParkedItem {
  title: string;
  reason: string;
}

/** Reads `key: value` pairs out of a `---\n...\n---` frontmatter block. Values are left as raw strings. */
export function parseFrontmatter(content: string): PlanFrontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const kv = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]!] = kv[2]!.trim();
  }
  return fields;
}

// Only the OPEN of an epic bullet -- "- [x] **BC-01 — " -- is matched at the
// line-start position. The title is extracted separately (see below) because
// it is not always confined to that one line: at least one real epic (LH-11)
// wraps its bold title across a line break before the closing `.**`, which a
// single-line regex requiring both ends on one line silently fails to match
// at all -- not a parse error, just an epic that never gets recognized.
const EPIC_START = /^- \[([ x])\] \*\*([A-Z]+-\d+) — /gm;
const EPIC_TITLE = /^- \[[ x]\] \*\*[A-Z]+-\d+ — ([\s\S]+?)\.\*\*/;
const HEADING_LINE = /^(#{2,3}) (.+)$/gm;
// `category:` is the last field this parser reads. A trailing `· glyph: <emoji>`
// is no longer part of the convention (ARC-043) but appears on every `**Report:**`
// line authored before it was dropped, so the pattern deliberately does not
// anchor at end-of-line: those lines keep parsing, and the emoji is ignored
// rather than rendered. Category alone now selects the row's icon.
const REPORT_LINE = /\*\*Report:\*\*\s*([\s\S]*?)\s*·\s*category:\s*([a-z]+)/;
const TITLE_OVERRIDE_LINE = /^\s*title:\s*(.+)$/m;
const PR_LINK = /\[PR #(\d+)\]\((https:\/\/github\.com\/[^)\s]+\/pull\/\d+)\)/g;

interface Marker {
  index: number;
  type: "epic" | "h2" | "h3";
  id?: string;
  done?: boolean;
  waveTitle?: string;
}

/**
 * Splits PLAN.md into top-level epic blocks. A new epic always starts a line
 * with `- [ ]`/`- [x]` followed by `**<PREFIX>-<N> — `; nested detail (Done:
 * sub-bullets, numbered lists, bold lead-ins like "BC-30 Batch B") never
 * matches that shape, so it safely stays inside the current block. Position
 * -based (not line-by-line): a title, a Wave heading, or a `## ` section
 * boundary can in principle fall anywhere relative to line breaks, and only
 * comparing character offsets handles that uniformly.
 */
export function parseEpics(content: string): ParsedEpic[] {
  const markers: Marker[] = [];

  EPIC_START.lastIndex = 0;
  let epicMatch: RegExpExecArray | null;
  while ((epicMatch = EPIC_START.exec(content)) !== null) {
    markers.push({ index: epicMatch.index, type: "epic", id: epicMatch[2]!, done: epicMatch[1] === "x" });
  }

  HEADING_LINE.lastIndex = 0;
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = HEADING_LINE.exec(content)) !== null) {
    if (headingMatch[1] === "##") {
      markers.push({ index: headingMatch.index, type: "h2" });
    } else {
      markers.push({ index: headingMatch.index, type: "h3", waveTitle: headingMatch[2]!.trim() });
    }
  }

  markers.sort((a, b) => a.index - b.index);

  const epics: ParsedEpic[] = [];
  let currentWave: string | null = null;

  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i]!;
    if (marker.type === "h2") {
      currentWave = null;
      continue;
    }
    if (marker.type === "h3") {
      currentWave = marker.waveTitle!;
      continue;
    }
    // marker.type === "epic": block runs to the next marker of any kind, or EOF.
    const blockEnd = i + 1 < markers.length ? markers[i + 1]!.index : content.length;
    const block = content.slice(marker.index, blockEnd);
    const titleMatch = EPIC_TITLE.exec(block);
    const reportMatch = REPORT_LINE.exec(block);
    const titleOverrideMatch = TITLE_OVERRIDE_LINE.exec(block);
    const prLinks = [...new Set([...block.matchAll(PR_LINK)].map((m) => m[2]!))];

    epics.push({
      id: marker.id!,
      // A title that still fails to match (e.g. a malformed bullet with no
      // closing `.**` at all) falls back to the raw id rather than throwing --
      // an epic missing from the report is far more visible, and therefore
      // more likely to get fixed, than a crashed report generator.
      title: titleMatch ? titleMatch[1]!.replace(/\s+/g, " ").trim() : marker.id!,
      done: marker.done!,
      wave: currentWave,
      report: reportMatch
        ? {
            description: reportMatch[1]!.replace(/\s+/g, " ").trim(),
            category: reportMatch[2]!,
            titleOverride: titleOverrideMatch ? titleOverrideMatch[1]!.trim() : undefined,
          }
        : null,
      prLinks,
      block,
    });
  }

  return epics;
}

/**
 * Extracts the body text of a `## <headingPrefix>...` section, up to (but
 * not including) the next `## ` heading or the end of the document.
 *
 * Deliberately line-array based rather than a single lookahead regex: a
 * lookahead built from `\r?\n?$` under the `m` flag matches at the END OF
 * EVERY LINE (not just end-of-string, since `m` makes `$` mean "end of any
 * line"), so a lazy `[\s\S]*?` stops after the very first blank line inside
 * the section instead of running to the next `## ` heading. Splitting into
 * lines and searching by index sidesteps that footgun entirely.
 */
function extractSection(content: string, headingPrefix: string): string | null {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.startsWith(headingPrefix));
  if (startIndex === -1) return null;
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (lines[i]!.startsWith("## ")) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex + 1, endIndex).join("\n");
}

/**
 * Parked sections come in two known shapes across the two existing programs:
 * Lessons Hardening's bullet list (`- **Title** — reason`) and Become
 * Current's three-column table (`| Item | Source | reason |`). Both are
 * handled; an unrecognized shape degrades to an empty list rather than
 * throwing, since this field is optional in the schema.
 */
export function parseParkedSection(content: string): ParsedParkedItem[] {
  const body = extractSection(content, "## Parked — Needs Operator");
  if (body === null) return [];

  const tableRows = [...body.matchAll(/^\|(?!---)([^|]+)\|([^|]+)\|([^|]+)\|\s*$/gm)];
  if (tableRows.length > 1) {
    // First matched row is the header (`| Item | Source | ... |`); skip it.
    return tableRows.slice(1).map((m) => ({
      title: stripMarkdown(m[1]!.trim()),
      reason: stripMarkdown(m[3]!.trim()),
    }));
  }

  // Bullets are unwrapped to one string each BEFORE matching. Matching the raw
  // text line-by-line under `m` lost data two ways on the live corpus, both
  // silently: a reason that wrapped to a second line was cut at the wrap
  // ("fully solved (git-conventions.md → Content-Verified", losing "Branch
  // Deletion)"), and an item whose `—` fell on the second line never matched at
  // all, dropping it from the report entirely (Lessons Hardening's
  // "Mechanizing spell-check-drift's judgment-based detectors" -- 8 of 9 items
  // rendered, with nothing to indicate one was missing).
  return unwrapBullets(body).flatMap((bullet) => {
    const match = /^\*\*(.+?)\*\*(.*?)\s*—\s*(.+)$/.exec(bullet);
    if (!match) return [];
    // Text between the bold lead-in and the `—` belongs to the title (LH's
    // "…detectors **beyond** LH-07/LH-08's two mechanical inputs"), except a
    // parenthetical, which is a source note rather than part of the name.
    const tail = match[2]!.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
    const title = tail ? `${match[1]!.trim()} ${tail}` : match[1]!.trim();
    return [{ title: stripMarkdown(title), reason: stripMarkdown(match[3]!.trim()) }];
  });
}

/**
 * Collapses a markdown bullet list into one string per bullet, joining each
 * bullet's wrapped continuation lines. A bullet ends at the next `- ` at
 * column 0, at a blank line, or at any other unindented line.
 */
function unwrapBullets(body: string): string[] {
  const bullets: string[] = [];
  let current: string[] | null = null;
  const flush = (): void => {
    if (current) bullets.push(current.join(" ").replace(/\s+/g, " ").trim());
    current = null;
  };
  for (const line of body.split(/\r?\n/)) {
    if (/^- /.test(line)) {
      flush();
      current = [line.slice(2).trim()];
    } else if (current !== null) {
      if (/^\s+\S/.test(line)) current.push(line.trim());
      else flush();
    }
  }
  flush();
  return bullets;
}

/**
 * Generic outcome summary from a "## Coverage Map" section: counts data rows
 * (skipping the header/separator rows every markdown table has) and how many
 * cells say "Parked", producing the same shape as the schema's own example
 * ("12 of 12 patterns dispositioned — 9 mechanized, 3 parked") regardless of
 * which program's own column layout produced them.
 */
export function computeCoverageOutcome(content: string): string | undefined {
  const body = extractSection(content, "## Coverage Map");
  if (body === null) return undefined;
  const rows = [...body.matchAll(/^\|(.+)\|\s*$/gm)].filter((m) => !/^-+\s*\|/.test(m[1]!.trim()));
  if (rows.length < 2) return undefined;
  const dataRows = rows.slice(1); // first row is the header
  // Lessons Hardening's own Coverage Map says "**Park**"; Become Current's
  // says "**Parked**" -- same disposition, two spellings across the two
  // existing programs (an instance of the exact P-something inconsistency
  // this program's own corrections inventory is full of).
  const parkedCount = dataRows.filter((m) => /\*\*Park(?:ed)?\*\*/i.test(m[1]!)).length;
  const total = dataRows.length;
  const dispositioned = total - parkedCount;
  return `${total} of ${total} items dispositioned — ${dispositioned} routed to an epic, ${parkedCount} parked`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}
