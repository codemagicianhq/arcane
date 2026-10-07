---
title: Spell Login Manual Acceptance Guide
audience: both
last_updated: 2026-10-07
status: draft
tags: [login, testing, acceptance, security]
---

# Spell Login — Manual Acceptance Guide

Related: [[features/spell-login/PRD|Spell login PRD]]

Use this guide for the live checks in AC2–AC5 and optional live Mac/Ubuntu smoke checks. The `Sign-in tests` GitHub Actions matrix covers mocked R3–R10 behavior on Ubuntu, Windows, and macOS for AC6. Manual runs on those machines add real-world evidence but do not replace AC6. CI does not contact the development identity tenant or prove that a real OS keychain works. Record the three CI job links after a PR run; mark AC6 complete only when all three pass.

## Before starting

- Use a **development tenant test account** and a dedicated OS user profile, VM, or disposable container. `login` replaces an existing Arcane session after successful authentication, so first run `whoami` and stop if that profile holds a session you need to keep.
- Use this CLI checkout on Windows now, or the same PR branch once it is published, with a working network connection to the development identity tenant. CI uses Node.js 20; the current Windows workstation has Node.js 24. Record the version you use. Run `npm ci` on a fresh checkout, then `npm run build`; the current Windows checkout already has dependencies installed, so it only needs a fresh build. The commands below use `node dist/index.js` to ensure the checkout is tested, rather than a globally installed `spell` of unknown version. Until the changes are committed, record that the Windows run used staged work in addition to the printed HEAD SHA.
- Keep the terminal output local. It can contain account email, `sub`, and a short-lived device code or sign-in URL. Never paste the raw output, callback URL, session file, or keychain secret into a PR. Record a redacted result and the equality of the two `sub` values instead.
- Record OS/version, Node version, CLI commit SHA, test account alias, date, each check's pass/fail, and any unexpected prompt or error. A screenshot may be used only after removing account identifiers, codes, and callback query values.

## 1. Windows workstation with a browser and Credential Manager — AC2, AC4

Open an interactive PowerShell terminal in the CLI checkout. Use the same Windows profile for every command. Set the environment in that terminal:

```powershell
$env:ARCANE_ENVIRONMENT = 'dev'
node --version
git rev-parse --short HEAD
node dist/index.js whoami
```

An initial `whoami` may exit 1 with `Not signed in`; that is expected for a fresh test profile. If it identifies an account, stop unless replacing and later removing that profile's session is intended.

Open **Credential Manager → Windows Credentials** and count entries whose service/target contains `arcane-cli`. Record the count and entry names only, never their values. A fresh profile should have zero.

```powershell
node dist/index.js login
node dist/index.js whoami
node dist/index.js whoami --verify
```

The browser should open the development sign-in. After authenticating, it should display a success result and the terminal should report `Signed in`. Compare the `sub` printed by `login` with the `sub` printed by `whoami`; record **matched** or **mismatched**, not the value. `whoami` should say `[development]` and `Stored in the OS keychain`. `whoami --verify` should confirm the session is active. The browser result must not claim success if the terminal reports a failure to save the session.

Return to Credential Manager and record how many `arcane-cli` entries exist after sign-in. The session may occupy an index plus multiple token chunks. Then run:

```powershell
node dist/index.js logout
node dist/index.js whoami
```

`logout` should report removal from the OS keychain. The final `whoami` should exit nonzero and say `Not signed in`. Refresh Credential Manager and confirm there are **zero** `arcane-cli` entries. `logout` clears this machine's local session; it does not revoke the identity provider's token everywhere.

## 2. Headless Linux without a browser or Secret Service — AC3, AC5

Use WSL2 for the browserless device-code check (AC3) if it has no usable browser launcher. The PRD names a **headless Linux container** as AC5's evidence environment, so repeat the no-keychain refusal and explicit file fallback in a container for formal AC5 evidence. Docker Desktop is available on this Windows PC; booting a separate Ubuntu installation is unnecessary. In either environment use Linux Node.js 20, network access, no usable browser launcher, and no usable Secret Service/keyring. Keep a separate browser-capable phone or computer nearby to complete device authorization. After the branch is published, clone and build that exact branch **inside the Linux filesystem**; do not reuse the Windows checkout's `node_modules`, which contains platform-specific dependencies. Use a dedicated Linux home directory/profile with no existing `~/.arcane/session-insecure.json` or Arcane keychain entries. An ordinary desktop Linux session with an unlocked keyring is **not** a valid environment for the no-keychain check.

