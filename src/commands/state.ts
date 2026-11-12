import { AgentConfigValidationError } from "../modules/agent-loader.js";
import { ManifestNotFoundError, readSelfHostedSourceMarker } from "../modules/manifest.js";
import { collectState, type CollectStateOptions } from "../modules/state/collect.js";
import { serializeState } from "../modules/state/serialize.js";

export interface StateCliOptions {
  /** Print the document. Required: there is no human rendering (spell status is the human view). */
  json?: boolean;
  /** Run the network reads: npm latest and the pull-request lookup (PRD ST-13). */
  online?: boolean;
  /** Hub only: add this machine's clone path per registered repository (PRD ST-07). */
  includeLocalPaths?: boolean;
}

export interface StateCliDeps {
  /** The collector; tests inject one. */
  collect?: (cwd: string, packageVersion: string, options: CollectStateOptions) => ReturnType<typeof collectState>;
  /** Writes the document; defaults to process.stdout. */
  write?: (text: string) => Promise<void>;
}

const USAGE_POINTER = "spell state prints one JSON document to stdout: run `spell state --json` (spell status is the human view).";
const SELF_HOSTED_MANIFEST_MESSAGE =
  "Self-hosted Arcane repository: spell state cannot determine versions.files or components without a root .arcane.json.";

function writeStdout(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(text, (error) => (error ? reject(error) : resolve()));
  });
}

/**
 * `spell state --json` (ARC-044 decision 1): one JSON document on stdout,
 * nothing else, exit 0. Diagnostics go to stderr only. Exit 1 with `spell
 * status`'s wording when there is no manifest (or a self-hosted-specific
 * message for the framework source), exit 1 on a malformed roster
 * or an unwritable stdout, exit 2 without `--json` (architecture D12).
 */
export async function runState(
  targetDir: string,
  packageVersion: string,
  options: StateCliOptions = {},
  deps: StateCliDeps = {},
): Promise<void> {
  if (!options.json) {
    console.error(USAGE_POINTER);
    process.exitCode = 2;
    return;
  }

  const collect = deps.collect ?? collectState;
  let text: string;
  try {
    const doc = await collect(targetDir, packageVersion, {
      online: options.online === true,
      includeLocalPaths: options.includeLocalPaths === true,
    });
    text = serializeState(doc);
  } catch (error) {
    if (error instanceof ManifestNotFoundError) {
      console.error((await readSelfHostedSourceMarker(targetDir)) ? SELF_HOSTED_MANIFEST_MESSAGE : 'Not initialized. Run "spell init" first.');
    } else if (error instanceof AgentConfigValidationError) {
      // The loader's own message, as spell agents list prints it (PRD ST-12).
      console.error(error.message);
    } else {
      console.error(`spell state: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exitCode = 1;
    return;
  }

  try {
    await (deps.write ?? writeStdout)(text);
  } catch (error) {
    console.error(`spell state: stdout is not writable (${error instanceof Error ? error.message : String(error)})`);
    process.exitCode = 1;
  }
}
