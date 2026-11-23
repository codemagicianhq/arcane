---
title: CI/CD Standards
tagline: Build, verify, and release gates
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
prescriptive for any platform. For the opt-in Azure path-filter workflow below,
`spell ci-path-filters check` also verifies the named build and guard policies; it does not
establish the other rows or independently prove the guard's code is protected.

For docs-only repos: a PR is not strictly required (a project may allow local ff-only merges for
pure documentation, per its own governance); a CI lint check can still run on push to any branch;
branch discipline (branch → work → ff-only merge) still applies regardless.

### CI-Skip Semantics: Never Trust Commit Metadata (ARC-022)

CI skip/run decisions are based **only on changed paths** — never on commit message, author
identity, or branch name. Do not add a *new* mechanism (a custom `docs(...)`-style commit-prefix
convention, a bot rule, a pipeline-level check) that lets a commit opt itself out of validation by
what it *says* rather than what it *changed*. **Enforcement: explicitly advisory prose (ARC-023) —
prescriptive guidance for any consumer CI platform; this repo's own `.github/workflows/ci.yml` runs
unconditionally on every push/PR to `main` with no path filter at all. The opt-in Azure path-filter
check verifies named policies and paths, but does not detect metadata-based skip mechanisms.**

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
**Enforcement: verified external platform policy (ARC-023) when a consumer explicitly configures
the Azure Repos guard below and runs `spell ci-path-filters check` with live policy access; otherwise
explicitly advisory prose.** The check verifies the named policies and their filters; the operator
must independently protect the guard's definition and code. See the Azure DevOps Profile below.

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
(ARC-023) — prescriptive for consumer Azure DevOps repos. Merge-type checks and the opt-in check
of named build-validation policies are described above; the other policies remain advisory.**

For docs-only repos (Arcane itself, when hosted on Azure DevOps):
- PR not required (ADR-048 allows local ff-only merge for docs)
- CI lint check runs on push to any branch
- Branch discipline still applies (branch → work → ff-only merge)

### Job conditions and untrusted output

- When a job is meant to run after a specific job succeeds, declare that job in
  `dependsOn` and check its result explicitly, for example
  `condition: and(not(canceled()), in(dependencies.build.result, 'Succeeded', 'SucceededWithIssues'))`.
  The default `succeeded()` also evaluates transitive dependencies. Include every
  dependency whose outcome should govern the job and handle cancellation explicitly.
  See [Azure Pipelines conditions](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/conditions).
