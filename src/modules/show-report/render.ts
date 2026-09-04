/**
 * Renders a ShowReport into HTML through a Mustache template (SR-02).
 *
 * Mustache is logic-less, so anything the template cannot compute -- a
 * category's display label, whether a row has a link, the safe HTML form of
 * a description -- is precomputed here into a view model first. Every plain
 * field goes through Mustache's default `{{x}}` HTML escaping; the ONLY
 * triple-mustache (`{{{x}}}`) field the template may use is `descriptionHtml`,
 * which `inlineMarkupToHtml` produces by escaping everything and then
 * re-admitting exactly two constructs: `` `code` `` and `[text](https-url)`.
 */

import Mustache from "mustache";
import type { ReportCategory, ShowReport, ShowReportRow } from "./types.js";

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  spell: "New Spell",
  feature: "New Feature",
  governance: "Governance",
  decision: "Decision (ADR)",
  fix: "Bug Fix",
  process: "Process",
  docs: "Docs",
  platform: "Platform",
};

const CATEGORY_ORDER: ReportCategory[] = [
  "spell",
  "feature",
  "governance",
  "decision",
  "fix",
  "process",
  "docs",
  "platform",
];

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape first, then re-admit only `code` spans and `[text](http(s)://...)`
 * links. Because `"` and `'` are already entity-escaped by the time the link
 * regex runs, a URL cannot break out of the `href` attribute, and `<`/`>` in
 * link text cannot open a tag -- the two constructs are the whole allowlist.
 */
export function inlineMarkupToHtml(text: string): string {
  const escaped = escapeHtml(text);
  const withLinks = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2">$1</a>',
  );
  return withLinks.replace(/`([^`]+)`/g, "<code>$1</code>");
}

export interface ShowReportRowView extends ShowReportRow {
  categoryLabel: string;
  descriptionHtml: string | null;
  isUnwritten: boolean;
  hasHref: boolean;
}

function toRowView(row: ShowReportRow): ShowReportRowView {
  return {
    ...row,
    categoryLabel: CATEGORY_LABELS[row.category] ?? row.category,
    descriptionHtml: row.description === null ? null : inlineMarkupToHtml(row.description),
    isUnwritten: row.descriptionState === "unwritten",
    hasHref: typeof row.href === "string" && row.href.length > 0,
  };
}

export function buildShowReportView(model: ShowReport): Record<string, unknown> {
  const corrections = model.corrections
    ? { ...model.corrections, highlights: model.corrections.highlights.map(toRowView) }
    : undefined;
  return {
    ...model,
    sections: model.sections.map((section) => ({
      ...section,
      hasNote: typeof section.note === "string" && section.note.length > 0,
      rows: section.rows.map(toRowView),
    })),
    corrections,
    hasCorrections: corrections !== undefined,
    hasParked: model.parked.length > 0,
    hasCast: model.cast.length > 0,
    hasOutcome: typeof model.outcome === "string" && model.outcome.length > 0,
    hasVersionSpan: model.program.versionSpan !== undefined,
    needsYouCount: model.needsYou.length,
    compiledAtDate: model.colophon.compiledAt.slice(0, 10),
    legend: CATEGORY_ORDER.map((key) => ({ key, label: CATEGORY_LABELS[key] })),
    sourcesJoined: model.colophon.sources.join(", "),
  };
}

export function renderShowReport(model: ShowReport, templateHtml: string): string {
  // Mustache's built-in escaper also entity-encodes `/`, `=` and backticks
  // (`1/1` -> `1&#x2F;1`), which is safe but needlessly ugly in the shipped
  // source. The standard five-character set above is the sufficient HTML
  // escape for text content and quoted attributes, so it is used for both
  // the inline-markup path and every `{{x}}` tag -- one escaper, one rule.
  // Passed per call rather than assigned to `Mustache.escape` so this module
  // never mutates a shared global. Mustache hands the RAW interpolated value
  // to the escaper -- a number for `{{needsYouCount}}`, `{{commits}}` or a
  // numeric stat -- so coerce to string first, as mustache's own escaper does.
  return Mustache.render(templateHtml, buildShowReportView(model), undefined, {
    escape: (value: unknown) => escapeHtml(String(value)),
  });
}
