#!/usr/bin/env tsx
/**
 * scripts/check-review-round.ts
 *
 * CI gate (ARC-035 decision 2): fails only while the PR carries an
 * outstanding, un-dismissed CHANGES_REQUESTED review. A PR with zero reviews
 * passes — this gates on the ABSENCE of an active objection, not the
 * PRESENCE of an approval, because in this repository the author and the
 * only available human reviewer are routinely the same GitHub identity.
 * GitHub refuses self-approval, so requiring `required_approving_review_count`
 * would make every PR permanently unmergeable under a ruleset that already
 * has `current_user_can_bypass: "never"`.
 *
 * The decision logic is a pure function (`decideReviewRound`) so it can be
 * unit-tested against fixture review payloads (test/review-round-gate.test.ts)
 * independently of a live `gh api` call — unlike check-version-bump.ts's
 * git-fixture pattern, a real PR's review history cannot be fabricated
 * locally.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Matches GitHub's own REST review "state" values. PENDING reviews have no
// submitted_at and are never returned by the reviews-list endpoint as final.
export interface ReviewEvent {
  user: { login: string };
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING" | string;
  submitted_at: string | null;
}

export interface ReviewRoundResult {
  blocked: boolean;
  reason: string;
}

/**
 * Per reviewer, only APPROVED / CHANGES_REQUESTED / DISMISSED are
 * state-changing — this mirrors GitHub's own mergeability computation, which
 * a COMMENTED review does not affect at all. Comparing submitted_at only
 * among those three states means an intervening comment can never appear to
 * "clear" a standing CHANGES_REQUESTED just because it is more recent.
 */
export function decideReviewRound(reviews: ReviewEvent[]): ReviewRoundResult {
  const stateChanging = reviews.filter(
    (review) =>
      review.submitted_at !== null &&
      (review.state === "APPROVED" ||
        review.state === "CHANGES_REQUESTED" ||
        review.state === "DISMISSED"),
  );

  const latestByUser = new Map<string, ReviewEvent>();
  for (const review of stateChanging) {
    const existing = latestByUser.get(review.user.login);
    if (!existing || review.submitted_at! > existing.submitted_at!) {
      latestByUser.set(review.user.login, review);
    }
  }

  const blockers = [...latestByUser.values()].filter((r) => r.state === "CHANGES_REQUESTED");
  if (blockers.length === 0) {
    return { blocked: false, reason: "no outstanding CHANGES_REQUESTED review" };
  }
  return {
    blocked: true,
    reason: `outstanding CHANGES_REQUESTED from: ${blockers.map((b) => b.user.login).join(", ")}`,
  };
}

function run(cmd: string): string {
  // stderr piped, not inherited: a missing/unauthenticated `gh` should
  // produce this script's own error message, not a raw CLI stack.
  return execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
}

async function main(): Promise<void> {
  const prNumber = process.env["PR_NUMBER"];
  const repo = process.env["GITHUB_REPOSITORY"];
  if (!prNumber || !repo) {
    console.error(
      "check-review-round: PR_NUMBER and GITHUB_REPOSITORY must be set (this check only runs on pull_request events).",
    );
    process.exitCode = 1;
    return;
  }

  let reviews: ReviewEvent[];
  try {
    const raw = run(`gh api repos/${repo}/pulls/${prNumber}/reviews --paginate`);
    reviews = JSON.parse(raw) as ReviewEvent[];
  } catch (error) {
    console.error("check-review-round: failed to read PR reviews via `gh api`.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const result = decideReviewRound(reviews);
  if (result.blocked) {
    console.error(`✗ Review round is open: ${result.reason}`);
    console.error(
      "  Resolve the round (fix the blocker, re-review, then dismiss/supersede the review) before merging.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`✓ Review round clear: ${result.reason}`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error("check-review-round failed:", error);
    process.exitCode = 1;
  });
}