- Keep raw output from untrusted tools, containers, and code off agent stdout.
  Capture both stdout and stderr to a file and log only a trusted reference to the
  file, or sanitize the complete stream before logging. Strip or neutralize
  `##vso[` and `##[` wherever they occur, including after a carriage return
  (`\r`). A line-start check is insufficient. Preserve the child process exit
  code when redirecting or filtering output. See
  [Azure Pipelines logging commands](https://learn.microsoft.com/en-us/azure/devops/pipelines/scripts/logging-commands).

### Pipeline Templates

#### .NET Backend Pipeline

This template runs for every path. A Markdown file can be a test or build input, so a blanket
`**/*.md` exclusion is unsafe. Directory-wide exclusions can also hide code and configuration.
Only add exclusions after verifying their inputs and matching branch policy; otherwise new code
or a change consumed by a test may merge without validation. **Enforcement: explicitly advisory
prose (ARC-023)** — the template itself does not establish a consumer's live configuration; the
opt-in Azure check below verifies the named pipeline and policies when it has access.

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
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

Like the .NET template, this runs for every path until exclusions have been verified for the
repository and aligned with its branch policy. A Markdown extension alone does not establish that
a file is inert. **Enforcement: explicitly advisory prose (ARC-023)** — the template itself does not
establish a consumer's live configuration; the opt-in Azure check below verifies the named pipeline
and policies when it has access.

```yaml
trigger:
  branches:
    include:
      - main
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

The .NET pipeline above triggers on every path. If the
repo's branch policy still requires the build check only for changes under `paths: src/**` (an
older include-style policy filter, or one configured before this repo adopted exclude-based YAML
triggers), a change to a new top-level code directory outside `src/` triggers the pipeline (YAML is
fail-safe) but does **not** require it to pass before merge (branch policy is not) — the build can
run, fail, and be ignored, or the PR can merge before it finishes.

### Reviewed Azure Repos exclusions

Keep both build policies unfiltered until the guard is in place. `spell ci-path-filters candidates`
lists tracked Arcane-owned candidate files; the list is **not** a declaration that they are inert.
Review every candidate against the repository's builds and tests, including dynamic reads. Record
only verified inert exact paths in a tracked JSON array, for example `["journal/2026-01-01.md"]`.
Ordinary documentation, code, build inputs, pipeline definitions, lockfiles and `.arcane/generated/`
must stay included. The tool refuses untracked, duplicate, unsafe and case-colliding paths. It uses
exact file names so a new file in a candidate folder does not silently become excluded.

1. Protect an **independent**, automatically queued, blocking build-validation policy with no path
   filter. Its guard must run against the PR merge candidate on every PR, use trusted guard code
   and protected configuration that the PR cannot disable or replace, and have read access to the
   Azure policies. A policy ID or a green fixture does not establish these properties.
2. With the tracked reviewed list and unfiltered pipeline YAML, run `spell ci-path-filters prepare
   --reviewed <reviewed.json> --pipeline <azure-pipelines.yml>` and save its output to a separate
   file. Review the generated YAML before replacing the pipeline: YAML is reserialized. The comment
   records the matching policy filter. For a YAML containing Azure logging-command markers or
   standalone carriage returns, `prepare` refuses to print the YAML; add the reviewed exact paths
   and the corresponding `/*;!/path` policy comment manually. Commit and review both files.
3. Run `spell ci-path-filters apply --reviewed <reviewed.json> --pipeline <azure-pipelines.yml>
   --org <https://dev.azure.com/organization> --project <project> --repository-id <guid> --branch
   <branch> --build-policy-id <id> --build-id <id> --guard-policy-id <id> --guard-build-id <id>
   --confirm-policy-update` only after the operator approves the change to that specific live
   policy. It verifies the separate unfiltered guard and the target policy before updating, then
   reads the policy back. Azure CLI rebuilds the policy from its first scope and known settings;
   the command refuses multiple scopes and unrecognized or incomplete settings. Do not update the
   same policy concurrently. An interrupted or unverifiable update requires inspecting the live policy.
   If no full-build policy exists, use `create` instead of `apply` and omit `--build-policy-id`;
   the command checks existing policies and reports the created policy ID after reading it back.
   `origin` must be the Azure Repos HTTPS remote for that repository; the tool resolves its identity
   through Azure and refuses to act if it does not match `--repository-id`.
4. Run the same arguments with `check` instead of `apply` (omit `--confirm-policy-update`) in the
   protected guard. It fails if either policy cannot be read, is disabled, optional, manual, scoped
   incorrectly, or differs from the list and YAML. It checks tracked paths and case collisions and
   reports detectable references to excluded paths. Read permissions for policy inspection are
   required; failure to access Azure is a failed check, not a pass.

Reference scanning is an alarm, not a proof: tests can construct file names at runtime. A human
must review every exclusion and remove uncertain inputs. Azure Pipelines and branch policy are
independent settings; protect the guard and its credentials, review updates, and verify real PR
behavior before relying on this optimization. Arcane's fixture tests do not verify a live policy.

### Self-Hosted Agents

Self-hosted agents consume **zero** hosted minutes (each org gets one free self-hosted
parallel job) — the standard fallback when the Microsoft-hosted free grant (1800
min/month) runs out mid-month. Hard-won rules for running them (origin: the Ordovica
deploy incident, 2026-07-25 — three separate failures in one night):

1. **Disable system sleep on the agent machine.** A napping agent drops mid-job with
   "We stopped hearing from agent …" and kills the stage. On macOS:
   `sudo pmset -a sleep 0` (display may still sleep; the system must not). Waking the
   machine is not a fix — it will re-sleep 15 minutes later, mid-retry.
2. **Keep hosted as a selectable fallback, not a hard switch.** Add an `agentPool`
   pipeline parameter (`selfhosted` default / `hosted`) mapped to conditional `pool:`
   blocks, so a downed agent machine never blocks an emergency deploy once hosted
   minutes exist again.
3. **Audit network reachability before the first deploy run.** Hosted agents reach
   Azure-firewalled resources (Postgres, storage) via "Allow Azure services" rules;
   a self-hosted machine does **not** — its public egress IP must be allowlisted
   explicitly. If that IP is residential, expect it to rotate: when deploys suddenly
   fail with `connect ETIMEDOUT <db-host>:5432`, check the firewall rule's IP first.
4. **Audit tooling parity.** Hosted images preinstall the Azure CLI, pipx, etc.;
   a self-hosted machine has whatever was installed by hand. Walk the pipeline's
   tasks (AzureCLI@2 → `az`, Checkov → `pipx`/`pip`, …) before pointing it at the
   new pool.

### Prospero's Responsibilities

1. **Create and maintain all CI/CD pipelines** across Azure DevOps organizations
2. **Configure branch policies** per repo risk level; for reviewed Azure path exclusions, use the
   `spell ci-path-filters` workflow above and obtain operator approval before updating a policy
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
