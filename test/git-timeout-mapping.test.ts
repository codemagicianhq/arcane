import { beforeEach, describe, expect, it, vi } from "vitest";

// R4's real claim is about runGit's OWN control-flow: does an execFile
// callback shaped like a timeout-kill (`error.killed`) get correctly wrapped
// into GitTimeoutError, and does the right timeout value reach execFile in
// the first place? Both are fully determined by our code, not by how fast
// git itself happens to run on a given machine. Testing this by racing a
// real `git status` against a 1ms timeout (a prior version of this suite)
// is exactly the kind of test that looks reasonable locally and then fails
// non-deterministically on a faster CI runner, where the real command can
// legitimately complete in under 1ms -- which is exactly what happened here.
// Mocking node:child_process isolates the control-flow claim from real
// process-spawn timing entirely.
const execFileMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

const { runGit, GitTimeoutError } = await import("../src/modules/git.js");

function fakeChild() {
  return { stdin: { end: vi.fn() } };
}

beforeEach(() => {
  execFileMock.mockReset();
});

describe("runGit — timeout error mapping (isolated from real git timing)", () => {
  it("wraps an execFile timeout-kill (error.killed=true) into GitTimeoutError", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      const err = Object.assign(new Error("command failed"), {
        killed: true,
        signal: "SIGTERM",
        code: null,
      });
      queueMicrotask(() => callback(err, "", ""));
      return fakeChild();
    });

    await expect(runGit("/any/dir", ["status"], { timeoutMs: 1234 })).rejects.toThrow(
      GitTimeoutError,
    );
  });

  it("includes the timeout duration and command class in the error message", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      const err = Object.assign(new Error("command failed"), { killed: true });
      queueMicrotask(() => callback(err, "", ""));
      return fakeChild();
    });

    await expect(
      runGit("/any/dir", ["status"], { timeoutMs: 1234, commandClass: "read" }),
    ).rejects.toThrow(/1234ms.*read/);
  });

  it("does not wrap a non-timeout failure as GitTimeoutError", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      const err = Object.assign(new Error("fatal: not a git repository"), {
        killed: false,
        code: 128,
      });
      queueMicrotask(() => callback(err, "", ""));
      return fakeChild();
    });

    const rejection = runGit("/any/dir", ["status"]);
    await expect(rejection).rejects.toThrow(/not a git repository/);
    await expect(rejection).rejects.not.toBeInstanceOf(GitTimeoutError);
  });

  it("resolves with stdout/stderr on success", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      queueMicrotask(() => callback(null, "clean\n", ""));
      return fakeChild();
    });

    await expect(runGit("/any/dir", ["status"])).resolves.toEqual({
      stdout: "clean\n",
      stderr: "",
    });
  });

  it("passes the auto-classified command's default timeout to execFile", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      queueMicrotask(() => callback(null, "", ""));
      return fakeChild();
    });

    await runGit("/any/dir", ["status"]); // auto-classifies "read" -> 15_000ms
    expect(execFileMock).toHaveBeenCalledWith(
      "git",
      ["status"],
      expect.objectContaining({ timeout: 15_000 }),
      expect.any(Function),
    );
  });

  it("honors an explicit commandClass override for the timeout budget", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      queueMicrotask(() => callback(null, "", ""));
      return fakeChild();
    });

    // "push" auto-classifies as network (120_000ms); force it to "read"
    // (15_000ms) via an explicit override and confirm THAT value is what
    // actually reaches execFile, not the auto-classified one.
    await runGit("/any/dir", ["push"], { commandClass: "read" });
    expect(execFileMock).toHaveBeenCalledWith(
      "git",
      ["push"],
      expect.objectContaining({ timeout: 15_000 }),
      expect.any(Function),
    );
  });

  it("honors an explicit timeoutMs override regardless of class", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      queueMicrotask(() => callback(null, "", ""));
      return fakeChild();
    });

    await runGit("/any/dir", ["status"], { timeoutMs: 42 });
    expect(execFileMock).toHaveBeenCalledWith(
      "git",
      ["status"],
      expect.objectContaining({ timeout: 42 }),
      expect.any(Function),
    );
  });
});
