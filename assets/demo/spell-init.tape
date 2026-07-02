# VHS tape: spell-hero — the primary README demo
# Shows: banner → init → status in a clean repo
# Prereqs: `npm install -g arcane-cli`, run inside a `git init`'d empty directory
#
# Re-record: cd <empty-git-repo> && vhs <this-file>

Output spell-hero.gif

Set Shell "pwsh"
Set FontFamily "Cascadia Code"
Set FontSize 14
Set Width 1050
Set Height 700
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms
Set Padding 16
Set Framerate 24

# The banner — first impression
Type "spell"
Enter
Sleep 4s

# Init with methodology profile (non-interactive)
Type "spell init --profile methodology"
Enter
Sleep 7s

# Show the installed inventory
Type "spell status"
Enter
Sleep 5s

Sleep 1s
