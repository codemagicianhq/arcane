# 2026-08-21 — Merged-Branch Cleanup Verification Gap

## Session: Why branches pile up despite the cleanup rule — a policy-vs-tooling inconsistency found via consumer-repo dogfooding

### Prompt Context

The session opened as a routine `spell-open-session` pass in a consumer repo and pivoted when the operator asked two questions in sequence: first, after 18 stale local branches were found and pruned, "Arcane states what to do and the branches DID pile up — so why were Arcane's rules ignored?"; second, a from-first-principles clarification of squash vs. merge-commit strategies ("I prefer seeing all commits… I think commit history is important, especially when you spent time committing properly"). The operator then asked to verify the resulting recommendations against the freshly published `v0.15.9` and the consumer repo's latest trunk before capturing them in Arcane's backlog.

### What Got Done

1. **Pruned 18 stale local branches in a consumer repo, safely.** Ancestry-based detection (`git branch --merged`) recognized only a subset; content-level verification (commit-subject match against the freshly fetched trunk, with per-commit checks on the survivors) cleared 17 as landed and caught **1 genuinely unmerged branch** that a naive sweep would have destroyed. Seven landed remote branches were identified for deletion; the environment's permission classifier denied `git push origin --delete` mid-run, so the exact command was handed to the operator instead of being silently dropped.
2. **Root-caused the pile-up as structural, not operator error.** Three causes: (a) the "merging actor deletes the source branch" rule assigns cleanup to an actor that does not exist at merge time when PRs complete in the host web UI — no web-UI merge can delete a branch inside a local clone that is not running; (b) ARC-009 §7 sanctions Rebase-and-fast-forward, and a rebased branch **never** passes the ancestry-based cleanup checks Arcane's own docs prescribe (`git branch -d`, `--merged`) — one sanctioned strategy structurally defeats the sanctioned cleanup commands; (c) classifier-denied cleanup commands drop silently with nothing recording that cleanup is owed.
3. **Resolved the operator's squash question against existing policy rather than re-deciding it.** ARC-009 (Accepted 2026-06-07) already disallows squash for exactly the operator's reasons (per-commit attribution, granular rollback); the session added the nuance that a no-ff merge commit dominates squash even on squash's home turf (`git revert -m 1` gives whole-PR rollback; `git log --first-parent` gives the one-line-per-PR view). Recommended per-repo tightening for the consumer repo: no-ff only, mechanically enforced via the host's merge-type restriction settings.
4. **Verified the findings survive the latest state before capturing them.** Diffed the published `arcane-cli@0.15.9` package against `0.15.8` (entire delta: the one quoted line in `agents/mobile-dev.yaml` from this morning's fix) and against the consumer repo's installed governance files (content-identical) — so the analysis was not based on a stale Arcane version.
5. **Captured the backlog in [TODO.md](../TODO.md):** a new MEDIUM bug entry (content-level merged-verification + an idempotent verified-landed sweep in `spell-close-session` + surfacing denied cleanup commands to the operator), and an extension of the existing `doctor`/`ward` branch-policy item to verify ARC-009 §6–7 are mechanically enforced on the host rather than living only in prose.

### Lessons Learned

#### The caution belongs in the verification, not in refusing to act

The initial instinct was to treat remote-branch deletion as "shared state, ask first" — but Arcane's conventions already assign deletion after merge, and the operator confirmed it. The genuinely dangerous operation is not deleting a branch; it is *wrongly concluding a branch is merged*. Content-level verification is what caught the one unmerged branch among eighteen. Policies that guard the wrong step produce hesitation where it is not needed and none where it is.

#### A sanctioned strategy can structurally defeat sanctioned tooling

ARC-009 permits Rebase-and-fast-forward; git-conventions' cleanup section and `spell-open-session`'s stale-branch check assume ancestry. Both are individually reasonable and jointly broken: any branch merged via the sanctioned rebase path is permanently invisible to the sanctioned cleanup commands. When a policy names an allowed set of strategies, every downstream command that behaves differently across that set needs to be checked against all of them, not just the default.

#### Fetch before measuring, and correct the record when a metric was an artifact

An early claim that ancestry checks were "3× blind" was partly an artifact of measuring against a stale local trunk — the session opened 13 commits behind, and by mid-session the trunk had moved another 13. The blindness is real (rebased and squashed branches), but the dramatic ratio was not. The corrected figure went into the backlog entry; the inflated one would have been quoted forever.

#### A convention that lives only in prose drifts at the speed of the UI

The consumer repo drifted into mixed merge strategies because the host UI offered all four types on every completion. The rule existed, was written down, and was violated by default affordance. Mechanical enforcement (host merge-type restrictions, checked by `doctor`) converts the convention from something every actor must remember into something no actor can forget.

### Open Items Carried Forward

- The two TODO.md captures are the deliverable — no implementation was started on either.
- Consumer-repo follow-ups stay consumer-side: deleting the seven landed remote branches (operator command handed over), holding the one unmerged branch pending review, tightening the host branch policy to no-ff only, and fixing two stale "still open" doc claims found during verification.
- A footnote that proved the session's own thesis: the previous session's close commit looked stranded locally (`6fb8c8a`, unpushed on `docs/session-close-2026-08-21`) and this PR initially carried it — but it had already reached `main` through another path as `bcf49cb`, patch-identical under a different SHA, producing a merge conflict on the PR. Resolved exactly per the documented pattern: rebase onto the fetched trunk, which auto-drops the content-identical commit. SHA-divergent duplicates of landed work are precisely what ancestry-based cleanup can't see.
