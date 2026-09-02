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
