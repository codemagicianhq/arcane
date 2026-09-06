# 2026-09-06 — SR-07: Enabling the Vendoring Automation, and Three Bugs It Took to Get There

## Session: Turn SR-07 on, and fix what turning it on revealed

### Prompt Context

The Show Report program closed the day before with SR-07 disclosed as a deviation — the pipeline
stage authored but inert, waiting on an operator-created credential. The operator chose to enable it:
"let's enable sr-07, walk me through the token." From there they created the token and variable
group, and each failure was relayed back for diagnosis: first the stage skipping with "condition not
met", then the bot's own pull request failing CI.

The session ends with the automation working end to end and its one disclosed deviation resolved.

### What Got Done

1. **SR-07 landed and was enabled.** The pipeline stage merged into `arcane-ui` (PR !833), and the
   operator created the token and `vg-arcane-ui-vendoring`. I added the non-secret
   `VENDORING_ENABLED` flag on their instruction, verifying afterwards that it is non-secret and
   that `GITHUB_PR_TOKEN` remained secret rather than assuming the write took.
2. **Verified end to end against the real thing.** Run 627 built the template, detected the change,
   cloned, bumped, regenerated, ran its own gate, pushed, and updated
   [PR #216](https://github.com/codemagicianhq/arcane/pull/216) — which went green and merged.
   `arcane-cli` **0.38.3** is on npm carrying the `arcane-ui v2.1.7` template.
3. **Named the variable group after the existing convention** (PR !835). The operator noticed the
   Library already used a `vg-` prefix; `show-report-vendoring` became `vg-arcane-ui-vendoring`.
4. **Fixed a real defect found while looking for a verification change** (PR !836): the compiled
   template emitted `class="unwritten"` with **no CSS rule anywhere**, so an epic with no Report line
   rendered the word in ordinary body styling — a description that happened to say "unwritten"
   rather than a marked gap. Added the rule and the regression test that asserts it.
5. **Fixed the gate that could never open** (PR !839) — see Lessons.
6. **Fixed the shallow clone that silently deleted report data** (PR !841) — see Lessons.

### Decisions Made

| ADR | Decision | Rationale |
|---|---|---|
| (no ADR) | Variable groups follow `vg-<product>-<scope>` | Matches `vg-arcane-web-dev`/`-prod` already in the Library. Recorded in `arcane-ui`'s `docs/sr-07-enable.md`; the convention is documented nowhere else, which is why the first draft broke it |
| (no ADR) | The vendoring group is referenced at pipeline root, not stage scope | Whether a stage-scoped group reaches that stage's own `condition` is not pinned down in the docs, and this gate had already failed once on an assumption. Cost: deleting the group now fails the whole pipeline, so disabling means flipping the flag |
| (no ADR) | Disable via `VENDORING_ENABLED`, never by deleting the group | Follows from the above; the earlier guidance said the opposite and was corrected |

### Lessons Learned

#### A secret variable is invisible to a YAML expression, so a gate on one can never open

The stage skipped every run with "condition not met" even though the group existed, the token was
stored, and the pipeline was authorised. The gate tested the secret itself:
`ne(variables['GITHUB_PR_TOKEN'], '')`. Azure's docs are explicit — *"You can't access secret
variables ... directly in scripts. You must pass these variables as arguments to a task"* and
*"Unlike a normal variable, they are not automatically decrypted ... You need to explicitly map
secret variables."* The expression read empty on every run.

The design's own safety property is what hid it: a gate that cannot open and a stage that is
correctly inert look **identical**. Gate on a non-secret flag; consume the secret only through a
step's `env:` mapping.

#### A shallow clone silently deleted data, and passed every check inside the pipeline

The first live run opened a PR that removed `versionSpan`, the version-span stat, and the entire
cast from both committed reports. The stage cloned with `--depth 50`, and show-report derives those
fields from git history.

The reason it was silent is the important part: **degraded reports regenerate byte-identically from
that same shallow history**, so any check run inside the pipeline agrees with them. This is the third
time this exact shape has bitten the program — the v0.34.3 publish failure (Q-003), the 2.1.0
template with fourteen dead tags, and now this. Something consistently wrong passes every check that
compares it against itself.

What caught it was a *different* vantage point: `arcane`'s CI checks out `fetch-depth: 0` and
regenerated with the history, producing "does not match a regeneration from its sources". The layered
gate worked. The fix drops `--depth` and adds an explicit `is-shallow-repository` guard so a future
`--depth` fails loudly instead of degrading data.

#### Check the existing pattern before inventing a name

`show-report-vendoring` broke a `vg-` convention visible in a screenshot I had already been shown.
The convention is written down nowhere — not in `naming-conventions.md`, which has no section on
infrastructure or resource names, and not in either repo. It lives only as a pattern in the Azure
DevOps Library. Recorded now in `arcane-ui`'s enablement doc, but a convention spanning both products
still has no owner.

#### A "Lint, typecheck, test, build" check failing does not mean lint failed

The operator read the bot PR's red check as a linting failure. Lint passed; the failure was the
golden parity test inside the same job, which bundles four steps under one name. Read the log before
naming the cause.

#### `az repos pr create` silently discards non-ASCII on this machine

The first PR description came back with every em dash and arrow dropped, leaving gaps like
`changes  the` — cp1252 encoding, "unsupported characters are discarded", no error. Caught by
reading the description back rather than trusting the create call. Subsequent PR bodies were written
ASCII-only up front.

### Open Items Carried Forward

None from this session. Every dispatched item resolved to `succeeded`: four `arcane-ui` PRs
(!835, !836, !839, !841) completed, `arcane` PR #216 merged, `arcane-cli` 0.38.3 confirmed on npm,
`arcane-ui` 2.1.7 tagged, all pipeline runs succeeded with none in flight, and the automation branch
was deleted from the remote on merge.

The program's other disclosed deviation, SR-05c (the share lens), remains tracked in `TODO.md` and is
untouched by this session.
