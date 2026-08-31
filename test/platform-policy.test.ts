import { describe, it, expect } from "vitest";
import {
  evaluateGitHubMergePolicy,
  evaluateAdoMergePolicy,
  parseGitHubRemote,
  parseAdoRemote,
  SANCTIONED_MERGE_METHODS,
  type GitHubRuleset,
  type AdoMergeTypePolicy,
} from "../src/modules/platform-policy.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// The "healthy" ruleset below is this repo's own real, live-fetched ruleset
// (id 18841659, "protect main") as of 2026-08-31 -- `gh api
// repos/codemagicianhq/arcane/rulesets/18841659` -- not synthesized.

const HEALTHY_RULESET: GitHubRuleset = {
  id: 18841659,
  target: "branch",
  enforcement: "active",
  rules: [
    { type: "deletion" },
    {
      type: "pull_request",
      parameters: {
        required_approving_review_count: 0,
        allowed_merge_methods: ["merge", "rebase"],
      },
    },
    {
      type: "required_status_checks",
      parameters: {
        required_status_checks: [
          { context: "Lint, typecheck, test, build" },
          { context: "PR branch is rebased on target" },
        ],
      },
    },
    { type: "non_fast_forward" },
  ],
};

// Reconstructed from TODO.md's own incident description (2026-08-24/25):
// allowed_merge_methods permitted squash and omitted merge, AND a separate
// required_linear_history rule silently blocked merge commits regardless.
const DRIFTED_RULESET: GitHubRuleset = {
  id: 18841659,
  target: "branch",
  enforcement: "active",
  rules: [
    { type: "deletion" },
    {
      type: "pull_request",
      parameters: { allowed_merge_methods: ["squash", "rebase"] },
    },
    { type: "required_linear_history" },
    { type: "non_fast_forward" },
  ],
};

describe("evaluateGitHubMergePolicy", () => {
  it("passes on this repo's own real, current ruleset", () => {
    const result = evaluateGitHubMergePolicy([HEALTHY_RULESET]);
    expect(result.passed).toBe(true);
    expect(result.effectiveMergeMethods).toEqual(["merge", "rebase"]);
    expect(result.declaredButBlocked).toEqual([]);
  });

  it("fails on the real 2026-08-24/25 drifted shape and names both problems", () => {
    const result = evaluateGitHubMergePolicy([DRIFTED_RULESET]);
    expect(result.passed).toBe(false);
    expect(result.disallowedButPermitted).toContain("squash");
    expect(result.message).toContain("squash");
  });

  it("detects the required_linear_history interaction even when allowed_merge_methods nominally includes merge", () => {
    const ruleset: GitHubRuleset = {
      id: 1,
      target: "branch",
      enforcement: "active",
      rules: [
        { type: "pull_request", parameters: { allowed_merge_methods: ["merge", "rebase"] } },
        { type: "required_linear_history" },
      ],
    };
    const result = evaluateGitHubMergePolicy([ruleset]);
    expect(result.declaredButBlocked).toEqual(["merge"]);
    expect(result.effectiveMergeMethods).toEqual(["rebase"]);
    expect(result.passed).toBe(false); // merge is sanctioned but not effectively available
    expect(result.message).toContain("required_linear_history rule silently blocks merge commits");
  });

  it("reports no active ruleset as a failure, distinct from a passing empty-policy state", () => {
    const result = evaluateGitHubMergePolicy([]);
    expect(result.passed).toBe(false);
    expect(result.effectiveMergeMethods).toBeNull();
    expect(result.message).toContain("Rulesets");
  });

  it("ignores an inactive (evaluate-only) or non-branch ruleset", () => {
    const inactive: GitHubRuleset = { ...HEALTHY_RULESET, enforcement: "evaluate" };
    const result = evaluateGitHubMergePolicy([inactive]);
    expect(result.passed).toBe(false);
  });

  it("defaults to the platform default (all three methods, non-compliant) when no pull_request rule sets allowed_merge_methods", () => {
    const ruleset: GitHubRuleset = {
      id: 2,
      target: "branch",
      enforcement: "active",
      rules: [{ type: "deletion" }],
    };
    const result = evaluateGitHubMergePolicy([ruleset]);
    expect(result.passed).toBe(false);
    expect(result.disallowedButPermitted).toContain("squash");
  });

  it("intersects allowed_merge_methods across multiple active rulesets targeting the branch", () => {
    const rulesetA: GitHubRuleset = {
      id: 1,
      target: "branch",
      enforcement: "active",
      rules: [{ type: "pull_request", parameters: { allowed_merge_methods: ["merge", "squash", "rebase"] } }],
    };
    const rulesetB: GitHubRuleset = {
      id: 2,
      target: "branch",
      enforcement: "active",
      rules: [{ type: "pull_request", parameters: { allowed_merge_methods: ["merge", "rebase"] } }],
    };
    const result = evaluateGitHubMergePolicy([rulesetA, rulesetB]);
    expect(result.effectiveMergeMethods).toEqual(["merge", "rebase"]);
    expect(result.passed).toBe(true);
  });
});

