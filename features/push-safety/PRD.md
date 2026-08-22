---
status: proposed
tracking_mode: internal
source_intake: batch-001 (EF-09)
---

# PRD - Push-Safety Model for Sensitive-Document Repositories

**This is a design document for operator review, not an implementation.** EF-09 is
route:prd -- the deliverable is this PRD. Nothing in this document has been built.
EF-09.md stays `deferred`, with a note pointing here; its status flips only when an
operator accepts a design from this document and a follow-up implementation WP ships.

## Problem

Arcane initializes the same workflow for every repository, including ones an operator
might use to track genuinely sensitive material -- personal records, business
financials, legal documents, credentials-adjacent notes -- via Arcane's own
governance-as-code model (TODO.md, journal/, ventures/ overviews). Nothing in the
framework distinguishes "this repo is fine to push anywhere" from "a single push
would permanently distribute this history."

Re-verified against current HEAD:

- src/modules/registry.ts (the `COMPONENTS` array, lines 16-245, all 26 registered
  components) contains no hook, push-guard, or sensitive-repository component of any
  kind.
- src/assets/.arcane/governance/git-conventions.md's Human Workflow section
  unconditionally assumes push/remote-PR flow ("Push your branch... Merge to main via
  fast-forward") with no no-push mode documented anywhere in the file.
- src/assets/.arcane/governance/threat-model.md's Assets to Protect table names
  "Local sensitive data | Personal files, documents, custom apps | Primary local
  disk" as an asset in scope, but the document's own stated primary risk is
  "autonomous agent misuse or compromise on a host that also holds sensitive data" --
  it has no no-push repository mode, and mitigations are entirely disk/network-level
  (full-disk encryption, loopback-bound gateway, network isolation), not
  version-control-level.
- Repository-wide search confirms no `pre-push`, `core.hooksPath`, or push-blocking
  logic exists anywhere in `src/` or `src/assets/`.

EF-09's claim holds exactly as filed: this is an absent capability, not a defect in
an existing control.

## Threat model

**Asset.** The full, permanent Git history of a repository an operator has designated
as holding sensitive material -- not individual files (those are already covered by
threat-model.md's disk/network mitigations), but the *distribution event* of that
history reaching a remote. Deleting a file in a later commit does not undo this: the
content persists in history, in any clone or fork already made, and in the remote
platform's own caches/backups, indefinitely.

**Threat actors, in order of how this PRD weighs them:**

1. **The operator, by accident.** Wrong remote, wrong repo visibility at creation
   time, a copy-pasted `git push` intended for a different directory, muscle-memory
   from another repo. This is the dominant real-world case this PRD is written for --
   not malice, a slip.
2. **An autonomous or compromised agent.** threat-model.md already names this as the
   framework's primary risk in general; a push is one of the highest-consequence
   actions an agent with repo write access could take unsupervised, and unlike a bad
   commit (revertable) or a bad file edit (recoverable from history), a push is not
   reversible once the remote has it.
3. **Misconfigured automation.** A CI job, a scheduled task, a second agent session
   in another worktree, all pushing to a remote the operator never intended this
   specific repository to have.
4. **A compromised or malicious dependency** (added after review -- threat-model.md's
   own Threat Actors section names this as distinct from a compromised agent: "a
   compromised package or model pulled by the runtime acts maliciously"). Unlike
   misconfigured automation, this is deliberate/adversarial, and non-hypothetical for
   an npm-distributed tool with its own dependency tree that could itself be
   compromised upstream.

**Out of scope for this PRD.** Local-disk compromise (threat-model.md's job);
protecting a repo that is already, deliberately, on a public or shared remote (this
PRD is about repos that should never reach one, or should reach one only under an
explicit, later decision). **Corrected after review:** an earlier draft also excluded
credential/secret leakage via a committed file as "covered by scanners in the
existing/adjacent security tooling space" -- that tooling does not actually exist in
this repository (checked: no gitleaks/trufflehog/detect-secrets/git-secrets anywhere,
and the only "secret" references in `.github/workflows/` are GitHub Actions' own CI
credential syntax, unrelated to scanning committed content). Credential-shaped
secrets remain out of scope for *this* PRD's own recommendation (M3's row explains
why path/pattern scanning is a weak primary mechanism for general sensitive
documents), but the absence of any secret-scanning tooling is a real, separate gap
this PRD should not have implied was already covered -- worth its own intake finding,
not silently assumed solved here.

**Core design tension this PRD must be honest about:** every mechanism below is
*local* enforcement (it lives in this one clone's git config, hooks, or a versioned
file the operator/agent must have set up correctly) or *platform* enforcement (it
lives on the remote's side, outside Arcane's control). Nothing Arcane ships from a
local CLI can survive a sufficiently deliberate bypass (an operator or agent that
really wants to push, and knows how, eventually can) or propagate automatically to a
clone that never ran the setup step. This PRD's goal is raising the bar against
*accidental* and *routine-automated* pushes significantly, not manufacturing an
unbypassable guarantee -- overclaiming the latter would itself be a hazard (a false
sense of safety is worse than a known-partial one).

## Compared mechanisms

EF-09 names six candidates. Each evaluated on: does it block accidental pushes, does
it survive a new clone without re-setup, does it survive a moderately-determined
bypass, and what does it cost operationally.

| # | Mechanism | Blocks accidental push | Survives a fresh clone | Survives deliberate bypass | Cost |
|---|---|---|---|---|---|
| M1 | Versioned pre-push hook (`core.hooksPath` pointing at a committed, distributable directory -- not the unversioned `.git/hooks/`) | Yes | **No** -- each clone must run the setup step once (e.g. `spell init` sets `core.hooksPath` for this profile) | No -- `git push --no-verify` skips it entirely | **Not Low, corrected after review:** `core.hooksPath` is one exclusive slot per repo -- a naive install would silently disable any pre-existing hook manager (Husky, Lefthook, pre-commit) rather than add a new layer. See the Hook-Manager Collision note below. |
| M2 | Disabled push URL (`git remote set-url --push origin <invalid>`) | Yes -- fails at the transport layer, not advisory | No -- same per-clone setup requirement as M1 | No -- anyone with repo access can `git remote set-url --push` it back | Low: one init-time config write, no new files |
| M3 | Data scanners (block push if a diff matches known-sensitive patterns/paths) | Partial -- reliable only for credential-shaped secrets (existing tooling category); general "sensitive documents" have no reliable signature, so this degrades to path-based allow/block lists the operator must maintain correctly | No (built on M1's hook mechanism) | No (same bypass as M1, plus false negatives from incomplete pattern/path lists) | High: ongoing maintenance of the sensitive-path list, false positives/negatives |
| M4 | Encryption at rest (e.g. `git-crypt`-style clean/smudge filters -- working tree stays plaintext, only git objects/remote are ciphertext) | **No** -- doesn't block the push, changes what pushing exposes | Yes, if key distribution is solved | Yes, for confidentiality specifically -- but doesn't stop the push itself | High: key management. **Corrected after review:** clean/smudge filters do NOT require plaintext-vs-agent tradeoff (the working tree stays readable locally) -- the real cost is key distribution and that a push still happens, just of ciphertext, which doesn't satisfy an operator who wants no push event at all |
| M5 | Remote policy (never create the remote at the platform level; or org-level branch/push restrictions) | Yes, most robustly -- no local trick can push to a remote that doesn't exist or that rejects the account | Yes -- platform-side, not per-clone | Yes, from the operator's own local machine -- but requires deliberate platform configuration Arcane cannot enforce or verify from a local CLI | Medium: one-time platform setup, outside this framework's reach to automate |
| M6 | Split model (sensitive material never enters Git at all -- lives in a `.gitignore`'d directory, a password manager, or a separate encrypted vault; only derived/redacted working documents enter Git) | Yes, structurally -- content that was never committed cannot be pushed | Yes | Yes, for the content that follows the split correctly | Medium: requires discipline/tooling to keep the separation correct, and is a scoping decision more than a technical control |

**No single mechanism clears every column.** M5 and M6 are the only two that are
robust against a fresh, un-set-up clone, but both require operator action Arcane
cannot enforce (M5) or defines a boundary rather than an enforcement mechanism (M6).
M1/M2 are effective against the accidental case (the dominant real threat
actor from the threat model above), and bypassable by design once someone decides to
bypass them -- which is an acceptable trade for the accidental case, not for a
determined one.

**Two mechanisms EF-09 didn't name, worth noting even though this PRD doesn't adopt
them as primary (added after review):**

- **Platform-side server-enforced scanning** (e.g. GitHub push protection, GitLab
  secret detection, a self-hosted `pre-receive` hook) is meaningfully different from
  M5's plain access-control framing -- it is the one option that can survive a
  *deliberate* client-side bypass, since enforcement runs on the remote, not the
  pusher's own machine. Not adopted as primary here because, like M5, it requires
  platform-side setup Arcane cannot configure or verify from a local CLI -- but it
  belongs in any operator-facing guidance for `"guarded"`/`"open"` repos that do have
  a remote.
- **Submodule/subtree split**: sensitive content stays Git-tracked (unlike M6, which
  removes it from Git entirely) but lives in its own submodule with its own,
  independently-set `push_policy` -- relevant to the per-directory-granularity open
  question below, as a middle ground between "whole repo" and "not in Git at all."

**Hook-Manager Collision (added after review -- this is not hypothetical).** `core.hooksPath`
is one exclusive slot per repository; Git reads only one directory, never multiple. A
naive M1 install that unconditionally points `core.hooksPath` at a new Arcane-owned
directory would silently disable whatever hook manager the repo already uses. This is
not an edge case: **this repository's own `core.hooksPath` is already `.husky/_`**
(`git config --get core.hooksPath`), running lint/typecheck on `pre-commit` and the
full test suite -- with its own deliberate `GIT_*` env-scrubbing hardening from EF-34
-- on `pre-push`. A `push_policy: "blocked"` install here, as originally specified,
would have silently turned that protection off while appearing to add a new one. Any
real implementation must detect an existing `core.hooksPath` and either chain into it
(the new hook script calls the prior one first) or refuse installation with a clear
error, never overwrite silently. See requirement R7.

## Recommended design (for operator review, not yet accepted)

**Layered, not single-mechanism.** M1 + M2 together as the shipped, automatable
control (belt-and-suspenders -- M2 catches an agent or script that uses
`--no-verify` to skip M1's hook); M5 and M6 as strongly-worded, documented operator
guidance Arcane surfaces at the right moment but cannot itself enforce.

1. **A new repo-level policy field, following the `tracking_mode` precedent this
   batch just shipped (ARC-032).** `.arcane.json` gains `push_policy: "blocked" |
   "guarded" | "open"` (default `"open"` -- no behavior change for the overwhelming
   majority of repos that were never asking for this). Same contract as `profile`/
   `tracking_mode`: chosen once (at `spell init`, or via the `MANIFEST_RETROFITS`
   wizard for existing installs), never silently overwritten. This is a genuinely
   low-risk addition to design *because* the exact persistence mechanism (ask once,
   validate, retrofit) already exists and is already proven working in this
   codebase -- this PRD is not proposing new infrastructure, only a new field and a
   new consumer of the existing one.
2. **`"blocked"`**: `spell init` first checks `core.hooksPath` for an existing
   value (per the Hook-Manager Collision note above and R7 -- **not** an
   unconditional overwrite). If unset, it points `core.hooksPath` at a new
   versioned, Arcane-distributed hook directory (a new registry component, e.g.
   `push-safety-hooks`) whose `pre-push` script exits non-zero unconditionally, with
   a message naming the repo's own `push_policy` and pointing at the Bypass/Recovery
   Contract below. If `core.hooksPath` is already set (Husky, Lefthook, pre-commit,
   or anything else), installation either chains the new script after the existing
   one or refuses with a clear, actionable error -- it never silently repoints an
   existing hook manager's slot. Either way, it also sets the push URL to a
   clearly-invalid sentinel (M2), so even a `--no-verify` push fails at the
   transport layer instead of silently succeeding.
3. **`"guarded"`**: hook + disabled push URL are NOT installed, but `spell init`
   prints the M5/M6 guidance once, and `doctor` gains a non-blocking check that
   reminds the operator this repo is flagged sensitive with no active technical
   control. **Corrected after review:** the reminder must not fire only when no
   remote is configured -- as first specified, the reminder would permanently stop
   the instant *any* remote gets added, including a wrong or insecure one, at which
   point `"guarded"` silently becomes behaviorally identical to `"open"`. Instead,
   `doctor` should keep surfacing the reminder for every `"guarded"` repo
   regardless of remote state, noting the currently-configured remote (if any) so the
   operator can judge whether it's the deliberate, access-controlled one M5 calls for.
4. **`"open"`** (default): no change from today's behavior.

**Scope decision, resolving EF-09's own second open question:** `push_policy` is a
**blanket, whole-repository invariant**, not per-file/per-path scanning (rejects M3
as the primary mechanism -- see the comparison table's row on why path-based
sensitivity classification is unreliable). An operator who determines a *subset* of
a blocked repo is safe to share should extract that subset into a new, separate,
`"open"` repository rather than expect selective push-through of a `"blocked"` one.
This keeps the invariant simple enough to actually trust.

## Bypass/recovery contract

Required by EF-09's own proposed fix. A `"blocked"` repo's push policy must never
flip to unblocked as a side effect of an unrelated action (an update, a retrofit
answer, a single flag). Recovery requires a **deliberate, multi-step, logged**
sequence.

**Corrected after review -- what this gate actually defends against, stated
honestly.** An earlier draft claimed a typed-repo-name confirmation step
"matches this repo's own established pattern for other high-consequence
confirmations." That precedent doesn't exist: every existing `confirm()` call in
this codebase (`init.ts`'s "Continue anyway?", `uninstall.ts`'s file-removal
confirm -- arguably the most destructive command that exists today) is a plain
yes/no gate, not a typed re-entry. More importantly, a typed-name confirmation
raises the bar for a fumbling human (threat actor #1) but does essentially nothing
against threat actor #2 (an unsupervised or compromised agent) -- an agent that
already has shell access to run `git push` can trivially read the repo name from
`.git/config` or `.arcane.json` and pass it back as a scripted confirmation string.
Since a push is the specific irreversible action the threat model calls out agents
for, the unblock gate needs a control an agent script cannot trivially clear on its
own, not a control shaped for human fat-fingering. Proposed instead:

1. The operator explicitly runs a new command (e.g. `spell unblock-push`) --
   never something that fires from a generic `spell update`/`spell init` path.
2. The command must run from an interactive TTY and refuse to proceed under any
   non-interactive/scripted invocation (no `--yes`, no piped stdin, no CI context)
   -- this is the actual bar against a scripted agent action, not the typed-name
   step alone. Whether this is sufficient against a sufficiently capable
   agent/automation, or whether an out-of-band step (e.g. a confirmation code sent
   to the operator by some channel the local process can't itself read back) is
   needed, is left as an open question below -- this PRD does not claim to have
   solved unblock-safety against a determined automated actor, only to have named
   the gap plainly instead of papering over it with a human-shaped confirmation
   step that wouldn't actually hold.
3. The command prints the repo's current `push_policy` and what data class it was
   marked for (if recorded), and requires typing the repo name back -- kept as a
   real, if modest, guard specifically against the fumbling-human case (confirming
   the operator is looking at the repo they think they are), not represented as a
   defense against an agent.
4. On confirmation, it restores the push URL, removes `core.hooksPath`, and writes
   `push_policy: "open"` with a timestamped note -- never silently; the change is
   itself a visible, committed (or at minimum, locally-logged) event.
5. Never offer a "just this once" override that leaves `push_policy` at `"blocked"`
   in the manifest while letting a push through -- state would then lie about actual
   repo posture, which is worse than no control at all.

## Requirements (for a future implementation WP -- not built by this PRD)

| # | Requirement | Acceptance Criteria |
|---|---|---|
| R1 | `push_policy` field persists in `.arcane.json` on the `profile`/`tracking_mode` contract | Chosen once, retrofit-backfilled, never silently overwritten |
| R2 | `"blocked"` installs a versioned pre-push hook via `core.hooksPath` | New registry component; hook exits non-zero unconditionally; message names the policy and points at the unblock command |
| R3 | `"blocked"` also disables the push URL | `git push` fails at the transport layer even with `--no-verify` |
| R4 | `"guarded"` surfaces guidance without installing a technical control | One-time `spell init` message; non-blocking `doctor` check that keeps firing regardless of remote state (never stops just because a remote -- possibly the wrong one -- exists) |
| R5 | Deliberate, confirmed, logged unblock path | New command; interactive-TTY-only (refuses scripted/piped/CI invocation) plus typed repo-name confirmation; never a side effect of another command |
| R6 | Real fixture coverage for hook installation, push-URL disabling, and the unblock flow | Using a real local git remote fixture (a second local bare repo as the "remote"), not mocked -- prove the hook and disabled URL actually block a real `git push` attempt, not just that the config was written |
| R7 | Installation must detect and never silently clobber an existing `core.hooksPath` | If one is already set (e.g. Husky, Lefthook, pre-commit -- confirmed live in this very repository, `.husky/_`), either chain the new hook after the existing one or refuse installation with a clear, actionable error; never overwrite silently |

## Constraints

- This PRD makes no code changes. No version bump.
- Default behavior (`push_policy: "open"`) must be unchanged from today for every
  existing repo -- this is strictly additive, opt-in.
- Cannot enforce M5 (remote/platform policy) from a local CLI; can only document and
  prompt for it.
- `core.hooksPath` is a per-clone git config value -- a `"blocked"` repo cloned fresh
  elsewhere is NOT protected until that clone also runs `spell init`/`spell update`.
  This must be stated plainly in whatever ships, not glossed over.

## Dependencies

None new at the design level. A real implementation would build directly on
ARC-032's manifest-persistence pattern and the existing `MANIFEST_RETROFITS`
mechanism (`src/modules/hub.ts`).

## Open questions (for operator decision -- this PRD does not resolve these)

Resolving EF-09's own two named questions:

- **"Is the repository local-only, remotely backed up, or collaboration-enabled?"**
  This PRD's answer: that's exactly what `push_policy`'s three values are for --
  `"blocked"` = local-only intended, `"guarded"` = sensitive but the operator wants
  push available with eyes-open friction, `"open"` = ordinary collaboration repo.
  Whether a fourth state is needed (e.g. an explicit "remotely backed up to a private
  encrypted remote, never a collaboration platform") is left open.
- **"What data classes are in scope, and is preventing all pushes an intended
  invariant or an operator override?"** This PRD's answer: blanket invariant per
  repo (see Recommended design), not per-file classification. Left open: should
  `push_policy` be settable per-directory within one repo (e.g. a hub repo with one
  sensitive venture among several open ones), or is repo-level granularity
  sufficient and a sensitive venture should simply be its own separate repository?

**New open questions this research surfaced, not present in the original intake:**

- Should `"blocked"` be a valid choice for `governance-only`/`methodology` profiles
  at all, or does it only make sense for profiles that produce real operational
  content? (This PRD leans toward: available for all profiles -- a docs-only repo
  can still hold sensitive personal journal-style content.)
- Does GitHub Desktop / VS Code's built-in Git / other non-CLI clients reliably
  invoke `core.hooksPath` hooks the same way the `git` CLI does? This PRD assumes
  yes (hooks are a git-level mechanism, not CLI-specific) but that assumption is
  unverified and should be confirmed empirically before implementation, not
  asserted.
- Is a disabled push URL (M2) actually more resistant to accidental reversal than a
  hook, or does an operator who forgets it's there simply "fix" what looks like a
  broken remote the first time they legitimately need to push somewhere else in that
  clone? This PRD's recovery-contract (R5) exists partly to answer this, but the
  human-factors question of whether operators correctly diagnose "this is a
  deliberate safety block" versus "my remote is misconfigured" is untested.
- **Added after review:** is an interactive-TTY-only gate (Bypass/Recovery Contract,
  step 2) actually sufficient resistance against an unsupervised agent running the
  unblock command, or does meaningful agent-resistance require an out-of-band
  confirmation channel the local process can't itself read back (e.g. a code sent
  somewhere the agent has no access to)? This PRD deliberately does not claim to have
  solved this -- it's flagged as open specifically so an operator decides how much
  agent-resistance the unblock path actually needs, rather than this PRD asserting a
  false sense of it.
