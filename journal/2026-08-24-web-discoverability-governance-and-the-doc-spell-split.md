# 2026-08-24 — Web Discoverability Governance and the Doc/Spell Split

## Session: Two new governance docs, a spell that cites them instead of inlining them, and a doc-vs-spell routing question this repository had never actually had to answer before

### Prompt Context

The operator asked to generalize a set of hard-won web-discoverability and
external-verification lessons, carried over from outside this repository, into
reusable Arcane guidance — pointing at the existing EAS deploy prompt as a
reference shape, and asking directly whether that prompt actually qualifies as
a spell, since its own content reads more like a playbook than a workflow.

### What Got Done

1. **Settled the doc-vs-spell question.** The EAS deploy prompt genuinely *is*
   a spell — spell frontmatter, a matching `.claude/commands` stub, and most
   importantly it does real work (runs the build/submit commands, gets a
   binary into the store) rather than only being read. But this repository
   turned out to have **no long-form reference category at all** — checked
   `docs-baseline/` (git dotfiles, zero prose), `.arcane/templates/`
   (fill-in scaffolds), `ai-context/` (one empty scaffold file) — and D6 of
   the Spell Quality Rubric already states the routing rule: shared logic is
   referenced from a governance doc, not inlined into a spell. Decision:
   durable rules go in governance; the runnable workflow goes in a spell that
   cites them by ID.
