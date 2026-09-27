import { describe, it, expect, afterEach } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  findPlaceholderTokens,
  parseFrontmatterStatus,
  parseRuntimePlaceholders,
  scanGovernancePlaceholders,
  PLACEHOLDER_STANDARD_FILE,
  RUNTIME_PLACEHOLDERS_START,
  RUNTIME_PLACEHOLDERS_END,
} from "../src/modules/placeholders.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

// UP02-D-02 / ARC-051 (#277): the placeholder scanner.

const REPO_ROOT = resolve(__dirname, "..");

function doc(status: string | null, body: string): string {
  return status === null ? body : `---\ntitle: T\nstatus: ${status}\n---\n\n${body}\n`;
}

function standard(tokens: string[]): string {
  return doc(
    "active",
    [
      "# Standard",
      "",
      RUNTIME_PLACEHOLDERS_START,
      ...tokens.map((t) => `- \`${t}\` — resolves from somewhere.`),
      RUNTIME_PLACEHOLDERS_END,
    ].join("\n"),
  );
}

let dir: string | undefined;
afterEach(async () => {
  if (dir) await removeFixtureDir(dir);
  dir = undefined;
});

async function governance(files: Record<string, string>): Promise<string> {
  dir = await createFixtureDir("up02-d-placeholders");
  const gov = join(dir, ".arcane", "governance");
  await mkdir(gov, { recursive: true });
  for (const [name, content] of Object.entries(files)) await writeFile(join(gov, name), content, "utf8");
  return gov;
}

describe("parseFrontmatterStatus", () => {
  it("reads plain, quoted and CRLF status values", () => {
    expect(parseFrontmatterStatus("---\nstatus: active\n---\nbody")).toBe("active");
    expect(parseFrontmatterStatus('---\ntitle: x\nstatus: "template"\n---\n')).toBe("template");
    expect(parseFrontmatterStatus("---\r\nstatus: draft # note\r\n---\r\nbody")).toBe("draft");
  });

  it("returns null without frontmatter or without a status field", () => {
    expect(parseFrontmatterStatus("# no frontmatter\nstatus: active\n")).toBeNull();
    expect(parseFrontmatterStatus("---\ntitle: x\n---\nstatus: active\n")).toBeNull();
  });
});

describe("findPlaceholderTokens", () => {
  it("finds prose tokens once each, in first-seen order", () => {
    expect(findPlaceholderTokens("Ask {OPERATOR_NAME} and {AGENT_NAME}, then {OPERATOR_NAME}.")).toEqual([
      "{OPERATOR_NAME}",
      "{AGENT_NAME}",
    ]);
  });

  it("ignores tokens in fenced code blocks (backtick and tilde, longer fences, unclosed fence)", () => {
    const content = [
      "```bash",
      "git log --author={AGENT_NAME}",
      "```",
      "~~~",
      "{TILDE_FENCED}",
      "~~~",
      "````",
      "```",
      "{INSIDE_LONGER_FENCE}",
      "````",
      "prose {VISIBLE}",
      "```",
      "{UNCLOSED}",
    ].join("\n");
    expect(findPlaceholderTokens(content)).toEqual(["{VISIBLE}"]);
  });

  it("ignores tokens in inline code spans, including double-backtick spans", () => {
    expect(findPlaceholderTokens("Use `{ADO_ORG}` and ``a `{ADO_PROJECT}` b`` but not {SEEN}.")).toEqual(["{SEEN}"]);
  });

  it("treats an unmatched backtick as literal text", () => {
    expect(findPlaceholderTokens("a stray ` then {REAL_TOKEN}\n\nnext `paragraph`")).toEqual(["{REAL_TOKEN}"]);
  });

  it("does not let an inline span run across a blank line", () => {
    expect(findPlaceholderTokens("open ` here\n\n{AFTER_BREAK} and ` close")).toEqual(["{AFTER_BREAK}"]);
  });

  it("ignores frontmatter, ${SHELL} syntax, lowercase and mixed-case braces", () => {
    const content = "---\ntitle: {IN_FRONTMATTER}\nstatus: active\n---\n${HOME} {lower} {Mixed_Case} {A_} {OK_1}";
    expect(findPlaceholderTokens(content)).toEqual(["{OK_1}"]);
  });
});

