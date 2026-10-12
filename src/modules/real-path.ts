import { realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

/**
 * The absolute path `path` names, with every symlink resolved as far as the
 * path exists.
 *
 * Git prints paths with symlinks resolved (`rev-parse --show-toplevel`,
 * `--path-format=absolute`), so a path spelled through a link -- macOS's
 * default temp directory sits under /var -> /private/var -- never equals what
 * git reports for the same place until it is resolved too. `realpath` rejects a
 * path that does not exist, and callers legitimately ask about one (a token
 * file not created yet, a hooks directory not installed yet), so the nearest
 * ancestor that does exist is resolved and the rest re-appended as spelled.
 *
 * Native rather than Node's JavaScript realpath, which leaves letter case as
 * typed: on a case-insensitive macOS volume the native one turns `/USERS` into
 * `/Users`, as git does.
 */
export function resolveRealPath(path: string): string {
  const missing: string[] = [];
  let existing = path;
  for (;;) {
    try {
      return join(realpathSync.native(existing), ...missing);
    } catch {
      const parent = dirname(existing);
      // Not even the root resolved: fall back to the path as spelled.
      if (parent === existing) return resolve(path);
      missing.unshift(basename(existing));
      existing = parent;
    }
  }
}
