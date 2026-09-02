# Contributing to Arcane

Thanks for your interest in improving Arcane! This project is built **with Arcane** and in the open — contributions of all sizes are welcome.

## Ways to contribute

- 🐛 **Report a bug** — open an issue with the Bug report template.
- 💡 **Request a feature or a new spell** — open an issue with the Feature request template.
- 📖 **Improve docs** — typos, clarifications, and examples are great first PRs.
- 🔧 **Send a PR** — fixes, new spells, governance templates, or adapters.

## Development setup

```bash
git clone https://github.com/codemagicianhq/arcane.git
cd arcane
npm ci          # install dependencies (Node.js 18+ required; 20+ recommended)
npm test        # run the suite
npm run build   # produces dist/index.js + dist/assets/
```

Useful scripts:

| Script                           | What it does                                               |
| -------------------------------- | ---------------------------------------------------------- |
| `npm test`                       | Run the Vitest suite                                       |
| `npm run test:coverage`          | Tests with coverage                                        |
| `npm run lint`                   | ESLint                                                     |
| `npm run typecheck`              | `tsc --noEmit`                                             |
| `npm run build`                  | Bundle the CLI and copy assets                             |
| `npm run check:self-host-parity` | Fail when generated dogfood copies have real content drift |
| `npm run fix:self-host-parity`   | Regenerate dogfood copies from canonical assets            |

> Asset source lives in `src/assets/` and is copied to `dist/assets/` at build time. Edit the **source** in `src/assets/`, never `dist/`.

### Generated self-host copies

Files registered by `src/modules/registry.ts` under root `.github/`, `.arcane/`, and `.claude/` are **generated dogfood output**. Their canonical sources live under `src/assets/`.

- Never hand-edit a generated root copy. Edit its `src/assets/` source, then run `npm run fix:self-host-parity`.
- `fix:self-host-parity` is the only supported writer for these root copies.
- CI runs `check:self-host-parity` and fails on missing or substantive content drift.
- Line-ending-only differences are normalized during comparison and do not fail the gate.

### Writing tests

`test/helpers/` provides shared building blocks — use them instead of hand-rolling the same fix twice; `npm run lint` enforces the first two:

- **Fixture cleanup:** `createFixtureDir`/`removeFixtureDir` (`test/helpers/fixture-dir.ts`, re-exported from `test/helpers/git-fixture.ts`). `removeFixtureDir` retries through the transient `EBUSY`/`ENOTEMPTY` window a virus scanner or search indexer can hold a just-closed handle open for — a direct `rm`/`rmSync`/`fs.rm`/`fs.rmSync` call anywhere under `test/` outside `test/helpers/` itself is a lint error.
- **Named test timeouts:** `HEAVY_TEST_TIMEOUT` / `VERY_HEAVY_TEST_TIMEOUT` / `NETWORK_TEST_TIMEOUT` (`test/helpers/timeouts.ts`) for tests with real subprocess, filesystem, or network cost that trips vitest's default 5000ms under full-suite contention. A numeric literal as `it`/`test`'s third argument is a lint error — add a new named constant with its own reason if none of the three fit, never a bare number. Never raise vitest's global `testTimeout`; that masks a genuine hang anywhere else in the suite.
- **Prose assertions:** `normalizeProse`/`expectProseToContain`/`lineContaining`/`blockContaining`/`expectNotNegated` (`test/helpers/prose.ts`) for asserting against hard-wrapped markdown (governance docs, prompts) without breaking every time the source re-wraps a sentence.

## Pull request guidelines

1. **Branch** off `main` (`type/short-description`, e.g. `feat/spell-foo`).
2. **Conventional Commits** for messages: `type(scope): description` (e.g. `feat(cli): add spell foo`).
3. **Keep PRs focused** — one logical change per PR.
4. **Tests + lint must pass** — CI runs `lint`, `typecheck`, `test`, and `build` on every PR.
5. **Update docs** when you change behavior (README, governance templates, or the relevant spell).
6. Fill out the PR template so reviewers have context.

## Authoring spells

New or changed spells follow the **Spell Authoring Standards** rubric (`spell-authoring-standards.md`). In short: a clear invocation contract, no org-specific coupling, a complete workflow, and an explicit output/acceptance spec. Run the org-token lint before submitting.

## License of contributions

By submitting a contribution, you agree that your work is licensed under the project's **MIT License** (inbound = outbound). You retain copyright to your contributions.

## Code of conduct

Participation is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). Be kind.
