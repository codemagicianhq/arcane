import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { checkPlatformBranchPolicy } from "../src/commands/doctor.js";
import { runGit as fixtureGit, createFixtureDir } from "./helpers/git-fixture.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("checkPlatformBranchPolicy — integration (T11/BC-17)", () => {
  it("passes, non-blocking, when no remote is configured", async () => {
    dir = await createFixtureDir("doctor-platform-policy-no-remote");
    fixtureGit(dir, ["init", "-b", "main"]);

    const result = await checkPlatformBranchPolicy(dir);
    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("no remote configured");
  });

  it("passes, non-blocking, for a remote that is neither GitHub nor Azure DevOps", async () => {
    dir = await createFixtureDir("doctor-platform-policy-unknown-remote");
    fixtureGit(dir, ["init", "-b", "main"]);
    fixtureGit(dir, ["remote", "add", "origin", "https://gitlab.com/someorg/somerepo.git"]);

    const result = await checkPlatformBranchPolicy(dir);
    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("neither GitHub nor Azure DevOps");
  });

  it("degrades to a non-blocking warning when the GitHub remote can't actually be queried", async () => {
    dir = await createFixtureDir("doctor-platform-policy-gh-unreachable");
    fixtureGit(dir, ["init", "-b", "main"]);
    // A syntactically valid GitHub remote that gh cannot resolve (no such
    // repo, or no auth in this environment) -- exercises the graceful
    // degradation path without asserting on gh's own auth state.
    fixtureGit(dir, [
      "remote",
      "add",
      "origin",
      "https://github.com/arcane-test-fixture-nonexistent-org/nonexistent-repo.git",
    ]);

    // The meaningful assertion is that this resolves at all rather than
    // throwing or hanging -- a nonexistent repo means gh will fail (auth
    // error or 404), which fetchGitHubRulesets must catch and turn into a
    // graceful, non-blocking result, never an unhandled rejection.
    const result = await checkPlatformBranchPolicy(dir);
    expect(result.name).toBe("Platform branch/merge policy (T11)");
    expect(result.blocking).toBe(false);
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  }, 20000);
});
