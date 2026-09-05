/**
 * Builds a ShowReport (schema v2) from a program's real sources -- PLAN.md,
 * OPERATOR-QUEUE.md, docs/verification-ledger.md, and git history (SR-01).
 *
 * Deliberately does not populate `close` (DoD/drift verdicts): both existing
 * programs' close notes are free-form prose with no stable marker to extract
 * a verdict from without risking a misreport on exactly the field a reader
 * would trust most. Omitted rather than guessed, the same discipline the
 * schema's own `descriptionState: "unwritten"` convention already applies to
 * a missing `**Report:**` line -- absence stays visible instead of being
 * papered over. A future epic can add real close-note parsing once both
 * programs' close epics agree on a stable marker to key off.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ShowReport,
  ShowReportCorrections,
  ShowReportNeedsYou,
  ShowReportRow,
  ShowReportSection,
  ShowReportStat,
  ReportCategory,
} from "./types.js";
import {
  parseFrontmatter,
  parseEpics,
  parseParkedSection,
  computeCoverageOutcome,
  type ParsedEpic,
} from "./plan-parser.js";
import { parseOperatorQueue, type ParsedQueueEntry } from "./queue-parser.js";
import { parseVerificationLedgerSection, type ParsedLedgerRow } from "./ledger-parser.js";
import { parseAdrs, countAcceptedAdrsInWindow } from "./decisions-parser.js";
import { getVersionAtRef, getCloseCommit, getCast } from "./sources.js";

export interface BuildShowReportModelOptions {
  rootDir: string;
  slug: string;
  planRelPath: string;
  queueRelPath: string;
  ledgerProgramName: string;
  compiledAt: string;
  templateVersion: string;
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

/** `baseline: b0992c1 (main)` -> `b0992c1`. */
function extractSha(baselineField: string): string {
  return baselineField.trim().split(/\s+/)[0]!;
}

function epicToRow(epic: ParsedEpic): ShowReportRow {
  const category: ReportCategory = (epic.report?.category as ReportCategory | undefined) ?? "process";
  const row: ShowReportRow = {
    id: epic.id,
    title: epic.report?.titleOverride ?? epic.title,
    description: epic.report?.description ?? null,
    descriptionState: epic.report ? "authored" : "unwritten",
    category,
    // Last-cited PR link is closest, in reading order, to the epic's actual
    // completion note (earlier links in a long Done note are often an ADR's
    // own PR or an intermediate fix, not the epic's own shipping PR).
    href: epic.prLinks.length > 0 ? epic.prLinks[epic.prLinks.length - 1] : undefined,
    refs: epic.prLinks,
  };
  return row;
}

function buildSections(epics: ParsedEpic[]): ShowReportSection[] {
  const waveOrder: string[] = [];
  const byWave = new Map<string, ParsedEpic[]>();
  for (const epic of epics) {
    const wave = epic.wave ?? "Epics";
    if (!byWave.has(wave)) {
      byWave.set(wave, []);
      waveOrder.push(wave);
    }
    byWave.get(wave)!.push(epic);
  }
  return waveOrder.map((wave, i) => ({
    id: `wave-${i + 1}`,
    title: wave,
    rows: byWave.get(wave)!.map(epicToRow),
  }));
}

function buildStats(
  epics: ParsedEpic[],
  versionSpan: { from: string; to: string } | undefined,
  adrsAccepted: number | null,
): ShowReportStat[] {
  const done = epics.filter((e) => e.done).length;
  const allPrs = new Set(epics.flatMap((e) => e.prLinks));
  const stats: ShowReportStat[] = [
    { id: "epics", value: `${done}/${epics.length}`, label: "epics shipped", derived: true },
    { id: "prs", value: allPrs.size, label: "pull requests", derived: true },
  ];
  if (versionSpan) {
    stats.push({
      id: "version-span",
      value: `${versionSpan.from} → ${versionSpan.to}`,
      label: "version span",
      derived: true,
    });
  }
  if (adrsAccepted !== null) {
    stats.push({ id: "adrs", value: adrsAccepted, label: "ADRs accepted", derived: true });
  }
  return stats;
}

function buildNeedsYou(queueEntries: ParsedQueueEntry[]): ShowReportNeedsYou[] {
  return queueEntries
    .filter((e) => !e.done)
    .map((e) => {
      const entry: ShowReportNeedsYou = { id: e.id, title: e.title, reason: e.why ?? e.title };
      if (e.href) entry.href = e.href;
      return entry;
    });
}

/**
 * Shortens a ledger claim to title length at a word boundary. Cutting at a
 * fixed character offset split words mid-token on the live corpus ("...own
 * 'Related' line, cor..."), which reads as a rendering fault rather than an
 * abridgement. Falls back to a hard cut only when the first word alone is
 * already over the limit.
 */
function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const window = text.slice(0, limit - 1);
  const lastSpace = window.lastIndexOf(" ");
  const head = lastSpace > 0 ? window.slice(0, lastSpace) : window;
  return `${head.replace(/[\s,;:.—-]+$/, "")}…`;
}

