/**
 * Agent generator — multi-client fan-out engine.
 *
 * Reads canonical agent definitions and an agent roster, then generates
 * client-specific instruction files for each enabled AI client:
 *   - OpenClaw: IDENTITY.md, SOUL.md, TOOLS.md per agent workspace
 *   - Copilot:  .github/agents/{name}.agent.md per agent
 *   - Claude:   CLAUDE.md  ← arcane marker merge
 *   - Codex:    AGENTS.md  ← arcane marker merge
 *
 * Each L1 merge (CLAUDE.md, AGENTS.md, .github/copilot-instructions.md) also
 * injects a static intent→spell routing table ahead of the roster table,
 * independent of whether any roster entries resolved — the routing guidance
 * ("if a spell exists for this workflow, invoke it") applies with or without
 * agent personas configured.
 *
 * NOTE: openclaw.json is NEVER modified directly — a patch file is generated
 * at .arcane/generated/openclaw-roster.json for the user to apply manually.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type {
  AgentDefinition,
  AgentRoster,
  AgentRosterEntry,
  AgentSyncOptions,
} from "../types.js";
import { mergeIntoFile } from "./merger.js";
import { loadAgentDefinition, projectAgentsDir } from "./agent-loader.js";

// ─── Resolved entry (definition + roster entry joined) ───────────────────────

interface ResolvedEntry {
  entry: AgentRosterEntry;
  def: AgentDefinition;
  displayName: string;
}

// ─── Content renderers ───────────────────────────────────────────────────────

function renderIdentity(def: AgentDefinition, name: string): string {
  const mottosLine =
    def.persona.catchphrases && def.persona.catchphrases.length > 0
      ? `\n## Mottos\n\n${def.persona.catchphrases.map((c) => `- "${c}"`).join("\n")}\n`
      : "";
  return `# ${name} — ${def.role}

## Role

${def.persona.description.trim()}

## Category

${def.category}
${mottosLine}`;
}

function renderSoul(def: AgentDefinition, name: string): string {
  const rules = def.persona.behavioral_rules.map((r) => `- ${r}`).join("\n");
  return `# ${name} — Behavioral Directives

## Rules

${rules}

## Autonomy

- **Default Power Level:** ${def.autonomy.default_power_level}
- **Exec Allowed:** ${def.autonomy.exec_allowed ? "Yes" : "No"}
`;
}

function renderTools(def: AgentDefinition, name: string): string {
  const allowed = def.tools.allowed.map((t) => `- \`${t}\``).join("\n");
  const denied = def.tools.denied.map((t) => `- \`${t}\``).join("\n");
  return `# ${name} — Tool Capabilities

## Allowed

${allowed}

## Denied

${denied}
`;
}

export function renderCopilotAgent(def: AgentDefinition, name: string): string {
  const firstLine = def.persona.description.split("\n")[0]?.trim() ?? def.role;
  const rules = def.persona.behavioral_rules.map((r) => `- ${r}`).join("\n");
  const personalityBlock = def.persona.personality
    ? `\n## Personality\n\n${def.persona.personality.trim()}\n`
    : "";
  const voiceBlock = def.persona.voice
    ? `\n## Voice\n\n${def.persona.voice.trim()}\n`
    : "";
  const mottosBlock =
    def.persona.catchphrases && def.persona.catchphrases.length > 0
      ? `\n## Mottos\n\n${def.persona.catchphrases.map((c) => `- "${c}"`).join("\n")}\n`
      : "";
  return `---
name: ${name}
description: ${def.role} — ${firstLine}
---
${mottosBlock}
## Role

${def.persona.description.trim()}
${personalityBlock}${voiceBlock}
## Behavioral Rules

${rules}

## Tools

**Allowed:** ${def.tools.allowed.join(", ")}
**Denied:** ${def.tools.denied.join(", ")}
`;
}

function renderSpellRoutingSection(): string {
  return `## Spell Routing

| When you're about to... | Invoke |
|---|---|
| Commit work | \`spell-commit-work\` |
| Open a session | \`spell-open-session\` |
| Close a session | \`spell-close-session\` |
| Open a pull request | \`spell-create-pull-request\` |
| Ship a feature end-to-end | \`spell-full-cycle\` |
| Fix a bug | \`spell-bug\` |
| Review code or a PR | \`spell-review\` |

If a spell exists for the workflow you are about to perform, invoke it — do not improvise the workflow from general knowledge, even when the user doesn't name the spell.
`;
}

function renderAgentRosterSection(entries: ResolvedEntry[]): string {
  const rows = entries
    .map(({ def, displayName }) =>
      `| **${displayName}** | ${def.role} | ${def.category} |`,
    )
    .join("\n");

  return `## Agent Roster

| Agent | Role | Category |
|-------|------|----------|
${rows}
`;
}

// ─── Sync result ─────────────────────────────────────────────────────────────

export interface SyncResult {
  synced: string[];
  skipped: string[];
  /**
   * True when a rostered role's definition could not be loaded from either
   * the project or bundled source (the mobile-dev bug class: a malformed
   * template silently dropped from the roster with a zero exit code).
   * Distinct from an openclaw-workspace write failure, which is an I/O
   * problem, not a role-resolution failure, and does not set this.
   */
  hasUnresolvedRoles: boolean;
}

