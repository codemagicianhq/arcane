import { select, confirm } from "@inquirer/prompts";
import { join } from "node:path";
import chalk from "chalk";
import { copyFile, copyDirectory } from "../modules/copier.js";
import {
  readManifest,
  writeManifest,
  ManifestNotFoundError,
} from "../modules/manifest.js";
import { getProfile, listProfiles } from "../modules/registry.js";
import {
  printDryRun,
  printStep,
  printSuccess,
  printSection,
  printInfo,
  printNextStep,
  printWarning,
} from "../modules/banner.js";
import { runAgentsInit } from "../modules/agents.js";
import { countUncommittedChanges } from "../modules/git.js";
import type {
  ArcaneManifest,
  InstalledComponent,
  Profile,
  RegistryComponent,
  SpellInitOptions,
} from "../types.js";

const VALID_PROFILES: Profile[] = ["full", "lite", "governance-only", "methodology"];

// ─── Category labels for preview ─────────────────────────────────────────────

interface ComponentGroup {
  icon: string;
  label: string;
  count: number;
}

function categorizeComponents(components: RegistryComponent[]): ComponentGroup[] {
  const groups: ComponentGroup[] = [];

  const prompts = components.find((c) => c.name === "spell-prompts");
  if (prompts) {
    groups.push({
      icon: "✨",
      label: "Copilot Spells",
      count: prompts.files.length,
    });
  }

  const claude = components.find((c) => c.name === "claude-commands");
  if (claude) {
    groups.push({
      icon: "⚡",
      label: "Claude Spells",
      count: claude.files.length,
    });
  }

  const governance = components.filter(
    (c) =>
      c.name !== "spell-prompts" &&
      c.name !== "claude-commands" &&
      c.name !== "venture-template" &&
      c.name !== "agent-definitions" &&
      c.files.some((f) => f.startsWith(".arcane/governance/")),
  );
  if (governance.length > 0) {
    groups.push({
      icon: "📋",
      label: "Governance Docs",
      count: governance.reduce((n, c) => n + c.files.length, 0),
    });
  }

  const agentDef = components.find((c) => c.name === "agent-definitions");
  if (agentDef) {
    groups.push({
      icon: "🛡️",
      label: "Agent Policies",
      count: agentDef.files.length,
    });
  }

  const templates = components.find((c) => c.name === "venture-template");
  if (templates) {
    groups.push({
      icon: "📄",
      label: "Templates",
      count: templates.files.length,
    });
  }

  return groups;
}

/**
 * Builds a hover description string for the profile selection menu.
 * Shows the category breakdown so users know what they're getting.
 */
