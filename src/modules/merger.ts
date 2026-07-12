import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { validateTargetPath } from "./copier.js";

export const MARKER_START = "<!-- arcane:start -->";
export const MARKER_END = "<!-- arcane:end -->";

export class MalformedMarkersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedMarkersError";
  }
}

/**
 * Merges `content` into `targetDir/relativePath` using arcane marker comments.
 *
 * Behaviour:
 * - If both markers exist: replaces everything between them with `content`.
 * - If neither marker exists and `force` is true: appends markers + content.
 * - If neither marker exists and `force` is false: no-op, returns false.
 * - If only one marker is present: throws MalformedMarkersError.
 * - If file doesn't exist and `force` is true: creates the file with markers.
 * - If file doesn't exist and `force` is false: no-op, returns false.
 *
 * @returns true if the file was modified (or would be on dry-run), false if untouched.
 */
export async function mergeIntoFile(
  targetDir: string,
  relativePath: string,
  content: string,
  opts: { force?: boolean; dryRun?: boolean } = {},
): Promise<boolean> {
  validateTargetPath(targetDir, relativePath);

  const destPath = path.resolve(targetDir, relativePath);

  let existing: string | null;
  try {
    existing = await readFile(destPath, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      existing = null;
    } else {
      throw err;
    }
  }

  if (existing === null) {
    // File doesn't exist — create with markers only if --force
    if (!opts.force) return false;
    const newContent = `${MARKER_START}\n${content}\n${MARKER_END}\n`;
    if (!opts.dryRun) {
      await writeFile(destPath, newContent, "utf8");
    }
    return true;
  }

  const startIdx = existing.indexOf(MARKER_START);
  const endIdx = existing.indexOf(MARKER_END);

  const hasStart = startIdx !== -1;
  const hasEnd = endIdx !== -1;

  if (hasStart !== hasEnd) {
    throw new MalformedMarkersError(
      `File "${relativePath}" has mismatched arcane markers: ` +
        `${hasStart ? "start found" : "start missing"}, ` +
        `${hasEnd ? "end found" : "end missing"}.`,
    );
  }

  if (hasStart && hasEnd) {
    if (startIdx > endIdx) {
      throw new MalformedMarkersError(
        `File "${relativePath}" has arcane markers in wrong order (end before start).`,
      );
    }
    // Replace content between the markers (keeps marker lines themselves intact)
    const beforeMarker = existing.slice(0, startIdx + MARKER_START.length);
    const afterMarker = existing.slice(endIdx);
    const updated = `${beforeMarker}\n${content}\n${afterMarker}`;
    if (!opts.dryRun) {
      await writeFile(destPath, updated, "utf8");
    }
    return true;
  }

  // No markers — append only if --force
  if (!opts.force) return false;

  const appended =
    `${existing}${existing.endsWith("\n") ? "" : "\n"}` +
    `${MARKER_START}\n${content}\n${MARKER_END}\n`;
  if (!opts.dryRun) {
    await writeFile(destPath, appended, "utf8");
  }
  return true;
}

/**
 * Removes the `<!-- arcane:start -->…<!-- arcane:end -->` block from a file.
 *
 * - If the file has no markers, returns false (no-op).
 * - If the file is empty (or whitespace-only) after stripping, deletes the file.
 * - Otherwise rewrites the file without the marker block.
 *
 * @returns true if the file was modified or deleted, false if untouched.
 */
export async function stripMarkerSection(
  targetDir: string,
  relativePath: string,
  opts: { dryRun?: boolean } = {},
): Promise<boolean> {
  const destPath = path.resolve(targetDir, relativePath);

  let existing: string;
  try {
    existing = await readFile(destPath, "utf8");
  } catch {
    return false; // file doesn't exist
  }

  const startIdx = existing.indexOf(MARKER_START);
  const endIdx = existing.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1) return false;

  const before = existing.slice(0, startIdx);
  const after = existing.slice(endIdx + MARKER_END.length);
  const stripped = (before + after).replace(/\n{3,}/g, "\n\n").trim();

  if (!opts.dryRun) {
    if (stripped.length === 0) {
      await rm(destPath, { force: true });
    } else {
      await writeFile(destPath, stripped + "\n", "utf8");
    }
  }
  return true;
}
