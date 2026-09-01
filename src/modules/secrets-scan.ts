/**
 * Regex-based credential-pattern denylist, sharing denylist-scan.ts's generic
 * file-walking/matching engine (also used by org-token-lint.ts and spell
 * ward). Extracted from scripts/copy-assets.ts (ARC-037) so the same pattern
 * set backs both the pre-existing src/assets/-scoped copy-time scan and the
 * repository-wide CI backstop / pre-commit hook this ADR adds.
 *
 * Patterns are deliberately conservative -- common credential shapes. A false
 * positive blocks a build or a commit, which is the safe direction to fail.
 */
import type { DenylistRule } from "./denylist-scan.js";
import { installHook, isHookInstalled, removeHook, type HookInstallOutcome } from "./push-safety.js";

export const SECRETS_RULES: DenylistRule[] = [
  { label: "api-key", pattern: /API[_-]KEY\s*[:=]\s*\S+/i },
  // Case-sensitive and requiring an all-caps/underscore identifier (SECRET,
  // MY_SECRET, API_SECRET_KEY...) -- the real config/env-var convention for a
  // credential-holding key. Widening this repository-wide (ARC-037 decision 3)
  // surfaced that the original case-insensitive form matched ANY lowercase
  // `secret`/`token` code identifier (e.g. `const token = value.trim();`),
  // which is overwhelmingly a parsed/resolved value, never a literal
  // credential. The `(?!\$?\{)` guard additionally excludes any
  // brace-delimited placeholder -- GitHub Actions/templating references
  // (`TOKEN: ${{ secrets.X }}`, a reference to a secret store, never the
  // secret itself) and this codebase's own documented `{UPPER_SNAKE}`
  // placeholder convention (denylist-scan.ts's `scanFile` already strips
  // those before matching for the sibling org-token scan; a bare single
  // brace, with no `scanFile`-style stripping in the copy-time call path,
  // needed the same exclusion here rather than only the double-brace case).
  // A minimum length of 8 further excludes short non-secret values like
  // `write` (`id-token: write`).
  { label: "generic-secret", pattern: /\b[A-Z0-9_]*SECRET[A-Z0-9_]*\s*[:=]\s*(?!\$?\{)\S{8,}/ },
  { label: "generic-token", pattern: /\b[A-Z0-9_]*TOKEN[A-Z0-9_]*\s*[:=]\s*(?!\$?\{)\S{8,}/ },
  { label: "bearer-token", pattern: /Bearer\s+[A-Za-z0-9._~+/-]{20,}/ }, // real tokens are long
  { label: "openai-key", pattern: /sk-[A-Za-z0-9]{20,}/ },
  { label: "pem-key", pattern: /-----BEGIN [A-Z ]+-----/ },
  { label: "slack-token", pattern: /xox[bpars]-[A-Za-z0-9-]+/ },
  { label: "aws-access-key", pattern: /AKIA[0-9A-Z]{16}/ },
  { label: "github-pat", pattern: /ghp_[A-Za-z0-9]{36}/ },
];

/**
 * Back-compat plain-pattern list for `scripts/copy-assets.ts`'s existing
 * per-line copy-time scan, which predates `DenylistRule` and iterates raw
 * `RegExp`s directly. Derived from `SECRETS_RULES` so there is exactly one
 * place these patterns are authored.
 */
export const SECRETS_PATTERNS: RegExp[] = SECRETS_RULES.map((rule) => rule.pattern);

// ─── Consumer-facing pre-commit hook (ARC-037 decision 2 / decision 4b) ──────
// This repo's OWN pre-commit scan is a Husky step (.husky/pre-commit calls
// `npm run doctor:leaks`); a fresh consumer repo has no Husky. This installs
// the same `spell doctor --leaks` check via push-safety.ts's generalized,
// push_policy-independent hook-install path (ARC-037 decision 2) instead --
// every profile gets it regardless of push_policy, since credential leakage
// is a risk independent of whether a repository's history may reach a
// remote. Mandatory rather than an opt-in prompt: the check is cheap, local,
// and `--no-verify`-bypassable by design (decision 6) -- the repository-wide
// CI backstop this ADR also adds is the real, unavoidable defense, not this.

export const SECRETS_PRECOMMIT_HOOK_NAME = "pre-commit";

/**
 * Pure code, not a shipped asset file -- the same shape as push-safety.ts's
 * own PRE_PUSH_HOOK_BODY. `spell` is expected on PATH per the documented
 * global-install pattern (README.md); a missing binary skips the scan rather
 * than blocking the commit; a misconfigured PATH has nothing to do with
 * whatever the operator is actually committing.
 */
export const SECRETS_PRECOMMIT_HOOK_BODY = `#!/bin/sh
# Installed by Arcane (ARC-037) to scan staged content for accidentally
# committed credentials before they enter history.
#
# This is deliberately not tamper-proof: \`git commit --no-verify\` skips it
# entirely. The real defense is the repository-wide scan Arcane's own build
# runs in CI on every push -- this hook exists to catch a leak locally, for
# free, before it ever reaches a commit.
if ! command -v spell >/dev/null 2>&1; then
  echo "arcane: 'spell' not found on PATH -- skipping secrets scan (see: npm install -g arcane-cli)" >&2
  exit 0
fi
spell doctor --leaks
`;

export async function installSecretsPrecommitHook(cwd: string): Promise<HookInstallOutcome> {
  return installHook(cwd, SECRETS_PRECOMMIT_HOOK_NAME, SECRETS_PRECOMMIT_HOOK_BODY);
}

export async function isSecretsPrecommitHookInstalled(cwd: string): Promise<boolean> {
  return isHookInstalled(cwd, SECRETS_PRECOMMIT_HOOK_NAME, SECRETS_PRECOMMIT_HOOK_BODY);
}

export async function removeSecretsPrecommitHook(cwd: string): Promise<void> {
  return removeHook(cwd, SECRETS_PRECOMMIT_HOOK_NAME);
}
