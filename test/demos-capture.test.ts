import { afterEach, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  KEY_ENTER,
  answer,
  LINE_REVEAL_MS,
  SHELL_PROMPT,
  TYPING_MS,
  captureEnvironment,
  captureScenario,
  commandEvents,
  framesFromEvents,
  normalizeOutput,
  revealByLine,
  runCommand,
  stripEscapes,
  supportsImportFlag,
  ttyShimSource,
} from "../scripts/lib/demos/capture.js";
import type { DemoScenario } from "../scripts/lib/demos/capture.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

/**
 * ARC-058: capturing a README demo. The pure steps (normalisation, the event
 * timeline, frames) are tested directly; the process driver and a whole
 * scenario run against a small stand-in CLI, so these tests need no build.
 */

const fixtures: string[] = [];

afterEach(async () => {
  while (fixtures.length > 0) await removeFixtureDir(fixtures.pop()!);
});

async function fixture(): Promise<string> {
  const dir = await createFixtureDir("arcane-demos-capture-");
  fixtures.push(dir);
  return dir;
}

/**
 * A stand-in CLI: reports what the capture gave it (directory, HOME, TTY,
 * colour), writes to stderr, then prompts and echoes keys until Enter.
 */
const FAKE_CLI = `
import { closeSync, writeFileSync } from "node:fs";
const out = process.stdout;
writeFileSync("pid", String(process.pid));
out.write("cwd " + process.cwd() + "\\n");
out.write("home " + process.env.HOME + "\\n");
out.write("tty " + process.stdin.isTTY + " " + out.isTTY + " " + out.columns + "x" + out.rows + " depth " + (out.getColorDepth?.() ?? "none") + "\\n");
out.write("env " + (process.env.ARCANE_DEMO_LEAK ?? "clean") + " " + process.env.FORCE_COLOR + "\\n");
process.stderr.write("from stderr\\n");
if (process.argv.includes("--prompt")) {
  out.write("? Name:");
  process.stdin.on("data", (chunk) => {
    const keys = String(chunk);
    if (keys.includes("\\r")) { out.write("\\ndone\\n"); process.exit(0); }
    out.write(" [" + keys + "]");
  });
} else if (process.argv.includes("--fail")) {
  process.exit(3);
} else if (process.argv.includes("--wide")) {
  // Far more than one pipe buffer of a three-byte character, so chunks split inside one.
  out.write("\\u2726".repeat(100000) + "\\n");
} else if (process.argv.includes("--deaf")) {
  // Prompts, then closes its end of stdin and stays alive: the next key cannot be delivered.
  process.stdin.pause();
  closeSync(0);
  out.write("? Name:");
  setInterval(() => {}, 1000);
} else if (process.argv.includes("--hang")) {
  out.write("? Name:");
  setInterval(() => {}, 1000);
}
`;

describe("normalizeOutput", () => {
  it("rewrites temporary paths to their placeholders, longest first, in either slash style", () => {
    const output = "repo /tmp/x/demo, home /tmp/x/home, root /tmp/x, windows C:\\tmp\\x\\demo";
    const result = normalizeOutput(output, [
      ["/tmp/x", "~"],
      ["/tmp/x/demo", "~/demo"],
      ["/tmp/x/home", "~"],
      ["C:\\tmp\\x\\demo", "~/demo"],
    ]);
    expect(result).toBe("repo ~/demo, home ~, root ~, windows ~/demo");
  });

  it("turns CRLF into LF and leaves a lone CR alone", () => {
    expect(normalizeOutput("a\r\nb\rc", [])).toBe("a\nb\rc");
  });

  it("treats regular-expression characters in a path literally", () => {
    expect(normalizeOutput("/tmp/a+b/demo /tmp/aab/demo", [["/tmp/a+b", "~"]])).toBe("~/demo /tmp/aab/demo");
  });

  it("ignores an empty path rather than inserting the placeholder everywhere", () => {
    expect(normalizeOutput("abc", [["", "~"]])).toBe("abc");
  });
});

