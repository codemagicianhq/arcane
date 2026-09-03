#!/usr/bin/env tsx
/**
 * scripts/report.ts (SR-02) -- Show Report generator and parity gate.
 *
 *   --check   regenerate every program's show-report.{json,html} in memory and
 *             compare (line-ending-normalized) against the committed files;
 *             exit 1 on drift. Network-free and deterministic: every input is
 *             the local tree plus local git history, and the colophon's
 *             `compiledAt` comes from the plan's own dates, never wall-clock.
 *   --fix     same, but write the regenerated files.
 *   --refresh accepted for the documented CLI surface; external-data
 *             snapshotting (gh PR titles/merge dates) is not implemented yet,
 *             so it regenerates from local sources exactly like --fix and
 *             says so, rather than pretending to fetch anything.
 *   --all | --program <slug>   which docs/plans/<slug>/PLAN.md to process.
 *
 * Mirrors scripts/spell-catalog.ts's --check/--fix shape (ARC-012's parity
 * guard for committed generated artifacts).
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildShowReportModel } from "../src/modules/show-report/model.js";
import { renderShowReport } from "../src/modules/show-report/render.js";
import { parseEpics, parseFrontmatter } from "../src/modules/show-report/plan-parser.js";

export const TEMPLATE_RELPATH = "src/assets/report/show-report.template.html";

/**
 * Recorded in colophon.templateVersion. "v0-interim" is the hand-CSS template
 * this epic ships; SR-06 replaces it with the arcane-ui version the compiled
 * template was built from.
 */
export const TEMPLATE_VERSION = "v0-interim";

export interface ReportProgram {
  slug: string;
  planRelPath: string;
  queueRelPath: string;
  ledgerProgramName: string;
}

export interface ReportDiscovery {
  programs: ReportProgram[];
  /** Plans found but skipped, with the reason -- reported, never silent. */
  skipped: { slug: string; reason: string }[];
}

export interface ReportCheckResult {
  drifted: string[];
  repaired: string[];
  skipped: { slug: string; reason: string }[];
}

/** `"Lessons Hardening — Mechanical Enforcement ..."` -> `"Lessons Hardening"`, the form ledger headings use. */
export function programNameFromTitle(title: string): string {
  return title.split(" — ")[0]!.trim();
}

/**
 * Deterministic compile date: the most recent date the plan itself records.
 * Wall-clock would make --check fail on every run. Limitation, disclosed: for
 * a still-active program this is its activation/creation date, so the
 * ADRs-accepted window (model.ts) ends there until the plan gains a
 * `completed:` date.
 */
export function deterministicCompiledAt(frontmatter: {
  completed?: string;
  activated?: string;
  created?: string;
}): string {
  return frontmatter.completed ?? frontmatter.activated ?? frontmatter.created ?? "unknown";
}

