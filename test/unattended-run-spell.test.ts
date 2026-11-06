import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getComponent } from "../src/modules/registry.js";

const assets = join(process.cwd(), "src/assets");
const read = (path: string) => readFileSync(join(assets, path), "utf8");
const spell = read(".arcane/spells/spell-unattended-run.md");

describe("unattended run invocation and safety contract", () => {
  it("ships the canonical spell and all three discovery clients in spells-build", () => {
    const files = getComponent("spells-build").files;
    for (const path of [".arcane/spells/spell-unattended-run.md", ".github/prompts/spell-unattended-run.prompt.md", ".claude/commands/spell-unattended-run.md", ".agents/skills/spell-unattended-run/SKILL.md"]) {
      expect(files).toContain(path);
      expect(read(path).length).toBeGreaterThan(0);
      if (!path.startsWith(".arcane/")) expect(read(path)).toContain(".arcane/spells/spell-unattended-run.md");
    }
  });

  it("reuses shared authority, preflight and required-action contracts", () => {
    for (const id of ["unattended-run-preflight", "run-grant-authority", "action-required"]) {
      expect(spell).toContain(`<!-- fragment:${id}:start -->`);
      expect(spell).toContain(`<!-- fragment:${id}:end -->`);
    }
    expect(spell).toContain("spell grant check");
    expect(spell).toContain("## 🚧 Action required");
  });

  it("requires finite application evidence and settles supervision before execution", () => {
    expect(spell.indexOf("## 2 — Front-load readiness and consent")).toBeLessThan(spell.indexOf("## 4 — Execute the approved milestones"));
    for (const phrase of ["snapshot its current matching IDs with pagination", "Mocks cannot satisfy criteria requiring a real service", "Verify the host can remain active", "no permission to commit, publish, spend or merge"]) expect(spell).toContain(phrase);
  });

  it("fails closed for stale authority and checkpoints rather than looping indefinitely", () => {
    for (const phrase of ["Examples and saved grant files are not consent", "Never reuse a completed run's grant", "three failures of the same operation", "cancel before expiry", "Reconcile existing commits, PRs, merges, releases and branches", "Delete only this run's branches", "disclose residual record status/expiry"]) expect(spell).toContain(phrase);
  });

  it("routes implementation and closure through the existing workflows", () => {
    expect(spell).toContain("For each milestone invoke `spell-full-cycle`");
    expect(spell).toContain("Invoke `spell-close-session`");
    expect(read(".arcane/spells/spell-full-cycle.md")).toContain("spell-unattended-run");
  });
});
