import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { STATE_SCHEMA_ASSET_PATH, STATE_SCHEMA_ID, STATE_SCHEMA_VERSION, type StateDocument } from "../src/modules/state/types.js";
import { REPO_ROOT, compileStateSchema, loadStateSchema as loadSchema, minimalDocument, type JsonSchema } from "./helpers/state-schema.js";
import { STATE_SHAPE, canonicalize, serializeState, toPosixRelative, type Shape } from "../src/modules/state/serialize.js";
import { copyAssets } from "../scripts/copy-assets.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

const ROOT = REPO_ROOT;

describe("state schema (ST-02, ST-10)", () => {
  it("carries the agreed $id, a 1.0.0 schema version and a closed envelope", async () => {
    const schema = await loadSchema();
    expect(schema.$id).toBe(STATE_SCHEMA_ID);
    expect(STATE_SCHEMA_ID).toBe("https://arcaneai.net/schemas/state/v1");
    expect(STATE_SCHEMA_VERSION).toBe("1.0.0");
    expect(schema.additionalProperties).toBe(false);
  });

  it("accepts a minimal valid document and the schema's own example", async () => {
    const validate = await compileStateSchema();
    expect(validate(minimalDocument())).toEqual([]);
    const schema = await loadSchema();
    expect(schema.examples).toHaveLength(1);
    expect(validate(schema.examples![0])).toEqual([]);
  });

  it("rejects a document with an extra envelope key", async () => {
    const validate = await compileStateSchema();
    const doc = { ...minimalDocument(), extra: true };
    const errors = validate(doc);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain("must NOT have additional properties");
  });

  it("rejects a document missing a required section", async () => {
    const validate = await compileStateSchema();
    const doc = minimalDocument() as Partial<StateDocument>;
    delete doc.warnings;
    expect(validate(doc).join("\n")).toContain("warnings");
  });

  it("ships under dist/assets/schemas/ through scripts/copy-assets.ts (no script change needed)", async () => {
    const dest = await createFixtureDir("state-schema-copy");
    try {
      const { violations } = await copyAssets(join(ROOT, "src/assets"), dest);
      expect(violations).toEqual([]);
      expect(existsSync(join(dest, STATE_SCHEMA_ASSET_PATH))).toBe(true);
    } finally {
      await removeFixtureDir(dest);
    }
  });

  it("is validated with a devDependency only (ARC-037 decision 8)", async () => {
    const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.devDependencies["ajv"]).toBeDefined();
    expect(pkg.dependencies["ajv"]).toBeUndefined();
  });
});

// ─── Serializer parity with the schema ───────────────────────────────────────

/** Resolves a `$ref`/`oneOf` node to the object or array schema it describes, if any. */
function resolveNode(node: JsonSchema, defs: Record<string, JsonSchema>): JsonSchema {
  if (node.$ref) {
    const name = node.$ref.replace("#/$defs/", "");
    return resolveNode(defs[name], defs);
  }
  if (node.oneOf) {
    const concrete = node.oneOf.find((alt) => alt.type !== "null");
    return concrete ? resolveNode(concrete, defs) : node;
  }
  return node;
}

function expectShapeMatches(shape: Shape | undefined, node: JsonSchema, defs: Record<string, JsonSchema>, at: string): void {
  const resolved = resolveNode(node, defs);
  if (resolved.properties) {
    expect(shape, `${at}: schema has an object here but the shape does not`).toBeDefined();
    expect(shape!.kind, at).toBe("object");
    const keys = (shape as { keys: Record<string, Shape | undefined> }).keys;
    expect(Object.keys(keys), `${at}: key order`).toEqual(Object.keys(resolved.properties));
    for (const [key, child] of Object.entries(resolved.properties)) {
      expectShapeMatches(keys[key], child, defs, `${at}.${key}`);
    }
    return;
  }
  if (resolved.items) {
    const item = resolveNode(resolved.items, defs);
    // An array of scalars needs no shape unless it is sorted (warnings).
    if (!item.properties && !item.items && shape === undefined) return;
    expect(shape, `${at}: schema has an array here but the shape does not`).toBeDefined();
    expect(shape!.kind, at).toBe("array");
    expectShapeMatches((shape as { items: Shape | undefined }).items, resolved.items, defs, `${at}[]`);
    return;
  }
  expect(shape, `${at}: a scalar needs no shape`).toBeUndefined();
}

