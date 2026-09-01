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
