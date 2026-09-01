---
title: Delivery-Channels Smoke Tests — node_modules Traversal and Symlink Following
audience: both
last_updated: 2026-08-31
status: active
tags: [research, distribution, vs-code, copilot, smoke-test]
sources: [IDEAS.md I13, code.visualstudio.com/docs/agent-customization/prompt-files, github.com/microsoft/vscode-copilot-release issue 6183, a live empirical test performed 2026-08-31]
---

# Delivery-Channels Smoke Tests

## Summary

I13's "editor files must sit at fixed repo paths" enabling finding hinges on two unverified assumptions
about VS Code's `chat.promptFilesLocations` setting. Both were tested empirically, live, on this
machine (2026-08-31):

- **`chat.promptFilesLocations` does traverse into `node_modules`.** An explicitly-configured location
  (`"node_modules/fake-package": true`) surfaced its prompt file as a discoverable slash command. This
  is a real risk, not just a real capability — a package-resident distribution model needs to actively
  exclude `node_modules` from any broad location it configures, or it inherits whatever `.prompt.md`
  files any installed npm package happens to ship, intentionally or not.
- **The discovery mechanism follows a directory junction standing in for `.github/prompts`.** A prompt
  file reachable only through the junction was discovered and ran correctly. This is the good news half
  of I13's enabling finding: a package-resident prompt directory referenced via a filesystem link,
  rather than copied into the consumer repo, is a viable distribution shape — at least for this
  reparse-point type.

**Confidence caveat, stated directly:** both findings are empirical observations from one live test
session, not settings documentation (VS Code's own docs, checked directly, say nothing about either
behavior — see Findings below) — a version change could alter either behavior with no announcement.
Re-run before treating either as permanent.

## Findings

### Environment and setup

- VS Code (see `code --version`; GitHub Copilot Chat installed as a **built-in** extension, v0.63.0 —
  not a separate marketplace install) on this machine, with a disposable test workspace under the
  session scratchpad (not this repo) containing:
  - `control-prompts/baseline-test.prompt.md` — a sanity-check control, at a plainly-configured,
    non-edge-case location.
  - `node_modules/fake-package/nodemod-test.prompt.md` — the traversal test.
  - `real-prompts-dir/symlink-test.prompt.md`, reachable a second way via `.github/prompts` — the
    junction test.
  - `.vscode/settings.json` configuring `chat.promptFilesLocations` with `.github/prompts`,
    `control-prompts`, `node_modules/fake-package`, and `.` all set to `true`.

### Deviation from I13's literal test design, disclosed

I13 specifically names a **symlink**. Creating one on Windows without administrative privileges requires
enabling Developer Mode, which is a system-settings change — outside what this session's standing
autonomy grant covers, and not something to enable unilaterally on the operator's real machine. A
**directory junction** (`New-Item -ItemType Junction`) was used instead: no elevation required, and
functionally similar (both are NTFS reparse points a file-system reader must resolve to see through),
but not identical — a true symlink can be relative and can point to another volume; a junction is
always an absolute local path. The observed "follows the junction" result is suggestive for symlinks
too, but is not the same claim. If the distinction matters for a specific packaging decision, re-test
with a real symlink (from an elevated prompt, or with Developer Mode on).

### Documentation gap, confirmed directly

`code.visualstudio.com`'s own prompt-files documentation was read directly and says nothing about
`node_modules` exclusion or symlink/junction support for `chat.promptFilesLocations` — this genuinely
required an empirical test, exactly as I13 anticipated ("Two smoke-tests before relying on it"). A
related GitHub issue (`microsoft/vscode-copilot-release#6183`) reports a different, unrelated bug
(absolute paths in the setting are ignored) — not a signal either way on traversal or symlinks, but
worth knowing: this test used relative paths throughout to avoid that separate, confirmed defect.

### Execution path, disclosed as an open question

The actual chat responses in this test session appeared to route through a non-default-looking chat
backend (UI signals included a "Windsurf" status-bar indicator and a "GPT-5.6" model attribution on the
final response, alongside `codeium.codeium` being installed in this VS Code instance) rather than a
confirmed, unambiguous stock GitHub Copilot completion. `chat.promptFilesLocations` itself is documented
specifically as a GitHub Copilot Chat setting, and file **discovery** (a location's contents becoming a
named, runnable slash command) is a VS-Code-core-level behavior gated by that setting regardless of
which chat participant later handles the actual completion — so this is very likely still a genuine
test of the setting in question. Stated plainly rather than silently assumed: this was not visually
confirmed against an unambiguous, verified stock-Copilot response.

## Follow-ups

- **For any future spell distributed via a package-referenced (not copied) location**: explicitly
  exclude `node_modules` from whatever `chat.promptFilesLocations` entry is configured — do not rely on
  an assumed default exclusion, since this test found none.
- Re-run this smoke test with a true symlink (Developer Mode or an elevated prompt) before a packaging
  decision specifically depends on symlink behavior rather than junction behavior.
- Re-run against a confirmed, unambiguous stock GitHub Copilot Chat session (a clean profile, or with
  competing chat extensions disabled) if a future decision needs certainty about which specific
  extension's discovery logic was actually exercised.
