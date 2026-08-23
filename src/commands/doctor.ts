import { access, readFile, mkdir, copyFile as fsCopyFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { INCIDENT_QUEUE } from "../config/incidents.js";
import { evaluateIncidentGate } from "../modules/incident-gate.js";
import { runGit } from "../modules/git.js";
import { readManifest } from "../modules/manifest.js";
import {
  isHookEnforced,
  listRemotes,
  undisabledRemotes,
} from "../modules/push-safety.js";

const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  /** If false, this is a warning, not a blocker. Defaults to true (blocking). */
  blocking?: boolean;
}

// ─── Individual checks ────────────────────────────────────────────────────────

async function checkNodeVersion(): Promise<CheckResult> {
  const name = "Node.js version";
  const raw = process.version; // e.g. "v20.11.0"
  const major = parseInt(raw.replace(/^v/, "").split(".")[0] ?? "0", 10);
  if (major >= 18) {
    return { name, passed: true, message: `${raw} (>=18 required)` };
  }
  return {
    name,
    passed: false,
    message: `${raw} — Node.js 18 or later is required`,
  };
}

async function checkVSCodeExtension(
  id: string,
  label: string,
): Promise<CheckResult> {
  const name = `VS Code extension: ${label}`;
  // Check extension directories on disk — more reliable than --list-extensions
  // in child process contexts (snap binaries may not output to non-TTY stdout).
  const home = process.env["HOME"] ?? "";
  const extDirs = [
    join(home, ".vscode", "extensions"),
    join(home, ".vscode-insiders", "extensions"),
  ];

  for (const dir of extDirs) {
    try {
      const { readdir } = await import("node:fs/promises");
      const entries = await readdir(dir);
      const prefix = id.toLowerCase() + "-";
      const found = entries.some(
        (e) => e.toLowerCase() === id.toLowerCase() || e.toLowerCase().startsWith(prefix),
      );
      if (found) {
        return { name, passed: true, message: `${id} is installed` };
      }
    } catch {
      // Directory doesn't exist — skip
    }
  }

  // Determine install command (prefer code-insiders if present)
  let installBin = "code";
  for (const bin of ["code", "code-insiders"]) {
    try {
      await execFileAsync(bin, ["--version"]);
      installBin = bin;
      break;
    } catch {
      // not found
    }
  }

  return {
    name,
    passed: false,
    message: `${id} not found. Install via: ${installBin} --install-extension ${id}`,
    blocking: false,
  };
}

export async function checkArcaneManifest(targetDir: string): Promise<CheckResult> {
  const name = "Arcane manifest (.arcane.json)";
  const manifestPath = join(targetDir, ".arcane.json");
  try {
    await access(manifestPath);
  } catch {
    const selfHostedManifestPath = join(targetDir, "src", "assets", ".arcane.json");
    try {
      const raw = await readFile(selfHostedManifestPath, "utf8");
      const manifest = JSON.parse(raw) as {
        selfHosted?: boolean;
        tracking_mode?: string;
      };
      if (manifest.selfHosted === true && manifest.tracking_mode === "internal") {
        return {
          name,
          passed: true,
          message: "self-hosted source tree — committed source manifest is authoritative",
        };
      }
    } catch {
      // No valid self-hosting marker — report the normal missing-manifest warning.
    }
    return {
      name,
      passed: false,
      message: "No .arcane.json found. Run `spell init` to initialize Arcane in this project.",
      blocking: false,
    };
  }

  try {
    const raw = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(raw) as { version?: string; components?: unknown[] };
    if (!manifest.version || !Array.isArray(manifest.components)) {
      return {
        name,
        passed: false,
        message: ".arcane.json is present but missing required fields (version, components). Re-run `spell init`.",
      };
    }
    return {
      name,
      passed: true,
      message: `v${manifest.version} — ${manifest.components.length} component(s) installed`,
    };
  } catch {
    return {
      name,
      passed: false,
      message: ".arcane.json is present but contains invalid JSON. Re-run `spell init`.",
    };
  }
}

