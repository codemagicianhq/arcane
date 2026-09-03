/**
 * Parses DECISIONS.md for ADRs (SR-01), specifically to count how many
 * reached `Accepted` status within a program's active window -- the exact
 * stat this program's own research flagged as easy to get wrong by hand:
 * Become Current's hand-built ledger said "4 ADRs accepted" where a
 * mechanical recount found 5 (ARC-029/037/038/039/040). `**Status:**` lines
 * sometimes carry a parenthetical after the word itself (e.g. "Accepted
 * (2026-09-01, operator accept call ...)"); only the leading status word is
 * matched, so that detail doesn't need parsing.
 */

export interface ParsedAdr {
  id: string;
  date: string | null;
  status: string | null;
}

export function parseAdrs(decisionsContent: string): ParsedAdr[] {
  const headingPattern = /^## ARC-(\d{3})\b/gm;
  const positions: { id: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(decisionsContent)) !== null) {
    positions.push({ id: `ARC-${match[1]!}`, index: match.index });
  }

  return positions.map(({ id, index }, i) => {
    const end = i + 1 < positions.length ? positions[i + 1]!.index : decisionsContent.length;
    const section = decisionsContent.slice(index, end);
    const dateMatch = /^\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/m.exec(section);
    const statusMatch = /^\*\*Status:\*\*\s*(\S+)/m.exec(section);
    return { id, date: dateMatch ? dateMatch[1]! : null, status: statusMatch ? statusMatch[1]! : null };
  });
}

/** Counts ADRs whose `**Date:**` falls within `[fromDate, toDate]` (inclusive, ISO strings) and whose current Status is Accepted. */
export function countAcceptedAdrsInWindow(adrs: ParsedAdr[], fromDate: string, toDate: string): number {
  return adrs.filter(
    (adr) => adr.status === "Accepted" && adr.date !== null && adr.date >= fromDate && adr.date <= toDate,
  ).length;
}
