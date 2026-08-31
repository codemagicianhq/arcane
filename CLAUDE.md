<!-- arcane:start -->
## Spell Routing

| When you're about to... | Invoke |
|---|---|
| Commit work | `spell-commit-work` |
| Open a session | `spell-open-session` |
| Close a session | `spell-close-session` |
| Open a pull request | `spell-create-pull-request` |
| Ship a feature end-to-end | `spell-full-cycle` |
| Fix a bug | `spell-bug` |
| Review code or a PR | `spell-review` |

If a spell exists for the workflow you are about to perform, invoke it — do not improvise the workflow from general knowledge, even when the user doesn't name the spell.

<!-- No agent roster installed in this repo (no .arcane/agents.yaml) — the roster table `spell agents sync` would otherwise render here is omitted rather than shown empty. -->
<!-- arcane:end -->

## Working protocol

1. Verify before asserting. Cite file and line. If you did not check it, say so.
2. Distinguish "I checked", "I inferred", and "I was told" — never let the third read as the first.
3. When a check contradicts a claim — yours or mine — say so explicitly and change the claim
   on the record. Do not quietly correct.
4. Name your own errors as errors.
5. A summary of work is not evidence of work. Neither is a green test suite.