/**
 * EF-32: independently verify the EFFECTIVE (not just repository-local)
 * pull.rebase resolves to "true", catching drift regardless of source --
 * an install that predates `spell init`'s own fix, a value unset again
 * later, or any other path that bypassed init's one-time correction.
 * Non-blocking: this repo has no CI job running inside the operator's own
 * working copy, so a doctor warning is the only enforcement mode available
 * here (see ARC-023's inline-enforcement-contract requirement).
 */
export async function checkPullRebase(targetDir: string): Promise<CheckResult> {
  const name = "Git pull.rebase (rebase-and-fast-forward mandate)";
  try {
    // --type=bool normalizes any of git's valid boolean spellings
    // (true/yes/on/1, false/no/off/0) to canonical "true"/"false" -- a raw
    // string comparison against "true" alone would false-positive-warn on
    // a fully compliant "yes"/"on"/"1".
    const { stdout } = await runGit(targetDir, ["config", "--type=bool", "--get", "pull.rebase"]);
    const value = stdout.trim();
    if (value === "true") {
      return { name, passed: true, message: "pull.rebase=true" };
    }
    return {
      name,
      passed: false,
      message: `pull.rebase resolves to "${value}", not "true" -- a bare \`git pull\` will create merge commits, contradicting git-conventions.md's rebase-and-fast-forward mandate. Run: git config --local pull.rebase true`,
      blocking: false,
    };
  } catch {
    // Two cases collapse here: unset entirely, or set to a non-boolean
    // value (e.g. "merges") --type=bool can't coerce -- both mean
    // "not affirmatively true", which is what this check cares about.
    return {
      name,
      passed: false,
      message: "pull.rebase is unset, not a recognized boolean, or this isn't a Git repository -- effective behavior may not be rebase-and-fast-forward, and Git for Windows defaults this to false when unset. Run: git config --local pull.rebase true",
      blocking: false,
    };
  }
}

export function checkIncidentReleaseGate(): CheckResult {
  const result = evaluateIncidentGate(INCIDENT_QUEUE);
  if (result.blocked) {
    return {
      name: "Incident release gate (ARC-024)",
      passed: false,
      message: result.blockers.join("; "),
    };
  }
  const accepted = result.acceptedRisks.length > 0
    ? `; ${result.acceptedRisks.length} explicitly deferred`
    : "";
  return {
    name: "Incident release gate (ARC-024)",
    passed: true,
    message: `${result.checked} incidents classified${accepted}`,
  };
}

// ─── Session continuity checks ────────────────────────────────────────────────

/** Files required for spell-close-session / spell-open-session to function. */
export const SESSION_CONTINUITY_FILES = [
  "TODO.md",
  "DECISIONS.md",
  "ai-context/system-prompt-context.md",
  "journal/.gitkeep",
];

export async function checkSessionContinuity(targetDir: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const file of SESSION_CONTINUITY_FILES) {
    const name = `Session file: ${file}`;
    const filePath = join(targetDir, file);
    try {
      await access(filePath);
      results.push({ name, passed: true, message: "present" });
    } catch {
      results.push({
        name,
        passed: false,
        message: `Missing. Required for spell-close-session. Run \`spell doctor --fix\` to create it.`,
        blocking: false,
      });
    }
  }

  return results;
}

