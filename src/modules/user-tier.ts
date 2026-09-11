/**
 * User tier (ARC-045 decision 3 / CS-04): the per-user Arcane store at
 * `~/.arcane/` and the fan-out of generated client shims into each client's
 * home-directory discovery root.
 *
 * The store is a repo-shaped Arcane target -- it has its own `.arcane.json`
 * and is written by the same copier/manifest/hash machinery a repository is
 * -- that holds canonical spells only (`~/.arcane/spells/<id>.md`). No client
 * reads a repository-relative shim from the store, so none is installed
 * there; instead `syncUserTierFanout()` renders the two user-level shims per
 * spell with an ABSOLUTE canonical path and writes them where the clients
 * already look:
 *
 *   ~/.agents/skills/<id>/SKILL.md   Codex CLI/extension AND VS Code Copilot
 *   ~/.claude/commands/<id>.md        Claude Code (personal commands)
 *
 * Copilot is served by the Codex file on purpose: VS Code discovers agent
 * skills from `~/.agents/skills` by default (and from `~/.claude/skills`,
 * which is exactly why the Claude shim is a command and not a skill -- a
 * skill there would list every spell twice in Copilot's picker), and it has
 * deprecated the `chat.*FilesLocations` settings a printed snippet would
 * have pointed at (vendor documentation fetched 2026-09-09; see
 * features/codex-support/architecture.md, CS-04 findings). Nothing in this
 * module reads or writes VS Code settings; `VSCODE_USER_TIER_NOTE` is what
 * the commands print instead of a snippet.
 *
 * The fan-out files live outside any Arcane target directory, so they are
 * written with node:fs directly rather than through `copier.copyFile()`,
 * whose traversal guard exists precisely to forbid that for repository
 * installs -- the shape `agent-generator.ts` already uses for OpenClaw
 * workspaces under `~/.openclaw`. What was written is recorded in the store
 * manifest's `fanout` map (home-relative POSIX path -> SHA-256), and every
 * later run reconciles against that record under ARC-038's rule: a file whose
 * content no longer matches what Arcane wrote is the operator's and is never
 * overwritten or deleted; a file Arcane never recorded is not Arcane's at all
 * and is never claimed.
 */

import { lstat, mkdir, readdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileMatchesHash, hashContent, hashFile, validateTargetPath } from "./copier.js";
import { SPELL_COMPONENT_NAMES } from "./registry.js";
import {
  canonicalSpellPath,
  parsePromptFrontmatter,
  renderClaudeCommandStub,
  renderCodexSkill,
} from "./spell-compiler.js";
import type { InstallScope, InstalledComponent, RegistryComponent } from "../types.js";

// ─── Locations ────────────────────────────────────────────────────────────────

/** Name of the store directory under the home directory. */
export const USER_TIER_DIR_NAME = ".arcane";

/** Directory inside the store that holds the canonical spells. */
export const USER_TIER_SPELLS_DIR = "spells";

/**
 * The home directory, resolved on every call -- never at module load. Node's
 * `os.homedir()` follows `USERPROFILE` (Windows) / `HOME` (POSIX) at call
 * time, which is what lets tests point the whole tier at a temp directory by
 * setting the environment instead of mocking this function.
 */
export function resolveHomeDir(): string {
  return homedir();
}

/** The store root: `~/.arcane`. Always a direct child of the home directory. */
export function userTierRoot(homeDir: string = resolveHomeDir()): string {
  return join(homeDir, USER_TIER_DIR_NAME);
}

/**
 * The components the user tier installs: every capability-scoped spell
 * component, un-profiled. The tier carries spell delivery content only
 * (ARC-045 decision 5) -- governance, continuity files and repository
 * configuration stay with the repository.
 */
export const USER_TIER_COMPONENTS: readonly string[] = SPELL_COMPONENT_NAMES;

const CANONICAL_SPELL_PATH_PATTERN = /^\.arcane\/spells\/(spell-[a-z0-9-]+)\.md$/;
const STORE_SPELL_PATH_PATTERN = /^spells\/(spell-[a-z0-9-]+)\.md$/;

/** Store-relative path of a canonical spell: `spells/<id>.md`. */
export function storeSpellPath(id: string): string {
  return `${USER_TIER_SPELLS_DIR}/${id}.md`;
}

/** The spell id of a registry-relative canonical path (`.arcane/spells/<id>.md`), or undefined. */
export function spellIdFromCanonicalPath(path: string): string | undefined {
  return path.replace(/\\/g, "/").match(CANONICAL_SPELL_PATH_PATTERN)?.[1];
}

