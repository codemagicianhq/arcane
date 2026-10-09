# 2026-10-09 — Branch naming, written once (1.11.0 and 1.11.4)

Related: [[git-conventions]] (the Branch Naming rule this session rewrote), [[spell-authoring-standards]]
(fragments hosted by files other than spells), [[development-methodology]] (the Spell Loop both fixes
ran through).

## Session: Branch naming, written once

### Prompt Context

Opened on 2026-10-02 with `spell-open-session` and no focus argument. The handoff's recommended first
item was the worktree branch-naming TODO; the operator instead ordered "#328 first, then branch
naming" after a new consumer issue arrived. Along the way the operator asked whether retiring the
roster-agent branch format was right and where both formats came from, asked for the `CLAUDE.md`
line to be shown in plain terms, and then set the bar for the implementation: "I just don't like the
idea of repeated data three times, not even two times… is that the definite best way to handle
that?" After the second pull request merged, the session answered three more questions — whether to
re-cut 1.11.4 as 1.12.0, how `spell login` reaches the identity tenant and whether that is
configurable, and how an MIT-licensed CLI with an account fits beside private products — and closed.

### What Got Done

1. **#328 fixed and shipped as 1.11.0** — [PR #329](https://github.com/codemagicianhq/arcane/pull/329),
   merged by the operator on 2026-10-03T09:20Z (`24283d2`), issue closed by the merge, `v1.11.0`
   published 09:20Z. The `mcp-config-template` component is retired outright (`REGISTRY_RETIREMENTS`,
   `userOwned: true`) and `src/assets/.mcp.json` is gone, so no profile can write a live `.mcp.json`;
   `spell update` gained a user-owned release path (an edited or never-hashed `.mcp.json` leaves the
   manifest with one `Released:` line; an untouched scaffold stays prunable); `checkMcpConfig` warns on
   the `<your-mcp-server-package>` placeholder and its missing-timeout message carries the edit, the
   unit and the minimum; `git-conventions.md`'s consumer-hardening paragraph states both and no longer
   claims no check verifies a timeout. `test/mcp-config-template-retirement.test.ts`.
