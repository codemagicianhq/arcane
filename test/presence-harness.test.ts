import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HARNESS_TABLE, detectHarness } from "../src/modules/presence/harness.js";
import { sendReport } from "../src/modules/presence/reporter.js";
import { HARNESSES, type SessionRecord } from "../src/modules/presence/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { arcaneRepo, recordService, startPresence } from "./helpers/presence.js";
import { REPO_ROOT } from "./helpers/state-schema.js";

describe("harness detection (ARC-060 open question 1; architecture D8)", () => {
  it("reports other, never null, when no row matches", () => {
    expect(detectHarness({})).toBe("other");
    expect(detectHarness({ CLAUDECODE: "0" })).toBe("other");
  });

  it("matches each row on its variable and value", () => {
    for (const row of HARNESS_TABLE) expect(detectHarness({ [row.variable]: row.value })).toBe(row.harness);
  });

  // The marker variables seen on 2026-11-05 in each shell (progress.txt), trimmed
  // to what a row could match on; ids and paths are placeholders.
  const plainVsCodeTerminal = {
    TERM_PROGRAM: "vscode",
    TERM_PROGRAM_VERSION: "1.143.1",
    VSCODE_INJECTION: "1",
    COPILOT_DEBUG_NONCE: "0123456789abcdef",
    CLAUDE_CODE_SSE_PORT: "51438",
  };
  const observed: { name: string; env: Record<string, string>; expected: string }[] = [
    { name: "a plain VS Code terminal", env: plainVsCodeTerminal, expected: "other" },
    { name: "the Claude Code CLI in iTerm2", env: { TERM_PROGRAM: "iTerm.app", CLAUDECODE: "1", CLAUDE_CODE_ENTRYPOINT: "cli" }, expected: "claude-code" },
    { name: "the interactive Codex CLI in iTerm2", env: { TERM_PROGRAM: "iTerm.app", CODEX_CI: "1", CODEX_SANDBOX: "seatbelt", CODEX_VERSION: "0.166.0-alpha.5.1" }, expected: "codex" },
    { name: "Claude Code started in a VS Code terminal", env: { ...plainVsCodeTerminal, CLAUDECODE: "1" }, expected: "claude-code" },
    {
      name: "Copilot agent mode in VS Code",
      env: { ...plainVsCodeTerminal, COPILOT_AGENT: "1", AI_AGENT: "github_copilot_vscode_agent" },
      expected: "copilot",
    },
    { name: "the GitHub Copilot app", env: { COPILOT_CLI: "1", AI_AGENT: "github_copilot_app_agent" }, expected: "copilot" },
    {
      name: "the Codex desktop app",
      env: { CODEX_CI: "1", CODEX_SHELL: "1", CODEX_SANDBOX: "seatbelt", CODEX_THREAD_ID: "thread", CODEX_VERSION: "0.166.0-alpha.5.1" },
      expected: "codex",
    },
    { name: "codex exec", env: { CODEX_CI: "1", CODEX_SANDBOX: "seatbelt", CODEX_THREAD_ID: "thread", CODEX_VERSION: "0.166.0-alpha.5.1" }, expected: "codex" },
  ];
  for (const shell of observed) {
    it(`reads ${shell.name} as ${shell.expected}`, () => {
      expect(detectHarness(shell.env)).toBe(shell.expected);
    });
  }

  it("answers a nested run by table order (Claude Code first), which --harness overrides", () => {
    expect(detectHarness({ CLAUDECODE: "1", CODEX_CI: "1" })).toBe("claude-code");
    expect(HARNESS_TABLE[0]?.harness).toBe("claude-code");
  });

  it("only ever answers a member of the schema's enum, and cron has no row", () => {
    for (const row of HARNESS_TABLE) expect(HARNESSES).toContain(row.harness);
    expect(HARNESS_TABLE.some((r) => r.harness === "cron")).toBe(false);
    expect(HARNESSES).toContain(detectHarness(process.env));
  });

  it("has a dated observation in progress.txt for every row (evidence before a row)", async () => {
    const progress = await readFile(join(REPO_ROOT, "features/presence-channel/progress.txt"), "utf8");
    for (const row of HARNESS_TABLE) {
      const pattern = new RegExp(`^- Harness observation: ${row.harness}, .*\\b${row.variable}=${row.value}\\b.*\\b20\\d\\d-\\d\\d-\\d\\d\\b`, "m");
      expect({ row: row.harness, recorded: pattern.test(progress) }).toEqual({ row: row.harness, recorded: true });
    }
  });

  it("--harness wins over detection, and detection fills the record without it", async () => {
    const svc = await startPresence();
    const home = await createFixtureDir("presence-harness-home");
    const repo = await arcaneRepo("presence-harness-repo");
    try {
      recordService(home, svc.port);
      const detected = await sendReport(repo, { status: "working" }, { home, env: { CLAUDECODE: "1" } });
      expect((detected as { record: SessionRecord }).record.harness).toBe("claude-code");
      const flagged = await sendReport(repo, { status: "working", harness: "cron" }, { home, env: { CLAUDECODE: "1" } });
      expect((flagged as { record: SessionRecord }).record.harness).toBe("cron");
    } finally {
      await svc.close();
      await removeFixtureDir(home);
      await removeFixtureDir(repo);
    }
  }, HEAVY_TEST_TIMEOUT);
});
