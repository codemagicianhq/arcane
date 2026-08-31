import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".github", "prompts");
const COMMANDS = join(process.cwd(), "src", "assets", ".claude", "commands");

let syncPr: string;
let commandStub: string;
let createPr: string;
let ship: string;

beforeAll(async () => {
  [syncPr, commandStub, createPr, ship] = await Promise.all([
    readFile(join(PROMPTS, "spell-sync-pull-request.prompt.md"), "utf8"),
    readFile(join(COMMANDS, "spell-sync-pull-request.md"), "utf8"),
    readFile(join(PROMPTS, "spell-create-pull-request.prompt.md"), "utf8"),
    readFile(join(PROMPTS, "spell-ship.prompt.md"), "utf8"),
  ]);
});

describe("spell-sync-pull-request: guard checks and recoverable ref (BC-18)", () => {
  it("requires a clean worktree before touching anything", () => {
    expect(syncPr).toContain("git status --porcelain");
    expect(syncPr).toContain("**STOPS** this spell before it touches anything");
  });

  it("creates a recoverable ref before any history-rewriting operation, and never deletes it automatically", () => {
    expect(syncPr).toContain("sync-backup/<branch>/$(date +%Y%m%d-%H%M%S)");
    expect(syncPr).toContain("**Never delete this tag automatically**");
    expect(syncPr).toContain("Never delete the recoverable ref automatically.");
  });
});

describe("spell-sync-pull-request: fixture 1 — clean sync (BC-18)", () => {
  it("treats a conflict-free replay as the fast path, not a special case", () => {
    expect(syncPr).toContain("this is the common case and it must\nnot be treated as a special case of conflict handling");
  });
});

describe("spell-sync-pull-request: fixture 2 — conflicting rebase, mechanically resolved (BC-18)", () => {
  it("defines the mechanical-resolution boundary precisely", () => {
    expect(syncPr).toContain("**Mechanically resolvable**");
    expect(syncPr).toContain("both sides made the identical change");
    expect(syncPr).toContain("verify no line from either");
  });
});

describe("spell-sync-pull-request: fixture 3 — stale lease rejection (BC-18)", () => {
  it("never retries a rejected lease blindly or escalates to bare --force", () => {
    expect(syncPr).toContain("git push --force-with-lease");
    expect(syncPr).toContain("**do not retry with `--force`, and do not retry");
    expect(syncPr).toContain("Re-fetch and re-evaluate from Step 2 as if starting over");
  });

  it("states the never-bare-force rule in the Rules section too, not only inline", () => {
    expect(syncPr).toContain("Never push with bare `--force`");
  });
});

describe("spell-sync-pull-request: fixture 4 — ambiguous-conflict handoff (BC-18)", () => {
  it("aborts rather than guessing, and names the exact conflicting content", () => {
    expect(syncPr).toContain("**Ambiguous**");
    expect(syncPr).toContain("**STOP.** Do not guess, do not pick a");
    expect(syncPr).toContain("git rebase --abort");
    expect(syncPr).toContain("Both sides' conflicting content, verbatim.");
  });

  it("never proceeds past an ambiguous hunk even if the rest of the file looks fine", () => {
    expect(syncPr).toContain("Never proceed past an ambiguous hunk on the theory that");
  });
});

describe("spell-sync-pull-request: fixture 5 — GitHub/ADO post-push verification (BC-18)", () => {
  it("verifies the provider-reported head SHA, not just push success", () => {
    expect(syncPr).toContain("gh pr view <PR#> --json headRefOid,mergeable");
    expect(syncPr).toContain("az repos pr show --id <PR_ID>");
    expect(syncPr).toContain("headRefOid` must equal the new HEAD SHA");
  });

  it("applies the EF-21 dispatched-is-not-succeeded distinction explicitly", () => {
    expect(syncPr).toContain('the exact "dispatched is not succeeded" gap EF-21');
    expect(syncPr).toContain("do not report success");
  });
});

describe("spell-sync-pull-request: reuses spell-create-pull-request's provider table (D8)", () => {
  it("references Step 2's provider-detection rather than re-deriving it", () => {
    expect(syncPr).toContain("reuse `spell-create-pull-request`'s Step 2");
  });
});

describe("spell-sync-pull-request: gates re-run before push (BC-18)", () => {
  it("re-runs typecheck/lint/test after replay, treating a gate failure like a hard stop", () => {
    expect(syncPr).toContain("npm run typecheck && npm run lint && npm run test");
    expect(syncPr).toContain("the same class of stop as an ambiguous conflict");
  });
});

describe("spell-sync-pull-request: command stub ships proactive-trigger frontmatter (matching R2/BC-16)", () => {
  it("has frontmatter with a Use PROACTIVELY description", () => {
    expect(commandStub).toContain("---\ndescription: Use PROACTIVELY");
  });
});

describe("spell-create-pull-request and spell-ship route their conflict-stops here (BC-18)", () => {
  it("spell-create-pull-request Step 0.6 points at spell-sync-pull-request", () => {
    expect(createPr).toContain("**or run `spell-sync-pull-request`**");
  });

  it("spell-create-pull-request lists it under Related spells", () => {
    expect(createPr).toContain("`spell-sync-pull-request` — the recovery path when Step 0.6's rebase guard hits a conflict.");
  });

  it("spell-ship Step 2 points at spell-sync-pull-request", () => {
    expect(ship).toContain("or run `spell-sync-pull-request`");
  });
});
