import { describe, it, expect } from "vitest";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadAgentDefinition } from "../src/modules/agent-loader.js";

// Guards the shipped agent templates: every bundled definition under
// src/assets/agents must both parse AND validate. A malformed template — e.g.
// an unquoted colon-space turning a `behavioral_rules` item into a YAML mapping
// instead of a string — otherwise fails silently during `spell agents sync` as
// "<role> (definition not found)", dropping that agent from every client output
// with a warning and a zero exit code.
const BUNDLED_AGENTS_DIR = join(process.cwd(), "src", "assets", "agents");

describe("bundled agent templates", () => {
  it("every shipped src/assets/agents/*.yaml validates", async () => {
    const files = (await readdir(BUNDLED_AGENTS_DIR)).filter(
      (f) => f.endsWith(".yaml") && f !== "agents.yaml",
    );

    // Sanity: the full profile ships 12 roles; guard against an empty glob.
    expect(files.length).toBeGreaterThanOrEqual(12);

    const failures: string[] = [];
    for (const file of files) {
      const id = file.replace(/\.yaml$/, "");
      try {
        await loadAgentDefinition(BUNDLED_AGENTS_DIR, id);
      } catch (err) {
        failures.push(`${file}: ${(err as Error).message.replace(/\n/g, " ")}`);
      }
    }

    expect(
      failures,
      `Invalid bundled agent templates:\n${failures.join("\n")}`,
    ).toEqual([]);
  });
});
