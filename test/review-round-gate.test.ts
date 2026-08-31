import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { decideReviewRound, type ReviewEvent } from "../scripts/check-review-round.js";

function review(
  login: string,
  state: ReviewEvent["state"],
  submittedAt: string | null,
): ReviewEvent {
  return { user: { login }, state, submitted_at: submittedAt };
}

describe("review round decision function", () => {
  it("passes when there are no reviews at all", () => {
    expect(decideReviewRound([]).blocked).toBe(false);
  });

  it("blocks on an outstanding CHANGES_REQUESTED review", () => {
    const result = decideReviewRound([
      review("alice", "CHANGES_REQUESTED", "2026-01-01T00:00:00Z"),
    ]);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("alice");
  });

  it("passes once the same reviewer supersedes their own block with an approval", () => {
    const result = decideReviewRound([
      review("alice", "CHANGES_REQUESTED", "2026-01-01T00:00:00Z"),
      review("alice", "APPROVED", "2026-01-02T00:00:00Z"),
    ]);
    expect(result.blocked).toBe(false);
  });

  it("passes once a blocking review is explicitly dismissed", () => {
    const result = decideReviewRound([review("alice", "DISMISSED", "2026-01-01T00:00:00Z")]);
    expect(result.blocked).toBe(false);
  });

  it("is not cleared by a later COMMENTED review from the same reviewer", () => {
    const result = decideReviewRound([
      review("alice", "CHANGES_REQUESTED", "2026-01-01T00:00:00Z"),
      review("alice", "COMMENTED", "2026-01-02T00:00:00Z"),
    ]);
    expect(result.blocked).toBe(true);
  });

  it("is not cleared by a different reviewer's approval", () => {
    const result = decideReviewRound([
      review("alice", "CHANGES_REQUESTED", "2026-01-01T00:00:00Z"),
      review("bob", "APPROVED", "2026-01-02T00:00:00Z"),
    ]);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("alice");
  });

  it("ignores a PENDING review with no submitted_at", () => {
    const result = decideReviewRound([review("alice", "PENDING", null)]);
    expect(result.blocked).toBe(false);
  });

  it("reports every blocking reviewer, not just the first", () => {
    const result = decideReviewRound([
      review("alice", "CHANGES_REQUESTED", "2026-01-01T00:00:00Z"),
      review("bob", "CHANGES_REQUESTED", "2026-01-01T00:00:00Z"),
    ]);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("alice");
    expect(result.reason).toContain("bob");
  });
});

describe("review round CI wiring", () => {
  it("runs as a required CI step, gated to pull_request events only", async () => {
    const workflow = await fs.readFile(join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8");
    expect(workflow).toContain("name: Review round clear");
    expect(workflow).toContain("run: npm run check:review-round");

    const jobStart = workflow.indexOf("review-round:");
    const nextJobStart = workflow.indexOf("\n  build-test:");
    const job =
      jobStart === -1 ? "" : workflow.slice(jobStart, nextJobStart === -1 ? undefined : nextJobStart);
    expect(job).toContain("if: github.event_name == 'pull_request'");
  });
});

describe("pre-push closed-PR warning (ARC-035 decision 4)", () => {
  it("warns without blocking when gh reports the branch's PR as closed or merged", async () => {
    const hook = await fs.readFile(join(process.cwd(), ".husky", "pre-push"), "utf8");

    expect(hook).toContain('gh pr view "$branch" --json state --jq .state');
    expect(hook).toContain('"$pr_state" = "CLOSED"');
    expect(hook).toContain('"$pr_state" = "MERGED"');
    // Degrades silently: no `exit 1` anywhere in the gh/PR-state block, and
    // gh's own absence is checked before it is ever invoked.
    expect(hook).toContain("command -v gh >/dev/null 2>&1");
    expect(hook.split("npm test")[0]).not.toContain("exit 1");
  });
});
