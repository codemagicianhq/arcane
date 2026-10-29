/**
 * Capabilities — the canonical source for "What the framework does".
 *
 * Every capability line states how it holds (CAPABILITY_HOLDS), because a
 * rule nobody checks should not read like one that is checked. The README
 * block under "## What the framework does" and the `capabilities` key of
 * docs/spell-catalog.json are both rendered from this file by
 * scripts/spell-catalog.ts, and `npm run check:spell-catalog` fails when
 * either drifts from it. Edit the prose here, then `npm run fix:spell-catalog`.
 *
 * Shape: a theme groups lines under a heading; a line is one claim with the
 * mechanism(s) that hold it, the command, spell or standard the claim can be
 * checked against (`source`), an optional `qualifier` that narrows the claim,
 * and an optional `limit` that names what the mechanism does not cover. The
 * `limits` theme holds the framework's own stated non-claims: those lines
 * have no mechanism (`holds: []`) and are rendered without a marker.
 */

/** How a capability line holds. */
export type CapabilityHold = "cli" | "spell" | "convention";

export interface CapabilityHoldDefinition {
  id: CapabilityHold;
  /** The marker printed after a line. */
  label: string;
  /** What the marker means, as the legend states it. */
  meaning: string;
}

export interface CapabilityTheme {
  id: string;
  /** The heading, with its closing period. */
  title: string;
  /** A one-line introduction to the theme, when the prose has one. */
  lede?: string;
}

export interface CapabilityLine {
  id: string;
  /** A short label a consumer can show as a card title. Not rendered in the README. */
  headline: string;
  /** The claim. */
  text: string;
  /** The mechanism(s) that hold the claim; empty for a stated non-claim. */
  holds: CapabilityHold[];
  /** The command, spell or governance standard the claim can be checked against. */
  source: string;
  /** What the mechanism does not cover, stated beside the claim. */
  limit?: string;
  /** A sentence that narrows or completes the claim. */
  qualifier?: string;
  /** The id of the theme the line belongs to. */
  theme: string;
}

export const CAPABILITY_LEGEND =
  "Every line says how it holds, because a rule nobody checks should not read like one that is checked.";

export const CAPABILITY_HOLDS: CapabilityHoldDefinition[] = [
  { id: "cli", label: "CLI", meaning: "the `spell` command, or a hook it installs, does it." },
  { id: "spell", label: "Spell step", meaning: "your AI client does it when the work runs through the spells." },
  { id: "convention", label: "Convention", meaning: "the standards ask for it; nothing checks it." },
];

export const CAPABILITY_THEMES: CapabilityTheme[] = [
  { id: "memory", title: "The memory lives in your repository." },
  { id: "updates", title: "Your edits survive updates." },
  { id: "done", title: "Done means checked." },
  { id: "gates", title: "Gates that block, and gates that ask." },
  { id: "agents", title: "Agents earn trust." },
  { id: "limits", title: "What it does not do." },
];

