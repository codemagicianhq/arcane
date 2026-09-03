/**
 * Parses an OPERATOR-QUEUE.md (Become Current / Lessons Hardening / Show
 * Report shape) into structured entries for show-report's `needsYou` block
 * (SR-01). The loop appends `## Q-NNN — Title` sections, each ending in a
 * `- **Status:** [ ]`/`[x]` line -- that checkbox is the only mechanically
 * reliable "is this still open" signal; everything else in an entry is free
 * -form prose written for the operator, not for parsing.
 */

const LINK = /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/;

export interface ParsedQueueEntry {
  id: string;
  title: string;
  done: boolean;
  why: string | null;
  href?: string;
}

export function parseOperatorQueue(content: string): ParsedQueueEntry[] {
  const sections = content.split(/^## /m).slice(1); // drop the doc's own leading title/preamble
  const entries: ParsedQueueEntry[] = [];

  for (const section of sections) {
    const headingMatch = /^(Q-\d+)\s*—\s*(.+?)\r?\n/.exec(section);
    if (!headingMatch) continue; // not a Q-NNN section (shouldn't occur after the split, but stay defensive)
    const id = headingMatch[1]!;
    const title = headingMatch[2]!.trim();

    const statusMatch = /^-\s*\*\*Status:\*\*\s*\[([ x])\]/m.exec(section);
    const done = statusMatch ? statusMatch[1] === "x" : false;

    const whyMatch = /^-\s*\*\*Why:\*\*\s*([\s\S]*?)(?=\r?\n-\s*\*\*|\r?\n\r?\n|$)/m.exec(section);
    const why = whyMatch ? whyMatch[1]!.replace(/\s+/g, " ").trim() : null;

    const linkMatch = LINK.exec(section);
    entries.push({ id, title, done, why, href: linkMatch ? linkMatch[1] : undefined });
  }

  return entries;
}