describe("serializeState (ST-09)", () => {
  it("emits keys in schema order: the shape table matches the schema's property order, recursively", async () => {
    const schema = await loadSchema();
    expectShapeMatches(STATE_SHAPE, schema, schema.$defs ?? {}, "$");
  });

  it("serializes two differently-ordered inputs identically, with a trailing newline", () => {
    const a = minimalDocument();
    const reordered = Object.fromEntries(Object.entries(a).reverse()) as unknown as StateDocument;
    reordered.config = Object.fromEntries(Object.entries(a.config).reverse()) as StateDocument["config"];
    expect(Object.keys(reordered)[0]).toBe("warnings");
    const text = serializeState(a);
    expect(serializeState(reordered)).toBe(text);
    expect(text.endsWith("}\n")).toBe(true);
    expect(Object.keys(JSON.parse(text) as object)[0]).toBe("schema_version");
  });

  it("sorts arrays by their declared keys with code-unit order, and keeps book items in file order", () => {
    const doc = minimalDocument();
    doc.versions.components = [
      { name: "spells", installedVersion: "1" },
      { name: "Governance", installedVersion: "1" },
      { name: "agents", installedVersion: "1" },
    ];
    doc.indexes.journal = [
      { date: "2026-11-02", slug: "b", title: null, path: "journal/2026-11-02-b.md" },
      { date: "2026-11-01", slug: "z", title: null, path: "journal/2026-11-01-z.md" },
      { date: "2026-11-02", slug: "a", title: null, path: "journal/2026-11-02-a.md" },
    ];
    doc.indexes.todos = {
      open: 2,
      done: 0,
      items: [
        { text: "z first", section: null, locator: "s/1", checked: false },
        { text: "a second", section: null, locator: "s/2", checked: false },
      ],
    };
    doc.warnings = ["b", "a"];
    const parsed = JSON.parse(serializeState(doc)) as StateDocument;
    expect(parsed.versions.components.map((c) => c.name)).toEqual(["Governance", "agents", "spells"]);
    expect(parsed.indexes.journal!.map((j) => j.slug)).toEqual(["z", "a", "b"]);
    expect(parsed.indexes.todos!.items.map((i) => i.text)).toEqual(["z first", "a second"]);
    expect(parsed.warnings).toEqual(["a", "b"]);
  });

  it("keeps an unknown key, after the known ones, so the schema can reject it", () => {
    const ordered = canonicalize({ warnings: [], extra: 1, schema_version: "1.0.0" }, STATE_SHAPE) as Record<string, unknown>;
    expect(Object.keys(ordered)).toEqual(["schema_version", "warnings", "extra"]);
  });

  it("drops undefined values and leaves null and scalars alone", () => {
    expect(canonicalize({ a: undefined, b: null }, { kind: "object", keys: { a: undefined, b: undefined } })).toEqual({ b: null });
    expect(canonicalize(null, STATE_SHAPE)).toBeNull();
    expect(canonicalize("x", STATE_SHAPE)).toBe("x");
    expect(canonicalize([1], STATE_SHAPE)).toEqual([1]);
    expect(canonicalize({ a: 1 }, { kind: "array", items: undefined })).toEqual({ a: 1 });
  });
});

describe("toPosixRelative", () => {
  it("returns '.' for the root itself and forward slashes below it", () => {
    expect(toPosixRelative("/r", "/r")).toBe(".");
    expect(toPosixRelative(join("/r"), join("/r", "a", "b"))).toBe("a/b");
    expect(toPosixRelative(join("/r", "x"), join("/r", "y"))).toBe("../y");
  });
});
