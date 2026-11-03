import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, unlink, utimes, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEMO_DIR, defaultStaleBuild, machineValues, privateValuesIn, runDemos } from "../scripts/demos.js";
import { DEMO_SCENARIOS } from "../scripts/lib/demos/scenarios.js";
import type { DemoEvent, DemoScenario } from "../scripts/lib/demos/capture.js";
import { stampedVersion } from "../scripts/lib/demos/render-svg.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";

/**
 * ARC-058: the README demo guard (`npm run check:demos`) and its writer
 * (`npm run fix:demos`). The capture is replaced by a stub here, so the guard's
 * decisions are tested without a build; the real capture is covered by
 * demos-capture.test.ts and by CI running `check:demos` after its build.
 */

const ROOT_DIR = process.cwd();

const SCENARIO: DemoScenario = {
  id: "sample",
  title: "init",
  description: "A sample.",
  cols: 20,
  rows: 3,
  commands: [{ args: ["init"], holdMs: 100 }],
};

const fixtures: string[] = [];

afterEach(async () => {
  while (fixtures.length > 0) await removeFixtureDir(fixtures.pop()!);
});

async function repo(version = "2.0.0", built = true): Promise<string> {
  const dir = await createFixtureDir("arcane-demos-guard-");
  fixtures.push(dir);
  await writeFile(join(dir, "package.json"), JSON.stringify({ version }), "utf8");
  await mkdir(join(dir, DEMO_DIR), { recursive: true });
  if (built) {
    await mkdir(join(dir, "dist"));
    await writeFile(join(dir, "dist", "index.js"), "", "utf8");
  }
  return dir;
}

function capturing(output: string): (scenario: DemoScenario) => Promise<DemoEvent[]> {
  return () => Promise.resolve([{ output, holdMs: 100 }]);
}

function options(rootDir: string, output = "43 spells", stale: string | null = null) {
  return {
    rootDir,
    scenarios: [SCENARIO],
    capture: capturing(output),
    staleBuild: () => Promise.resolve(stale),
    privateValues: ["/home/someone", "someone-host"],
  };
}

const demoPath = (dir: string): string => join(dir, DEMO_DIR, "sample.svg");

describe("runDemos --fix", () => {
  it("writes each scenario's SVG, stamped with package.json's version", async () => {
    const dir = await repo();
    const result = await runDemos("fix", options(dir));
    expect(result.repaired).toEqual(["assets/demo/sample.svg"]);
    const svg = await readFile(demoPath(dir), "utf8");
    expect(stampedVersion(svg)).toBe("2.0.0");
    expect(svg).toContain("43 spells");
  });

  it("leaves an up-to-date demo untouched", async () => {
    const dir = await repo();
    await runDemos("fix", options(dir));
    expect(await runDemos("fix", options(dir))).toEqual({ drifted: [], repaired: [] });
  });
});

