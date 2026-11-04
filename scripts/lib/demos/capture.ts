/**
 * scripts/lib/demos/capture.ts
 *
 * Runs the built CLI for a README demo and records what it prints (ARC-058).
 *
 * The run is made reproducible so a regeneration is byte-for-byte equal
 * whenever the CLI's output is:
 *   - a fresh temporary git repository and an empty temporary HOME, so nothing
 *     from the machine (global git config, an existing roster, a cached update
 *     check) reaches the output, and nothing the CLI writes reaches the real home;
 *   - an environment built from scratch rather than inherited, with colour,
 *     terminal and timezone fixed;
 *   - a preload shim that gives the CLI a TTY of fixed size, so it takes its
 *     interactive code paths, and merges stderr into stdout so their order is kept;
 *   - scripted keystrokes, each sent only once the text it answers has rendered
 *     (matched with escape sequences removed) and the output has gone quiet;
 *   - synthetic timing: holds and typing speed come from the scenario, never
 *     from the clock, so how fast the machine ran does not change the file;
 *   - the temporary paths rewritten to `~/demo` and `~` before anything is kept.
 */

import { spawn, execFileSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import { mkdtemp, mkdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { VirtualTerminal } from "./terminal.js";
import type { ScreenSnapshot } from "./terminal.js";

export const KEY_DOWN = "\u001b[B";
export const KEY_ENTER = "\r";

/** Milliseconds per character when the demo types a command at the prompt. */
export const TYPING_MS = 55;
/** Milliseconds per line when finished output is revealed. */
export const LINE_REVEAL_MS = 35;
/** The shell prompt drawn before each command. */
export const SHELL_PROMPT = "\u001b[38;2;168;85;247m$\u001b[39m ";

/** One keystroke (or a short burst sent together) answering a prompt. */
export interface DemoKey {
  keys: string;
  /**
   * Text that must have rendered, since the previous key was sent, before these
   * keys are: the prompt being answered, or the echo of the previous key.
   * Matched against the output with escape sequences removed.
   */
  waitFor: string;
  /** How long the screen is shown before the keys are sent, so it can be read. */
  holdMs: number;
}

export interface DemoCommand {
  /** Arguments after `spell`; shown at the prompt joined by spaces, so none may need quoting. */
  args: string[];
  keys?: DemoKey[];
  /** How long the finished output stays on screen. */
  holdMs: number;
}

export interface DemoScenario {
  /** The file name under assets/demo/, without `.svg`. */
  id: string;
  /** The window title, after `spell`. */
  title: string;
  /**
   * A sentence for the SVG's <desc>. README.md's alt text for the demo is this
   * sentence after "Animated terminal recording: " (test/demos.test.ts holds them together).
   */
  description: string;
  cols: number;
  rows: number;
  commands: DemoCommand[];
}

/** What the terminal is fed, and how long the result stays on screen. */
export interface DemoEvent {
  output: string;
  holdMs: number;
}

export interface DemoFrame {
  screen: ScreenSnapshot;
  durationMs: number;
}

/**
 * Type `text` into the prompt labelled `prompt` a character at a time, each
 * held for `holdMs`, then press Enter after `enterHoldMs`. Each key waits for
 * the previous one's echo: the prompt, then the prompt followed by what has
 * been typed so far.
 */
export function answer(prompt: string, text: string, holdMs: number, enterHoldMs: number): DemoKey[] {
  const chars = [...text];
  const keys: DemoKey[] = chars.map((ch, index) => ({
    keys: ch,
    holdMs,
    waitFor: index === 0 ? prompt : `${prompt} ${chars.slice(0, index).join("")}`,
  }));
  keys.push({ keys: KEY_ENTER, holdMs: enterHoldMs, waitFor: `${prompt} ${text}` });
  return keys;
}

// CSI, OSC/DCS/APC/PM/SOS strings, three-character escapes (charset and line
// attributes), and two-character escapes.
// eslint-disable-next-line no-control-regex -- matching ESC is the point: these are terminal control sequences.
const ESCAPE_SEQUENCE = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b[\]P_^X][^\u0007\u001b]*(?:\u0007|\u001b\\)?|\u001b[()*+#%].?|\u001b[^[\]P_^X]?/g;

/** Output as a reader sees its text: escape sequences removed. */
export function stripEscapes(output: string): string {
  return output.replace(ESCAPE_SEQUENCE, "");
}

/** `node --import`, which loads the TTY shim, exists from Node 19.0 and, backported, 18.18. */
export function supportsImportFlag(version: string): boolean {
  const [major = 0, minor = 0] = version.replace(/^v/, "").split(".").map(Number);
  if (major === 18) return minor >= 18;
  return major >= 19;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rewrite everything machine-specific in captured output: CRLF becomes LF, and
 * each path in `replacements` (longest first, so a path is replaced before its
 * prefix) becomes its placeholder, spelled with forward or back slashes.
 */
export function normalizeOutput(output: string, replacements: ReadonlyArray<readonly [string, string]>): string {
  let result = output.replace(/\r\n/g, "\n");
  const ordered = [...replacements].filter(([from]) => from.length > 0).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of ordered) {
    const spellings = new Set([from, from.replace(/\\/g, "/"), from.replace(/\//g, "\\")]);
    for (const spelling of spellings) {
      result = result.replace(new RegExp(escapeRegExp(spelling), "g"), to);
    }
  }
  return result;
}

// A cursor movement or erase: output that redraws the screen, which cannot be
// revealed line by line without showing half-drawn states.
// eslint-disable-next-line no-control-regex -- matching ESC is the point: these are terminal control sequences.
const CURSOR_CONTROL = /\u001b\[[0-9;?]*[A-HJKf]/g;

/**
 * Split a command's finished output into events: everything up to the end of
 * the line holding the last cursor control at once, then one line at a time.
 */
export function revealByLine(output: string, holdMs: number): DemoEvent[] {
  let start = 0;
  for (const match of output.matchAll(CURSOR_CONTROL)) start = match.index + match[0].length;
  if (start > 0) {
    const newline = output.indexOf("\n", start);
    start = newline === -1 ? output.length : newline + 1;
  }
  const events: DemoEvent[] = [];
  if (start > 0) events.push({ output: output.slice(0, start), holdMs: LINE_REVEAL_MS });
  const rest = output.slice(start);
  for (const line of rest.match(/[^\n]*\n|[^\n]+$/g) ?? []) events.push({ output: line, holdMs: LINE_REVEAL_MS });
  if (events.length === 0) return [{ output, holdMs }];
  events[events.length - 1].holdMs = holdMs;
  return events;
}

/**
 * Turn a command's captured segments into events: the prompt, the command typed
 * a character at a time, each prompt held before its keys were sent, then the
 * finished output revealed by line.
 */
export function commandEvents(command: DemoCommand, segments: string[], firstHoldMs: number): DemoEvent[] {
  const keys = command.keys ?? [];
  if (segments.length !== keys.length + 1) {
    throw new Error(`Expected ${keys.length + 1} output segments for \`spell ${command.args.join(" ")}\`, got ${segments.length}.`);
  }
  const events: DemoEvent[] = [{ output: SHELL_PROMPT, holdMs: firstHoldMs }];
  for (const ch of ["spell", ...command.args].join(" ")) events.push({ output: ch, holdMs: TYPING_MS });
  events.push({ output: "\n", holdMs: LINE_REVEAL_MS });
  keys.forEach((key, index) => events.push({ output: segments[index], holdMs: key.holdMs }));
  events.push(...revealByLine(segments[segments.length - 1], command.holdMs));
  return events;
}

function sameScreen(a: ScreenSnapshot, b: ScreenSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Play events through a virtual terminal; identical consecutive frames merge. */
export function framesFromEvents(events: DemoEvent[], cols: number, rows: number): DemoFrame[] {
  const terminal = new VirtualTerminal(cols, rows);
  const frames: DemoFrame[] = [];
  for (const event of events) {
    terminal.write(event.output);
    const screen = terminal.snapshot();
    const previous = frames[frames.length - 1];
    if (previous !== undefined && sameScreen(previous.screen, screen)) previous.durationMs += event.holdMs;
    else frames.push({ screen, durationMs: event.holdMs });
  }
  return frames;
}

/**
 * The preload shim: a TTY of the scenario's size, raw mode accepted as a no-op
 * (stdin is a pipe), full colour, and stderr written through stdout.
 */
export function ttyShimSource(cols: number, rows: number): string {
  return [
    "for (const s of [process.stdin, process.stdout, process.stderr]) Object.defineProperty(s, 'isTTY', { value: true, configurable: true });",
    "process.stdin.setRawMode = function () { return this; };",
    "for (const s of [process.stdout, process.stderr]) {",
    `  Object.defineProperty(s, 'columns', { value: ${cols}, configurable: true });`,
    `  Object.defineProperty(s, 'rows', { value: ${rows}, configurable: true });`,
    `  s.getWindowSize = () => [${cols}, ${rows}];`,
    "  s.hasColors = () => true;",
    "  s.getColorDepth = () => 24;",
    "}",
    "process.stderr.write = process.stdout.write.bind(process.stdout);",
  ].join("\n");
}

/** The environment the CLI runs with: built from scratch, nothing inherited but what finding programs needs. */
export function captureEnvironment(home: string, inherited: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    HOME: home,
    USERPROFILE: home,
    APPDATA: join(home, "AppData", "Roaming"),
    LOCALAPPDATA: join(home, "AppData", "Local"),
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_CACHE_HOME: join(home, ".cache"),
    GIT_CONFIG_NOSYSTEM: "1",
    // The literal POSIX path, not `os.devNull`: on Windows that is `\\.\nul`,
    // which git rejects ("unable to access '\\.\nul': Invalid argument", exit
    // 128), so every capture died at `git init` there. Git for Windows maps
    // "/dev/null" to the NUL device itself -- the same choice, for the same
    // reason, as test/helpers/git-fixture.ts.
    GIT_CONFIG_GLOBAL: "/dev/null",
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    FORCE_COLOR: "3",
    LANG: "en_US.UTF-8",
    TZ: "UTC",
    ARCANE_DISABLE_ANIMATION: "true",
  };
  const path = inherited["PATH"] ?? inherited["Path"];
  if (path !== undefined) env["PATH"] = path;
  // Windows cannot start processes without these; they carry nothing that reaches the output.
  for (const name of ["SystemRoot", "SYSTEMROOT", "ComSpec", "PATHEXT", "TEMP", "TMP"]) {
    if (inherited[name] !== undefined) env[name] = inherited[name];
  }
  return env;
}

/** How long output must be quiet, once the expected text is there, before a key is sent. */
const QUIET_MS = 150;
/** How long one step may take before the capture is abandoned. */
const STEP_TIMEOUT_MS = 20_000;
/** How long a CLI being stopped gets to exit before it is killed outright. */
const KILL_GRACE_MS = 2_000;

/** CLIs still running, killed if this process exits mid-capture. */
const runningChildren = new Set<ChildProcess>();

export interface RunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  /** Arguments to node before the CLI's own: the shim, then the CLI's entry point. */
  nodeArgs: string[];
  args: string[];
  keys: DemoKey[];
  /** How long one step may take; defaults to STEP_TIMEOUT_MS. */
  stepTimeoutMs?: number;
}

/**
 * Run one command and return its output as segments: what it printed before
 * each key was sent, then what it printed after the last key until it exited.
 * A failure settles only once the CLI has exited, so nothing is still writing
 * into the temporary directory when the caller removes it.
 */
export function runCommand(options: RunOptions): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...options.nodeArgs, ...options.args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    runningChildren.add(child);
    // Decoded as a stream, so a character split across two chunks stays whole.
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    const label = `spell ${options.args.join(" ")}`;
    const stepTimeoutMs = options.stepTimeoutMs ?? STEP_TIMEOUT_MS;
    const segments: string[] = [];
    let current = "";
    let keyIndex = 0;
    let failure: Error | null = null;
    let closed = false;
    let quietTimer: NodeJS.Timeout | undefined;
    let stepTimer: NodeJS.Timeout | undefined;
    let killTimer: NodeJS.Timeout | undefined;

    const describe = (message: string): Error => {
      const step = options.keys.length > 0 ? `, key ${Math.min(keyIndex + 1, options.keys.length)} of ${options.keys.length}` : "";
      return new Error(`${message} (\`${label}\`${step}); last output: ${JSON.stringify(current.slice(-400))}`);
    };
    const fail = (message: string): void => {
      if (failure !== null || closed) return;
      failure = describe(message);
      clearTimeout(quietTimer);
      clearTimeout(stepTimer);
      child.kill();
      killTimer = setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
    };
    const armStepTimer = (): void => {
      clearTimeout(stepTimer);
      stepTimer = setTimeout(() => fail("Timed out waiting for the CLI"), stepTimeoutMs);
    };

    const sendIfReady = (): void => {
      const key = options.keys[keyIndex];
      if (key === undefined || failure !== null) return;
      if (!stripEscapes(current).includes(key.waitFor)) return;
      segments.push(current);
      current = "";
      keyIndex++;
      armStepTimer();
      child.stdin.write(key.keys);
      if (keyIndex === options.keys.length) child.stdin.end();
    };

    const onData = (chunk: string): void => {
      current += chunk;
      clearTimeout(quietTimer);
      quietTimer = setTimeout(sendIfReady, QUIET_MS);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.stdin.on("error", (error) => fail(`Could not write to the CLI: ${error.message}`));
    child.on("error", (error) => {
      if (child.pid === undefined) {
        // It never started, so no close will follow.
        runningChildren.delete(child);
        closed = true;
        clearTimeout(stepTimer);
        reject(describe(`Could not start the CLI: ${error.message}`));
        return;
      }
      fail(`The CLI failed: ${error.message}`);
    });
    child.on("close", (code) => {
      runningChildren.delete(child);
      if (closed) return;
      closed = true;
      clearTimeout(quietTimer);
      clearTimeout(stepTimer);
      clearTimeout(killTimer);
      if (failure !== null) reject(failure);
      else if (keyIndex < options.keys.length) reject(describe(`The CLI exited (code ${code}) before every scripted key was sent`));
      else if (code !== 0) reject(describe(`The CLI exited with code ${code}`));
      else {
        segments.push(current);
        resolve(segments);
      }
    });
    armStepTimer();
    if (options.keys.length === 0) child.stdin.end();
  });
}

/** Run a scenario's commands against the CLI at `cliPath` and return the events to render. */
export async function captureScenario(scenario: DemoScenario, cliPath: string): Promise<DemoEvent[]> {
  if (!supportsImportFlag(process.version)) {
    throw new Error(`The README demos need Node 18.18+ or 19+ (for \`node --import\`); this is ${process.version}.`);
  }
  const root = await realpath(await mkdtemp(join(tmpdir(), "arcane-demo-")));
  // If the process exits mid-capture (a failure, Ctrl-C, a cancelled job), the
  // CLI is stopped and the temporary repository goes with it.
  const removeAtExit = (): void => {
    for (const child of runningChildren) child.kill("SIGKILL");
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // Best effort while exiting; the directory is under the system temp directory.
    }
  };
  process.once("exit", removeAtExit);
  try {
    const home = join(root, "home");
    const repo = join(root, "demo");
    await mkdir(home);
    await mkdir(repo);
    const env = captureEnvironment(home);
    execFileSync("git", ["init", "--quiet"], { cwd: repo, env, stdio: "ignore" });
    // `git init -b` needs git 2.28; this names the unborn branch on any version.
    execFileSync("git", ["symbolic-ref", "HEAD", "refs/heads/main"], { cwd: repo, env, stdio: "ignore" });

    const shim = `data:text/javascript,${encodeURIComponent(ttyShimSource(scenario.cols, scenario.rows))}`;
    const replacements: Array<[string, string]> = [
      [repo, "~/demo"],
      [home, "~"],
      [root, "~"],
      // The checkout the CLI runs from, should it ever print its own location.
      [dirname(dirname(cliPath)), "<arcane-cli>"],
    ];
    const events: DemoEvent[] = [];
    for (const [index, command] of scenario.commands.entries()) {
      const segments = await runCommand({
        cwd: repo,
        env,
        nodeArgs: ["--import", shim, cliPath],
        args: command.args,
        keys: command.keys ?? [],
      });
      const normalized = segments.map((segment) => normalizeOutput(segment, replacements));
      events.push(...commandEvents(command, normalized, index === 0 ? 600 : 400));
    }
    events.push({ output: SHELL_PROMPT, holdMs: 1_500 });
    return events;
  } finally {
    process.off("exit", removeAtExit);
    // A cleanup failure must not replace the capture's own error.
    await rm(root, { recursive: true, force: true, maxRetries: 3 }).catch((error: unknown) => {
      console.warn(`Could not remove the temporary demo directory ${root}: ${(error as Error).message}`);
    });
  }
}