export async function fixSessionContinuity(targetDir: string, assetsDir: string): Promise<string[]> {
  const created: string[] = [];

  for (const file of SESSION_CONTINUITY_FILES) {
    const destPath = join(targetDir, file);
    try {
      await access(destPath);
      // File exists — skip
    } catch {
      // File missing — create from template
      const srcPath = join(assetsDir, file);
      await mkdir(dirname(destPath), { recursive: true });
      await fsCopyFile(srcPath, destPath);
      created.push(file);
    }
  }

  return created;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export interface DoctorOptions {
  fix?: boolean;
}

/**
 * EF-09 R4. Reports the repository's declared push posture and, for a
 * "blocked" repo, whether the controls are actually in place.
 *
 * Deliberately fires for every "guarded" repo REGARDLESS of remote state. An
 * earlier draft only reported when no remote was configured, which meant the
 * reminder went silent the instant any remote was added -- including a wrong
 * one -- making "guarded" behave identically to "open" exactly when it
 * mattered most.
 */
export async function checkPushPolicy(targetDir: string): Promise<CheckResult> {
  const name = "Push policy (EF-09)";
  let manifest;
  try {
    manifest = await readManifest(targetDir);
  } catch {
    return { name, passed: true, message: "not initialized — nothing to check" };
  }

  const policy = manifest.push_policy ?? "open";

  if (policy === "open") {
    return { name, passed: true, message: "open — pushes allowed" };
  }

  if (policy === "guarded") {
    const remotes = await listRemotes(targetDir);
    const where = remotes.length === 0 ? "none configured" : remotes.join(", ");
    return {
      name,
      passed: false,
      blocking: false,
      message: `guarded — no technical control installed. Push targets: ${where}. Confirm those are the remotes you intend before pushing.`,
    };
  }

  // blocked: verify the controls are genuinely IN FORCE, not merely declared.
  // Checking config alone was a declaration check wearing an enforcement
  // check's name -- deleting the hook file leaves core.hooksPath intact and
  // pushes succeed, while this reported the hook as present.
  const hookActive = await isHookEnforced(targetDir);
  const remotes = await listRemotes(targetDir);
  const open = await undisabledRemotes(targetDir);

  if (hookActive && open.length === 0) {
    if (remotes.length === 0) {
      // Don't claim a push URL is "in place" when there is no remote at all.
      // The hook is the only live control here, and it is the one a
      // `--no-verify` push walks straight past -- so say that plainly rather
      // than reporting full protection.
      return {
        name,
        passed: false,
        blocking: false,
        message:
          "blocked — pre-push hook in place, but no remote is configured, so no push URL is disabled. If a remote is added later, run `spell doctor` again: a --no-verify push to it would succeed until the URL is disabled too.",
      };
    }
    return {
      name,
      passed: true,
      message: `blocked — pre-push hook in place and push URL disabled for ${remotes.join(", ")}`,
    };
  }

  const missing = [
    hookActive ? null : "pre-push hook (config or hook file absent)",
    open.length > 0 ? `push URL still live for: ${open.join(", ")}` : null,
  ].filter(Boolean);

  return {
    name,
    passed: false,
    blocking: false,
    message: `declared "blocked" but not enforced — ${missing.join("; ")}. The manifest claims a protection this repository does not have.`,
  };
}

export async function runDoctor(targetDir: string, options: DoctorOptions = {}, assetsDir?: string): Promise<void> {
  console.log("\nspell doctor — checking your Arcane environment\n");

  const results = await Promise.all([
    checkNodeVersion(),
    checkVSCodeExtension("GitHub.copilot-chat", "GitHub Copilot (Chat)"),
    checkArcaneManifest(targetDir),
    Promise.resolve(checkIncidentReleaseGate()),
    checkPullRebase(targetDir),
    checkPushPolicy(targetDir),
  ]);

  // Add session continuity checks
  const sessionResults = await checkSessionContinuity(targetDir);
  results.push(...sessionResults);

  let allPassed = true;

  for (const result of results) {
    const icon = result.passed ? "✓" : result.blocking === false ? "⚠" : "✗";
    const label = result.passed
      ? "pass"
      : result.blocking === false
        ? "warn"
        : "FAIL";
    console.log(`  ${icon} [${label}] ${result.name}`);
    if (!result.passed) {
      console.log(`         ${result.message}`);
    }
    if (!result.passed && result.blocking !== false) {
      allPassed = false;
    }
  }

  console.log();

  if (allPassed) {
    console.log("  All checks passed. Your environment is ready.\n");
  } else {
    console.log("  One or more checks failed. Fix the issues above before proceeding.\n");

    // --fix: remediate missing session continuity files
    const hasMissingSession = sessionResults.some((r) => !r.passed);
    if (options.fix && hasMissingSession && assetsDir) {
      console.log("  🔧 Fixing missing session continuity files...\n");
      const created = await fixSessionContinuity(targetDir, assetsDir);
      if (created.length > 0) {
        for (const file of created) {
          console.log(`    ✓ Created: ${file}`);
        }
        console.log(`\n  ${created.length} file(s) created. Repo is now close-session-ready.\n`);
      } else {
        console.log("    No files needed creation (all present).\n");
      }
    } else if (hasMissingSession && !options.fix) {
      console.log("  💡 Run `spell doctor --fix` to create missing session files.\n");
    }

    if (!allPassed) {
      process.exitCode = 1;
    }
  }
}
