import {
  mkdir,
  access,
  lstat,
  readdir,
  readFile,
  rm,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { recordRegularFileInIndex } from "./git.js";

/**
 * CRLF and lone CR -> LF, at the byte level (no decoding, so any content is
 * handled exactly). Arcane's managed files are text, and git rewrites their
 * line endings on checkout (`text=auto eol=lf`, `core.autocrlf`); a hash that
 * saw those bytes read a file nobody had edited as an operator edit -- found
 * live in the CS-03 migration fixture (TODO.md, "a recorded file hash is
 * byte-exact").
 */
function normalizeLineEndings(content: Buffer): Buffer {
  if (!content.includes(0x0d)) return content;
  const out = Buffer.allocUnsafe(content.length);
  let o = 0;
  for (let i = 0; i < content.length; i++) {
    const byte = content[i]!;
    if (byte === 0x0d) {
      out[o++] = 0x0a;
      if (content[i + 1] === 0x0a) i++;
      continue;
    }
    out[o++] = byte;
  }
  return out.subarray(0, o);
}

/**
 * SHA-256 hex digest of content with line endings normalized to LF -- the
 * hash `fileHashes` and the user tier's `fanout` record carry (ARC-038
 * decision 1). Two files that differ only in CRLF/LF hash the same.
 */
export function hashContent(content: Buffer | string): string {
  const bytes = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
  return createHash("sha256").update(normalizeLineEndings(bytes)).digest("hex");
}

/** `hashContent` of a file on disk. */
export async function hashFile(filePath: string): Promise<string> {
  return hashContent(await readFile(filePath));
}

/**
 * True when a file still matches a hash Arcane recorded for it -- the
 * line-ending-normalized digest (what `hashFile`/`copyFile` record now), or
 * the raw-bytes digest (what they recorded before normalization existed), so
 * an install that predates this change is read correctly without a
 * migration: a file byte-identical or LF-identical to what was recorded is
 * "untouched", and only genuinely different content reads as an edit.
 */
export async function fileMatchesHash(filePath: string, recordedHash: string): Promise<boolean> {
  const content = await readFile(filePath);
  if (hashContent(content) === recordedHash) return true;
  return createHash("sha256").update(content).digest("hex") === recordedHash;
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

export interface SymlinkConversion {
  /** The managed path, relative to the target directory, forward slashes. */
  file: string;
  /**
   * `symlink`: the working-tree path was a link. `index-symlink`: the index
   * tracked it as one (mode 120000) while the file itself looked regular, the
   * `core.symlinks=false` shape. `path-body`: a regular file, tracked as one,
   * whose whole body was a single relative path, a link materialised as text.
   */
  shape: "symlink" | "index-symlink" | "path-body";
}

export interface CopyOptions {
  force?: boolean;
  /**
   * Paths the git index tracks as symlinks (mode 120000), from
   * `listSymlinkTrackedPaths`: the `core.symlinks=false` shape, where the
   * working-tree file looks regular and `lstat` cannot tell (#357). Collected
   * once per run by the caller; absent means there is no index to consult.
   */
  linkTracked?: ReadonlySet<string>;
  /** Receives every destination that was a symlink, by either shape, and is a regular file now. */
  conversions?: SymlinkConversion[];
}

/**
 * #357: a managed path must end up a regular file whatever it was. A symlink
 * in the working tree is unlinked, so the write that follows lands at the
 * path instead of wherever the link pointed. A path the index tracks as a
 * symlink (the `core.symlinks=false` shape) is unlinked too and, after the
 * write, re-recorded as 100644, because git keeps the symlink mode of an
 * existing entry on such a checkout and would otherwise commit the new
 * content as a link target. Returns the shape found, or null for an ordinary
 * file or an absent path.
 */
async function replaceSymlinkedDestination(
  destPath: string,
  relativePath: string,
  opts: CopyOptions,
): Promise<SymlinkConversion["shape"] | null> {
  let isLink: boolean;
  try {
    isLink = (await lstat(destPath)).isSymbolicLink();
  } catch {
    return null; // absent: nothing to replace
  }
  if (isLink) {
    await removeLink(destPath);
    return "symlink";
  }
  if (opts.linkTracked?.has(relativePath.replace(/\\/g, "/"))) {
    await unlink(destPath);
    return "index-symlink";
  }
  return null;
}

/**
 * Removes the link at `linkPath` and nothing else. `unlink` takes any link on
 * POSIX, and on the Node versions tested a Windows junction too. On Windows a
 * directory link can still be refused as a reparse point (EPERM or EISDIR,
 * older Node and some filesystems), and there `rmdir` removes exactly the
 * link, never what it points at; on POSIX `rmdir` cannot remove a link at all
 * (ENOTDIR), so the fallback is Windows-only. Any other failure is the
 * caller's to see.
 */
async function removeLink(linkPath: string): Promise<void> {
  try {
    await unlink(linkPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (process.platform !== "win32" || (code !== "EPERM" && code !== "EISDIR")) throw err;
    await rmdir(linkPath);
  }
}

/**
 * A body that is exactly one relative path -- `./` or `../`, no whitespace, no
 * URL scheme: a symlink's target written out as text, which is what a
 * `core.symlinks=false` checkout leaves where a client shim should be (#357).
 * Deliberately narrow (review F2): a shim an operator trimmed to its one-line
 * `@.arcane/spells/<id>.md` include is a customization, not a link, and must
 * keep ARC-038's protection.
 */
export function looksLikeBarePath(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length <= 512 && /^\.{1,2}\/\S+$/.test(trimmed) && !trimmed.includes("://");
}

/**
 * #357: the link shape of the managed path at targetDir/relativePath, or null
 * for an ordinary file or an absent path. `symlink`: a link in the working
 * tree. `index-symlink`: an index entry of mode 120000 (`linkTracked`).
 * `path-body`, judged only when `bodyHeuristic` is set (client shims): a
 * regular file whose whole body is a single relative path. Each is a broken
 * client file, not an operator's customization, however much its content
 * differs from the recorded hash: the update rewrites it and reports the
 * shape instead of keeping or merging it.
 */
export async function managedPathLinkShape(
  targetDir: string,
  relativePath: string,
  linkTracked: ReadonlySet<string> | undefined,
  bodyHeuristic: boolean,
): Promise<SymlinkConversion["shape"] | null> {
  const destPath = path.resolve(targetDir, relativePath);
  try {
    if ((await lstat(destPath)).isSymbolicLink()) return "symlink";
  } catch {
    return null; // absent
  }
  if (linkTracked?.has(relativePath.replace(/\\/g, "/"))) return "index-symlink";
  if (!bodyHeuristic) return null;
  try {
    return looksLikeBarePath(await readFile(destPath, "utf-8")) ? "path-body" : null;
  } catch {
    return null;
  }
}

/**
 * Writes `content` at targetDir/relativePath as a regular file, replacing a
 * symlinked destination first (see replaceSymlinkedDestination) and recording
 * the conversion in `opts.conversions`. Every managed-content write goes
 * through here or through `copyFile`, which calls it.
 */
export async function writeManagedFile(
  targetDir: string,
  relativePath: string,
  content: Buffer | string,
  opts: CopyOptions = {},
): Promise<void> {
  validateTargetPath(targetDir, relativePath);
  const destPath = path.resolve(targetDir, relativePath);
  await ensureDir(path.dirname(destPath));
  const shape = await replaceSymlinkedDestination(destPath, relativePath, opts);
  await writeFile(destPath, content);
  if (shape === "index-symlink") await recordRegularFileInIndex(targetDir, relativePath);
  if (shape !== null) opts.conversions?.push({ file: relativePath, shape });
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
 * A symlinked destination becomes a regular file (#357; see writeManagedFile).
 */
export async function copyFile(
  srcPath: string,
  targetDir: string,
  relativePath: string,
  opts: CopyOptions = {},
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
  const hash = hashContent(content);
  await writeManagedFile(targetDir, relativePath, content, opts);
  return hash;
}

/**
 * Deletes `relativePath` under `targetDir`, refusing (with the same named
 * error every write path already raises) any path that resolves outside it.
 * The paths this is called with come from `.arcane.json`, which is repository
 * content, so a manifest edited -- or generated by a hostile tool -- to track
 * `../../something` must never reach `rm` (TODO.md, "two delete paths apply
 * manifest-controlled paths without the traversal guard"). Missing files are
 * fine (`force`); nothing is ever removed recursively here.
 */
export async function removeWithin(targetDir: string, relativePath: string): Promise<void> {
  validateTargetPath(targetDir, relativePath);
  await rm(path.resolve(targetDir, relativePath), { force: true });
}

/**
 * Removes the directories a just-deleted file leaves behind, walking up from
 * its parent and stopping at the first non-empty one -- or at `targetDir`,
 * which is never removed. `rmdir` on purpose: it removes exactly an empty
 * directory and refuses a non-empty one, so a file that appears between the
 * emptiness check and the removal is never taken with it.
 *
 * Without this, pruning a component's files leaves its skeleton behind: a
 * repository that opts out of carrying spells (ARC-045 decision 4 / CS-05)
 * would keep 41 empty `.agents/skills/<id>/` directories and the empty
 * client folders above them, which git does not track and nothing else
 * cleans up.
 */
export async function removeEmptyAncestors(targetDir: string, relativePath: string): Promise<void> {
  validateTargetPath(targetDir, relativePath);
  const base = path.resolve(targetDir);
  let dir = path.dirname(path.resolve(targetDir, relativePath));
  while (dir !== base && dir.startsWith(base + path.sep)) {
    try {
      if ((await readdir(dir)).length > 0) return;
      await rmdir(dir);
    } catch {
      return; // already gone, unreadable, or no longer empty
    }
    dir = path.dirname(dir);
  }
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
  opts: CopyOptions = {},
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

/**
 * Every file under srcDir, as a path relative to targetDir/relativeDir with
 * forward slashes -- the list `copyDirectory` would write, without writing.
 * Lets a plan name each destination before any of them is touched.
 */
export async function listDirectoryFiles(srcDir: string, relativeDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(srcDir, { withFileTypes: true })) {
    const rel = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await listDirectoryFiles(path.join(srcDir, entry.name), rel)));
    else files.push(rel);
  }
  return files;
}
