#!/usr/bin/env tsx
/**
 * scripts/demos.ts (ARC-058)
 *
 * The README's "See it in action" demos, generated from the real CLI so they
 * cannot go stale the way the hand-recorded GIFs did (they showed 33 spells
 * long after there were 43).
 *
 *   --fix    capture each scenario in scripts/lib/demos/scenarios.ts against the
 *            built CLI (dist/index.js) and write assets/demo/<id>.svg.
 *   --check  fail when a demo is missing, when its stamped version differs from
 *            package.json, when it differs from what the current CLI prints,
 *            when an SVG in assets/demo/ has no scenario, or when README.md
 *            shows a demo no scenario produces.
 *
 * Both need a build of the current source, and refuse a dist/index.js older
 * than src/: `npm run fix:demos` builds first; CI runs `check:demos` after its
 * build step. Both refuse a demo whose output contains this machine's home
 * directory, checkout path, host name or user name. package.json's `version`
 * lifecycle script runs `fix:demos`, so `npm version` regenerates the demos in
 * the same step that bumps the version, the way a release fills the README's
 * count markers through `fix:spell-catalog`.
 */

import { existsSync } from "node:fs";
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { homedir, hostname, userInfo } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_SCENARIOS } from "./lib/demos/scenarios.js";
import { captureScenario, framesFromEvents, stripEscapes } from "./lib/demos/capture.js";
import type { DemoEvent, DemoScenario } from "./lib/demos/capture.js";
import { renderDemoSvg, stampedVersion } from "./lib/demos/render-svg.js";
import type { StyledRun } from "./lib/demos/terminal.js";

/** Where the demos live, relative to the repository root (forward slashes on every platform). */
export const DEMO_DIR = "assets/demo";

export type DemosMode = "check" | "fix";

export interface DemosResult {
  drifted: string[];
  repaired: string[];
}

export interface DemosOptions {
  rootDir: string;
  scenarios?: readonly DemoScenario[];
  /** Replaced in tests; the default runs the built CLI. */
  capture?: (scenario: DemoScenario, cliPath: string) => Promise<DemoEvent[]>;
  /** Replaced in tests; the default compares dist/index.js with src/ by modification time. */
  staleBuild?: (rootDir: string) => Promise<string | null>;
  /** Replaced in tests; the default is this machine's home, user name, host name and the checkout. */
  privateValues?: string[];
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

/**
 * The most recently modified file or directory under `dir`, `dir` included.
 * Directories count because deleting or renaming a file changes only its
 * directory's modification time.
 */
async function newestModification(dir: string): Promise<{ path: string; mtimeMs: number }> {
  let newest = { path: dir, mtimeMs: (await stat(dir)).mtimeMs };
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const candidate = entry.isDirectory() ? await newestModification(path) : { path, mtimeMs: (await stat(path)).mtimeMs };
    if (candidate.mtimeMs > newest.mtimeMs) newest = candidate;
  }
  return newest;
}

/**
 * Why dist/ cannot be trusted to be the current source, or null when it can:
 * something under src/ changed (or was deleted) after dist/index.js was
 * written. (The built CLI reads its version from package.json when it runs, so
 * asking it for its version proves nothing about when it was built.)
 */
export async function defaultStaleBuild(rootDir: string): Promise<string | null> {
  const built = await stat(join(rootDir, "dist", "index.js"));
  const newest = await newestModification(join(rootDir, "src"));
  if (newest.mtimeMs <= built.mtimeMs) return null;
  const changed = newest.path.slice(rootDir.length + 1).replace(/\\/g, "/");
  // A clock-skewed file stays "newer" than every build; say so rather than loop on rebuilds.
  // One second of slack: file times are finer-grained than Date.now(), so a file just written can read as later.
  const future = newest.mtimeMs > Date.now() + 1_000 ? " (its modification time is in the future; touch it)" : "";
  return `${changed} changed after dist/index.js was built${future}.`;
}

/**
 * This machine's identifying values, none of which may appear in a published
 * demo. On CI (`CI=true`) the host and user names belong to a disposable
 * runner, not a person, and a short common one ("runner") would only block
 * builds, so only the paths are looked for there.
 */
