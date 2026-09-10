/**
 * Spell compiler — build-time generation for spell client shims and shared
 * prose fragments (ARC-039 / BC-32, extended by ARC-045 / CS-03).
 *
 * `.arcane/spells/<id>.md` is each spell's sole authored source: client-neutral,
 * carrying every client's hint fields in one frontmatter block. Three
 * renderers produce the client surfaces from it, and none of them carries
 * prose of its own -- `renderCopilotPromptShim()` (`.github/prompts/
 * <id>.prompt.md`), `renderClaudeCommandStub()` (`.claude/commands/<id>.md`)
 * and `renderCodexSkill()` (`.agents/skills/<id>/SKILL.md`) -- the same
 * one-source/multiple-render() shape `agent-generator.ts` established,
 * applied to a second content class. `expandFragment()` inlines a named,
 * shared prose fragment into a marked span of a consuming spell, so genuinely
 * duplicated text (today: the tracking-mode declaration lines) has one edited
 * home instead of N independently-drifting copies.
 */

import { parse as parseYaml } from "yaml";

export interface PromptFrontmatter {
  name: string;
  description: string;
  claudeDescription?: string;
}

export class MissingFrontmatterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingFrontmatterError";
  }
}

export class MalformedFragmentMarkersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedFragmentMarkersError";
  }
}

export class InvalidSkillNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSkillNameError";
  }
}

// ─── The path contract (ARC-045 decisions 1-2) ────────────────────────────────
// Everything that needs to know where a spell's authored content lives, or
// which files are generated client shims over it, resolves it through these
// two helpers -- the parity script, the registry tests, and `spell update`'s
// migration logic alike. There is deliberately no second copy of the shim
// path shapes anywhere else.

/** Directory (relative to the assets root / a consumer's repo root) holding the canonical spell sources. */
export const CANONICAL_SPELLS_DIR = ".arcane/spells";

/** The one authored file for a spell: `.arcane/spells/<id>.md`. */
export function canonicalSpellPath(id: string): string {
  return `${CANONICAL_SPELLS_DIR}/${id}.md`;
}

/**
 * The three generated client-shim shapes, one per client surface. A path
 * matching any of these carries no authored prose -- it is `render()` output
 * over the canonical file -- which is exactly why `spell update` must never
 * three-way-merge an operator's edit *into* one (see update.ts).
 */
export const CLIENT_SHIM_PATH_PATTERNS: readonly RegExp[] = [
  /^\.github\/prompts\/spell-[a-z0-9-]+\.prompt\.md$/,
  /^\.claude\/commands\/spell-[a-z0-9-]+\.md$/,
  /^\.agents\/skills\/spell-[a-z0-9-]+\/SKILL\.md$/,
];

/** True when `path` (registry-relative, either slash style) is a generated client shim. */
export function isClientShimPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
  return CLIENT_SHIM_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parses a spell's YAML frontmatter block. Requires `name` and
 * `description`; `claude_description` (the Claude Code stub's own
 * proactive-invocation hint -- distinct from `description`, see
 * renderClaudeCommandStub) is optional so a spell authored before that
 * field existed still parses, falling back to `description` at render time.
 */
export function parsePromptFrontmatter(content: string): PromptFrontmatter {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    throw new MissingFrontmatterError(
      "Prompt file has no YAML frontmatter block (expected a leading --- ... --- block).",
    );
  }

  const raw = parseYaml(match[1]) as Record<string, unknown> | null;
  const name = raw?.["name"];
  const description = raw?.["description"];

  if (typeof name !== "string" || name.trim() === "") {
    throw new MissingFrontmatterError('Prompt frontmatter is missing a "name" field.');
  }
  if (typeof description !== "string" || description.trim() === "") {
    throw new MissingFrontmatterError('Prompt frontmatter is missing a "description" field.');
  }

  const claudeDescription = raw?.["claude_description"];

  return {
    name,
    description,
    claudeDescription: typeof claudeDescription === "string" ? claudeDescription : undefined,
  };
}

/**
 * Returns a spell's complete frontmatter block -- the opening `---`, every
 * field line, the closing `---` and its newline -- normalized to LF. The
 * Copilot shim copies this block verbatim (see renderCopilotPromptShim), so
 * it is extracted as text rather than re-serialized from the parsed object:
 * YAML round-tripping could reorder or requote fields, and the point is that
 * Copilot sees exactly the block it saw before the canonical move.
 */