describe("evaluateAdoMergePolicy", () => {
  it("passes when the policy allows exactly merge and rebase, not squash", () => {
    const policies: AdoMergeTypePolicy[] = [
      {
        isEnabled: true,
        isBlocking: true,
        settings: { allowNoFastForward: true, allowRebase: true, useSquashMerge: false },
      },
    ];
    const result = evaluateAdoMergePolicy(policies);
    expect(result.passed).toBe(true);
  });

  it("fails when squash is permitted", () => {
    const policies: AdoMergeTypePolicy[] = [
      {
        isEnabled: true,
        isBlocking: true,
        settings: { allowNoFastForward: true, allowRebase: true, useSquashMerge: true },
      },
    ];
    const result = evaluateAdoMergePolicy(policies);
    expect(result.passed).toBe(false);
    expect(result.disallowedButPermitted).toContain("squash");
  });

  it("reports no enabled policy as a failure", () => {
    const result = evaluateAdoMergePolicy([{ isEnabled: false, isBlocking: false }]);
    expect(result.passed).toBe(false);
    expect(result.message).toContain("Limit merge types");
  });

  it("treats allowRebaseMerge as satisfying the rebase requirement too", () => {
    const policies: AdoMergeTypePolicy[] = [
      {
        isEnabled: true,
        isBlocking: true,
        settings: { allowNoFastForward: true, allowRebaseMerge: true },
      },
    ];
    const result = evaluateAdoMergePolicy(policies);
    expect(result.passed).toBe(true);
  });
});

describe("parseGitHubRemote", () => {
  it("parses an https remote", () => {
    expect(parseGitHubRemote("https://github.com/codemagicianhq/arcane.git")).toEqual({
      owner: "codemagicianhq",
      repo: "arcane",
    });
  });

  it("parses an https remote without .git suffix", () => {
    expect(parseGitHubRemote("https://github.com/codemagicianhq/arcane")).toEqual({
      owner: "codemagicianhq",
      repo: "arcane",
    });
  });

  it("parses an ssh remote", () => {
    expect(parseGitHubRemote("git@github.com:codemagicianhq/arcane.git")).toEqual({
      owner: "codemagicianhq",
      repo: "arcane",
    });
  });

  it("returns null for a non-GitHub remote", () => {
    expect(parseGitHubRemote("https://dev.azure.com/org/project/_git/repo")).toBeNull();
  });
});

describe("parseAdoRemote", () => {
  it("parses a modern dev.azure.com remote", () => {
    expect(parseAdoRemote("https://dev.azure.com/myorg/myproject/_git/myrepo")).toEqual({
      org: "myorg",
      project: "myproject",
      repo: "myrepo",
    });
  });

  it("parses a legacy visualstudio.com remote", () => {
    expect(parseAdoRemote("https://myorg.visualstudio.com/myproject/_git/myrepo")).toEqual({
      org: "myorg",
      project: "myproject",
      repo: "myrepo",
    });
  });

  it("returns null for a non-ADO remote", () => {
    expect(parseAdoRemote("https://github.com/codemagicianhq/arcane.git")).toBeNull();
  });
});

describe("SANCTIONED_MERGE_METHODS", () => {
  it("is exactly merge and rebase, per git-conventions.md's declared ladder", () => {
    expect(SANCTIONED_MERGE_METHODS).toEqual(["merge", "rebase"]);
  });
});
