---
title: CI/CD Standards
audience: both
last_updated: YYYY-MM-DD
status: active
tags: [cicd, pipelines, devops, prospero, azure-devops]
---

# CI/CD Standards

Pipeline patterns, branch policies, and deployment gates for all your projects. Owned by Prospero (DevOps Engineer).

## Executive Summary

- Every code repository must have a CI pipeline that runs on PR creation and merge to main.
- Branch policies enforce PR requirements: build must pass, reviewer required, work item linked.
- Terraform changes use plan-on-PR / apply-on-merge with manual approval gates.
- Prospero owns pipeline creation and maintenance across all repos.
- ADR-049 (Spell Loop) and ADR-051 (Prospero) provide the decision rationale.

---

## Pipeline Matrix

| Repo | Org | Pipeline | Triggers | Steps | Owner |
|------|-----|----------|----------|-------|-------|
| example-app / .NET backend | {ado-org} | Build + Test + Deploy | PR, merge to main | restore → build → test → deploy staging | Prospero |
| example-app / Mobile | {ado-org} | Build + Test | PR, merge to main | build → unit tests → integration tests → artifact publish | Prospero |
| example-app / Firmware | {ado-org} | Build + Test | PR, merge to main | PlatformIO build → unit tests → OTA artifact publish | Prospero |
| ops-docs / docs | {ado-org} | Lint + Link Check | PR | markdownlint → link validation → frontmatter schema check | Prospero |
| storefront / web | {ado-org} | Build + Deploy | PR, merge to main | build → deploy (platform-dependent) | Prospero |
| legacy-app / App | {ado-org} | Build + Test | PR, merge to main | dotnet restore → build → test | Prospero |

---

## Branch Policies (Azure DevOps)

Applied to all code repositories (not docs-only repos per ADR-048):

| Policy | Setting | Rationale |
|--------|---------|-----------|
| **Require PR** | All branches → main | No direct pushes to main |
| **Minimum reviewers** | 1 (Lince for code, Merlin for architecture) | Quality gate |
| **Build validation** | CI pipeline must pass | No merging broken code |
| **Work item linking** | Required (when ticketing active) | Traceability |
| **Comment resolution** | All comments must be resolved | No ignored feedback |
| **Merge type** | Squash merge or rebase (no merge commits) | Clean linear history |

For docs-only repos (Arcane):
- PR not required (ADR-048 allows local ff-only merge for docs)
- CI lint check runs on push to any branch
- Branch discipline still applies (branch → work → ff-only merge)

---

## Pipeline Templates

### .NET Backend Pipeline

Fail-safe path filter (ARC-022): **exclude** known-inert doc paths rather than **include** a
named code directory — a new code directory added outside `src/**` would silently never trigger
this pipeline under an include filter. The exclude entry is a **filetype** glob, not a directory
glob, and deliberately just one entry: `docs/**`/`journal/**`/`.arcane/governance/**`-style
directory-wide excludes would ALSO exclude any non-Markdown file a consumer happens to place in
those directories (a build script, a manifest, tooling config) — silently violating ARC-022's own
unconditional requirement that scripts, manifests, lockfiles, migrations, containers, and
infrastructure always remain triggering inputs, regardless of which directory they live in. Filetype-scoping to
`**/*.md` closes that gap: only actual Markdown files are excluded, anywhere in the tree; anything
else — including a `.md`-adjacent script — still triggers CI by default.

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
  paths:
    exclude:
      - '**/*.md'

pr:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: UseDotNet@2
    inputs:
      version: '10.x'

  - script: dotnet restore
    displayName: 'Restore packages'

  - script: dotnet build --no-restore --configuration Release
    displayName: 'Build'

  - script: dotnet test --no-build --configuration Release --collect:"XPlat Code Coverage" --results-directory $(Agent.TempDirectory)
    displayName: 'Run tests'

  - task: PublishCodeCoverageResults@2
    inputs:
      summaryFileLocation: '$(Agent.TempDirectory)/**/coverage.cobertura.xml'
      failIfCoverageEmpty: true
