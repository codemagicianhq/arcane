# VHS tape: spell-agents-custom — name your team after any universe you own
# Shows: `spell agents init` with the base profile and the custom naming
# strategy, typing a public-domain mythology roster (Athena, Apollo, Thoth,
# Maat). Custom names should follow the Naming Test in
# naming-conventions.md — public domain or your own coinage.
# Prereqs: `npm install -g arcane-cli`, run inside a `git init`'d empty directory
#
# Re-record: cd <empty-git-repo> && vhs <this-file>

Output spell-agents-custom.gif

Set Shell "pwsh"
Set FontFamily "Cascadia Code"
Set FontSize 14
Set Width 1050
Set Height 700
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms
Set Padding 16
Set Framerate 24

# Launch roster setup with the base profile (4 core roles)
Type "spell agents init --profile base --naming custom"
Enter
Sleep 2s

# Name each of the 4 core roles interactively
Type "Athena"
Enter
Sleep 800ms
Type "Apollo"
Enter
Sleep 800ms
Type "Thoth"
Enter
Sleep 800ms
Type "Maat"
Enter
Sleep 4s

# Show the resulting roster
Type "spell agents list"
Enter
Sleep 5s

Sleep 2s