2. **Drafted and independently adversarially verified two new governance
   docs** — `external-verification-standards.md` (`EV-01`–`EV-06`) and
   `web-discoverability-standards.md` (`WD-01`–`WD-15`) — plus
   `spell-make-discoverable`, via a Workflow run: the two docs drafted in
   parallel, a deliberate barrier before drafting the spell (it needed both
   docs' final rule IDs to cite accurately), then independent per-file
   adversarial review against the rubric and this repo's actual build-breaker
   patterns.
3. **The verification pass earned its keep.** It caught a real calendar date
   where the frontmatter template requires the literal `YYYY-MM-DD`
   placeholder, a closing "why" sentence citing `WD-01` when the content it
   was actually justifying had landed under `WD-02` once the rule split
   during drafting, wiki-link syntax where the file uses standard Markdown
   links everywhere else, and four places the spell restated a cited rule's
   own rationale instead of only citing its ID. All seven fixed by hand after
   independently re-deriving each one against the real file content.
4. **Discovered mid-session that two of the six external-verification rules
   were not new material at all** — the same two failure modes (a console
   silently dropping synthetic input; a green pipeline being treated as
   evidence a live system changed) already existed, independently, in this
   repository's own `spell-eas-store-deploy` TODO backlog, written down after
   a completely unrelated store-console session months earlier. That backlog
   item now points at the new doc instead of re-deriving the same lessons a
   second time when it's eventually written.
5. **Registry and profile wiring, README badge corrections** (spell/
   governance-doc counts had already drifted before this session touched
   them), and a TODO entry for a real bug found in passing while checking for
   spell-name collisions: `dist/assets/` retains an orphaned spell prompt
   with no source, no registry entry, and no git history at all, because
   `copy-assets.ts` never prunes its destination directory before copying.
6. **Full gate sequence run clean twice**, not once — `main` moved under the
   branch mid-session (an unrelated naming decision plus its version bump
   landed via a concurrent stream), which produced real conflicts in
   `CHANGELOG.md` and `package.json` on rebase. Resolved by hand, then the
   entire sequence (self-host-parity, ADR-reference check, version-bump,
   lint, typecheck, build, the full 40-file/699-test suite) was re-run from
   the rebased commit rather than trusted from before it.

### Lessons Learned

#### A spell's packaging and its quality are two separate questions

The EAS deploy prompt raised a fair challenge on sight: does it even qualify
as a spell, or is it a playbook wearing spell packaging? The packaging test
settled it cleanly — spell frontmatter, a matching command stub, and it does
work rather than only being read. What was actually wrong with it was
unrelated to genre: it inlines roughly thirty lines of console-specific
pitfalls instead of citing a governance doc, because no such doc existed yet
for it to cite. Confusing "is this the right artifact type" with "is this
artifact any good" would have led to authoring the new spell the same way it
criticized the old one for being written.

#### An independent second discovery is the actual evidence a lesson is general

Two of the new external-verification rules were not new — the exact failure
modes were already sitting in this repository's own EAS backlog, arrived at
after a store-console session with nothing else in common with the session
that produced them here. That coincidence is what proves a rule belongs in
its own shared doc rather than folded into whichever more specific doc it was
drafted alongside — not a design instinct applied up front, an observed fact
noticed partway through. Two sessions with nothing else in common landing on
the same sentence is the actual signal to watch for.

#### Trust the file on disk, not the agent's narration of the file on disk

Drafting agents were instructed to return content as text and make no
repository changes. Both governance-doc drafts wrote themselves to disk
anyway and returned a short self-verification summary instead of the
requested content. Nothing was lost — the files landed in the right place on
the right branch, untracked — but recovering required checking `git status`
before trusting anything a task result claimed, and then treating the actual
bytes on disk as ground truth for every step after, including what got
handed to the verification agents. An instruction to "only return content" is
not the same as tool access being withheld.

#### Verification agents catch what an author's own confidence hides

The literal `YYYY-MM-DD` placeholder every governance doc's frontmatter
requires became a real calendar date in the one file whose drafting agent
apparently ran the check at the moment it wrote the file, rather than
templating it. A closing sentence cited the wrong rule ID once its content
had split across two rules during drafting — a coupling the author of both
rules is the worst-positioned person to notice, because the connection feels
obvious from the inside. Neither defect would have failed a casual
read-through; both failed a checklist built before the content existed to be
defended against it.

#### A grep that returns nothing is not the same as a grep that ran

A first attempt at scanning the new files for a build-breaking pattern used a
PCRE negative-lookahead in `grep` and produced zero output — which read as
clean until closer inspection showed the command had actually errored
("supports only unibyte and UTF-8 locales") rather than matched nothing. The
fix was rerunning the same check in Node instead of trusting a shell tool's
silence. The same discipline was worth extending further than planned:
rather than approximating what `copy-assets.ts`'s secrets scanner and the
path-resolution/worktree-vantage tests actually check, the real regexes were
pulled from source and run by hand against the final files — which is what
confirmed a pattern reasoned about slightly imprecisely beforehand (`SECRET`/
`TOKEN` needing a `{` immediately after the colon, not merely "not a literal
value") was fine anyway, but only because it was checked, not because the
earlier reasoning had been airtight.

#### A long-running session should assume main has moved, not verify it once

The branch was cut from `main` at the start of the session and pushed at the
end, by which point two unrelated commits — an accepted naming decision and
its version bump — had landed via a separate concurrent stream. The
version-bump check and the self-host-parity check both passed against the
stale base without complaint, because each compares against whatever
`origin/main` resolves to at the moment it runs, not against "the `main` this
branch actually diverged from." Only opening the PR surfaced the conflict, in
`CHANGELOG.md` and `package.json` — both files a version-bump PR was always
going to touch, so the collision was closer to certain than accidental. The
rebase needed real judgment (which changelog entry outranks the other
chronologically), not auto-resolution, and the full gate sequence was rerun
from scratch afterward rather than trusted from before the rebase — a green
run against a commit that no longer exists is not evidence about the commit
that replaced it.

### Open Items Carried Forward

- Whether the doc/spell split itself — durable rules live in governance,
  referenced by ID from any spell that needs them, never inlined — is
  significant enough to warrant its own decision record. It was applied here
  without one; every future spell author will either follow the precedent
  this set or invent their own answer, which is exactly the drift a decision
  record exists to prevent. Next free number is ARC-035.
- The `dist/assets/` pruning bug recorded in `TODO.md` — `copy-assets.ts`
  never removes a destination file whose source was deleted or renamed —
  found in passing, not fixed.
- `spell-eas-store-deploy` is still unwritten. Its TODO item now points at
  `external-verification-standards.md` for the console/pipeline lessons it
  would otherwise re-derive, and its own store-specific material (Play's
  track model, IARC re-rendering, per-store locale mismatches) remains a
  plausible third governance doc once that spell is actually authored.
