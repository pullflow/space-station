# Space Station launch.sh
# This file is sourced when running `ss launch`
# Add any aliases, functions, or environment variables you want in the Space Station shell
# Note: `ss` is already aliased automatically

# Agent aliases
#export DEFAULT_AGENT="claude"
# For more autonomous agent experience:
export DEFAULT_AGENT="claude --dangerously-skip-permissions --model opus"

alias default_agent="$DEFAULT_AGENT"
alias resume="$DEFAULT_AGENT --resume"
alias cont="$DEFAULT_AGENT --continue"

# Space Station subcommand aliases
alias help="ss help"
alias list="ss list"
alias config="ss config"
alias init="ss init"
alias setup="ss setup"
alias symlink="ss symlink"
alias issues="ss issues"
alias sync="ss sync"
alias prs="ss prs"
alias reset="ss reset"
alias agent="ss agent"

# Planet aliases
alias a="ss a"
alias b="ss b"
alias c="ss c"
alias d="ss d"
alias earth="ss earth"
