# 2026-08-31 — BC-07: Re-running the Fresh-Session Probe

## Context

[TODO.md's T6](../TODO.md) recorded an INCONCLUSIVE 2026-08-02 attempt to verify whether a
genuinely fresh session inherits the repository's working protocol, using a specific grading
probe from that day's session: check (1) whether the protocol was inherited, (2) whether
`.arcane/agents.yaml` exists, (3) what `.arcane/governance/git-conventions.md:554` actually
says about the `Role` commit trailer. The 2026-08-02 attempt ran through a subagent that
doesn't receive repository instruction files the way a genuinely fresh client session does,
so it never got a real answer. [BC-07](plans/become-current/PLAN.md) re-runs it properly: a
genuinely fresh `/loop` wakeup, probe as the literal first action, before opening any other
file.

## The three findings, from checked evidence

1. **Root working protocol: inherited.** This turn's own system context carried CLAUDE.md's
   "Working protocol" section automatically, before any file-read tool call — confirmed by its
   presence in the system-reminder block at the very start of this conversation. No `Read` on
   `CLAUDE.md` was needed to establish this; the inheritance mechanism is what put it there.
2. **`.arcane/agents.yaml`: does not exist.** Checked directly with a glob for the exact path.
   Same result as 2026-08-02 — nothing has built this file in the intervening four weeks.
3. **`git-conventions.md:554`: stale line number, live content.** Line 554 today falls inside
   an unrelated rebase-conflict-handling section. The `Role` trailer table the 2026-08-02
   session found — `| \`Role\` | Recommended | \`product-ops\`, \`developer\`, \`cto\` | ` —
   is still there, just at **line 635** now: the file grew by roughly 80 lines across BC-01's
   review-round section, BC-03's Content-Verified Branch Deletion section, and other edits
   landed since. No sourcing mechanism for the `Role` value exists anywhere in the file —
   it's a bare illustrative example, `Recommended` rather than `Required`, exactly as the
   original finding concluded. **The substance holds; only the line-number citation had
   drifted.**

## My own error, mid-probe

My first pass at fact (3) concluded the example was simply *gone* — I searched for the literal
string `Role: developer` (the phrasing used in [IDEAS.md](../IDEAS.md)'s grading-probe
description) with `git log --all -S"Role: developer"` across the file's entire history and got
zero hits, then broadened to `-S"Role:"` and still found nothing in this file. That search was
looking for the wrong shape: the real content was never a colon-joined trailer instance, it's
a pipe-table row (`` | `Role` | Recommended | `product-ops`, `developer`, `cto` | ``). Only
after checking a commit from the original finding's own date (`f35fadb`, 2026-08-02) and
reading line 554 of *that* historical version did the actual row turn up — which then made it
trivial to find at its current line (635) in today's file with the right search term.

This is worth recording precisely because it's the failure mode the whole probe exists to
catch, happening live: a plausible-sounding conclusion ("the example was removed"), formed
from a search that felt thorough but was shaped by an assumption instead of the actual
historical text. Working protocol rule 3 — when a check contradicts a claim, say so and change
it on the record — applied to my own claim, four tool calls after I made it, before it went
anywhere near a commit message.

## A generalizable finding, filed rather than fixed here

Hardcoded line-number citations in prose (`git-conventions.md:554`, and by the same logic any
other `file.md:NNN` reference in TODO.md, IDEAS.md, or DECISIONS.md) go stale silently as the
target file grows — nothing flags the drift, and by the time someone follows the citation it
may point at unrelated content instead of erroring outright. This is adjacent to but distinct
from BC-06's cross-repo-hazard doc-ID link work: that was about links resolving to the *wrong
document*; this is about a same-file citation resolving to the *wrong line* after enough
unrelated edits. Filed as a new IDEAS.md entry rather than fixed here — BC-07 is a process
epic, not a governance-hygiene implementation epic, and the fix (heading-anchor references
instead of line numbers, or a mechanical staleness check) deserves its own scoping.

## Outcome

T6 closed in TODO.md with this corrected, doubly-verified finding. No code, test, or
`src/assets` changes — this epic is process/verification only.
