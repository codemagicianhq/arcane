/**
 * Parses a decisions log (DECISIONS.md) into its entries (PRD ST-05,
 * architecture D5). Moved here from Show Report's `decisions-parser.ts` and
 * generalized: the heading prefix is any `AA-NNN` id -- `ARC-` in this
 * repository, `ADR-` in an operations hub, `DMC-` in a cockpit -- so one
 * parser serves every consumer. Show Report keeps its `parseAdrs` and
 * `countAcceptedAdrsInWindow` from this module.
 *
 * `**Status:**` lines sometimes carry a parenthetical or a sentence after
 * the word itself ("Accepted (2026-09-01, operator accept call ...)",
 * "Superseded by [ARC-047]..."); only the leading word is the status. Show
 * Report's own research flagged this count as easy to get wrong by hand:
 * a hand-built ledger said "4 ADRs accepted" where a mechanical recount
 * found 5.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DecisionEntry } from "./types.js";

export interface ParsedAdr {
  id: string;
  date: string | null;
  status: string | null;
}

export interface ParsedDecisions {
  entries: DecisionEntry[];
  /** One line per heading that matched but had no parseable body. */
  warnings: string[];
}

const HEADING = /^## ([A-Z]{2,5})-(\d{3,})\b(.*)$/gm;

/**
 * GitHub's heading anchor: lowercased, every character that is not a letter,
 * number, space, hyphen or underscore removed, spaces turned into hyphens.
 * An em dash between two spaces therefore becomes `--`, which is how this
 * repository's own table of contents links its entries.
 */
export function headingAnchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .replace(/ /g, "-");
}

/** The heading text after the id: a leading dash, em dash, en dash or colon is the separator, not the title. */
function titleAfterId(rest: string): string {
  return rest.replace(/^\s*[—–:-]+\s*/u, "").trim();
}

export function parseDecisions(content: string): ParsedDecisions {
  const text = content.replace(/\r\n?/g, "\n");
  const positions: { id: string; heading: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  HEADING.lastIndex = 0;
  while ((match = HEADING.exec(text)) !== null) {
    positions.push({ id: `${match[1]}-${match[2]}`, heading: `${match[1]}-${match[2]}${match[3]}`, index: match.index });
  }

  const entries: DecisionEntry[] = [];
  const warnings: string[] = [];
  positions.forEach(({ id, heading, index }, i) => {
    const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
    const section = text.slice(index, end);
    const dateMatch = /^\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/m.exec(section);
    const statusMatch = /^\*\*Status:\*\*\s*(\S+)/m.exec(section);
    if (!dateMatch && !statusMatch) {
      warnings.push(`indexes.decisions: ${id} has no **Date:** or **Status:** line and was skipped`);
      return;
    }
    entries.push({
      id,
      title: titleAfterId(heading.slice(id.length)),
      status: statusMatch ? statusMatch[1] : null,
      date: dateMatch ? dateMatch[1] : null,
      anchor: headingAnchor(heading),
    });
  });
  return { entries, warnings };
}

/** Show Report's view of the log: id, date and leading status word per entry, in file order. */
export function parseAdrs(decisionsContent: string): ParsedAdr[] {
  return parseDecisions(decisionsContent).entries.map(({ id, date, status }) => ({ id, date, status }));
}

/** Counts ADRs whose `**Date:**` falls within `[fromDate, toDate]` (inclusive, ISO strings) and whose current Status is Accepted. */
export function countAcceptedAdrsInWindow(adrs: ParsedAdr[], fromDate: string, toDate: string): number {
  return adrs.filter(
    (adr) => adr.status === "Accepted" && adr.date !== null && adr.date >= fromDate && adr.date <= toDate,
  ).length;
}

export interface CollectDecisionsResult {
  /** Sorted by id; null when DECISIONS.md is absent. */
  decisions: DecisionEntry[] | null;
  warnings: string[];
}

export async function collectDecisions(root: string): Promise<CollectDecisionsResult> {
  let content: string;
  try {
    content = await readFile(join(root, "DECISIONS.md"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { decisions: null, warnings: [] };
    return {
      decisions: null,
      warnings: [`indexes.decisions: DECISIONS.md could not be read (${error instanceof Error ? error.message : String(error)})`],
    };
  }
  const { entries, warnings } = parseDecisions(content);
  return {
    decisions: entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    warnings,
  };
}
