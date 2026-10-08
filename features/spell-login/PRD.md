---
status: draft
tracking_mode: internal
source_intake: maintainer request, 2026-10-05 (sign-in for the CLI)
---

# PRD - `spell login`: Sign In to the Arcane Account from the CLI

Related: [[features/spell-login/architecture|Implementation architecture and diagrams]]

Draft 2026-10-05. Decisions 1 to 6 were made by the maintainer in session on 2026-10-05; the hardening and adoption requirements (R12 and later) are proposals for review.

## Problem

Arcane is getting an account that a person signs in to once. The CLI is the first place that has to sign in to it, and a person using the CLI on their own machine has no way to do so. Features that need to know who a person is come later, but the sign-in has to exist first, because everything after it depends on a person holding a valid Arcane session.

The CLI is MIT-licensed and must stay fully usable signed out. Nothing in this PRD may make a command require a login that did not require one before.

## Decisions already made

1. **Library: `openid-client`.** A maintained, OpenID-certified library for the authorization-code flow with PKCE and the device-code flow. It is not tied to one identity provider, so a later move away from Microsoft stays a configuration change. The flow is not hand-written with `fetch`, and MSAL is not used (it needs Node 20 or later, and its secure cache pulls in native modules).
2. **Storage: the OS keychain by default, through `@napi-rs/keyring`.** It ships prebuilt binaries for macOS, Windows (x64, ia32, arm64) and Linux. Only the refresh token and the minimum metadata are stored (see R4). If no keychain is available, `spell login` refuses and stores nothing.
3. **File fallback only by explicit opt-in:** `spell login --insecure-storage`. It prints a warning on every use. On Unix the file is mode `0600`. On Windows the warning must not claim `0600`; it says the file is protected only by the user profile's permissions, and the CLI tightens access to the current user where it can and refuses to write the file if it cannot.
4. **Flow: the browser (loopback) flow by default, `--device-code` for machines with no browser.** The `arcane-cli` app registration already allows the `http://127.0.0.1` redirect and the device-code flow. If no browser can be opened, the CLI suggests `--device-code` and does not hang.

5. **`spell whoami` ships in the first release.** It prints the signed-in account and whether the stored session is still valid, without contacting the network unless asked.
6. **`spell login` asks for a read scope on the Arcane service API up front, along with `openid`, `profile` and `offline_access`.** Nothing calls that API in the first release. Asking at first sign-in means the person consents once instead of seeing a second consent screen when a later release starts using it. The scope's name is kept out of this document until it ships.

## Gate: the Windows storage spike (done 2026-10-05; the secret is split across entries)

**Result.** Through `@napi-rs/keyring` on Windows (x64), the largest secret that round-trips is **1,280 characters** (stored as UTF-16, against the 2,560-byte Credential Manager limit); anything longer is refused with a clear error and nothing is truncated. A real refresh token from the development identity tenant, obtained through the device-code flow, is **1,468 characters**, so a single credential does not fit. The access token (2,482 characters) and the ID token (1,175) are not stored.

**Decision (maintainer, 2026-10-05): split the token across several credential entries**, on every platform so there is one code path. The alternatives were a keychain-held encryption key with the ciphertext in a file, and Windows' own encryption service through a native module; both were rejected because they add custom cryptography or native dependencies, where splitting keeps the secret entirely inside the OS credential store.

**Design (requirement R4a below).**

- The secret is cut into chunks of at most 1,000 characters, which leaves a wide margin under the 1,280 limit and room for a longer token later.
- Each save gets a new random generation id. Chunks are written first, under names that include the generation id and the chunk number. A small index entry is written **last**; it records the generation id, the chunk count and a SHA-256 of the whole secret. The index is the switch: until it is written, the previous session is still the one that is read.
- After the index is written, the previous generation's chunks are deleted. A crash at any point leaves either the old session or the new one, plus stray chunks that the next save or `spell logout` removes.
- A read assembles the chunks named by the index and verifies the SHA-256. Any missing chunk or mismatch is treated as signed out, never as a partial token, and `spell doctor` reports it.
- The number of chunks is not capped by the design; a test stores a secret several times the current size.

**Also found.** The identity tenant publishes its issuer under a different host from the one that serves its discovery document, so the standard "discovery issuer must match the URL" check fails. The CLI builds its configuration from the fetched document instead, and a test pins this.

## Requirements

