import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");

let commitWork: string;
let closeSession: string;
let createPullRequest: string;
let fullCycle: string;

beforeAll(async () => {
  [commitWork, closeSession, createPullRequest, fullCycle] = await Promise.all([
    readFile(join(PROMPTS, "spell-commit-work.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-close-session.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-create-pull-request.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-full-cycle.prompt.md"), "utf8"),
  ]);
});

describe("commit and merge autonomy gates", () => {
  it("requires authenticated approval tied to the exact interactive commit", () => {
    expect(commitWork).toContain("interaction_context: interactive | autonomous");
    expect(commitWork).toContain("exact staged diff plus proposed commit message");
    expect(commitWork).toContain("authenticated operator response tied to that fingerprint");
    expect(commitWork).toContain("Recompute the fingerprint immediately before `git commit`");
    expect(commitWork).toContain("host-generated fallback");
  });

  it("allows autonomous below-Magus commits but prohibits merge", () => {
    expect(commitWork).toContain("Autonomous, below Magus");
    expect(commitWork).toContain("May commit to topic branch when `exec_allowed`");
    expect(commitWork).toContain("Prohibited; queue PR for human completion");
  });

  it("allows autonomous Magus+ self-merge only with validated execution permission", () => {
    expect(commitWork).toContain("Autonomous, Magus+");
    expect(commitWork).toContain("May self-merge within approved scope");
    expect(commitWork).toContain("loader-validated `exec_allowed`");
  });

  it("visibly degrades missing or invalid authority to human execution", () => {
    expect(commitWork).toContain(
      "Authorization downgraded: <input> is <missing/invalid>. Human execution is required for <commit/merge>.",
    );
    expect(commitWork).toContain("fail closed to the least-authorized path");
    expect(createPullRequest).toContain("visibly downgrades to PR creation only");
    expect(closeSession).toContain("visible authorization downgrade");
  });

  it("keeps commit approval separate from merge approval", () => {
    expect(commitWork).toContain("commit approval never authorizes merge");
    expect(commitWork).toContain("exact PR ID and current head SHA");
    expect(closeSession).toContain("Commit approval is not merge approval");
    expect(fullCycle).toContain("separate from every earlier commit approval");
  });

  it("gates delegated completion and docs-only auto-complete below Magus", () => {
    expect(closeSession).not.toContain("Stage and commit immediately");
    expect(closeSession).toContain("Never invoke merge, auto-complete, or `--status completed` below loader-validated Magus authority");
    expect(createPullRequest).toContain("It does not bypass merge authorization");
    expect(createPullRequest).toContain("Below Magus: create the PR and stop");
    expect(fullCycle).toContain("Below Magus or missing/invalid authority");
  });
});
