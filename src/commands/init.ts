import { select, confirm, input } from "@inquirer/prompts";
import { join } from "node:path";
import chalk from "chalk";
import { copyFile, copyDirectory } from "../modules/copier.js";
import {
  readManifest,
  writeManifest,
  isValidSubjectRoot,
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
import {
  installPrePushHook,
  disablePushUrls,
  describeConfigScope,
  ARCANE_HOOKS_DIR,
} from "../modules/push-safety.js";
import { installSecretsPrecommitHook } from "../modules/secrets-scan.js";
import {
  correctUnbornMasterDefault,
  ensureLocalPullRebase,
  inspectGitRepository,
} from "../modules/git.js";
import type {
  ArcaneManifest,
  ContentSensitivity,
  ExternalProvider,
  HubRole,
  InstalledComponent,
  Profile,
  RegistryComponent,
  PushPolicy,
  SpellInitOptions,
  TrackingMode,
} from "../types.js";

const VALID_PROFILES: Profile[] = ["full", "lite", "governance-only", "methodology", "docs"];

/** Menu glyph per profile. Falls back to 📋 for any profile not listed. */
const PROFILE_ICONS: Partial<Record<Profile, string>> = {
  full: "🧙",
  lite: "⚡",
  docs: "📖",
};

/** True for the capability-scoped spell components (see registry.ts). */
function isSpellComponent(name: string): boolean {
  return name.startsWith("spells-");
}

// ─── Category labels for preview ─────────────────────────────────────────────

interface ComponentGroup {
  icon: string;
  label: string;
  count: number;
}

function categorizeComponents(components: RegistryComponent[]): ComponentGroup[] {
  const groups: ComponentGroup[] = [];

  // Spells now arrive as several capability components rather than one
  // monolith, and each carries both client formats of the same spell, so
  // count by file destination rather than by component.
  const spellFiles = components.filter((c) => isSpellComponent(c.name)).flatMap((c) => c.files);

  const promptCount = spellFiles.filter((f) => f.startsWith(".github/prompts/")).length;
  if (promptCount > 0) {
    groups.push({ icon: "✨", label: "Copilot Spells", count: promptCount });
  }

  const claudeCount = spellFiles.filter((f) => f.startsWith(".claude/commands/")).length;
  if (claudeCount > 0) {
    groups.push({ icon: "⚡", label: "Claude Spells", count: claudeCount });
  }

  const governance = components.filter(
    (c) =>
      !isSpellComponent(c.name) &&
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

  // ── Git-state checks (EF-05, EF-32) ─────────────────────────────────────
  // Never runs `git init` or creates a commit -- see
  // features/init-git-state-contract/PRD.md's "Design decision" section for
  // why that's declined rather than deferred. Only acts where it's provably
  // safe (an unborn repo has no commits to conflict with) or where the
  // operator already explicitly confirmed continuing (uncommitted changes).
  let repoNotFound = false;
  if (!options.dryRun) {
    const gitState = await inspectGitRepository(targetDir);

    if (gitState.status === "not-repository") {
      repoNotFound = true;
    } else {
      if (gitState.status === "no-commits") {
        const correction = await correctUnbornMasterDefault(targetDir);
        if (correction.corrected) {
          printInfo(
            `Repointed the unborn branch from "${correction.from}" to "${correction.to}" (avoids the Git for Windows default-branch trap).`,
          );
        } else if (correction.blockedReason === "target-unreadable") {
          printWarning(
            'This repo\'s "main" branch ref exists but could not be read (broken ref). Left the current branch alone — ' +
              "repointing onto an unreadable ref risks attaching your staged work to history Arcane cannot see. " +
              "Check `git for-each-ref refs/heads/main` before committing.",
          );
        }
      }

      if (gitState.status === "ready" && gitState.uncommittedChanges > 0) {
        printWarning(
          `This repo has ${gitState.uncommittedChanges} uncommitted change${gitState.uncommittedChanges === 1 ? "" : "s"}.`,
        );
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

      const rebaseResult = await ensureLocalPullRebase(targetDir);
      if (rebaseResult.action === "explicit-false-preserved") {
        printWarning(
          "This repo's pull.rebase is explicitly set to false, but Arcane's governance mandates rebase-and-fast-forward (see .arcane/governance/git-conventions.md). Left as-is since you set it explicitly.",
        );
      }
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
          name: `${PROFILE_ICONS[p.id] ?? "📋"}  ${p.displayName} — ${p.description}`,
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
    const fileHashes: Record<string, string> = {};

    for (const file of component.files) {
      const srcPath = join(assetsDir, component.sourceOverrides?.[file] ?? file);
      if (options.dryRun) {
        printDryRun(`Would copy: ${file}`);
      } else {
        try {
          fileHashes[file] = await copyFile(srcPath, targetDir, file, { force: options.force });
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
        for (const { path: copiedPath, hash } of copied) {
          installedFiles.push(copiedPath);
          fileHashes[copiedPath] = hash;
        }
        fileCount += copied.length;
      }
    }

    if (!options.dryRun) {
      installedComponents.push({
        name: component.name,
        files: installedFiles,
        installedVersion: packageVersion,
        fileHashes,
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

  // ── Step 5a: Hub question ───────────────────────────────────────────────
  // Explicit opt-in only -- never inferred from repo content (a `ventures/`
  // directory can legitimately exist in a consumer repo too, e.g. one this
  // very init run just created via a governance-only profile). Written
  // explicitly either way so a future `spell update` retrofit wizard can
  // tell "asked and declined" apart from "predates this feature".
  let role: HubRole | undefined;
  if (!options.profile) {
    console.log();
    const isHub = await confirm({
      message: "Will this repo manage other ventures as a hub? (idea books, spell-manifest promotion, venture registry)",
      default: false,
    });
    role = isHub ? "hub" : "consumer";
  }

  // ── Step 5b: Tracking-mode question (EF-14) ─────────────────────────────
  // governance-only/methodology profiles have no code-tracking surface --
  // default without asking, even under --profile (deterministic, no prompt
  // to skip). full/lite ask once, interactively only, mirroring the hub
  // question's own gating exactly -- a scripted full/lite install leaves
  // this unset, resolved later by spell update's retrofit wizard.
  let tracking_mode: TrackingMode | undefined;
  let external_provider: ExternalProvider | null | undefined;
  if (profile === "governance-only" || profile === "methodology" || profile === "docs") {
    tracking_mode = "internal";
    external_provider = null;
  } else if (!options.profile) {
    console.log();
    tracking_mode = (await select({
      message: "How will work be tracked in this repo?",
      choices: [
        { value: "internal", name: "Track work in this repo (TODO.md / PRDs)" },
        { value: "external", name: "Track work in an external tracker (Azure DevOps / GitHub / Jira / other)" },
      ],
    })) as TrackingMode;
    if (tracking_mode === "external") {
      external_provider = (await select({
        message: "Which external tracker?",
        choices: [
          { value: "ado", name: "Azure DevOps" },
          { value: "github", name: "GitHub Issues" },
          { value: "jira", name: "Jira" },
          { value: "other", name: "Other" },
        ],
      })) as ExternalProvider;
    } else {
      external_provider = null;
    }
  }

  // ── Step 5c: Subject shape (EF-07) ──────────────────────────────────────
  // Asked for the docs profile only. Other profiles describe code or a
  // venture portfolio, where "what is this repo about" is already answered by
  // business_root or by the code itself; a docs/records repo is the case where
  // the repository IS one subject and nothing currently expresses that.
  // Interactive only, like every other manifest question.
  let subject_root: string | null | undefined;
  if (profile === "docs" && !options.profile) {
    console.log();
    const shape = await select({
      message: "What does this repository hold?",
      choices: [
        {
          value: "root",
          name: "One subject, at the repository root (documents sit alongside Arcane's files)",
        },
        { value: "subdir", name: "One subject, in its own directory" },
        { value: "portfolio", name: "Several subjects or ventures (decide per-document later)" },
      ],
    });
    if (shape === "root") {
      // "." is deliberate, not a placeholder: it lets an existing archive come
      // under governance without being restructured first (EF-07 / MH-02).
      subject_root = ".";
    } else if (shape === "subdir") {
      const answer = await input({
        message: "Directory holding the subject's documents:",
        default: "docs",
        validate: (v) =>
          isValidSubjectRoot(v.trim() || "docs") ||
          "Must be a relative path inside the repository (no leading /, drive letter, or ..).",
      });
      subject_root = answer.trim() || "docs";
    }
    else if (shape === "portfolio") {
      // Explicit null, not unset: records that the question was asked and
      // answered, so spell update's retrofit doesn't put it again every run.
      subject_root = null;
    }
  }

  // ── Step 5d: Content sensitivity (EF-12) ────────────────────────────────
  // Asked on every interactive install, not just docs: a code repo can hold
  // sensitive records too. Declared once for the whole repository -- per-file
  // detection is unreliable for general documents, which is why the docs-mode
  // PRD rejects scanning as a primary mechanism.
  let content_sensitivity: ContentSensitivity | undefined;
  if (!options.profile) {
    console.log();
    content_sensitivity = (await select({
      message: "How should agents treat this repository's contents?",
      choices: [
        { value: "standard", name: "Standard — agents may quote contents in journals and decisions" },
        {
          value: "sensitive",
          name: "Sensitive — agents reference documents by path, never transcribe them",
        },
      ],
      default: "standard",
    })) as ContentSensitivity;
  }

  // ── Step 5e: Push policy (EF-09) ────────────────────────────────────────
  // Default "open" — strictly additive, so every existing repository and every
  // scripted install behaves exactly as before. Asked interactively only.
  let push_policy: PushPolicy | undefined;
  if (!options.profile) {
    console.log();
    push_policy = (await select({
      message: "Should this repository be allowed to push to a remote?",
      choices: [
        { value: "open", name: "Yes — normal repository" },
        { value: "guarded", name: "Sensitive, but keep push working — remind me instead" },
        {
          value: "blocked",
          name: "No — block pushes (a pre-push hook plus a disabled push URL)",
        },
      ],
      default: "open",
    })) as PushPolicy;
  }

  // ── Step 6: Write manifest ─────────────────────────────────────────────
  const manifest: ArcaneManifest = {
    version: packageVersion,
    profile,
    installedAt: new Date().toISOString(),
    components: installedComponents,
    ...(role ? { role } : {}),
    ...(tracking_mode ? { tracking_mode, external_provider } : {}),
    ...(subject_root !== undefined ? { subject_root } : {}),
    ...(content_sensitivity ? { content_sensitivity } : {}),
    ...(push_policy ? { push_policy } : {}),
  };
  await writeManifest(targetDir, manifest);

  printSuccess(`Initialized with profile "${profile}" — ${fileCount} files installed`);

  // ── Push-safety controls (EF-09 R2/R3/R4/R7) ────────────────────────────
  // Wrapped: a failure here must not surface as a raw stack trace after
  // "Initialized successfully", leaving a manifest that says "blocked" while
  // the operator believes they are protected.
  if (push_policy === "blocked" || push_policy === "guarded") {
    try {
      if (push_policy === "blocked") {
        const hook = await installPrePushHook(targetDir);
        if (hook.status === "refused-unreadable-config") {
          // Fail closed: we could not determine whether another hook manager
          // owns core.hooksPath, and installing on a guess could disable it.
          printWarning(
            "Did not install the pre-push hook: git could not report the current core.hooksPath " +
              "(unreadable config, or a git too old for `--show-scope`). Installing without knowing " +
              "whether another hook manager owns that setting could silently disable it. Fix the " +
              "config and run `spell doctor`.",
          );
        } else if (hook.status === "refused-default-hooks") {
          // Same harm as a foreign core.hooksPath, reached by the route the R7
          // guard wasn't watching: this repository's hooks live in git's
          // default directory and have no config key to collide with, so
          // taking the slot would switch every one of them off silently.
          printWarning(
            `Did not install the pre-push hook: this repository has hooks in git's default ` +
              `directory (${hook.hooks.join(", ")}). Setting core.hooksPath would silently stop ` +
              `them running. Move them under \`${ARCANE_HOOKS_DIR}\` yourself and re-run, or add ` +
              "the push guard to your existing pre-push hook.",
          );
        } else if (hook.status === "refused-foreign-hooks-path") {
          // R7: core.hooksPath is one exclusive slot, at local OR global
          // scope, so pointing it at Arcane would silently disable whatever
          // hook manager already owns it.
          printWarning(
            `Did not install the pre-push hook: core.hooksPath is already "${hook.existing}" ` +
              `(${describeConfigScope(hook.scope)}), so another hook manager owns it. Overwriting ` +
              "would silently disable those hooks. Chain an Arcane pre-push guard into that " +
              "directory yourself, or unset core.hooksPath first.",
          );
        } else {
          printInfo("Installed a pre-push hook that blocks pushes from this repository.");
        }

        const urls = await disablePushUrls(targetDir);
        const unprotected = urls.filter((u) => u.status === "failed");
        if (unprotected.length > 0) {
          // Never let a partial application read as a full one.
          printWarning(
            `Could not disable the push URL for: ${unprotected
              .map((u) => `${u.remote} (${u.reason ?? "unknown error"})`)
              .join("; ")}. Those remotes are still pushable with \`--no-verify\`. ` +
              "Run `spell doctor` — it lists exactly which remotes are still live.",
          );
        }
        if (urls.length === 0) {
          // Be precise: nothing is protecting a remote added later, because
          // this only disables remotes that exist right now. Claiming
          // otherwise would be exactly the false confidence ARC-034 warns of.
          printWarning(
            "No remote is configured, so only the pre-push hook is active. A remote added later " +
              "will NOT have its push URL disabled automatically, and a `--no-verify` push to it " +
              "would succeed. Run `spell doctor` after adding one — it reports this gap.",
          );
        } else {
          const covered = urls.filter((u) => u.status !== "failed").map((u) => u.remote);
          if (covered.length > 0) {
            printInfo(`Disabled the push URL for: ${covered.join(", ")} (fetch still works).`);
          }
        }
        printInfo("Run `spell unblock-push` from a terminal to undo this.");
      } else {
        printInfo(
          "Marked as push-guarded. No technical control was installed — check the remote is the " +
            "one you intend before pushing. `spell doctor` will keep reminding you.",
        );
      }
    } catch (err) {
      printWarning(
        `Could not fully apply push-safety controls: ${err instanceof Error ? err.message : String(err)}. ` +
          `The manifest records push_policy: "${push_policy}", but this repository may not actually be ` +
          "protected. Run `spell doctor` to see exactly what is and isn't in place.",
      );
    }
  }

  // ── Secrets pre-commit hook (ARC-037 decision 2) ────────────────────────
  // Deliberately push_policy-independent: every profile gets this, since
  // credential leakage is a risk regardless of whether history may reach a
  // remote. Mandatory, not an interactive question -- see secrets-scan.ts's
  // own reasoning for why. Wrapped the same way as the push-safety block
  // above: a failure here must not surface as a raw stack trace after
  // "Initialized successfully".
  try {
    const hook = await installSecretsPrecommitHook(targetDir);
    if (hook.status === "installed") {
      printInfo("Installed a pre-commit hook that scans staged content for leaked credentials.");
    } else if (hook.status === "refused-unreadable-config") {
      printWarning(
        "Did not install the secrets pre-commit hook: git could not report the current " +
          "core.hooksPath (unreadable config, or a git too old for `--show-scope`).",
      );
    } else if (hook.status === "refused-default-hooks") {
      printWarning(
        `Did not install the secrets pre-commit hook: this repository has hooks in git's default ` +
          `directory (${hook.hooks.join(", ")}). Setting core.hooksPath would silently stop them ` +
          `running. Move them under \`${ARCANE_HOOKS_DIR}\` yourself and re-run.`,
      );
    } else if (hook.status === "refused-foreign-hooks-path") {
      printWarning(
        `Did not install the secrets pre-commit hook: core.hooksPath is already "${hook.existing}" ` +
          `(${describeConfigScope(hook.scope)}), so another hook manager owns it.`,
      );
    }
    // "already-ours": nothing to report, matches the prior install exactly.
  } catch (err) {
    printWarning(
      `Could not install the secrets pre-commit hook: ${err instanceof Error ? err.message : String(err)}. ` +
        "Run `spell doctor --leaks` directly to scan on demand instead.",
    );
  }

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
  if (repoNotFound) {
    printNextStep(
      step++,
      'Initialize Git for this project: `git init -b main` (avoids defaulting to "master" on systems where that\'s the system default)',
    );
  }
  printNextStep(
    step++,
    "Commit the new files: git add .arcane .github .claude AGENTS.md CLAUDE.md .arcane.json",
  );
  console.log();
}
