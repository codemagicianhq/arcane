import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { STATE_SCHEMA_ASSET_PATH, STATE_SCHEMA_VERSION, type StateDocument } from "../../src/modules/state/types.js";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SCHEMA_PATH = join(REPO_ROOT, "src/assets", STATE_SCHEMA_ASSET_PATH);

export type JsonSchema = {
  $id?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  examples?: unknown[];
  additionalProperties?: boolean;
  type?: string | string[];
};

export async function loadStateSchema(): Promise<JsonSchema> {
  return JSON.parse(await readFile(SCHEMA_PATH, "utf8")) as JsonSchema;
}

/** Compiles the shipped schema with ajv (a devDependency only, ARC-037 decision 8); returns a validator that lists errors. */
export async function compileStateSchema(): Promise<(doc: unknown) => string[]> {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  const validate = ajv.compile(await loadStateSchema());
  return (doc: unknown) => {
    if (validate(doc)) return [];
    return (validate.errors ?? []).map((e: ErrorObject) => `${e.instancePath || "/"} ${e.message ?? ""}`.trim());
  };
}

/** A minimal, complete document: every section present, every nullable one null. */
export function minimalDocument(): StateDocument {
  return {
    schema_version: STATE_SCHEMA_VERSION,
    generated_at: "2026-11-04T12:00:00.000Z",
    generator: { name: "arcane-cli", version: "0.0.0-test" },
    repository: { root: "/repo", scope: "repo", role: "consumer", profile: "lite" },
    versions: {
      files: "0.0.0-test",
      cli: "0.0.0-test",
      latest: null,
      drift: { files_behind_cli: false, cli_behind_latest: null },
      components: [],
    },
    git: null,
    indexes: { decisions: null, todos: null, ideas: null, done: null, journal: null },
    config: {
      tracking_mode: null,
      external_provider: null,
      push_policy: null,
      role: null,
      business_root: null,
      spell_scope: null,
      content_sensitivity: null,
    },
    registry: null,
    features: null,
    agents: null,
    warnings: [],
  };
}