export function machineValues(rootDir: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const values = [homedir(), rootDir];
  if (env["CI"] === "true") return values;
  values.push(hostname());
  try {
    values.push(userInfo().username);
  } catch {
    // No user database entry (some containers): nothing to look for.
  }
  return values;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The private values found in `content`: paths where they stand as a whole
 * path or a path's prefix, not inside a longer word or a web address ("/w" is
 * not in "http://www", "/home/me" is in "file:///home/me/x" and "/home/me."),
 * spelled with forward slashes, backslashes or JSON-escaped backslashes, and
 * after a file URL or a Windows `\\?\` prefix; and names as whole words. Names
 * shorter than four characters are not looked for, since they would match
 * ordinary words.
 */
export function privateValuesIn(content: string, values: readonly string[]): string[] {
  const found: string[] = [];
  for (const value of values) {
    if (value === "") continue;
    const isPath = /[\\/]/.test(value);
    if (isPath) {
      const trimmed = value.replace(/[\\/]+$/, "");
      if (trimmed === "") continue; // the filesystem root names nothing
      const backslashed = trimmed.replace(/\//g, "\\");
      const spellings = new Set([trimmed, trimmed.replace(/\\/g, "/"), backslashed, backslashed.replace(/\\/g, "\\\\")]);
      const pattern = [...spellings].map(escapeRegExp).join("|");
      // Allowed right after "file://" or "file:///" (a Windows file URL) and after the "\\?\" long-path prefix.
      const before = "(?:(?<=file:///?)|(?<=\\\\\\\\\\?\\\\)|(?<![\\w.~/\\\\-]))";
      const after = "(?![\\w~-]|\\.\\w)";
      if (new RegExp(`${before}(?:${pattern})${after}`, "i").test(content)) found.push(value);
    } else if (value.length >= 4 && new RegExp(`(?<![\\w-])${escapeRegExp(value)}(?![\\w-])`, "i").test(content)) {
      found.push(value);
    }
  }
  return found;
}

/** A screen row as text, its runs placed at their columns. */
function rowText(runs: readonly StyledRun[]): string {
  let line = "";
  for (const run of runs) line = line.padEnd(run.col, " ") + run.text;
  return line;
}

/**
 * Render one scenario from a fresh capture, refusing one whose text contains
 * any of `privateValues`. What is searched is what the CLI printed (after the
 * capture rewrote the paths it knows, escape sequences removed) and the
 * scenario's own title and description: the SVG's rows would split a wrapped
 * path in two, and its markup would match ordinary words.
 */
export async function renderScenario(
  scenario: DemoScenario,
  version: string,
  cliPath: string,
  capture: NonNullable<DemosOptions["capture"]> = captureScenario,
  privateValues: readonly string[] = [],
): Promise<string> {
  const events = await capture(scenario, cliPath);
  const printed = stripEscapes(events.map((event) => event.output).join(""));
  const frames = framesFromEvents(events, scenario.cols, scenario.rows);
  const svg = renderDemoSvg(frames, {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    version,
    cols: scenario.cols,
    rows: scenario.rows,
  });
  // What the terminal drew can differ from the stream (a backspace, a cursor move), so both are read.
  const drawn = frames.map((frame) => frame.screen.rows.map(rowText).join("\n")).join("\n");
  const leaked = privateValuesIn([printed, drawn, scenario.title, scenario.description].join("\n"), privateValues);
  if (leaked.length > 0) {
    throw new Error(
      `${DEMO_DIR}/${scenario.id}.svg would publish this machine's ${leaked.length === 1 ? "value" : "values"} ` +
        `${leaked.map((value) => JSON.stringify(value)).join(", ")}. Find where the CLI prints it and keep it out ` +
        "of the demo (scripts/lib/demos/capture.ts rewrites the paths it knows).",
    );
  }
  return svg;
}

