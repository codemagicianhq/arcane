import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copilotHandoff, importCopilot, importHandoff } from "../src/commands/handoff.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

const chat = { requests: [
  { message: { text: "Original goal" }, response: [] },
  { message: { text: "Finish the work" }, response: [
    { kind: "thinking", value: "private reasoning" },
    { kind: "toolInvocationSerialized", value: "private payload" },
    { value: "PR #42 merged." },
  ] },
] };

describe("Copilot export recovery", () => {
  let root: string;
  let context: string;
  let file: string;
  beforeEach(async () => {
    root = await createFixtureDir("handoff");
    mkdirSync(join(root, "ai-context"));
    context = join(root, "ai-context/system-prompt-context.md");
    file = join(root, "chat.json");
    writeFileSync(file, JSON.stringify(chat));
  });
  afterEach(async () => { await removeFixtureDir(root); });

  it("labels historical claims and leaves tool payloads out of the preview", () => {
    const preview = importCopilot(root, file, false);
    for (const expected of ["Original goal", "Finish the work", "unverified", "Look up PR #42"]) {
      expect(preview).toContain(expected);
    }
    expect(preview).not.toContain("private");
  });

  it("replaces only the real section, preserves CRLF and survives repeated imports", () => {
    const prefix = "# Context\r\n\r\n~~~md\r\n## Next Session Handoff\r\n~~~\r\n";
    const suffix = "## Another section\r\nRetain this.\r\n";
    writeFileSync(context, prefix + "## Next Session Handoff\r\nOld\r\n" + suffix);
    importCopilot(root, file, true);
    const updated = readFileSync(context, "utf8");
    expect(updated.startsWith(prefix)).toBe(true);
    expect(updated.endsWith(suffix)).toBe(true);
    expect(updated).toContain("PR #42");
    expect(updated).not.toContain("Old");
    expect(updated).not.toMatch(/(?<!\r)\n/);
    importCopilot(root, file, true);
    expect(readFileSync(context, "utf8")).toBe(updated);
  });

  it("appends to older contexts and preserves the original bytes", () => {
    writeFileSync(context, "# Existing  \n");
    importCopilot(root, file, true);
    expect(readFileSync(context, "utf8")).toContain("# Existing  \n\n## Next Session Handoff");
  });

  it("leaves the context untouched if the export is invalid or the section is ambiguous", () => {
    const original = "## Next Session Handoff\n## Next Session Handoff\n";
    writeFileSync(context, original);
    expect(() => importCopilot(root, file, true)).toThrow("Multiple");
    writeFileSync(file, '{"requests": []}');
    expect(() => importCopilot(root, file, true)).toThrow("at least one request");
    writeFileSync(file, "{");
    expect(() => importCopilot(root, file, true)).toThrow("one JSON file");
    expect(readFileSync(context, "utf8")).toBe(original);
  });

  it("keeps a pending final request distinct from an earlier reply", () => {
    expect(copilotHandoff({ requests: [...chat.requests, { message: "New task" }] })).toContain("No visible assistant report");
    expect(() => copilotHandoff({ requests: [{}] })).toThrow("readable prompt");
  });
});

describe("cross-client handoff import", () => {
  let root: string;
  let context: string;
  let file: string;
  beforeEach(async () => {
    root = await createFixtureDir("handoff-import");
    mkdirSync(join(root, "ai-context"));
    context = join(root, "ai-context/system-prompt-context.md");
    file = join(root, "export");
    writeFileSync(context, "# Original\n");
  });
  afterEach(async () => { await removeFixtureDir(root); });
  function jsonl(rows: unknown[]) {
    writeFileSync(file, "\uFEFF" + rows.map(row => JSON.stringify(row)).join("\r\n") + "\r\n");
  }

  it("recognizes a pretty-printed Copilot JSON export", () => {
    writeFileSync(file, JSON.stringify(chat, null, 2));
    expect(importHandoff(root, file, false)).toBe(importCopilot(root, file, false));
    expect(readFileSync(context, "utf8")).toBe("# Original\n");
  });

  it("reads only visible Claude messages and ignores tools, meta rows and sidechains", () => {
    const rows = [
      { type: "user", message: { role: "user", content: "Original goal" } },
      { type: "assistant", message: { role: "assistant", content: [{ type: "thinking", thinking: "private" }, { type: "text", text: "PR #17 merged." }] } },
      { type: "user", message: { role: "user", content: [{ type: "tool_result", content: "private" }] } },
      { type: "assistant", isSidechain: true, message: { role: "assistant", content: "private" } },
      { type: "user", isMeta: true, message: { role: "user", content: "private" } },
      { type: "user", message: { role: "user", content: "<local-command-stdout>private" } },
    ];
    jsonl(rows);
    importHandoff(root, file, true);
    const result = readFileSync(context, "utf8");
    expect(result).toContain("Claude Code session transcript");
    expect(result).toContain("Look up PR #17");
    expect(result).not.toContain("private");
    jsonl([...rows, { type: "user", message: { role: "user", content: [{ type: "text", text: "Next task" }] } }]);
    expect(importHandoff(root, file, false)).toContain("No visible assistant report");
  });

  it("parses Claude's wrapped /export text and excludes command and tool output", () => {
    writeFileSync(file, " ▐▛███▛█   Claude Code v2.1.318\r\n\r\n❯ First\r\n  request\r\n\r\n⏺ Read(private)\r\n  ⎿  private result\r\n\r\n⏺ PR #28 merged.\r\n\r\n❯ /export private.txt\r\n");
    const result = importHandoff(root, file, false);
    expect(result).toContain("First request");
    expect(result).toContain("Look up PR #28");
    expect(result).not.toContain("private");
  });

  it.each([
    [{ type: "user_message", message: "Original goal" }, { type: "agent_message", message: "PR #39 merged." }],
    [{ type: "item_completed", item: { type: "UserMessage", content: [{ type: "text", text: "Original goal" }] } },
      { type: "item_completed", item: { type: "AgentMessage", content: [{ type: "Text", text: "PR #39 merged." }] } }],
  ])("reads visible Codex rollout events and excludes injected context", (user, assistant) => {
    jsonl([
      { type: "session_meta", payload: { instructions: "private" } },
      { type: "event_msg", payload: user },
      { type: "response_item", payload: { role: "user", type: "message", content: [{ type: "input_text", text: "private" }] } },
      { type: "event_msg", payload: assistant },
      { type: "event_msg", payload: { type: "item_completed", item: { type: "Reasoning", raw_content: "private" } } },
    ]);
    const result = importHandoff(root, file, false);
    expect(result).toContain("Original goal");
    expect(result).toContain("Look up PR #39");
    expect(result).not.toContain("private");
  });

  it("rejects malformed, unsupported, and mixed formats without replacing a handoff", () => {
    for (const raw of ["{}", '{"type":"session_meta"}\n{', '{"type":"session_meta"}\n{"type":"user"}', '{"type":"event_msg"}']) {
      writeFileSync(file, raw);
      expect(() => importHandoff(root, file, true)).toThrow();
      expect(readFileSync(context, "utf8")).toBe("# Original\n");
    }
  });
});
