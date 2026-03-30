#!/bin/bash

# 🛸 Space Station - Manage multiple parallel repo clones
# Minimalist wrapper for the Bun/TypeScript implementation

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it to use Space Station."
    echo "Visit https://bun.sh for installation instructions."
    exit 1
fi

# Delegate all commands to the Bun implementation
# If no arguments are provided, it will launch the interactive TUI menu
bun run "$SCRIPT_DIR/src/index.ts" "$@"
