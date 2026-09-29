import { describe, it, expect, afterEach } from "vitest";
import { stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileWithTimeout, resolveAzureCli, type AzureCliProbes } from "../src/modules/exec.js";
import { fetchAdoMergeTypePolicies } from "../src/modules/platform-policy.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { HEAVY_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// The launcher the Azure CLI MSI installs (CRLF line endings; the real file indents its body by two spaces).
const MSI_LAUNCHER = [
  "::",
  ":: Microsoft Azure CLI - Windows Installer - Author file components script",
  ":: Copyright (C) Microsoft Corporation. All Rights Reserved.",
  "::",
  "",
  '@IF EXIST "%~dp0\\..\\python.exe" (',
  "    SET AZ_INSTALLER=MSI",
  '    "%~dp0\\..\\python.exe" -IBm azure.cli %*',
  ") ELSE (",
  "    echo Failed to load python executable.",
  "    exit /b 1",
  ")",
  "",
].join("\r\n");

const PLAIN_AZ = { file: "az", prefixArgs: [] };
const WBIN = "C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin";
const PYTHON = "C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\python.exe";

function winProbes(over: Partial<AzureCliProbes> & { files?: Record<string, string>; existing?: string[] }): AzureCliProbes {
  const files = over.files ?? { [`${WBIN}\\az.cmd`]: MSI_LAUNCHER };
  const existing = new Set(over.existing ?? [PYTHON]);
  return {
    platform: "win32",
    pathEnv: "pathEnv" in over ? over.pathEnv : `C:\\Windows;${WBIN}`,
    readText: over.readText ?? ((p) => files[p]),
    exists: over.exists ?? ((p) => existing.has(p)),
  };
}

describe("resolveAzureCli (R-296a, R-296b)", () => {
  it.each(["linux", "darwin"] as const)("on %s returns plain az with no prefix and never touches the filesystem", (platform) => {
    let touched = false;
    const launch = resolveAzureCli({
      platform,
      pathEnv: "/usr/bin",
      readText: () => ((touched = true), undefined),
      exists: () => ((touched = true), false),
    });
    expect(launch).toEqual({ file: "az", prefixArgs: [] });
    expect(touched).toBe(false);
  });

  it("on win32 launches the CLI's own interpreter from the recognised MSI launcher", () => {
    expect(resolveAzureCli(winProbes({}))).toEqual({
      file: PYTHON,
      prefixArgs: ["-IBm", "azure.cli"],
      env: { AZ_INSTALLER: "MSI" },
    });
  });

  it("skips empty and quoted PATH entries and finds az.cmd further along", () => {
    const launch = resolveAzureCli(winProbes({ pathEnv: `;  ;"C:\\Nope";"${WBIN}";C:\\Later` }));
    expect(launch?.file).toBe(PYTHON);
  });

  it("falls back to plain az, never a shell, when PATH is unset or has no az.cmd", () => {
    expect(resolveAzureCli(winProbes({ pathEnv: undefined }))).toEqual(PLAIN_AZ);
    expect(resolveAzureCli(winProbes({ pathEnv: "C:\\Windows;C:\\Tools" }))).toEqual(PLAIN_AZ);
  });

  it("ignores relative PATH entries, so a launcher in the working directory is never read", () => {
    const read: string[] = [];
    const launch = resolveAzureCli({
      platform: "win32",
      pathEnv: "tools;.;..;",
      readText: (p) => (read.push(p), MSI_LAUNCHER),
      exists: () => true,
    });
    expect(launch).toEqual(PLAIN_AZ);
    expect(read).toEqual([]);
  });

  it("falls back to plain az for a launcher it does not recognise, never guessing", () => {
    for (const body of [
      "@echo off\r\ncalc.exe %*\r\n",
      '"%~dp0\\..\\..\\elsewhere\\python.exe" -IBm azure.cli %*\r\n',
      '"%~dp0\\..\\python.exe" -c "import os" %*\r\n',
      '"%~dp0\\..\\python.exe" -IBm azure.cli\r\n',
      "",
    ]) {
      expect(resolveAzureCli(winProbes({ files: { [`${WBIN}\\az.cmd`]: body } })), JSON.stringify(body)).toEqual(PLAIN_AZ);
    }
  });

  it("falls back to plain az when the launcher is recognised but the interpreter is missing", () => {
    expect(resolveAzureCli(winProbes({ existing: [] }))).toEqual(PLAIN_AZ);
  });
});

