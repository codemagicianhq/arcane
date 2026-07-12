import chalk from "chalk";
import gradient from "gradient-string";
import { readManifest } from "./manifest.js";

const TAGLINE = "Cast spells to ship software";

// ─── Brand palette — steel blue (#6F9FD8) ────────────────────────────────────
const STEEL = "#6f9fd8";
const STEEL_DEEP = "#3a6ea5";
const STEEL_DIM = "#5d6f93";
const INK_LABEL = "#c7d2ee";
const FAINT = "#2c3658";

const STOPS = ["#2a4d7d", "#4a7bb5", "#6f9fd8", "#a9c8ec"];
const arcaneGradient = gradient(STOPS);

// ─── ARCANE wordmark ─────────────────────────────────────────────────────────
const WORDMARK = [
  " █████╗ ██████╗  ██████╗ █████╗ ███╗   ██╗███████╗",
  "██╔══██╗██╔══██╗██╔════╝██╔══██╗████╗  ██║██╔════╝",
  "███████║██████╔╝██║     ███████║██╔██╗ ██║█████╗",
  "██╔══██║██╔══██╗██║     ██╔══██║██║╚██╗██║██╔══╝",
  "██║  ██║██║  ██║╚██████╗██║  ██║██║ ╚████║███████╗",
  "╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝",
];
const INDENT = "  ";
const LOCKUP_WIDTH = INDENT.length + Math.max(...WORDMARK.map((l) => l.length));

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when the terminal can render the fade-in safely. */
function isAnimatable(): boolean {
  return (
    !!process.stdout.isTTY &&
    process.env["TERM"] !== "dumb" &&
    process.env["CI"] !== "true" &&
    process.env["ARCANE_DISABLE_ANIMATION"] !== "true" &&
    (process.stdout.columns ?? 80) >= LOCKUP_WIDTH
  );
}