// ─── Main sync function ───────────────────────────────────────────────────────

/**
 * Generates all client-specific output files from the agent roster and definitions.
 *
 * @param targetDir   Root of the consuming repo (where .arcane/ lives)
 * @param assetsDir   Path to bundled assets (used as fallback for definitions not yet in project)
 * @param roster      Parsed agent roster (from .arcane/agents.yaml)
 * @param options     Sync options (dry-run, client filters)
 */
export async function syncAgents(
  targetDir: string,
  assetsDir: string,
  roster: AgentRoster,
  options: AgentSyncOptions = {},
): Promise<SyncResult> {
  const synced: string[] = [];
  const skipped: string[] = [];
  let hasUnresolvedRoles = false;

  // ── Load all definitions ──────────────────────────────────────────────────
  const projectDefs = projectAgentsDir(targetDir);
  const bundledDefs = join(assetsDir, "agents");

  const resolved: ResolvedEntry[] = [];
  for (const entry of roster.roster) {
    let def: AgentDefinition;
    try {
      // Prefer the project's customized version
      def = await loadAgentDefinition(projectDefs, entry.definition);
    } catch {
      try {
        // Fall back to bundled template
        def = await loadAgentDefinition(bundledDefs, entry.definition);
      } catch {
        skipped.push(`${entry.definition} (definition not found)`);
        hasUnresolvedRoles = true;
        continue;
      }
    }
    resolved.push({
      entry,
      def,
      displayName: entry.name ?? entry.definition,
    });
  }

  // ── OpenClaw output ──────────────────────────────────────────────────────
  if (roster.openclaw.enabled && options.openclaw !== false) {
    const openclawRoot = roster.openclaw.workspace_root.replace(
      /^~/,
      homedir(),
    );

    for (const { entry, def, displayName } of resolved) {
      if (!def.clients.openclaw) continue;

      const workspaceName =
        entry.id === "main" ? "workspace" : `workspace-${entry.id}`;
      const workspaceDir = join(openclawRoot, workspaceName);

      try {
        if (!options.dryRun) {
          await mkdir(workspaceDir, { recursive: true });
          await writeFile(
            join(workspaceDir, "IDENTITY.md"),
            renderIdentity(def, displayName),
            "utf8",
          );
          await writeFile(
            join(workspaceDir, "SOUL.md"),
            renderSoul(def, displayName),
            "utf8",
          );
          await writeFile(
            join(workspaceDir, "TOOLS.md"),
            renderTools(def, displayName),
            "utf8",
          );
        } else {
          console.log(`  [dry-run] Would write: ${workspaceDir}/IDENTITY.md`);
          console.log(`  [dry-run] Would write: ${workspaceDir}/SOUL.md`);
          console.log(`  [dry-run] Would write: ${workspaceDir}/TOOLS.md`);
        }
        synced.push(`openclaw:${entry.id}:IDENTITY+SOUL+TOOLS`);
      } catch {
        skipped.push(`openclaw:${entry.id} (workspace not accessible)`);
      }
    }

    // Generate openclaw-roster.json patch — never modifies openclaw.json directly
    const patch = {
      $comment:
        "Apply this to your openclaw.json agents section. " +
        "Do not edit manually — regenerated by `spell agents sync`.",
      agents: resolved.map(({ entry, def }) => ({
        id: entry.id,
        identity: {
          name: entry.name ?? entry.definition,
          ...(entry.epithet ? { epithet: entry.epithet } : {}),
          role: def.role,
        },
      })),
    };

    const generatedDir = join(targetDir, ".arcane", "generated");
    if (!options.dryRun) {
      await mkdir(generatedDir, { recursive: true });
      await writeFile(
        join(generatedDir, "openclaw-roster.json"),
        JSON.stringify(patch, null, 2) + "\n",
        "utf8",
      );
    } else {
      console.log(
        "  [dry-run] Would write: .arcane/generated/openclaw-roster.json",
      );
    }
    synced.push("openclaw-roster.json");
  }

  // ── Copilot output ───────────────────────────────────────────────────────
  if (options.copilot !== false) {
    const agentsDir = join(targetDir, ".github", "agents");

    if (!options.dryRun) {
      await mkdir(agentsDir, { recursive: true });
    }

    for (const { def, displayName } of resolved) {
      if (!def.clients.copilot?.agent_file) continue;
      // Slugify: lowercase, spaces → hyphens (e.g. "QA Lead" → "qa-lead.agent.md")
      const slug = displayName.toLowerCase().replace(/\s+/g, "-");
      const fileName = `${slug}.agent.md`;
      if (!options.dryRun) {
        await writeFile(
          join(agentsDir, fileName),
          renderCopilotAgent(def, displayName),
          "utf8",
        );
      } else {
        console.log(`  [dry-run] Would write: .github/agents/${fileName}`);
      }
      synced.push(`.github/agents/${fileName}`);
    }

    // Merge spell routing + roster into copilot-instructions.md
    const copilotSection = `${renderSpellRoutingSection()}\n${renderAgentRosterSection(resolved)}`;
    const copilotMerged = await mergeIntoFile(
      targetDir,
      ".github/copilot-instructions.md",
      copilotSection,
      { force: true, dryRun: options.dryRun },
    );
    if (copilotMerged)
      synced.push(".github/copilot-instructions.md (agents section)");
  }

  // ── Claude output ────────────────────────────────────────────────────────
  if (options.claude !== false) {
    const claudeSection = `${renderSpellRoutingSection()}\n${renderAgentRosterSection(resolved)}`;
    const claudeMerged = await mergeIntoFile(
      targetDir,
      "CLAUDE.md",
      claudeSection,
      { force: true, dryRun: options.dryRun },
    );
    if (claudeMerged) synced.push("CLAUDE.md (agents section)");
  }

  // ── Codex output ─────────────────────────────────────────────────────────
  if (options.codex !== false) {
    const codexSection = `${renderSpellRoutingSection()}\n${renderAgentRosterSection(resolved)}`;
    const codexMerged = await mergeIntoFile(
      targetDir,
      "AGENTS.md",
      codexSection,
      { force: true, dryRun: options.dryRun },
    );
    if (codexMerged) synced.push("AGENTS.md (agents section)");
  }

  return { synced, skipped, hasUnresolvedRoles };
}
