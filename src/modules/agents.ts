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
import { dirname, join } from "node:path";
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
  agentsBaseDir,
  loadRoster,
  rosterExists,
  AgentConfigValidationError,
  AgentRosterNotFoundError,
} from "./agent-loader.js";
import { syncAgents } from "./agent-generator.js";
import { printStep, printSuccess } from "./banner.js";
import { readManifest, writeManifest } from "./manifest.js";
import {
  effectiveSpellScope,
  describeFanoutOutcomes,
  syncUserTierFanout,
  userTierRoot,
} from "./user-tier.js";
import type { ArcaneManifest, InstallScope } from "../types.js";

/**
 * Where a run of `spell agents <sub>` operates: this repository, or the user
 * tier's store at `~/.arcane` (CS-06 / ARC-047 decision 2). The store is the
 * same one `spell init --user` creates -- the roster and its definition files
 * sit beside the spells, in the same two paths a repository uses.
 */
export function agentsTargetDir(scope: InstallScope | undefined, cwd: string): string {
  return scope === "user" ? userTierRoot() : cwd;
}

/**
 * The user tier's store manifest, or a message saying how to create one.
 * `spell agents --user` writes into the store `spell init --user` owns and
 * records its fan-out in that manifest, so the store has to exist first --
 * there is deliberately no second, agents-only store shape to reason about.
 */
async function requireUserStore(storeRoot: string): Promise<ArcaneManifest> {
  try {
    return await readManifest(storeRoot);
  } catch {
    console.error(
      `\n  ✗ No user tier at ${storeRoot}.\n` +
        "    Run `spell init --user` once to create it, then re-run this command.\n",
    );
    process.exit(1);
    throw new Error("unreachable");
  }
}

/**
 * This repository's `spell_scope`, for a repo-tier run. A repository with no
 * manifest at all is a plain directory as far as agents are concerned, and
 * takes the default.
 */
async function repoSpellScope(targetDir: string): Promise<InstallScope> {
  try {
    return effectiveSpellScope(await readManifest(targetDir));
  } catch {
    return "repo";
  }
}

/**
 * Runs `syncAgents` for either tier and finishes what the tier needs.
 *
 * A repository run is unchanged. A user-tier run gets its rendered agent
 * files reconciled through the same fan-out machinery CS-04 built for spells
 * -- hash-recorded in the store manifest, so an operator's edit to one of
 * them is recognized and never overwritten or deleted -- scoped to the agent
 * client so `spell update --user` and this command can share one record
 * without either erasing the other's entries.
 */