describe("execFileWithTimeout env option", () => {
  it("merges the given env over the parent's and never sets shell", async () => {
    const { stdout } = await execFileWithTimeout(
      process.execPath,
      ["-e", "process.stdout.write(JSON.stringify([process.env.ARCANE_T_VAR, typeof process.env.PATH]))"],
      10_000,
      { env: { ARCANE_T_VAR: "yes" } },
    );
    expect(JSON.parse(stdout)).toEqual(["yes", "string"]);
  }, HEAVY_TEST_TIMEOUT);

  it("has no shell option anywhere in exec.ts (comments excluded)", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "src", "modules", "exec.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(src).not.toMatch(/\bshell\b/);
  });
});

// A stub interpreter: the current Node binary echoing its own argv as JSON. It runs on every OS, and a
// `shell: true` regression makes the payload's `&echo ...>marker&` execute, creating the marker file.
const ECHO = "process.stdout.write(JSON.stringify(process.argv.slice(1)))";
const STUB = { file: process.execPath, prefixArgs: ["-e", ECHO, "--"] };

let tmp: string | undefined;
afterEach(async () => {
  if (tmp) await removeFixtureDir(tmp);
  tmp = undefined;
});

async function exists(p: string): Promise<boolean> {
  return stat(p).then(
    () => true,
    () => false,
  );
}

describe("fetchAdoMergeTypePolicies with hostile remote-derived text (R-296a, merge blocker)", () => {
  it("delivers every argument unchanged and executes nothing", async () => {
    tmp = await createFixtureDir("arcane-az");
    const marker = join(tmp, "marker").replace(/\\/g, "/");
    const org = `org&echo pwned>"${marker}-org"&x`;
    const project = `my proj & echo pwned>"${marker}-project" & | "q" %PATH% ^ !x`;
    const repo = `re"po|%USERNAME%&echo pwned>"${marker}-repo"&`;

    const result = await fetchAdoMergeTypePolicies(org, project, repo, "main", STUB);
    expect(result).not.toBeNull();
    const second = result as unknown as string[];

    const orgUrl = `https://dev.azure.com/${org}`;
    // The first call's echoed argv became the repository id; the second call's argv is the result.
    const firstArgs = JSON.parse(second[second.indexOf("--repository-id") + 1] as string) as string[];
    expect(firstArgs).toEqual([
      "repos", "show", "--repository", repo, "--org", orgUrl, "--project", project, "--query", "id", "--output", "tsv",
    ]);
    expect(second.slice(0, 2)).toEqual(["repos", "policy"]);
    expect(second[second.indexOf("--org") + 1]).toBe(orgUrl);
    expect(second[second.indexOf("--project") + 1]).toBe(project);

    for (const suffix of ["-org", "-project", "-repo"]) {
      expect(await exists(`${marker}${suffix}`), `marker${suffix} was created: a metacharacter executed`).toBe(false);
    }
  }, HEAVY_TEST_TIMEOUT);
});

describe.runIf(process.platform === "win32")("real Azure CLI interpreter on Windows (live)", () => {
  it("runs az --version and delivers hostile arguments unchanged", async (ctx) => {
    const launch = resolveAzureCli();
    if (launch.prefixArgs.length === 0) return ctx.skip();
    tmp = await createFixtureDir("arcane-az-live");
    const marker = join(tmp, "marker").replace(/\\/g, "/");
    const hostile = ["a b", `&echo pwned>"${marker}"&`, "x|y", 'q"q', "%PATH%", "^", "!x"];

    const env = launch.env;
    const version = await execFileWithTimeout(launch.file, [...launch.prefixArgs, "--version"], 20_000, { env });
    expect(version.stdout).toMatch(/azure-cli/i);

    const echo = await execFileWithTimeout(
      launch.file,
      ["-I", "-c", "import sys, json; sys.stdout.write(json.dumps(sys.argv[1:]))", ...hostile],
      5_000,
      { env },
    );
    expect(JSON.parse(echo.stdout)).toEqual(hostile);
    expect(await exists(marker)).toBe(false);
  }, VERY_HEAVY_TEST_TIMEOUT);
});
