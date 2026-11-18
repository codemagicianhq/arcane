**Interactive actions without a matching run grant.** The commit sign-off covers the commit and each
of the following actions explicitly named in the approval prompt: an unguarded push, PR creation,
and reviewer assignment. Approve the exact staged diff, message, and named actions together. If an
action was omitted or its remote, target, or reviewer changes, obtain approval for that action in
the acting session before executing it. Apply the push-policy check independently. A guarded push
always requires its own confirmation.

A PR vote requires separate authenticated operator approval in the acting session, bound to the
PR ID, observed head SHA, voter identity, and vote. Recheck them before voting. The vote must also
be allowed by platform policy. When an independent reviewer is required, leave the vote to that
reviewer. PR completion has its own authority gate. A vote or commit sign-off does not authorize it.
