import { Command } from "commander";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInit } from "./commands/init.js";
import { runAdd } from "./commands/add.js";
import { runUpdate } from "./commands/update.js";
import { runStatus } from "./commands/status.js";
import { runUninstall } from "./commands/uninstall.js";
import { runDoctor } from "./commands/doctor.js";
import { runAgentsInit, runAgentsList, runAgentsSync } from "./modules/agents.js";
import { printWelcome } from "./modules/banner.js";
import type { Profile, AgentInitOptions, AgentProfileId, NamingStrategy, AgentSyncOptions } from "./types.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

/**
 * Resolved path to the bundled assets directory.
 * Points to src/assets/ during tests (vitest runs source directly) and
 * dist/assets/ in the published package (tsup bundles to dist/index.js).
 * Can be overridden via ARCANE_ASSETS_DIR env var for testing the built binary.
 */
export const ASSETS_DIR =
  process.env["ARCANE_ASSETS_DIR"] ??
  join(dirname(fileURLToPath(import.meta.url)), "assets");

const program = new Command();

program
  .name("spell")
  .description("Arcane framework CLI — scaffold and manage governance files")
  .version(pkg.version)
  .action(async () => {
    // Bare `spell` with no subcommand — show the welcome (banner + real repo
    // state + Spell Loop), then the command reference.
    await printWelcome(pkg.version, process.cwd());
    program.outputHelp();
  });

program
  .command("init")
  .description("Scaffold Arcane framework files into the current repository")
  .option("--profile <profile>", "Profile: full | lite | methodology | governance-only")
  .option("--force", "Overwrite existing files without error")
  .option("--dry-run", "Preview what would be installed without making changes")
  .action(
    async (opts: { profile?: string; force?: boolean; dryRun?: boolean }) => {
      await runInit(
        {
          profile: opts.profile as Profile | undefined,
          force: opts.force,
          dryRun: opts.dryRun,
        },
        process.cwd(),
        ASSETS_DIR,
        pkg.version,
      );
    },
  );

program
  .command("add <component>")
  .description("Add a component to an existing Arcane installation")
  .option("--force", "Overwrite existing files without error")
  .option("--dry-run", "Preview what would be added without making changes")
  .action(
    async (
      component: string,
      opts: { force?: boolean; dryRun?: boolean },
    ) => {
      await runAdd(
        component,
        { force: opts.force, dryRun: opts.dryRun },
        process.cwd(),
        ASSETS_DIR,
        pkg.version,
      );
    },
  );

program
  .command("update")
  .description("Update installed components to the current package version")
  .option("--dry-run", "Preview what would be updated without making changes")
  .action(async (opts: { dryRun?: boolean }) => {
    await runUpdate(
      { dryRun: opts.dryRun },
      process.cwd(),
      ASSETS_DIR,
      pkg.version,
    );
  });

program
  .command("status")
  .description("Show installed components and check for updates")
  .action(async () => {
    await runStatus(process.cwd(), pkg.version);
  });

program
  .command("uninstall")
  .description("Remove all installed Arcane framework files")
  .option("--yes", "Skip confirmation prompt")
  .option("--dry-run", "Preview what would be removed without deleting files")
  .action(async (opts: { yes?: boolean; dryRun?: boolean }) => {
    await runUninstall({ yes: opts.yes, dryRun: opts.dryRun }, process.cwd());
  });

program
  .command("doctor")
  .description("Check your environment for Arcane prerequisites")
  .option("--fix", "Automatically create missing session continuity files")
  .action(async (opts: { fix?: boolean }) => {
    await runDoctor(process.cwd(), { fix: opts.fix }, ASSETS_DIR);
  });

// ─── spell agents ─────────────────────────────────────────────────────────────

const agentsCommand = program
  .command("agents")
  .description("Manage the portable agent system (init, sync, list)");

agentsCommand
  .command("init")
  .description(
    "Interactive agent roster setup — choose profile, naming strategy, and install definitions",
  )
  .option(
    "--profile <profile>",
    "Agent profile: base | full | custom",
  )
  .option(
    "--naming <strategy>",
    "Naming strategy: arcanos | generic | random | custom",
  )
  .option("--force", "Reinitialize even if roster already exists")
  .option("--dry-run", "Preview what would be created without writing files")
  .action(
    async (opts: {
      profile?: string;
      naming?: string;
      force?: boolean;
      dryRun?: boolean;
    }) => {
      await runAgentsInit(
        {
          profile: opts.profile as AgentProfileId | undefined,
          naming: opts.naming as NamingStrategy | undefined,
          force: opts.force,
          dryRun: opts.dryRun,
        } satisfies AgentInitOptions,
        process.cwd(),
        ASSETS_DIR,
      );
    },
  );

agentsCommand
  .command("sync")
  .description(
    "Regenerate all client instruction files from canonical agent definitions",
  )
  .option("--dry-run", "Preview what would be generated without writing files")
  .option("--no-openclaw", "Skip OpenClaw workspace output")
  .option("--no-copilot", "Skip Copilot output")
  .option("--no-claude", "Skip Claude output")
  .option("--no-codex", "Skip Codex output")
  .action(
    async (opts: {
      dryRun?: boolean;
      openclaw?: boolean;
      copilot?: boolean;
      claude?: boolean;
      codex?: boolean;
    }) => {
      await runAgentsSync(
        {
          dryRun: opts.dryRun,
          openclaw: opts.openclaw,
          copilot: opts.copilot,
          claude: opts.claude,
          codex: opts.codex,
        } satisfies AgentSyncOptions,
        process.cwd(),
        ASSETS_DIR,
      );
    },
  );

agentsCommand
  .command("list")
  .description("Show the current agent roster with assigned names and roles")
  .action(async () => {
    await runAgentsList(process.cwd());
  });

// Only parse argv when executed directly — not when imported in tests.
// Use realpathSync to resolve symlinks (e.g. npm global bin → dist/index.js).
import { realpathSync } from "node:fs";
if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await program.parseAsync(process.argv);
}

export { program };