export async function discoverPrograms(rootDir: string): Promise<ReportDiscovery> {
  const plansDir = join(rootDir, "docs", "plans");
  let entries;
  try {
    entries = (await readdir(plansDir, { withFileTypes: true })).filter((e) => e.isDirectory());
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { programs: [], skipped: [] };
    throw error;
  }

  const programs: ReportProgram[] = [];
  const skipped: { slug: string; reason: string }[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const slug = entry.name;
    const planRelPath = `docs/plans/${slug}/PLAN.md`;
    let planContent: string;
    try {
      planContent = await readFile(join(rootDir, planRelPath), "utf8");
    } catch {
      skipped.push({ slug, reason: "no PLAN.md" });
      continue;
    }
    const epics = parseEpics(planContent);
    if (epics.length === 0) {
      // A plan whose epics live in a table (like show-report's own) parses to
      // zero rows; an empty report for it would be noise, not information.
      skipped.push({ slug, reason: "no parseable `- [x] **ID — Title.**` epic bullets" });
      continue;
    }
    const frontmatter = parseFrontmatter(planContent);
    programs.push({
      slug,
      planRelPath,
      queueRelPath: `docs/plans/${slug}/OPERATOR-QUEUE.md`,
      ledgerProgramName: programNameFromTitle(frontmatter.title ?? slug),
    });
  }
  return { programs, skipped };
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export interface GeneratedReport {
  json: string;
  html: string;
}

export async function generateReport(
  rootDir: string,
  program: ReportProgram,
  templateHtml: string,
): Promise<GeneratedReport> {
  const planContent = await readFile(join(rootDir, program.planRelPath), "utf8");
  const frontmatter = parseFrontmatter(planContent);
  const model = await buildShowReportModel({
    rootDir,
    slug: program.slug,
    planRelPath: program.planRelPath,
    queueRelPath: program.queueRelPath,
    ledgerProgramName: program.ledgerProgramName,
    compiledAt: deterministicCompiledAt(frontmatter),
    templateVersion: TEMPLATE_VERSION,
  });
  return {
    json: `${JSON.stringify(model, null, 2)}\n`,
    html: renderShowReport(model, templateHtml),
  };
}

export type ReportMode = "check" | "fix";

export async function runReportCheck(
  mode: ReportMode,
  rootDir: string,
  only?: string,
): Promise<ReportCheckResult> {
  const templateHtml = await readFile(join(rootDir, TEMPLATE_RELPATH), "utf8");
  const discovery = await discoverPrograms(rootDir);
  const programs = only ? discovery.programs.filter((p) => p.slug === only) : discovery.programs;
  if (only && programs.length === 0) {
    throw new Error(
      `No program "${only}" with parseable epics under docs/plans/ (skipped: ${discovery.skipped.map((s) => `${s.slug} (${s.reason})`).join("; ") || "none"}).`,
    );
  }

  const drifted: string[] = [];
  const repaired: string[] = [];

  for (const program of programs) {
    const generated = await generateReport(rootDir, program, templateHtml);
    const outputs: [string, string][] = [
      [`docs/plans/${program.slug}/show-report.json`, generated.json],
      [`docs/plans/${program.slug}/show-report.html`, generated.html],
    ];
    for (const [relPath, expected] of outputs) {
      const actual = await readOptionalFile(join(rootDir, relPath));
      if (actual === null || normalizeLineEndings(actual) !== normalizeLineEndings(expected)) {
        drifted.push(`${relPath} does not match a regeneration from its sources.`);
        if (mode === "fix") {
          await writeFile(join(rootDir, relPath), expected, "utf8");
          repaired.push(relPath);
        }
      }
    }
  }

  return { drifted, repaired, skipped: discovery.skipped };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const modeFlag = args.find((a) => a === "--check" || a === "--fix" || a === "--refresh");
  const programIndex = args.indexOf("--program");
  const only = programIndex !== -1 ? args[programIndex + 1] : undefined;
  const all = args.includes("--all");

  if (!modeFlag || (!all && !only)) {
    console.error("Usage: tsx scripts/report.ts --check|--fix|--refresh (--all | --program <slug>)");
    process.exitCode = 2;
    return;
  }

  if (modeFlag === "--refresh") {
    console.log(
      "--refresh: external-data snapshotting (gh PR titles/merge dates) is not implemented yet; regenerating from local sources, same as --fix.",
    );
  }
  const mode: ReportMode = modeFlag === "--check" ? "check" : "fix";
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const result = await runReportCheck(mode, rootDir, only);

  for (const s of result.skipped) console.log(`Show report: skipped ${s.slug} -- ${s.reason}.`);

  if (mode === "fix") {
    console.log(`Show report: regenerated ${result.repaired.length} file(s).`);
    for (const path of result.repaired) console.log(`  ${path}`);
    return;
  }

  if (result.drifted.length > 0) {
    console.error("Show report FAILED: committed show-report.{json,html} are out of date with their sources.");
    for (const message of result.drifted) console.error(`  ${message}`);
    console.error("Run `npm run fix:report`; never hand-edit docs/plans/*/show-report.{json,html}.");
    process.exitCode = 1;
    return;
  }

  console.log("Show report passed: every docs/plans/*/show-report.{json,html} matches a regeneration from its sources.");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error("report failed:", error);
    process.exitCode = 1;
  });
}
