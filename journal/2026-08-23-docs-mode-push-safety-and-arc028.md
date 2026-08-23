# 2026-08-23 — Docs Mode, Push Safety, and ARC-028's Follow-Ups

## Session: Four work packages through the full spell loop, with three review rounds that each found HIGH defects in the previous round's fixes

### Prompt Context

Continued from the 2026-08-22 batch closeout. The operator asked to complete every
remaining actionable item — the deferred docs-mode intake findings, the accepted-but-
unimplemented push-safety design, ARC-028's leftovers, and the tooling findings flagged
and parked during the previous run — with all clarifying questions front-loaded.

Eight decisions were collected up front and recorded as D1–D8 in the plan. The load-bearing
ones: presets over a split registry (no spell file renamed or moved, old manifests
auto-migrate); `subject_root` may coexist with `business_root` and `"."` is legal, so
adoption never forces a restructure; EF-09 accepted as designed; **Chamber** as the ARC-028
name, conditional on clearing a four-check; and auto-merge on green with a skip-and-continue
halt policy.

### What Got Done

1. **Tooling fixes (`0.17.1`)** — `scripts/check-version-bump.ts` was building
   `origin/main:package.json:package.json` and always failing, with the `||` fallback doing
   100% of the work; `vitest.config.ts` had no `test.exclude` at all, so the primary checkout
   discovered this worktree's tests a second time; `correctUnbornMasterDefault`'s bare `catch`
   treated a corrupt ref as an absent one.

   The planned fix for the third was **empirically wrong**. The plan said `git show-ref
   --verify --quiet` returns 1 for absent and 128 for error. Direct testing showed it returns
   **1 for both**. Only `for-each-ref --format=%(objectname)` separates healthy / corrupt /
   absent, and a dangling symref needs a further `symbolic-ref -q` probe. Review independently
   reproduced this and confirmed the replacement.

2. **Registry split + docs profile (`0.18.0`)** — the monolithic `spell-prompts` /
   `claude-commands` components became eight capability groups plus `spells-docs`. No spell
   file was renamed or moved; grouping lives only in registry definitions. Legacy manifests
   migrate deterministically on `spell update`.

3. **Docs-mode fields, content, and adoption (`0.19.0`)** — `subject_root` and
   `content_sensitivity` on the ARC-032 persist-once contract, `records-conventions.md` with
   in-place tombstone metadata, the `.gitattributes`/`.gitignore` baseline, sensitivity rails,
   `spell-adopt-docs` re-derived from MH-04, and the `git-conventions` vs `cicd-standards`
   PR-requirement contradiction resolved toward ADR-048's docs-only exception.

4. **Push safety (`0.20.0` → `0.20.2`)** — EF-09's accepted design implemented as ARC-034,
   then fixed across three review rounds. See Lessons Learned; this is the substance of the
   session.

5. **ARC-028's follow-ups and EF-35 (`0.21.0`)** — items 11(a) and 11(b) completed, 11(c)
   reclassified out of scope (it belongs to the DMC/ops repo), 11(e) parked on the failed
   four-check. EF-35 filed for the secret-scanning gap.

All published: `0.21.0` is on npm and the tarball was verified to contain the fixes, not
just main.

### Decisions Made

| ADR | Decision | Rationale |
|---|---|---|
| ARC-033 | Docs mode: `subject_root`, `content_sensitivity` | Third amendment to ARC-020, following ARC-030/ARC-032; ARC-020 itself stays Proposed for its broader scope |
| ARC-034 | Push safety for sensitive repositories | Two layered controls covering each other's bypass; the record states its limits rather than implying a guarantee |

### Lessons Learned

#### Enumerating cases is not the same as verifying the outcome

The push-safety URL layer went through four distinct defects that were all the same defect:
a remote name that is legal for git but illegal as a config key; `origin` and `Origin`
colliding on a case-insensitive key; a mirror remote with two push URLs; and a push URL
contributed by an `include`d file. Each round I fixed the case review found and shipped.

