---
title: Should the User Tier Become the Default Spell Scope?
audience: both
last_updated: 2026-09-11
status: active
tags: [research, spell-scope, user-tier, defaults, codex-support, cs-04, cs-05]
sources: [src/modules/user-tier.ts (effectiveSpellScope, resolveInstallScope), src/commands/doctor.ts (checkSpellScope), src/commands/init.ts (step 2b), src/commands/update.ts, DECISIONS.md ARC-045 / ARC-033 / ARC-038, docs/plans/codex-support/PLAN.md (CS-04, CS-05), docs/research/skill-discovery-smoke-tests.md (2026-09-11 operator measurement), .github/workflows/*.yml and package.json hooks (checked for any automated doctor run)]
---

# Should the User Tier Become the Default Spell Scope?

## Summary

The operator installed the user tier, ran `/spell-status` from an empty folder in three clients, saw
it work in all three, and asked the obvious next question: should `spell_scope: "user"` become the
default, so a repository stops carrying its own spell files unless it opts back in?

**Recommendation: no. `repo` stays the default, permanently.** The success that prompted the question
is real and was reproduced, but it was measured on one machine that had a populated home directory.
The default governs every machine that does not.

Three findings decide it. The narrower change that captures most of the benefit is in
[Follow-ups](#follow-ups).

## Findings

### 1. A default is retroactive, and this one ships without a staging step

`effectiveSpellScope` resolves an absent field to `repo`
([src/modules/user-tier.ts:176](../../src/modules/user-tier.ts)). Almost no consumer repository sets
the field — it was introduced in `1.2.0`, days ago — so the default is not a preference for new
installs. It is the live setting of every existing repository at once.

Flipping it means the next `spell update` in each of them stops managing spell files, and
`spell update --prune` removes them. The repositories that would be affected did not choose anything
and are not present at the moment of the change. **Verified:** the release chain from a merged version
bump to npm is automatic (`release-drift.yml` → GitHub Release → `publish.yml`), so there is no point
between "the default changed" and "every consumer can pick it up" at which a human looks.

ARC-038's guarantee that an edited file is never silently discarded still holds and is not in
question. The concern is the unedited majority: those are removed correctly, quietly, and everywhere.

### 2. The failure mode in a home-less environment is silent and wrong

The user tier lives at `~/.arcane`. Several environments an agent framework is specifically built for
do not carry the operator's home directory:

| Environment | Has the repository | Has `~/.arcane` |
|---|---|---|
| A clone on a second machine | yes | only if installed there too |
| CI runner | yes | no |
| Claude Code on the web, Codex cloud | yes | no |
| Copilot coding agent | yes | no |
| A collaborator's checkout | yes | no |

**Inference, not measurement:** in those environments a `spell_scope: "user"` repository presents a
`CLAUDE.md`/`AGENTS.md` Spell Routing table that names spells the client cannot discover. The agent is
told to invoke `spell-commit-work`; nothing answers; it improvises the workflow from general
knowledge, which is the exact outcome the routing table exists to prevent. Nothing errors. The
operator's own three-client check could not have surfaced this — it was run on the machine where the
tier is installed.

### 3. Nothing catches it

`checkSpellScope` is the one blocking doctor check that would report a missing tier
([src/commands/doctor.ts](../../src/commands/doctor.ts)). **Verified by grep across
`.github/workflows/*.yml`, `package.json` scripts, and all 41 canonical spells:** no workflow, no git
hook, and no spell runs `spell doctor`. The only automated doctor path is `doctor:leaks`, a different
check. So the check fires when a human types the command, which is not when the failure happens.

This is a gap worth closing on its own merits, independent of the default question — see Follow-ups.

## What the operator's measurement does and does not establish

It establishes that the user tier **works**: all three clients resolved a spell from `~/.arcane` in a
folder that was not a repository (Q-004, Q-005 in
[OPERATOR-QUEUE.md](../plans/codex-support/OPERATOR-QUEUE.md)).

It does not establish that the tier should be assumed. Those are different claims, and the second one
is the one a default makes on behalf of people who are not in the room.

## Follow-ups

1. **Record the default as permanent, not provisional.** Absent `spell_scope` means `repo`. An ADR
   saying so costs nothing now and prevents this question being reopened by the next person who has a
   good experience on their own machine.
2. **Preselect for new inits only, via an explicit preference.** A `default_spell_scope` key in
   `~/.arcane/.arcane.json` would make `spell init`'s step 2b question default to `user` on a machine
   whose owner has already decided. New repositories only; existing manifests are never rewritten.
   This captures the operator's actual goal — not re-answering the same question in every new repo —
   without touching a single existing repository.
3. **Make the opt-out loud before shipping any preselect.** `spell_scope: "user"` should be visible in
   `spell status` output and in the marker blocks, and `checkSpellScope` should run somewhere
   automatic, so a clone on a bare machine reports the missing tier instead of quietly under-serving
   the agent.
4. **Shared, CI-visible, and cloud-opened repositories stay `repo` as doctrine.** Detection is not
   worth building: a repository cannot reliably tell whether someone will open it in a cloud client
   tomorrow.
