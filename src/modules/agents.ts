/**
 * `spell agents` subcommand group.
 *
 * Subcommands:
 *   spell agents init   — Interactive roster setup (naming strategy + role selection)
 *   spell agents sync   — Regenerate all client instruction files from canonical defs
 *   spell agents list   — Show current roster with assigned names and roles
 */

import { select, checkbox, Separator } from "@inquirer/prompts";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import type {
  AgentInitOptions,
  AgentRoster,
  AgentRosterEntry,
  AgentSyncOptions,
  NamingStrategy,
  AgentProfileId,
} from "../types.js";
import { AGENT_ROLES } from "../config/agent-roles.js";
import {
  AGENT_PROFILE_CONFIGS,
  getAgentProfileConfig,
} from "../config/agent-profiles.js";
import { applyNamingStrategy } from "./naming.js";
import {
  loadRoster,
  rosterExists,
  AgentRosterNotFoundError,
} from "./agent-loader.js";
import { syncAgents } from "./agent-generator.js";
import { printStep, printSuccess } from "./banner.js";

// ─── spell agents init ────────────────────────────────────────────────────────

/**
 * Interactive agent roster setup.
 *
 * 1. Prompts for agent profile (base | full | custom)
 * 2. Prompts for naming strategy (generic | random | custom)
 * 3. Applies naming and writes .arcane/agents.yaml + copies definition files
 */
export async function runAgentsInit(
  options: AgentInitOptions,
  targetDir: string,
  assetsDir: string,
): Promise<void> {
  // Check for existing roster
  if (!options.force && (await rosterExists(targetDir))) {
    console.log(
      'Agent roster already exists at .arcane/agents.yaml. ' +
      'Run "spell agents sync" to regenerate outputs, or use --force to reinitialize.',
    );
    return;
  }

  console.log();

  // ── Step 1: Agent profile ────────────────────────────────────────────────
  let profileId: AgentProfileId = options.profile ?? "full";
  if (!options.profile) {
    const baseRoles = getAgentProfileConfig("base").roles;
    const baseRoleNames = baseRoles.map((id) => {
      const role = AGENT_ROLES.find((r) => r.id === id);
      return role ? role.role : id;
    });
    const allCategories = [...new Set(AGENT_ROLES.map((r) => r.category))];

    profileId = (await select({
      message: "Select an agent profile:",
      choices: AGENT_PROFILE_CONFIGS.map((p) => ({
        value: p.id,
        name: `${p.id === "base" ? "🎯" : p.id === "full" ? "🧙" : "🎨"}  ${p.displayName}`,
        description:
          p.id === "base"
            ? `\n4 core roles: ${baseRoleNames.join(", ")}`
            : p.id === "full"
              ? `\nAll 12 roles across ${allCategories.join(", ")}`
              : "\nPick individual roles from the full roster",
      })),
    })) as AgentProfileId;
  }

  // Resolve role IDs for selected profile
  let selectedRoleIds: string[];
  if (profileId === "custom") {
    // Group roles by category with separators
    const categories = [...new Set(AGENT_ROLES.map((r) => r.category))];
    const choicesWithSeparators: Array<
      | { value: string; name: string; checked: boolean }
      | Separator
    > = [];
    for (const cat of categories) {
      choicesWithSeparators.push(new Separator(`── ${cat.charAt(0).toUpperCase() + cat.slice(1)} ──`));
      for (const r of AGENT_ROLES.filter((r) => r.category === cat)) {
        choicesWithSeparators.push({
          value: r.id,
          name: `${r.id} — ${r.role}`,
          checked: true,
        });
      }
    }

    console.log();
    selectedRoleIds = await checkbox({
      message: "Select roles to install:",
      choices: choicesWithSeparators,
      validate: (choices) =>
        choices.length > 0 ? true : "Select at least one role",
    });
  } else {
    selectedRoleIds = getAgentProfileConfig(profileId).roles;
  }

  // ── Step 2: Naming strategy ──────────────────────────────────────────────
  let namingStrategy: NamingStrategy = options.naming ?? "generic";
  if (!options.naming) {
    console.log();
    namingStrategy = (await select({
      message: "Choose a naming strategy for your agents:",
      choices: [
        {
          value: "generic" as NamingStrategy,
          name: "🏷️  Generic",
          description: "\nRole-derived labels: Orchestrator, Architect, Developer, QA Lead...",
        },
        {
          value: "codemagician" as NamingStrategy,
          name: "🧙  Code Magician",
          description: "\nPersona names: Primus, Gandalf, Thor, Snape, Scotty...",
        },
        {
          value: "random" as NamingStrategy,
          name: "🎲  Random",
          description: "\nCommon first names shuffled randomly: Blake, Morgan, Casey...",
        },
        {
          value: "custom" as NamingStrategy,
          name: "✏️  Custom",
          description: "\nType a unique name for each role interactively",
        },
      ],
    })) as NamingStrategy;
  }

  // ── Step 3: Apply naming ─────────────────────────────────────────────────
  printStep("Assigning names...");
  const named = await applyNamingStrategy(namingStrategy, selectedRoleIds);

  // ── Step 4: Build roster ─────────────────────────────────────────────────
  const rosterEntries: AgentRosterEntry[] = named.map(({ definition, name }) => {
    // Orchestrator gets the "main" OpenClaw ID by convention
    const id = definition === "orchestrator" ? "main" : name.toLowerCase().replace(/\s+/g, "-");
    return { definition, name, id };
  });

  const roster: AgentRoster = {
    schema_version: 1,
    naming_strategy: namingStrategy,
    agent_profile: profileId,
    openclaw: {
      enabled: true,
      workspace_root: "~/.openclaw",
    },
    roster: rosterEntries,
  };

  // ── Step 5: Write .arcane/agents.yaml ────────────────────────────────────
  const arcaneDir = join(targetDir, ".arcane", "agents");
  if (!options.dryRun) {
    await mkdir(arcaneDir, { recursive: true });
    await writeFile(
      join(targetDir, ".arcane", "agents.yaml"),
      stringify(roster),
      "utf8",
    );
  } else {
    console.log("  [dry-run] Would write: .arcane/agents.yaml");
  }

  // ── Step 6: Copy bundled definition files ─────────────────────────────────
  for (const roleId of selectedRoleIds) {
    const src = join(assetsDir, "agents", `${roleId}.yaml`);
    const dest = join(arcaneDir, `${roleId}.yaml`);
    if (!options.dryRun) {
      try {
        await copyFile(src, dest);
      } catch {
        console.warn(`  ! Could not copy definition for "${roleId}" — skipping`);
      }
    } else {
      console.log(`  [dry-run] Would copy: .arcane/agents/${roleId}.yaml`);
    }
  }

  if (options.dryRun) {
    console.log(
      `\n  [dry-run] Would initialize roster with ${selectedRoleIds.length} agents`,
    );
    return;
  }

  // ── Step 7: Auto-sync all clients ────────────────────────────────────────
  printStep("Syncing agent definitions to all clients...");
  const { synced, skipped } = await syncAgents(
    targetDir,
    assetsDir,
    roster,
    { dryRun: false },
  );

  printSuccess("Agent roster initialized");
  console.log(`    📋 Profile: ${profileId} · Naming: ${namingStrategy} · Agents: ${rosterEntries.length}`);
  console.log(`    🔄 Synced: ${synced.length} outputs (Copilot, Claude, Codex, OpenClaw)`);
  if (skipped.length > 0) {
    console.log(`    ⚠️  Skipped: ${skipped.length} (${skipped.join(", ")})`);
  }
  console.log();
  console.log(`    💡 Customize: edit .arcane/agents.yaml → spell agents sync`);
  console.log();
}