/** The spell id of a store-relative path (`spells/<id>.md`), or undefined. */
export function spellIdFromStorePath(path: string): string | undefined {
  return path.replace(/\\/g, "/").match(STORE_SPELL_PATH_PATTERN)?.[1];
}

/**
 * The absolute path of a spell in the store, with forward slashes on every
 * platform -- the form Codex accepted verbatim in the CS-04 probe, valid on
 * Windows, and free of backslash escaping inside Markdown and YAML.
 */
export function absoluteStoreSpellPath(storeRoot: string, id: string): string {
  return resolve(storeRoot, storeSpellPath(id)).replace(/\\/g, "/");
}

// ─── The scope-aware view of the registry ─────────────────────────────────────

/**
 * A component as the given scope installs it. For `"repo"` that is the
 * component itself. For `"user"` it keeps only the canonical spell files,
 * installs each at `spells/<id>.md` and maps it back to its asset through
 * `sourceOverrides` -- the mechanism the registry already uses for dotfiles
 * -- so `init`, `update` (including the ARC-038 merge, which fetches the
 * previously published file by that asset path) and `uninstall` run their
 * ordinary code over the store. The three repository-relative shims are
 * dropped: nothing reads them from the store, and the user-level shims are
 * rendered by the fan-out instead. `directories`, `skipExisting` and
 * `initOnly` are not carried because no spell component has them.
 */
export function componentForScope(
  component: RegistryComponent,
  scope: InstallScope,
): RegistryComponent {
  if (scope === "repo") return component;

  const files: string[] = [];
  const sourceOverrides: Record<string, string> = {};
  for (const file of component.files) {
    const id = spellIdFromCanonicalPath(file);
    if (id === undefined) continue;
    const installed = storeSpellPath(id);
    files.push(installed);
    sourceOverrides[installed] = component.sourceOverrides?.[file] ?? file;
  }
  return { name: component.name, description: component.description, files, sourceOverrides };
}

/**
 * A component as a REPOSITORY installs it under its `spell_scope`
 * (ARC-045 decision 4 / CS-05). Identity for `"repo"`, the default and the
 * meaning of every manifest that omits the field. For `"user"` a
 * spell-delivering component installs nothing -- the repository takes its
 * spells from the machine-wide store instead -- and every other component is
 * returned untouched, because governance, instructions, continuity files,
 * hooks and templates never move tier (ARC-045 decision 5).
 *
 * Which components deliver spells is derived, never hand-listed: filtering
 * by path prefix instead would put the client-surface shapes in a fourth
 * place beside CLIENT_SHIM_PATHS, CLIENT_SHIM_PATH_PATTERNS and
 * CANONICAL_SPELLS_DIR, and would silently miss a fifth client the day one
 * is added. A test pins that the two definitions -- components named
 * `spells-*`, and components carrying a canonical or shim path -- coincide.
 *
 * Orthogonal to componentForScope above: that one answers "what does the
 * STORE install", this one "what does a REPOSITORY install". Composed only
 * in the repo scope; the store itself has no spell_scope.
 */
export function componentForSpellScope(
  component: RegistryComponent,
  spellScope: InstallScope,
): RegistryComponent {
  if (spellScope === "repo") return component;
  if (!SPELL_COMPONENT_NAMES.includes(component.name)) return component;
  return { ...component, files: [] };
}

/**
 * A repository's effective spell scope: the manifest's field, or `"repo"`
 * when it is absent. One place, so no caller has to remember that absent
 * means repo.
 */
export function effectiveSpellScope(manifest: { spell_scope?: InstallScope }): InstallScope {
  return manifest.spell_scope ?? "repo";
}
/** The spell ids a store manifest's components track, deduplicated and sorted. */
export function spellIdsInStore(components: InstalledComponent[]): string[] {
  const ids = new Set<string>();
  for (const component of components) {
    for (const file of component.files) {
      const id = spellIdFromStorePath(file);
      if (id !== undefined) ids.add(id);
    }
  }
  return [...ids].sort();
}

// ─── The fan-out ──────────────────────────────────────────────────────────────

export type FanoutClient = "codex" | "claude";

/** Where each client's user-level shim goes, relative to the home directory. */
export const USER_FANOUT_PATHS: Readonly<Record<FanoutClient, (id: string) => string>> = {
  codex: (id) => `.agents/skills/${id}/SKILL.md`,
  claude: (id) => `.claude/commands/${id}.md`,
};

