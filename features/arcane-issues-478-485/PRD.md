---
title: Arcane issue batch 478–485
status: draft
tracking_mode: internal
---

# Arcane issue batch 478–485

Related: [[DECISIONS]]

| Issue | Acceptance criteria |
| --- | --- |
| [#478](https://github.com/codemagicianhq/arcane/issues/478) | The PR spell and Git conventions require trunk-based PRs for rebase-only repositories. Recovery preserves the order of unlanded commits and requires authorization before changing old PRs. |
| [#479](https://github.com/codemagicianhq/arcane/issues/479) | Policy and the workers spell require interactive approvals in the acting session. A transferred brief carries evidence and context. |
| [#480](https://github.com/codemagicianhq/arcane/issues/480) | The ADO reference places separate gates before votes and completion. Explicit strategy, source branch deletion, and work-item transition are read back against the approved settings. |
| [#481](https://github.com/codemagicianhq/arcane/issues/481) | Git conventions and the unattended spell specify the same approval and grant ID trailers for a grant-authorized commit. |
| [#482](https://github.com/codemagicianhq/arcane/issues/482) | A successful delivery records a terminal grant in the delivery PR. The CLI rejects that grant for every action. Operator finalization covers any final action the ended grant cannot authorize. |
| [#483](https://github.com/codemagicianhq/arcane/issues/483) | Interactive approval names each covered action. Unguarded push, PR creation and assignment can be included. Guarded pushes, votes, and completion take separate approval. Both provider fallbacks apply the same limits. |
| [#484](https://github.com/codemagicianhq/arcane/issues/484) | Doctor reports PR approval or completion instructions outside Arcane-managed blocks by file, line, and applicable gate, as advisory findings. |
| [#485](https://github.com/codemagicianhq/arcane/issues/485) | Roster entries accept an optional validated hex pair. Existing entries remain valid. State export and the schema expose the pair to consumers. |

Publish a single compatible CLI release when delivery is authorized. Local acceptance covers fixture validation, generated parity, and a packaged smoke test.