// ─── spell agents sync ────────────────────────────────────────────────────────

/** Regenerates all client instruction files from the current roster + definitions. */
export async function runAgentsSync(
  options: AgentSyncOptions,
  targetDir: string,
  assetsDir: string,
): Promise<void> {
  let roster: AgentRoster;
  try {
    roster = await loadRoster(targetDir);
  } catch (err) {
    if (err instanceof AgentRosterNotFoundError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  if (options.dryRun) {
    console.log("\n  [dry-run] Would sync agents from roster:\n");
  } else {
    console.log("\n  Syncing agents...\n");
  }

  const { synced, skipped } = await syncAgents(
    targetDir,
    assetsDir,
    roster,
    options,
  );

  if (options.dryRun) {
    console.log(`\n  [dry-run] ${synced.length} outputs would be generated`);
    return;
  }

  console.log(`\n  ✓ Synced ${synced.length} outputs`);
  for (const item of synced) {
    console.log(`    + ${item}`);
  }
  if (skipped.length > 0) {
    console.log(`\n  ! Skipped ${skipped.length}:`);
    for (const item of skipped) {
      console.log(`    - ${item}`);
    }
  }
  console.log();
}

// ─── spell agents list ────────────────────────────────────────────────────────

/** Displays the current agent roster in a table. */
export async function runAgentsList(targetDir: string): Promise<void> {
  let roster: AgentRoster;
  try {
    roster = await loadRoster(targetDir);
  } catch (err) {
    if (err instanceof AgentRosterNotFoundError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  const nameWidth = Math.max(
    "Name".length,
    ...roster.roster.map((e) => (e.name ?? e.definition).length),
  );
  const defWidth = Math.max(
    "Role ID".length,
    ...roster.roster.map((e) => e.definition.length),
  );
  const idWidth = Math.max(
    "OpenClaw ID".length,
    ...roster.roster.map((e) => e.id.length),
  );

  const pad = (s: string, n: number) => s.padEnd(n);

  console.log(
    `\n  Profile: ${roster.agent_profile}  |  Naming: ${roster.naming_strategy}  |  Agents: ${roster.roster.length}\n`,
  );
  console.log(
    `  ${pad("Name", nameWidth)}  ${pad("Role ID", defWidth)}  ${pad("OpenClaw ID", idWidth)}`,
  );
  console.log(
    `  ${"-".repeat(nameWidth)}  ${"-".repeat(defWidth)}  ${"-".repeat(idWidth)}`,
  );
  for (const entry of roster.roster) {
    console.log(
      `  ${pad(entry.name ?? "(unnamed)", nameWidth)}  ${pad(entry.definition, defWidth)}  ${pad(entry.id, idWidth)}`,
    );
  }
  console.log();
}
