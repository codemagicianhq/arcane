#!/usr/bin/env tsx
/**
 * scripts/report.ts (SR-02) -- this repository's Show Report parity gate.
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
 * The generation core lives in src/modules/show-report/generate.ts (SR-03),
 * shared with the consumer-facing `spell report` command; this file only adds
 * the repository-specific template location and the --check/--fix CLI.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverPrograms,
  runReportGeneration,
  type SkippedPlan,
} from "../src/modules/show-report/generate.js";
import { isShallowRepository } from "../src/modules/show-report/sources.js";

export {
  TEMPLATE_VERSION,
  deterministicCompiledAt,
  discoverPrograms,
  programNameFromTitle,
} from "../src/modules/show-report/generate.js";

/** The canonical template in this repository's source tree (the published CLI reads dist/assets/ instead). */
export const TEMPLATE_RELPATH = "src/assets/report/show-report.template.html";

export type ReportMode = "check" | "fix";

export interface ReportCheckResult {
  drifted: string[];
  repaired: string[];
  skipped: SkippedPlan[];
}

export async function runReportCheck(
  mode: ReportMode,
  rootDir: string,
  only?: string,
): Promise<ReportCheckResult> {
  const discovery = await discoverPrograms(rootDir);
  const programs = only ? discovery.programs.filter((p) => p.slug === only) : discovery.programs;
  if (only && programs.length === 0) {
    throw new Error(
      `No program "${only}" with parseable epics under docs/plans/ (skipped: ${discovery.skipped.map((s) => `${s.slug} (${s.reason})`).join("; ") || "none"}).`,
    );
  }
  const result = await runReportGeneration({
    rootDir,
    templatePath: join(rootDir, TEMPLATE_RELPATH),
    mode: mode === "fix" ? "write" : "check",
    programs,
  });
  return { ...result, skipped: discovery.skipped };
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

  // A shallow clone cannot see the history the version span and cast derive
  // from; the regeneration would omit them and every report would read as
  // "drifted". Say what is actually wrong instead.
  if (mode === "check" && (await isShallowRepository(rootDir))) {
    console.error(
      "Show report: cannot verify in a shallow clone -- the version span and cast are derived from git history. Fetch it (`git fetch --unshallow`, or actions/checkout with fetch-depth: 0) and re-run.",
    );
    process.exitCode = 1;
    return;
  }

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
