import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");

let openSession: string;
let closeSession: string;
let commitWork: string;

beforeAll(async () => {
  [openSession, closeSession, commitWork] = await Promise.all([
    readFile(join(PROMPTS, "spell-open-session.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-close-session.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-commit-work.prompt.md"), "utf8"),
  ]);
});

describe("session branch mutation guard", () => {
  it("does not create a branch for a remote read-only session", () => {
    expect(openSession).toContain("Do not create a branch during a read-only session");
    expect(openSession).toContain("do not switch during this read-only check");
    expect(closeSession).toContain("Read-only session, no changes");
  });

  it("creates a deterministic session branch immediately before first mutation", () => {
    expect(openSession).toContain("Immediately before the first file edit");
    expect(openSession).toContain("Supported, authenticated GitHub/ADO remote + trunk checked out");
    expect(openSession).toContain("sessions/YYYY-MM-DD-<topic-slug>");
    expect(openSession).toContain("complete it before writing the handoff consumed marker");
  });

  it("keeps no-remote mutations on trunk and selects local-only close", () => {
    expect(openSession).toContain("No remote, unsupported remote, or provider authentication unavailable");
    expect(openSession).toContain("Local-only session: no usable remote merge path");
    expect(closeSession).toContain("remain on the current trunk");
    expect(closeSession).toContain("Local-only close: committed on <trunk>; no remote PR/pull performed");
  });

  it("keeps an existing compliant session branch", () => {
    expect(openSession).toContain("Already on a compliant `sessions/YYYY-MM-DD-<topic-slug>` branch");
    expect(openSession).toContain("Stay on it; do not create or switch branches");
  });

  it("renames a noncompliant unpushed branch only before mutation", () => {
    expect(openSession).toContain("Noncompliant unpushed branch with no active PR");
    expect(openSession).toContain("Rename it to the deterministic session name before mutation");
    expect(openSession).toContain("Do not rename during a read-only session");
  });

  it("preserves a branch backing an active PR", () => {
    expect(openSession).toContain("Branch has an active PR");
    expect(openSession).toContain("never rename a branch backing an active PR");
    expect(closeSession).toContain("current compliant session/PR/worktree branch");
  });

  it("mutates only the current linked worktree", () => {
    expect(openSession).toContain("Create and switch the **current worktree only**");
    expect(openSession).toContain("Never switch or delete a branch attached to another worktree");
    expect(closeSession).toContain("current compliant session/PR/worktree branch");
  });

  it("requires a supported authenticated provider before declaring a merge path usable", () => {
    expect(openSession).toContain("github.com");
    expect(openSession).toContain("dev.azure.com");
    expect(openSession).toContain("authenticated provider tooling");
    expect(openSession).toContain("A remote URL alone is insufficient");
  });

  it("keeps commit-work checkpoints on trunk when no merge path is usable", () => {
    expect(commitWork).toContain("Classify the Git/remote state before enforcing the protected-branch guard");
    expect(commitWork).toContain("A remote URL alone is insufficient");
    expect(commitWork).toContain("No remote, unsupported remote, or provider authentication unavailable");
    expect(commitWork).toContain("remain on the current trunk");
    expect(commitWork).toContain("skip Steps 9 and 10 entirely");
    expect(commitWork).toContain("Local-only checkpoint: committed on <trunk>; no remote push/PR performed");
  });

  it("keeps the protected-branch guard when a merge path is usable", () => {
    expect(commitWork).toContain("Supported, authenticated GitHub/ADO remote + `main` or `master` checked out");
    expect(commitWork).toContain("Create and switch the current worktree to a compliant topic branch");
    expect(commitWork).toContain("Never strand a local-only commit on a topic branch with no usable merge path");
  });
});