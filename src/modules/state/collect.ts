/**
 * The orchestrator (architecture D1, D12): reads the manifest, resolves the
 * repository root by real path (ARC-057), runs every section collector,
 * gathers their warnings and assembles the envelope. One hard failure is
 * raised from here -- no manifest (`ManifestNotFoundError`, which the
 * command turns into `spell status`'s wording and exit 1); every other
 * source degrades to null plus a `warnings[]` line, so a client never loses
 * the whole document to one unreadable source.
 */

import { AgentConfigValidationError } from "../agent-loader.js";
import { readManifest } from "../manifest.js";
import { resolveRealPath } from "../real-path.js";
import { misplacedUserManifestMessage, resolveInstallScope } from "../user-tier.js";
import { collectAgents } from "./agents.js";
import { collectBook } from "./books.js";
import { collectConfig } from "./config.js";
import { collectDecisions } from "./decisions.js";
import { collectFeatures } from "./features.js";
import { collectGit, type RunGitFn } from "./git.js";
import { collectJournal } from "./journal.js";
import { collectPullRequest, type ExecFn } from "./pull-request.js";
import { collectRegistry } from "./registry.js";
import { STATE_SCHEMA_VERSION, type StateDocument } from "./types.js";
import { collectVersions } from "./versions.js";

export interface CollectStateOptions {
  /** Run the two network reads: the npm lookup and the pull-request lookup (PRD ST-13). */
  online: boolean;
  /** Hub only: add each repo's clone path on this machine (PRD ST-07). */
  includeLocalPaths: boolean;
  /** The clock; tests pin it. */
  now?: () => Date;
  /** This machine's name for the local-path match; tests pass one. */
  hostname?: string;
  /** The git runner; tests inject one. */
  runGit?: RunGitFn;
  /** The process runner for the pull-request lookup (gh / az); tests inject one. */
  exec?: ExecFn;
  /** The home the user-tier store sits under, for the roster fallback; tests point it at a temp directory. */
  homeDir?: string;
  /** Forwarded to collectVersions when online. */
  feedUrl?: string;
  cachePath?: string;
}

/**
 * Runs one collector; an exception it did not expect becomes a null section
 * and one warning, never a lost document. A malformed roster is the one
 * exception: it is a hard failure by contract (PRD ST-12) and propagates.
 */
async function guarded<T>(
  section: string,
  warnings: string[],
  run: () => Promise<{ value: T; warnings: string[] }>,
  fallback: T,
): Promise<T> {
  try {
    const result = await run();
    warnings.push(...result.warnings);
    return result.value;
  } catch (error) {
    if (error instanceof AgentConfigValidationError) throw error;
    warnings.push(`${section}: collector failed (${error instanceof Error ? error.message : String(error)}); the section is null`);
    return fallback;
  }
}

export async function collectState(
  cwd: string,
  packageVersion: string,
  options: CollectStateOptions,
): Promise<StateDocument> {
  const manifest = await readManifest(cwd);
  const root = resolveRealPath(cwd);
  const warnings: string[] = [];

  const resolvedScope = resolveInstallScope(cwd, manifest.scope, false);
  if (resolvedScope.misplacedUserManifest) warnings.push(`repository.scope: ${misplacedUserManifestMessage(cwd)}`);

  const versions = await guarded(
    "versions",
    warnings,
    async () => {
      const result = await collectVersions(manifest, packageVersion, {
        online: options.online,
        ...(options.feedUrl === undefined ? {} : { feedUrl: options.feedUrl }),
        ...(options.cachePath === undefined ? {} : { cachePath: options.cachePath }),
      });
      return { value: result.versions, warnings: result.warnings };
    },
    {
      files: manifest.version,
      cli: packageVersion,
      latest: null,
      drift: { files_behind_cli: false, cli_behind_latest: null },
      components: [],
    },
  );

  const git = await guarded(
    "git",
    warnings,
    async () => {
      const result = await collectGit(cwd, root, options.runGit === undefined ? {} : { runGit: options.runGit });
      return { value: result.git, warnings: result.warnings };
    },
    null,
  );

  if (options.online && git !== null) {
    git.pull_request = await guarded(
      "git.pull_request",
      warnings,
      async () => {
        const result = await collectPullRequest(git, options.exec === undefined ? {} : { exec: options.exec });
        return { value: result.pull_request, warnings: result.warnings };
      },
      null,
    );
  }

  const decisions = await guarded(
    "indexes.decisions",
    warnings,
    async () => {
      const result = await collectDecisions(root);
      return { value: result.decisions, warnings: result.warnings };
    },
    null,
  );
  const book = (fileName: string) =>
    guarded(
      `indexes.${fileName}`,
      warnings,
      async () => {
        const result = await collectBook(root, fileName);
        return { value: result.book, warnings: result.warnings };
      },
      null,
    );
  const todos = await book("TODO.md");
  const ideas = await book("IDEAS.md");
  const done = await book("DONE.md");
  const journal = await guarded(
    "indexes.journal",
    warnings,
    async () => {
      const result = await collectJournal(root);
      return { value: result.journal, warnings: result.warnings };
    },
    null,
  );

  const registry = await guarded(
    "registry",
    warnings,
    async () => {
      const result = await collectRegistry(root, manifest, {
        includeLocalPaths: options.includeLocalPaths,
        ...(options.hostname === undefined ? {} : { hostname: options.hostname }),
      });
      return { value: result.registry, warnings: result.warnings };
    },
    null,
  );

  const features = await guarded(
    "features",
    warnings,
    async () => {
      const result = await collectFeatures(root);
      return { value: result.features, warnings: result.warnings };
    },
    null,
  );

  const agents = await guarded(
    "agents",
    warnings,
    async () => {
      const result = await collectAgents(cwd, options.homeDir === undefined ? {} : { homeDir: options.homeDir });
      return { value: result.agents, warnings: result.warnings };
    },
    null,
  );

  const now = options.now ?? (() => new Date());

  return {
    schema_version: STATE_SCHEMA_VERSION,
    generated_at: now().toISOString(),
    generator: { name: "arcane-cli", version: packageVersion },
    repository: {
      root,
      scope: resolvedScope.scope,
      role: manifest.role ?? "consumer",
      profile: manifest.profile,
    },
    versions,
    git,
    indexes: { decisions, todos, ideas, done, journal },
    config: collectConfig(manifest),
    registry,
    features,
    agents,
    warnings,
  };
}
