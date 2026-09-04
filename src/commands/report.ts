import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  discoverPrograms,
  programFromPlanPath,
  runReportGeneration,
  type ReportProgram,
  type SkippedPlan,
} from "../modules/show-report/generate.js";
import { isShallowRepository } from "../modules/show-report/sources.js";

export interface ReportCliOptions {
  /** Report on one PLAN.md instead of auto-discovering docs/plans/*\/PLAN.md. */
  plan?: string;
  /** Write show-report.{json,html} here instead of next to the plan. */
  out?: string;
  /** Accepted for forward compatibility; external snapshotting is not implemented yet. */
  refresh?: boolean;
}

/**
 * `spell report` (SR-03): generate a program's Show Report -- show-report.json
 * and show-report.html -- from its PLAN.md, OPERATOR-QUEUE.md, the
 * verification ledger and local git history. Offline by construction (ARC-042):
 * the template ships inside this package's dist/assets/, and nothing here
 * touches the network. Writes only files that differ from a fresh
 * regeneration, so re-running on an up-to-date repository changes nothing.
 */
export async function runReport(
  targetDir: string,
  options: ReportCliOptions = {},
  assetsDir: string,
): Promise<void> {
  const templatePath = join(assetsDir, "report", "show-report.template.html");
  try {
    await access(templatePath);
  } catch {
    console.error(
      `✖ arcane: report template not found at ${templatePath} -- this arcane-cli build is missing dist/assets/report/. Reinstall the package (or run \`npm run build\` in a source checkout).`,
    );
    process.exitCode = 1;
    return;
  }

  if (options.refresh) {
    console.log(
      "--refresh: external-data snapshotting (gh PR titles/merge dates) is not implemented yet; regenerating from local sources.",
    );
  }

  // Degrade visibly, not silently: the page still renders in a shallow clone,
  // but its version span and cast come from history the clone cannot see.
  if (await isShallowRepository(targetDir)) {
    console.warn(
      "⚠ arcane: shallow clone -- the report's version span and cast are derived from git history and will be omitted. Run `git fetch --unshallow` for a complete report.",
    );
  }

  let programs: ReportProgram[];
  let skipped: SkippedPlan[];
  if (options.plan) {
    const result = await programFromPlanPath(targetDir, options.plan);
    programs = result.program ? [result.program] : [];
    skipped = result.skipped ? [result.skipped] : [];
  } else {
    const discovery = await discoverPrograms(targetDir);
    programs = discovery.programs;
    skipped = discovery.skipped;
  }

  for (const s of skipped) console.log(`Skipped ${s.slug} -- ${s.reason}.`);

  if (programs.length === 0) {
    console.error(
      "✖ arcane: no program to report on -- expected docs/plans/<slug>/PLAN.md with `- [x] **ID — Title.**` epic bullets, or pass --plan <path>.",
    );
    process.exitCode = 1;
    return;
  }

  const result = await runReportGeneration({
    rootDir: targetDir,
    templatePath,
    mode: "write",
    programs,
    outDir: options.out,
  });

  for (const u of result.unwritten) {
    console.warn(
      `⚠ arcane: ${u.slug} has ${u.ids.length} epic(s) with no \`**Report:**\` line in PLAN.md -- they render as "unwritten": ${u.ids.join(", ")}.`,
    );
  }

  if (result.repaired.length === 0) {
    console.log(`Show report: ${programs.length} program(s) already up to date.`);
    return;
  }
  console.log(`Show report: wrote ${result.repaired.length} file(s).`);
  for (const path of result.repaired) console.log(`  ${path}`);
}
