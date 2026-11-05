import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { createFixtureDir } from "./fixture-dir.js";

/**
 * The built bundle laid out the way `npm install -g arcane-cli` lays it out:
 *
 *   <root>/node_modules/arcane-cli/package.json     (written by the test)
 *   <root>/node_modules/arcane-cli/dist/index.js    (a byte copy of the build)
 *   <root>/node_modules/arcane-cli/node_modules/    (the dependencies)
 *
 * Tests that import `src/` run each module from its own folder, so a path
 * that is only right from `src/modules/` passes there and breaks in the one
 * bundled file. Running this copy is what shows the difference: from
 * `dist/index.js` the package's own `package.json` is one folder up, and one
 * folder further is `node_modules/`, which has none.
 */
export interface InstalledCli {
  /** The temp prefix. Remove it with `removeFixtureDir`. */
  root: string;
  /** `<root>/node_modules/arcane-cli`. */
  packageDir: string;
  /** `<packageDir>/dist/index.js`. */
  bin: string;
}

/**
 * Install a copy of the built CLI under a fresh temp prefix, with
 * `packageJson` as the package's own `package.json` (`name` and `type` are
 * filled in). The package under test names its registry there, so a test can
 * point `publishConfig.registry` at a stub and reach no public network.
 */
export async function installBuiltCli(
  builtCli: string,
  packageJson: Record<string, unknown>,
): Promise<InstalledCli> {
  const root = await createFixtureDir("installed-cli");
  const packageDir = join(root, "node_modules", "arcane-cli");
  const bin = join(packageDir, "dist", "index.js");
  await fs.mkdir(dirname(bin), { recursive: true });
  await fs.copyFile(builtCli, bin);
  await fs.writeFile(
    join(packageDir, "package.json"),
    JSON.stringify({ name: "arcane-cli", type: "module", ...packageJson }, null, 2),
  );
  // The bundle keeps its dependencies external, and npm installs them beside
  // the package. A directory link to the build's own node_modules stands in
  // for that install; "junction" needs no privilege on Windows and is an
  // ordinary symlink elsewhere. `fs.rm` removes the link, never its target.
  await fs.symlink(
    join(dirname(dirname(builtCli)), "node_modules"),
    join(packageDir, "node_modules"),
    "junction",
  );
  return { root, packageDir, bin };
}

export interface StubRegistry {
  /** The registry base URL, with a trailing slash, as `publishConfig.registry` spells it. */
  url: string;
  /** Every request received, as `METHOD path`. */
  requests: string[];
  close(): Promise<void>;
}

/**
 * A loopback npm registry that knows one package, `arcane-cli`, and its
 * `latest` tag. With `latest` null it is a registry that is down: every
 * request gets a 503.
 */
export async function startStubRegistry(latest: string | null): Promise<StubRegistry> {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    if (latest === null) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end("{}");
    } else if (req.url === "/arcane-cli") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ name: "arcane-cli", "dist-tags": { latest } }));
    } else {
      res.writeHead(404, { "content-type": "application/json" });
      res.end("{}");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export interface CliRun {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a CLI entrypoint with this process's Node and wait for it without
 * blocking the event loop (a stub registry in this process has to answer
 * while the CLI runs, which `spawnSync` would prevent). `home` replaces the
 * user's home directory, so the run neither reads nor writes the real
 * `~/.arcane` (the 24-hour version cache lives there).
 */
export function runCli(
  bin: string,
  args: string[],
  options: { cwd: string; home: string },
): Promise<CliRun> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [bin, ...args],
      {
        cwd: options.cwd,
        encoding: "utf8",
        env: { ...process.env, HOME: options.home, USERPROFILE: options.home },
      },
      (error, stdout, stderr) => {
        const code = error === null ? 0 : typeof error.code === "number" ? error.code : 1;
        resolve({ code, stdout, stderr });
      },
    );
  });
}
