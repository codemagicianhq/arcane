# VHS tape: spell-agents-arcanos — the built-in persona roster demo
# Shows: `spell agents init` with the full profile and the Arcanos naming
# strategy (Kellar, Merlin, Lafayette, Lince, Prospero, Adelaide, Mercurio,
# Alexander, Circe, Bess, Iris, Custodio).
# Prereqs: `npm install -g arcane-cli`, run inside a `git init`'d empty directory
#
# Re-record: cd <empty-git-repo> && vhs <this-file>

Output spell-agents-arcanos.gif

Set Shell "pwsh"
Set FontFamily "Cascadia Code"
Set FontSize 14
Set Width 1050
Set Height 700
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms
Set Padding 16
Set Framerate 24

# Launch the interactive roster setup
Type "spell agents init"
Enter
# Hold on the profile menu so the choices can be read
Sleep 3s

# Profile select — move down to the Full roster (12 roles), pause on it, then confirm
Down
Sleep 2s
Enter

# Naming strategy select — hold on the menu (Arcanos is the default) so it can be read
Sleep 3s
Enter
Sleep 4s

# Show the resulting roster
Type "spell agents list"
Enter
Sleep 5s

Sleep 2s