/** Human-readable label per client, for command output. */
export const FANOUT_CLIENT_LABELS: Readonly<Record<FanoutClient, string>> = {
  codex: "Codex/Copilot skills",
  claude: "Claude Code commands",
};

/** The client a recorded fan-out path belongs to, or undefined for an unknown shape. */
export function clientOfFanoutPath(relativePath: string): FanoutClient | undefined {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.startsWith(".agents/skills/")) return "codex";
  if (normalized.startsWith(".claude/commands/")) return "claude";
  return undefined;
}

export interface FanoutFile {
  /** Home-relative POSIX path. */
  relativePath: string;
  client: FanoutClient;
  content: string;
}

export interface RenderedFanout {
  files: FanoutFile[];
  /** Spell ids whose source could be read from neither the store nor the fallback. */
  missing: string[];
}

async function readSpellSource(
  storeRoot: string,
  id: string,
  fallbackDir: string | undefined,
): Promise<string | undefined> {
  for (const candidate of [
    join(storeRoot, storeSpellPath(id)),
    ...(fallbackDir ? [join(fallbackDir, canonicalSpellPath(id))] : []),
  ]) {
    try {
      return await readFile(candidate, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  return undefined;
}

/**
 * Renders the desired fan-out for the given spells: the Codex skill and the
 * Claude command per spell, each pointing at the spell's absolute path in
 * the store. The frontmatter comes from the store copy, or -- when that file
 * is missing and `fallbackDir` (the CLI's assets root) is given -- from the
 * vendor asset the next restore would write, which is what lets a dry run
 * preview the fan-out before anything has been restored. A spell with
 * neither source is reported in `missing`, never thrown on.
 */
export async function renderUserFanout(
  storeRoot: string,
  spellIds: string[],
  fallbackDir?: string,
): Promise<RenderedFanout> {
  const files: FanoutFile[] = [];
  const missing: string[] = [];
  for (const id of [...spellIds].sort()) {
    const canonical = await readSpellSource(storeRoot, id, fallbackDir);
    if (canonical === undefined) {
      missing.push(id);
      continue;
    }
    const frontmatter = parsePromptFrontmatter(canonical);
    const absolutePath = absoluteStoreSpellPath(storeRoot, id);
    files.push({
      relativePath: USER_FANOUT_PATHS.codex(id),
      client: "codex",
      content: renderCodexSkill(id, frontmatter, absolutePath),
    });
    files.push({
      relativePath: USER_FANOUT_PATHS.claude(id),
      client: "claude",
      content: renderClaudeCommandStub(id, frontmatter, absolutePath),
    });
  }
  return { files, missing };
}

type TargetState = "absent" | "file" | "other";

/**
 * What is at a fan-out path, without following links: nothing, a regular
 * file, or something else (a directory, a symlink -- dangling or not -- a
 * device). Only a regular file is ever hashed, rewritten or deleted; anything
 * else is left exactly as found. `lstat` rather than `access`/`stat` so a
 * symlink an operator planted at the path is seen as the link, never written
 * through to wherever it points.
 */
async function classifyTarget(path: string): Promise<TargetState> {
  try {
    const stats = await lstat(path);
    return stats.isFile() ? "file" : "other";
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "absent";
    throw err;
  }
}

export type FanoutStatus =
  /** Created, or rewritten because the rendered content changed. */
  | "written"
  /** On disk, hash-matched, content current. */
  | "unchanged"
  /** Recorded, but the operator edited it: kept byte-untouched, recorded hash carried forward. */
  | "customized"
  /** A same-named file Arcane never recorded, or something that is not a regular file: kept, warned, not claimed. */
  | "collision"
  /** No longer desired, hash-matched: deleted (and its per-spell directory, once empty). */
  | "pruned"
  /** No longer desired, but edited since Arcane wrote it (or no longer a regular file): kept, still recorded. */
  | "kept-edited"
  /** No longer desired and already gone from disk: record dropped. */
  | "gone"
  /** Desired, but the spell's source is missing from the store and the fallback: nothing written or deleted, record carried forward. */
  | "unrenderable";

export interface FanoutOutcome {
  relativePath: string;
  status: FanoutStatus;
}

export interface FanoutSyncResult {
  /** The record to persist as the manifest's `fanout` field. */
  record: Record<string, string>;
  outcomes: FanoutOutcome[];
}

export interface FanoutSyncOptions {
  /** The home directory the fan-out paths are relative to (the store's parent). */
  homeDir: string;
  storeRoot: string;
  /** Spells that should have fan-out files after this run; empty on uninstall. */
  spellIds: string[];
  /** The manifest's current `fanout` record, if any. */
  previous?: Record<string, string>;
  dryRun?: boolean;
  /** The CLI's assets root: renders a spell whose store copy is missing from the vendor asset instead (see renderUserFanout). */
  fallbackDir?: string;
}

/**
 * The per-spell directory a recorded path lives in, when its shape has one
 * (`.agents/skills/<id>/SKILL.md` -> `.agents/skills/<id>`). The Claude shape
 * has none: `.claude/commands/` is the client's own directory and is never
 * removed, even when Arcane's file was the last thing in it.
 */
function perSpellDirectory(homeDir: string, relativePath: string): string | undefined {
  if (clientOfFanoutPath(relativePath) !== "codex") return undefined;
  return dirname(join(homeDir, relativePath));
}

/**
 * Removes `dir` only when it exists and is empty; silent otherwise. `rmdir`
 * on purpose, not `rm`: it removes exactly an empty directory and refuses a
 * non-empty one, so a file that appeared between the check and the removal
 * is never taken with it.
 */
export async function removeDirectoryIfEmpty(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir);
    if (entries.length === 0) await rmdir(dir);
  } catch {
    // Already gone, not a directory, or no longer empty -- nothing to remove.
  }
}

/**
 * Reconciles the desired fan-out against what the manifest recorded, writing
 * only what is safe to write and deleting only what is safe to delete:
 *
 * | on disk                     | recorded | action                                       |
 * |-----------------------------|----------|----------------------------------------------|
 * | absent                      | –        | write, record                                |
 * | present, hash == recorded   | yes      | rewrite only if the rendered content changed |
 * | present, hash != recorded   | yes      | keep, "customized", carry the hash forward   |
 * | present                     | no       | keep, "collision", never record              |
 * | recorded, no longer desired | yes      | delete only if hash == recorded; else keep   |
 *
 * Dry-run performs no I/O beyond reading and reports the same decisions.
 */
export async function syncUserTierFanout(options: FanoutSyncOptions): Promise<FanoutSyncResult> {
  const rendered = await renderUserFanout(options.storeRoot, options.spellIds, options.fallbackDir);
  const desired = rendered.files;
  const previous = options.previous ?? {};
  const dryRun = Boolean(options.dryRun);
  const record: Record<string, string> = {};
  const outcomes: FanoutOutcome[] = [];
  const desiredPaths = new Set(desired.map((f) => f.relativePath));

  // A spell whose source is gone from both the store and this CLI's assets
  // (a component the registry no longer ships, whose store file --prune
  // already removed) cannot be rendered. Its client files are neither
  // rewritten nor pruned -- they still point at a spell the operator may
  // restore -- and stay recorded so a later run recognizes them.
  for (const id of rendered.missing) {
    for (const client of ["codex", "claude"] as const) {
      const relativePath = USER_FANOUT_PATHS[client](id);
      desiredPaths.add(relativePath);
      if (previous[relativePath] !== undefined) record[relativePath] = previous[relativePath];
      outcomes.push({ relativePath, status: "unrenderable" });
    }
  }

  for (const file of desired) {
    // Template-derived, so this cannot fail -- kept as the same invariant the
    // prune loop below enforces on recorded keys.
    validateTargetPath(options.homeDir, file.relativePath);
    const target = join(options.homeDir, file.relativePath);
    const recorded = previous[file.relativePath];
    const newHash = hashContent(file.content);
    const state = await classifyTarget(target);

    if (state === "absent") {
      if (!dryRun) {
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, file.content, "utf-8");
      }
      record[file.relativePath] = newHash;
      outcomes.push({ relativePath: file.relativePath, status: "written" });
      continue;
    }

    if (state === "other" || recorded === undefined) {
      // Not ours: an operator's own skill or command that happens to share
      // the spell's name, or a directory or symlink where a file would go.
      // Recording it would claim it, and `uninstall --user` deletes what the
      // record lists; writing through a symlink would land wherever it points.
      outcomes.push({ relativePath: file.relativePath, status: "collision" });
      continue;
    }

    if (!(await fileMatchesHash(target, recorded))) {
      record[file.relativePath] = recorded;
      outcomes.push({ relativePath: file.relativePath, status: "customized" });
      continue;
    }
    const currentHash = await hashFile(target);
    if (currentHash === newHash) {
      record[file.relativePath] = newHash;
      outcomes.push({ relativePath: file.relativePath, status: "unchanged" });
      continue;
    }
    if (!dryRun) await writeFile(target, file.content, "utf-8");
    record[file.relativePath] = newHash;
    outcomes.push({ relativePath: file.relativePath, status: "written" });
  }

  for (const [relativePath, recorded] of Object.entries(previous)) {
    if (desiredPaths.has(relativePath)) continue;
    // Recorded keys are validated when the manifest is read
    // (isValidFanoutPath); this is the module's own guard, so a caller that
    // hands over an unvalidated record still cannot delete outside home.
    validateTargetPath(options.homeDir, relativePath);
    const target = join(options.homeDir, relativePath);
    const state = await classifyTarget(target);
    if (state === "absent") {
      outcomes.push({ relativePath, status: "gone" });
      continue;
    }
    // Not a regular file any more (a directory or a link now sits there), or
    // edited since Arcane wrote it: never deleted, still recorded.
    if (state === "other" || !(await fileMatchesHash(target, recorded))) {
      record[relativePath] = recorded;
      outcomes.push({ relativePath, status: "kept-edited" });
      continue;
    }
    if (!dryRun) {
      await rm(target, { force: true });
      const spellDir = perSpellDirectory(options.homeDir, relativePath);
      if (spellDir !== undefined) await removeDirectoryIfEmpty(spellDir);
    }
    outcomes.push({ relativePath, status: "pruned" });
  }

  return { record, outcomes };
}