describe("the event timeline", () => {
  it("reveals plain output a line at a time, holding the last line", () => {
    expect(revealByLine("one\ntwo\nthree", 900)).toEqual([
      { output: "one\n", holdMs: LINE_REVEAL_MS },
      { output: "two\n", holdMs: LINE_REVEAL_MS },
      { output: "three", holdMs: 900 },
    ]);
  });

  it("shows output that redraws the screen at once, up to the end of that line", () => {
    const events = revealByLine("menu\u001b[2K\u001b[1A\u001b[Gchosen\nnext\n", 500);
    expect(events).toEqual([
      { output: "menu\u001b[2K\u001b[1A\u001b[Gchosen\n", holdMs: LINE_REVEAL_MS },
      { output: "next\n", holdMs: 500 },
    ]);
  });

  it("keeps empty output as one held event", () => {
    expect(revealByLine("", 400)).toEqual([{ output: "", holdMs: 400 }]);
  });

  it("types the command after the prompt, then plays each prompt for its key's hold", () => {
    const events = commandEvents(
      { args: ["go"], keys: [{ keys: KEY_ENTER, waitFor: "menu", holdMs: 2_000 }], holdMs: 3_000 },
      ["menu", "done\n"],
      600,
    );
    expect(events[0]).toEqual({ output: SHELL_PROMPT, holdMs: 600 });
    expect(events.slice(1, 9).map((event) => event.output).join("")).toBe("spell go");
    expect(events[1].holdMs).toBe(TYPING_MS);
    expect(events.slice(9)).toEqual([
      { output: "\n", holdMs: LINE_REVEAL_MS },
      { output: "menu", holdMs: 2_000 },
      { output: "done\n", holdMs: 3_000 },
    ]);
  });

  it("refuses segments that do not line up with the scripted keys", () => {
    expect(() => commandEvents({ args: ["go"], holdMs: 1 }, ["a", "b"], 1)).toThrow(/Expected 1 output segments/);
  });

  it("types an answer a key at a time, each key waiting for the previous one's echo, then presses Enter", () => {
    expect(answer("Name:", "Abc", 90, 700)).toEqual([
      { keys: "A", holdMs: 90, waitFor: "Name:" },
      { keys: "b", holdMs: 90, waitFor: "Name: A" },
      { keys: "c", holdMs: 90, waitFor: "Name: Ab" },
      { keys: KEY_ENTER, holdMs: 700, waitFor: "Name: Abc" },
    ]);
  });

  it("matches prompts against the text a reader sees, escape sequences removed", () => {
    const rendered = "\u001b[2K\u001b[G\u001b[34m?\u001b[39m \u001b[1mName:\u001b[22m At\u001b[42G\u001b]8;;x\u0007\u001b7\u001b(B";
    expect(stripEscapes(rendered)).toBe("? Name: At");
  });

  it("knows which Node versions have --import", () => {
    for (const version of ["v18.18.0", "v18.20.4", "v19.0.0", "v20.0.0", "v22.0.0", "24.18.0"]) expect(supportsImportFlag(version)).toBe(true);
    for (const version of ["v18.17.1", "v17.9.1", "v16.20.0"]) expect(supportsImportFlag(version)).toBe(false);
  });

  it("merges identical consecutive frames and adds their durations", () => {
    const frames = framesFromEvents(
      [
        { output: "a", holdMs: 100 },
        { output: "", holdMs: 50 },
        { output: "\u001b[1m", holdMs: 25 },
        { output: "b", holdMs: 10 },
      ],
      10,
      2,
    );
    expect(frames.map((frame) => frame.durationMs)).toEqual([175, 10]);
  });
});