```

### Node.js Pipeline

Previously had no path filter at all — fail-safe (never misses a code change) but wasteful (a
pure docs commit still burns a full pipeline run). Fail-safe path filter (ARC-022): the same
filetype-scoped `**/*.md` **exclude** entry as the .NET template above — never a directory-wide
exclude, and never an include list.

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    exclude:
      - '**/*.md'

pr:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: UseNode@1
    inputs:
      version: '20.x'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npm test
    displayName: 'Run tests'

  - script: npm run lint
    displayName: 'Lint'
    condition: succeededOrFailed()
```

### Terraform Pipeline

An **include** filter is correct here, not the ARC-022 anti-pattern — but only if it's a
**filetype** glob, not a directory-prefix one. An earlier version of this template included only
`infrastructure/terraform/**`: a directory-prefix pattern that silently misses any `.tf` file
added *outside* that one named directory (a new `modules/**` root, a renamed infra folder) —
exactly the "new code locations fail open" failure ARC-022 rejects, and exactly what EF-22's own
report flagged for this template specifically, grouped with .NET's `src/**` problem, not treated
as a different category. `**/*.tf`/`**/*.tfvars` has the same closure property `**/*.md` has for
the Markdown-lint template below: Terraform files trigger this pipeline from *anywhere* in the
tree, while a Node.js/`.NET` source change still correctly does not. Widened to also cover this
pipeline's own definition file, so an edit to the pipeline itself is validated rather than
silently unreviewed.

Widened further to cover Terraform's JSON-syntax file variants (`.tf.json`/`.tfvars.json`,
HashiCorp's own first-class alternative syntax to `.tf`/`.tfvars`) and its dependency lock file
(`.terraform.lock.hcl`, one per root module directory). ARC-022 names lockfiles as a non-negotiable
always-trigger category in their own right, independent of the general "Terraform files trigger
this pipeline" argument above — a lock file's own name doesn't end in `.tf`/`.tfvars`, so it would
have silently fallen through the filetype glob above without a named entry of its own.

```yaml
# azure-pipelines.terraform.yml
trigger: none  # Manual only for apply

pr:
  branches:
    include:
      - main
  paths:
    include:
      - '**/*.tf'
      - '**/*.tfvars'
      - '**/*.tf.json'
      - '**/*.tfvars.json'
      - '**/.terraform.lock.hcl'
      - azure-pipelines.terraform.yml

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: |
      terraform init
      terraform validate
    displayName: 'Validate'

  - script: terraform plan -out=tfplan
    displayName: 'Plan'

  - script: checkov -d . --framework terraform
    displayName: 'Security scan (Checkov)'

  # Apply step is manual — requires approval gate
