/**
 * The journal index (PRD ST-05, architecture D7): every
 * `journal/YYYY-MM-DD-<slug>.md` as date, slug, title and path, sorted by
 * date then slug. The title is the frontmatter `title:` or the first `# `
 * heading; only the head of each file is read, never its body (ST-11).
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { JournalEntry } from "./types.js";

const JOURNAL_DIR = "journal";
const ENTRY_NAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;

/** The frontmatter `title:` (quotes stripped) or the first `# ` heading, or null. */
export function journalTitle(content: string): string | null {
  const text = content.replace(/\r\n?/g, "\n");
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text);
  if (frontmatter) {
    const title = /^title:\s*(.+)$/m.exec(frontmatter[1]);
    if (title) return title[1].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  const heading = /^# (.+?)\s*$/m.exec(text);
  return heading ? heading[1].trim() : null;
}

export interface CollectJournalResult {
  /** Sorted by date then slug; null when journal/ is absent. */
  journal: JournalEntry[] | null;
  warnings: string[];
}

export async function collectJournal(root: string): Promise<CollectJournalResult> {
  const dir = join(root, JOURNAL_DIR);
  let names: string[];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    // Dotfiles (`.gitkeep` keeps the directory in git) and subdirectories are
    // not journal entries and not worth a warning.
    names = entries.filter((entry) => entry.isFile() && !entry.name.startsWith(".")).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { journal: null, warnings: [] };
    return {
      journal: null,
      warnings: [`indexes.journal: ${JOURNAL_DIR}/ could not be read (${error instanceof Error ? error.message : String(error)})`],
    };
  }

  const warnings: string[] = [];
  const journal: JournalEntry[] = [];
  for (const name of names) {
    const match = ENTRY_NAME.exec(name);
    if (!match) {
      warnings.push(`indexes.journal: ${JOURNAL_DIR}/${name} does not match YYYY-MM-DD-<slug>.md and was skipped`);
      continue;
    }
    let title: string | null = null;
    try {
      title = journalTitle(await readFile(join(dir, name), "utf8"));
    } catch (error) {
      warnings.push(`indexes.journal: ${JOURNAL_DIR}/${name} could not be read (${error instanceof Error ? error.message : String(error)})`);
    }
    if (title === null) warnings.push(`indexes.journal: ${JOURNAL_DIR}/${name} has no title: frontmatter or # heading`);
    journal.push({ date: match[1], slug: match[2], title, path: `${JOURNAL_DIR}/${name}` });
  }
  journal.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return { journal, warnings };
}
