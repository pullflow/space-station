#!/bin/bash

# 🛸 Space Station iTerm2 Config Linker
# Points iTerm2 to the local 'iterm2' folder for its preferences

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/iterm2"

echo "🛰️  Linking iTerm2 to Space Station opinionated config..."

# Set iTerm2 to load preferences from this custom folder
defaults write com.googlecode.iterm2.plist PrefsCustomFolder -string "$CONFIG_DIR"
defaults write com.googlecode.iterm2.plist LoadPrefsFromCustomFolder -bool true

# Prevent iTerm2 from asking if you want to save changes back to the file
defaults write com.googlecode.iterm2.plist NoSyncNeverRemindPrefsChangesLostForFile -bool true

echo "✅ iTerm2 configured. Please restart iTerm2 for changes to take effect."