```

### Markdown Lint Pipeline

Also correctly include-scoped, for the same reason as the Terraform pipeline: this pipeline
exists specifically to lint markdown, not to validate code generally, and `**.md` already has the
same anywhere-in-the-tree closure property `**/*.tf` gives the Terraform template above (unlike a
directory-prefix pattern, it was never the gap this fix needed to close). Widened to cover its
own definition file too.

```yaml
# azure-pipelines.markdown.yml
trigger:
  branches:
    include:
      - '**'
  paths:
    include:
      - '**.md'
      - azure-pipelines.markdown.yml

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: UseNode@1
    inputs:
      version: '20.x'

  - script: npx markdownlint-cli2 "**/*.md" "#node_modules"
    displayName: 'Lint markdown'

  - script: npx markdown-link-check --config .markdown-link-check.json **/*.md
    displayName: 'Check links'
    condition: succeededOrFailed()
```

---

## Never Trust Commit Metadata for CI Skipping (ARC-022)

CI skip/run decisions are based **only on changed paths** — never on commit message, author
identity, or branch name. Do not add a *new* mechanism (a custom `docs(...)`-style commit-prefix
convention, a bot rule, a pipeline-level check) that lets a commit opt itself out of validation by
what it *says* rather than what it *changed*.

Commit messages, authorship, and branch names are attacker-controlled metadata — anyone who can
push a commit controls all three. A CI-skip mechanism keyed on any of them is a bypass primitive:
it lets a malicious or careless commit self-certify as "safe to skip" regardless of what it
actually touched. Path-based filtering (above) is the only trust signal this repository
recognizes, because the pipeline itself independently observes the changed paths rather than
trusting a claim embedded in the commit.

**Know the platform default, don't assume this rule alone controls it.** Azure Pipelines honors
`[skip ci]`, `[ci skip]`, `skip-checks: true`, `[skip azurepipelines]`, `[skip azpipelines]`,
`[skip azp]`, and `***NO_CI***` in a pushed commit message **by default**, on `trigger:`-driven
runs — this is platform behavior, not something a consumer opts into, and this governance rule
cannot disable it from the YAML alone. The required-before-merge gate this repo's own Branch
Policies table relies on (**build validation on the PR's merge commit**) is documented to run
*regardless* of `[skip ci]` and its variants, so the merge gate itself stays sound. What is **not**
protected: any other trigger-based run this repo depends on for signal outside that one gate —
direct pushes to a non-PR branch, a secondary environment build, a dashboard keyed off pipeline
status. Treat those as a residual, platform-level exposure this document can flag but not close;
if a trigger-based run must be tamper-resistant, that requires an organization-level policy
outside this repo's own YAML, not a governance sentence.

## Branch-Policy Path-Filter Alignment (ARC-022)

A YAML pipeline's own `trigger`/`pr` path filter and an Azure DevOps branch policy's **build
validation path filter** are two independent mechanisms, and only one of them controls whether a
passing build is actually *required* before a PR can merge. If the branch policy's path filter is
narrower than the pipeline's own trigger scope, a change that falls outside the policy's filter
can merge with **no build check required at all** — even though the pipeline itself is correctly
scoped and would have run and caught a problem, because nothing forced it to be a merge
requirement for that specific change.

**Concrete failure mode:** the .NET pipeline above triggers on everything except docs (exclude
filter, fail-safe). If the repo's branch policy still requires the build check only for changes
under `paths: src/**` (an older include-style policy filter, or one configured before this repo
adopted exclude-based YAML triggers), a change to a new top-level code directory outside `src/`
triggers the pipeline (YAML is fail-safe) but does **not** require it to pass before merge (branch
policy is not) — the build can run, fail, and be ignored, or the PR can merge before it finishes.
Whenever a pipeline's YAML trigger scope changes, the branch policy's own path filter (if it has
one) must be reviewed and updated to match or be a strict superset — never left narrower.

---

## Deployment Gates

| Environment | Gate | Who Approves |
|-------------|------|-------------|
| **Staging** | CI passes + PR approved | Automatic on merge |
| **Production** | Staging verified + manual approval | Human (operator) |
| **Terraform apply** | Plan reviewed + Checkov clean | Human (operator) |

---

## Prospero's Responsibilities

1. **Create and maintain all CI/CD pipelines** across Azure DevOps organizations
2. **Configure branch policies** per repo risk level
3. **Monitor pipeline health** — alert on persistent failures
4. **Manage Terraform state** — ensure remote state backend is configured
5. **Set up Azure cost alerts** — per resource group, per business
6. **Security scanning** — Checkov for Terraform, dependency audits for code repos
7. **Deployment automation** — Azure Functions, App Service, container deployments
8. **Documentation** — keep this file and pipeline configs in sync

---

## Implementation Priority

1. WidgetApp .NET backend pipeline (highest business priority)
2. ops docs lint pipeline (catches documentation drift)
3. WidgetApp mobile pipeline (when mobile development begins)
4. WidgetApp firmware pipeline (when firmware work resumes)
5. Terraform pipeline (when new Azure resources are provisioned)
6. AcmeStore pipeline (when platform is selected)


## Related

- [[DECISIONS]]
- [[governance/development-methodology|Development Methodology]]
- [[governance/testing-standards|Testing Standards]]
