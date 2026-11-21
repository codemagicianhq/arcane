import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copilotHandoff, importCopilot } from "../src/commands/handoff.js";
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
