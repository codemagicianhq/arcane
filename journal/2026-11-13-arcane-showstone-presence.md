---
date: 2026-11-13
topic: Arcane source presence and Showstone verification
---

# Session: Arcane source presence and Showstone verification

### Prompt Context

The operator asked for a fresh Arcane scan, the installed CLI version and website pin, then asked to work through the issues. After the 1.23.2 release, they asked whether Arcane source sessions could appear in DMC Showstone, supplied a screenshot of the resulting display, approved the two DMC fixes, merged the pull requests, and asked to close the session.

### What Got Done

1. Arcane [PR #476](https://github.com/codemagicianhq/arcane/pull/476) merged at `2221277`. It released 1.23.2, gave `spell state --json` a specific self-hosted source diagnostic, and made a valid internal source marker eligible for presence reporting without accepting a corrupt root manifest. The [Publish run](https://github.com/codemagicianhq/arcane/actions/runs/43201031965) succeeded and [v1.23.2](https://github.com/codemagicianhq/arcane/releases/tag/v1.23.2) was published. A prior check found npm latest and the installed CLI both at 1.23.2.
2. DMC PR #1390 in the client repository merged the unassigned live-session list. The operator's screenshot then revealed a minimap overlap and an unclear stale status. DMC PR #1395 in the client repository merged the overlay and status fixes and pinned CI to Ubuntu 24.04 after Chromium installation failed on Ubuntu 26.04. Validation build 1322 passed; bugs 220 and 221 were closed after the merge.
3. A live check on Showstone at `127.0.0.1:4000/world` showed this Arcane source session on `main` as working. At 1280×720, the minimap ended at y=275 and the card began at y=287, leaving 12 px of space. Ending the presence report removed the card. The operator's screenshot was used to diagnose the overlap; it was not copied into this public repository.
4. The Arcane website's pin PR #1394 in the website repository completed for v1.23.2. This close marks the two verified items in [[TODO]] done and refreshes the next-session handoff.

### Lessons Learned

#### Check Showstone overlays at the actual viewport

The first unassigned-session view rendered the Arcane card, but the minimap covered part of it. The screenshot exposed a layout problem that component tests had missed. Check the combined overlays in a browser at the intended viewport before calling the view ready.

#### Check presence from the user's runtime

Arcane source presence depends on a running loopback service and the installed CLI. A sandbox or stale report can make a working integration appear unavailable. Verify the service and the live card in the runtime where the operator uses Showstone.

#### Pin browser CI to a supported image

The DMC validation job selected Ubuntu 26.04 through `ubuntu-latest`; Playwright 1.58.2 could not install Chromium there. Pin the runner image to an OS supported by the locked browser tooling, and verify the hosted browser job.

### Open Items Carried Forward

- This journal, [[TODO]] update, and handoff are planned for a docs-only close pull request. The operator must merge that PR after its checks pass.

### Authority used

| Action / commit range or PR | Branch / exact head SHA | Authority used | Evidence recorded before action |
| --- | --- | --- | --- |
| Arcane release commit `5706f6c` | `sessions/2026-11-11-selfhosted-state-export` / `5706f6cfbd8b1c8f51c43c7c45bde2d5c516e673` | fingerprint approval | `1acec5820776f295254fe01d444f3d7540191d18a25f7596719f4bca9d501955` |
| Arcane state diagnostic and session docs `2170ec0..bab52a3` | `sessions/2026-11-11-selfhosted-state-export` / `bab52a3f718b03560704f648198944307b54b403` | none confirmed | The operator said “go ahead and commit”; an exact staged-diff approval is not confirmed in the available record. Review this authority deviation. |
| Arcane presence commit `1242eb4` | `sessions/2026-11-11-selfhosted-state-export` / `1242eb4` | fingerprint approval | `5d525e1220947daae3ca85954866e5557091276aa240aeb9364c29cc6532b625` |
| Arcane PR #476 completion | `sessions/2026-11-11-selfhosted-state-export` / `1242eb427a2b0489523a7641ba171244828524ee` | operator merge | Operator said merged; provider confirms merge at `222127728ab3b2c1d9a4a7dc290bbbb1322dab5e`. |
| DMC unassigned-session commit `4010b8e` | DMC session branch / `4010b8e14bd0946e8f70202af87e0fc76f74c06d` | fingerprint approval | `bcd448d021b0cf323a50875b9576184f223c38ddb9bda8bd66ce6b21d23c2bd9` |
| DMC overlay commit `e48e0b4` | DMC session branch / `e48e0b4e419bf29dcd7400463e07f9a975c4d1ae` | fingerprint approval | `9c49de2e81b71f609f29511b08ecf66935a677192ef8c75767a9e4de2c3bbb3d` |
| DMC CI commit `43faf53` | DMC session branch / `43faf5393675a8f8ae999fd267f1ed9b622529d0` | fingerprint approval | `735c606f0a3c2bf7f0ea6163a47b0df1a91e7cd85e574b086df0227dc71fc102` |
| DMC PRs #1390 and #1395 completion | DMC PR heads `4010b8e14bd0946e8f70202af87e0fc76f74c06d` and `43faf5393675a8f8ae999fd267f1ed9b622529d0` | operator merge | Operator said merged; Azure DevOps PR status and build 1322 were checked after merge. |
| This docs-only close commit and PR | `sessions/2026-11-13-close-arcane-showstone-presence` / planned | planned; exact approval required | Commit fingerprint and resulting SHA to be recorded in the final closure report. |