describe("parseRuntimePlaceholders", () => {
  it("parses the list items between the markers", () => {
    expect([...parseRuntimePlaceholders(standard(["{ADO_ORG}", "{HOST}"]))!]).toEqual(["{ADO_ORG}", "{HOST}"]);
  });

  it("ignores tokens outside the markers and prose inside them that is not a list item", () => {
    const content = [
      "- `{BEFORE}` — outside",
      RUNTIME_PLACEHOLDERS_START,
      "Prose mentioning `{NOT_AN_ITEM}`.",
      "- `{LISTED}` — inside",
      RUNTIME_PLACEHOLDERS_END,
      "- `{AFTER}` — outside",
    ].join("\n");
    expect([...parseRuntimePlaceholders(content)!]).toEqual(["{LISTED}"]);
  });

  it("returns null when a marker is missing or the markers are out of order", () => {
    expect(parseRuntimePlaceholders("- `{X}` — no markers")).toBeNull();
    expect(parseRuntimePlaceholders(`${RUNTIME_PLACEHOLDERS_START}\n- \`{X}\` — y`)).toBeNull();
    expect(parseRuntimePlaceholders(`${RUNTIME_PLACEHOLDERS_END}\n${RUNTIME_PLACEHOLDERS_START}`)).toBeNull();
  });

  it("returns an empty set for an empty list", () => {
    expect(parseRuntimePlaceholders(standard([]))!.size).toBe(0);
  });
});

describe("scanGovernancePlaceholders", () => {
  it("reports unknown tokens in active docs only; listed tokens, template and draft docs are silent", async () => {
    const gov = await governance({
      [PLACEHOLDER_STANDARD_FILE]: standard(["{OPERATOR_NAME}"]),
      "active-clean.md": doc("active", "Owner: {OPERATOR_NAME}."),
      "active-unknown.md": doc("active", "Owner: {OPERATOR_NAME}, venue {VENUE_NAME}, typo {OPERATR_NAME}."),
      "fill-in.md": doc("template", "Fill in {YOUR_ROSTER}."),
      "draft.md": doc("draft", "Draft {DRAFT_TOKEN}."),
      "no-status.md": doc(null, "Bare {BARE_TOKEN}."),
      "notes.txt": "not markdown {TXT_TOKEN}",
    });
    const scan = await scanGovernancePlaceholders(gov);
    expect(scan.status).toBe("scanned");
    if (scan.status !== "scanned") return;
    expect(scan.findings).toEqual([{ file: "active-unknown.md", tokens: ["{VENUE_NAME}", "{OPERATR_NAME}"] }]);
    expect(scan.activeDocs).toEqual(["active-clean.md", "active-unknown.md", PLACEHOLDER_STANDARD_FILE]);
    expect(scan.templateDocs).toEqual(["fill-in.md"]);
  });

  it("is skipped, not failed, when spell-authoring-standards.md is not installed", async () => {
    const gov = await governance({ "active.md": doc("active", "{UNKNOWN_TOKEN}") });
    const scan = await scanGovernancePlaceholders(gov);
    expect(scan).toEqual({ status: "skipped", reason: `${PLACEHOLDER_STANDARD_FILE} is not installed` });
  });

  it("is skipped when the installed standard predates the runtime-placeholders list", async () => {
    const gov = await governance({
      [PLACEHOLDER_STANDARD_FILE]: doc("active", "# Standard without a list"),
      "active.md": doc("active", "{UNKNOWN_TOKEN}"),
    });
    const scan = await scanGovernancePlaceholders(gov);
    expect(scan.status).toBe("skipped");
  });

  it("is skipped when the governance directory itself is absent", async () => {
    dir = await createFixtureDir("up02-d-placeholders-none");
    const scan = await scanGovernancePlaceholders(join(dir, ".arcane", "governance"));
    expect(scan.status).toBe("skipped");
  });
});

describe("fresh-install acceptance (ARC-051 decision 5)", () => {
  for (const relative of ["src/assets/.arcane/governance", ".arcane/governance"]) {
    it(`scanning the shipped ${relative} yields zero unknown tokens`, async () => {
      const scan = await scanGovernancePlaceholders(join(REPO_ROOT, relative));
      expect(scan.status).toBe("scanned");
      if (scan.status !== "scanned") return;
      expect(scan.findings).toEqual([]);
      // Guard against a vacuous pass: the real directory was actually read.
      expect(scan.activeDocs.length).toBeGreaterThan(10);
      expect(scan.runtimeTokens.size).toBeGreaterThan(0);
      expect(scan.templateDocs).toEqual(["agent-approved-paths.md", "naming-conventions.md"]);
    });
  }
});
