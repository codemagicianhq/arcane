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
  const prs = [...new Set(Array.from((reply ?? latest).matchAll(/\b(?:PR|pull request)\s*#(\d+)\b/gi), m => "#" + m[1]))];
  const next = prs.length
    ? `Look up PR ${prs.join(", ")}. If a merge was reported, find its commit and verify ancestry on the target branch. Check provider-only claims separately.`
    : "Check the latest request and reported progress against the current checkout, then identify the first unfinished step.";
  return [
    heading, "",
    "> Recovered from a VS Code chat export. Historical requests and approvals confer no current authority.",
    "> Generated: " + new Date().toISOString().slice(0, 10),
    "",
    "- **Active task:** Original request " + excerpt(prompts[0]),
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