| ID | Requirement |
| --- | --- |
| R1 | `spell login` signs the person in to the Arcane account through the identity tenant, using the browser flow by default, and prints who is signed in (the account's email and `sub`). |
| R2 | `spell login --device-code` uses the device-code flow, for SSH sessions and servers. |
| R3 | `spell logout` deletes everything `spell login` stored, from the keychain and from the opt-in file if one exists, and says what it removed. It succeeds when nothing is stored. |
| R4 | Stored: the refresh token, the account `sub`, the account's email, the environment (production or development) and the token's expiry time. Never stored: access tokens, ID tokens, passwords, anything else. |
| R5 | A second `spell login` while signed in replaces the stored session after the new sign-in succeeds; a failed sign-in leaves the previous session untouched. |
| R4a | The refresh token is stored split across entries as designed in the gate section: chunks of at most 1,000 characters under a generation id, an index entry written last with the chunk count and a SHA-256, old generation deleted afterwards, a failed read treated as signed out. |
| R6 | No keychain: refuse with a message that names the cause and the opt-in flag, and write nothing. |
| R7 | Every command that worked signed out still works signed out, and a broken or locked keychain never changes that. |
| R8 | The flow uses PKCE and a `state` value, validates the returned ID token's issuer, audience, expiry and nonce, and listens for the redirect on `127.0.0.1` only, on a random free port. Invalid-state requests do not consume the callback. After processing the valid query-bearing OAuth callback exactly once, it redirects the browser to a query-free local result route and keeps the listener open until that route is served or a short grace period expires. A stored session remains a successful terminal result even if the browser does not follow the redirect. Result pages use `no-store`, `no-referrer`, `nosniff`, and a restrictive content security policy. The listener closes on result delivery, timeout, failure or interrupt. |
| R9 | The environment is selected by `ARCANE_ENVIRONMENT=dev`; the default is production. The two tenants' identifiers are public configuration, not secrets, and are kept in one module. |
| R10 | No token, code, or `state` value is ever written to a log, an error message or the terminal. |
| R11 | `spell whoami` prints the account's email and `sub`, the environment, and when the session expires; with `--verify` it checks the session against the identity tenant. Signed out, it says so and exits non-zero. |

## Proposed hardening and adoption requirements

Not decided. Each is marked with the release it would land in. The aim is that a team adopting Arcane does not hit these for the first time in production.

| ID | Proposal | Why | Release |
| --- | --- | --- | --- |
| R12 | **Proxy and custom-certificate support.** Honour `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS`. Node's built-in `fetch` ignores proxy variables by default. | Corporate networks are where adoption stalls; a login that cannot cross the proxy looks broken. | First |
| R13 | **WSL, containers and dev containers detect themselves.** When there is no usable browser or keychain, say so and point at `--device-code`. | These are common developer setups with neither. | First |
| R14 | **`spell doctor` checks sign-in health:** keychain reachable, stored session readable, system clock within a few minutes of the tenant (clock skew breaks token validation with a confusing error), and the identity tenant reachable. | One command that explains a failed login saves a support thread. | First |
| R15 | **`spell uninstall` offers to run `spell logout`,** so removing Arcane does not leave a credential in the keychain. | Leftover credentials are how a retired laptop leaks. | First |
| R16 | **Non-interactive use refuses to start a browser flow.** With no terminal attached (CI, a cron job), `spell login` fails with an explanation instead of waiting for a person who is not there. | An unattended job must fail loudly, not hang. | First |
| R17 | **macOS keychain prompts are explained.** The first read of a stored secret can show an operating-system access prompt naming `node`, not Arcane. Document it, and test that a denied prompt behaves as "no keychain" (R6). | A surprise prompt about a credential reads as an attack. | First |
| R18 | **Supply-chain care for the new dependencies:** exact-pin `openid-client` and `@napi-rs/keyring`, keep the lockfile, review their release notes before each bump, and publish the CLI with npm provenance if it does not already. | Auth libraries are a high-value target; a quiet malicious update would see every refresh token. | First |
| R19 | **Automation without a person.** CI and agents need a way to authenticate that is not `spell login` (a service identity with its own narrowly scoped credential, never a person's token). | A person's refresh token in a CI secret is the most common way these credentials leak. Needs its own PRD. | Next |
| R20 | **More than one account on a machine** (a work and a personal account, or two organizations). Proposed: one active session at a time in the first release, named profiles later. | Consultants and contractors hit this on day one. | Later |
| R21 | **Server-side sign-out and token revocation.** `spell logout` deletes local state only; a stolen refresh token stays valid until it expires. Revoking it needs the identity tenant, and the maintainer-facing "sign out everywhere" belongs with the account page. | Local logout is not the same as ending a stolen session. | Next |
| R22 | **What the CLI sends.** Document that `spell login` contacts only the identity tenant (and later the Arcane service API), and sends no telemetry. | Privacy-conscious and regulated teams ask before they adopt. | First (documentation) |

## Out of scope

- Fetching, caching or verifying any token issued by an Arcane service. That is a later release.
- Sign-in from other Arcane apps, which is a later release.
- Social sign-in (Apple, Google), which is identity-tenant configuration, not CLI code.

## Acceptance (first release of sign-in)

| ID | Check | Evidence |
| --- | --- | --- |
| AC1 | The Windows spike result and the storage decision are recorded in this PRD | Done 2026-10-05: 1,280-character limit, 1,468-character real token |
| AC2 | A test account in the development tenant signs in through `spell login` and `spell whoami` shows the same `sub` | Terminal output |
| AC3 | The same on a machine with no browser, through `--device-code` | Terminal output |
| AC4 | `spell logout` leaves nothing behind in the keychain | Keychain listing before and after |
| AC5 | With no keychain, `spell login` refuses and writes nothing; with `--insecure-storage` it works and warns | Terminal output on a headless Linux container |
| AC6 | Tests for R3 to R10 pass on macOS, Windows and Linux in CI | CI run |
| AC7 | The loopback callback redirects to a query-free success or failure URL, rejects a replayed callback, sends the required security headers, and closes after the result is served | HTTP-level integration tests |

## Open questions

1. How the CLI chooses between the production and development tenants when it ships publicly: an environment variable is proposed in R9, but a published CLI that can be pointed at an arbitrary tenant is a different thing from one that can only be pointed at two.
2. R19 (automation without a person) is the largest adoption gap this PRD surfaces. It is out of the first release on purpose, but it should get its own PRD before the next release, because teams will want to use Arcane in CI and agent pipelines.