describe("runDemos --check", () => {
  it("passes when every demo matches what the CLI prints at package.json's version", async () => {
    const dir = await repo();
    await runDemos("fix", options(dir));
    expect(await runDemos("check", options(dir))).toEqual({ drifted: [], repaired: [] });
  });

  it("accepts a committed demo with CRLF line endings", async () => {
    const dir = await repo();
    await runDemos("fix", options(dir));
    await writeFile(demoPath(dir), (await readFile(demoPath(dir), "utf8")).replace(/\n/g, "\r\n"), "utf8");
    expect((await runDemos("check", options(dir))).drifted).toEqual([]);
  });

  it("fails on a missing demo, and does not write it", async () => {
    const dir = await repo();
    const result = await runDemos("check", options(dir));
    expect(result.drifted).toEqual(["assets/demo/sample.svg does not exist."]);
    expect(existsSync(demoPath(dir))).toBe(false);
  });

  it("fails when the stamped version differs from package.json, as after a bump", async () => {
    const dir = await repo("2.0.0");
    await runDemos("fix", options(dir));
    await writeFile(join(dir, "package.json"), JSON.stringify({ version: "2.0.1" }), "utf8");
    const result = await runDemos("check", options(dir));
    expect(result.drifted).toEqual(["assets/demo/sample.svg is stamped 2.0.0; package.json is 2.0.1."]);
  });

  it("fails on a demo with no stamp at all", async () => {
    const dir = await repo();
    await writeFile(demoPath(dir), "<svg></svg>\n", "utf8");
    expect((await runDemos("check", options(dir))).drifted).toEqual([
      "assets/demo/sample.svg is stamped with no version; package.json is 2.0.0.",
    ]);
  });

  it("fails when the CLI's output changed though the version did not", async () => {
    const dir = await repo();
    await runDemos("fix", options(dir, "33 spells"));
    const result = await runDemos("check", options(dir, "43 spells"));
    expect(result.drifted).toEqual(["assets/demo/sample.svg no longer matches what the current CLI prints."]);
    expect(await readFile(demoPath(dir), "utf8")).toContain("33 spells");
  });

  it("refuses to run without a build", async () => {
    const dir = await repo("2.0.0", false);
    await expect(runDemos("check", options(dir))).rejects.toThrow(/dist\/index\.js does not exist\. Run `npm run build` first/);
  });

  it("refuses to run against a build older than the source", async () => {
    const dir = await repo();
    await expect(runDemos("check", options(dir, "x", "src/index.ts changed after dist/index.js was built."))).rejects.toThrow(
      /dist\/ is older than the source: src\/index\.ts changed after dist\/index\.js was built\. Run `npm run build` first/,
    );
  });

  it("refuses to keep a demo that would publish this machine's paths or names, in either mode", async () => {
    const dir = await repo();
    for (const mode of ["check", "fix"] as const) {
      await expect(runDemos(mode, options(dir, "saved to /home/someone/x"))).rejects.toThrow(
        /assets\/demo\/sample\.svg would publish this machine's value "\/home\/someone"/,
      );
    }
    expect(existsSync(demoPath(dir))).toBe(false);
  });

  it("refuses a private path the terminal draws though the stream spells it otherwise", async () => {
    const dir = await repo();
    // The stream holds "/home/someonX", BS, "e": the screen shows "/home/someone/x".
    await expect(runDemos("fix", options(dir, "cwd /home/someonX\be/x"))).rejects.toThrow(/would publish this machine's value "\/home\/someone"/);
  });

  it("does not mistake the SVG's own markup for a private name", async () => {
    const dir = await repo();
    const result = await runDemos("fix", { ...options(dir), privateValues: ["fill", "tspan", "class"] });
    expect(result.repaired).toEqual(["assets/demo/sample.svg"]);
  });

  it("fails on a demo no scenario produces, and --fix removes it", async () => {
    const dir = await repo();
    await runDemos("fix", options(dir));
    await writeFile(join(dir, DEMO_DIR, "renamed.svg"), "<svg/>\n", "utf8");
    expect((await runDemos("check", options(dir))).drifted).toEqual([
      "assets/demo/renamed.svg has no scenario in scripts/lib/demos/scenarios.ts.",
    ]);
    expect((await runDemos("fix", options(dir))).repaired).toEqual(["assets/demo/renamed.svg"]);
    expect(existsSync(join(dir, DEMO_DIR, "renamed.svg"))).toBe(false);
  });

  it("fails when the README shows a demo no scenario produces", async () => {
    const dir = await repo();
    await runDemos("fix", options(dir));
    await writeFile(join(dir, "README.md"), '<img src="./assets/demo/sample.svg"> <img src="./assets/demo/old.gif">\n', "utf8");
    expect((await runDemos("check", options(dir))).drifted).toEqual([
      "README.md shows assets/demo/old.gif, which no scenario produces.",
    ]);
  });

  it("reads a README reference with a query or fragment by its file name", async () => {
    const dir = await repo();
    await runDemos("fix", options(dir));
    await writeFile(join(dir, "README.md"), '<img src="./assets/demo/sample.svg?raw=true"> [x](assets/demo/sample.svg#top)\n', "utf8");
    expect((await runDemos("check", options(dir))).drifted).toEqual([]);
  });
});

describe("defaultStaleBuild", () => {
  const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

  /** A checkout with src/modules/a.ts written 10 minutes ago and dist/index.js built 5 minutes ago. */
  async function built(): Promise<string> {
    const dir = await repo();
    await mkdir(join(dir, "src", "modules"), { recursive: true });
    await writeFile(join(dir, "src", "modules", "a.ts"), "", "utf8");
    for (const path of ["src/modules/a.ts", "src/modules", "src"]) await utimes(join(dir, path), minutesAgo(10), minutesAgo(10));
    await utimes(join(dir, "dist", "index.js"), minutesAgo(5), minutesAgo(5));
    return dir;
  }

  it("accepts a build newer than every source file and directory", async () => {
    expect(await defaultStaleBuild(await built())).toBeNull();
  });

  it("names the source file changed after the build", async () => {
    const dir = await built();
    await utimes(join(dir, "src", "modules", "a.ts"), minutesAgo(1), minutesAgo(1));
    expect(await defaultStaleBuild(dir)).toBe("src/modules/a.ts changed after dist/index.js was built.");
  });

  it("notices a source file deleted after the build, through its directory", async () => {
    const dir = await built();
    await unlink(join(dir, "src", "modules", "a.ts"));
    expect(await defaultStaleBuild(dir)).toBe("src/modules changed after dist/index.js was built.");
  });

  it("says when the newest source file is dated in the future", async () => {
    const dir = await built();
    const future = new Date(Date.now() + 3_600_000);
    await utimes(join(dir, "src", "modules", "a.ts"), future, future);
    expect(await defaultStaleBuild(dir)).toBe(
      "src/modules/a.ts changed after dist/index.js was built (its modification time is in the future; touch it).",
    );
  });
});

describe("machineValues", () => {
  it("looks for the home directory, the checkout, the host and the user on a person's machine", () => {
    const values = machineValues("/checkout", {});
    expect(values.slice(0, 2)).toEqual([homedir(), "/checkout"]);
    expect(values.length).toBeGreaterThanOrEqual(3);
  });

  it("looks only for the paths on CI, whose host and user belong to a disposable runner", () => {
    expect(machineValues("/checkout", { CI: "true" })).toEqual([homedir(), "/checkout"]);
  });
});

describe("privateValuesIn", () => {
  it("finds a path in either slash style", () => {
    expect(privateValuesIn("at C:/Users/me/x", ["C:\\Users\\me"])).toEqual(["C:\\Users\\me"]);
    expect(privateValuesIn("at /home/me/x", ["/home/me"])).toEqual(["/home/me"]);
  });

  it("finds a path only as a whole path or a path's prefix, not inside a URL or a longer name", () => {
    expect(privateValuesIn('xmlns="http://www.w3.org/2000/svg"', ["/w"])).toEqual([]);
    expect(privateValuesIn("at /home/meow/x", ["/home/me"])).toEqual([]);
    expect(privateValuesIn('see "/w/scripts/demos.ts"', ["/w"])).toEqual(["/w"]);
    expect(privateValuesIn("cwd /home/me", ["/home/me/"])).toEqual(["/home/me/"]);
    expect(privateValuesIn("/ anything", ["/"])).toEqual([]);
  });

  it("finds a path in a file URL and before a sentence's full stop", () => {
    expect(privateValuesIn("open file:///home/me/x", ["/home/me"])).toEqual(["/home/me"]);
    expect(privateValuesIn("saved to /home/me.", ["/home/me"])).toEqual(["/home/me"]);
    expect(privateValuesIn("saved to /home/me.old", ["/home/me"])).toEqual([]);
  });

  it("finds a Windows path in a file URL, after the long-path prefix, and JSON-escaped", () => {
    const home = "C:\\Users\\me";
    expect(privateValuesIn("file:///C:/Users/me/x", [home])).toEqual([home]);
    expect(privateValuesIn("\\\\?\\C:\\Users\\me\\x", [home])).toEqual([home]);
    expect(privateValuesIn('{"path":"C:\\\\Users\\\\me\\\\x"}', [home])).toEqual([home]);
  });

  it("finds a name only as a whole word, ignoring case", () => {
    expect(privateValuesIn("by Someone today", ["someone"])).toEqual(["someone"]);
    expect(privateValuesIn("someones and somebody-someone2", ["someone"])).toEqual([]);
  });

  it("skips names shorter than four characters and empty values", () => {
    expect(privateValuesIn("dev ci", ["dev", "ci", ""])).toEqual([]);
  });
});

describe("the committed README demos", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT_DIR, "package.json"), "utf8")) as {
    version: string;
    scripts: Record<string, string>;
  };
  const readme = readFileSync(join(ROOT_DIR, "README.md"), "utf8");

  it.each(DEMO_SCENARIOS.map((scenario) => [scenario.id]))("%s.svg exists and is stamped with package.json's version", (id) => {
    const svg = readFileSync(join(ROOT_DIR, DEMO_DIR, `${id}.svg`), "utf8");
    expect(stampedVersion(svg)).toBe(pkg.version);
  });

  it.each(DEMO_SCENARIOS.map((scenario) => [scenario.id]))("README.md shows %s.svg", (id) => {
    expect(readme).toContain(`<img src="./assets/demo/${id}.svg"`);
  });

  it("README.md references no GIF demo any more", () => {
    expect(readme).not.toMatch(/assets\/demo\/[^"]*\.gif/);
  });

  it.each(DEMO_SCENARIOS.map((scenario) => [scenario.id, scenario.description]))(
    "README.md's alt text for %s is the scenario's description",
    (id, description) => {
      const escaped = description.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      expect(readme).toContain(`<img src="./assets/demo/${id}.svg" alt="Animated terminal recording: ${escaped}"`);
    },
  );

  it("npm version regenerates the demos and stages them, and CI checks them", () => {
    expect(pkg.scripts["version"]).toBe("npm run fix:demos && git add assets/demo");
    expect(pkg.scripts["fix:demos"]).toMatch(/^npm run build && /);
    const ci = readFileSync(join(ROOT_DIR, ".github", "workflows", "ci.yml"), "utf8");
    expect(ci).toMatch(/run: npm run check:demos/);
    expect(ci.indexOf("run: npm run check:demos")).toBeGreaterThan(ci.indexOf("run: npm run build"));
  });
});
