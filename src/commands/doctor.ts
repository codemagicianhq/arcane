import { access, readFile, mkdir, copyFile as fsCopyFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

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

async function checkArcaneManifest(targetDir: string): Promise<CheckResult> {
  const name = "Arcane manifest (.arcane.json)";
  const manifestPath = join(targetDir, ".arcane.json");
  try {
    await access(manifestPath);
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
      message: "No .arcane.json found. Run `spell init` to initialize Arcane in this project.",
      blocking: false,
    };
  }
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

export async function runDoctor(targetDir: string, options: DoctorOptions = {}, assetsDir?: string): Promise<void> {
  console.log("\nspell doctor — checking your Arcane environment\n");

  const results = await Promise.all([
    checkNodeVersion(),
    checkVSCodeExtension("GitHub.copilot-chat", "GitHub Copilot (Chat)"),
    checkArcaneManifest(targetDir),
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
