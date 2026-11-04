/**
 * Determinism by construction (architecture D11): the document is emitted
 * with object keys in schema order, arrays sorted by their declared key, and
 * printed as 2-space JSON with a trailing newline. Collectors may build their
 * sections in any order; `serializeState` normalizes them, so two input
 * objects that differ only in key order serialize to identical text.
 *
 * The shape table below mirrors `state.schema.json`'s property order.
 * `test/state-schema.test.ts` walks the schema and fails when the two drift.
 */

import path from "node:path";
import type { StateDocument } from "./types.js";

export interface ObjectShape {
  kind: "object";
  /** Key order is emission order. `undefined` leaves a value as it is. */
  keys: Record<string, Shape | undefined>;
}

export interface ArrayShape {
  kind: "array";
  items: Shape | undefined;
  /** Sort keys, applied in order; absent keeps the collector's order. */
  sortBy?: readonly string[];
}

export type Shape = ObjectShape | ArrayShape;

const object = (keys: ObjectShape["keys"]): ObjectShape => ({ kind: "object", keys });
const array = (items: Shape | undefined, sortBy?: readonly string[]): ArrayShape => ({
  kind: "array",
  items,
  ...(sortBy === undefined ? {} : { sortBy }),
});

const book = object({
  open: undefined,
  done: undefined,
  items: array(object({ text: undefined, section: undefined, locator: undefined, checked: undefined })),
});

/** The envelope's shape, key for key in schema order. Exported for the parity test. */
export const STATE_SHAPE: ObjectShape = object({
  schema_version: undefined,
  generated_at: undefined,
  generator: object({ name: undefined, version: undefined }),
  repository: object({ root: undefined, scope: undefined, role: undefined, profile: undefined }),
  versions: object({
    files: undefined,
    cli: undefined,
    latest: undefined,
    drift: object({ files_behind_cli: undefined, cli_behind_latest: undefined }),
    components: array(object({ name: undefined, installedVersion: undefined }), ["name"]),
  }),
  git: object({
    branch: undefined,
    detached: undefined,
    trunk: undefined,
    ahead: undefined,
    behind: undefined,
    uncommitted: undefined,
    remote: object({ provider: undefined, url: undefined }),
    worktrees: array(object({ path: undefined, branch: undefined }), ["path"]),
    pull_request: object({ id: undefined, url: undefined, state: undefined }),
  }),
  indexes: object({
    decisions: array(
      object({ id: undefined, title: undefined, status: undefined, date: undefined, anchor: undefined }),
      ["id"],
    ),
    todos: book,
    ideas: book,
    done: book,
    journal: array(object({ date: undefined, slug: undefined, title: undefined, path: undefined }), ["date", "slug"]),
  }),
  config: object({
    tracking_mode: undefined,
    external_provider: undefined,
    push_policy: undefined,
    role: undefined,
    business_root: undefined,
    spell_scope: undefined,
    content_sensitivity: undefined,
  }),
  registry: object({
    updated: undefined,
    ventures: array(
      object({
        slug: undefined,
        name: undefined,
        aliases: undefined,
        status: undefined,
        visibility: undefined,
        ownership: undefined,
        tracking: undefined,
        repos: array(object({ name: undefined, remote: undefined, default: undefined, local_path: undefined })),
      }),
      ["slug"],
    ),
  }),
  features: array(
    object({
      slug: undefined,
      title: undefined,
      status: undefined,
      implementation_status: undefined,
      tracking: object({
        tracking_mode: undefined,
        external_provider: undefined,
        adoWorkItemId: undefined,
        githubIssueId: undefined,
      }),
      path: undefined,
    }),
    ["slug"],
  ),
  agents: object({
    schema: undefined,
    naming_strategy: undefined,
    agent_profile: undefined,
    entries: array(
      object({
        definition: undefined,
        name: undefined,
        id: undefined,
        epithet: undefined,
        origin: undefined,
        definition_revision: undefined,
      }),
    ),
  }),
  warnings: array(undefined, []),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Code-unit comparison, not `localeCompare`: the order must be the same on
 * every machine and locale, since the snapshot tests run on three operating
 * systems.
 */
function compareScalars(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedBy(values: unknown[], keys: readonly string[]): unknown[] {
  // A stable copy: ties keep the collector's order.
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => {
    for (const key of keys) {
      const result = compareScalars(
        isRecord(a.value) ? a.value[key] : undefined,
        isRecord(b.value) ? b.value[key] : undefined,
      );
      if (result !== 0) return result;
    }
    return a.index - b.index;
  });
  return indexed.map((entry) => entry.value);
}

/**
 * A copy of `value` with keys in shape order and arrays sorted by their
 * declared keys. A key the shape does not name is appended after the named
 * ones, in its original order, so the schema's `additionalProperties: false`
 * still sees and rejects it. `undefined` values are dropped, as
 * `JSON.stringify` would drop them.
 */
export function canonicalize(value: unknown, shape: Shape | undefined): unknown {
  if (value === null || value === undefined || shape === undefined) return value;
  if (shape.kind === "array") {
    if (!Array.isArray(value)) return value;
    const items = value.map((item) => canonicalize(item, shape.items));
    if (shape.sortBy === undefined) return items;
    if (shape.sortBy.length === 0) return [...items].sort(compareScalars);
    return sortedBy(items, shape.sortBy);
  }
  if (!isRecord(value)) return value;
  const ordered: Record<string, unknown> = {};
  for (const [key, keyShape] of Object.entries(shape.keys)) {
    if (!(key in value) || value[key] === undefined) continue;
    ordered[key] = canonicalize(value[key], keyShape);
  }
  for (const [key, extra] of Object.entries(value)) {
    if (key in ordered || key in shape.keys || extra === undefined) continue;
    ordered[key] = extra;
  }
  return ordered;
}

/** The document as `spell state --json` prints it: canonical key order, sorted arrays, 2-space JSON, trailing newline. */
export function serializeState(doc: StateDocument): string {
  return `${JSON.stringify(canonicalize(doc, STATE_SHAPE), null, 2)}\n`;
}

/**
 * `target` as a POSIX path relative to `root` ("." for `root` itself). Both
 * are taken as absolute paths on this machine; on Windows a target on
 * another drive has no relative form and is returned POSIX-separated as is.
 */
export function toPosixRelative(root: string, target: string): string {
  const relative = path.relative(root, target);
  if (relative === "") return ".";
  if (path.isAbsolute(relative)) return relative.replace(/\\/g, "/");
  return relative.split(path.sep).join("/");
}