/** Counts outcomes by status, for one-line summaries. */
export function summarizeFanout(outcomes: FanoutOutcome[]): Record<FanoutStatus, number> {
  const counts: Record<FanoutStatus, number> = {
    written: 0,
    unchanged: 0,
    customized: 0,
    collision: 0,
    pruned: 0,
    "kept-edited": 0,
    gone: 0,
    unrenderable: 0,
  };
  for (const outcome of outcomes) counts[outcome.status]++;
  return counts;
}

/**
 * Lines describing a sync's outcomes for command output -- one summary line
 * for what was written or pruned, then a warning block per state the
 * operator needs to know about (customized, collision, kept-edited). Files
 * that were unchanged or already gone produce no line. Pure: the commands
 * print these.
 */
export function describeFanoutOutcomes(outcomes: FanoutOutcome[], dryRun = false): string[] {
  const counts = summarizeFanout(outcomes);
  const lines: string[] = [];
  const prefix = dryRun ? "[dry-run] Would " : "";
  const byClient = (status: FanoutStatus): Record<FanoutClient, number> => {
    const n: Record<FanoutClient, number> = { codex: 0, claude: 0 };
    for (const o of outcomes) {
      if (o.status !== status) continue;
      const client = clientOfFanoutPath(o.relativePath);
      if (client !== undefined) n[client]++;
    }
    return n;
  };
  const paths = (status: FanoutStatus): string =>
    outcomes
      .filter((o) => o.status === status)
      .map((o) => `    ~/${o.relativePath}`)
      .join("\n");

  if (counts.written > 0) {
    const n = byClient("written");
    lines.push(
      `${prefix}${dryRun ? "write" : "Wrote"} ${counts.written} client file(s): ${n.codex} ${FANOUT_CLIENT_LABELS.codex}, ${n.claude} ${FANOUT_CLIENT_LABELS.claude}.`,
    );
  }
  if (counts.pruned > 0) {
    lines.push(`${prefix}${dryRun ? "remove" : "Removed"} ${counts.pruned} client file(s) no longer needed.`);
  }
  if (counts.customized > 0) {
    lines.push(
      `! ${dryRun ? "Would keep" : "Kept"} ${counts.customized} customized client file(s) untouched (edited since Arcane wrote them):\n${paths("customized")}\n  Delete one to have it regenerated by the next \`spell update --user\`.`,
    );
  }
  if (counts.collision > 0) {
    lines.push(
      `! ${dryRun ? "Would leave" : "Left"} ${counts.collision} existing path(s) alone (not written by Arcane — a skill or command of the same name, a directory or a link already exists there):\n${paths("collision")}\n  Move or rename it and run \`spell update --user\` to install Arcane's.`,
    );
  }
  if (counts.unrenderable > 0) {
    lines.push(
      `! ${dryRun ? "Would keep" : "Kept"} ${counts.unrenderable} client file(s) whose spell source is missing from the store and from this CLI (left as they are):\n${paths("unrenderable")}\n  Restore the spell with \`spell update --user\`, or delete these files if the spell is no longer shipped.`,
    );
  }
  if (counts["kept-edited"] > 0) {
    lines.push(
      `! ${dryRun ? "Would keep" : "Kept"} ${counts["kept-edited"]} edited client file(s) that Arcane no longer needs (delete them yourself if unwanted):\n${paths("kept-edited")}`,
    );
  }
  return lines;
}