The fourth round I stopped enumerating and made `disableOneRemote` **re-read what git actually
resolves after writing**, failing unless the result is exactly the sentinel. That one change
closes cases nobody has thought of yet. It should have been the response to the second
finding, not the fourth — the signal was there once "another way the same layer leaks"
appeared twice.

#### A control absent exactly where the framework sends you

The worst defect of the run: `core.hooksPath` was written as the relative literal
`.arcane/hooks`, and git resolves that against *each worktree's own top level*, while the
hook file is untracked and exists only in the checkout that created it. So every linked
worktree had the config and no hook, and `git push <url>` delivered the full history in one
ordinary command while `spell doctor` reported the repository blocked.

ARC-028 R3 — this project's own concurrency model, written in this same session — routes
every additional concurrent session into a linked worktree. The control was missing precisely
where the framework instructs people to work. Two features authored days apart, each correct
in isolation, combining into a hole neither's tests could see.

#### A completion claim needs the search that could disprove it

I wrote "everything this repository owns is now done" for ARC-028 after a pass driven by a
list of sites. Three spells still carried an unconditional `git checkout main` — and one was
`spell-full-cycle`, a file the same commit edited: it gained an R4 paragraph at line 203 while
the live trap at line 107 stayed.

Every test in that file was a positive assertion about a file the pass had touched, which is
exactly why it shipped green: nothing asked *is there anywhere else?* The fix is a
repository-wide negative test that fails if any distributed prompt or governance document
contains a trunk checkout without primitive scoping nearby, plus a self-check asserting its
own matcher fires — a negative test that cannot fail reports safety it never checked.

#### A test named for a property must exercise that property

The regression guarding the global-scope `core.hooksPath` fix set only a **local** value.
Nothing in it distinguished `git config --get` from `git config --local --get` — the exact
difference being fixed. Its comment justified the weaker version by claiming a hermetic
alternative would be hostile to whoever ran the suite. That reasoning was wrong:
`GIT_CONFIG_GLOBAL` does it hermetically and was available the whole time.

The same blind spot broke the suite on any machine with a global `core.hooksPath` — six
failures on precisely the developer setup the fix was written for.

#### Auto-merge and review rounds are two signals that need coupling

D8's auto-merge fired on CI green for PR #63 while an adversarial round was still open. It
merged the first fix commit; the second — the one fixing the HIGH finding — landed on a
closed PR's branch and never reached main. **0.20.0 went to npm with the defect live.**

CI green means "the tests that exist pass." It says nothing about whether a review in flight
has already found a blocker. Nothing in the merge rule connects them. This is the one
unaddressed process gap from the run.

#### Verify the merge, not the merge report

After #63, every subsequent merge was verified with `git diff <branch-tip> origin/main`
returning empty, rather than trusting the merge to have taken the whole branch. The #65
rebase then hit a real CHANGELOG conflict between 0.20.2 and 0.21.0; keeping both entries and
confirming afterward that neither body was mangled caught nothing wrong, but a resolution that
silently drops half an entry reads as fine in a diff stat.

### Open Items Carried Forward

- **ARC-028's name** — Chamber failed the four-check. Trademark clean, but OpenChamber (9.1k★,
  "an agentic development environment" organised around *Sessions* — the inverse of the
  sentence Arcane wanted), cirruslabs/chamber (semantically identical, OpenAI-adjacent), and
  Chamber YC W26 all occupy the same audience, with segmentio/chamber owning first association.
  Vetted alternatives in ARC-028 item 10: **Grotto** (cleanest of everything checked),
  **Cloister** (semantically closest), Vestry, Oratory. Avoid Enclave — it means SGX
  confidential-computing memory to developers. **This is now the only thing keeping ARC-028 at
  Proposed.**
- **EF-35** — deferred pending its ADR. The `threat-model.md` overclaim it identified is
  already corrected; the scanner decision remains.
- **EF-18** — still blocked on a genuine independent batch-002 submission.
- **The auto-merge gap** — raised twice, not yet acted on.