/** Scale a hex color toward black by factor f (0..1) — used for the fade-in. */
function scale(hex: string, f: number): string {
  const v = (i: number): number =>
    Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f)));
  return "#" + [v(1), v(3), v(5)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Build the ARCANE wordmark lines at brightness f (1 = full color). */
function lockupLines(f = 1): string[] {
  const g = f >= 1 ? arcaneGradient : gradient(STOPS.map((c) => scale(c, f)));
  return WORDMARK.map((line) => INDENT + g(line));
}

function printFooter(version: string): void {
  const taglineText = `  ${TAGLINE} · agent-native SDLC · v${version}`;
  const width = Math.max(LOCKUP_WIDTH, taglineText.length);
  const border = chalk.hex(STEEL_DEEP)("─".repeat(width));
  console.log(border);
  console.log(
    chalk.hex(STEEL)(`  ${TAGLINE}`),
    chalk.hex(STEEL_DIM)(`· agent-native SDLC · v${version}`),
  );
  console.log(border);
}

/**
 * Prints the ARCANE wordmark static, with tagline and version.
 * Used by subcommands (init, etc.).
 */
export function printBanner(version: string): void {
  console.log();
  for (const line of lockupLines()) console.log(line);
  printFooter(version);
  console.log();
}

/**
 * Headline counts for the welcome — turns the installed component file list into
 * "N spells · N agents · N standards" (the manifest stores registry-relative,
 * forward-slash paths). Returns [] when nothing categorizable is installed, so
 * the caller can fall back to a plain component count.
 */
function installSummary(components: { files: string[] }[]): string[] {
  const files = components.flatMap((c) =>
    c.files.map((f) => f.replace(/\\/g, "/")),
  );
  const spells = new Set(
    files
      .filter((f) => /\/(prompts|commands)\/spell-.+\.md$/.test(f))
      .map((f) => f.split("/").pop()!.replace(/\.prompt\.md$|\.md$/, "")),
  ).size;
  const agents = files.filter((f) => /\/agents\/[^/]+\.agent\.md$/.test(f)).length;
  const standards = files.filter((f) =>
    /\/governance\/[^/]+\.md$/.test(f),
  ).length;
  const parts: string[] = [];
  if (spells) parts.push(`${spells} spell${spells === 1 ? "" : "s"}`);
  if (agents) parts.push(`${agents} agent${agents === 1 ? "" : "s"}`);
  if (standards) parts.push(`${standards} standard${standards === 1 ? "" : "s"}`);
  return parts;
}

/**
 * The bare-`spell` welcome screen: a soft fade-in of the lockup followed by a
 * single gentle pulse (strobe-safe — monotonic brightness ramps, no color
 * cycling), then real current state: whether Arcane is installed in this repo
 * (profile, components, version) and the Spell Loop. Falls back to a static
 * lockup on non-TTY / CI / narrow terminals.
 */
export async function printWelcome(version: string, cwd: string): Promise<void> {
  console.log();
  if (isAnimatable()) {
    const draw = (lines: string[], redraw: boolean): void => {
      if (redraw) process.stdout.write(`\x1b[${lines.length}A`);
      for (const line of lines) process.stdout.write(`\r\x1b[2K${line}\n`);
    };
    // 1. Fade in from dark — the mark materializes.
    const fade = [0.1, 0.22, 0.36, 0.52, 0.68, 0.84, 1];
    for (let i = 0; i < fade.length; i++) {
      draw(lockupLines(fade[i]!), i > 0);
      await sleep(90);
    }
    // 2. One gentle settling pulse — a single slow breath of brightness.
    const pulse = [1, 0.9, 0.82, 0.9, 1];
    for (let i = 0; i < pulse.length; i++) {
      draw(lockupLines(pulse[i]!), true);
      await sleep(140);
    }
  } else {
    for (const line of lockupLines()) console.log(line);
  }
  printFooter(version);
  console.log();

  const label = (s: string): string => chalk.hex(STEEL_DIM)(s.padEnd(11));
  const dot = chalk.hex(FAINT)("·");

  let repoLine: string;
  try {
    const manifest = await readManifest(cwd);
    const parts = installSummary(manifest.components);
    const summary = parts.length
      ? parts
      : [`${manifest.components.length} components`];
    repoLine =
      `${chalk.hex(STEEL)("✓")} Arcane ${chalk.hex(INK_LABEL)(`«${manifest.profile}»`)} ${dot} ` +
      summary.map((p) => chalk.hex(INK_LABEL)(p)).join(` ${dot} `) +
      ` ${dot} ${chalk.hex(STEEL_DIM)(`v${manifest.version}`)}`;
  } catch {
    repoLine =
      `${chalk.hex(STEEL_DIM)("○")} not initialized ${chalk.hex(FAINT)("—")} run ` +
      `${chalk.hex(STEEL).inverse(" spell init ")} ${chalk.hex(STEEL_DIM)("to scaffold")}`;
  }
  console.log(`  ${label("This repo")}${repoLine}`);

  const phases = ["plan", "architect", "implement", "test", "review", "ship"].join(
    chalk.hex(STEEL_DEEP)(" → "),
  );
  console.log(`  ${label("Spell Loop")}${chalk.hex("#dbe3f7")(phases)}`);

  // loop-back hint under the implement → test → review cycle
  const flat = ["plan", "architect", "implement", "test", "review", "ship"].join(" → ");
  const loopStart = 13 + flat.indexOf("implement"); // col under "implement"
  const loopEnd = 13 + flat.indexOf("review") + 5; // col under last char of "review"
  const inner = loopEnd - loopStart - 1;
  const lp = Math.floor((inner - 19) / 2); // 19 = visible width of " ↺ until it passes "
  const rp = inner - 19 - lp;
  const dash = (n: number): string => chalk.hex(STEEL_DEEP)("─".repeat(Math.max(0, n)));
  console.log(
    " ".repeat(loopStart) +
      chalk.hex(STEEL_DEEP)("╰") +
      dash(lp) +
      chalk.hex(STEEL)(" ↺ ") +
      chalk.hex(STEEL_DIM)("until it passes") +
      " " +
      dash(rp) +
      chalk.hex(STEEL_DEEP)("╯"),
  );
  console.log();
}

export function printSuccess(message: string): void {
  console.log(`\n${chalk.hex(STEEL)("✦")} ${chalk.bold(message)}`);
}

export function printStep(message: string): void {
  console.log(`  ${chalk.hex(STEEL_DEEP)("▸")} ${message}`);
}

export function printDryRun(message: string): void {
  console.log(`  ${chalk.yellow("◌")} ${chalk.dim(message)}`);
}

export function printSection(title: string): void {
  console.log(`\n${chalk.hex(STEEL)("─")} ${chalk.bold(title)}`);
}

export function printInfo(message: string): void {
  console.log(`  ${chalk.dim(message)}`);
}

export function printNextStep(step: number, message: string): void {
  console.log(`  ${chalk.hex(STEEL_DEEP)(`${step}.`)} ${message}`);
}

export function printWarning(message: string): void {
  console.log(`  ${chalk.yellow("⚠")}  ${chalk.yellow(message)}`);
}
