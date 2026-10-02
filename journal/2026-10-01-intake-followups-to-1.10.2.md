# 2026-10-01 — The intake's follow-ups: timeouts, the gitattributes item, 1.10.1 and 1.10.2

Related: [[development-methodology]] (the bug and commit workflows these fixes ran through),
[[git-conventions]] (branch cleanup and the rebase-merge behaviour behind it), [[testing-standards]]
(the named-timeout convention).

## Session: Upstream intake to 1.10.2

### Prompt Context

Continued from `journal/2026-09-29-upstream-intake-closeout-and-scope.md` after PR #316 merged. The
operator said "you delete stale branches, go on the timeout item", then "go on the gitattributes
item", then "let's do them in order" for four proposed items: the Epic 2 review leftovers, the
`spell-sync-pull-request` Step 3 item, `spell-feedback --flush`, and the operator-only leftovers.
Standing constraints held throughout: the operator merges, every commit carries a fingerprinted
approval, a normal push first and `--no-verify` only when asked.

### What Got Done

1. **Pre-push timeouts fixed.** [PR #317](https://github.com/codemagicianhq/arcane/pull/317) (merged 2026-10-01T01:30Z): `HEAVY_TEST_TIMEOUT` set at describe level on the `--user` describe in `test/update.test.ts` (12 tests, none had a budget) and on all 13 describes in `test/push-safety.test.ts` (44 of 52 tests had none). Every push since went through the hook without `--no-verify`.
2. **The HIGH `up03-a-gitattributes` item closed as not reproducible.** [PR #318](https://github.com/codemagicianhq/arcane/pull/318): the file alone, five parallel full runs, two consecutive `--no-file-parallelism` runs on a rebuilt `dist/`, and a fresh clone with `npm ci`, build and two runs all passed it. The "leaking test file" has no mechanism in vitest 5.0.0 (see Lessons). The 2026-09-28 cause is unidentified and `TODO.md` says so.
3. **`1.10.1`: the Epic 2 review leftovers.** [PR #319](https://github.com/codemagicianhq/arcane/pull/319): an unrecorded file identical to the packaged one is adopted; a directory at a destination is its own state, refused cleanly even under `--force`; `executeInstallPlan` rolls back a failed install; `test/doctor-requires-initonly.test.ts` fixtures the `initOnly`-prerequisite wording. Twelve new tests fail against the previous source. Release `v1.10.1` exists and `publish.yml` succeeded.
4. **`1.10.2`: the regenerable conflict class.** [PR #320](https://github.com/codemagicianhq/arcane/pull/320): `spell-sync-pull-request` Step 3 is "mechanical, regenerable, or ambiguous"; a script-owned artifact is regenerated against the rebased tree and verified by its own `--check`. Five string assertions fail against the previous spell. Release `v1.10.2` exists, `publish.yml` succeeded, and the registry answers `1.10.2`.
5. **`spell-feedback --flush`.** Five queued items filed on the operator's literal `disclose` as [#321](https://github.com/codemagicianhq/arcane/issues/321)–[#325](https://github.com/codemagicianhq/arcane/issues/325); [PR #326](https://github.com/codemagicianhq/arcane/pull/326) marks them filed in `FEEDBACK.md`.
6. **Branch cleanup.** Ten local session branches and two remote branches deleted after `git cherry main <branch>` showed no unlanded commit; two remote branches and five `backup/*` snapshots with unlanded content were reported, not deleted.
7. **`TODO.md`:** four items closed in their own PRs (timeouts, gitattributes, review leftovers, sync-PR Step 3) and one filed (the `init-git-state` EBUSY cleanup race, seen once).

### Lessons Learned

#### Two "serial" runs at once are not serial

To satisfy the gitattributes item's `--no-file-parallelism` condition faster, I launched the suite's two halves as two background runs at the same time. Each half failed one test on a load timeout (15 s in `adr-reference-gate`, 16 s in `push-safety`), which I then had to discount, and neither run counted as the evidence the item asked for. The proper evidence was two full serial runs, one after the other, with nothing else on the machine. A condition about isolation is defeated by any shortcut that reintroduces contention.

#### "Not reproducible" needs the mechanism ruled out, not only green runs

Green runs alone would have left the gitattributes item as "probably fine". What made the close defensible was reading the code the hypothesis depended on: the real `ensureLocalPullRebase` returns an object on every path, so the reported `TypeError` could only come from a mock with its implementation stripped; the test file never resets mocks; and `@vitest/spy` 5.0.0's `restoreAllMocks` walks only the restores `spyOn` registers, so it cannot strip a `vi.fn()`. With no mechanism and no reproduction under every stated condition, the item closes with its cause recorded as unidentified, which is different from recorded as fixed.

#### The failing test moved, so the budget goes on the describe

Three earlier observations named different `--user` tests timing out on different runs. Putting a timeout on the two tests first named would have fixed nothing. Vitest 5 honours `describe(name, { timeout }, fn)` (probed with a 20 ms budget failing a 200 ms test), and the budget is the repository's existing named constant, not a larger global default. When a flake's victim changes between runs, the unit to fix is the group that shares the cost.

#### An approval carries its own fingerprint, and a count carries its command

Once I asked for a commit approval whose question pointed at the fingerprint "in the command output above" instead of stating it. The recompute bound the commit to the value shown, but the question itself should have carried it. In the same stretch I said "four queued items" when `grep` showed five. Both are the same failure as the 2026-09-29 lesson on counts from memory: a number or a hash in front of the operator comes from the command that produced it, written where they are asked to rely on it.

#### A disclose prompt should say where the issue lands

After the flush the operator asked where issues #321–#325 had come from and whether this session made them. Each had been filed on a literal `disclose`, but the prompt named only the item, and nothing after the run listed "these issues were created by this session, on this repository, from these `FEEDBACK.md` entries". In Arcane's own repository the upstream target is the repository itself, which made five new issues appear beside three older ones from a consumer session with no visible difference in origin.

### Open Items Carried Forward

- **This close's docs PR** — `dispatched` once opened; the operator merges it.
- **Unlanded branches, for a land-or-abandon call:** `origin/sessions/2026-08-15-queue-failfast-doclink-ideas` (one docs commit), `origin/docs/spell-full-cycle-coordination-gaps` (two), and five local `backup/*` snapshots.
- **Untriaged issues:** #297, #298, #299 (a consumer session, 2026-09-28) and #321–#325 (this session's flush).
- **`init-git-state` EBUSY cleanup race** — `TODO.md` ("LOW (test infrastructure, Windows): `test/init-git-state.test.ts`"); waits on a second sighting.
- **Next agent-actionable items** in `TODO.md`: the worktree branch-naming item, the five spells' diverged `tracking_mode` logic, and the doctor unowned-package gaps.