export const CAPABILITY_LINES: CapabilityLine[] = [
  // ─── The memory lives in your repository ─────────────────────────────────
  {
    id: "install-once",
    headline: "One command installs your standards",
    text: "One command installs your standards into any repository: governance documents, spell prompts and agent definitions, with a manifest that records a hash of every file it placed.",
    holds: ["cli"],
    source: "spell init",
    theme: "memory",
  },
  {
    id: "session-bookends",
    headline: "Sessions open from the repository and close into it",
    text: "Every session opens by rebuilding context from the repository and closes by writing a dated journal entry and a handoff the next session reads first.",
    holds: ["spell"],
    source: "spell-open-session, spell-close-session",
    theme: "memory",
  },
  {
    id: "drift-at-open",
    headline: "Drift is caught at session open",
    text: "Drift is caught at session open, from decision ids that skip a number to installed files that differ from the framework's copies; high-severity drift stops the session until you decide.",
    holds: ["spell"],
    source: "spell-check-drift",
    theme: "memory",
  },
  // ─── Your edits survive updates ──────────────────────────────────────────
  {
    id: "three-way-merge",
    headline: "Edited files are three-way merged",
    text: "A file you edited is three-way merged with the new version, with conflict markers where the two disagree.",
    qualifier:
      "Leftover files are reported, and removed only when you ask and only when a recorded hash, or for older installs git history, shows them untouched.",
    holds: ["cli"],
    source: "spell update",
    theme: "updates",
  },
  {
    id: "update-refuses-dirty",
    headline: "Updates refuse a dirty tree",
    text: "Updates refuse to run over uncommitted changes or outside a git repository.",
    holds: ["cli"],
    source: "spell update",
    theme: "updates",
  },
  // ─── Done means checked ──────────────────────────────────────────────────
  {
    id: "close-classifies",
    headline: "Only succeeded work is called done",
    text: 'At close, every piece of background work is classified succeeded, failed, pending, dispatched or unverifiable; only "succeeded" may be called done.',
    holds: ["spell"],
    source: "spell-close-session",
    theme: "done",
  },
  {
    id: "merge-diff-check",
    headline: "A closed issue's change is checked in the merged diff",
    text: "After a merge, the spell checks that each closed issue's change is actually in the merged diff.",
    holds: ["spell"],
    source: "spell-close-session",
    theme: "done",
  },
  // ─── Gates that block, and gates that ask ────────────────────────────────
  {
    id: "commit-approval",
    headline: "No commit without your approval",
    text: "No commit without your approval in an interactive session: the spell shows the diff and the message, fingerprints that exact pair, and re-checks it right before committing.",
    holds: ["spell"],
    source: "spell-commit-work",
    theme: "gates",
  },
  {
    id: "push-block",
    headline: "Blocked means blocked",
    text: "Blocked means blocked: a pre-push hook refuses, and every remote's push URL is pointed at a sentinel, so `--no-verify` does not help.",
    limit: "A remote added later stays live until you re-apply the block; `spell doctor` names it.",
    holds: ["cli"],
    source: "spell block-push",
    theme: "gates",
  },
  // ─── Agents earn trust ───────────────────────────────────────────────────
  {
    id: "agents-once",
    headline: "Define your agents once",
    text: "Define your agents once; the CLI writes them where Claude Code, GitHub Copilot and Codex each expect them.",
    holds: ["cli"],
    source: "spell agents init",
    theme: "agents",
  },
  {
    id: "trust-levels",
    headline: "Six trust levels per agent per repository",
    text: "Six trust levels per agent per repository, from spectator to archmage. From level four an agent may commit and merge on its own; below that, it queues a pull request for a person.",
    holds: ["spell", "convention"],
    source: "agent-policies",
    theme: "agents",
  },
  {
    id: "commit-trailers",
    headline: "Agent commits name their agent, model and provider",
    text: "Every agent commit made through the spells names its agent, model, model source and provider in trailers, and the approving person is the committer.",
    holds: ["spell"],
    source: "spell-commit-work",
    theme: "agents",
  },
  // ─── What it does not do ─────────────────────────────────────────────────
  {
    id: "no-runtime",
    headline: "It does not run your agents",
    text: "It does not run your agents or call an AI model. The spells are instructions your AI client follows; the CLI installs them, keeps them current and checks the repository.",
    holds: [],
    source: "spell init, spell update, spell doctor",
    theme: "limits",
  },
  {
    id: "raw-git",
    headline: "It does not intercept raw git",
    text: "It does not intercept raw git. A commit you type by hand skips the spells' approval and test gates; any hook it installed still runs.",
    holds: [],
    source: "spell-commit-work",
    theme: "limits",
  },
  {
    id: "credential-scan-limit",
    headline: "The credential scan finds leaks, never proves cleanliness",
    text: "The credential scan looks for known patterns: it can find a leak, never prove a commit is clean.",
    holds: [],
    source: "spell doctor --leaks",
    theme: "limits",
  },
  {
    id: "push-controls-limit",
    headline: "Push controls stop accidents, not a determined operator",
    text: "The push controls stop an accidental push, not a determined operator.",
    holds: [],
    source: "spell block-push",
    theme: "limits",
  },
];
