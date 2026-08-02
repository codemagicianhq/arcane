#!/usr/bin/env tsx
import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllComponents } from "../src/modules/registry.js";

const GENERATED_ROOTS = [".github/", ".arcane/", ".claude/"];

export type ParityMode = "check" | "fix";

export interface ParityResult {
  checked: number;
  repaired: string[];
  drifted: string[];
}

function toRegistryPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isGeneratedPath(path: string): boolean {
  return GENERATED_ROOTS.some((prefix) => path.startsWith(prefix));
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function getGeneratedDogfoodPaths(
  assetsDir: string,
): Promise<string[]> {
  const paths = new Set<string>();

  for (const component of getAllComponents()) {
    if (component.skipExisting) continue;

    for (const file of component.files) {
      const path = toRegistryPath(file);
      if (isGeneratedPath(path)) paths.add(path);
    }

    for (const directory of component.directories ?? []) {
      const registryDirectory = toRegistryPath(directory).replace(/\/$/, "");
      if (!isGeneratedPath(`${registryDirectory}/`)) continue;

      const canonicalDirectory = join(assetsDir, registryDirectory);
      for (const file of await listFiles(canonicalDirectory)) {
        paths.add(toRegistryPath(relative(assetsDir, file)));
      }
    }
  }

  return [...paths].sort();
}

function normalizeLineEndings(content: Buffer): string {
  return content.toString("utf8").replace(/\r\n?/g, "\n");
}

async function readOptionalFile(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function resolveWithin(root: string, registryPath: string): string {
  const rootPath = resolve(root);
  const resolvedPath = resolve(rootPath, registryPath);
  if (resolvedPath !== rootPath && !resolvedPath.startsWith(`${rootPath}${sep}`)) {
    throw new Error(`Registry path escapes its root: ${registryPath}`);
  }
  return resolvedPath;
}

export async function runSelfHostParity(
  mode: ParityMode,
  rootDir: string,
  assetsDir: string,
): Promise<ParityResult> {
  const paths = await getGeneratedDogfoodPaths(assetsDir);
  const drifted: string[] = [];
  const repaired: string[] = [];

  for (const path of paths) {
    const canonicalPath = resolveWithin(assetsDir, path);
    const outputPath = resolveWithin(rootDir, path);
    const canonical = await readFile(canonicalPath);
    const output = await readOptionalFile(outputPath);
    const matches = output !== null
      && normalizeLineEndings(output) === normalizeLineEndings(canonical);

    if (matches) continue;
    drifted.push(path);

    if (mode === "fix") {
      await mkdir(dirname(outputPath), { recursive: true });
      await copyFile(canonicalPath, outputPath);
      repaired.push(path);
    }
  }

  return { checked: paths.length, repaired, drifted };
}

async function main(): Promise<void> {
  const [argument, ...extraArguments] = process.argv.slice(2);
  if (extraArguments.length > 0 || !["--check", "--fix"].includes(argument ?? "")) {
    console.error("Usage: tsx scripts/self-host-parity.ts --check|--fix");
    process.exitCode = 2;
    return;
  }

  const mode: ParityMode = argument === "--fix" ? "fix" : "check";
  const rootDir = process.env["ARCANE_SELF_HOST_ROOT"] ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const assetsDir = process.env["ARCANE_SELF_HOST_ASSETS_DIR"] ?? join(rootDir, "src", "assets");
  const result = await runSelfHostParity(mode, rootDir, assetsDir);

  if (mode === "fix") {
    console.log(`Self-host parity repaired ${result.repaired.length} of ${result.checked} generated files.`);
    return;
  }

  if (result.drifted.length > 0) {
    console.error(`Self-host parity FAILED: ${result.drifted.length} of ${result.checked} generated files differ from src/assets/.`);
    for (const path of result.drifted) console.error(`  ${path}`);
    console.error("Run `npm run fix:self-host-parity`; never hand-edit generated root copies.");
    process.exitCode = 1;
    return;
  }

  console.log(`Self-host parity passed: ${result.checked} generated files match src/assets/.`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error("self-host-parity failed:", error);
    process.exitCode = 1;
  });
}