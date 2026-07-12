# VHS tape: spell-quickstart — lightweight version (methodology profile only)
# Faster/smaller alternative to spell-init.gif
#
# Re-record: cd <empty-git-repo> && vhs <this-file>

Output spell-quickstart.gif

Set Shell "pwsh"
Set FontFamily "Cascadia Code"
Set FontSize 14
Set Width 1050
Set Height 640
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms
Set Padding 16
Set Framerate 24

# Show: fresh empty repo
Type "git status --short"
Enter
Sleep 800ms

# Install Arcane with methodology profile (non-interactive, impressive output)
Type "spell init --profile methodology"
Enter
Sleep 7s

# Show the installed inventory
Type "spell status"
Enter
Sleep 5s

Sleep 2s