export function extractFrontmatterBlock(content: string): string {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    throw new MissingFrontmatterError(
      "Prompt file has no YAML frontmatter block (expected a leading --- ... --- block).",
    );
  }
  const block = match[0].replace(/\r\n/g, "\n");
  return block.endsWith("\n") ? block : `${block}\n`;
}

const SPELL_NAME_PREFIX = /^Spell\s*—\s*/;

/** Derives a `.claude/commands/` stub title from a prompt's `name` field ("Spell — X" -> "X"). */
export function deriveStubTitle(name: string): string {
  return name.replace(SPELL_NAME_PREFIX, "").trim();
}

/**
 * Renders the `.github/prompts/{id}.prompt.md` shim for VS Code Copilot
 * (ARC-045 decision 2 / CS-03). The frontmatter is the canonical file's own
 * block, byte-for-byte: VS Code reads `description`, `agent`, `argument-hint`
 * (and `name`, `model`, `tools`) from it, and copying the block whole means
 * the picker sees exactly the fields the full prompt carried before the
 * move. The body is one paragraph carrying both reference mechanisms VS
 * Code's prompt-file documentation admits: a relative Markdown link (resolved
 * from the prompt file's own location -- `.github/prompts/` is two levels
 * below the repo root, hence `../../`) for a client that attaches linked
 * files as context, and the explicit read-and-follow sentence proven live
 * against Codex for one that does not. Every spell runs `agent: agent`, so
 * the model always has a file-read tool for the second path.
 */
export function renderCopilotPromptShim(id: string, canonicalContent: string): string {
  // Validate before rendering: a canonical file the parser rejects must fail
  // the build here, not ship an unparseable shim.
  parsePromptFrontmatter(canonicalContent);
  const frontmatter = extractFrontmatterBlock(canonicalContent);
  const path = canonicalSpellPath(id);

  return `${frontmatter}
This prompt is the Arcane \`${id}\` spell. Read [\`${path}\`](../../${path}) and follow it as the complete workflow.
`;
}

/**
 * Renders a `.claude/commands/{id}.md` thin-shim stub from its canonical
 * source's frontmatter. The stub's own `description` is a Claude
 * Code-specific proactive-invocation hint -- prefer `claudeDescription`
 * when the source provides one; only a spell with no such field yet falls
 * back to the plainer `description` (which reads correctly, just without
 * the "use PROACTIVELY" framing that encourages unprompted invocation).
 * The `@` include is Claude Code's own mechanism for splicing a repo-relative
 * file into the command, unchanged by CS-03 -- only its target moved.
 */
export function renderClaudeCommandStub(id: string, frontmatter: PromptFrontmatter): string {
  const title = deriveStubTitle(frontmatter.name);
  const description = frontmatter.claudeDescription ?? frontmatter.description;
  const promptPath = canonicalSpellPath(id);

  return `---
description: ${description}
---

# ${title}

Invoke the Arcane \`${id}\` spell workflow.

See the full prompt at \`${promptPath}\` for the complete workflow definition.

---

@${promptPath}
`;
}

const SKILL_NAME_PATTERN = /^[a-z0-9-]+$/;

/**
 * Renders a `.agents/skills/{id}/SKILL.md` for OpenAI Codex (CS-01 / ARC-039
 * extension). Unlike the Claude stub, this is not an `@include` -- Codex has
 * no such directive -- so the body is a plain-language instruction to read
 * and follow the canonical file. Live-tested against installed
 * `codex-cli 0.153.4` (2026-09-09, `docs/research/skill-discovery-smoke-tests.md`):
 * a skill body naming a bare repository-relative path is read via a real
 * shell command and its instructions followed verbatim, so this is a proven
 * mechanism, not an assumption. `canonicalPath` is `canonicalSpellPath(id)`
 * since CS-03 (it was the Copilot prompt's path under CS-01); the parameter
 * stays explicit so the rendered text and the path contract are checked
 * against each other in tests rather than assumed to agree.
 *
 * No description-length guard: Codex already degrades gracefully on an
 * overlong description (observed truncating it under a "skills context
 * budget" rather than erroring), so throwing our own error for something the
 * consumer already tolerates would be enforcing a limit nobody has actually
 * hit or documented.
 */
