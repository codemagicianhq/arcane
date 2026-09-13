import { describe, it, expect } from "vitest";
import { execFileWithTimeout, EXTERNAL_CLI_TIMEOUT_MS } from "../src/modules/exec.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

describe("execFileWithTimeout", () => {
  it("resolves with stdout for a child that answers", async () => {
    const { stdout } = await execFileWithTimeout(
      process.execPath,
      ["-e", "process.stdout.write('answered')"],
      EXTERNAL_CLI_TIMEOUT_MS,
    );

    expect(stdout).toBe("answered");
  });

  it(
    "kills a child that never exits, rather than waiting on it forever",
    async () => {
      const started = Date.now();

      // The shape of the defect this exists for: a probe that answers neither
      // yes nor no. Without a timeout `spell doctor` sat on one of these for
      // 25s+, twice per run.
      const error = await execFileWithTimeout(
        process.execPath,
        ["-e", "setTimeout(() => {}, 60_000)"],
        500,
      ).catch((err: NodeJS.ErrnoException & { killed?: boolean }) => err);

      expect(error).toBeInstanceOf(Error);
      expect(error.killed).toBe(true);
      // Bounded by the budget, not by the child's own 60s lifetime.
      expect(Date.now() - started).toBeLessThan(HEAVY_TEST_TIMEOUT);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it("rejects when the binary does not exist at all", async () => {
    await expect(
      execFileWithTimeout("arcane-no-such-binary-exists", ["--version"], EXTERNAL_CLI_TIMEOUT_MS),
    ).rejects.toThrow();
  });
});
