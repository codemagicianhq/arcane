---
title: CI/CD Standards
audience: both
last_updated: YYYY-MM-DD
status: active
tags: [cicd, pipelines, devops, prospero, azure-devops]
---

# CI/CD Standards

Pipeline patterns, branch policies, and deployment gates for all your projects.

**Structure (ARC-038 decision 2):** a vendor-neutral core (principles that apply regardless of
which CI/CD platform a repository uses) plus a provider-specific profile — today, Azure DevOps,
the only platform this document details in full. This reuses the same shape
[[development-methodology|development-methodology.md]] already uses successfully for tracking
providers (Process-Template-Aware ADO Hierarchy Rules alongside GitHub Issues Conventions), not a
new architecture. A future GitHub-Actions- or GitLab-CI-specific profile can be added the same way,
without touching the core.

---

## Core Principles (vendor-neutral)

Every code repository must have a CI pipeline that runs on PR creation and merge to main.
**Enforcement: explicitly advisory prose (ARC-023) — prescriptive guidance; Arcane's own tooling
does not enumerate an organization's repositories to verify each one has a CI pipeline.**

### Branch Policy Principles

These apply to any platform's branch-protection mechanism (GitHub branch rulesets, Azure DevOps
branch policies, GitLab merge-request approval rules, ...) — the Azure DevOps Profile below shows
one concrete platform's implementation of the same table.

