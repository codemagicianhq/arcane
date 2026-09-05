/**
 * Show Report generation core (SR-02/SR-03): program discovery, the
 * deterministic compile date, JSON + HTML generation, and the check/write
 * parity loop. Shared by scripts/report.ts (this repository's --check/--fix
 * gate, template from src/assets/) and src/commands/report.ts (`spell report`
 * in a consumer repository, template from the installed package's
 * dist/assets/). Lives in src/ because scripts/ is not bundled into the
 * published CLI.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { buildShowReportModel } from "./model.js";
import { renderShowReport } from "./render.js";
import { parseEpics, parseFrontmatter } from "./plan-parser.js";
import type { ShowReport } from "./types.js";

/**
 * Recorded in provenance.templateVersion. "v0-interim" is the hand-CSS template
 * SR-02 ships; SR-06 replaces it with the arcane-ui version the compiled
 * template was built from.
 */
export const TEMPLATE_VERSION = "v0-interim";

export const NO_EPICS_REASON = "no parseable `- [x] **ID — Title.**` epic bullets";

export interface ReportProgram {
  slug: string;
  planRelPath: string;
  queueRelPath: string;
  ledgerProgramName: string;
}

export interface SkippedPlan {
  slug: string;
  reason: string;
}

export interface ReportDiscovery {
  programs: ReportProgram[];
  /** Plans found but skipped, with the reason -- reported, never silent. */
  skipped: SkippedPlan[];
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

function toPosix(path: string): string {
  return path.replace(/\\/g, "/");
}

async function programFromPlan(
  rootDir: string,
  slug: string,
  planRelPath: string,
): Promise<{ program?: ReportProgram; skipped?: SkippedPlan }> {
  let planContent: string;
  try {
    planContent = await readFile(join(rootDir, planRelPath), "utf8");
  } catch {
    return { skipped: { slug, reason: `no PLAN.md at ${planRelPath}` } };
  }
  if (parseEpics(planContent).length === 0) {
    // A plan whose epics live in a table (like show-report's own) parses to
    // zero rows; an empty report for it would be noise, not information.
    return { skipped: { slug, reason: NO_EPICS_REASON } };
  }
  const frontmatter = parseFrontmatter(planContent);
  return {
    program: {
      slug,
      planRelPath,
      queueRelPath: toPosix(join(dirname(planRelPath), "OPERATOR-QUEUE.md")),
      ledgerProgramName: programNameFromTitle(frontmatter.title ?? slug),
    },
  };
}

/** Every `docs/plans/<slug>/PLAN.md` under `rootDir`, sorted by slug. */
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
  const skipped: SkippedPlan[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const result = await programFromPlan(rootDir, entry.name, `docs/plans/${entry.name}/PLAN.md`);
    if (result.program) programs.push(result.program);
    if (result.skipped) skipped.push(result.skipped);
  }
  return { programs, skipped };
}

/**
 * One program from an explicit PLAN.md path (absolute, or relative to
 * `rootDir`). The slug is the plan's parent directory name, matching the
 * `docs/plans/<slug>/` convention without requiring it.
 */
export async function programFromPlanPath(
  rootDir: string,
  planPath: string,
): Promise<{ program?: ReportProgram; skipped?: SkippedPlan }> {
  const planAbs = isAbsolute(planPath) ? planPath : resolve(rootDir, planPath);
  const planRelPath = toPosix(relative(rootDir, planAbs));
  return programFromPlan(rootDir, basename(dirname(planAbs)), planRelPath);
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

export type GenerationMode = "check" | "write";

export interface ReportGenerationOptions {
  rootDir: string;
  /** Absolute path to show-report.template.html. */
  templatePath: string;
  mode: GenerationMode;
  programs: ReportProgram[];
  /** Override the output directory (default: next to each program's PLAN.md). Absolute, or relative to `rootDir`. */
  outDir?: string;
}

export interface UnwrittenRow {
  slug: string;
  /** Epic ids whose `**Report:**` line is missing, so the report renders them as "unwritten". */
  ids: string[];
}

export interface ReportGenerationResult {
  /** Outputs that do not match a regeneration (line-ending-normalized), as rootDir-relative paths. */
  drifted: string[];
  /** Outputs written in `write` mode, as rootDir-relative paths. */
  repaired: string[];
  /**
   * Epics rendering as `unwritten` (SR-04). Advisory, never a failure: the
   * capture point (`## For the record` at PR time) only applies going forward,
   * and a report is more honest showing a visible gap than blocking on one.
   */
  unwritten: UnwrittenRow[];
}

/**
 * Regenerates every program's show-report.{json,html} in memory and compares
 * against what is on disk; `write` mode also writes the differing files.
 * Mirrors scripts/spell-catalog.ts's parity gate (ARC-012) so a committed
 * generated artifact can never silently drift from its sources.
 */
export async function runReportGeneration(options: ReportGenerationOptions): Promise<ReportGenerationResult> {
  const templateHtml = await readFile(options.templatePath, "utf8");
  const drifted: string[] = [];
  const repaired: string[] = [];
  const unwritten: UnwrittenRow[] = [];

  for (const program of options.programs) {
    const generated = await generateReport(options.rootDir, program, templateHtml);
    const missing = (JSON.parse(generated.json) as ShowReport).sections
      .flatMap((section) => section.rows)
      .filter((row) => row.descriptionState === "unwritten")
      .map((row) => row.id);
    if (missing.length > 0) unwritten.push({ slug: program.slug, ids: missing });
    const outAbs = options.outDir
      ? isAbsolute(options.outDir)
        ? options.outDir
        : resolve(options.rootDir, options.outDir)
      : resolve(options.rootDir, dirname(program.planRelPath));
    const outRel = toPosix(relative(options.rootDir, outAbs));
    const outputs: [string, string][] = [
      [`${outRel}/show-report.json`, generated.json],
      [`${outRel}/show-report.html`, generated.html],
    ];
    for (const [relPath, expected] of outputs) {
      const actual = await readOptionalFile(join(options.rootDir, relPath));
      if (actual === null || normalizeLineEndings(actual) !== normalizeLineEndings(expected)) {
        drifted.push(`${relPath} does not match a regeneration from its sources.`);
        if (options.mode === "write") {
          await mkdir(outAbs, { recursive: true });
          await writeFile(join(options.rootDir, relPath), expected, "utf8");
          repaired.push(relPath);
        }
      }
    }
  }

  return { drifted, repaired, unwritten };
}
