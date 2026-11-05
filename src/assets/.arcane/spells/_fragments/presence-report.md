**Presence report (ARC-044 decision 3, ARC-060).** When a presence channel is configured on this
machine, report through it; when none is, this spell behaves exactly as it does without this
paragraph. Configured means `spell presence status` exits 0: the service is running and the token
in the user store opens it. Report with the CLI only; never pass a token on the command line, and
never write a repository file to report.

- At the start of this spell: `spell presence report --spell <spell-id> --status working --task "<the task in one line>"`.
- When this spell's output carries a `## ⚠ Needs you` block: `spell presence report --status waiting --needs-you "<line 1>" --needs-you "<line 2>"`, one flag per line; the block itself is unchanged.
- At a checkpoint worth showing (a commit made, a story passed): `spell presence report --status working --task "<what is now happening>"`.
- When the session closes: `spell presence end`.

The command is silent and exits 0 when no channel is configured, prints one line to stderr and
still exits 0 when the channel refuses a report, and never blocks a spell. The service keeps
presence in memory only, reconstructable from `spell state --json` and never authoritative; a
session that stops reporting is shown as unknown after 90 seconds. Enforcement: explicitly
advisory prose (ARC-023) — no check reads a spell's shell history for these calls.