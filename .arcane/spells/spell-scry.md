---
name: Spell — Scry
description: Clear a candidate name before it ships — four outward checks (who coined it, estate still trading, same-audience giants, first-association salience) plus a mandatory inward repo-local collision pass. Use when naming anything new (a spell, a field, a product, an internal concept) before committing to it.
claude_description: Use PROACTIVELY when naming anything new (a spell, a field, a product, an internal concept) before committing to it — clears a candidate name against both the outside world and this repository itself.
argument-hint: '<candidate name or term>'
agent: agent
---

## Executive Summary

- This spell clears a candidate name before it ships, checking both the outside world and this
  repository itself.
- The inward pass runs first and is mandatory, not optional — a real naming decision (ARC-028's
  `workspace`) was nearly settled on a clean external read alone, until a single `grep -ri` found the
  word already load-bearing inside the repository in two other senses.
- Both passes classify hits with the same taxonomy (same-space / adjacent / out-of-space) and combine
  into one verdict: pass / pass-with-disclosure / kill.
- `spell ward` is the opposite direction of this same concern — it finds what leaked **in**; this spell
  clears what's about to go **out**. They do not call each other; ward's denylist scanning and scry's
  single-candidate classification are different operations on the same underlying grep primitive.

---

Clear the candidate name given in the prompt argument.

## Step 1 — Resolve the candidate

Take the term verbatim from the argument. If none was given, ask for it — do not guess a name to check.

## Step 2 — Inward pass (mandatory, run first)

Grep this repository for the candidate term before doing any outward research:

- **Prose**: markdown, comments, documentation.
- **Identifiers**: variable, function, type, and class names — weight these **above** prose, since
  consumers already depend on code identifiers in a way they never depend on a sentence mentioning a
  word.
- **Config keys and schema fields**: `.arcane.json` fields, YAML/JSON config keys, any validated schema.

Use word-boundary matching (the same principle `spell ward`'s denylist scan uses, expressed here as a
`grep -w` / IDE-search equivalent over the codebase) — a bare substring match on a short candidate term
will drown in false positives from unrelated words that merely contain it.

**Classify each internal hit with the same taxonomy the outward checks use below:**

- **Same-space**: the term is already load-bearing for a closely related concept (a config field, a
  directory name, a class doing adjacent work) — a genuine internal collision.
- **Adjacent**: the term appears near the concept but for something distinguishable enough that a
  reader would not confuse the two once told them apart.
- **Out-of-space**: incidental — a comment, an unrelated variable, coincidental substring overlap.

**Why this runs first:** a same-space internal collision is often cheaper to find than the outward
research below, and finding one early can save the effort of a full outward pass on a name that was
already going to be killed. This is not a formality — the ARC-028 `workspace` incident is the concrete
case: a clean external read had nearly settled the decision before a single `grep -ri` found the word
already meaning something else in two other places inside this exact repository.

## Step 3 — Outward pass: the four checks

Research the candidate term against the outside world:

1. **Who coined it** — search for the term's origin and earliest known usage in the relevant space
   (software, apps, AI, games — whichever applies to this candidate).
2. **Is an estate/trademark holder still trading** — distinguish an actively-used, enforced brand from
   an abandoned or long-defunct one. A defunct mark carries much less collision risk than a live one.
3. **Same-audience giants** — do major, well-known players who share this candidate's actual target
   audience already use this name saliently? A collision with a giant outside the target audience
   matters far less than one inside it.
4. **First-association salience per market** — for someone in the target market, what does this term
   bring to mind *first*? If the first association is something else entirely, that is a real cost even
   without a formal trademark conflict.

Classify each outward finding with the **same** same-space / adjacent / out-of-space taxonomy as the
inward pass — never a separate scheme. Cite sources for every outward claim; do not assert a name's
history or salience from unverified general knowledge alone.

## Step 4 — Combine into one verdict

A name that clears outward but collides inward is not a clean pass, and the reverse is equally true —
combine both passes into a single verdict, not two separate reports:

- **pass** — no same-space finding, inward or outward; adjacent/out-of-space findings, if any, are
  noted but do not block.
- **pass-with-disclosure** — a same-space finding exists but is distant, low-traffic, or otherwise minor
  enough that proceeding is reasonable with the collision stated explicitly, not discovered later.
- **kill** — a genuine, blocking same-space collision, inward or outward. Do not soften this to
  pass-with-disclosure merely because the outward research took effort to produce.

## Step 5 — Report

```markdown
## Scry verdict: <candidate> — PASS | PASS-WITH-DISCLOSURE | KILL

### Inward pass
| Hit | Location | Classification |
|---|---|---|
| <term usage> | <file:line> | same-space / adjacent / out-of-space |

### Outward pass
| Check | Finding | Classification | Source |
|---|---|---|---|
| Who coined it | ... | ... | <url or citation> |
| Estate still trading | ... | ... | <url or citation> |
| Same-audience giants | ... | ... | <url or citation> |
| First-association salience | ... | ... | <url or citation> |

### Verdict rationale
<why this combination of inward + outward findings produced this verdict>
```

## Related Spells

- `spell ward` — the opposite direction: finds third-party identifiers that already leaked into the
  repo, rather than clearing a candidate before it ships out.

## Rules

- **Never skip the inward pass.** It is not optional, and it runs before the outward pass, not after.
- **Never assert an outward finding without a source.** "Based on general knowledge" is not a citation.
- **Never use a separate classification scheme for inward vs. outward findings.** Same-space / adjacent
  / out-of-space applies to both, so a reader can compare them directly.
- **Never round pass-with-disclosure up to pass, or down to kill, to avoid stating a nuanced verdict.**
- This spell classifies and reports. It does not rename, alias, or otherwise resolve a collision it
  finds — that decision belongs to whoever asked for the name cleared.
