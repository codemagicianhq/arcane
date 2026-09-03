/**
 * Parses a program's own dated section out of docs/verification-ledger.md
 * (SR-01). Sections are matched by a heading that names the program (e.g.
 * "## 2026-09-02 — Lessons Hardening corrections (LH-02 → LH-12)") -- a
 * program can have more than one dated section (Become Current's ledger
 * entry above is one example among what may become several over a program's
 * life), so this returns every row across all matching sections combined.
 */

export type LedgerResult = "confirmed" | "corrected" | "unverifiable";

export interface ParsedLedgerRow {
  claim: string;
  result: LedgerResult;
  correction: string | null;
}

/** `programNameWords` should be how the program is named in ledger headings, e.g. "Lessons Hardening". */
export function parseVerificationLedgerSection(content: string, programNameWords: string): ParsedLedgerRow[] {
  const sections = content.split(/^## /m).slice(1);
  const rows: ParsedLedgerRow[] = [];

  for (const section of sections) {
    const headingLine = section.slice(0, section.indexOf("\n"));
    if (!headingLine.toLowerCase().includes(programNameWords.toLowerCase())) continue;

    const tableRows = [...section.matchAll(/^\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|\s*$/gm)];
    for (const m of tableRows.slice(1)) {
      // first match is the header row
      const claimCell = m[1]!.trim();
      const resultCell = m[3]!.trim().toLowerCase();
      const correctionCell = m[4]!.trim();
      if (claimCell === "---" || claimCell.startsWith("---")) continue;
      if (resultCell !== "confirmed" && resultCell !== "corrected" && resultCell !== "unverifiable") continue;
      rows.push({
        claim: stripMarkdown(claimCell),
        result: resultCell,
        correction: correctionCell === "—" ? null : stripMarkdown(correctionCell),
      });
    }
  }

  return rows;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}