function buildCorrections(
  ledgerRows: ParsedLedgerRow[],
  programName: string,
): ShowReportCorrections | undefined {
  if (ledgerRows.length === 0) return undefined;
  const corrected = ledgerRows.filter((r) => r.result === "corrected");
  const unverifiable = ledgerRows.filter((r) => r.result === "unverifiable").length;
  const highlights: ShowReportRow[] = corrected.slice(0, 3).map((row, i) => ({
    id: `correction-${i + 1}`,
    title: truncateAtWord(row.claim, 80),
    description: row.correction,
    descriptionState: row.correction ? "authored" : "unwritten",
    category: "fix",
    refs: [],
  }));
  return {
    checked: ledgerRows.length,
    corrected: corrected.length,
    unverifiable,
    scopeNote: `${programName} corrections logged in docs/verification-ledger.md`,
    highlights,
  };
}

export async function buildShowReportModel(options: BuildShowReportModelOptions): Promise<ShowReport> {
  const planAbsPath = join(options.rootDir, options.planRelPath);
  const queueAbsPath = join(options.rootDir, options.queueRelPath);
  const ledgerRelPath = "docs/verification-ledger.md";
  const ledgerAbsPath = join(options.rootDir, ledgerRelPath);
  const decisionsAbsPath = join(options.rootDir, "DECISIONS.md");

  const [planContent, queueContent, ledgerContent, decisionsContent] = await Promise.all([
    readFile(planAbsPath, "utf8"),
    readOptional(queueAbsPath),
    readOptional(ledgerAbsPath),
    readOptional(decisionsAbsPath),
  ]);

  const frontmatter = parseFrontmatter(planContent);
  const epics = parseEpics(planContent);
  const parked = parseParkedSection(planContent);
  const outcome = computeCoverageOutcome(planContent);
  const queueEntries = queueContent ? parseOperatorQueue(queueContent) : [];
  const ledgerRows = ledgerContent
    ? parseVerificationLedgerSection(ledgerContent, options.ledgerProgramName)
    : [];

  // "ADRs accepted" counts DECISIONS.md entries whose Date falls within this
  // program's own [created, completed] window (completed defaults to "now"
  // for a still-active program) and whose current Status is Accepted -- a
  // program with no `created` date at all has no window to count against.
  const adrsAccepted =
    decisionsContent && frontmatter.created
      ? countAcceptedAdrsInWindow(
          parseAdrs(decisionsContent),
          frontmatter.created,
          frontmatter.completed ?? options.compiledAt.slice(0, 10),
        )
      : null;

  let versionSpan: { from: string; to: string } | undefined;
  const cast = new Map<string, number>();
  if (frontmatter.baseline) {
    const baselineSha = extractSha(frontmatter.baseline);
    // A finished program's close is the commit `main` stood at when its own
    // `completed:` day ended (any path, by landing date) -- see getCloseCommit
    // for why neither "last commit touching PLAN.md" nor author dates hold up.
    // An in-progress program has no bound: "as of now".
    const closeSha = await getCloseCommit(options.rootDir, frontmatter.completed);
    if (closeSha) {
      const [from, to, castMap] = await Promise.all([
        getVersionAtRef(options.rootDir, baselineSha),
        getVersionAtRef(options.rootDir, closeSha),
        getCast(options.rootDir, baselineSha, closeSha),
      ]);
      if (from && to) versionSpan = { from, to };
      for (const [name, count] of castMap) cast.set(name, count);
    }
  }

  const done = epics.filter((e) => e.done).length;
  const title = frontmatter.title ?? options.slug;
  const corrections = buildCorrections(ledgerRows, options.ledgerProgramName);

  return {
    schemaVersion: 2,
    program: {
      id: options.slug,
      slug: options.slug,
      title,
      status: frontmatter.status ?? "unknown",
      baseline: frontmatter.baseline ?? "unknown",
      started: frontmatter.created ?? "unknown",
      ...(frontmatter.completed ? { completed: frontmatter.completed } : {}),
      ...(versionSpan ? { versionSpan } : {}),
    },
    masthead: {
      eyebrow: "Show Report",
      title,
      dek: `${frontmatter.status ?? "unknown"} — ${done} of ${epics.length} epics shipped`,
    },
    stats: buildStats(epics, versionSpan, adrsAccepted),
    ...(outcome ? { outcome } : {}),
    needsYou: buildNeedsYou(queueEntries),
    sections: buildSections(epics),
    ...(corrections ? { corrections } : {}),
    parked,
    cast: [...cast.entries()].map(([name, commits]) => ({ name, commits, source: "commit-trailer" as const })),
    provenance: {
      sources: [options.planRelPath, options.queueRelPath, ledgerRelPath],
      compiledAt: options.compiledAt,
      templateVersion: options.templateVersion,
    },
  };
}
