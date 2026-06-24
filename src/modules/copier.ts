import {
  mkdir,
  copyFile as fsCopyFile,
  access,
  readdir,
} from "node:fs/promises";
import path from "node:path";

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

async function fileExists(filePath: string): Promise<boolean> {
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
 */
export async function copyFile(
  srcPath: string,
  targetDir: string,
  relativePath: string,
  opts: { force?: boolean } = {},
): Promise<void> {
  validateTargetPath(targetDir, relativePath);

  const destPath = path.resolve(targetDir, relativePath);
  await ensureDir(path.dirname(destPath));

  if (!opts.force && (await fileExists(destPath))) {
    throw new Error(
      `Destination already exists: "${relativePath}". Use --force to overwrite.`,
    );
  }

  await fsCopyFile(srcPath, destPath);
}

/**
 * Recursively copies a directory from srcDir to targetDir/relativeDir.
 * Validates the target path to prevent traversal attacks.
 * Returns the list of relative file paths that were copied (for manifest tracking).
 */
export async function copyDirectory(
  srcDir: string,
  targetDir: string,
  relativeDir: string,
  opts: { force?: boolean } = {},
): Promise<string[]> {
  validateTargetPath(targetDir, relativeDir);

  const copiedFiles: string[] = [];
  const entries = await readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcEntryPath = path.join(srcDir, entry.name);
    const relEntryPath = `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      const subFiles = await copyDirectory(srcEntryPath, targetDir, relEntryPath, opts);
      copiedFiles.push(...subFiles);
    } else {
      await copyFile(srcEntryPath, targetDir, relEntryPath, opts);
      copiedFiles.push(relEntryPath);
    }
  }

  return copiedFiles;
}
