import type { AgentDefinition, AgentRoster } from "../types.js";

const CURRENT_ROSTER_SCHEMA_VERSION = 2;
const POWER_LEVELS = new Set([
  "Spectator",
  "Apprentice",
  "Wizard",
  "Sorcerer",
  "Magus",
  "Archmage",
]);
const AGENT_CATEGORIES = new Set([
  "engineering",
  "operations",
  "quality",
  "research",
]);
const NAMING_STRATEGIES = new Set(["arcanos", "generic", "random", "custom"]);
const AGENT_PROFILES = new Set(["base", "full", "custom"]);

type RecordValue = Record<string, unknown>;

export class AgentConfigValidationError extends Error {
  constructor(source: string, issues: string[]) {
    super(`Invalid agent configuration in ${source}:\n- ${issues.join("\n- ")}`);
    this.name = "AgentConfigValidationError";
  }
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(
  value: unknown,
  path: string,
  issues: string[],
): RecordValue | undefined {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  return value;
}

function requireString(value: unknown, path: string, issues: string[]) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path} must be a non-empty string`);
  }
}

function requireBoolean(value: unknown, path: string, issues: string[]) {
  if (typeof value !== "boolean") issues.push(`${path} must be a boolean`);
}

function requireStringArray(value: unknown, path: string, issues: string[]) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    issues.push(`${path} must be an array of strings`);
  }
}

function requireEnum(
  value: unknown,
  allowed: Set<string>,
  path: string,
  issues: string[],
) {
  if (typeof value !== "string" || !allowed.has(value)) {
    issues.push(`${path} must be one of: ${[...allowed].join(", ")}`);
  }
}

function validateOptionalClient(
  clients: RecordValue,
  key: string,
  property: string,
  expected: "string" | "boolean",
  issues: string[],
) {
  if (clients[key] === undefined) return;
  const client = requireRecord(clients[key], `clients.${key}`, issues);
  if (!client) return;
  if (expected === "string") {
    requireString(client[property], `clients.${key}.${property}`, issues);
  } else {
    requireBoolean(client[property], `clients.${key}.${property}`, issues);
  }
}

export function validateAgentDefinition(
  value: unknown,
  source: string,
): AgentDefinition {
  const issues: string[] = [];
  const definition = requireRecord(value, "definition", issues);
  if (!definition) throw new AgentConfigValidationError(source, issues);

  requireString(definition.id, "id", issues);
  requireString(definition.role, "role", issues);
  requireEnum(definition.category, AGENT_CATEGORIES, "category", issues);

  const persona = requireRecord(definition.persona, "persona", issues);
  if (persona) {
    requireString(persona.description, "persona.description", issues);
    requireStringArray(persona.behavioral_rules, "persona.behavioral_rules", issues);
    for (const key of ["personality", "voice", "visual_description"] as const) {
      if (persona[key] !== undefined) requireString(persona[key], `persona.${key}`, issues);
    }
    if (persona.catchphrases !== undefined) {
      requireStringArray(persona.catchphrases, "persona.catchphrases", issues);
    }
  }

  const model = requireRecord(definition.model, "model", issues);
  if (model) {
    requireString(model.primary, "model.primary", issues);
    requireStringArray(model.fallback, "model.fallback", issues);
  }

  const tools = requireRecord(definition.tools, "tools", issues);
  if (tools) {
    requireStringArray(tools.allowed, "tools.allowed", issues);
    requireStringArray(tools.denied, "tools.denied", issues);
  }

  const autonomy = requireRecord(definition.autonomy, "autonomy", issues);
  if (autonomy) {
    requireEnum(
      autonomy.default_power_level,
      POWER_LEVELS,
      "autonomy.default_power_level",
      issues,
    );
    requireBoolean(autonomy.exec_allowed, "autonomy.exec_allowed", issues);
  }

  const spawn = requireRecord(definition.spawn, "spawn", issues);
  if (spawn) {
    requireBoolean(spawn.can_spawn, "spawn.can_spawn", issues);
    requireStringArray(spawn.spawnable_by, "spawn.spawnable_by", issues);
  }

  const clients = requireRecord(definition.clients, "clients", issues);
  if (clients) {
    validateOptionalClient(clients, "openclaw", "workspace_prefix", "string", issues);
    validateOptionalClient(clients, "copilot", "agent_file", "boolean", issues);
    validateOptionalClient(clients, "claude", "include_in_instructions", "boolean", issues);
    validateOptionalClient(clients, "codex", "include_in_agents_md", "boolean", issues);
  }

  if (issues.length > 0) throw new AgentConfigValidationError(source, issues);
  return definition as unknown as AgentDefinition;
}

export function validateAgentRoster(value: unknown, source: string): AgentRoster {
  const issues: string[] = [];
  const parsed = requireRecord(value, "roster", issues);
  if (!parsed) throw new AgentConfigValidationError(source, issues);

  const version = parsed.schema_version;
  if (!Number.isInteger(version)) {
    throw new AgentConfigValidationError(source, [
      "schema_version must be an integer; run \"spell agents init\" with a compatible Arcane CLI",
    ]);
  }
  if ((version as number) > CURRENT_ROSTER_SCHEMA_VERSION) {
    throw new AgentConfigValidationError(source, [
      `schema_version ${version} is newer than supported version ${CURRENT_ROSTER_SCHEMA_VERSION}; upgrade Arcane before reading this roster`,
    ]);
  }
  if ((version as number) < 1) {
    throw new AgentConfigValidationError(source, [
      `schema_version ${version} is unsupported; supported versions are 1 and ${CURRENT_ROSTER_SCHEMA_VERSION}`,
    ]);
  }

  const roster = version === 1
    ? { ...parsed, schema_version: CURRENT_ROSTER_SCHEMA_VERSION }
    : parsed;
  requireEnum(roster.naming_strategy, NAMING_STRATEGIES, "naming_strategy", issues);
  requireEnum(roster.agent_profile, AGENT_PROFILES, "agent_profile", issues);

  const openclaw = requireRecord(roster.openclaw, "openclaw", issues);
  if (openclaw) {
    requireBoolean(openclaw.enabled, "openclaw.enabled", issues);
    requireString(openclaw.workspace_root, "openclaw.workspace_root", issues);
  }

  if (!Array.isArray(roster.roster)) {
    issues.push("roster must be an array");
  } else {
    roster.roster.forEach((entry, index) => {
      const item = requireRecord(entry, `roster[${index}]`, issues);
      if (!item) return;
      requireString(item.definition, `roster[${index}].definition`, issues);
      if (item.name !== null) requireString(item.name, `roster[${index}].name`, issues);
      requireString(item.id, `roster[${index}].id`, issues);
      if (item.epithet !== undefined) requireString(item.epithet, `roster[${index}].epithet`, issues);
    });
  }

  if (issues.length > 0) throw new AgentConfigValidationError(source, issues);
  return roster as unknown as AgentRoster;
}