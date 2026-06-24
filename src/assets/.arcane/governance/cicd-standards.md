---
title: CI/CD Standards
audience: both
last_updated: YYYY-MM-DD
status: active
tags: [cicd, pipelines, devops, scotty, azure-devops]
---

# CI/CD Standards

Pipeline patterns, branch policies, and deployment gates for all your projects. Owned by Scotty (DevOps Engineer).

## Executive Summary

- Every code repository must have a CI pipeline that runs on PR creation and merge to main.
- Branch policies enforce PR requirements: build must pass, reviewer required, work item linked.
- Terraform changes use plan-on-PR / apply-on-merge with manual approval gates.
- Scotty owns pipeline creation and maintenance across all repos.
- ADR-049 (Spell Loop) and ADR-051 (Scotty) provide the decision rationale.

---

## Pipeline Matrix

| Repo | Org | Pipeline | Triggers | Steps | Owner |
|------|-----|----------|----------|-------|-------|
| example-app / .NET backend | {ado-org} | Build + Test + Deploy | PR, merge to main | restore → build → test → deploy staging | Scotty |
| example-app / Mobile | {ado-org} | Build + Test | PR, merge to main | build → unit tests → integration tests → artifact publish | Scotty |
| example-app / Firmware | {ado-org} | Build + Test | PR, merge to main | PlatformIO build → unit tests → OTA artifact publish | Scotty |
| ops-docs / docs | {ado-org} | Lint + Link Check | PR | markdownlint → link validation → frontmatter schema check | Scotty |
| storefront / web | {ado-org} | Build + Deploy | PR, merge to main | build → deploy (platform-dependent) | Scotty |
| legacy-app / App | {ado-org} | Build + Test | PR, merge to main | dotnet restore → build → test | Scotty |

---

## Branch Policies (Azure DevOps)

Applied to all code repositories (not docs-only repos per ADR-048):

| Policy | Setting | Rationale |
|--------|---------|-----------|
| **Require PR** | All branches → main | No direct pushes to main |
| **Minimum reviewers** | 1 (Snape for code, Gandalf for architecture) | Quality gate |
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

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/**

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

### Terraform Pipeline

```yaml
trigger: none  # Manual only for apply

pr:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/terraform/**

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

```yaml
trigger:
  branches:
    include:
      - '**'
  paths:
    include:
      - '**.md'

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

## Deployment Gates

| Environment | Gate | Who Approves |
|-------------|------|-------------|
| **Staging** | CI passes + PR approved | Automatic on merge |
| **Production** | Staging verified + manual approval | Human (operator) |
| **Terraform apply** | Plan reviewed + Checkov clean | Human (operator) |

---

## Scotty's Responsibilities

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
