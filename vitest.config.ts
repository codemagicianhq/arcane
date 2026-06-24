import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    reporters: ["default", "junit"],
    outputFile: {
      junit: "coverage/junit.xml",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "cobertura"],
      exclude: [
        // Build scripts — not part of the shipped library
        "scripts/**",
        // CLI entry point — wires commands; covered by integration tests indirectly
        "src/index.ts",
        // Interactive agent setup — requires TTY/inquirer prompts, not unit-testable
        "src/modules/agents.ts",
        // spell doctor — side-effectful env checks; not unit-testable without heavy mocking
        "src/commands/doctor.ts",
        // Type declarations only
        "src/types.ts",
        // Agent profile config — data file, no logic
        "src/config/agent-profiles.ts",
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
        "src/modules/copier.ts": {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
        "src/modules/manifest.ts": {
          lines: 95,
          branches: 90, // non-ENOENT rethrow branch tested via itOnPosix (chmod); skipped on Windows
          functions: 95,
          statements: 95,
        },
        "src/modules/merger.ts": {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
        "src/modules/registry.ts": {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
        "src/config/profiles.ts": {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
      },
    },
  },
});
