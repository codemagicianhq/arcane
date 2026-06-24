<div align="center">

<h1 align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/arcane-lockup.svg">
  <img src="./assets/brand/arcane-lockup-light.svg" width="300" alt="Arcane">
</picture>
</h1>

**Cast spells to ship software** — the methodology layer for AI-assisted development.

AI agents can write your code; Arcane gives them the discipline to *plan it, govern it, test it, review it, and **ship** it.*

[![npm version](https://img.shields.io/npm/v/arcane-cli?style=flat-square&color=6f9fd8&label=npm)](https://www.npmjs.com/package/arcane-cli)
[![npm downloads](https://img.shields.io/npm/dm/arcane-cli?style=flat-square&color=6f9fd8)](https://www.npmjs.com/package/arcane-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/codemagicianhq/arcane/ci.yml?style=flat-square&branch=main&label=CI)](https://github.com/codemagicianhq/arcane/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-6f9fd8?style=flat-square)](./LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-6f9fd8?style=flat-square)](./CONTRIBUTING.md)
[![GitHub stars](https://img.shields.io/github/stars/codemagicianhq/arcane?style=flat-square&color=6f9fd8)](https://github.com/codemagicianhq/arcane/stargazers)

```bash
npm install -g arcane-cli   #  then:  spell init
```

</div>

---

<div align="center">

**🔁 opinionated lifecycle** &nbsp;·&nbsp; **📜 33 spells** &nbsp;·&nbsp; **🤖 12 agents** &nbsp;·&nbsp; **⚖️ 19 governance standards** &nbsp;·&nbsp; **📝 markdown-native** &nbsp;·&nbsp; **🔌 any AI client / tracker**

</div>

---

<div align="center">

<img src="./assets/arcane-cli.svg" alt="The Arcane CLI welcome — the lockup, tagline, and live repo status" width="800">

</div>

---

## The problem

AI coding agents are great at *generating code*. They're terrible at *shipping software*.

Ask one to "build a feature" and you get a pile of plausible code with no plan, no tests you trust, no review, no governance, and no repeatable path from idea to a merged, deployed change. The gap isn't code generation — it's **methodology**.

**Arcane is that missing layer.** It's a structured, opinionated lifecycle — the **Spell Loop** — plus the governance, agent roles, and templates that make AI-driven development reproducible instead of chaotic. You stay in the driver's seat and cast `spell`s; the framework keeps the work on rails.

---

## The Spell Loop

One opinionated lifecycle. Each phase is a spell you cast — and the build→test→review core loops until the work actually passes.

```mermaid
flowchart LR
    P([plan]):::plan --> AR([architect]):::plan
    AR --> IM([implement]):::build
    IM --> TE([test]):::test
    TE --> RV([review]):::review
    RV -->|issues| IM
    RV -->|clean| SH([ship]):::ship
    SH --> D((🚀)):::ship

    classDef plan fill:#7c3aed,color:#fff,stroke:none
    classDef build fill:#e67e22,color:#fff,stroke:none
    classDef test fill:#27ae60,color:#fff,stroke:none
    classDef review fill:#06b6d4,color:#fff,stroke:none
    classDef ship fill:#2c3e50,color:#fff,stroke:none
```

```
spell plan → spell architect → [ spell implement → spell test → spell review ]* → spell ship
```

Plus session and operational spells — `spell open-session`, `spell close-session`, `spell commit-work`, `spell bug`, and more.

---

## What's in the box

Arcane isn't a prompt snippet — it's a full framework. Everything installs into your repo as plain, reviewable markdown.

| Layer | What you get |
| --- | --- |
| 📜 **Spells** | **33** prompt-driven workflows spanning the entire lifecycle — planning, architecture, implementation, testing, review, shipping, session management, and ops. |
| ⚖️ **Governance** | **19** battle-tested standards as drop-in templates: git conventions, testing standards, CI/CD, threat model, ADR format, naming, security hardening, and more. |
| 🤖 **Agents** | **12** ready-made agent personas with roles, clusters, and a gamified autonomy model — assign work and power levels per repo. |
| 🛠️ **CLI** | `spell init / add / update / status / uninstall` — install by profile or à la carte, and keep everything in sync as new versions ship. |

<details>
<summary><b>📜 The full spell catalogue (33)</b></summary>

**Core Spell Loop** — `plan` · `elevate` · `scope` · `architect` · `implement` · `test` · `review` · `ship`
**Session** — `open-session` · `close-session` · `status`
**Operational & Git** — `commit-work` · `todo` · `check-drift` · `bug` · `create-pull-request` · `address-review` · `bump`
**Specialized** — `full-cycle` · `review-batch` · `security-review` · `dotnet-expert` · `product-review` · `suggest-feature`
**Knowledge & Docs** — `document` · `explain-concept` · `feedback` · `save-idea`
**Business & Admin** — `bootstrap-business` · `brainstorm` · `generate-bot-icons` · `present-arcane` · `arcane-version`

</details>

<details>
<summary><b>⚖️ The governance standards (19)</b></summary>

`universal-agent-rules` · `development-methodology` · `git-conventions` · `testing-standards` · `cicd-standards` · `decision-documentation-standard` · `naming-conventions` · `agent-policies` · `agent-approved-paths` · `agent-work-queue-model` · `threat-model` · `hardening-checklist` · `authentication-strategy` · `product-excellence-standards` · `rca-process-standard` · `poc-management-pattern` · `spell-authoring-standards` · `new-business-setup` · `portable-bootstrap`

</details>

---

## Meet the agents

Twelve ready-made agents ship with Arcane — each is a **role** with a **code name**. Within Arcane the two are aliases: summon `Gandalf` or summon `the architect` and you get the same agent. Run `spell agents init` and choose how they're named — the **Code Magician** roster below, plain **generic** role labels, **random** names, or your own **custom** universe.

<div align="center">
<table>
<tr>
<td align="center" width="25%"><img src="assets/agents/primus.png" width="112" alt="Primus"><br><b>Primus</b><br><sub>the Orchestrator</sub><br><sub>Product Operations Manager</sub></td>
<td align="center" width="25%"><img src="assets/agents/gandalf.png" width="112" alt="Gandalf"><br><b>Gandalf</b><br><sub>the Architect</sub><br><sub>CTO · Architecture Lead</sub></td>
<td align="center" width="25%"><img src="assets/agents/vision.png" width="112" alt="Vision"><br><b>Vision</b><br><sub>the Researcher</sub><br><sub>Research &amp; Backlog Analyst</sub></td>
<td align="center" width="25%"><img src="assets/agents/heimdall.png" width="112" alt="Heimdall"><br><b>Heimdall</b><br><sub>the Gatekeeper</sub><br><sub>Security Operations</sub></td>
</tr>
<tr>
<td align="center"><img src="assets/agents/snape.png" width="112" alt="Snape"><br><b>Snape</b><br><sub>the QA Lead</sub><br><sub>Quality &amp; Test Gates</sub></td>
<td align="center"><img src="assets/agents/thor.png" width="112" alt="Thor"><br><b>Thor</b><br><sub>the Developer</sub><br><sub>Full-Stack Developer</sub></td>
<td align="center"><img src="assets/agents/wasp.png" width="112" alt="Wasp"><br><b>Wasp</b><br><sub>the Frontend Dev</sub><br><sub>Frontend Developer</sub></td>
<td align="center"><img src="assets/agents/flash.png" width="112" alt="Flash"><br><b>Flash</b><br><sub>the Mobile Dev</sub><br><sub>Mobile Developer</sub></td>
</tr>
<tr>
<td align="center"><img src="assets/agents/scotty.png" width="112" alt="Scotty"><br><b>Scotty</b><br><sub>the DevOps</sub><br><sub>CI/CD &amp; Infrastructure</sub></td>
<td align="center"><img src="assets/agents/wanda.png" width="112" alt="Wanda"><br><b>Wanda</b><br><sub>the Marketer</sub><br><sub>Marketing Strategist</sub></td>
<td align="center"><img src="assets/agents/trinity.png" width="112" alt="Trinity"><br><b>Trinity</b><br><sub>the Comms Lead</sub><br><sub>Operations Communications</sub></td>
<td align="center"><img src="assets/agents/gideon.png" width="112" alt="Gideon"><br><b>Gideon</b><br><sub>the Collaborator</sub><br><sub>External Collaboration</sub></td>
</tr>
</table>
</div>

Use the roster as-is, rename them to your own universe, or define new roles entirely — it's just a starting point. <sub>Agent portraits © Code Magician LLC.</sub>

---

## Quick start

```bash
# Install the CLI (binary is `spell`; `arcane` works too)
npm install -g arcane-cli

# Bootstrap the current repo with a governance profile
spell init

# Plan a feature → design it → build it
spell plan       # generates a PRD
spell architect  # produces architecture + stories
spell implement  # writes code, per story

# Keep your installed governance current
spell status     # what's installed + available updates
spell update     # pull the latest
```

> **`spell` or `arcane`?** Both commands invoke the same CLI. `spell` ties to the Spell Loop; `arcane` is there for when you reach for the brand name. Use whichever you like.

Requires **Node.js 18+**.

### Profiles

Install everything, or just the slice you want:

| Profile | Contents |
| --- | --- |
| `lite` | Spell library + core git & testing conventions — fast start |
| `methodology` | Spells + the full methodology (no security/infra docs) |
| `governance-only` | All standards docs — no spells or agents |
| `full` | Everything — spells, governance, templates, agent definitions |

```bash
spell init --profile full
spell add agent-policies   # or install any component à la carte
```

---

## Philosophy

- **Opinionated about *how*, pluggable about *which*.** Arcane is strict about the lifecycle, governance, and commit discipline — and adapter-friendly about your tools (any AI client, any tracker, GitHub or Azure DevOps).
- **Markdown is the source of truth.** Everything is plain, reviewable, version-controlled text. No lock-in, no opaque state.
- **Reproducible by design.** Spinning up a new project should mean running `spell init`, not redoing months of process work.

---

## Built in public

Arcane is built *with Arcane*. From this repo's first commit forward, development happens in the open — planned, implemented, reviewed, and shipped using its own spells, with each session logged. Want to see how the methodology actually works? Watch the commit history.

---

## Contributing

PRs welcome. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for dev setup and conventions, and **[SECURITY.md](./SECURITY.md)** to report a vulnerability. By contributing you agree your contributions are licensed under MIT.

```bash
npm ci             # install dependencies
npm test           # run the test suite
npm run build      # produces dist/index.js + dist/assets/
npm run lint       # lint
npm run typecheck  # type-check
```

---

## License

**MIT** — see [LICENSE](./LICENSE). Copyright © 2026 Code Magician LLC.

> The *Arcane* name, logo, and agent art are brand assets of Code Magician LLC; the source code is MIT-licensed.

<div align="center">
<sub>Built by <a href="https://github.com/codemagicianhq">Code Magician</a> · <code>spell</code> your way to shipped.</sub>
</div>
