# Space Station launch.sh
# This file is sourced when running `ss launch`
# Add any aliases, functions, or environment variables you want in the Space Station shell
# Note: `ss` is already aliased automatically

# Agent aliases
export AGENT="claude"
# For more autonomous agent experience:
# export AGENT="claude --dangerously-skip-permissions"

alias agent="$AGENT"
alias resume="$AGENT --resume"
alias cont="$AGENT --continue"

# Space Station subcommand aliases
alias help="ss help"
alias list="ss list"
alias init="ss init"
alias setup="ss setup"
alias symlink="ss symlink"
alias issues="ss issues"
alias sync="ss sync"
alias pr="ss pr"
alias reset="ss reset"

# Planet aliases
alias a="ss a"
alias b="ss b"
alias c="ss c"
alias d="ss d"
alias earth="ss earth"