function buildProfileDescription(components: RegistryComponent[], profile: Profile): string {
  const groups = categorizeComponents(components);
  const parts = groups.map((g) => `${g.icon} ${g.count} ${g.label}`);
  if (profile === "full" || profile === "lite") {
    // Insert agent roles before governance docs (spells + agents first, then the rest)
    const govIndex = groups.findIndex((g) => g.label === "Governance Docs");
    parts.splice(govIndex >= 0 ? govIndex : parts.length, 0, "🤖 12 Agent Roles");
  }
  return "\n" + parts.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Runs the `spell init` command.
 *
 * @param options  CLI flags (profile, force, dryRun)
 * @param targetDir  Directory to initialize (defaults to cwd in CLI)
 * @param assetsDir  Path to the bundled assets root (dist/assets/ in prod, src/assets/ in tests)
 * @param packageVersion  Current package version string (passed from CLI entry to avoid require path issues)
 */
export async function runInit(
  options: SpellInitOptions,
  targetDir: string,
  assetsDir: string,
  packageVersion: string,
): Promise<void> {
  // Validate profile option if provided
  if (options.profile && !VALID_PROFILES.includes(options.profile)) {
    throw new Error(
      `Invalid profile "${options.profile}". Valid options: ${VALID_PROFILES.join(", ")}`,
    );
  }

  // Check if already initialized
  try {
    await readManifest(targetDir);
    console.log(chalk.hex("#a855f7")(`\n  ✦ Arcane v${packageVersion}\n`));
    console.log('Already initialized. Run "spell update" to update existing files.');
    return;
  } catch (err) {
    if (!(err instanceof ManifestNotFoundError)) throw err;
    // ManifestNotFoundError = not initialized — proceed
  }

  console.log(chalk.hex("#a855f7")(`\n  ✦ Arcane v${packageVersion}\n`));

  // ── Safety check: warn about uncommitted changes ───────────────────────
  if (!options.dryRun) {
    const dirtyCount = await countUncommittedChanges(targetDir);
    if (dirtyCount > 0) {
      printWarning(`This repo has ${dirtyCount} uncommitted change${dirtyCount === 1 ? "" : "s"}.`);
      printInfo("Running spell init will add new files to your working tree.");
      console.log();
      const continueAnyway = await confirm({
        message: "Continue anyway?",
        default: true,
      });
      if (!continueAnyway) {
        console.log("\nCancelled. Commit or stash your changes first.");
        return;
      }
      console.log();
    }
  }

  // ── Step 1: Resolve profile (prompt if not provided) ───────────────────
  let profile: Profile = options.profile as Profile;
  if (!profile) {
    const profiles = listProfiles();
    profile = (await select({
      message: "Select an installation profile:\n",
      choices: profiles.map((p) => {
        const profileComponents = getProfile(p.id);
        return {
          value: p.id,
          name: `${p.id === "full" ? "🧙" : p.id === "lite" ? "⚡" : "📋"}  ${p.displayName} — ${p.description}`,
          description: buildProfileDescription(profileComponents, p.id),
        };
      }),
    })) as Profile;
  }

  // ── Step 2: Resolve components ─────────────────────────────────────────
  const components = getProfile(profile);

  // ── Step 3: Preview what will be installed ─────────────────────────────
  const groups = categorizeComponents(components);

  console.log();
  printSection(`📦 Profile: ${profile}`);
  console.log();

  // Show agent setup as upcoming interactive step
  const hasAgents = profile === "full" || profile === "lite";

  // Build summary parts (same style as hover description)
  const previewParts = groups.map((g) => `${g.icon} ${g.count} ${g.label}`);
  if (hasAgents) {
    // Insert agent roles before governance docs
    const govIndex = groups.findIndex((g) => g.label === "Governance Docs");
    previewParts.splice(govIndex >= 0 ? govIndex : previewParts.length, 0, "🤖 12 Agent Roles");
  }
  console.log(`  ${previewParts.join(" · ")}`);

  console.log();

  // ── Step 4: Confirm (skip in non-interactive mode) ─────────────────────
  if (!options.dryRun && !options.profile) {
    const proceed = await confirm({
      message: "Proceed with installation?",
      default: true,
    });
    if (!proceed) {
      console.log("\nCancelled.");
      return;
    }
  }

  // ── Step 5: Copy files ─────────────────────────────────────────────────
  const installedComponents: InstalledComponent[] = [];
  let fileCount = 0;

  for (const component of components) {
    const installedFiles: string[] = [];

    for (const file of component.files) {
      const srcPath = join(assetsDir, file);
      if (options.dryRun) {
        printDryRun(`Would copy: ${file}`);
      } else {
        try {
          await copyFile(srcPath, targetDir, file, { force: options.force });
        } catch (err) {
          // skipExisting components silently skip files that already exist
          if (component.skipExisting && err instanceof Error && err.message.includes("already exists")) {
            continue;
          }
          throw err;
        }
      }
      installedFiles.push(file);
      fileCount++;
    }

    for (const dir of component.directories ?? []) {
      const srcDirPath = join(assetsDir, dir);
      if (options.dryRun) {
        printDryRun(`Would copy directory: ${dir}/`);
      } else {
        const copied = await copyDirectory(srcDirPath, targetDir, dir, { force: options.force });
        installedFiles.push(...copied);
        fileCount += copied.length;
      }
    }

    if (!options.dryRun) {
      installedComponents.push({
        name: component.name,
        files: installedFiles,
        installedVersion: packageVersion,
      });
    }
  }

  // Show compact category summary (not 60 individual file paths)
  if (!options.dryRun) {
    for (const group of groups) {
      printStep(`${group.icon} ${group.count} ${group.label}`);
    }
  }

  if (options.dryRun) {
    // Show what agent setup would install
    if (hasAgents) {
      const agentFiles = await import("node:fs").then((fsModule) =>
        fsModule.promises.readdir(join(assetsDir, "agents")),
      );
      const yamlFiles = agentFiles.filter((f) => f.endsWith(".yaml")).sort();
      printDryRun("Would run agent setup (interactive):");
      printDryRun("Would write: .arcane/agents.yaml");
      for (const f of yamlFiles) {
        printDryRun(`Would copy: .arcane/agents/${f}`);
      }
    }
    printDryRun(`Would initialize with profile "${profile}" — ${fileCount} files`);
    return;
  }

  // ── Step 6: Write manifest ─────────────────────────────────────────────
  const manifest: ArcaneManifest = {
    version: packageVersion,
    profile,
    installedAt: new Date().toISOString(),
    components: installedComponents,
  };
  await writeManifest(targetDir, manifest);

  printSuccess(`Initialized with profile "${profile}" — ${fileCount} files installed`);

  // ── Step 7: Offer agent setup (for full and lite profiles) ─────────────
  let agentsConfigured = false;
  if (hasAgents && !options.profile) {
    console.log();
    const setupAgents = await confirm({
      message: "🤖 Set up your agent team? (names, roles, AI tool configs)",
      default: true,
    });

    if (setupAgents) {
      await runAgentsInit({}, targetDir, assetsDir);
      agentsConfigured = true;
    }
  }

  // ── Step 8: Print next steps ───────────────────────────────────────────
  console.log();
  printSection("🚀 Next steps");
  console.log();
  let step = 1;

  if (!agentsConfigured && profile !== "governance-only") {
    printNextStep(step++, "Run `spell agents init` to set up your agent team");
  }
  if (agentsConfigured) {
    printNextStep(
      step++,
      "Edit .arcane/agents.yaml to customize roles → `spell agents sync` to regenerate AI tool configs",
    );
  }
  if (profile !== "governance-only") {
    printNextStep(
      step++,
      "Review .arcane/governance/ docs and customize for your project",
    );
  }
  printNextStep(
    step++,
    "Commit the new files: git add .arcane .github .claude AGENTS.md CLAUDE.md .arcane.json",
  );
  console.log();
}
