# Architecture — Fail-safe Azure path filters

## Design

Use exact tracked paths selected from Arcane-owned candidates, not directory-wide patterns. A reviewed path is a repository-specific assertion, not an automated proof of non-use. Reject wildcards and special policy syntax in paths. Produce YAML and Azure filters from one ordered list; the Azure policy starts with `/*` and then uses exact negative entries. The separate unfiltered guard evaluates the PR merge tree and verifies both policies through Azure CLI. Never trust a policy comment alone. Keep default templates unfiltered until a consumer deliberately configures both policies.

The guard must be defined and protected independently of the filtered build, and execute trusted guard code: a PR must not be able to disable the check or edit the code that decides whether it passes. It checks all tracked paths, exact case-sensitive pipeline and case-insensitive policy matching, unsafe build inputs, detectable references, and the enabled, blocking, automatically queued policies and exact scopes. Fail closed on unknown forms or errors. Exact paths prevent a newly added script in a candidate directory from becoming excluded. Any file that cannot be established as inert stays included. An explicit review still cannot prove dynamic reads absent.

## Verification

Vitest unit and fixture tests exercise generation, path matching, case collisions, inputs, parser failures, and policy scope/identity. CLI process tests cover failures. Real policy checks are distinct from mocks and require an Azure test target and approval. Full lint, typecheck, coverage, build, parity and review precede delivery.

Related: [[.arcane/governance/cicd-standards]]
