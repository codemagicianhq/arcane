import {
  mkdir,
  access,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

/** SHA-256 hex digest of a file's content (ARC-038 decision 1). */
export async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Validates that relativePath stays within targetDir.
 * Throws if the resolved path escapes the target directory boundary.
 */
export function validateTargetPath(
  targetDir: string,
  relativePath: string,
): void {
  const resolvedBase = path.resolve(targetDir);
  const resolvedFull = path.resolve(targetDir, relativePath);

  if (
    resolvedFull !== resolvedBase &&
    !resolvedFull.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error(
      `Path traversal detected: "${relativePath}" escapes target directory "${targetDir}"`,
    );
  }
}

/**
 * Creates a directory and all parent directories if they don't exist.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies srcPath into targetDir at relativePath.
 * Validates path traversal before any I/O.
 * Throws if the destination already exists and opts.force is not set.
 * Returns the copied content's SHA-256 hex digest (ARC-038 decision 1) --
 * read once into memory and reused for both the hash and the write, rather
 * than hashing srcPath and then separately copying it: reading every source
 * file twice measurably slowed a full `spell init` (~90 files) once every
 * file started being hashed, enough to push some CI/test runs over their
 * timeout under contention. One read, one write; no redundant I/O.
 */
export async function copyFile(
  srcPath: string,
  targetDir: string,
  relativePath: string,
  opts: { force?: boolean } = {},
): Promise<string> {
  validateTargetPath(targetDir, relativePath);

  const destPath = path.resolve(targetDir, relativePath);
  await ensureDir(path.dirname(destPath));

  if (!opts.force && (await fileExists(destPath))) {
    throw new Error(
      `Destination already exists: "${relativePath}". Use --force to overwrite.`,
    );
  }

  const content = await readFile(srcPath);
  const hash = createHash("sha256").update(content).digest("hex");
  await writeFile(destPath, content);
  return hash;
}

export interface CopiedFile {
  path: string;
  hash: string;
}

/**
 * Recursively copies a directory from srcDir to targetDir/relativeDir.
 * Validates the target path to prevent traversal attacks.
 * Returns each copied file's relative path and content hash (ARC-038
 * decision 1), for manifest tracking.
 */
export async function copyDirectory(
  srcDir: string,
  targetDir: string,
  relativeDir: string,
  opts: { force?: boolean } = {},
): Promise<CopiedFile[]> {
  validateTargetPath(targetDir, relativeDir);

  const copiedFiles: CopiedFile[] = [];
  const entries = await readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcEntryPath = path.join(srcDir, entry.name);
    const relEntryPath = `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      const subFiles = await copyDirectory(srcEntryPath, targetDir, relEntryPath, opts);
      copiedFiles.push(...subFiles);
    } else {
      const hash = await copyFile(srcEntryPath, targetDir, relEntryPath, opts);
      copiedFiles.push({ path: relEntryPath, hash });
    }
  }

  return copiedFiles;
}
