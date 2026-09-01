import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[cli-unknown-command.test.ts] ${BUILT_CLI_SKIP_REASON}`);

describe.skipIf(!BIN)("spell <unrecognized> — built CLI integration", () => {
  it("exits 1 with guidance instead of silently falling back to the welcome screen", () => {
    const result = spawnSync("node", [BIN!, "foobar"], { encoding: "utf8" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spell: unrecognized command 'foobar'");
    expect(result.stderr).toContain(
      "Spells are prompts, not CLI commands — run /spell-foobar in your agent client.",
    );
  });

  it("lists the real, current CLI commands rather than a hardcoded list", () => {
    const result = spawnSync("node", [BIN!, "foobar"], { encoding: "utf8" });

    for (const name of ["init", "add", "update", "status", "uninstall", "unblock-push", "doctor", "ward", "agents"]) {
      expect(result.stderr).toContain(name);
    }
  });

  it("still shows the welcome screen with exit 0 for a bare invocation", () => {
    const result = spawnSync("node", [BIN!], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: spell");
    expect(result.stderr).toBe("");
  });

  it("still runs a real command normally", () => {
    const result = spawnSync("node", [BIN!, "--version"], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