export function renderCodexSkill(
  id: string,
  frontmatter: PromptFrontmatter,
  canonicalPath: string,
): string {
  if (!SKILL_NAME_PATTERN.test(id)) {
    throw new InvalidSkillNameError(
      `Skill id "${id}" must match ${SKILL_NAME_PATTERN} (lowercase letters, digits, hyphens only).`,
    );
  }
  const description = frontmatter.claudeDescription ?? frontmatter.description;

  return `---
name: ${id}
description: ${description}
---

This skill is the Arcane \`${id}\` spell. Read \`${canonicalPath}\` and follow it as the complete workflow.
`;
}

function fragmentMarkers(name: string): { start: string; end: string } {
  return {
    start: `<!-- fragment:${name}:start -->`,
    end: `<!-- fragment:${name}:end -->`,
  };
}

/**
 * Expands a named fragment into `content`'s marked span, replacing
 * whatever currently sits between `<!-- fragment:{name}:start -->` and
 * `<!-- fragment:{name}:end -->` with `fragmentContent` (the markers
 * themselves are always preserved, so the span stays re-expandable --
 * the same idempotent, always-owned-content model `merger.ts` uses for
 * CLAUDE.md's routing-table section, generalized to a *named* marker so
 * one file can host more than one distinct fragment).
 *
 * The injected lines are re-indented to match the start marker's own
 * leading whitespace, since consuming prompts nest the marker at
 * different list depths (a bare-column-0 splice would dedent a fragment
 * out of its surrounding bullet list). Author both markers at the same
 * indentation; this function only reads the start marker's.
 *
 * A file that does not reference this fragment at all is returned
 * unchanged (most consuming files reference exactly one of several
 * fragments in the library). Mismatched, reversed, or inconsistently
 * indented markers all throw -- fixing a malformed span is a decision
 * only a person should make. (LH-06b: the indentation check was added
 * after finding the START/END pair had actually drifted out of sync
 * in a real consuming file, silently re-indenting the fragment to the
 * START's column while leaving a differently-indented END marker
 * sitting in the output -- exactly the kind of malformed span this
 * function already refuses to silently paper over for the other two
 * cases, just not yet for this one.)
 */
export function expandFragment(content: string, name: string, fragmentContent: string): string {
  const { start, end } = fragmentMarkers(name);
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end);

  if (startIdx === -1 && endIdx === -1) return content;
  if (startIdx === -1 || endIdx === -1) {
    throw new MalformedFragmentMarkersError(
      `Mismatched fragment markers for "${name}": ` +
        `${startIdx === -1 ? "start missing" : "start found"}, ` +
        `${endIdx === -1 ? "end missing" : "end found"}.`,
    );
  }
  if (startIdx > endIdx) {
    throw new MalformedFragmentMarkersError(
      `Fragment markers for "${name}" are in the wrong order (end before start).`,
    );
  }

  const lineStart = content.lastIndexOf("\n", startIdx) + 1;
  const indent = content.slice(lineStart, startIdx);
  // The end marker's own indentation is part of `after`, not generated here --
  // slicing from endIdx (the marker text) rather than its line start would
  // silently drop it and dedent the closing marker to column 0.
  const endLineStart = content.lastIndexOf("\n", endIdx) + 1;
  const endIndent = content.slice(endLineStart, endIdx);
  if (endIndent !== indent) {
    throw new MalformedFragmentMarkersError(
      `Fragment markers for "${name}" have inconsistent indentation: ` +
        `start is indented ${JSON.stringify(indent)}, end is indented ${JSON.stringify(endIndent)}. ` +
        `Author both markers at the same indentation before re-running.`,
    );
  }

  const before = content.slice(0, startIdx + start.length);
  const after = content.slice(endLineStart);
  const indented = fragmentContent
    .trim()
    .split("\n")
    .map((line) => (line.length > 0 ? `${indent}${line}` : line))
    .join("\n");
  return `${before}\n${indented}\n${after}`;
}

/** True when `content` references the named fragment's marker span at all. */
export function referencesFragment(content: string, name: string): boolean {
  return content.includes(fragmentMarkers(name).start);
}
