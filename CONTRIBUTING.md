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

| Script | What it does |
| --- | --- |
| `npm test` | Run the Vitest suite |
| `npm run test:coverage` | Tests with coverage |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Bundle the CLI and copy assets |

> Asset source lives in `src/assets/` and is copied to `dist/assets/` at build time. Edit the **source** in `src/assets/`, never `dist/`.

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
