import js from "@eslint/js";
import tseslint from "typescript-eslint";

// LH-03: test-suite resilience conventions, enforced rather than hoped for.
const TEST_RESTRICTED_SYNTAX = [
  {
    selector:
      "CallExpression[callee.name='rm'], CallExpression[callee.name='rmSync'], " +
      "CallExpression[callee.property.name='rm'], CallExpression[callee.property.name='rmSync']",
    message:
      "Use removeFixtureDir() from ./helpers/fixture-dir.js instead of a direct rm/rmSync call " +
      "-- it retries through the transient EBUSY/ENOTEMPTY window a virus scanner or search " +
      "indexer can hold a just-closed handle open for. (test/helpers/ itself is exempt.)",
  },
  {
    selector:
      "CallExpression[callee.name='it'] > Literal:nth-child(3), " +
      "CallExpression[callee.name='test'] > Literal:nth-child(3)",
    message:
      "Use a named per-test timeout constant from ./helpers/timeouts.js (e.g. HEAVY_TEST_TIMEOUT) " +
      "instead of a numeric literal, so the budget has a name and a reason instead of a bare number.",
  },
  {
    // LH-05: a toHaveLength(N>=10) is often a derivable registry/spell/
    // agent/governance count rather than one worth hardcoding (P4 -- 12x
    // recurrence, the spell count alone moved 33->41 inside one program with
    // 5 separate manual "bump the literal" test fixes). A genuinely
    // intentional literal (e.g. a deliberate sentinel that forces a reviewed
    // bump when membership changes, not silent auto-absorption -- see
    // docs-profile-registry-split.test.ts) stays a literal behind a
    // justified eslint-disable-next-line comment.
    selector: "CallExpression[callee.property.name='toHaveLength'] > Literal[value>=10]",
    message:
      "toHaveLength(N>=10) -- derive N from the registry/source of truth instead of hardcoding it, " +
      "or add a justified eslint-disable-next-line no-restricted-syntax comment if the literal is " +
      "deliberately not auto-derived.",
  },
];

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["test/**/*.ts"],
    ignores: ["test/helpers/**"],
    rules: {
      "no-restricted-syntax": ["error", ...TEST_RESTRICTED_SYNTAX],
    },
  },
);