export interface FanoutHealth {
  /** Recorded files. */
  total: number;
  byClient: Record<FanoutClient, number>;
  /** Recorded files no longer on disk. */
  missing: string[];
  /** Recorded files whose content no longer matches what Arcane wrote. */
  customized: string[];
}

/**
 * Read-only view of the recorded fan-out for `status` and `doctor`: how many
 * files each client has, and which are missing or edited. Never writes.
 */
export async function inspectUserTierFanout(
  homeDir: string,
  record: Record<string, string> | undefined,
): Promise<FanoutHealth> {
  const health: FanoutHealth = {
    total: 0,
    byClient: { codex: 0, claude: 0 },
    missing: [],
    customized: [],
  };
  for (const [relativePath, recorded] of Object.entries(record ?? {})) {
    health.total++;
    const client = clientOfFanoutPath(relativePath);
    if (client !== undefined) health.byClient[client]++;
    const target = join(homeDir, relativePath);
    const state = await classifyTarget(target);
    if (state === "absent") {
      health.missing.push(relativePath);
      continue;
    }
    // A directory or link where Arcane's file was is "not what Arcane wrote",
    // the same as an edit -- and never something to hash or touch.
    if (state === "other" || !(await fileMatchesHash(target, recorded))) health.customized.push(relativePath);
  }
  return health;
}

