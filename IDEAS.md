# Idea Inbox

Fast-capture log of ideas worth keeping. Add with `spell-save-idea`. Triage with `spell-todo`
(actionable) or `spell-suggest-feature` (product ideas). Entries are append-only; mark status in the
trailing comment rather than deleting.

---

- **[2026-08-01 00:11]** [#security] The org-token gate ([[docs/intake/batch-001/EF-26|EF-26]]) should catch the operator's own personal identifiers, not just org names - usernames, machine names, personal handles. Our own ai-context file has branch names containing a username sitting in a public repo. Whoever populates `ORG_TOKEN_PATTERNS` should seed it from the operator's identity, not just the org's. <!-- status: new -->
- **[2026-08-01 01:31]** [#tracking] GitHub should be a first-class `external_provider`, not `other`. Options are `ado | jira | other`, and `other` degrades to internal artifact flow with a TODO note. Arcane is published on GitHub, uses GitHub PRs, and `spell-bug` and `spell-create-pull-request` already speak GitHub natively - the tracking model is the only layer that does not. <!-- status: new -->