describe("the capture environment", () => {
  it("is built from scratch: only PATH and Windows process essentials are inherited", () => {
    const env = captureEnvironment("/h", {
      PATH: "/bin",
      SystemRoot: "C:\\Windows",
      ARCANE_DEMO_LEAK: "leaked",
      GIT_DIR: "/elsewhere",
      CI: "true",
    });
    expect(env["PATH"]).toBe("/bin");
    expect(env["SystemRoot"]).toBe("C:\\Windows");
    expect(env["HOME"]).toBe("/h");
    expect(env["USERPROFILE"]).toBe("/h");
    expect(env["GIT_CONFIG_NOSYSTEM"]).toBe("1");
    expect(env["FORCE_COLOR"]).toBe("3");
    expect(env["ARCANE_DISABLE_ANIMATION"]).toBe("true");
    for (const leaked of ["ARCANE_DEMO_LEAK", "GIT_DIR", "CI"]) expect(env[leaked]).toBeUndefined();
  });

  it("takes PATH from Windows' Path spelling when PATH is absent", () => {
    expect(captureEnvironment("/h", { Path: "C:\\bin" })["PATH"]).toBe("C:\\bin");
  });

  it("fixes the terminal size in the shim and routes stderr through stdout", () => {
    const shim = ttyShimSource(100, 34);
    expect(shim).toContain("value: 100");
    expect(shim).toContain("value: 34");
    expect(shim).toContain("process.stderr.write = process.stdout.write.bind(process.stdout)");
  });
});