/**
 * Whether `targetDir` is this machine's store, `~/.arcane`. A manifest with
 * `scope: "user"` found anywhere else -- a backup copy, a moved directory --
 * must not be operated on as the user tier without `--user`: the fan-out is
 * anchored at the store's parent, and that parent would be the wrong home.
 */
export function isUserTierStore(targetDir: string): boolean {
  return resolve(targetDir) === resolve(userTierRoot());
}

/**
 * Resolves which tier a command is operating on. `--user` is authoritative
 * (the CLI entry resolved `targetDir` to the store). Without it, a manifest
 * declaring `scope: "user"` is honored only when `targetDir` IS the store;
 * anywhere else the caller must refuse rather than fan out relative to the
 * wrong directory.
 */
export function resolveInstallScope(
  targetDir: string,
  manifestScope: InstallScope | undefined,
  userFlag: boolean | undefined,
): { scope: InstallScope; misplacedUserManifest: boolean } {
  if (userFlag) return { scope: "user", misplacedUserManifest: false };
  if (manifestScope !== "user") return { scope: "repo", misplacedUserManifest: false };
  return isUserTierStore(targetDir)
    ? { scope: "user", misplacedUserManifest: false }
    : { scope: "repo", misplacedUserManifest: true };
}

/** The message a command prints before exiting when it finds a user-tier manifest outside the store. */
export function misplacedUserManifestMessage(targetDir: string): string {
  return (
    `This .arcane.json belongs to the user tier (scope: "user"), but ${targetDir} is not the store (${userTierRoot()}). ` +
    "Run the command with --user to operate on the store, or from the store directory itself."
  );
}

// ─── What the commands print about VS Code ────────────────────────────────────

/**
 * Printed by `init --user` and `status --user`; never applied. ARC-045
 * decision 3 asked for printed, never auto-applied VS Code guidance; the
 * guidance that turned out to be true is that no setting is needed.
 */
export const VSCODE_USER_TIER_NOTE: readonly string[] = [
  "VS Code Copilot: no settings change is needed — Copilot discovers ~/.agents/skills by default",
  "(chat.useAgentSkills, on by default) and lists each spell under /. Reload the window after installing.",
  "VS Code has deprecated chat.promptFilesLocations; the user tier does not use it.",
];

/**
 * Printed with the note: Claude Code's documented precedence rule, which is
 * the one behavior change an operator sees in repositories that still carry
 * their own shims until CS-05's repo opt-out.
 */
export const CLAUDE_PRECEDENCE_NOTE =
  "Claude Code runs a personal command over a project command of the same name, so /spell-* in a repository that still carries its own shims now runs the user tier's copy.";
