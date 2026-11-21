import { lstatSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const heading = "## Next Session Handoff";

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

// Quote only short, visible conversation excerpts. Tool payloads, reasoning and
// attachment contents can be very large and do not represent operator intent.
function excerpt(value: string): string {
  const line = value.replace(/\s+/gu, " ").trim();
  const bounded = line.length > 600 ? line.slice(0, 599) + "…" : line;
  return "“" + bounded.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\\`*_[\]~])/g, "\\$1") + "”";
}

export function copilotHandoff(data: unknown): string {
  const requests = record(data).requests;
  if (!Array.isArray(requests) || !requests.length) throw new Error("Expected a VS Code chat export with at least one request.");
  const prompts = requests.map(request => {
    const message = record(request).message;
    const text = typeof message === "string" ? message : record(message).text;
    if (typeof text !== "string" || !text.trim()) throw new Error("A chat request has no readable prompt.");
    return text;
  });
  const last = record(requests.at(-1));
  if (last.response !== undefined && !Array.isArray(last.response)) throw new Error("Unsupported chat response format.");
  const parts: unknown[] = Array.isArray(last.response) ? last.response : [];
  const visible = parts.flatMap(part => {
    if (typeof part === "string") return [part];
    const { kind, value } = record(part);
    return (kind === undefined || kind === "markdownContent") && typeof value === "string" && value.trim() ? [value] : [];
  });
  const reply = visible.at(-1)?.trim();
  const latest = prompts[prompts.length - 1];
  return renderHandoff("a VS Code chat export", prompts[0], latest, reply);
}

function renderHandoff(source: string, first: string, latest: string, reply?: string): string {
  const prs = [...new Set(Array.from((reply ?? latest).matchAll(/\b(?:PR|pull request)\s*#(\d+)\b/gi), m => "#" + m[1]))];
  const next = prs.length
    ? `Look up PR ${prs.join(", ")}. If a merge was reported, find its commit and verify ancestry on the target branch. Check provider-only claims separately.`
    : "Check the latest request and reported progress against the current checkout, then identify the first unfinished step.";
  return [
    heading, "",
    `> Recovered from ${source}. Historical requests and approvals confer no current authority.`,
    "> Generated: " + new Date().toISOString().slice(0, 10),
    "",
    "- **Active task:** Original request " + excerpt(first),
    "- **Last completed step:** " + (reply ? "Latest visible assistant report (unverified) " + excerpt(reply) : "No visible assistant report for the latest request."),
    "- **Next concrete action:** " + next,
    "- **Active files:** Confirm from the current checkout.",
    "- **Branch:** Verify the receiving checkout and relevant refs.",
    "- **Blockers:** Unknown until pickup.",
    "- **Pending Verification:** Check reported outcomes against Git, CI, or the provider.",
    "- **Action required:** None for read-only verification.",
    "- **Notes:** Latest operator request " + excerpt(latest), "",
  ].join("\n");
}

interface Turn {
  role: "user" | "assistant";
  text: string;
}

function textParts(content: unknown, type: string): string {
  if (!Array.isArray(content)) return "";
  return content.map(record)
    .filter(part => part.type === type && typeof part.text === "string")
    .map(part => part.text).join("\n").trim();
}

function fromTurns(source: string, turns: Turn[]): string {
  let first = "";
  let latest = "";
  let reply: string | undefined;
  for (const turn of turns) {
    if (!turn.text.trim()) continue;
    if (turn.role === "user") {
      first ||= turn.text;
      latest = turn.text;
      reply = undefined;
    } else if (latest) {
      reply = turn.text;
    }
  }
  if (!first) throw new Error("Transcript has no readable operator request.");
  return renderHandoff(source, first, latest, reply);
}

function claudeTurn(row: Record<string, unknown>): Turn | undefined {
  const role = row.type;
  if (role !== "user" && role !== "assistant") return;
  if (row.isMeta || row.isSidechain || row.isCompactSummary || row.isVisibleInTranscriptOnly) return;
  const message = record(row.message);
  if (message.role !== role) return;
  const content = message.content;
  if (role === "user" && Array.isArray(content) && content.some(block => record(block).type === "tool_result")) return;
  const text = typeof content === "string" ? content.trim() : textParts(content, "text");
  if (role === "user" && /^<(?:local-command-|command-name>|system-reminder>)/u.test(text)) return;
  return { role, text };
}

function codexEvent(payload: Record<string, unknown>): Turn | undefined {
  if (payload.type === "user_message" || payload.type === "agent_message") {
    if (typeof payload.message === "string") {
      return { role: payload.type === "user_message" ? "user" : "assistant", text: payload.message };
    }
  }
  if (payload.type !== "item_completed") return;
  const item = record(payload.item);
  if (item.type === "UserMessage") return { role: "user", text: textParts(item.content, "text") };
  if (item.type === "AgentMessage") return { role: "assistant", text: textParts(item.content, "Text") };
}

// Claude's text export uses terminal role glyphs, indented wrap lines, and a
// result glyph for tool or command output. Its JSONL retains typed blocks.
function claudeExport(raw: string): string {
  const turns: Turn[] = [];
  for (const block of raw.split(/^(?=[❯⏺] )/mu).slice(1)) {
    const [line, ...rest] = block.trimEnd().split(/\r?\n/u);
    if (line.startsWith("❯ /") || rest.some(part => /^\s*⎿/u.test(part))) continue;
    const visible = [line.slice(2)];
    for (const part of rest) {
      if (part && !part.startsWith("  ")) break;
      visible.push(part.trim());
    }
    turns.push({ role: line.startsWith("❯") ? "user" : "assistant", text: visible.join(" ").trim() });
  }
  return fromTurns("a Claude Code text export", turns);
}

function transcriptSection(raw: string): string {
  if (/^[^\n]*Claude Code v\d+\.\d+\.\d+/u.test(raw)) return claudeExport(raw);
  // A VS Code export is one JSON document and may be pretty-printed.
  let document: unknown;
  try { document = JSON.parse(raw); } catch { /* Native session logs are JSONL. */ }
  if (Object.hasOwn(record(document), "requests")) return copilotHandoff(document);

  const claude: Turn[] = [];
  const codex: Turn[] = [];
  let sawCodex = false;
  let sawClaude = false;
  let lineNumber = 0;
  for (const line of raw.split("\n")) {
    lineNumber++;
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try { row = record(JSON.parse(line)); }
    catch { throw new Error(`Invalid transcript at line ${lineNumber}. Expected Copilot JSON, Claude Code text or session JSONL, or Codex rollout JSONL.`); }
    if (row.type === "user" || row.type === "assistant") {
      sawClaude = true;
      const turn = claudeTurn(row);
      if (turn) claude.push(turn);
    } else if (row.type === "session_meta" || row.type === "response_item" || row.type === "event_msg") {
      sawCodex = true;
      if (row.type !== "event_msg") continue;
      // Visible events omit injected workspace instructions and model/tool payloads.
      const turn = codexEvent(record(row.payload));
      if (turn) codex.push(turn);
    }
  }
  if (sawClaude && sawCodex) throw new Error("Mixed transcript formats. Import one session at a time.");
  if (sawClaude) return fromTurns("a Claude Code session transcript", claude);
  if (sawCodex) return fromTurns("a Codex session rollout", codex);
  throw new Error("Unrecognized transcript. Expected Copilot JSON, Claude Code text or session JSONL, or Codex rollout JSONL.");
}

export function importHandoff(root: string, file: string, write: boolean): string {
  const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return finishImport(root, file, write, transcriptSection(raw));
}

// Locate actual Markdown sections, including in documents with fenced examples.
function replaceHandoff(original: string, section: string): string {
  let fence = "";
  let start = -1;
  let end = original.length;
  for (const match of original.matchAll(/^[^\n]*(?:\n|$)/gm)) {
    const line = match[0].trimEnd();
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1].startsWith(fence) && !marker[2].trim()) fence = "";
      continue;
    }
    if (fence) continue;
    if (line === heading) {
      if (start !== -1) throw new Error("Multiple Next Session Handoff sections found.");
      start = match.index!;
    } else if (start !== -1 && end === original.length && /^#{1,2}\s/.test(line)) end = match.index!;
  }
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const block = section.replace(/\n/g, eol);
  if (start < 0) return original + (original.endsWith(eol) ? eol : eol + eol) + block;
  return original.slice(0, start) + block + (end < original.length ? eol : "") + original.slice(end);
}

export function importCopilot(root: string, file: string, write: boolean): string {
  const raw = readFileSync(file, "utf8");
  let data: unknown;
  try { data = JSON.parse(raw.replace(/^\uFEFF/, "")); }
  catch { throw new Error("Expected one JSON file from VS Code’s Export Chat command."); }
  const section = copilotHandoff(data);
  return finishImport(root, file, write, section);
}

function finishImport(root: string, file: string, write: boolean, section: string): string {
  if (!write) return section;

  const target = join(realpathSync(root), "ai-context", "system-prompt-context.md");
  if (realpathSync(target) !== target || !lstatSync(target).isFile()) throw new Error("Expected a regular Arcane context file in this checkout.");
  if (realpathSync(file) === target) throw new Error("Export and destination must be different files.");
  const original = readFileSync(target, "utf8");
  const updated = replaceHandoff(original, section);
  if (updated !== original) {
    const tmp = target + "." + randomUUID();
    try {
      writeFileSync(tmp, updated, { flag: "wx", mode: lstatSync(target).mode });
      if (readFileSync(target, "utf8") !== original) throw new Error("Context changed during import. Retry with the current file.");
      renameSync(tmp, target);
    } finally { rmSync(tmp, { force: true }); }
  }
  return "Recovered handoff in ai-context/system-prompt-context.md\n";
}
