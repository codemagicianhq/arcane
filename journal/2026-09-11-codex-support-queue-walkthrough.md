# 2026-09-11 — Codex Support: the operator queue walked one item at a time, and closed (1.4.0, 1.5.0)

Related: [[development-methodology]] (the Spell Loop the two shipped changes ran under),
[[git-conventions]] (branch, PR and attribution rules every commit here followed).

## Session: five open items, four questions, and two features neither of us planned

### Prompt Context

Opened on *"let's wrap up those 5 items left, guide me one at a time so I can ask questions in
between."* The operator was explicit about the shape: one item at a time, questions welcome between
them, everything closed before the session ends. They also offered something no agent session can do
for itself — *"I can test what you couldn't, give me steps and I test for you."*

### What Got Done

1. **Order chosen for them, not by them.** Setup first (it unblocked both counts and cleared a failing
   check in their opted-out repository), then the two picker counts together since they were one
   glance in one window, then the three decisions last because two were about things they would have
   just watched work.
2. **AC5 closed by measurement, with the prediction written first.** Two disposable repositories, full
   rosters, one VS Code window. Before: 3 entries per spell and per Arcano. After both opted in: 1 of
   each. The before-count was predicted in writing before the first look and matched exactly, which
   is what made the two composition rules a mechanism rather than an inference.
3. **A question that changed the work.** *"If I go with option 1, are you saying the agents won't be
   available in Claude Code?"* Checking rather than answering found that roster tables reach Claude
   Code through `CLAUDE.md` — but only when the repository has a roster of its own. A repository that
   opted in and never ran `spell agents init` got nothing, with a good roster sitting in the store.
   That contradicted ARC-045 decision 6, shipped as a bug fix in `1.4.0`.
4. **The subagent move, which the plan had deferred.** The operator wanted Claude Code subagents
   folded in. *Adding* `~/.claude/agents` beside `~/.copilot/agents` would have listed every persona
   twice in VS Code, because the four locations share one table with no dedup — the duplication this
   program exists to remove. So the files **moved**. One location, both clients, one entry each.
5. **The delegation call, made explicitly rather than inherited.** Claude Code reads a subagent's
   `description` to decide whether to route work unasked. Twelve personas installed once per machine
   are visible everywhere, so each description now says the persona is for explicit requests. The
   operator's own test came back better than a pass: both clients stated the rule back unprompted —
   *"these only run when you ask for them by name — I won't route to them on my own."*
6. **The default-scope question, split in half.** Flipping the default is retroactive and was
   rejected; pre-selecting an answer is prospective and shipped in `1.5.0`, with the research's gate
   (make the opt-out loud first) in the same change. ARC-048.
7. **ARC-046 accepted**, which also closed Become Current's Q-010, parked since 2026-09-01. Eleven of
   eleven queue entries done, nine of nine acceptance criteria met, all seven Definition of Done
   items met.

### Lessons Learned

- **A user's question is a verification request, not a request for reassurance.** Two of the four
  questions asked this session found real defects. "Which repo do I run this under?" was answered by
  running the command from two directories rather than from memory. "Won't the agents be missing from
  Claude Code?" found a shipped bug. Answering either from what I already believed would have been
  faster and wrong.
- **Predict before you measure, in writing.** Saying "three and three" before the operator looked is
  what turned their count into evidence. A number explained after the fact explains anything.
- **Running the built thing keeps finding what a green suite cannot.** Three defects this session:
  a `--user` run reporting the repository's path, a description cut mid-sentence, and a warning
  naming a directory beside the project instead of the home store. Full suites passed on all three.
- **Never hand someone a command before the release carrying it exists.** `--default-scope` was
  given one release too early and failed in their terminal. The flag was right; the timing was mine.
- **"No-go" needs its own definition when you write it down.** The operator had to ask what it meant.
  Not doing it and not deleting it are different things, and only one of them was on the page.

### Deferred

**One thing this close got wrong, corrected after the fact.** The operator asked what the action plan
for ARC-046's customization overlay was, and the honest answer was that there wasn't one: the ADR and
the research doc both name it as the missing piece, and nothing anywhere said to design it. It was
recorded as a *reason* and not as *work*. Now filed in `IDEAS.md`, along with the operator's own
sketch for it — a marker inside the managed file pointing at a separate override file — which is
worth distinguishing from the symlink variant ARC-046 killed, because that was a filesystem pointer
and this is a content reference, and none of the three objections to the former apply to the latter.

Otherwise nothing untracked — Q-001 through Q-011 are all marked done, and every finding this program opened
and did not close is a `TODO.md` entry routed by name in `docs/plans/codex-support/PLAN.md`, "What
this program did not close". The disposable fixtures built for the counts are still on disk under the
system temp directory (`arcane-count`, `arcane-noroster`, `arcane-migrate`, `arcane-pref`,
`arcane-loud`) and are the operator's to delete; they were left rather than removed because one of
them may still be open in their editor.
