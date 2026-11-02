# 2026-11-02 — spell-parallel-workers

Related: [[spell-authoring-standards]], [[git-conventions]], [[agent-policies]].

## Session: spell-parallel-workers (PR #412)

### Prompt Context

Another session, coordinating a multi-batch conversion with worker sessions, asked for that pattern to be captured as a reusable spell: one orchestrator that owns the plan, the shared files (version, changelog, decision records, progress notes, lint scope lists, counters), the merge order and every protocol step; workers that each take one disjoint slice in their own worktree and leave only a prep branch plus a short note in a shared notes folder; the orchestrator integrates each slice when the stack reaches it, and the operator merges. The brief asked for a flow diagram, a worker brief template, a note template, an integration checklist and failure cases, with no company, product or personal names (the repository is public). It also said not to commit without the operator's approval, and to open one pull request without merging it. Later requests from the operator: check whether the docs (the repository's and the website's) update by themselves, then tidy the diagram.

### What Got Done

1. Added `spell-parallel-workers` as `src/assets/.arcane/spells/spell-parallel-workers.md`, with the three generated client shims and the root copies from `fix:self-host-parity`, a fourth entry group in `spells-build` (`src/modules/registry.ts`), the regenerated `docs/spell-catalog.json` and README counts (43 spells), the lite/methodology spell-count literal 41 to 42, the needs-you allowlist in `test/up04-b-needs-you.test.ts`, and `test/parallel-workers.test.ts`.
2. Released as 1.15.0: `package.json` and `package-lock.json` bumped from 1.14.3, with a `## [1.15.0] - 2026-11-02` entry in `CHANGELOG.md`.
3. [PR #412](https://github.com/codemagicianhq/arcane/pull/412) merged by the operator on 2026-11-02 (rebase merge; head `bedcde0`). Checked after the merge: the `v1.15.0` release exists, `publish.yml` succeeded, `npm view arcane-cli version` returns 1.15.0, and CI and Release drift on `main` succeeded.
4. Checked how the website picks the spell up, by reading its sync scripts: a scheduled pipeline pulls the latest published `arcane-cli`, refreshes the catalog snapshot, changelog and version, vendors the release's spell and governance files, and opens a bot PR. A new spell gets a spellbook card from its catalog tagline, filed by its component group, so nothing is written by hand. The Mermaid diagram is rendered during that sync, so it was rendered once locally (Mermaid 11.12.0) and redrawn top-down to remove crossing edges.

### Lessons Learned

#### A branch-format literal in a new spell failed only at the full suite

The first draft of the spell named the prep-branch format in full. `test/branch-naming-fragment.test.ts` forbids that string anywhere outside the `branch-naming` fragment and its generated copies, and it ran only in the full suite, after the targeted tests had passed. Nothing in `spell-authoring-standards.md` tells a spell author that the format has a single source, so the author finds out from a failing test. The spell now says "the session form of the branch-naming rule" and the test asserts the literal is absent.

#### An independent read found contradictions in my own spell with the spells it cites

A reviewer who read the draft against `spell-commit-work`, `spell-create-pull-request` and `git-conventions.md` found four high-severity problems that my own checks, including the full suite, could not see. A "worker may commit" line passed along in a brief contradicted the exact-approval gate in `spell-commit-work` steps 4.5 and 8. Running `spell-commit-work` before the reviews would have pushed and opened the pull request first. Removing a worker's worktree would have failed or destroyed uncommitted changes. And there was no defined way for a worker's report to reach the orchestrator. All were fixed before the first commit. A spell that tells the reader to run another spell's steps should be read against those steps by someone who did not write it.

#### A relayed approval is not approval

The session that started this one relayed "Approve commit" from the operator. `spell-commit-work` step 8 says a delegated response is not approval, so the exact staged diff, message and a fingerprint went to the operator in this session, and each commit was made only after the fingerprint matched. The same gate applied to the diagram tidy: "go ahead" in chat was not approval of a diff.

#### Say "automatic" only after reading the pipeline

The first instinct, that website docs update by themselves, was right, but it rested on the catalog being generated. Reading the website's sync code turned up the part that matters: the diagram is rendered during the sync, so one that fails to render would stop the whole refresh and no bot PR would open. The browser pane shows a `file://` page as a static snapshot and will not run its scripts, so the render check served the page over localhost instead.

### Open Items Carried Forward

- The website's bot sync PR for 1.15.0 is not yet observed (`pending`): the pipeline runs every 6 hours. Check the website repository's pull requests for a branch named for the arcane sync after the next run, and merge it to deploy.
- Optional: add a curated search query for the new spell's reference page in the website's `scripts/docs-search-queries.json`, once the page exists. It lives in that repository, so it is the operator's call and is not tracked here (untracked: optional, no requirement checks for it).
- The branch-naming rule in `git-conventions.md` calls its suffix `-<agent>`; the new spell uses a slice id there. Queued in `FEEDBACK.md` ("Feedback — Arcane workflow (2026-11-02)").
- This session ran `spell-open-session` only as far as the branch rename and did not surface the 2026-11-01 handoff. Its items were checked afterwards: the `sync-backup/*` tags and the stash entry are gone, and the Windows-machine items are in `TODO.md` ("Operator-machine follow-ups from the 2026-10-09 and 2026-10-12 handoffs").
- Another session's worktree (`sessions/2026-10-27-app-store-accounts-spell`) remains attached with its remote branch deleted. Not touched.
