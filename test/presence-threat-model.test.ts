import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDenylistRules, scanFile } from "../src/modules/denylist-scan.js";

// PRD PC-13, ARC-060 decision 10, architecture D20: the template's section
// carries one row per surface of the architecture's Control Traceability
// table, in the same order, each Planned or an accepted risk.

const ROOT = process.cwd();
const TEMPLATE = join(ROOT, "src", "assets", ".arcane", "governance", "threat-model.md");
const ROOT_COPY = join(ROOT, ".arcane", "governance", "threat-model.md");
const ARCHITECTURE = join(ROOT, "features", "presence-channel", "architecture.md");

function section(text: string): string {
  const start = text.indexOf("## Local Presence Service (`spell presence`)");
  const end = text.indexOf("\n## ", start + 1);
  return text.slice(start, end);
}

function surfaceRows(text: string): Array<{ surface: string; status: string }> {
  return text
    .split("\n")
    .filter((l) => /^\| [A-Z][^|]* \| \*\*(Planned|Accepted risk)\*\* \|/.test(l))
    .map((l) => {
      const cells = l.split("|").map((c) => c.trim());
      return { surface: cells[1] ?? "", status: cells[2] ?? "" };
    });
}

describe("the threat-model template's Local Presence Service section (PC-13)", () => {
  it("is in the template and its root copy, identically", async () => {
    const template = section(await readFile(TEMPLATE, "utf8"));
    expect(template.length).toBeGreaterThan(0);
    expect(section(await readFile(ROOT_COPY, "utf8"))).toBe(template);
  });

  it("has the architecture's fifteen surfaces, in order, each Planned or an accepted risk", async () => {
    const architecture = await readFile(ARCHITECTURE, "utf8");
    const traced = architecture
      .split("\n")
      .filter((l) => /^\| \d+ \| /.test(l))
      .map((l) => (l.split("|")[2] ?? "").trim().replace(/ \(accepted risk\)$/, ""));
    // The hub's instance lists fifteen surfaces; a change to that count is a reviewed change here too.
    // eslint-disable-next-line no-restricted-syntax -- deliberate sentinel, see the comment above
    expect(traced).toHaveLength(15);
    const rows = surfaceRows(section(await readFile(TEMPLATE, "utf8")));
    expect(rows.map((r) => r.surface)).toEqual(traced);
    expect(rows.filter((r) => r.status === "**Accepted risk**").map((r) => r.surface)).toEqual(["Forged or poisoned presence", "Disclosure to token holders"]);
  });

  it("names the three actors, the git-hook rule, the missing Host check and the two further surfaces", async () => {
    const text = section(await readFile(TEMPLATE, "utf8")).replace(/\s+/g, " ");
    expect(text).toContain("A local process without the token");
    expect(text).toContain("A process running as the operator's own account");
    expect(text).toContain("A tunnel or VPN peer");
    expect(text).toContain("never by a git hook");
    expect(text).toContain("There is no `Host` check");
    expect(text).toContain("A port taken by another process after a crash");
    expect(text).toContain("A rewritten `server.json`");
  });

  it("names no venture, machine or planted private term", async () => {
    const rules = createDenylistRules(["ordovica-undisclosed-partner", "tidewright-build-02", ...(process.env["ARCANE_ORG_TOKENS"] ?? "").split(/[,\n]/).map((t) => t.trim()).filter(Boolean)], "threat-model-leak");
    expect(await scanFile(TEMPLATE, "threat-model.md", rules)).toEqual([]);
  });
});
