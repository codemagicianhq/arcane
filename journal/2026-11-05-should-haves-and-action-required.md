# 2026-11-05 — The presence Should Haves (1.19.0) and the Action required block (1.20.0)

Related: [[DECISIONS#ARC-060|ARC-060 — The Presence Channel]] (decision 14 added here), [[features/presence-channel/architecture|presence channel architecture]] (D24 to D28), [[features/action-required/PRD|Action required PRD]], [[2026-11-05-presence-channel]].

## Session: presence Should Haves, then the Action required block (PRs #437 and #441)

### Prompt Context

The ops hub session started this one with a task: implement the presence channel's five deferred "Should Have" items, PC-17 to PC-21. The work was to be done in this repository, in its own worktree cut from `origin/main` on `sessions/2026-11-05-presence-should-haves`, with stories PS-17 onwards. It would ship as version 1.19.0 in one PR, with all 7 CI checks passing and no merge. For PC-19 the brief said to read the current MCP specification on the day and choose per protocol era.

The operator then:

- asked whether the Needs you block's wording was related to PC-18. It was: the same fragment.
- asked whether `spell doctor`'s Copilot warning could go, since VS Code ships Copilot. It now does, so the check was removed.
- recalled an earlier proposal for the Needs you wording, which was found in the hub's idea book.
- chose the heading, the frame, the presence wire names, and two tiers with persistence;
- approved each commit set and merged both PRs;
- asked for the hub idea to be marked done, the PRs to be opened, and this close.

### What Got Done

1. **The five Should Haves, 1.19.0.** [PR #437](https://github.com/codemagicianhq/arcane/pull/437) merged as `ad0d963`, with all 7 checks passing. Stories PS-17 to PS-21 and architecture D24 to D28:
   - **PC-17:** `spell presence sessions [--json]`.
   - **PC-18:** every Needs you block reports `waiting`.
   - **PC-19:** MCP resource subscriptions, per era: `resources/subscribe` for legacy clients, `subscriptions/listen` for 2026-07-28.
   - **PC-20:** a `spell doctor` row for the presence service; `--fix` removes a stale `server.json`.
   - **PC-21:** `spell-open-session` lists the sessions reporting from other checkouts.

   The same PR removed `spell doctor`'s VS Code Copilot extension row. VS Code 1.143.1 bundles `GitHub.copilot-chat` 0.71.0 inside the application, and the check read only `~/.vscode/extensions`.
2. **The Action required block, 1.20.0.** [PR #441](https://github.com/codemagicianhq/arcane/pull/441) merged as `c05bdfe`, with all 7 checks passing. `features/action-required/` holds the PRD, stories and progress.
   - **The block:** `## 🚧 Action required`, framed by a rule above and below, with two tiers (Now, When you're at your desk). A done item stays listed, struck through, until the session closes. The fragment is renamed `action-required`, and the 18 spells are regenerated.
   - **The handoff field** is `Action required`. `spell-open-session` still reads an old `Needs you` field, as Now items.
   - **The presence names** are `required_actions`, `session.action_required` and `--required-action`, recorded as ARC-060 decision 14. The old names are still accepted on input for the 1.20 series.
3. **Both releases are on npm.** 1.19.0 was published by run 42126457538. 1.20.0 was published by run 42140326200 at 00:57:51Z, and `npm view arcane-cli dist-tags` answered `latest: 1.20.0` at 01:00Z.
4. **The hub idea marked done.** Ops PR #1334 in the hub repository marks the hub's 2026-10-17 proposal done. It is open, with no conflicts; the merge is the operator's.

### Decisions Made

| Decision | Choice | Rationale |
| --- | --- | --- |
| ARC-060 decision 14 (amendment, accepted 2026-11-05) | The presence wire names became `required_actions`, `session.action_required` and `--required-action`. The old names are accepted on input for the 1.20 series, and only the Now tier is reported. | The names follow the visible heading. `/v0/` is not yet the contract's first stable version, and no consumer had shipped against it. |
| Heading and frame (PRD, not a record) | `## 🚧 Action required` with rules above and below, not the GitHub alert syntax. | `spell-scry` gave pass with disclosure (the phrase is a common phishing subject line). GitHub's renderer showed the alert adds a redundant title and shows as raw text in terminals. |
| The MCP subscriptions (architecture D26) | Each MCP era gets its own subscription method, and refuses the other's. On stdin's end the server answers each open listen, then cancels it. | The 2026-07-28 revision replaced `resources/subscribe`. Two spec pages each asked for one of those two teardown steps, and doing both satisfies both. |

### Lessons Learned

#### A vendored file looks like a source file until its history is read

The plan for the Action required block included the Show Report's section: a label change, caution-tape stripes and a model key rename. The template turned out to be vendored from `arcane-ui`: its history is a series of "vendor arcane-ui vX template" commits opened by that repository's pipeline. Its `needsYou` keys are the contract between the two repositories. Editing it here would have been overwritten by the next vendoring, and renaming its keys here would have broken the vendored copy. It was found only when the edit started. The check that would have caught it at planning time is `git log` on each file a plan touches, looking for an automated author or a "vendor" commit. AR-04 moved to a TODO item for `arcane-ui`.

#### A rename that crosses two fragments cannot be split into per-story commits that each pass

`spell-implement` asks for one commit per story. Here the new block fragment (AR-01) names the new presence flag (AR-05), and the presence fragment (AR-05) names the new block (AR-01). Neither half passes its tests without the other, so four stories landed as one feature commit. `progress.txt` records the deviation. Story boundaries for a vocabulary rename should follow the dependency, not the file type: the rename and every text that names it belong in one story.

#### An install check that reads one folder misses bundled software

`spell doctor` warned "GitHub Copilot (Chat) not found" on a machine where VS Code ships Copilot inside the application bundle. It also told the operator to install it again. The same class of mistake as the earlier "Codex is not installed" claim, which looked only at `PATH`. The check was removed rather than taught a per-OS bundle path, because Copilot is one optional client among several.

### Open Items Carried Forward

- **Ops PR #1334** (the hub idea marked done) is open with no conflicts. Its merge is the operator's.
- **The Show Report's Action required section** is to be built in `arcane-ui` (`TODO.md`, "Show Report: the Action required section, in arcane-ui").
- **Version overlap:** the `magus-merge-wording` worktree (another session) bumps the version to 1.18.1 and edits the CHANGELOG from a base before 1.19.0. It needs a rebase and a re-bump.
