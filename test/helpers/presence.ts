import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { PRESENCE_SCHEMA_ASSET_PATH, PRESENCE_SCHEMA_ID } from "../../src/modules/presence/types.js";
import { REPO_ROOT } from "./state-schema.js";

export const PRESENCE_SCHEMA_PATH = join(REPO_ROOT, "src/assets", PRESENCE_SCHEMA_ASSET_PATH);
export const PRESENCE_FIXTURE_DIR = join(REPO_ROOT, "test/fixtures/presence");

export interface PresenceSchema {
  $id: string;
  additionalProperties: boolean;
  required: string[];
  properties: Record<string, unknown>;
  $defs: Record<string, { required?: string[]; properties?: Record<string, unknown> }>;
}

export async function loadPresenceSchema(): Promise<PresenceSchema> {
  return JSON.parse(await readFile(PRESENCE_SCHEMA_PATH, "utf8")) as PresenceSchema;
}

/** The record root, or one of the `$defs`. */
export type PresenceDef = "record" | string;

/**
 * Compiles the shipped schema with ajv (a devDependency only, ARC-037
 * decision 8). Returns a validator per definition that lists errors.
 */
export async function compilePresenceSchema(): Promise<(def: PresenceDef, value: unknown) => string[]> {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  ajv.addSchema(await loadPresenceSchema());
  const cache = new Map<string, ValidateFunction>();
  return (def, value) => {
    const key = def === "record" ? PRESENCE_SCHEMA_ID : `${PRESENCE_SCHEMA_ID}#/$defs/${def}`;
    let validate = cache.get(key);
    if (validate === undefined) {
      validate = ajv.getSchema(key);
      if (validate === undefined) throw new Error(`no presence schema definition "${def}"`);
      cache.set(key, validate);
    }
    if (validate(value)) return [];
    return (validate.errors ?? []).map((e: ErrorObject) => `${e.instancePath || "/"} ${e.message ?? ""}`.trim());
  };
}

export interface PresenceFixture {
  file: string;
  /** The schema definition the file name's first segment names (`record` is the root). */
  def: string;
  value: unknown;
}

export async function loadPresenceFixtures(): Promise<PresenceFixture[]> {
  const files = (await readdir(PRESENCE_FIXTURE_DIR)).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      def: file.split(".")[0],
      value: JSON.parse(await readFile(join(PRESENCE_FIXTURE_DIR, file), "utf8")) as unknown,
    })),
  );
}

export async function loadPresenceFixture<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(join(PRESENCE_FIXTURE_DIR, file), "utf8")) as T;
}