async function performAgentSync(
  targetDir: string,
  assetsDir: string,
  roster: AgentRoster,
  options: AgentSyncOptions,
): Promise<{ synced: string[]; skipped: string[]; hasUnresolvedRoles: boolean }> {
  const scope: InstallScope = options.scope ?? "repo";
  const spellScope = scope === "user" ? undefined : await repoSpellScope(targetDir);
  const result = await syncAgents(targetDir, assetsDir, roster, {
    ...options,
    scope,
    ...(spellScope === undefined ? {} : { spellScope }),
  });

  if (scope === "user") {
    const manifest = await requireUserStore(targetDir);
    // The store root IS `<home>/.arcane` (userTierRoot), so the home the
    // fan-out paths are relative to is its parent. Derived rather than read
    // from the environment a second time: one source of truth per run, and a
    // test can point the whole thing at a temporary home by passing a store
    // root inside it.
    const fanout = await syncUserTierFanout({
      homeDir: dirname(targetDir),
      storeRoot: targetDir,
      spellIds: [],
      extraFiles: result.userAgentFiles,
      ownedClients: ["copilot-agents"],
      previous: manifest.fanout,
      dryRun: options.dryRun,
      fallbackDir: assetsDir,
    });
    for (const line of describeFanoutOutcomes(fanout.outcomes, options.dryRun)) {
      console.log(`  ${line}`);
    }
    if (!options.dryRun) {
      await writeManifest(targetDir, { ...manifest, fanout: fanout.record });
    }
  }

  if (result.unmanagedAgentFiles.length > 0) {
    console.log(
      `\n  ! This repository takes its spells from the user tier (spell_scope: "user"), so it no\n` +
        `    longer receives agent files of its own. ${result.unmanagedAgentFiles.length} are still on disk\n` +
        `    from before the opt-out. Nothing here deletes them -- no component ever tracked\n` +
        `    them, so there is no recorded hash to prove one untouched. Remove them yourself:\n`,
    );
    for (const file of result.unmanagedAgentFiles) console.log(`      ${file}`);
    console.log(`\n      git rm ${result.unmanagedAgentFiles.join(" ")}\n`);
  }

  return result;
}


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
  const scope: InstallScope = options.scope ?? "repo";
  // Before anything is written: the user tier's roster lives in the store
  // `spell init --user` owns, and its fan-out is recorded in that store's
  // manifest. Checking after the roster is written would leave a half-built
  // tier behind on the way to the same error.
  if (scope === "user") await requireUserStore(targetDir);
  const baseDir = agentsBaseDir(targetDir, scope);
  const label = scope === "user" ? "~/.arcane" : ".arcane";
  if (!options.force && (await rosterExists(targetDir, scope))) {
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
  let namingStrategy: NamingStrategy = options.naming ?? "arcanos";
  if (!options.naming) {
    console.log();
    namingStrategy = (await select({
      message: "Choose a naming strategy for your agents:",
      choices: [
        {
          value: "arcanos" as NamingStrategy,
          name: "🃏  Arcanos",
          description: "\nPersona names: Kellar, Merlin, Lafayette, Lince, Prospero...",
        },
        {
          value: "generic" as NamingStrategy,
          name: "🏷️  Generic",
          description: "\nRole-derived labels: Orchestrator, Architect, Developer, QA Lead...",
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
  const rosterEntries: AgentRosterEntry[] = named.map(({ definition, name, epithet }) => {
    // Orchestrator gets the "main" OpenClaw ID by convention
    const id = definition === "orchestrator" ? "main" : name.toLowerCase().replace(/\s+/g, "-");
    return epithet ? { definition, name, id, epithet } : { definition, name, id };
  });

  const roster: AgentRoster = {
    schema_version: 2,
    naming_strategy: namingStrategy,
    agent_profile: profileId,
    openclaw: {
      enabled: true,
      workspace_root: "~/.openclaw",
    },
    roster: rosterEntries,
  };

  // ── Step 5: Write .arcane/agents.yaml ────────────────────────────────────
  const arcaneDir = join(baseDir, "agents");
  if (!options.dryRun) {
    await mkdir(arcaneDir, { recursive: true });
    await writeFile(join(baseDir, "agents.yaml"), stringify(roster), "utf8");
  } else {
    console.log(`  [dry-run] Would write: ${label}/agents.yaml`);
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
      console.log(`  [dry-run] Would copy: ${label}/agents/${roleId}.yaml`);
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
  const { synced, skipped, hasUnresolvedRoles } = await performAgentSync(
    targetDir,
    assetsDir,
    roster,
    { dryRun: false, scope },
  );

  printSuccess("Agent roster initialized");
  console.log(`    📋 Profile: ${profileId} · Naming: ${namingStrategy} · Agents: ${rosterEntries.length}`);
  console.log(
    `    🔄 Synced: ${synced.length} outputs (${scope === "user" ? "Copilot agent modes in ~/.copilot/agents" : "Copilot, Claude, Codex, OpenClaw"})`,
  );
  if (skipped.length > 0) {
    console.log(`    ⚠️  Skipped: ${skipped.length} (${skipped.join(", ")})`);
  }
  console.log();
  console.log(
    `    💡 Customize: edit ${label}/agents.yaml → spell agents sync${scope === "user" ? " --user" : ""}`,
  );
  console.log();
  if (hasUnresolvedRoles) {
    console.error(
      "  ✗ One or more rostered roles could not be resolved (see \"Skipped\" above) — " +
        "a malformed or missing agent template must not pass silently.",
    );
    process.exitCode = 1;
  }
}

// ─── spell agents sync ────────────────────────────────────────────────────────

/** Regenerates all client instruction files from the current roster + definitions. */
export async function runAgentsSync(
  options: AgentSyncOptions,
  targetDir: string,
  assetsDir: string,
): Promise<void> {
  const scope: InstallScope = options.scope ?? "repo";
  let roster: AgentRoster;
  try {
    roster = await loadRoster(targetDir, scope);
  } catch (err) {
    if (
      err instanceof AgentRosterNotFoundError
      || err instanceof AgentConfigValidationError
    ) {
      console.error(err.message);
      process.exit(1);
      return;
    }
    throw err;
  }

  if (options.dryRun) {
    console.log("\n  [dry-run] Would sync agents from roster:\n");
  } else {
    console.log("\n  Syncing agents...\n");
  }

  const { synced, skipped, hasUnresolvedRoles } = await performAgentSync(
    targetDir,
    assetsDir,
    roster,
    { ...options, scope },
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
  if (hasUnresolvedRoles) {
    console.error(
      "  ✗ One or more rostered roles could not be resolved (see \"Skipped\" above) — " +
        "a malformed or missing agent template must not pass silently.",
    );
    process.exitCode = 1;
  }
}

// ─── spell agents list ────────────────────────────────────────────────────────

/** Displays the current agent roster in a table. */
export async function runAgentsList(
  targetDir: string,
  scope: InstallScope = "repo",
): Promise<void> {
  let roster: AgentRoster;
  try {
    roster = await loadRoster(targetDir, scope);
  } catch (err) {
    if (
      err instanceof AgentRosterNotFoundError
      || err instanceof AgentConfigValidationError
    ) {
      console.error(err.message);
      process.exit(1);
      return;
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