describe("runCommand and captureScenario against a stand-in CLI", () => {
  it(
    "waits for each prompt before sending its keys and splits output at each key",
    async () => {
      const dir = await fixture();
      const cli = join(dir, "cli.mjs");
      await writeFile(cli, FAKE_CLI, "utf8");
      const shim = `data:text/javascript,${encodeURIComponent(ttyShimSource(80, 24))}`;
      const segments = await runCommand({
        cwd: dir,
        env: captureEnvironment(join(dir)),
        nodeArgs: ["--import", shim, cli],
        args: ["--prompt"],
        keys: [
          { keys: "x", waitFor: "? Name:", holdMs: 1 },
          { keys: KEY_ENTER, waitFor: "[x]", holdMs: 1 },
        ],
      });
      expect(segments).toHaveLength(3);
      expect(segments[0]).toContain("tty true true 80x24 depth 24");
      expect(segments[0]).toMatch(/from stderr\n\? Name:$/);
      expect(segments[1]).toBe(" [x]");
      expect(segments[2]).toBe("\ndone\n");
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "fails with the last output when the expected prompt never appears",
    async () => {
      const dir = await fixture();
      const cli = join(dir, "cli.mjs");
      await writeFile(cli, FAKE_CLI, "utf8");
      await expect(
        runCommand({
          cwd: dir,
          env: captureEnvironment(dir),
          nodeArgs: [cli],
          args: ["--prompt"],
          keys: [{ keys: "x", waitFor: "never printed", holdMs: 1 }],
          stepTimeoutMs: 500,
        }),
      ).rejects.toThrow(/Timed out waiting for the CLI \(`spell --prompt`, key 1 of 1\); last output: .*Name:/);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "settles a failure only after the CLI has exited, so nothing still writes into the directory",
    async () => {
      const dir = await fixture();
      const cli = join(dir, "cli.mjs");
      await writeFile(cli, FAKE_CLI, "utf8");
      await expect(
        runCommand({
          cwd: dir,
          env: captureEnvironment(dir),
          nodeArgs: [cli],
          args: ["--hang"],
          keys: [{ keys: "x", waitFor: "never printed", holdMs: 1 }],
          stepTimeoutMs: 300,
        }),
      ).rejects.toThrow(/Timed out waiting for the CLI/);
      const pid = Number(await readFile(join(dir, "pid"), "utf8"));
      expect(() => process.kill(pid, 0)).toThrow();
    },
    HEAVY_TEST_TIMEOUT,
  );

  // POSIX only: a write to a child's closed stdin raises EPIPE there, which
  // is the failure this test asserts. On Windows the same write succeeds and
  // the step times out instead ("Timed out waiting for the CLI"), so the
  // expectation can only hold on the Linux and macOS runners. Tracked in
  // TODO.md ("`test/demos-capture.test.ts` expects an EPIPE that Windows
  // never raises"); the skip keeps the pre-push suite honest on Windows.
  it.skipIf(process.platform === "win32")(
    "fails with a clear message, not a crash, when a key cannot be delivered",
    async () => {
      const dir = await fixture();
      const cli = join(dir, "cli.mjs");
      await writeFile(cli, FAKE_CLI, "utf8");
      const keys = [
        { keys: "x", waitFor: "? Name:", holdMs: 1 },
        { keys: "y", waitFor: "never printed", holdMs: 1 },
      ];
      await expect(
        runCommand({ cwd: dir, env: captureEnvironment(dir), nodeArgs: [cli], args: ["--deaf"], keys, stepTimeoutMs: 5_000 }),
      ).rejects.toThrow(/^Could not write to the CLI: .*EPIPE/);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "keeps a multi-byte character whole when the output splits inside it",
    async () => {
      const dir = await fixture();
      const cli = join(dir, "cli.mjs");
      await writeFile(cli, FAKE_CLI, "utf8");
      const [output] = await runCommand({ cwd: dir, env: captureEnvironment(dir), nodeArgs: [cli], args: ["--wide"], keys: [] });
      expect(output).not.toContain(String.fromCodePoint(0xfffd));
      expect(output.split(String.fromCodePoint(0x2726)).length - 1).toBe(100_000);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "fails when the CLI exits non-zero",
    async () => {
      const dir = await fixture();
      const cli = join(dir, "cli.mjs");
      await writeFile(cli, FAKE_CLI, "utf8");
      await expect(
        runCommand({ cwd: dir, env: captureEnvironment(dir), nodeArgs: [cli], args: ["--fail"], keys: [] }),
      ).rejects.toThrow(/The CLI exited with code 3 \(`spell --fail`\)/);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "fails when the CLI exits before every key was sent",
    async () => {
      const dir = await fixture();
      const cli = join(dir, "cli.mjs");
      await writeFile(cli, FAKE_CLI, "utf8");
      await expect(
        runCommand({
          cwd: dir,
          env: captureEnvironment(dir),
          nodeArgs: [cli],
          args: [],
          keys: [{ keys: "x", waitFor: "never printed", holdMs: 1 }],
        }),
      ).rejects.toThrow(/exited \(code 0\) before every scripted key was sent/);
    },
    HEAVY_TEST_TIMEOUT,
  );

  it(
    "runs a scenario in a temporary repository and HOME, with their paths rewritten and the environment clean",
    async () => {
      const dir = await fixture();
      const cli = join(dir, "cli.mjs");
      await writeFile(cli, FAKE_CLI, "utf8");
      const scenario: DemoScenario = {
        id: "fake",
        title: "fake",
        description: "A stand-in.",
        cols: 60,
        rows: 10,
        commands: [{ args: ["--prompt"], keys: [{ keys: KEY_ENTER, waitFor: "? Name:", holdMs: 100 }], holdMs: 200 }],
      };
      process.env["ARCANE_DEMO_LEAK"] = "leaked";
      try {
        const events = await captureScenario(scenario, cli);
        const output = events.map((event) => event.output).join("");
        expect(output).toContain("cwd ~/demo\n");
        expect(output).toContain("home ~\n");
        expect(output).toContain("env clean 3\n");
        expect(output).not.toMatch(/arcane-demo-/);
        expect(events[events.length - 1]).toEqual({ output: SHELL_PROMPT, holdMs: 1_500 });
      } finally {
        delete process.env["ARCANE_DEMO_LEAK"];
      }
    },
    HEAVY_TEST_TIMEOUT,
  );
});
