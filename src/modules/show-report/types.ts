/**
 * show-report.json schema v1 (SR-01). Frozen at SR-05b start per
 * docs/plans/show-report/PLAN.md's Data contract section -- additive changes
 * only after that point. This file is the literal TypeScript form of the
 * interfaces defined there; keep the two in sync by hand until a generator
 * exists (no such generator is in scope for this program).
 */

export type ReportCategory =
  | "spell"
  | "feature"
  | "governance"
  | "decision"
  | "fix"
  | "process"
  | "docs"
  | "platform";

export interface ShowReportRow {
  id: string;
  glyph?: string;
  title: string;
  description: string | null;
  descriptionState: "authored" | "unwritten";
  category: ReportCategory;
  href?: string;
  refs: string[];
  by?: string[];
  date?: string;
}

export interface ShowReportSection {
  id: string;
  title: string;
  note?: string;
  rows: ShowReportRow[];
}

export interface ShowReportStat {
  id: string;
  value: string | number;
  label: string;
  derived: true;
}

export interface ShowReportNeedsYou {
  id: string;
  title: string;
  reason: string;
  href?: string;
}

export interface ShowReportCorrections {
  checked: number;
  corrected: number;
  unverifiable: number;
  scopeNote: string;
  highlights: ShowReportRow[];
}

export interface ShowReportParkedItem {
  title: string;
  reason: string;
}

export interface ShowReportClose {
  dodVerdict?: string;
  driftVerdict?: string;
  deviations: string[];
}

export interface ShowReportCastMember {
  name: string;
  commits: number;
  source: "commit-trailer";
}

export interface ShowReportColophon {
  sources: string[];
  compiledAt: string;
  templateVersion: string;
}

export interface ShowReportProgram {
  id: string;
  slug: string;
  title: string;
  status: string;
  baseline: string;
  started: string;
  completed?: string;
  versionSpan?: { from: string; to: string };
}

export interface ShowReportMasthead {
  eyebrow: string;
  title: string;
  dek: string;
}

export interface ShowReport {
  schemaVersion: 1;
  program: ShowReportProgram;
  masthead: ShowReportMasthead;
  stats: ShowReportStat[];
  outcome?: string;
  needsYou: ShowReportNeedsYou[];
  sections: ShowReportSection[];
  corrections?: ShowReportCorrections;
  parked: ShowReportParkedItem[];
  close?: ShowReportClose;
  cast: ShowReportCastMember[];
  colophon: ShowReportColophon;
}
