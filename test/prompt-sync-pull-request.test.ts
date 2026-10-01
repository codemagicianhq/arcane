import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROMPTS = join(process.cwd(), "src", "assets", ".arcane", "spells");
const COMMANDS = join(process.cwd(), "src", "assets", ".claude", "commands");

let syncPr: string;
let commandStub: string;
let createPr: string;
let ship: string;

beforeAll(async () => {
  [syncPr, commandStub, createPr, ship] = await Promise.all([
    readFile(join(PROMPTS, "spell-sync-pull-request.md"), "utf8"),
    readFile(join(COMMANDS, "spell-sync-pull-request.md"), "utf8"),
    readFile(join(PROMPTS, "spell-create-pull-request.md"), "utf8"),
    readFile(join(PROMPTS, "spell-ship.md"), "utf8"),
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

describe("spell-sync-pull-request: fixture 6 — regenerable artifact, regenerate not merge (TODO 2026-09-28)", () => {
  it("names the third conflict class between the mechanical and ambiguous ones", () => {
    const mechanical = syncPr.indexOf("**Mechanically resolvable**");
    const regenerable = syncPr.indexOf("**Regenerable**");
    const ambiguous = syncPr.indexOf("**Ambiguous**");
    expect(mechanical).toBeGreaterThan(-1);
    expect(regenerable).toBeGreaterThan(mechanical);
    expect(ambiguous).toBeGreaterThan(regenerable);
    expect(syncPr).toContain("## Step 3 — Classify any conflict: mechanical, regenerable, or ambiguous");
  });

  it("says neither side is right and forbids hand-merging or picking a side", () => {
    expect(syncPr).toContain("Neither side's content is the right answer");
    expect(syncPr).toContain("**Do not\n  hand-merge the diff and do not pick a side.**");
    expect(syncPr).toContain("run its regeneration\n  command, verify with the file's own `--check` command, then stage the file");
  });

  it("names the show report as the first artifact, with its fix and check commands and the completed-day rule", () => {
    expect(syncPr).toContain("`docs/plans/*/show-report.{json,html}` — `npm run fix:report`");
    expect(syncPr).toContain("verified by `npm run check:report`");
    expect(syncPr).toContain("**trailer-free, report-only commit**");
    expect(syncPr).toContain("npm run fix:self-host-parity");
    expect(syncPr).toContain("`package-lock.json` — `npm install`");
  });

  it("refuses to promote a file without a named regeneration command, in Step 3 and in the Rules", () => {
    expect(syncPr).toContain("A file you cannot name a regeneration command for is not regenerable");
    expect(syncPr).toContain("Never hand-merge a script-regenerable artifact");
    expect(syncPr).toContain("never classify a file as regenerable without naming the command");
  });

  it("reports a regeneration in Step 6 with the command and the check that verified it", () => {
    expect(syncPr).toContain("If Step 3 regenerated any artifact, name the file, the regeneration command that was run and the\n  `--check` command that verified the result.");
  });
});
