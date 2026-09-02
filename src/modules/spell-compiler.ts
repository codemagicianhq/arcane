/**
 * Spell compiler — build-time generation for spell client stubs and shared
 * prose fragments (ARC-039 / BC-32).
 *
 * `.github/prompts/spell-*.prompt.md` is each spell's sole authored source.
 * `renderClaudeCommandStub()` generates the corresponding `.claude/commands/
 * spell-*.md` thin-shim stub from that source's frontmatter, mirroring
 * `agent-generator.ts`'s one-source/multiple-render() shape for a second
 * content class. `expandFragment()` inlines a named, shared prose fragment
 * into a marked span of a consuming prompt, so genuinely duplicated text
 * (today: the tracking-mode declaration lines) has one edited home instead
 * of N independently-drifting copies.
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

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parses a spell prompt's YAML frontmatter block. Requires `name` and
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

const SPELL_NAME_PREFIX = /^Spell\s*—\s*/;

/** Derives a `.claude/commands/` stub title from a prompt's `name` field ("Spell — X" -> "X"). */
export function deriveStubTitle(name: string): string {
  return name.replace(SPELL_NAME_PREFIX, "").trim();
}

/**
 * Renders a `.claude/commands/{id}.md` thin-shim stub from its source
 * prompt's frontmatter. The stub's own `description` is a Claude
 * Code-specific proactive-invocation hint -- prefer `claudeDescription`
 * when the source provides one; only a spell with no such field yet falls
 * back to the plainer `description` (which reads correctly, just without
 * the "use PROACTIVELY" framing that encourages unprompted invocation).
 */
export function renderClaudeCommandStub(id: string, frontmatter: PromptFrontmatter): string {
  const title = deriveStubTitle(frontmatter.name);
  const description = frontmatter.claudeDescription ?? frontmatter.description;
  const promptPath = `.github/prompts/${id}.prompt.md`;

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
