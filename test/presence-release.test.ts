import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// PRD PC-01 and PC-16: the presence channel adds no runtime dependency, and
// the release documents it.

const ROOT = process.cwd();

/** package.json's dependencies on main at 2aec288 (arcane-cli 1.17.3), before the presence channel. */
const DEPENDENCIES_BEFORE = {
  "@inquirer/prompts": "^7.10.1",
  "@napi-rs/keyring": "2.1.0",
  chalk: "^5.6.2",
  commander: "^12.0.0",
  "gradient-string": "^3.0.0",
  mustache: "^4.2.0",
  "openid-client": "6.8.8",
  yaml: "^2.8.3",
};

describe("the presence channel's release (PC-01, PC-16)", () => {
  it("adds no runtime dependency (ARC-037 decision 8)", async () => {
    const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8")) as { dependencies: Record<string, string> };
    expect(pkg.dependencies).toEqual(DEPENDENCIES_BEFORE);
  });

  it("documents the commands, the token rule, the three registrations and the three services in the README", async () => {
    const readme = await readFile(join(ROOT, "README.md"), "utf8");
    const start = readme.indexOf("### Presence");
    const section = readme.slice(start, readme.indexOf("\n### ", start + 1));
    for (const needle of ["spell presence serve", "spell presence mcp", "ARCANE_PRESENCE_TOKEN", "claude mcp add", "codex mcp add", "\"servers\"", "launchctl bootstrap", "systemctl --user enable --now", "schtasks /create"]) {
      expect({ needle, present: section.includes(needle) }).toEqual({ needle, present: true });
    }
  });

  it("records the measured latency budget under ARC-060 in the 1.18.0 entry", async () => {
    const changelog = await readFile(join(ROOT, "CHANGELOG.md"), "utf8");
    const start = changelog.indexOf("## [1.18.0]");
    const entry = changelog.slice(start, changelog.indexOf("\n## [", start + 1));
    expect(entry).toContain("ARC-060");
    for (const runner of ["ubuntu-latest", "macos-latest", "windows-latest"]) expect(entry).toMatch(new RegExp(`${runner} median \\d+ ms, p95 \\d+ ms`));
  });
});
