**Unattended-run preflight (ARC-061).** Run before the operator leaves when they
request unattended execution; otherwise skip. An earlier preflight can be reused
only for the same approved plan, checkout, scope and unchanged policy. The
orchestrator owns it; workers receive only a narrower, explicit brief.

1. Gather **every blocking question in one batch**: scope, unresolved product/ADR
   decisions, action permissions, expiry, required checks and any access gaps.
   Use the harness question UI when available. Continue independent work while
   waiting; unanswered required questions never become consent by timeout.
2. Inspect the authenticated CLI identity, PR author identity, repository, target
   branch, effective policies and allowed merge strategies. Report unknown on
   an auth/network/parse failure; do not infer permission from tool availability.
   - **GitHub:** read the repository merge settings, effective branch Rulesets
     (`gh api repos/<owner>/<repo>/rules/branches/<branch>`) **and** classic branch
     protection when present; include inherited rules. Read required approvals,
     code-owner/last-push review constraints and required status checks. PR authors
     cannot approve their own PRs: a grant cannot supply an independent review.
     Check `gh pr checks` and current review decisions before completion. Honor
     linear-history constraints when choosing merge or rebase; never squash.
   - **Azure DevOps:** read target-scoped enabled policy configurations with
     `az repos policy list --repository-id <id> --branch <branch> --org <url> --project <project>`.
     Inspect minimum reviewers (`creatorVoteCounts`, last-pusher/iteration vote
     restrictions), required reviewer policies, build validation and allowed merge
     types. Only an explicitly permitted creator vote may count; other required
     reviewers still wait for those reviewers. Read the PR's policy evaluations
     before completion. Optional or path-filtered validation is not blanket proof.
   - **Validation:** state whether required PR validation exists and covers this
     change. If it does not, identify and run the repository's approved local
     checks against each exact completion head. A green old head is insufficient.
3. Record the run grant while the operator is present, through the existing
   commit approval gate or an explicit operator instruction authorizing the grant
   record's own commit. Verify provenance and every field per agent-policies.md.
   Repos with and without a roster use the same temporary grant format. Do not
   change standing power or loosen push policy to make a run possible.
4. Save a **Preflight result** with repository/branch/head, identity, policy sources
   and observation time, grant ID/expiry, required checks, and an action table:

   | Action | Will run unattended | Will wait for operator / reason |
   | --- | --- | --- |
   | Commit, push, PR creation/assignment | List exactly which are authorized | List each missing grant/access/push confirmation |
   | Approval, completion, branch deletion | List exactly which are possible under policy | Name each required independent review or other blocker |

   Say explicitly **what will run unattended and what will wait for the operator**.
   Put every operator-only action in the Action required block. Before arming
   auto-merge, finish review and ensure it cannot outlive the grant; otherwise
   monitor checks and revalidate before completing. Recheck policies if changed.

Enforcement: structured spell gate (ARC-023); prompt-contract tests verify that
all three orchestrating spells contain this shared preflight. No settings mutate.

Related: [[.arcane/governance/agent-policies]].
