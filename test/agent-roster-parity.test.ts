import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadAllAgentDefinitions } from "../src/modules/agent-loader.js";
import { renderCopilotAgent } from "../src/modules/agent-generator.js";
import { applyArcanosNames } from "../src/modules/naming.js";

/**
 * ARC-012 (generated distributable artifacts require a parity guard) has
 * covered every OTHER generated-vs-source pair in this repo since 0.15.2 --
 * except this one. `src/assets/.github/agents/*.agent.md` is committed,
 * generator-shaped content (byte-identical to what `spell agents init`
 * would produce under Arcanos naming), and nothing has ever compared it
 * against `renderCopilotAgent` run over the canonical `src/assets/agents/`
 * YAML. A drift here is invisible to every existing gate: self-host-parity
 * only compares a dogfood copy against its own src/assets/ source, and
 * these files have no dogfood counterpart to drift from -- they're the only
 * copy, so nothing has ever regenerated and diffed them.
 */

const ASSETS_DIR = join(process.cwd(), "src", "assets");
const ROOT_DIR = process.cwd();

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

describe("ARC-012 agent-roster parity: generated .agent.md vs canonical YAML", () => {
  it("every committed .github/agents/*.agent.md is byte-identical (line-ending normalized) to what the generator produces from src/assets/agents/", async () => {
    const definitions = await loadAllAgentDefinitions(join(ASSETS_DIR, "agents"));
    expect(definitions.length).toBeGreaterThan(0);

    const named = applyArcanosNames(definitions.map((def) => def.id));
    const nameById = new Map(named.map((n) => [n.definition, n.name]));

    const mismatches: string[] = [];
    for (const def of definitions) {
      const name = nameById.get(def.id);
      if (!name) {
        mismatches.push(`${def.id}: has no Arcanos name mapping (naming.ts and agents/*.yaml have drifted)`);
        continue;
      }

      const committedPath = join(ASSETS_DIR, ".github", "agents", `${name.toLowerCase()}.agent.md`);
      let committed: string;
      try {
        committed = await readFile(committedPath, "utf8");
      } catch {
        mismatches.push(`${def.id} (${name}): no committed file at .github/agents/${name.toLowerCase()}.agent.md`);
        continue;
      }

      const generated = renderCopilotAgent(def, name);
      if (normalizeLineEndings(generated) !== normalizeLineEndings(committed)) {
        mismatches.push(`${def.id} (${name}): committed .agent.md does not match generator output`);
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("every committed .github/agents/*.agent.md corresponds to an Arcanos name with a real definition (no orphans)", async () => {
    const definitions = await loadAllAgentDefinitions(join(ASSETS_DIR, "agents"));
    const named = applyArcanosNames(definitions.map((def) => def.id));
    const expectedFiles = new Set(named.map((n) => `${n.name.toLowerCase()}.agent.md`));

    const { readdir } = await import("node:fs/promises");
    const actualFiles = (await readdir(join(ASSETS_DIR, ".github", "agents"))).filter((f) =>
      f.endsWith(".agent.md"),
    );

    const orphans = actualFiles.filter((f) => !expectedFiles.has(f));
    expect(orphans).toEqual([]);
  });

  /**
   * registry.ts retired the installable "agent-files" component (a fixed
   * name set collided with per-roster generated output), so the ROOT
   * `.github/agents/*.agent.md` -- this repo's own dogfooded Copilot agent
   * files -- is not covered by self-host-parity or any other automated
   * sync. It is kept in sync with src/assets/.github/agents/ by convention
   * only. Confirmed live 2026-08-31 (BC-04): this is exactly how the
   * mercurio.agent.md drift survived even after the first test above would
   * have caught a src/assets-level regression -- the root copy is a THIRD
   * place the same content lives, unchecked by anything else in this repo.
   */
  it("the root .github/agents/*.agent.md dogfood copy matches src/assets/.github/agents/ (no automated sync covers this)", async () => {
    const files = await (await import("node:fs/promises")).readdir(join(ASSETS_DIR, ".github", "agents"));
    const mismatches: string[] = [];
    for (const file of files.filter((f) => f.endsWith(".agent.md"))) {
      const canonical = await readFile(join(ASSETS_DIR, ".github", "agents", file), "utf8");
      let root: string;
      try {
        root = await readFile(join(ROOT_DIR, ".github", "agents", file), "utf8");
      } catch {
        mismatches.push(`${file}: no root copy at .github/agents/${file}`);
        continue;
      }
      if (normalizeLineEndings(canonical) !== normalizeLineEndings(root)) {
        mismatches.push(`${file}: root copy does not match src/assets/.github/agents/${file}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
