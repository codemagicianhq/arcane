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
];

export function detectHarness(env: NodeJS.ProcessEnv): Harness {
  for (const row of HARNESS_TABLE) if (env[row.variable] === row.value) return row.harness;
  return "other";
}
