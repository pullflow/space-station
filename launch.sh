# Space Station launch.sh
# This file is sourced when running `ss launch`
# Add any aliases, functions, or environment variables you want in the Space Station shell
# Note: `ss` is already aliased automatically

AGENT="claude"

# For more autonomous agent experience
# AGENT="claude --dangerously-skip-permissions --model=opus"

alias agent="$AGENT"
alias resume="$AGENT --resume"
alias cont="$AGENT --continue"