| Policy | Setting | Rationale |
|--------|---------|-----------|
| **Require PR** | All branches → main | No direct pushes to main. |
| **Minimum reviewers** | At least 1 | Quality gate. |
| **Build validation** | CI pipeline must pass | No merging broken code. |
| **Work item / issue linking** | Required (when ticketing is active) | Traceability. |
| **Comment resolution** | All comments must be resolved | No ignored feedback. |
| **Merge type** | Merge (no fast-forward) or Rebase and fast-forward — Squash disallowed | Preserves per-commit attribution trailers (ARC-009 §7); see [[git-conventions#Azure DevOps PR Merge Type]]. Enforcement: verified external platform policy (ARC-023) — `spell doctor`'s `checkPlatformBranchPolicy` (src/commands/doctor.ts, backed by src/modules/platform-policy.ts's evaluateGitHubMergePolicy/evaluateAdoMergePolicy) queries live GitHub Rulesets or Azure DevOps branch policy and verifies the effective merge methods match this ladder — a local, on-demand CLI check the operator runs, not a check wired into CI itself. |

**Enforcement (every row above except Merge type): explicitly advisory prose (ARC-023)** —
prescriptive for whatever platform a consumer repository uses; no Arcane check verifies these
policies are actually configured, on any platform.

For docs-only repos: a PR is not strictly required (a project may allow local ff-only merges for
pure documentation, per its own governance); a CI lint check can still run on push to any branch;
branch discipline (branch → work → ff-only merge) still applies regardless.

### CI-Skip Semantics: Never Trust Commit Metadata (ARC-022)

CI skip/run decisions are based **only on changed paths** — never on commit message, author
identity, or branch name. Do not add a *new* mechanism (a custom `docs(...)`-style commit-prefix
convention, a bot rule, a pipeline-level check) that lets a commit opt itself out of validation by
what it *says* rather than what it *changed*. **Enforcement: explicitly advisory prose (ARC-023) —
prescriptive guidance for any consumer CI platform; this repo's own `.github/workflows/ci.yml` runs
unconditionally on every push/PR to `main` with no path filter at all, so it neither implements nor
is bound by this pattern, and no Arcane check inspects a downstream repo's CI configuration for
compliance.**

Commit messages, authorship, and branch names are attacker-controlled metadata — anyone who can
push a commit controls all three. A CI-skip mechanism keyed on any of them is a bypass primitive:
it lets a malicious or careless commit self-certify as "safe to skip" regardless of what it
actually touched. Path-based filtering is the only trust signal this document recognizes, because
the pipeline itself independently observes the changed paths rather than trusting a claim embedded
in the commit.

**Know your platform's default skip-comment behavior — don't assume this rule alone controls it.
Enforcement: explicitly advisory prose (ARC-023) — this paragraph discloses a residual
platform-level gap; it is not a mechanism Arcane enforces.** Most major CI platforms honor some
form of skip-comment convention in a pushed commit message by default (see the Azure DevOps
Profile below for the exact syntax that platform recognizes) — this is platform behavior, not
something a consumer opts into, and this governance rule cannot disable it from pipeline
configuration alone. The required-before-merge gate a repo's own branch policy relies on should be
verified to run *regardless* of any such skip-comment convention, so the merge gate itself stays
sound. What is generally **not** protected: any other trigger-based run a repo depends on for
signal outside that one merge gate — direct pushes to a non-PR branch, a secondary environment
build, a dashboard keyed off pipeline status. Treat those as a residual, platform-level exposure
this document can flag but not close; if a trigger-based run must be tamper-resistant, that
requires an organization-level policy outside any one repo's own pipeline configuration, not a
governance sentence.

### Branch-Policy Path-Filter Alignment (ARC-022)

A pipeline's own trigger path filter and a branch-protection rule's **required-check path filter**
(where the platform supports scoping a required check to specific paths) are two independent
mechanisms, and only one of them controls whether a passing build is actually *required* before a
PR can merge. If the branch-protection path filter is narrower than the pipeline's own trigger
scope, a change that falls outside the protection filter's scope can merge with
**no build check required at all** — even though the pipeline itself is correctly scoped and would
have run and caught a problem, because nothing forced it to be a merge requirement for that
specific change.

Whenever a pipeline's own trigger scope changes, any path-scoped branch-protection requirement (if
the platform has one) must be reviewed and updated to match or be a strict superset — never left narrower.
**Enforcement: explicitly advisory prose (ARC-023) — prescriptive for any consumer
repository with path-scoped branch protection; Arcane has no visibility into a downstream repo's
branch-protection path-filter configuration and cannot verify the two stay aligned.** See the Azure
DevOps Profile below for a concrete failure mode observed on that platform.

### Deployment Gate Principles

| Environment | Gate | Who Approves |
|-------------|------|-------------|
| **Staging** | CI passes + PR approved | Automatic on merge. |
| **Production** | Staging verified + manual approval | Human (operator). |
| **Infrastructure apply** (Terraform or equivalent) | Plan reviewed + security scan clean | Human (operator). |

**Enforcement: explicitly advisory prose (ARC-023)** — describes an intended gating shape for any
consumer pipeline; Arcane does not verify a downstream repo's environment or approval configuration
on any platform.

---

## Azure DevOps Profile

Everything below is specific to Azure DevOps — the only platform this document currently details
in full, applying the core principles above through that platform's actual mechanisms. Owned by
Prospero (DevOps Engineer) where a roster assigns that role.

### Pipeline Matrix

| Repo | Org | Pipeline | Triggers | Steps | Owner |
|------|-----|----------|----------|-------|-------|
| example-app / .NET backend | {ado-org} | Build + Test + Deploy | PR, merge to main | restore → build → test → deploy staging | Prospero |
| example-app / Mobile | {ado-org} | Build + Test | PR, merge to main | build → unit tests → integration tests → artifact publish | Prospero |
| example-app / Firmware | {ado-org} | Build + Test | PR, merge to main | PlatformIO build → unit tests → OTA artifact publish | Prospero |
| ops-docs / docs | {ado-org} | Lint + Link Check | PR | markdownlint → link validation → frontmatter schema check | Prospero |
| storefront / web | {ado-org} | Build + Deploy | PR, merge to main | build → deploy (platform-dependent) | Prospero |
| legacy-app / App | {ado-org} | Build + Test | PR, merge to main | dotnet restore → build → test | Prospero |

### Branch Policies (Azure DevOps mechanics)

Applies the Core Principles' branch-policy table above through Azure DevOps's own Branch Policies
screen (Project Settings → Repositories → Branch Policies), applied to all code repositories (not
docs-only repos per ADR-048): "Require PR" is Azure DevOps's own require-a-minimum-number-of-
reviewers policy; "Work item linking" maps to Azure Boards work items; "Build validation" is Azure
DevOps's own named Build Validation policy type. **Enforcement: explicitly advisory prose
(ARC-023) — prescriptive for consumer Azure DevOps repos specifically; no Arcane check verifies any
of these policies are configured there** (Merge type is the one exception — see the Core table's
own enforcement note, which already covers Azure DevOps).

For docs-only repos (Arcane itself, when hosted on Azure DevOps):
- PR not required (ADR-048 allows local ff-only merge for docs)
- CI lint check runs on push to any branch
- Branch discipline still applies (branch → work → ff-only merge)

### Pipeline Templates

#### .NET Backend Pipeline

Fail-safe path filter (ARC-022): **exclude** known-inert doc paths rather than **include** a
named code directory — a new code directory added outside `src/**` would silently never trigger
this pipeline under an include filter. The exclude entry is a **filetype** glob, not a directory
glob, and deliberately just one entry: `docs/**`/`journal/**`/`.arcane/governance/**`-style
directory-wide excludes would ALSO exclude any non-Markdown file a consumer happens to place in
those directories (a build script, a manifest, tooling config) — silently violating ARC-022's own
unconditional requirement that scripts, manifests, lockfiles, migrations, containers, and
infrastructure always remain triggering inputs, regardless of which directory they live in. **Enforcement: explicitly advisory prose (ARC-023) — prescriptive for the Azure DevOps template this repo ships to consumers; Arcane has no shipped `azure-pipelines.yml` file of its own to check parity against, and cannot verify a downstream repo kept the filter filetype-scoped.** Filetype-scoping to
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

#### Node.js Pipeline

Previously had no path filter at all — fail-safe (never misses a code change) but wasteful (a
pure docs commit still burns a full pipeline run). Fail-safe path filter (ARC-022): the same
filetype-scoped `**/*.md` **exclude** entry as the .NET template above — never a directory-wide
exclude, and never an include list. **Enforcement: explicitly advisory prose (ARC-023) — prescriptive for the Azure DevOps template this repo ships to consumers; Arcane has no shipped `azure-pipelines.yml` file of its own to check parity against, and cannot verify a downstream repo kept this filter filetype-scoped.**

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

#### Terraform Pipeline

An **include** filter is correct here, not the ARC-022 anti-pattern — but only if it's a
**filetype** glob, not a directory-prefix one. **Enforcement: explicitly advisory prose (ARC-023) — prescriptive for the Azure DevOps template this repo ships to consumers; Arcane has no shipped `azure-pipelines.terraform.yml` file of its own to check parity against, and cannot verify a downstream repo kept the include filter filetype-scoped rather than directory-prefixed.** An earlier version of this template included only
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

#### Markdown Lint Pipeline

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

### Azure Pipelines' Skip-CI Syntax (the Core section's "know your platform's default")

Azure Pipelines honors `[skip ci]`, `[ci skip]`, `skip-checks: true`, `[skip azurepipelines]`,
`[skip azpipelines]`, `[skip azp]`, and `***NO_CI***` in a pushed commit message **by default**, on
`trigger:`-driven runs. The required-before-merge gate this document's own Branch Policies section
relies on (**build validation on the PR's merge commit**) is documented to run *regardless* of
`[skip ci]` and its variants, so the merge gate itself stays sound. What is **not** protected: any
other trigger-based run a repo depends on for signal outside that one gate — direct pushes to a
non-PR branch, a secondary environment build, a dashboard keyed off pipeline status.

### Branch-Policy Path-Filter Alignment: a concrete Azure DevOps failure mode

The .NET pipeline above triggers on everything except docs (exclude filter, fail-safe). If the
repo's branch policy still requires the build check only for changes under `paths: src/**` (an
older include-style policy filter, or one configured before this repo adopted exclude-based YAML
triggers), a change to a new top-level code directory outside `src/` triggers the pipeline (YAML is
fail-safe) but does **not** require it to pass before merge (branch policy is not) — the build can
run, fail, and be ignored, or the PR can merge before it finishes.

### Prospero's Responsibilities

1. **Create and maintain all CI/CD pipelines** across Azure DevOps organizations
2. **Configure branch policies** per repo risk level
3. **Monitor pipeline health** — alert on persistent failures
4. **Manage Terraform state** — ensure remote state backend is configured
5. **Set up Azure cost alerts** — per resource group, per business
6. **Security scanning** — Checkov for Terraform, dependency audits for code repos
7. **Deployment automation** — Azure Functions, App Service, container deployments
8. **Documentation** — keep this file and pipeline configs in sync

### Implementation Priority

1. WidgetApp .NET backend pipeline (highest business priority)
2. ops docs lint pipeline (catches documentation drift)
3. WidgetApp mobile pipeline (when mobile development begins)
4. WidgetApp firmware pipeline (when firmware work resumes)
5. Terraform pipeline (when new Azure resources are provisioned)
6. AcmeStore pipeline (when platform is selected)

---

## Related

- [[DECISIONS]]
- [[governance/development-methodology|Development Methodology]]
- [[governance/testing-standards|Testing Standards]]
