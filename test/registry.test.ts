import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getComponent,
  getProfile,
  getAllComponents,
  listProfiles,
  ComponentNotFoundError,
} from "../src/modules/registry.js";

// Resolve src/assets/ relative to this test file (2 levels up from test/)
const ASSETS_ROOT = join(process.cwd(), "src/assets");

describe("registry", () => {
  // ─── getComponent ───────────────────────────────────────────────────────────

  describe("getComponent", () => {
    it("returns a component for a known name", () => {
      const comp = getComponent("git-conventions");
      expect(comp.name).toBe("git-conventions");
      expect(comp.description).toBeTruthy();
      expect(Array.isArray(comp.files)).toBe(true);
    });

    it("throws ComponentNotFoundError for an unknown name", () => {
      expect(() => getComponent("does-not-exist")).toThrow(
        ComponentNotFoundError,
      );
    });

    it("error message includes list of valid component names", () => {
      let err: Error | undefined;
      try {
        getComponent("does-not-exist");
      } catch (e) {
        err = e as Error;
      }
      expect(err?.message).toContain("git-conventions");
      expect(err?.message).toContain("does-not-exist");
    });
  });

  // ─── getProfile ─────────────────────────────────────────────────────────────

  describe("getProfile('full')", () => {
    it("returns all components", () => {
      const components = getProfile("full");
      const names = components.map((c) => c.name);
      expect(names).toContain("git-conventions");
      expect(names).toContain("spell-prompts");
      expect(names).toContain("venture-template");
      expect(names).toContain("agent-definitions");
      expect(names).toContain("claude-commands");
    });

    it("includes all 12 governance components", () => {
      const names = getProfile("full").map((c) => c.name);
      const govComponents = [
        "git-conventions",
        "testing-standards",
        "decision-documentation-standard",
        "agent-work-queue-model",
        "naming-conventions",
        "agent-policies",
        "threat-model",
        "hardening-checklist",
        "authentication-strategy",
        "new-business-setup",
        "agent-approved-paths",
        "portable-bootstrap",
      ];
      for (const name of govComponents) {
        expect(names, `Expected 'full' to include '${name}'`).toContain(name);
      }
    });
  });

  describe("getProfile('lite')", () => {
    it("returns only spell-prompts + git-conventions + testing-standards", () => {
      const names = getProfile("lite").map((c) => c.name);
      expect(names).toEqual(
        expect.arrayContaining(["spell-prompts", "git-conventions", "testing-standards"]),
      );
      expect(names).not.toContain("threat-model");
      expect(names).not.toContain("venture-template");
    });
  });

  describe("getProfile('governance-only')", () => {
    it("returns only governance docs — no prompts, no agents, no template", () => {
      const names = getProfile("governance-only").map((c) => c.name);
      expect(names).not.toContain("spell-prompts");
      expect(names).not.toContain("venture-template");
      expect(names).not.toContain("agent-definitions");
    });

    it("contains all 19 governance components", () => {
      const names = getProfile("governance-only").map((c) => c.name);
      expect(names).toContain("agent-output-instructions");
      expect(names).toContain("git-conventions");
      expect(names).toContain("threat-model");
      expect(names).toContain("portable-bootstrap");
      expect(names).toContain("development-methodology");
      expect(names).toContain("cicd-standards");
      expect(names).toContain("universal-agent-rules");
      expect(names).toContain("spell-authoring-standards");
      expect(names).toHaveLength(20);
    });
  });

  // ─── getAllComponents ────────────────────────────────────────────────────────

  describe("getAllComponents", () => {
    it("returns all registered components", () => {
      const all = getAllComponents();
      expect(all.length).toBeGreaterThan(0);
    });

    it("returns a copy — mutations do not affect internal state", () => {
      const first = getAllComponents();
      first.push({ name: "intruder", description: "", files: [] });
      const second = getAllComponents();
      expect(second.find((c) => c.name === "intruder")).toBeUndefined();
    });
  });

  // ─── listProfiles ─────────────────────────────────────────────────────────

  describe("listProfiles", () => {
    it("returns exactly 4 profiles", () => {
      expect(listProfiles()).toHaveLength(4);
    });

    it("includes full, lite, methodology, governance-only in that order", () => {
      const ids = listProfiles().map((p) => p.id);
      expect(ids).toEqual(["full", "lite", "methodology", "governance-only"]);
    });

    it("each profile has id, displayName, description, and components array", () => {
      for (const p of listProfiles()) {
        expect(p.id).toBeTruthy();
        expect(p.displayName).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(Array.isArray(p.components)).toBe(true);
        expect(p.components.length).toBeGreaterThan(0);
      }
    });

    it("full profile components match getAllComponents()", () => {
      const full = listProfiles().find((p) => p.id === "full")!;
      const expectedNames = getAllComponents().map((c) => c.name);
      expect(full.components).toEqual(expectedNames);
    });

    it("lite profile includes spell-prompts and core governance", () => {
      const lite = listProfiles().find((p) => p.id === "lite")!;
      expect(lite.components).toContain("spell-prompts");
      expect(lite.components).toContain("git-conventions");
      expect(lite.components).not.toContain("threat-model");
    });

    it("governance-only profile excludes prompts, agents, and templates", () => {
      const gov = listProfiles().find((p) => p.id === "governance-only")!;
      expect(gov.components).not.toContain("spell-prompts");
      expect(gov.components).not.toContain("venture-template");
      expect(gov.components).not.toContain("agent-definitions");
    });

    it("returned array is a copy — mutation does not affect next call", () => {
      const first = listProfiles();
      first.push({ id: "full", displayName: "X", description: "X", components: [] });
      expect(listProfiles()).toHaveLength(4);
    });

    it("full profile component list is a copy — mutation does not affect next call", () => {
      const first = listProfiles().find((p) => p.id === "full")!;
      const originalLength = first.components.length;
      first.components.push("intruder");
      const second = listProfiles().find((p) => p.id === "full")!;
      expect(second.components).toHaveLength(originalLength);
    });
  });

  // ─── Exhaustive file existence check ────────────────────────────────────────

  describe("file integrity — every registered file must exist in src/assets/", () => {
    const all = getAllComponents();
    const nonExternal = all.filter((c) => !c.external);

    for (const component of nonExternal) {
      for (const file of component.files) {
        it(`${component.name}: ${file}`, () => {
          const fullPath = join(ASSETS_ROOT, file);
          expect(
            existsSync(fullPath),
            `Missing asset: src/assets/${file} (registered in component "${component.name}")`,
          ).toBe(true);
        });
      }
    }

    it("no external components are registered", () => {
      const external = all.filter((c) => c.external);
      expect(external).toHaveLength(0);
    });
  });
});