export async function runDemos(mode: DemosMode, options: DemosOptions): Promise<DemosResult> {
  const { rootDir } = options;
  const scenarios = options.scenarios ?? DEMO_SCENARIOS;
  const capture = options.capture ?? captureScenario;
  const staleBuild = options.staleBuild ?? defaultStaleBuild;
  const pkg = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8")) as { version: string };

  const cliPath = join(rootDir, "dist", "index.js");
  if (!existsSync(cliPath)) {
    throw new Error("dist/index.js does not exist. Run `npm run build` first (`npm run fix:demos` builds for you).");
  }
  const stale = await staleBuild(rootDir);
  if (stale !== null) {
    throw new Error(`dist/ is older than the source: ${stale} Run \`npm run build\` first (\`npm run fix:demos\` builds for you).`);
  }
  const privateValues = options.privateValues ?? machineValues(rootDir);

  const drifted: string[] = [];
  const repaired: string[] = [];
  const known = new Set(scenarios.map((scenario) => `${scenario.id}.svg`));
  for (const scenario of scenarios) {
    const relative = `${DEMO_DIR}/${scenario.id}.svg`;
    const path = join(rootDir, relative);
    const actual = await readOptionalFile(path);
    const expected = await renderScenario(scenario, pkg.version, cliPath, capture, privateValues);

    if (actual === null) {
      drifted.push(`${relative} does not exist.`);
    } else if (stampedVersion(actual) !== pkg.version) {
      drifted.push(`${relative} is stamped ${stampedVersion(actual) ?? "with no version"}; package.json is ${pkg.version}.`);
    } else if (normalizeLineEndings(actual) !== expected) {
      drifted.push(`${relative} no longer matches what the current CLI prints.`);
    } else {
      continue;
    }
    if (mode === "fix") {
      await writeFile(path, expected, "utf8");
      repaired.push(relative);
    }
  }

  // A demo no scenario produces would never be checked again.
  const committed = (await readdir(join(rootDir, DEMO_DIR)).catch(() => [] as string[])).filter((name) => name.endsWith(".svg"));
  for (const name of committed.filter((file) => !known.has(file)).sort()) {
    const relative = `${DEMO_DIR}/${name}`;
    drifted.push(`${relative} has no scenario in scripts/lib/demos/scenarios.ts.`);
    if (mode === "fix") {
      await unlink(join(rootDir, relative));
      repaired.push(relative);
    }
  }

  // The README may show only demos a scenario keeps current. Not repairable here.
  const readme = (await readOptionalFile(join(rootDir, "README.md"))) ?? "";
  for (const match of readme.matchAll(/assets\/demo\/([^"')\s?#]+)/g)) {
    if (!known.has(match[1])) drifted.push(`README.md shows assets/demo/${match[1]}, which no scenario produces.`);
  }
  return { drifted, repaired };
}

async function main(): Promise<void> {
  const [argument] = process.argv.slice(2);
  if (!["--check", "--fix"].includes(argument ?? "")) {
    console.error("Usage: tsx scripts/demos.ts --check|--fix");
    process.exitCode = 2;
    return;
  }
  const mode: DemosMode = argument === "--fix" ? "fix" : "check";
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  // Exit through process.exit on Ctrl-C or a cancelled job, so the capture's
  // exit handler stops the CLI and removes its temporary repository.
  process.once("SIGINT", () => process.exit(130));
  process.once("SIGTERM", () => process.exit(143));
  const result = await runDemos(mode, { rootDir });

  if (mode === "fix") {
    console.log(`README demos: regenerated or removed ${result.repaired.length} file(s).`);
    for (const path of result.repaired) console.log(`  ${existsSync(join(rootDir, path)) ? "wrote" : "removed"} ${path}`);
    const left = result.drifted.filter((message) => !result.repaired.some((path) => message.startsWith(path)));
    if (left.length === 0) return;
    console.error("README demos: these need a hand fix:");
    for (const message of left) console.error(`  ${message}`);
    process.exitCode = 1;
    return;
  }
  if (result.drifted.length > 0) {
    console.error("README demos FAILED: assets/demo/ is out of date with the CLI.");
    for (const message of result.drifted) console.error(`  ${message}`);
    console.error("Run `npm run fix:demos`; never hand-edit the demo SVGs.");
    process.exitCode = 1;
    return;
  }
  console.log(`README demos passed: ${DEMO_SCENARIOS.length} demos match the CLI at package.json's version.`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error("demos failed:", error);
    process.exitCode = 1;
  });
}