2. **Two captures:** the doctor recommendation-shape item in `TODO.md` ("Give every non-blocking
   `spell doctor` check one recommendation shape"), and the pluggable-skeleton idea in `IDEAS.md`
   (2026-10-02 20:56, `[#product]`).
3. **Branch naming shipped as 1.11.4** — [PR #348](https://github.com/codemagicianhq/arcane/pull/348),
   merged 2026-10-07T09:14Z (`96b8641`), `v1.11.4` published 09:15Z, npm `latest` read `1.11.4`.
   The three branch formats live in one editable file, `src/assets/.arcane/spells/_fragments/branch-naming.md`;
   `git-conventions.md`, `agent-output.instructions.md`, `spell-open-session` (four restatements
   replaced) and `spell-create-pull-request` Step 0 (a rename-before-PR gate) host machine-synced spans;
   `agent-policies.md`, the agents template, `universal-agent-rules.md`, `spell-commit-work`,
   `spell-architect` and `spell-full-cycle` reference the rule; `spell agents sync` renders a
   `## Branch Naming` section from the same fragment into `CLAUDE.md`, `AGENTS.md` and
   `.github/copilot-instructions.md` (this repository's three carry it). The rename procedure is its own
   fragment, `branch-rename-gate`, with no format of its own. The ARC-039 fragment axis now covers every
   Markdown asset, with `hostsFragmentSpan` separating a hosted span from a marker quoted in prose.
   `test/branch-naming-fragment.test.ts` scans every shipped Markdown asset, every TypeScript source and
   the repository's own instruction files for a format written outside a generated span. The roster-agent
   format is kept, unchanged.
4. **ARC-053 drafted** (`DECISIONS.md`, Proposed) — see Decisions Made.
5. **Three denylist hits on `main` scrubbed** — `TODO.md:610`, `DECISIONS.md:666` and `:695` carried
   names the operator's local org-token denylist (created 2026-10-05) flags; each is now a class
   placeholder (`{ADO_ORG}`, `{PRODUCT_SLUG}`), done in the commit that staged each file so the file
   could be committed at all.
6. **Verified for the operator, from the code:** `spell login` signs in only to the two tenants
   hard-coded in `src/modules/identity-config.ts` (production by default, development under
   `ARCANE_ENVIRONMENT=dev`); nothing else overrides them; only `login.ts`, `whoami.ts`, `oidc.ts` and
   `session-store.ts` import that module; the CLI's other outbound calls are the npm registry/unpkg for
   version checks and the consumer's own Azure DevOps org through `az`.
7. **Two lessons saved to the assistant's memory** (background tasks; a peer session in the primary
   checkout), in addition to the journal.

### Decisions Made

| ADR | Decision | Rationale |
| --- | --- | --- |
| ARC-053 (Proposed; number allocated as max(052 on the branch, 052 on `origin/main`) + 1 after a fetch, per ARC-050) | One branch-naming rule for three actors, decided by who creates the branch; written once in a fragment, every other copy generated; the fragment axis covers every shipped Markdown file; the rename gate is its own fragment; no CI check on pull-request head names | The TODO's literal reading would have retired a live, reasoned format that 0 of 296 pull-request heads ever used; the operator asked that no format be repeated by hand; an assistant does not open the governance file before `EnterWorktree`, so the rule has to be in front of it |

Operator calls recorded without an ADR: keep both formats, boundary by creator (2026-10-03); scrub the
denylist hits with class placeholders rather than revise the denylist (2026-10-06); leave 1.11.4 as
published and make the next release 1.12.0 — delegated to the agent on 2026-10-07 and decided that way
because the minor bump belongs to the pull request that completes sign-in, not to an empty release.

### Lessons Learned

#### A backgrounded four-second task stalled the session for 73 minutes

`npm ci` in the new worktree was started with `run_in_background` and the turn ended with nothing
else to do. The completion notice is delivered on the next turn, not as a wake-up, so the session sat
idle until the operator asked what was stuck. The install itself had taken four seconds. Anything
short runs in the foreground; a turn never ends only to wait for a background notice.

#### Two sessions in one primary checkout: `git switch -c` carried a peer's staged work onto my branch

The spell-login session was active in the primary checkout, with its files staged, when this session
ran `git switch -c` there. Staged files follow HEAD, so the peer's next commit landed on the new
branch instead of its own. `git worktree list` cannot show a second session sharing the same worktree;
`ListAgents` can show a busy peer, and `git status --short` shows its staged files. The repair (moving
the peer's branch pointer and switching the checkout) was refused by the auto-mode classifier as
interference with another workload, correctly, and left to the operator. The rule is ARC-028 R3: when
either signal shows activity, do not touch HEAD — create a linked worktree from `origin/main` and enter
it. This session did the rest of its work that way.

#### After a rebase, the suite lies until the dependencies and `dist/` match the new tree

The pre-PR rebase pulled in the login feature, which added dependencies and new tests that spawn the
built CLI. `node_modules` and `dist/` still matched the old tree, so the pre-push suite failed twice
with a `0 test` file and no clear summary. `npm ci` fixed the first, `npm run build` the second; the
suite then passed with 2241 tests. A rebase that changes `package-lock.json` or `src/` is followed by
both before any push.

#### A local denylist blocks commits on lines nobody changed

The pre-commit org-token scan reads every staged file whole. The operator's new local denylist
matched three lines already on `main`, in files this session had to stage for unrelated edits, so
every commit touching `TODO.md` or `DECISIONS.md` on this machine was blocked until those lines were
scrubbed. Two of the matched names were a product slug inside an old decision's rejected-alternatives
text, one an Azure DevOps organization in a remote URL. The fix is the sanctioned one (ARC-031 class
placeholders); the lesson is that a denylist added after the fact needs a repository-wide scrub, or
the next unrelated commit pays for it. Two image prompts under `src/assets/.arcane/image-prompts/`
were flagged the same way on 2026-10-06; the login session scrubbed them on `main` (`ebf405b`) before
this close, and `npm run build` exited 0 again on this machine when checked on 2026-10-09.

#### The TODO's literal reading was not the decision; the census was

The 2026-09-02 TODO said to extend the session format to "every agent-created branch", which read as
retiring the roster-agent format. Counting this repository's 296 pull-request heads showed 233
session branches, 21 tool-generated `claude/*` names and 0 agent-slug branches: the autonomous format
had never produced a random name, so collapsing it would have fixed nothing. The question "why is the
naming convention retiring?" was answered by checking, not by defending the plan.

#### A fragment hosted earlier in a file moves what a first-occurrence test anchor finds

`prompt-worktree-vantage-check` anchored on the first line containing `git worktree list`. Hosting
the rename-gate fragment in the Mutation Guard put a second such line above the one the test meant,
and the test failed on a correct change. Anchors on a bare command string are fragile the moment a
spell hosts a fragment that uses the same command; the fix was the same one the file already used for
`spell-close-session`: anchor on the full sentence.

### Open Items Carried Forward

- This close's docs pull request — dispatched; its CI ("Lint, typecheck, test, build") must be read
  before merging.
- **ARC-053** awaits the operator's accept, revise or reject (`DECISIONS.md`).
- **Next release is 1.12.0** — registered in `TODO.md` ("Next release is 1.12.0").
- **Primary checkout repair** — the operator's; its state at close is recorded in the handoff.
- **Dependabot high-severity alert** on the default branch ([dependabot/22](https://github.com/codemagicianhq/arcane/security/dependabot/22)) — the operator's.
- **The pluggable-skeleton idea** — `IDEAS.md` (2026-10-02 20:56); explore with `spell-brainstorm`.
- Unchanged from before: `TODO.md` ("LOW: `spell doctor`'s unowned-package check (R-295b) misses two shapes").