On this workstation, Ubuntu 24.04 WSL2 currently has no Linux `node`, no `xdg-open`, and no active Secret Service. WSLg and a user DBus are present, so verify the no-keychain behavior with the CLI rather than inferring it from the WSL label. WSL can find the **Windows** `npm` through PATH; do not use it. Install Linux Node.js 20 in the distro and confirm `node -p 'process.platform'` prints `linux`, while `command -v node` and `command -v npm` point into Linux paths such as `~/.nvm/`, not `/mnt/c/`. A Linux Node version manager is suitable; see the [nvm installation instructions](https://github.com/nvm-sh/nvm#installing-and-updating).

### Container setup on this Windows PC

The following setup was checked with Docker Desktop and the cached `node:22-alpine` image on 2026-10-07. It mounts the staged Windows source read-only, copies it into the disposable Linux container without Windows dependencies or local settings, installs Linux dependencies, and builds successfully. Run this in PowerShell:

```powershell
docker run --rm -it --mount 'type=bind,source=X:\Code\CodeMagician\products\arcane\arcane-wt-login-callback,target=/source,readonly' -e ARCANE_ENVIRONMENT=dev node:22-alpine sh
```

Then run these commands **inside the container** before the test commands below:

```sh
mkdir /work
tar -C /source --exclude=.git --exclude=node_modules --exclude=dist --exclude=coverage --exclude=.env --exclude=.env.local --exclude=settings.local.json -cf - . | tar -C /work -xf -
cd /work
npm ci
npm run build
node -p 'process.platform'
```

The final command must print `linux`. This container has no user DBus or browser launcher. Record Node.js 22 for this manual run; CI separately tests Node.js 20. Keep the container open until you finish the device-code, file-mode, and logout checks. `--rm` removes its local session file when you exit.

The container opens at the `/ #` shell prompt. Type the setup commands after that prompt, one line at a time. The copied `/work` tree excludes `.git`, so use the Windows HEAD SHA recorded before starting Docker; do not run `git rev-parse` inside this container.

The copied source has no `.git` directory, so Husky may print `.git can't be found` during `npm ci`; the build can still succeed. `npm ci` may also report one high advisory in `source-map-js`, reached through development build/test tools. A separate `npm audit --omit=dev` on 2026-10-07 reported zero production-dependency advisories. Keep the lockfile unchanged during this acceptance run so the tested code matches the staged checkout.

```bash
export ARCANE_ENVIRONMENT=dev
node --version
test ! -e "$HOME/.arcane/session-insecure.json"
node dist/index.js whoami
```

The initial `whoami` should report signed out. To test secure refusal, start device authorization **without** file opt-in:

```bash
node dist/index.js login --device-code
refusal_status=$?
printf 'Refusal exit status: %s\n' "$refusal_status"
if [ -e "$HOME/.arcane/session-insecure.json" ]; then echo 'UNEXPECTED: session file exists'; else echo 'No session file (expected)'; fi
```

Open the displayed verification address on the other device, enter the one-time code, and sign in with the development test account. After authorization, the CLI should report that the keychain is unavailable, say `Nothing was stored`, mention `--insecure-storage`, and exit nonzero. The presence check should print `No session file (expected)`. Do not record the one-time code.

Now explicitly opt in to the file fallback:

```bash
node dist/index.js login --device-code --insecure-storage
node dist/index.js whoami
node dist/index.js whoami --verify
stat -c '%a %n' "$HOME/.arcane/session-insecure.json"
```

Complete the second device authorization. The CLI should sign in, print the insecure-storage warning, and identify the file as the storage medium; `whoami --verify` should confirm the live session. The file mode should be `600`. Do **not** open or print this file: it contains a refresh token.

Finally run:

```sh
node dist/index.js logout
logout_status=$?
printf 'Logout exit status: %s\n' "$logout_status"
if [ -e "$HOME/.arcane/session-insecure.json" ]; then echo 'SESSION FILE STILL PRESENT'; else echo 'Session file absent'; fi
node dist/index.js whoami
```

If the keychain cannot be inspected, `logout` exits nonzero even after removing the file; record the two outcomes separately. The staged fix now explicitly says when the file was removed and that keychain cleanup is unverified. If the file remains, treat it as a failure and remove the disposable profile/container after capturing a redacted report. Keep each quoted path on one line; a shell `>` continuation prompt means a quote is still open and the path has changed.

## 3. Optional live checks on macOS or Ubuntu

These are additional platform smoke checks, not a new acceptance criterion. Wait for the reviewed branch to be committed and published, then check out that exact branch on each machine. Use a disposable OS profile or confirm with `whoami` that replacing any existing Arcane session is acceptable. Install a Linux or macOS Node.js 20 or later locally; do not use Windows `node_modules` on Ubuntu. From the CLI checkout, run:

```sh
npm ci
npm run build
export ARCANE_ENVIRONMENT=dev
node --version
git rev-parse --short HEAD
node dist/index.js whoami
node dist/index.js login
node dist/index.js whoami
node dist/index.js whoami --verify
node dist/index.js logout
node dist/index.js whoami
```

**macOS:** This is Task 1's browser/keychain sequence in a POSIX shell. Before login, search Keychain Access for `arcane-cli` and record entry names/count only; repeat after login and after logout. The final count should return to zero. The first keychain access may prompt for permission and name the local `node` executable; confirm it belongs to this test before allowing it. Compare the full `sub` from login and `whoami` locally and record only whether they match. Do not inspect credential values.

**Ubuntu desktop with a working Secret Service/keyring:** Run the same browser/keychain command sequence if you want a native Linux smoke check. Confirm `whoami` says `Stored in the OS keychain` after login and signed out after logout. A desktop with an unlocked keyring is a different case from Task 2 and does not prove AC5. If Ubuntu has no usable browser or keyring, use Task 2's device-code and explicit-file-fallback sequence instead, after checking its prerequisites. The disposable Alpine run already supplied formal AC3/AC5 evidence, so repeating it is optional.

For each extra run, record OS/version, Node version, branch commit SHA, whether browser login completed, whether `sub` matched, whether live verification passed, storage medium, logout result, and any keychain prompt. Redact account identifiers, codes, callback query values, and secrets. AC6 remains the separate GitHub Actions matrix on a PR.

## Evidence record

| Check | Machine | Expected evidence | Result |
| --- | --- | --- | --- |
| AC2 browser sign-in, same `sub`, live verify | Windows test profile | Redacted terminal result; `sub` matched | Passed; operator confirmed exact `sub` match locally |
| AC3 device code on browserless host | Headless Linux | Redacted terminal result; completed on another device | Passed in disposable Alpine container with explicit file storage; live verify succeeded |
| AC4 keychain empty after logout | Windows test profile | Entry counts before sign-in, after sign-in, after logout | Passed: three entries after sign-in; `logout` and signed-out `whoami` passed; operator refreshed Credential Manager and counted zero `arcane-cli` entries after logout |
| AC5 no-keychain refusal and explicit file fallback | Headless Linux | Terminal refusal/warning; absent/present file; mode `600` | Passed: live refusal and explicit fallback observed, live verify succeeded, mode `600`, file absent after logout. Source inspection corroborates nonzero refusal and no file write; numeric exit and immediate file absence were not captured live. |
| AC6 R3–R10 on three operating systems | GitHub Actions PR run | Links to Ubuntu, Windows, macOS `Sign-in tests` jobs | Pending |

Record failures and gotchas even when a later retry passes. A macOS Keychain access prompt, if testing manually on a Mac, may identify the `node` executable because the test runs the checkout directly; verify the prompt belongs to the expected local test before allowing it.

## Local preflight evidence — 2026-10-07

The exact six-file CI command passed on the Windows development machine. It uses a mock identity provider and fake keychain backends; it does not satisfy the live checks above or the three-runner AC6 gate.

```text
Test Files  6 passed (6)
Tests       107 passed | 1 skipped (108)
```

The skipped test is the POSIX `0600` file-mode check, which does not apply on Windows. The CI YAML parsed with `pull_request` and `push` triggers and the three requested runner labels. The working-tree diff had no whitespace errors.

## Operator Windows run — 2026-10-07

The operator ran the staged CLI checkout at HEAD `96b8641` on Windows with Node.js `24.14.0` and `ARCANE_ENVIRONMENT=dev`. Initial `whoami` said signed out. Browser `login` completed, then `whoami` reported a development session in the OS keychain and `whoami --verify` confirmed it with the identity service. The operator compared the full `sub` locally and confirmed an exact match; the identifier itself is not recorded here. Credential Manager showed three `session/...arcane-cli` entries after sign-in, consistent with one index and two chunks. `logout` reported removal from the OS keychain; the next `whoami` said signed out. After refreshing Credential Manager, the operator counted **zero** `arcane-cli` entries.

The browser result screenshot still showed the authorization code in its address bar. This is the known callback-URL hardening item in [[TODO#Sign-in callback|TODO]]; keep that screenshot out of public evidence and do not treat the query-bearing result URL as the final designed page.

## Operator headless Linux run — 2026-10-07

The operator used the staged Windows checkout mounted read-only into disposable `node:22-alpine`, copied source into `/work` without Windows dependencies or `.git`, and built it inside Linux. `npm ci` installed 244 packages, `npm run build` succeeded, `process.platform` printed `linux`, Node.js was `22.23.3`, and `ARCANE_ENVIRONMENT=dev` was set. Initial `whoami` said signed out and reported the OS keychain unavailable. The Windows checkout's previously recorded HEAD was `96b8641`; the container had staged and working-tree changes beyond that commit. The copied `/work` tree has no `.git` and cannot report its own commit SHA.

The first live device-code authorization, without `--insecure-storage`, ended with a keychain write failure, `Nothing was stored`, and guidance to use the explicit fallback. The operator did not capture that command's numeric exit status or check file absence immediately afterward. Source inspection of this staged checkout shows `runLogin` calls `process.exit(1)` on `KeychainUnavailableError`, while `createSessionStorage.save` writes the file only on the explicit `insecure` branch; the secure branch attempts keychain storage and does not create a file. This corroborates the observed refusal without requiring a third live authorization. A second authorization with `--insecure-storage` signed in to the development tenant, warned about file storage, and `whoami --verify` confirmed an active session. The session file mode was `600`; its contents were not read. No one-time codes, account email or subject identifier are retained in this evidence.

`logout` then reported that it could not read the unavailable keychain and could not confirm removal from that medium. The first file-absence test was entered with a newline inside the quoted filename; its silent result was **not evidence** of removal. The operator repeated the exact-path test and a visible `if [ -e ... ]` check: the actual session file was absent. A final `whoami` said signed out and repeated the keychain-read warning. Thus local file removal is confirmed, while `logout` could not verify or report complete keychain cleanup. Its numeric exit status was not captured. This is a partial-cleanup reporting issue to address against R3, separate from AC5's successful explicit file fallback.

## Partial-cleanup reporting fix — staged and Linux smoke-tested

The operator's container copied the source before this fix, so its output documents the **pre-fix** behavior. The staged fix makes `SessionStorage.clear()` carry an exact list of media successfully removed when keychain cleanup fails; `runLogout` now reports that the insecure file was removed while retaining a nonzero result for unverified keychain cleanup. A new regression reproduced the missing message against the old code and passed after the fix.

Post-fix verification on the Windows development checkout: full suite **139 files passed, 1 skipped; 2,271 tests passed, 7 skipped**; typecheck, lint and build passed. Focused coverage over the changed files and their login/storage tests was **96.33% lines** overall. `src/commands/logout.ts` reached 100% lines/branches/functions/statements; `src/modules/session-store.ts` reached 95.60% lines and 85.07% branches. A fresh disposable Linux container built the staged source, created only a dummy local session file, and ran the real CLI: it reported that the insecure file was removed and keychain cleanup was unverified, exited `1`, and the file was absent. This did **not** use a real token or repeat live authorization. A subsequent repository-wide `npm run test:coverage -- --testTimeout=20000` passed with **2,271 tests passed, 7 skipped, 0 failures** and 93.01% lines, 93.85% functions, 86.93% branches, and 91.83% statements. All configured global and critical-file thresholds passed.
