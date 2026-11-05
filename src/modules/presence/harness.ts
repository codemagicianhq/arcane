/**
 * Harness detection behind `--harness`'s default (ARC-060's first deferred
 * question; architecture D8).
 *
 * `--harness` wins. Otherwise the first row whose variable has its value in
 * the environment names the harness; with no match the answer is `other`,
 * never null. A row enters this table only with evidence: the variable was
 * observed in a real shell of that harness, and the observation (harness
 * version, variable, date) is recorded in
 * features/presence-channel/progress.txt, which a test checks against this
 * table. A harness with no recorded observation has no row and reports
 * `other` until someone adds one. `cron` has no reliable marker and is only
 * ever set by `--harness cron`.
 *
 * Order matters only when harnesses are nested (one started from another's
 * shell inherits the outer one's variables): the first matching row wins, and
 * `--harness` is the answer for a nested run that this order misreads. A plain
 * VS Code terminal sets none of these variables (observed 2026-11-05), so a
 * Claude Code session started there still reports `claude-code`.
 */

import type { Harness } from "./types.js";

export interface HarnessRow {
  harness: Harness;
  variable: string;
  value: string;
}

export const HARNESS_TABLE: readonly HarnessRow[] = [
  // Observed 2026-11-05 in Claude Code 2.1.81 (desktop app 4.16336.0) on macOS; progress.txt, PS-10.
  { harness: "claude-code", variable: "CLAUDECODE", value: "1" },
  // Observed 2026-11-05 in Codex 0.166.0-alpha.5.1, both the ChatGPT desktop app and `codex exec`; progress.txt.
  { harness: "codex", variable: "CODEX_CI", value: "1" },
  // Observed 2026-11-05 in Copilot agent mode in VS Code 1.143.1; progress.txt.
  { harness: "copilot", variable: "COPILOT_AGENT", value: "1" },
  // Observed 2026-11-05 in the GitHub Copilot desktop app 1.1.34; progress.txt.
  { harness: "copilot", variable: "COPILOT_CLI", value: "1" },
];

export function detectHarness(env: NodeJS.ProcessEnv): Harness {
  for (const row of HARNESS_TABLE) if (env[row.variable] === row.value) return row.harness;
  return "other";
}
